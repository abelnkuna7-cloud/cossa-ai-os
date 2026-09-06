import assert from "node:assert/strict";
import test from "node:test";

import {
  observeProviderResponse,
  orderProvidersByRuntime,
  providerRuntimeDecision,
  resetProviderRuntimeForTests,
} from "../src/lib/cossa-ai-provider-runtime.ts";

function response(status: number, headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
  };
}

test("healthy provider remains first in configured order", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(200, {
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "7000",
    }),
  );

  assert.deepEqual(
    orderProvidersByRuntime({
      providers: ["groq", "gemini"],
      priority: "normal",
      reasoningDepth: "standard",
    }),
    ["groq", "gemini"],
  );
});

test("provider in protect mode moves behind a healthy configured provider", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "retry-after": "7",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
  );

  assert.deepEqual(
    orderProvidersByRuntime({
      providers: ["groq", "gemini"],
      priority: "normal",
      reasoningDepth: "standard",
    }),
    ["gemini", "groq"],
  );

  const decision = providerRuntimeDecision({
    provider: "groq",
    priority: "background",
    reasoningDepth: "standard",
  });
  assert.equal(decision.policy.capacityMode, "protect");
  assert.equal(decision.policy.action, "defer");
  assert.equal(decision.policy.retryAfterMs, 7000);
  assert.ok(decision.cooldownRemainingMs > 0);
});

test("critical work is conserved rather than deferred under provider pressure", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
  );

  const decision = providerRuntimeDecision({
    provider: "groq",
    priority: "critical",
    reasoningDepth: "deep",
  });

  assert.equal(decision.policy.action, "conserve");
  assert.ok(decision.policy.maxInputCharacters > 0);
  assert.ok(decision.policy.maxCompletionTokens > 0);
});

test("expired 429 cooldown does not leave a warm runtime permanently protected", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "retry-after": "2",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
    "2026-09-06T16:00:00.000Z",
  );

  const duringCooldown = providerRuntimeDecision({
    provider: "groq",
    priority: "normal",
    reasoningDepth: "standard",
    nowMs: Date.parse("2026-09-06T16:00:01.000Z"),
  });
  assert.equal(duringCooldown.policy.capacityMode, "protect");
  assert.equal(duringCooldown.cooldownRemainingMs, 1_000);

  const afterCooldown = providerRuntimeDecision({
    provider: "groq",
    priority: "normal",
    reasoningDepth: "standard",
    nowMs: Date.parse("2026-09-06T16:00:03.000Z"),
  });
  assert.equal(afterCooldown.cooldownRemainingMs, 0);
  assert.equal(afterCooldown.policy.capacityMode, "normal");
  assert.notEqual(afterCooldown.policy.action, "defer");
});
