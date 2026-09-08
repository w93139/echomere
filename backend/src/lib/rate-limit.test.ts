import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { apiRateLimitKey, loginRateLimitKey } from "./rate-limit.js";

function request(values: Partial<Request>): Request {
  return values as Request;
}

test("rotating invalid bearer tokens cannot create new API limiter buckets", () => {
  const first = apiRateLimitKey(
    request({ headers: { authorization: "Bearer forged-token-one" }, ip: "203.0.113.10" })
  );
  const second = apiRateLimitKey(
    request({ headers: { authorization: "Bearer forged-token-two" }, ip: "203.0.113.10" })
  );
  assert.equal(first, second);
  assert.equal(first, "ip:203.0.113.10");
});

test("login throttling normalizes the target identity", () => {
  const first = loginRateLimitKey(
    request({ headers: {}, body: { email: " Member@Example.com " }, ip: "203.0.113.10" })
  );
  const second = loginRateLimitKey(
    request({ headers: {}, body: { email: "member@example.com" }, ip: "198.51.100.5" })
  );
  assert.equal(first, second);
  assert.match(first, /^identity:[0-9a-f]{64}$/);
});
