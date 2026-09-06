import {
  buildCossaRuntimePolicy,
  readProviderRateLimitSnapshot,
  type CossaProviderRateLimitSnapshot,
  type CossaReasoningDepth,
  type CossaRuntimePolicy,
  type CossaTaskPriority,
} from "./cossa-ai-provider-capacity.ts";

export type CossaRuntimeProvider = "groq" | "gemini" | "openai";

interface ProviderRuntimeState {
  snapshot: CossaProviderRateLimitSnapshot | null;
  lastHttpStatus: number | null;
  consecutiveFailures: number;
  updatedAt: string | null;
}

export interface ProviderRuntimeDecision {
  provider: CossaRuntimeProvider;
  policy: CossaRuntimePolicy;
  consecutiveFailures: number;
}

const states = new Map<CossaRuntimeProvider, ProviderRuntimeState>();

function stateFor(provider: CossaRuntimeProvider): ProviderRuntimeState {
  return (
    states.get(provider) ?? {
      snapshot: null,
      lastHttpStatus: null,
      consecutiveFailures: 0,
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

  states.set(provider, {
    snapshot,
    lastHttpStatus: response.status,
    consecutiveFailures: response.ok ? 0 : previous.consecutiveFailures + 1,
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
    updatedAt: observedAt,
  });
}

export function providerRuntimeDecision({
  provider,
  priority,
  reasoningDepth,
}: {
  provider: CossaRuntimeProvider;
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
}): ProviderRuntimeDecision {
  const state = stateFor(provider);
  const policy = buildCossaRuntimePolicy({
    priority,
    reasoningDepth,
    snapshot: state.snapshot,
    httpStatus: state.lastHttpStatus,
  });

  return {
    provider,
    policy,
    consecutiveFailures: state.consecutiveFailures,
  };
}

/**
 * Reorders configured providers without creating another AI call.
 * Providers in protect mode move behind healthy providers for normal/background
 * work. Critical/high work remains eligible and uses the reduced runtime budget.
 */
export function orderProvidersByRuntime<T extends CossaRuntimeProvider>({
  providers,
  priority,
  reasoningDepth,
}: {
  providers: readonly T[];
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
}): T[] {
  return providers
    .map((provider, index) => ({
      provider,
      index,
      decision: providerRuntimeDecision({ provider, priority, reasoningDepth }),
    }))
    .sort((a, b) => {
      const rank = (decision: ProviderRuntimeDecision) =>
        decision.policy.action === "allow" ? 0 : decision.policy.action === "conserve" ? 1 : 2;
      return rank(a.decision) - rank(b.decision) ||
        a.decision.consecutiveFailures - b.decision.consecutiveFailures ||
        a.index - b.index;
    })
    .map((entry) => entry.provider);
}

export function resetProviderRuntimeForTests(): void {
  states.clear();
}
