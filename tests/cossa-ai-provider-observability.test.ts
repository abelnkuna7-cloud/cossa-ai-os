import { describe, expect, it } from "vitest";
import {
  appendCossaProviderObservabilityHeaders,
  buildCossaProviderObservability,
} from "../src/lib/cossa-ai-provider-observability";

describe("Cossa provider observability", () => {
  it("builds a non-secret runtime snapshot", () => {
    const snapshot = buildCossaProviderObservability({
      selectedProvider: "groq",
      providerOrder: ["groq", "openai", "gemini"],
      fallbackUsed: false,
      policy: {
        capacityMode: "normal",
        action: "allow",
        maxInputCharacters: 16000,
        maxCompletionTokens: 700,
        retryAfterMs: null,
        reason: "healthy",
      },
    });
    expect(snapshot.providerOrder).toBe("groq>openai>gemini");
    expect(snapshot.capacityMode).toBe("normal");
  });

  it("exposes only bounded operational headers", () => {
    const headers = appendCossaProviderObservabilityHeaders(
      new Headers(),
      {
        provider: "openai",
        providerOrder: "groq>openai>gemini",
        capacityMode: "protect",
        runtimeAction: "conserve",
        fallbackUsed: true,
        retryAfterMs: 120000,
      },
    );
    expect(headers.get("X-Cossa-AI-Fallback")).toBe("true");
    expect(headers.get("X-Cossa-AI-Retry-After-Ms")).toBe("60000");
    expect(headers.get("Authorization")).toBeNull();
  });
});
