import type { CossaRuntimeProvider } from "./cossa-ai-provider-runtime.ts";

const PROVIDER_DISPLAY_NAMES: Record<CossaRuntimeProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  groq: "Groq",
};

export function isCossaRuntimeProvider(value: string | null): value is CossaRuntimeProvider {
  return value === "openai" || value === "gemini" || value === "groq";
}

/**
 * Reads only Cossa-generated safe gateway messages, never raw provider error
 * bodies. This gives the outer server ingress a conservative capacity feedback
 * signal even before every upstream adapter exposes raw x-ratelimit headers.
 */
export function capacityFailedProvidersFromGatewayText(
  text: string,
): CossaRuntimeProvider[] {
  const lower = text.toLowerCase();
  const matches: CossaRuntimeProvider[] = [];

  for (const provider of ["openai", "gemini", "groq"] as const) {
    const name = PROVIDER_DISPLAY_NAMES[provider].toLowerCase();
    const rateLimited = `${name} is temporarily rate-limiting cossa ai.`;
    const tokenCapacity = `${name} could not accept the current reasoning context within its token-capacity limit.`;
    if (lower.includes(rateLimited) || lower.includes(tokenCapacity)) {
      matches.push(provider);
    }
  }

  return matches;
}

export function successfulProviderFromGatewayResponse(
  response: Pick<Response, "ok" | "headers">,
): CossaRuntimeProvider | null {
  if (!response.ok) return null;
  const provider = response.headers.get("X-Cossa-AI-Provider")?.trim().toLowerCase() ?? null;
  return isCossaRuntimeProvider(provider) ? provider : null;
}
