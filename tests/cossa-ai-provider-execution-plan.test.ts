import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCossaProviderExecutionPlan,
  readCossaProviderExecutionIntent,
} from "../src/lib/cossa-ai-provider-execution-plan.ts";
import {
  observeProviderResponse,
  resetProviderRuntimeForTests,
} from "../src/lib/cossa-ai-provider-runtime.ts";

function headers(values: Record<string, string>): Pick<Headers, "get"> {
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

test("execution intent accepts only known priority and reasoning values", () => {
  assert.deepEqual(
    readCossaProviderExecutionIntent(
      headers({
        "x-cossa-ai-intelligence-priority": "critical",
        "x-cossa-ai-reasoning-depth": "deep",
      }),
    ),
    { priority: "critical", reasoningDepth: "deep" },
  );

  assert.deepEqual(
    readCossaProviderExecutionIntent(
      headers({
        "x-cossa-ai-intelligence-priority": "owner-is-root",
        "x-cossa-ai-reasoning-depth": "unlimited",
      }),
    ),
    { priority: "normal", reasoningDepth: "standard" },
  );
});

test("execution plan moves a rate-limited provider behind a healthy provider", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "retry-after": "10",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
    "2026-09-06T16:00:00.000Z",
  );

  const plan = buildCossaProviderExecutionPlan({
    configuredProviders: ["groq", "gemini"],
    headers: headers({
      "x-cossa-ai-intelligence-priority": "normal",
      "x-cossa-ai-reasoning-depth": "standard",
    }),
    nowMs: Date.parse("2026-09-06T16:00:01.000Z"),
  });

  assert.deepEqual(plan.providers, ["gemini", "groq"]);
  assert.equal(plan.decisions[1]?.policy.capacityMode, "protect");
});

test("execution plan preserves critical work while provider is constrained", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "retry-after": "10",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
    "2026-09-06T16:00:00.000Z",
  );

  const plan = buildCossaProviderExecutionPlan({
    configuredProviders: ["groq"],
    headers: headers({
      "x-cossa-ai-intelligence-priority": "critical",
      "x-cossa-ai-reasoning-depth": "deep",
    }),
    nowMs: Date.parse("2026-09-06T16:00:01.000Z"),
  });

  assert.equal(plan.providers[0], "groq");
  assert.equal(plan.decisions[0]?.policy.action, "conserve");
  assert.ok((plan.decisions[0]?.policy.maxInputCharacters ?? 0) > 0);
});

test("provider becomes eligible again after its cooldown expires", () => {
  resetProviderRuntimeForTests();
  observeProviderResponse(
    "groq",
    response(429, {
      "retry-after": "2",
      "x-ratelimit-limit-tokens": "8000",
      "x-ratelimit-remaining-tokens": "0",
    }),
    "2026-09-06T16:00:00.000Z",
  );

  const plan = buildCossaProviderExecutionPlan({
    configuredProviders: ["groq", "gemini"],
    headers: headers({}),
    nowMs: Date.parse("2026-09-06T16:00:03.000Z"),
  });

  assert.deepEqual(plan.providers, ["groq", "gemini"]);
  assert.equal(plan.decisions[0]?.policy.capacityMode, "normal");
});
