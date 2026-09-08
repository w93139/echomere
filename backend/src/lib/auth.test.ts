import assert from "node:assert/strict";
import test from "node:test";
import { blacklistToken, signToken, verifyToken } from "./auth.js";

test("signed sessions require the configured algorithm, issuer, audience, and expiry", () => {
  const token = signToken({ userId: "test-user" });
  const payload = verifyToken(token);
  assert.equal(payload.userId, "test-user");
  assert.match(payload.jti, /^[0-9a-f-]{36}$/i);
  assert.ok(payload.exp > Date.now() / 1_000);
});

test("a forged logout token is rejected before any blacklist write", async () => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const forged = [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      userId: "attacker",
      jti: "00000000-0000-4000-8000-000000000000",
      exp: 4_102_444_800,
      iss: "echomere-backend",
      aud: "echomere-web",
    }),
    "invalid-signature",
  ].join(".");

  await assert.rejects(() => blacklistToken(forged));
});
