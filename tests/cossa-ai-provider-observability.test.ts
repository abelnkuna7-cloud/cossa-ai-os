import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.equal(snapshot.providerOrder, "groq>openai>gemini");
    assert.equal(snapshot.capacityMode, "normal");
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
    assert.equal(headers.get("X-Cossa-AI-Fallback"), "true");
    assert.equal(headers.get("X-Cossa-AI-Retry-After-Ms"), "60000");
    assert.equal(headers.get("Authorization"), null);
  });
});