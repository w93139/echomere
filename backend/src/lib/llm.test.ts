import assert from "node:assert/strict";
import test from "node:test";
import type { LlmConfig } from "./env.js";
import { streamChat } from "./llm.js";

const baseConfig: LlmConfig = {
  enabled: true,
  apiKey: "test-provider-key",
  baseUrl: "https://api.example.test/v1",
  model: "test-model",
  timeoutMs: 5_000,
  maxTokens: 64,
  maxOutputChars: 3,
  dailyUserLimit: 2,
  dailyGlobalLimit: 10,
  maxConcurrency: 1,
};

test("a pre-aborted request never calls the provider", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response();
  };

  try {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(async () => {
      for await (const _chunk of streamChat([{ role: "user", content: "hello" }], {
        config: baseConfig,
        signal: controller.signal,
      })) {
        // No chunks are expected.
      }
    }, /aborted/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the provider stream is cancelled at the local output limit", async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"abcdef"}}]}\n\n'
        )
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  globalThis.fetch = async () => new Response(body, { status: 200 });

  try {
    let content = "";
    for await (const chunk of streamChat([{ role: "user", content: "hello" }], {
      config: baseConfig,
    })) {
      content += chunk.content;
    }
    assert.equal(content, "abc");
    assert.equal(cancelled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider error bodies are never exposed", async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  console.error = () => undefined;
  globalThis.fetch = async () => new Response("provider-private-detail", { status: 500 });

  try {
    await assert.rejects(async () => {
      for await (const _chunk of streamChat([{ role: "user", content: "hello" }], {
        config: baseConfig,
      })) {
        // No chunks are expected.
      }
    }, (error: unknown) => {
      assert.equal(error instanceof Error ? error.message : "", "LLM upstream request failed");
      assert.doesNotMatch(String(error), /provider-private-detail/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test("an unterminated oversized provider event is cancelled", async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(70 * 1_024));
    },
    cancel() {
      cancelled = true;
    },
  });
  globalThis.fetch = async () => new Response(body, { status: 200 });

  try {
    await assert.rejects(async () => {
      for await (const _chunk of streamChat([{ role: "user", content: "hello" }], {
        config: baseConfig,
      })) {
        // No chunks are expected.
      }
    }, /size limit/);
    assert.equal(cancelled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider requests are aborted after the configured timeout", async () => {
  const originalFetch = globalThis.fetch;
  let observedAbort = false;
  globalThis.fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener(
        "abort",
        () => {
          observedAbort = true;
          reject(new DOMException("aborted", "AbortError"));
        },
        { once: true }
      );
    });

  try {
    await assert.rejects(async () => {
      for await (const _chunk of streamChat([{ role: "user", content: "hello" }], {
        config: { ...baseConfig, timeoutMs: 10 },
      })) {
        // No chunks are expected.
      }
    }, /aborted/);
    assert.equal(observedAbort, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
