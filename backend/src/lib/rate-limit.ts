import crypto from "node:crypto";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { getAuthTokenFromRequest } from "../middleware.js";
import { verifyToken } from "./auth.js";

function ipBucket(req: Request) {
  return `ip:${ipKeyGenerator(req.ip || "unknown")}`;
}

export function apiRateLimitKey(req: Request): string {
  const token = getAuthTokenFromRequest(req);
  if (token) {
    try {
      return `user:${verifyToken(token).userId}`;
    } catch {
      // Invalid tokens must not create attacker-controlled limiter buckets.
    }
  }
  return ipBucket(req);
}

export function loginRateLimitKey(req: Request): string {
  const rawIdentifier = typeof req.body?.email === "string" ? req.body.email : "";
  const identifier = rawIdentifier.includes("@")
    ? rawIdentifier.trim().toLowerCase()
    : rawIdentifier.replace(/\D/g, "");
  if (identifier) {
    return `identity:${crypto.createHash("sha256").update(identifier).digest("hex")}`;
  }
  return ipBucket(req);
}
