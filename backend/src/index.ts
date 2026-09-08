import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import profilesRoutes from "./routes/profiles.js";
import onboardingRoutes from "./routes/onboarding.js";
import baziRoutes from "./routes/bazi.js";
import conversationsRoutes from "./routes/conversations.js";
import chatRoutes from "./routes/chat.js";
import dailyFortuneRoutes from "./routes/dailyFortune.js";
import reportsRoutes from "./routes/reports.js";
import subscriptionRoutes from "./routes/subscription.js";
import { AUTH_COOKIE_NAME, errorHandler } from "./middleware.js";
import { getCorsOrigins, validateProductionEnvironment } from "./lib/env.js";
import { apiRateLimitKey, loginRateLimitKey } from "./lib/rate-limit.js";

validateProductionEnvironment();
const app = express();
app.disable("x-powered-by");

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const allowedOrigins = getCorsOrigins();

app.use((req, res, next) => {
  const origin = req.headers.origin?.replace(/\/$/, "");
  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const hasBearer = req.headers.authorization?.startsWith("Bearer ") ?? false;
  const hasSessionCookie = req.headers.cookie
    ?.split(";")
    .some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
  if (unsafeMethod && hasSessionCookie && !hasBearer && !origin) {
    res.status(403).json({ error: "Origin required for cookie-authenticated requests" });
    return;
  }
  next();
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(helmet());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "100kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith("/api/auth/login"),
  keyGenerator: apiRateLimitKey,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: loginRateLimitKey,
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/bazi", baziRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/daily-fortune", dailyFortuneRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/subscription", subscriptionRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`[backend] Server running on port ${PORT}`);
});
