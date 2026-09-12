import { describe, expect, it } from "vitest";
import {
  buildCossaRuntimePolicy,
  determineCapacityMode,
  parseRateLimitDurationMs,
  readProviderRateLimitSnapshot,
  shouldRetryProviderStatus,
} from "../src/lib/cossa-ai-provider-capacity";

describe("Cossa provider capacity policy", () => {
  it("parses provider reset durations", () => {
    expect(parseRateLimitDurationMs("2m59.56s")).toBe(179560);
    expect(parseRateLimitDurationMs("7.66s")).toBe(7660);
    expect(parseRateLimitDurationMs("500ms")).toBe(500);
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
    expect(snapshot.remainingTokens).toBe(2000);
    expect(snapshot.resetTokensMs).toBe(30000);
    expect(determineCapacityMode({ snapshot })).toBe("conserve");
  });

  it("protects free capacity by deferring background work", () => {
    const policy = buildCossaRuntimePolicy({
      priority: "background",
      reasoningDepth: "deep",
      httpStatus: 429,
    });
    expect(policy.capacityMode).toBe("protect");
    expect(policy.action).toBe("defer");
    expect(policy.maxCompletionTokens).toBe(0);
  });

  it("keeps high-priority work available under constrained capacity", () => {
    const policy = buildCossaRuntimePolicy({
      priority: "high",
      reasoningDepth: "deep",
      httpStatus: 429,
    });
    expect(policy.action).toBe("conserve");
    expect(policy.maxCompletionTokens).toBeGreaterThan(0);
  });

  it("only retries transient provider statuses", () => {
    expect(shouldRetryProviderStatus(429)).toBe(true);
    expect(shouldRetryProviderStatus(503)).toBe(true);
    expect(shouldRetryProviderStatus(401)).toBe(false);
  });
});
