import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware.js";

const router = Router();

const PLANS = [
  {
    id: "free",
    name: "体验版",
    price: 0,
    period: "永久",
    features: ["每日运势", "八字星云图", "看运/倾听/问事 无限次测试"],
    cta: "当前方案",
    popular: false,
  },
  {
    id: "lite",
    name: "轻量版",
    price: 2900,
    period: "月",
    features: ["每月 30 次深度解读", "优先响应", "历史对话导出"],
    cta: "选择轻量版",
    popular: false,
  },
  {
    id: "pro",
    name: "专业版",
    price: 9900,
    period: "月",
    features: ["每月 100 次深度解读", "紫微斗数（敬请期待）", "真人 1v1 折扣"],
    cta: "选择专业版",
    popular: true,
  },
  {
    id: "ultra",
    name: "无限版",
    price: 29900,
    period: "月",
    features: ["无限次深度解读", "全部命理体系", "优先真人 1v1"],
    cta: "选择无限版",
    popular: false,
  },
];

const subscriptionSchema = z.object({
  planId: z.enum(["free", "lite", "pro", "ultra"]),
});

router.get("/", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [count, user] = await Promise.all([
      prisma.billingRecord.count({
        where: {
          userId: req.user!.userId,
          type: "interpretation",
          status: "completed",
        },
      }),
      prisma.user.findUnique({ where: { id: req.user!.userId } }),
    ]);

    res.json({
      currentPlan: user?.currentPlan || "free",
      used: count,
      limit: null,
      plans: PLANS,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }

    const plan = PLANS.find((item) => item.id === parsed.data.planId)!;
    const testPlanSwitchingEnabled =
      process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_PLAN_SWITCHING === "true";
    if (plan.id !== "free" && !testPlanSwitchingEnabled) {
      res.status(403).json({
        error: "PAYMENT_REQUIRED",
        message: "Paid plans can only be activated by a verified payment workflow",
      });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user!.userId },
        data: { currentPlan: plan.id },
      }),
      prisma.billingRecord.create({
        data: {
          userId: req.user!.userId,
          type: "subscription",
          amount: 0,
          description: plan.id === "free" ? "切换到免费方案" : `本地测试切换到${plan.name}`,
          status: "completed",
        },
      }),
    ]);

    res.json({ success: true, currentPlan: plan.id });
  } catch (err) {
    next(err);
  }
});

export default router;
