import assert from "node:assert/strict";
import test from "node:test";

import {
  appendCossaProviderObservabilityHeaders,
  buildCossaProviderObservability,
} from "../src/lib/cossa-ai-provider-observability.ts";

test("provider observability exposes only safe execution posture", () => {
  const snapshot = buildCossaProviderObservability({
    selectedProvider: "groq",
    providerOrder: ["gemini", "groq", "groq"],
    fallbackUsed: true,
    policy: {
      capacityMode: "protect",
      action: "conserve",
      maxInputCharacters: 8_000,
      maxCompletionTokens: 400,
      retryAfterMs: 2_500,
      reason: "Provider capacity is constrained.",
    },
  });

  assert.deepEqual(snapshot, {
    provider: "groq",
    providerOrder: "gemini>groq",
    capacityMode: "protect",
    runtimeAction: "conserve",
    fallbackUsed: true,
    retryAfterMs: 2_500,
  });
  assert.equal("reason" in snapshot, false);
  assert.equal("maxInputCharacters" in snapshot, false);
  assert.equal("maxCompletionTokens" in snapshot, false);
});

test("retry-after observability is bounded and headers are explicitly exposed", () => {
  const snapshot = buildCossaProviderObservability({
    selectedProvider: "gemini",
    providerOrder: ["gemini", "groq"],
    fallbackUsed: false,
    policy: {
      capacityMode: "conserve",
      action: "conserve",
      maxInputCharacters: 14_000,
      maxCompletionTokens: 650,
      retryAfterMs: 500_000,
      reason: "Capacity declining.",
    },
  });

  const headers = appendCossaProviderObservabilityHeaders(new Headers(), snapshot);
  assert.equal(headers.get("X-Cossa-AI-Capacity-Mode"), "conserve");
  assert.equal(headers.get("X-Cossa-AI-Runtime-Action"), "conserve");
  assert.equal(headers.get("X-Cossa-AI-Provider-Order"), "gemini>groq");
  assert.equal(headers.get("X-Cossa-AI-Fallback"), "false");
  assert.equal(headers.get("X-Cossa-AI-Retry-After-Ms"), "60000");
  assert.match(headers.get("Access-Control-Expose-Headers") ?? "", /X-Cossa-AI-Capacity-Mode/);
});
