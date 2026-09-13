import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCossaRuntimePolicy,
  determineCapacityMode,
  parseRateLimitDurationMs,
  readProviderRateLimitSnapshot,
  shouldRetryProviderStatus,
} from "../src/lib/cossa-ai-provider-capacity.ts";

describe("Cossa provider capacity policy", () => {
  it("parses provider reset durations", () => {
    assert.equal(parseRateLimitDurationMs("2m59.56s"), 179560);
    assert.equal(parseRateLimitDurationMs("7.66s"), 7660);
    assert.equal(parseRateLimitDurationMs("500ms"), 500);
  });

  it("reads rate-limit headers without exposing credentials", () => {
    const headers = new Headers({
      "x-ratelimit-limit-tokens": "10000",
      "x-ratelimit-remaining-tokens": "2000",
      "x-ratelimit-limit-requests": "100",
      "x-ratelimit-remaining-requests": "20",
      "x-ratelimit-reset-tokens": "30s",
    });
    const snapshot = readProviderRateLimitSnapshot(headers, "2026-09-12T17:00:00.000Z");
    assert.equal(snapshot.remainingTokens, 2000);
    assert.equal(snapshot.resetTokensMs, 30000);
    assert.equal(determineCapacityMode({ snapshot }), "conserve");
  });

  it("protects free capacity by deferring background work", () => {
    const policy = buildCossaRuntimePolicy({
      priority: "background",
      reasoningDepth: "deep",
      httpStatus: 429,
    });
    assert.equal(policy.capacityMode, "protect");
    assert.equal(policy.action, "defer");
    assert.equal(policy.maxCompletionTokens, 0);
  });

  it("keeps high-priority work available under constrained capacity", () => {
    const policy = buildCossaRuntimePolicy({
      priority: "high",
      reasoningDepth: "deep",
      httpStatus: 429,
    });
    assert.equal(policy.action, "conserve");
    assert.ok(policy.maxCompletionTokens > 0);
  });

  it("only retries transient provider statuses", () => {
    assert.equal(shouldRetryProviderStatus(429), true);
    assert.equal(shouldRetryProviderStatus(503), true);
    assert.equal(shouldRetryProviderStatus(401), false);
  });
});