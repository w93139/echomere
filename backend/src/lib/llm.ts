import { getLlmConfig, type LlmConfig } from "./env.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  content: string;
  reasoning?: string;
}

export async function* streamChat(
  messages: ChatMessage[],
  options?: { temperature?: number; signal?: AbortSignal; config?: LlmConfig }
): AsyncGenerator<StreamChunk, void, unknown> {
  const config = options?.config || getLlmConfig();

  if (!config.enabled || !config.apiKey) {
    yield {
      content:
        "\n\n[系统提示：LLM API 当前未启用。请由服务端管理员完成安全配置后重启服务。]",
    };
    return;
  }

  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", relayAbort, { once: true });
  if (options?.signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let streamCompleted = false;

  try {
    if (controller.signal.aborted) throw new Error("LLM request aborted");
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        stream: true,
      }),
      redirect: "error",
      signal: controller.signal,
    });

    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      console.error("[llm upstream] request failed", { status: res.status });
      throw new Error("LLM upstream request failed");
    }

    reader = res.body?.getReader();
    if (!reader) throw new Error("LLM upstream response body is missing");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let emittedChars = 0;
    let receivedBytes = 0;
    const maxResponseBytes = Math.max(64 * 1_024, config.maxOutputChars * 8);
    const maxEventBufferChars = Math.max(64 * 1_024, config.maxOutputChars * 2);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        streamCompleted = true;
        break;
      }
      receivedBytes += value.byteLength;
      if (receivedBytes > maxResponseBytes) {
        controller.abort();
        throw new Error("LLM upstream response exceeded the size limit");
      }
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > maxEventBufferChars) {
        controller.abort();
        throw new Error("LLM upstream event buffer exceeded the size limit");
      }

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (delta) {
            const remaining = config.maxOutputChars - emittedChars;
            if (remaining <= 0) {
              controller.abort();
              await reader.cancel().catch(() => undefined);
              return;
            }
            const content = String(delta.content || "").slice(0, remaining);
            const reasoningRemaining = remaining - content.length;
            const reasoning = String(delta.reasoning_content || "").slice(0, reasoningRemaining);
            emittedChars += content.length + reasoning.length;
            yield { content, reasoning };
            if (emittedChars >= config.maxOutputChars) {
              controller.abort();
              await reader.cancel().catch(() => undefined);
              return;
            }
          }
        } catch {
          // Ignore malformed upstream event lines.
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", relayAbort);
    if (!streamCompleted) await reader?.cancel().catch(() => undefined);
    controller.abort();
  }
}
