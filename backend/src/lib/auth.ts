import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { getJwtSecret } from "./env.js";

const JWT_SECRET = getJwtSecret();
const JWT_ISSUER = "echomere-backend";
const JWT_AUDIENCE = "echomere-web";

const jwtPayloadSchema = z.object({
  userId: z.string().min(1).max(128),
  jti: z.string().uuid(),
  exp: z.number().int().positive(),
});

export interface JwtPayload {
  userId: string;
  jti: string;
  exp: number;
}

export function signToken(payload: Omit<JwtPayload, "jti" | "exp">): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, {
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: "12h",
  });
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return jwtPayloadSchema.parse(payload);
}

function hashJti(jti: string): string {
  return crypto.createHash("sha256").update(jti).digest("hex");
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const decoded = jwt.decode(token) as { jti?: string } | null;
  if (!decoded?.jti) return false;
  const record = await prisma.tokenBlacklist.findUnique({
    where: { tokenHash: hashJti(decoded.jti) },
  });
  if (record && record.expiresAt <= new Date()) {
    await prisma.tokenBlacklist.delete({ where: { id: record.id } });
    return false;
  }
  return Boolean(record);
}

export async function blacklistToken(token: string): Promise<void> {
  const verified = verifyToken(token);
  const expiresAt = new Date(verified.exp * 1000);
  await prisma.tokenBlacklist.upsert({
    where: { tokenHash: hashJti(verified.jti) },
    create: {
      tokenHash: hashJti(verified.jti),
      expiresAt,
    },
    update: { expiresAt },
  });
}
