import assert from "node:assert/strict";
import test from "node:test";

import {
  decideCossaIntelligenceSources,
  getGroqCapacityMode,
  shouldDeferBackgroundWork,
} from "../src/lib/cossa-ai-intelligence.ts";

test("uses Cossa memory and knowledge without external research by default", () => {
  const decision = decideCossaIntelligenceSources("Who supplies our Store?");

  assert.deepEqual(decision.sources, ["memory", "knowledge", "operational"]);
  assert.equal(decision.needsExternalResearch, false);
});

test("adds external research only for freshness-sensitive requests", () => {
  const decision = decideCossaIntelligenceSources(
    "What tender opportunities appeared today in Gauteng?",
  );

  assert.equal(decision.needsExternalResearch, true);
  assert.deepEqual(decision.sources, ["memory", "knowledge", "external"]);
});

test("protects Groq capacity when remaining tokens are low", () => {
  assert.equal(getGroqCapacityMode({ remainingTokens: 900 }), "protect");
  assert.equal(getGroqCapacityMode({ remainingTokens: 2_500 }), "conserve");
  assert.equal(getGroqCapacityMode({ remainingTokens: 8_000 }), "normal");
});

test("never defers critical or high-priority work solely because Groq is constrained", () => {
  assert.equal(shouldDeferBackgroundWork("critical", "protect"), false);
  assert.equal(shouldDeferBackgroundWork("high", "protect"), false);
  assert.equal(shouldDeferBackgroundWork("background", "protect"), true);
  assert.equal(shouldDeferBackgroundWork("background", "conserve"), true);
});
