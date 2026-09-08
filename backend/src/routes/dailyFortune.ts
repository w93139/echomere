import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getDailyFlow, getYearlyFlow } from "../lib/bazi.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware.js";

const router = Router();

router.get("/", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId: req.user!.userId, isPrimary: true },
    });

    if (!profile?.baziPillar) {
      res.status(400).json({ error: "NO_PROFILE" });
      return;
    }

    const bazi = JSON.parse(profile.baziPillar);
    const today = new Date();
    const daily = getDailyFlow(bazi, today);
    const yearly = getYearlyFlow(bazi, today.getFullYear());

    res.json({
      profile: { name: profile.name, bazi },
      today: daily,
      year: yearly,
      date: today.toISOString().split("T")[0],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
