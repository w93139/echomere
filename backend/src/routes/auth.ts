import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, blacklistToken } from "../lib/auth.js";
import {
  AUTH_COOKIE_NAME,
  authMiddleware,
  getAuthTokenFromRequest,
  type AuthenticatedRequest,
} from "../middleware.js";
import { getLoginCodes } from "../lib/env.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  code: z.string().min(1).max(256),
});

function codesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }

    const { email: rawInput, code } = parsed.data;
    const loweredInput = rawInput.toLowerCase();
    const isEmail = loweredInput.includes("@");
    const input = isEmail ? loweredInput : loweredInput.replace(/\D/g, "");
    if (!isEmail && input.length < 5) {
      res.status(400).json({ error: "Invalid identifier or code" });
      return;
    }

    const loginCodes = getLoginCodes();
    if (loginCodes.size === 0) {
      res.status(503).json({ error: "Login is not configured" });
      return;
    }
    const loginCode = loginCodes.get(input);
    if (!loginCode) {
      res.status(401).json({ error: "Invalid identifier or code" });
      return;
    }

    if (!codesMatch(code.trim(), loginCode)) {
      res.status(401).json({ error: "Invalid identifier or code" });
      return;
    }

    let user;
    if (isEmail) {
      user = await prisma.user.findUnique({ where: { email: input } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: input, name: input.split("@")[0] },
        });
      }
    } else {
      const phone = input;
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: { phone, name: `用户${phone.slice(-4)}` },
        });
      }
    }

    const token = signToken({
      userId: user.id,
    });

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 12 * 60 * 60 * 1_000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        locale: user.locale,
        defaultDestinySystem: user.defaultDestinySystem,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req: AuthenticatedRequest, res) => {
  const token = getAuthTokenFromRequest(req);
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  let serverRevoked = true;
  if (token) {
    try {
      await blacklistToken(token);
    } catch (error) {
      serverRevoked = false;
      console.error(
        "[logout revocation error]",
        process.env.NODE_ENV === "production"
          ? { name: error instanceof Error ? error.name : "UnknownError" }
          : error
      );
    }
  }
  res.json({ success: true, serverRevoked });
});

router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { _count: { select: { profiles: true, conversations: true } } },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      locale: user.locale,
      defaultDestinySystem: user.defaultDestinySystem,
      profileCount: user._count.profiles,
      conversationCount: user._count.conversations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
