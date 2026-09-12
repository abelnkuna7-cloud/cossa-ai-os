import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const serverSource = fs.readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");

test("shared chat ingress resolves one fail-closed memory activation state", () => {
  assert.match(serverSource, /resolveCossaMemoryActivation\(\)/);
  assert.match(serverSource, /memoryActivation\.readEnabled/);
  assert.doesNotMatch(serverSource, /function memoryFeatureEnabled/);
});

test("memory mode is observable without exposing credentials", () => {
  assert.match(serverSource, /x-cossa-ai-memory-mode/);
  assert.match(serverSource, /X-Cossa-AI-Memory-Mode/);
  assert.match(serverSource, /memoryActivation\.mode/);
  assert.doesNotMatch(serverSource, /X-Cossa-AI-Memory-Writeback-Key/i);
  assert.doesNotMatch(serverSource, /X-Cossa-AI-API-Key/i);
});

test("disabled memory remains explicitly ungrounded", () => {
  assert.match(
    serverSource,
    /else \{\s*headers\.set\("x-cossa-ai-memory-grounded", "false"\);\s*\}/,
  );
});