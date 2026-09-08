import { prisma } from "./prisma.js";
import { getLlmConfig, type LlmConfig } from "./env.js";

let activeRequests = 0;
const activeUsers = new Set<string>();
let reservationLock: Promise<void> = Promise.resolve();

async function withReservationLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = reservationLock;
  let release!: () => void;
  reservationLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}

export class LlmUsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUsageLimitError";
  }
}

export interface LlmUsagePermit {
  config: LlmConfig;
  finish(success: boolean): Promise<void>;
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function reserveLlmUsage(
  userId: string,
  conversationId?: string
): Promise<LlmUsagePermit | null> {
  const config = getLlmConfig();
  if (!config.enabled || !config.apiKey) return null;

  if (activeRequests >= config.maxConcurrency || activeUsers.has(userId)) {
    throw new LlmUsageLimitError("LLM service is busy; please try again later");
  }

  activeRequests += 1;
  activeUsers.add(userId);

  try {
    const reservation = await withReservationLock(async () => {
      const since = startOfUtcDay();
      const [userUsage, globalUsage] = await Promise.all([
        prisma.billingRecord.count({
          where: { userId, type: "llm_api", createdAt: { gte: since } },
        }),
        prisma.billingRecord.count({
          where: { type: "llm_api", createdAt: { gte: since } },
        }),
      ]);

      if (userUsage >= config.dailyUserLimit || globalUsage >= config.dailyGlobalLimit) {
        throw new LlmUsageLimitError("Daily LLM usage limit reached");
      }

      return prisma.billingRecord.create({
        data: {
          userId,
          type: "llm_api",
          amount: 0,
          description: "LLM API usage reservation",
          conversationId,
          status: "pending",
        },
      });
    });

    let finished = false;
    return {
      config,
      async finish(success: boolean) {
        if (finished) return;
        finished = true;
        activeRequests -= 1;
        activeUsers.delete(userId);
        await prisma.billingRecord.update({
          where: { id: reservation.id },
          data: { status: success ? "completed" : "failed" },
        });
      },
    };
  } catch (error) {
    activeRequests -= 1;
    activeUsers.delete(userId);
    throw error;
  }
}
