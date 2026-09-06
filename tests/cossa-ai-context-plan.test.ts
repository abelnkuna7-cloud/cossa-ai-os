import assert from "node:assert/strict";
import test from "node:test";

import { buildCossaContextPlan } from "../src/lib/cossa-ai-context-plan.ts";

test("company knowledge request stays internal-first and avoids external research", () => {
  const plan = buildCossaContextPlan({
    message: "What do we know about Cossa Store suppliers?",
    conversationMemory: {
      summary: "Store supplier onboarding is active.",
      importantFacts: ["Local-first supplier policy."],
      decisions: [],
      unresolvedTasks: [],
    },
  });

  assert.deepEqual(plan.groundingOrder, ["memory", "knowledge", "operational", "external"]);
  assert.equal(plan.needsExternalResearch, false);
  assert.match(plan.memoryGrounding, /Local-first supplier policy/);
});

test("fresh market request allows external research after internal context", () => {
  const plan = buildCossaContextPlan({
    message: "Find today's tender opportunities in Gauteng.",
  });

  assert.equal(plan.needsExternalResearch, true);
  assert.equal(plan.requestedSources.at(-1), "external");
});

test("Groq protection defers background work but preserves critical work", () => {
  const background = buildCossaContextPlan({
    message: "Generate another optional marketing variation.",
    priorityOverride: "background",
    groqCapacity: { remainingTokens: 700 },
  });

  const critical = buildCossaContextPlan({
    message: "CEO urgent production payment issue.",
    groqCapacity: { remainingTokens: 700 },
  });

  assert.equal(background.groqMode, "protect");
  assert.equal(background.deferProviderCall, true);
  assert.equal(critical.deferProviderCall, false);
});
