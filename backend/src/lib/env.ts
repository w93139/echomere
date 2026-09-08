import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const PUBLIC_ENV_PREFIXES = ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"];
const PLACEHOLDER_MARKERS = ["replace-with", "change-me", "changeme", "example-secret"];

export interface LlmConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  maxOutputChars: number;
  dailyUserLimit: number;
  dailyGlobalLimit: number;
  maxConcurrency: number;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function readServerSecret(
  name: string,
  options: { required?: boolean; minLength?: number } = {}
): string | undefined {
  if (PUBLIC_ENV_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    throw new Error(`Server secrets cannot use a public environment prefix: ${name}`);
  }

  const directValue = process.env[name]?.trim();
  const secretFile = process.env[`${name}_FILE`]?.trim();
  if (directValue && secretFile) {
    throw new Error(`Configure only one of ${name} or ${name}_FILE`);
  }

  let value = directValue;
  if (secretFile) {
    try {
      value = readFileSync(secretFile, "utf8").trim();
    } catch {
      throw new Error(`${name}_FILE could not be read`);
    }
  }
  if (!value) {
    if (options.required) throw new Error(`${name} must be configured`);
    return undefined;
  }

  if (isProduction() && isPlaceholder(value)) {
    throw new Error(`${name} still contains a placeholder value`);
  }
  if (value.length < (options.minLength ?? 1)) {
    throw new Error(`${name} must contain at least ${options.minLength} characters`);
  }
  return value;
}

export function getJwtSecret(): string {
  const configured = readServerSecret("JWT_SECRET", {
    required: isProduction(),
    minLength: isProduction() ? 32 : 1,
  });
  if (configured) {
    if (isProduction() && new Set(configured).size < 12) {
      throw new Error("JWT_SECRET must contain at least 32 random characters");
    }
    return configured;
  }

  console.warn(
    "[backend] JWT_SECRET is not set. Using an ephemeral development secret; sessions will reset on restart."
  );
  return crypto.randomBytes(32).toString("hex");
}

export function getLoginCodes(): ReadonlyMap<string, string> {
  const raw = readServerSecret("AUTH_LOGIN_CODES_JSON", {
    required: isProduction(),
  });
  if (!raw) return new Map();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AUTH_LOGIN_CODES_JSON must be a JSON object");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AUTH_LOGIN_CODES_JSON must be a JSON object");
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) throw new Error("AUTH_LOGIN_CODES_JSON cannot be empty");

  const codes = new Map<string, string>();
  const assignedCodes = new Set<string>();
  for (const [identifier, rawCode] of entries) {
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : identifier.replace(/\D/g, "");
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    if (normalizedIdentifier.length < 3) {
      throw new Error("Login identifiers must be valid emails or phone numbers");
    }
    if (code.length < 12 || (isProduction() && isPlaceholder(code))) {
      throw new Error(
        `Login code for ${identifier} must be a non-placeholder value of at least 12 characters`
      );
    }
    if (codes.has(normalizedIdentifier)) {
      throw new Error(`Duplicate login identifier: ${identifier}`);
    }
    if (assignedCodes.has(code)) {
      throw new Error("Every login identifier must use a unique access code");
    }
    codes.set(normalizedIdentifier, code);
    assignedCodes.add(code);
  }
  return codes;
}

function readBoundedInteger(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function readExternalBaseUrl(name: string, fallback: string, allowedHostsName: string) {
  const value = process.env[name]?.trim() || fallback;
  const url = new URL(value);
  if (url.username || url.password) throw new Error(`${name} cannot contain credentials`);
  if (url.search || url.hash) throw new Error(`${name} cannot contain a query string or fragment`);

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && !isProduction() && isLoopback)) {
    throw new Error(`${name} must use HTTPS (HTTP is only allowed for local development)`);
  }
  const allowedHosts = (process.env[allowedHostsName] || new URL(fallback).hostname)
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(`${name} host must be listed in ${allowedHostsName}`);
  }
  return value.replace(/\/$/, "");
}

export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (isProduction() && !raw) throw new Error("CORS_ORIGINS must be configured in production");
  const origins = (raw || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  for (const origin of origins) {
    const url = new URL(origin);
    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      throw new Error("CORS_ORIGINS entries must contain only an origin");
    }
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && (!isProduction() || isLoopback))
    ) {
      throw new Error("CORS_ORIGINS must use HTTPS outside local development");
    }
  }
  return origins;
}

export function getLlmConfig(): LlmConfig {
  const enabled = process.env.LLM_ENABLED === "true";
  const apiKey = readServerSecret("LLM_API_KEY", {
    required: enabled,
    minLength: enabled ? 12 : 1,
  });

  const model = (process.env.LLM_MODEL || "moonshot-v1-8k").trim();
  if (!/^[A-Za-z0-9._:/-]{1,128}$/.test(model)) {
    throw new Error("LLM_MODEL contains unsupported characters");
  }

  return {
    enabled,
    apiKey,
    baseUrl: readExternalBaseUrl(
      "LLM_BASE_URL",
      "https://api.moonshot.cn/v1",
      "LLM_ALLOWED_HOSTS"
    ),
    model,
    timeoutMs: readBoundedInteger("LLM_TIMEOUT_MS", 60_000, 1_000, 120_000),
    maxTokens: readBoundedInteger("LLM_MAX_TOKENS", 1_024, 64, 4_096),
    maxOutputChars: readBoundedInteger("LLM_MAX_OUTPUT_CHARS", 20_000, 1_000, 100_000),
    dailyUserLimit: readBoundedInteger("LLM_DAILY_USER_LIMIT", 20, 1, 10_000),
    dailyGlobalLimit: readBoundedInteger("LLM_DAILY_GLOBAL_LIMIT", 500, 1, 1_000_000),
    maxConcurrency: readBoundedInteger("LLM_MAX_CONCURRENCY", 4, 1, 100),
  };
}

export function validateProductionEnvironment() {
  if (!isProduction()) return;
  getJwtSecret();
  getLoginCodes();
  getLlmConfig();
  getCorsOrigins();
}
