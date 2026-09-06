import {
  buildCossaRuntimePolicy,
  readProviderRateLimitSnapshot,
  type CossaProviderRateLimitSnapshot,
  type CossaReasoningDepth,
  type CossaRuntimePolicy,
  type CossaTaskPriority,
} from "./cossa-ai-provider-capacity.ts";
import {
  createProviderCooldown,
  evaluateProviderCooldown,
} from "./cossa-ai-provider-cooldown.ts";

export type CossaRuntimeProvider = "groq" | "gemini" | "openai";

interface ProviderRuntimeState {
  snapshot: CossaProviderRateLimitSnapshot | null;
  lastHttpStatus: number | null;
  consecutiveFailures: number;
  cooldownUntilMs: number | null;
  updatedAt: string | null;
}

export interface ProviderRuntimeDecision {
  provider: CossaRuntimeProvider;
  policy: CossaRuntimePolicy;
  consecutiveFailures: number;
  cooldownRemainingMs: number;
}

const states = new Map<CossaRuntimeProvider, ProviderRuntimeState>();

function stateFor(provider: CossaRuntimeProvider): ProviderRuntimeState {
  return (
    states.get(provider) ?? {
      snapshot: null,
      lastHttpStatus: null,
      consecutiveFailures: 0,
      cooldownUntilMs: null,
      updatedAt: null,
    }
  );
}

/**
 * Records only rate-limit/capacity metadata. Never store credentials, prompts,
 * response bodies, customer data or private Cossa context in this runtime map.
 */
export function observeProviderResponse(
  provider: CossaRuntimeProvider,
  response: Pick<Response, "headers" | "status" | "ok">,
  observedAt = new Date().toISOString(),
): CossaProviderRateLimitSnapshot {
  const snapshot = readProviderRateLimitSnapshot(response.headers, observedAt);
  const previous = stateFor(provider);
  const observedAtMs = Date.parse(observedAt);
  const safeObservedAtMs = Number.isFinite(observedAtMs) ? observedAtMs : Date.now();
  const cooldown = createProviderCooldown({
    httpStatus: response.status,
    retryAfterMs: snapshot.retryAfterMs,
    resetTokensMs: snapshot.resetTokensMs,
    resetRequestsMs: snapshot.resetRequestsMs,
    observedAtMs: safeObservedAtMs,
  });

  states.set(provider, {
    snapshot,
    lastHttpStatus: response.status,
    consecutiveFailures: response.ok ? 0 : previous.consecutiveFailures + 1,
    cooldownUntilMs: response.ok ? null : cooldown.untilMs,
    updatedAt: observedAt,
  });

  return snapshot;
}

export function observeProviderConnectionFailure(
  provider: CossaRuntimeProvider,
  observedAt = new Date().toISOString(),
): void {
  const previous = stateFor(provider);
  states.set(provider, {
    ...previous,
    lastHttpStatus: 503,
    consecutiveFailures: previous.consecutiveFailures + 1,
    cooldownUntilMs: null,
    updatedAt: observedAt,
  });
}

export function providerRuntimeDecision({
  provider,
  priority,
  reasoningDepth,
  nowMs = Date.now(),
}: {
  provider: CossaRuntimeProvider;
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
  nowMs?: number;
}): ProviderRuntimeDecision {
  const state = stateFor(provider);
  const cooldown = evaluateProviderCooldown(state.cooldownUntilMs, nowMs);
  const staleRateLimit = state.lastHttpStatus === 429 && !cooldown.active;
  const policy = buildCossaRuntimePolicy({
    priority,
    reasoningDepth,
    snapshot: staleRateLimit ? null : state.snapshot,
    httpStatus: staleRateLimit ? null : state.lastHttpStatus,
  });

  return {
    provider,
    policy,
    // Once a 429 cooldown has genuinely expired, do not keep penalising that
    // provider in the ordering solely because of the historical rate-limit hit.
    // A future failed response will immediately restore the failure penalty.
    consecutiveFailures: staleRateLimit ? 0 : state.consecutiveFailures,
    cooldownRemainingMs: cooldown.remainingMs,
  };
}

/**
 * Reorders configured providers without creating another AI call.
 * Providers in protect mode move behind healthy providers for normal/background
 * work. Critical/high work remains eligible and uses the reduced runtime budget.
 * Expired 429 telemetry becomes eligible for cautious reuse instead of leaving
 * a warm server process stuck in protect mode forever.
 */
export function orderProvidersByRuntime<T extends CossaRuntimeProvider>({
  providers,
  priority,
  reasoningDepth,
  nowMs = Date.now(),
}: {
  providers: readonly T[];
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
  nowMs?: number;
}): T[] {
  return providers
    .map((provider, index) => ({
      provider,
      index,
      decision: providerRuntimeDecision({ provider, priority, reasoningDepth, nowMs }),
    }))
    .sort((a, b) => {
      const rank = (decision: ProviderRuntimeDecision) =>
        decision.policy.action === "allow" ? 0 : decision.policy.action === "conserve" ? 1 : 2;
      return (
        rank(a.decision) - rank(b.decision) ||
        a.decision.consecutiveFailures - b.decision.consecutiveFailures ||
        a.index - b.index
      );
    })
    .map((entry) => entry.provider);
}

export function resetProviderRuntimeForTests(): void {
  states.clear();
}
