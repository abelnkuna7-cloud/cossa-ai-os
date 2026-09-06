export interface CossaProviderCooldownInput {
  httpStatus: number;
  retryAfterMs?: number | null;
  resetTokensMs?: number | null;
  resetRequestsMs?: number | null;
  observedAtMs?: number;
}

export interface CossaProviderCooldown {
  active: boolean;
  untilMs: number | null;
  remainingMs: number;
  reason: string;
}

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 5_000;
const MAX_PROVIDER_COOLDOWN_MS = 15 * 60_000;

function finiteNonNegative(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function boundedCooldown(value: number): number {
  return Math.min(MAX_PROVIDER_COOLDOWN_MS, Math.max(0, Math.floor(value)));
}

/**
 * Turns provider retry/reset telemetry into a bounded cooldown window.
 *
 * This prevents a warm server instance from treating one historical 429 as a
 * permanent outage. The provider remains protected only until the provider's
 * retry/reset window expires, after which Cossa may cautiously try it again.
 */
export function createProviderCooldown({
  httpStatus,
  retryAfterMs,
  resetTokensMs,
  resetRequestsMs,
  observedAtMs = Date.now(),
}: CossaProviderCooldownInput): CossaProviderCooldown {
  if (httpStatus !== 429) {
    return {
      active: false,
      untilMs: null,
      remainingMs: 0,
      reason: "Provider is not currently rate-limited.",
    };
  }

  const retry = finiteNonNegative(retryAfterMs);
  const tokenReset = finiteNonNegative(resetTokensMs);
  const requestReset = finiteNonNegative(resetRequestsMs);
  const candidates = [retry, tokenReset, requestReset].filter(
    (value): value is number => value !== null,
  );
  const duration = boundedCooldown(
    candidates.length > 0 ? Math.max(...candidates) : DEFAULT_RATE_LIMIT_COOLDOWN_MS,
  );
  const untilMs = observedAtMs + duration;

  return {
    active: duration > 0,
    untilMs,
    remainingMs: duration,
    reason:
      retry !== null
        ? "Provider cooldown follows retry-after telemetry."
        : candidates.length > 0
          ? "Provider cooldown follows reported rate-limit reset telemetry."
          : "Provider cooldown uses a short bounded fallback because no reset telemetry was returned.",
  };
}

export function evaluateProviderCooldown(
  cooldownUntilMs: number | null | undefined,
  nowMs = Date.now(),
): CossaProviderCooldown {
  const untilMs = finiteNonNegative(cooldownUntilMs);
  if (untilMs === null || untilMs <= nowMs) {
    return {
      active: false,
      untilMs: null,
      remainingMs: 0,
      reason: "Provider cooldown has expired or was never set.",
    };
  }

  return {
    active: true,
    untilMs,
    remainingMs: untilMs - nowMs,
    reason: "Provider cooldown is still active; avoid spending another request before reset.",
  };
}
