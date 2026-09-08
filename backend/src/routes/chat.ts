import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { formatBaziForAI, getBaziProfile, getYearlyFlow, type BaziPillar } from "../lib/bazi.js";
import { castHexagram, formatLiuyaoForAI, type HexagramResult } from "../lib/liuyao.js";
import { streamChat } from "../lib/llm.js";
import {
  LlmUsageLimitError,
  reserveLlmUsage,
  type LlmUsagePermit,
} from "../lib/llm-usage.js";
import { buildSystemPrompt, sanitizeUserQuestion } from "../lib/prompt-builder.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware.js";

const router = Router();

const schema = z.object({
  mode: z.enum(["kanyun", "qingting", "wenshi", "suiyuan"]),
  message: z.string().trim().min(1).max(4_000),
  conversationId: z.string().max(128).optional().nullable(),
});

const currentYear = new Date().getFullYear();

function extractYear(question: string): number {
  const q = question.replace(/今年/, String(currentYear)).replace(/明年/, String(currentYear + 1));
  const match = q.match(/(20\d{2})/);
  return match ? Number(match[1]) : currentYear;
}

function buildKanYunContext(profile: BaziPillar, year: number) {
  const flow = getYearlyFlow(profile, year);
  return `${formatBaziForAI(profile, year)}\n\n【工具调用摘要】\n- 查询命盘：主命盘\n- 查询时间流：${year}年流年${flow.ganZhi}·${flow.shiShen}·${flow.naYin}`;
}

function buildWenShiContext(hexagram: HexagramResult) {
  return `${formatLiuyaoForAI(hexagram)}\n\n【工具调用摘要】\n- 起卦服务：已为本问题生成并校验完整六爻盘`;
}

function routeSuiYuan(
  question: string,
  hasProfile: boolean
): "kanyun" | "qingting" | "wenshi" {
  const q = question.toLowerCase();
  if (/压力|累|睡不着|焦虑|抑郁|难过|伤心|烦|委屈|想哭|情绪|心情/.test(q))
    return "qingting";
  if (/offer|选择|该不该|能不能|要不要|决定|选哪个|合适吗|可以吗|行吗|辞职|跳槽/.test(q))
    return "wenshi";
  if (/运势|今年|明年|财运|桃花|工作|事业|健康|适合|方向|贵人|命盘|八字/.test(q))
    return hasProfile ? "kanyun" : "qingting";
  return hasProfile ? "kanyun" : "qingting";
}

router.post("/stream", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }

    let { mode, conversationId } = parsed.data;
    const message = sanitizeUserQuestion(parsed.data.message);

    let profile: ReturnType<typeof getBaziProfile> | null = null;
    let profileRecord = null;
    if (mode === "kanyun" || mode === "suiyuan") {
      profileRecord = await prisma.profile.findFirst({
        where: { userId, isPrimary: true },
      });
      if (profileRecord) {
        profile = getBaziProfile(profileRecord.birthDateTime, profileRecord.gender, {
          calendarType: profileRecord.calendarType as "solar" | "lunar",
          isLeapMonth: profileRecord.isLeapMonth,
          birthPlace: profileRecord.birthLocation || undefined,
          longitude: profileRecord.longitude ?? undefined,
        });
        const stored = profileRecord.baziPillar ? JSON.parse(profileRecord.baziPillar) : null;
        if (stored?.schemaVersion !== profile.schemaVersion) {
          await prisma.profile.update({
            where: { id: profileRecord.id },
            data: { baziPillar: JSON.stringify(profile) },
          });
        }
      }
    }

    let actualMode: typeof mode = mode;
    let routeReason = "";
    if (mode === "suiyuan") {
      actualMode = routeSuiYuan(message, !!profile);
      routeReason = `根据问题语义，已为你匹配「${
        actualMode === "kanyun" ? "看运" : actualMode === "wenshi" ? "问事" : "倾听"
      }」模式`;
    }

    if (actualMode === "kanyun" && !profile) {
      res.status(400).json({ error: "NO_PROFILE", message: "看运需要先建立命盘档案" });
      return;
    }

    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          mode: actualMode,
          originalMode: mode === "suiyuan" ? mode : null,
          title: message.slice(0, 30),
        },
      });
    } else if (mode === "suiyuan") {
      actualMode = conversation.mode as typeof actualMode;
      routeReason = `沿用当前对话的「${
        actualMode === "kanyun" ? "看运" : actualMode === "wenshi" ? "问事" : "倾听"
      }」模式`;
    }

    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: "user",
        content: message,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() },
    });

    // 只保留最近创建的 20 条 active 对话，超出部分删除
    const conversationsToKeep = await prisma.conversation.findMany({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true },
    });
    const keepIds = new Set(conversationsToKeep.map((c) => c.id));
    if (!keepIds.has(conversation.id)) {
      keepIds.add(conversation.id);
    }
    await prisma.conversation.deleteMany({
      where: { userId, status: "active", id: { notIn: Array.from(keepIds) } },
    });

    let systemPrompt = "";
    let userContent = message;
    let toolCalls: Array<{ name: string; parameters?: unknown; result?: unknown }> = [];

    if (actualMode === "kanyun") {
      systemPrompt = buildSystemPrompt("kanyun");
      const targetYear = extractYear(message);
      userContent = buildKanYunContext(profile!, targetYear) + "\n\n【用户当前问题】\n" + message;
      toolCalls = [
        {
          name: "查询命盘",
          parameters: { profileId: profileRecord?.id, engine: profile!.engine },
          result: { profile: profile!.canonicalJson, schemaVersion: profile!.schemaVersion },
        },
        {
          name: "查询时间流",
          parameters: { year: targetYear },
          result: getYearlyFlow(profile!, targetYear),
        },
      ];
    } else if (actualMode === "qingting") {
      systemPrompt = buildSystemPrompt("qingting");
      userContent = `[当前模式=倾听，locale=zh，首轮对话]\n\n用户倾诉：${message}`;
    } else if (actualMode === "wenshi") {
      systemPrompt = buildSystemPrompt("wenshi");

      const previousAssistant = await prisma.message.findFirst({
        where: { conversationId: conversation.id, role: "assistant" },
        orderBy: { createdAt: "desc" },
      });

      let hexagram: HexagramResult | null = null;
      if (previousAssistant?.toolCalls) {
        try {
          const calls = JSON.parse(previousAssistant.toolCalls);
          const existing = calls.find(
            (c: { name: string; result?: unknown }) => c.name === "起卦服务"
          );
          if (existing?.result?.schemaVersion === 2) hexagram = existing.result as HexagramResult;
        } catch {
          hexagram = null;
        }
      }

      if (!hexagram) {
        hexagram = await castHexagram(
          previousAssistant ? conversation.title || message : message,
          conversation.createdAt.getTime(),
        );
      }

      userContent = buildWenShiContext(hexagram) + "\n\n【用户当前问题】\n" + message;
      toolCalls = [
        {
          name: "起卦服务",
          parameters: { question: message, seed: conversation.createdAt.getTime() },
          result: hexagram,
        },
      ];
    } else {
      res.status(400).json({ error: "Unsupported mode" });
      return;
    }

    const history = previousMessages
      .reverse()
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({ role: item.role as "user" | "assistant", content: item.content }));
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      { role: "user" as const, content: userContent },
    ];

    let usagePermit: LlmUsagePermit | null;
    try {
      usagePermit = await reserveLlmUsage(userId, conversation.id);
    } catch (error) {
      if (error instanceof LlmUsageLimitError) {
        res.status(429).json({ error: "LLM_USAGE_LIMIT", message: error.message });
        return;
      }
      throw error;
    }

    const encoder = new TextEncoder();
    let fullContent = "";
    let thinkingSummary = "";
    const requestAbort = new AbortController();
    const abortUpstream = () => requestAbort.abort();
    req.once("aborted", abortUpstream);
    res.once("close", abortUpstream);
    let streamSucceeded = false;

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(
        encoder.encode(
          `event: meta\ndata: ${JSON.stringify({
            conversationId: conversation.id,
            mode: actualMode,
            originalMode: mode,
            routeReason,
            toolCalls,
          })}\n\n`
        )
      );

      try {
        for await (const chunk of streamChat(messages, {
          temperature: 0.7,
          signal: requestAbort.signal,
          config: usagePermit?.config,
        })) {
          fullContent += chunk.content;
          if (chunk.reasoning) thinkingSummary += chunk.reasoning;
          res.write(encoder.encode(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`));
        }
        streamSucceeded = !requestAbort.signal.aborted;
      } catch (error) {
        if (!requestAbort.signal.aborted) {
          console.error(
            "[chat stream error]",
            process.env.NODE_ENV === "production"
              ? { name: error instanceof Error ? error.name : "UnknownError" }
              : error
          );
        }
      }

      if (requestAbort.signal.aborted) return;
      if (!streamSucceeded) {
        res.write(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: "AI service is temporarily unavailable" })}\n\n`
          )
        );
        res.end();
        return;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          userId,
          role: "assistant",
          content: fullContent,
          toolCalls: JSON.stringify(toolCalls),
          thinkingSummary: thinkingSummary || "思考了片刻",
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messageCount: { increment: 1 }, updatedAt: new Date() },
      });

      await prisma.billingRecord.create({
        data: {
          userId,
          type: "interpretation",
          amount: 0,
          description: `${actualMode} 模式解读`,
          conversationId: conversation.id,
          status: "completed",
        },
      });

      res.write(encoder.encode(`event: done\ndata: {}\n\n`));
      res.end();
    } finally {
      req.off("aborted", abortUpstream);
      res.off("close", abortUpstream);
      try {
        await usagePermit?.finish(streamSucceeded);
      } catch (error) {
        console.error(
          "[llm usage finalization error]",
          process.env.NODE_ENV === "production"
            ? { name: error instanceof Error ? error.name : "UnknownError" }
            : error
        );
      }
    }
  } catch (err) {
    if (res.headersSent) {
      if (!res.writableEnded) res.end();
      console.error(
        "[chat request error]",
        process.env.NODE_ENV === "production"
          ? { name: err instanceof Error ? err.name : "UnknownError" }
          : err
      );
      return;
    }
    next(err);
  }
});

export default router;
