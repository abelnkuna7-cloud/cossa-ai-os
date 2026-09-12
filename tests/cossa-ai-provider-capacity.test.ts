import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCossaRuntimePolicy,
  determineCapacityMode,
  parseRateLimitDurationMs,
  readProviderRateLimitSnapshot,
  shouldRetryProviderStatus,
} from "../src/lib/cossa-ai-provider-capacity.ts";

function headers(values: Record<string, string>): Pick<Headers, "get"> {
  const normalised = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    get(name: string) {
      return normalised.get(name.toLowerCase()) ?? null;
    },
  };
}

test("parses provider reset durations without guessing", () => {
  assert.equal(parseRateLimitDurationMs("7.66s"), 7_660);
  assert.equal(parseRateLimitDurationMs("2m59.56s"), 179_560);
  assert.equal(parseRateLimitDurationMs("1h2m3s"), 3_723_000);
  assert.equal(parseRateLimitDurationMs("nonsense"), null);
});

test("reads rate-limit headers into a safe provider snapshot", () => {
  const snapshot = readProviderRateLimitSnapshot(
    headers({
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "1200",
      "x-ratelimit-limit-requests": "30",
      "x-ratelimit-remaining-requests": "12",
      "x-ratelimit-reset-tokens": "8s",
      "retry-after": "2s",
    }),
    "2026-09-06T15:00:00.000Z",
  );

  assert.equal(snapshot.limitTokens, 8_000);
  assert.equal(snapshot.remainingTokens, 1_200);
  assert.equal(snapshot.resetTokensMs, 8_000);
  assert.equal(snapshot.retryAfterMs, 2_000);
});

test("moves to conserve before provider capacity becomes critical", () => {
  const snapshot = readProviderRateLimitSnapshot(
    headers({
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "1800",
    }),
  );
  assert.equal(determineCapacityMode({ snapshot }), "conserve");
});

test("a 429 immediately protects provider capacity", () => {
  assert.equal(determineCapacityMode({ httpStatus: 429 }), "protect");
});

test("background work is deferred while provider capacity is protected", () => {
  const policy = buildCossaRuntimePolicy({
    priority: "background",
    reasoningDepth: "deep",
    httpStatus: 429,
  });

  assert.equal(policy.action, "defer");
  assert.equal(policy.maxInputCharacters, 0);
  assert.equal(policy.maxCompletionTokens, 0);
});

test("critical work stays available under provider protection", () => {
  const snapshot = readProviderRateLimitSnapshot(
    headers({
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "400",
      "retry-after": "1s",
    }),
  );
  const policy = buildCossaRuntimePolicy({
    priority: "critical",
    reasoningDepth: "deep",
    snapshot,
  });

  assert.equal(policy.capacityMode, "protect");
  assert.equal(policy.action, "conserve");
  assert.ok(policy.maxInputCharacters > 0);
  assert.ok(policy.maxCompletionTokens > 0);
  assert.equal(policy.retryAfterMs, 1_000);
});

test("healthy capacity preserves reasoning-depth budgets", () => {
  const quick = buildCossaRuntimePolicy({
    priority: "normal",
    reasoningDepth: "quick",
  });
  const deep = buildCossaRuntimePolicy({
    priority: "normal",
    reasoningDepth: "deep",
  });

  assert.equal(quick.action, "allow");
  assert.equal(deep.action, "allow");
  assert.ok(deep.maxInputCharacters > quick.maxInputCharacters);
  assert.ok(deep.maxCompletionTokens > quick.maxCompletionTokens);
});

test("retry policy only retries transient provider failures", () => {
  assert.equal(shouldRetryProviderStatus(429), true);
  assert.equal(shouldRetryProviderStatus(503), true);
  assert.equal(shouldRetryProviderStatus(408), true);
  assert.equal(shouldRetryProviderStatus(400), false);
  assert.equal(shouldRetryProviderStatus(401), false);
});
