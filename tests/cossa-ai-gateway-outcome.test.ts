import assert from "node:assert/strict";
import test from "node:test";

import {
  capacityFailedProvidersFromGatewayText,
  successfulProviderFromGatewayResponse,
} from "../src/lib/cossa-ai-gateway-outcome.ts";

test("safe gateway text identifies only providers with capacity failures", () => {
  const providers = capacityFailedProvidersFromGatewayText(
    "Cossa AI could not complete this reasoning request. Groq is temporarily rate-limiting Cossa AI. Gemini is temporarily unavailable.",
  );
  assert.deepEqual(providers, ["groq"]);
});

test("provider-specific token-capacity message is treated as capacity feedback", () => {
  const providers = capacityFailedProvidersFromGatewayText(
    "OpenAI could not accept the current reasoning context within its token-capacity limit.",
  );
  assert.deepEqual(providers, ["openai"]);
});

test("arbitrary external text cannot invent a provider capacity event", () => {
  assert.deepEqual(
    capacityFailedProvidersFromGatewayText("The customer says Groq had a problem yesterday."),
    [],
  );
});

test("successful provider is read only from a successful Cossa gateway response", () => {
  assert.equal(
    successfulProviderFromGatewayResponse({
      ok: true,
      headers: new Headers({ "X-Cossa-AI-Provider": "gemini" }),
    }),
    "gemini",
  );
  assert.equal(
    successfulProviderFromGatewayResponse({
      ok: false,
      headers: new Headers({ "X-Cossa-AI-Provider": "groq" }),
    }),
    null,
  );
  assert.equal(
    successfulProviderFromGatewayResponse({
      ok: true,
      headers: new Headers({ "X-Cossa-AI-Provider": "unknown" }),
    }),
    null,
  );
});
