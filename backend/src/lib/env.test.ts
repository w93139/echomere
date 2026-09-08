import assert from "node:assert/strict";
import test from "node:test";
import {
  getCorsOrigins,
  getJwtSecret,
  getLoginCodes,
  getLlmConfig,
  readServerSecret,
} from "./env.js";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("server secrets cannot use browser-exposed prefixes", () => {
  assert.throws(() => readServerSecret("NEXT_PUBLIC_VENDOR_KEY"), /public environment prefix/);
});

test("production login codes are bound to individual identifiers", () => {
  withEnv(
    {
      NODE_ENV: "production",
      AUTH_LOGIN_CODES_JSON: JSON.stringify({ "member@example.com": "a-secure-code-123" }),
    },
    () => assert.equal(getLoginCodes().get("member@example.com"), "a-secure-code-123")
  );
});

test("production rejects one access code assigned to multiple identities", () => {
  withEnv(
    {
      NODE_ENV: "production",
      AUTH_LOGIN_CODES_JSON: JSON.stringify({
        "first@example.com": "a-secure-code-123",
        "second@example.com": "a-secure-code-123",
      }),
    },
    () => assert.throws(() => getLoginCodes(), /unique access code/)
  );
});

test("production rejects a low-diversity JWT secret", () => {
  withEnv(
    { NODE_ENV: "production", JWT_SECRET: "a".repeat(32), JWT_SECRET_FILE: undefined },
    () => assert.throws(() => getJwtSecret(), /random characters/)
  );
});

test("paid LLM access is disabled unless explicitly enabled", () => {
  withEnv({ NODE_ENV: "test", LLM_ENABLED: undefined, LLM_API_KEY: "secret-key-value" }, () => {
    assert.equal(getLlmConfig().enabled, false);
  });
});

test("production external API URLs must use HTTPS", () => {
  withEnv(
    { NODE_ENV: "production", LLM_ENABLED: undefined, LLM_BASE_URL: "http://api.example.com" },
    () => assert.throws(() => getLlmConfig(), /must use HTTPS/)
  );
});

test("external API credentials cannot be sent to a host outside the allowlist", () => {
  withEnv(
    {
      NODE_ENV: "production",
      LLM_ENABLED: "true",
      LLM_API_KEY: "a-secure-api-key",
      LLM_BASE_URL: "https://unexpected.example/v1",
      LLM_ALLOWED_HOSTS: "api.example.com",
    },
    () => assert.throws(() => getLlmConfig(), /must be listed/)
  );
});

test("production CORS origins reject non-HTTPS remote sites", () => {
  withEnv(
    { NODE_ENV: "production", CORS_ORIGINS: "http://public.example.com" },
    () => assert.throws(() => getCorsOrigins(), /must use HTTPS/)
  );
});
