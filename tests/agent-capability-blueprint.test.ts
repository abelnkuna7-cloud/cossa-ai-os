import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_CAPABILITY_BLUEPRINT,
  capabilitiesReadyToWire,
  capabilityBlueprintById,
} from "../src/lib/agent-capability-blueprint.ts";

test("agent capability upgrade is additive and mapped to existing workforce primitives", () => {
  assert.equal(AGENT_CAPABILITY_BLUEPRINT.length, 8);
  for (const capability of AGENT_CAPABILITY_BLUEPRINT) {
    assert.ok(capability.existingPrimitives.length > 0);
    assert.ok(capability.requiredOutcome.length > 0);
    assert.ok(capability.safetyBoundary.length > 0);
  }
});

test("high-risk capability areas keep explicit safety boundaries", () => {
  const evidence = capabilityBlueprintById("evidence_gated_reasoning");
  const execution = capabilityBlueprintById("owner_controlled_execution");
  assert.equal(evidence?.risk, "high");
  assert.match(evidence?.safetyBoundary ?? "", /No invented/);
  assert.equal(execution?.risk, "high");
  assert.match(execution?.safetyBoundary ?? "", /cannot self-approve/);
});

test("task decomposition and reusable playbooks are the first ready-to-wire upgrades", () => {
  assert.deepEqual(
    capabilitiesReadyToWire().map((item) => item.id),
    ["task_decomposition", "reusable_playbooks"],
  );
});

test("handoffs preserve permission boundaries rather than expanding authority", () => {
  const handoff = capabilityBlueprintById("agent_handoffs");
  assert.match(handoff?.safetyBoundary ?? "", /does not expand permissions/);
});
