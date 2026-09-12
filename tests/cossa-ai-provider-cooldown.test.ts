import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderCooldown,
  evaluateProviderCooldown,
} from "../src/lib/cossa-ai-provider-cooldown.ts";

test("429 honours retry-after instead of becoming permanent provider protection", () => {
  const cooldown = createProviderCooldown({
    httpStatus: 429,
    retryAfterMs: 7_000,
    observedAtMs: 10_000,
  });

  assert.equal(cooldown.active, true);
  assert.equal(cooldown.untilMs, 17_000);
  assert.equal(cooldown.remainingMs, 7_000);
  assert.match(cooldown.reason, /retry-after/i);
});

test("rate-limit reset telemetry is used when retry-after is absent", () => {
  const cooldown = createProviderCooldown({
    httpStatus: 429,
    resetTokensMs: 8_000,
    resetRequestsMs: 2_000,
    observedAtMs: 100,
  });

  assert.equal(cooldown.untilMs, 8_100);
  assert.equal(cooldown.remainingMs, 8_000);
});

test("429 without telemetry gets a short bounded fallback cooldown", () => {
  const cooldown = createProviderCooldown({
    httpStatus: 429,
    observedAtMs: 2_000,
  });

  assert.equal(cooldown.active, true);
  assert.equal(cooldown.untilMs, 7_000);
  assert.equal(cooldown.remainingMs, 5_000);
});

test("non-rate-limit failures do not create a provider cooldown", () => {
  const cooldown = createProviderCooldown({
    httpStatus: 503,
    retryAfterMs: 60_000,
    observedAtMs: 10_000,
  });

  assert.equal(cooldown.active, false);
  assert.equal(cooldown.untilMs, null);
});

test("expired cooldown becomes eligible for cautious provider reuse", () => {
  assert.equal(evaluateProviderCooldown(20_000, 19_000).active, true);
  assert.equal(evaluateProviderCooldown(20_000, 20_000).active, false);
  assert.equal(evaluateProviderCooldown(20_000, 21_000).active, false);
});

test("extreme retry-after values are bounded", () => {
  const cooldown = createProviderCooldown({
    httpStatus: 429,
    retryAfterMs: 24 * 60 * 60_000,
    observedAtMs: 0,
  });

  assert.equal(cooldown.remainingMs, 15 * 60_000);
});
