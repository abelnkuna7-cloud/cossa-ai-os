import {
  buildCossaProviderExecutionPlan,
  type CossaProviderExecutionPlan,
} from "./cossa-ai-provider-execution-plan.ts";
import {
  buildCossaProviderObservability,
  type CossaProviderObservability,
} from "./cossa-ai-provider-observability.ts";
import {
  observeProviderConnectionFailure,
  observeProviderResponse,
  providerRuntimeDecision,
  type CossaRuntimeProvider,
  type ProviderRuntimeDecision,
} from "./cossa-ai-provider-runtime.ts";

type HeaderReader = Pick<Headers, "get">;

export interface CossaProviderGatewayController {
  executionPlan: CossaProviderExecutionPlan;
  decisionFor(provider: CossaRuntimeProvider, nowMs?: number): ProviderRuntimeDecision;
  recordHttpResponse(
    provider: CossaRuntimeProvider,
    response: Pick<Response, "headers" | "status" | "ok">,
    observedAt?: string,
  ): void;
  recordConnectionFailure(provider: CossaRuntimeProvider, observedAt?: string): void;
  observabilityFor(
    selectedProvider: CossaRuntimeProvider,
    fallbackUsed: boolean,
    nowMs?: number,
  ): CossaProviderObservability;
}

/**
 * Creates one deterministic controller for a single /api/chat request.
 *
 * The controller does not call a reasoning provider. It only:
 * - reads the already-computed Cossa priority/reasoning headers;
 * - orders configured providers from current capacity telemetry;
 * - exposes each selected provider's bounded input/output budget;
 * - records safe HTTP rate-limit telemetry after provider attempts; and
 * - produces a non-secret response snapshot for diagnostics/UI.
 *
 * Keeping this logic in one helper makes the eventual route wiring small and
 * avoids duplicate browser/provider reasoning calls.
 */
export function createCossaProviderGatewayController({
  configuredProviders,
  headers,
  nowMs = Date.now(),
}: {
  configuredProviders: readonly CossaRuntimeProvider[];
  headers: HeaderReader;
  nowMs?: number;
}): CossaProviderGatewayController {
  const executionPlan = buildCossaProviderExecutionPlan({
    configuredProviders,
    headers,
    nowMs,
  });

  function decisionFor(provider: CossaRuntimeProvider, decisionNowMs = Date.now()) {
    return providerRuntimeDecision({
      provider,
      priority: executionPlan.priority,
      reasoningDepth: executionPlan.reasoningDepth,
      nowMs: decisionNowMs,
    });
  }

  return {
    executionPlan,

    decisionFor,

    recordHttpResponse(provider, response, observedAt) {
      observeProviderResponse(provider, response, observedAt);
    },

    recordConnectionFailure(provider, observedAt) {
      observeProviderConnectionFailure(provider, observedAt);
    },

    observabilityFor(selectedProvider, fallbackUsed, decisionNowMs = Date.now()) {
      const decision = decisionFor(selectedProvider, decisionNowMs);

      return buildCossaProviderObservability({
        selectedProvider,
        providerOrder: executionPlan.providers,
        policy: decision.policy,
        fallbackUsed,
      });
    },
  };
}
