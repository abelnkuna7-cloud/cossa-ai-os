export type CossaCapacityMode = "normal" | "conserve" | "protect";
export type CossaRuntimeAction = "allow" | "conserve" | "defer";
export type CossaReasoningDepth = "quick" | "standard" | "deep";
export type CossaTaskPriority = "critical" | "high" | "normal" | "background";

export interface CossaProviderRateLimitSnapshot {
  limitTokens: number | null;
  remainingTokens: number | null;
  limitRequests: number | null;
  remainingRequests: number | null;
  resetTokensMs: number | null;
  resetRequestsMs: number | null;
  retryAfterMs: number | null;
  observedAt: string;
}

export interface CossaRuntimePolicy {
  capacityMode: CossaCapacityMode;
  action: CossaRuntimeAction;
  maxInputCharacters: number;
  maxCompletionTokens: number;
  retryAfterMs: number | null;
  reason: string;
}

type HeaderReader = Pick<Headers, "get">;

const DEFAULT_INPUT_BUDGETS: Record<CossaReasoningDepth, number> = {
  quick: 10_000,
  standard: 16_000,
  deep: 22_000,
};

const DEFAULT_COMPLETION_BUDGETS: Record<CossaReasoningDepth, number> = {
  quick: 450,
  standard: 700,
  deep: 1_000,
};

function finiteNonNegative(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Groq reset headers can contain values such as "2m59.56s" or "7.66s".
 * Keep the parser provider-agnostic so the same runtime policy can be reused
 * with future gateways that expose human-readable reset durations.
 */
export function parseRateLimitDurationMs(value: string | null): number | null {
  if (!value?.trim()) return null;
  const input = value.trim().toLowerCase();

  if (/^\d+(?:\.\d+)?$/.test(input)) {
    const seconds = Number(input);
    return Number.isFinite(seconds) ? Math.round(seconds * 1_000) : null;
  }

  const unitPattern = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  let total = 0;
  let consumed = "";
  let match: RegExpExecArray | null;

  while ((match = unitPattern.exec(input)) !== null) {
    consumed += match[0];
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) return null;
    total +=
      unit === "ms"
        ? amount
        : unit === "s"
          ? amount * 1_000
          : unit === "m"
            ? amount * 60_000
            : amount * 3_600_000;
  }

  return consumed === input && total >= 0 ? Math.round(total) : null;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value?.trim()) return null;
  const direct = parseRateLimitDurationMs(value);
  if (direct !== null) return direct;

  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, date - Date.now());
}

export function readProviderRateLimitSnapshot(
  headers: HeaderReader,
  observedAt = new Date().toISOString(),
): CossaProviderRateLimitSnapshot {
  return {
    limitTokens: finiteNonNegative(headers.get("x-ratelimit-limit-tokens")),
    remainingTokens: finiteNonNegative(headers.get("x-ratelimit-remaining-tokens")),
    limitRequests: finiteNonNegative(headers.get("x-ratelimit-limit-requests")),
    remainingRequests: finiteNonNegative(headers.get("x-ratelimit-remaining-requests")),
    resetTokensMs: parseRateLimitDurationMs(headers.get("x-ratelimit-reset-tokens")),
    resetRequestsMs: parseRateLimitDurationMs(headers.get("x-ratelimit-reset-requests")),
    retryAfterMs: parseRetryAfterMs(headers.get("retry-after")),
    observedAt,
  };
}

function remainingRatio(remaining: number | null, limit: number | null): number | null {
  if (remaining === null || limit === null || limit <= 0) return null;
  return remaining / limit;
}

export function determineCapacityMode({
  snapshot,
  httpStatus,
}: {
  snapshot?: CossaProviderRateLimitSnapshot | null;
  httpStatus?: number | null;
}): CossaCapacityMode {
  if (httpStatus === 429) return "protect";
  if (!snapshot) return "normal";

  const tokenRatio = remainingRatio(snapshot.remainingTokens, snapshot.limitTokens);
  const requestRatio = remainingRatio(snapshot.remainingRequests, snapshot.limitRequests);

  if (
    (snapshot.remainingTokens !== null && snapshot.remainingTokens <= 800) ||
    (tokenRatio !== null && tokenRatio <= 0.08) ||
    (requestRatio !== null && requestRatio <= 0.08)
  ) {
    return "protect";
  }

  if (
    (tokenRatio !== null && tokenRatio <= 0.25) ||
    (requestRatio !== null && requestRatio <= 0.25)
  ) {
    return "conserve";
  }

  return "normal";
}

export function shouldRetryProviderStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function protectedPriority(priority: CossaTaskPriority): boolean {
  return priority === "critical" || priority === "high";
}

/**
 * Converts provider telemetry into a deterministic execution policy.
 *
 * The policy never drops CEO/critical or customer-critical work solely because
 * a provider is constrained. Background work can be deferred so scarce
 * capacity remains available for the group and customers.
 */
export function buildCossaRuntimePolicy({
  priority,
  reasoningDepth,
  snapshot,
  httpStatus,
}: {
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
  snapshot?: CossaProviderRateLimitSnapshot | null;
  httpStatus?: number | null;
}): CossaRuntimePolicy {
  const capacityMode = determineCapacityMode({ snapshot, httpStatus });
  const baseInput = DEFAULT_INPUT_BUDGETS[reasoningDepth];
  const baseCompletion = DEFAULT_COMPLETION_BUDGETS[reasoningDepth];
  const retryAfterMs = snapshot?.retryAfterMs ?? null;

  if (capacityMode === "protect" && priority === "background") {
    return {
      capacityMode,
      action: "defer",
      maxInputCharacters: 0,
      maxCompletionTokens: 0,
      retryAfterMs,
      reason: "Provider capacity is protected for critical, high-priority and customer-facing work.",
    };
  }

  if (capacityMode === "protect") {
    return {
      capacityMode,
      action: "conserve",
      maxInputCharacters: Math.min(baseInput, protectedPriority(priority) ? 10_000 : 8_000),
      maxCompletionTokens: Math.min(baseCompletion, protectedPriority(priority) ? 550 : 400),
      retryAfterMs,
      reason: protectedPriority(priority)
        ? "Critical/high-priority work remains available with a reduced provider budget."
        : "Provider capacity is constrained; Cossa should use a compact evidence window and concise completion.",
    };
  }

  if (capacityMode === "conserve") {
    return {
      capacityMode,
      action: "conserve",
      maxInputCharacters: Math.min(baseInput, 14_000),
      maxCompletionTokens: Math.min(baseCompletion, 650),
      retryAfterMs,
      reason: "Provider capacity is declining; reduce context and output before a hard limit is reached.",
    };
  }

  return {
    capacityMode,
    action: "allow",
    maxInputCharacters: baseInput,
    maxCompletionTokens: baseCompletion,
    retryAfterMs,
    reason: "Provider capacity is healthy for the requested reasoning depth.",
  };
}
