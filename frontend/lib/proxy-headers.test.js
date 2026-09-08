import assert from "node:assert/strict";
import test from "node:test";
import { buildBackendHeaders } from "./proxy-headers.js";

test("proxy preserves browser CSRF and preflight headers", () => {
  const headers = buildBackendHeaders(
    new Headers({
      origin: "https://app.example.com",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    })
  );

  assert.equal(headers.get("origin"), "https://app.example.com");
  assert.equal(headers.get("access-control-request-method"), "POST");
  assert.equal(headers.get("access-control-request-headers"), "content-type");
});

test("proxy drops spoofable forwarding and hop-by-hop headers", () => {
  const headers = buildBackendHeaders(
    new Headers({
      forwarded: "for=203.0.113.5",
      "x-forwarded-for": "203.0.113.5",
      connection: "upgrade",
      "proxy-authorization": "secret",
      cookie: "echomere_session=safe-to-forward-to-own-backend",
    }),
    "backend.internal"
  );

  assert.equal(headers.get("forwarded"), null);
  assert.equal(headers.get("x-forwarded-for"), null);
  assert.equal(headers.get("connection"), null);
  assert.equal(headers.get("proxy-authorization"), null);
  assert.equal(headers.get("host"), "backend.internal");
  assert.match(headers.get("cookie") || "", /echomere_session/);
});
