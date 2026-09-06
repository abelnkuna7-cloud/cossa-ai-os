import assert from "node:assert/strict";
import test from "node:test";

import { createCossaProviderGatewayController } from "../src/lib/cossa-ai-provider-gateway-controller.ts";
import { resetProviderRuntimeForTests } from "../src/lib/cossa-ai-provider-runtime.ts";

function headers(values: Record<string, string> = {}): Pick<Headers, "get"> {
  const normalised = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    get(name: string) {
      return normalised.get(name.toLowerCase()) ?? null;
    },
  };
}

function response(status: number, values: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(values),
  };
}

test("gateway controller orders providers without making another reasoning call", () => {
  resetProviderRuntimeForTests();
  const controller = createCossaProviderGatewayController({
    configuredProviders: ["groq", "gemini"],
    headers: headers({
      "x-cossa-ai-intelligence-priority": "high",
      "x-cossa-ai-reasoning-depth": "deep",
    }),
    nowMs: Date.parse("2026-09-07T00:00:00.000Z"),
  });

  assert.deepEqual(controller.executionPlan.providers, ["groq", "gemini"]);
  assert.equal(controller.executionPlan.priority, "high");
  assert.equal(controller.executionPlan.reasoningDepth, "deep");
});

test("recorded 429 telemetry changes the next request route and exposes only safe posture", () => {
  resetProviderRuntimeForTests();

  const first = createCossaProviderGatewayController({
    configuredProviders: ["groq", "gemini"],
    headers: headers(),
    nowMs: Date.parse("2026-09-07T00:00:00.000Z"),
  });
  first.recordHttpResponse(
    "groq",
    response(429, {
      "retry-after": "5",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
    "2026-09-07T00:00:00.000Z",
  );

  const second = createCossaProviderGatewayController({
    configuredProviders: ["groq", "gemini"],
    headers: headers(),
    nowMs: Date.parse("2026-09-07T00:00:01.000Z"),
  });

  assert.deepEqual(second.executionPlan.providers, ["gemini", "groq"]);

  const snapshot = second.observabilityFor(
    "groq",
    true,
    Date.parse("2026-09-07T00:00:01.000Z"),
  );
  assert.equal(snapshot.capacityMode, "protect");
  assert.equal(snapshot.runtimeAction, "conserve");
  assert.equal(snapshot.providerOrder, "gemini>groq");
  assert.equal(snapshot.fallbackUsed, true);
  assert.equal(snapshot.retryAfterMs, 5_000);
  assert.equal("reason" in snapshot, false);
});

test("successful provider response clears the runtime penalty", () => {
  resetProviderRuntimeForTests();

  const controller = createCossaProviderGatewayController({
    configuredProviders: ["groq", "gemini"],
    headers: headers(),
  });
  controller.recordHttpResponse(
    "groq",
    response(429, {
      "retry-after": "5",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
  );
  controller.recordHttpResponse(
    "groq",
    response(200, {
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "7000",
    }),
  );

  const next = createCossaProviderGatewayController({
    configuredProviders: ["groq", "gemini"],
    headers: headers(),
  });
  assert.deepEqual(next.executionPlan.providers, ["groq", "gemini"]);
});
