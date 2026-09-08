import type { Request, Response, NextFunction } from "express";
import { verifyToken, isTokenBlacklisted, type JwtPayload } from "./lib/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const AUTH_COOKIE_NAME = "echomere_session";

export function getAuthTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 0 && bearer.length <= 4_096) return bearer;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== AUTH_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    if (value.length === 0 || value.length > 4_096) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = verifyToken(token);
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(
    "[backend error]",
    process.env.NODE_ENV === "production" ? { name: err.name } : err
  );
  res.status(500).json({ error: "Internal server error" });
}
