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

function observedAtMilliseconds(observedAt: string): number {
  const parsed = Date.parse(observedAt);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function storeProviderObservation({
  provider,
  snapshot,
  status,
  ok,
  observedAt,
}: {
  provider: CossaRuntimeProvider;
  snapshot: CossaProviderRateLimitSnapshot;
  status: number;
  ok: boolean;
  observedAt: string;
}): void {
  const previous = stateFor(provider);
  const cooldown = createProviderCooldown({
    httpStatus: status,
    retryAfterMs: snapshot.retryAfterMs,
    resetTokensMs: snapshot.resetTokensMs,
    resetRequestsMs: snapshot.resetRequestsMs,
    observedAtMs: observedAtMilliseconds(observedAt),
  });

  states.set(provider, {
    snapshot,
    lastHttpStatus: status,
    consecutiveFailures: ok ? 0 : previous.consecutiveFailures + 1,
    cooldownUntilMs: ok ? null : cooldown.untilMs,
    updatedAt: observedAt,
  });
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
  storeProviderObservation({
    provider,
    snapshot,
    status: response.status,
    ok: response.ok,
    observedAt,
  });
  return snapshot;
}

/**
 * Records an upstream response that the provider adapter has already classified
 * as a capacity/rate-limit failure. Some OpenAI-compatible providers return
 * HTTP 413 for token-capacity limits rather than 429. The generic observer must
 * not guess that every 413 is a rate limit, so the adapter uses this explicit
 * method only after it has inspected the provider error safely.
 */
export function observeProviderCapacityFailure(
  provider: CossaRuntimeProvider,
  response: Pick<Response, "headers" | "status" | "ok">,
  observedAt = new Date().toISOString(),
): CossaProviderRateLimitSnapshot {
  const snapshot = readProviderRateLimitSnapshot(response.headers, observedAt);
  storeProviderObservation({
    provider,
    snapshot,
    status: 429,
    ok: false,
    observedAt,
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
