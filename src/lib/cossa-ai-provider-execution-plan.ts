import {
  orderProvidersByRuntime,
  providerRuntimeDecision,
  type CossaRuntimeProvider,
  type ProviderRuntimeDecision,
} from "./cossa-ai-provider-runtime.ts";
import type {
  CossaReasoningDepth,
  CossaTaskPriority,
} from "./cossa-ai-provider-capacity.ts";

export interface CossaProviderExecutionPlan {
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
  providers: CossaRuntimeProvider[];
  decisions: ProviderRuntimeDecision[];
}

type HeaderReader = Pick<Headers, "get">;

const PRIORITIES = new Set<CossaTaskPriority>([
  "critical",
  "high",
  "normal",
  "background",
]);
const REASONING_DEPTHS = new Set<CossaReasoningDepth>([
  "quick",
  "standard",
  "deep",
]);

export function readCossaProviderExecutionIntent(headers: HeaderReader): {
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
} {
  const rawPriority = headers
    .get("x-cossa-ai-intelligence-priority")
    ?.trim()
    .toLowerCase() as CossaTaskPriority | undefined;
  const rawReasoningDepth = headers
    .get("x-cossa-ai-reasoning-depth")
    ?.trim()
    .toLowerCase() as CossaReasoningDepth | undefined;

  return {
    priority: rawPriority && PRIORITIES.has(rawPriority) ? rawPriority : "normal",
    reasoningDepth:
      rawReasoningDepth && REASONING_DEPTHS.has(rawReasoningDepth)
        ? rawReasoningDepth
        : "standard",
  };
}

/**
 * Builds one deterministic provider execution plan from the shared Cossa
 * intelligence headers and current provider runtime telemetry.
 *
 * No reasoning-provider call is made here. This adapter only decides the safe
 * order and budget posture for already-configured providers.
 */
export function buildCossaProviderExecutionPlan({
  configuredProviders,
  headers,
  nowMs = Date.now(),
}: {
  configuredProviders: readonly CossaRuntimeProvider[];
  headers: HeaderReader;
  nowMs?: number;
}): CossaProviderExecutionPlan {
  const intent = readCossaProviderExecutionIntent(headers);
  const providers = orderProvidersByRuntime({
    providers: configuredProviders,
    priority: intent.priority,
    reasoningDepth: intent.reasoningDepth,
    nowMs,
  });

  return {
    ...intent,
    providers,
    decisions: providers.map((provider) =>
      providerRuntimeDecision({
        provider,
        priority: intent.priority,
        reasoningDepth: intent.reasoningDepth,
        nowMs,
      }),
    ),
  };
}
