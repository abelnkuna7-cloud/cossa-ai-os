import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCossaCapabilityPlan,
  planCossaCapabilities,
} from "../src/lib/cossa-ai-capability-router.ts";

test("routes Store supplier questions to internal operational evidence first", () => {
  const plan = planCossaCapabilities("Which supplier has stock for our Store products?");

  assert.ok(plan.domains.includes("store"));
  assert.equal(plan.needsLiveOperationalData, true);
  assert.equal(plan.needsExternalResearch, false);
  assert.deepEqual(plan.sources.slice(0, 3), ["memory", "knowledge", "operational"]);
});

test("requires external evidence only for freshness-sensitive requests", () => {
  const internalPlan = planCossaCapabilities("Explain our Store pricing strategy");
  const currentPlan = planCossaCapabilities("Compare our Store prices with competitors today");

  assert.equal(internalPlan.needsExternalResearch, false);
  assert.equal(currentPlan.needsExternalResearch, true);
  assert.equal(currentPlan.sources.at(-1), "external");
});

test("selects deep reasoning for strategy and architecture work", () => {
  const plan = planCossaCapabilities(
    "Analyse the root cause and recommend an architecture strategy for our AI workforce",
  );

  assert.equal(plan.reasoningDepth, "deep");
  assert.ok(plan.domains.includes("executive"));
  assert.ok(plan.domains.includes("tech"));
  assert.ok(plan.domains.includes("workforce"));
});

test("flags owner-controlled execution without blocking analysis", () => {
  const plan = planCossaCapabilities("Prepare the supplier order and payment decision for approval");

  assert.equal(plan.ownerApprovalLikely, true);
  assert.ok(plan.instructions.some((instruction) => instruction.includes("owner-controlled execution")));
});

test("formats a compact provider-facing plan", () => {
  const formatted = formatCossaCapabilityPlan(
    planCossaCapabilities("Give me a CEO briefing on current leads and failed deployments"),
  );

  assert.match(formatted, /COSSA CAPABILITY ROUTING PLAN/);
  assert.match(formatted, /Reasoning depth:/);
  assert.match(formatted, /Evidence order: memory -> knowledge -> operational/);
});
