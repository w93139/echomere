import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalPath } from "./navigation.js";

test("keeps valid internal paths", () => {
  assert.equal(safeInternalPath("/chat?reportId=1#result", "/"), "/chat?reportId=1#result");
});

test("rejects external and executable destinations", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example/path",
    "javascript:alert(1)",
    "/\\evil.example",
    "chat",
    "",
    null,
  ]) {
    assert.equal(safeInternalPath(value, "/chat"), "/chat");
  }
});
