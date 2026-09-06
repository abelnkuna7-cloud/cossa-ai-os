import type { CossaRuntimePolicy } from "./cossa-ai-provider-capacity.ts";
import type { CossaRuntimeProvider } from "./cossa-ai-provider-runtime.ts";

export interface CossaProviderObservabilityInput {
  selectedProvider: CossaRuntimeProvider;
  providerOrder: readonly CossaRuntimeProvider[];
  policy: CossaRuntimePolicy;
  fallbackUsed: boolean;
}

export interface CossaProviderObservability {
  provider: CossaRuntimeProvider;
  providerOrder: string;
  capacityMode: CossaRuntimePolicy["capacityMode"];
  runtimeAction: CossaRuntimePolicy["action"];
  fallbackUsed: boolean;
  retryAfterMs: number | null;
}

const MAX_EXPOSED_RETRY_MS = 60_000;

function safeRetryAfterMs(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(MAX_EXPOSED_RETRY_MS, Math.floor(value));
}

/**
 * Builds a deliberately non-secret execution snapshot for diagnostics and UI.
 * It exposes only provider names and capacity posture; never credentials,
 * prompts, customer data, internal memory or provider response bodies.
 */
export function buildCossaProviderObservability(
  input: CossaProviderObservabilityInput,
): CossaProviderObservability {
  const uniqueOrder = [...new Set(input.providerOrder)].filter((provider) =>
    ["groq", "gemini", "openai"].includes(provider),
  );

  return {
    provider: input.selectedProvider,
    providerOrder: uniqueOrder.join(">"),
    capacityMode: input.policy.capacityMode,
    runtimeAction: input.policy.action,
    fallbackUsed: input.fallbackUsed,
    retryAfterMs: safeRetryAfterMs(input.policy.retryAfterMs),
  };
}

export function appendCossaProviderObservabilityHeaders(
  headers: Headers,
  snapshot: CossaProviderObservability,
): Headers {
  const output = new Headers(headers);
  output.set("X-Cossa-AI-Capacity-Mode", snapshot.capacityMode);
  output.set("X-Cossa-AI-Runtime-Action", snapshot.runtimeAction);
  output.set("X-Cossa-AI-Provider-Order", snapshot.providerOrder);
  output.set("X-Cossa-AI-Fallback", snapshot.fallbackUsed ? "true" : "false");
  if (snapshot.retryAfterMs !== null) {
    output.set("X-Cossa-AI-Retry-After-Ms", String(snapshot.retryAfterMs));
  }

  const exposed = new Set(
    (output.get("Access-Control-Expose-Headers") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  for (const name of [
    "X-Cossa-AI-Capacity-Mode",
    "X-Cossa-AI-Runtime-Action",
    "X-Cossa-AI-Provider-Order",
    "X-Cossa-AI-Fallback",
    "X-Cossa-AI-Retry-After-Ms",
  ]) {
    exposed.add(name);
  }
  output.set("Access-Control-Expose-Headers", [...exposed].join(", "));
  return output;
}
