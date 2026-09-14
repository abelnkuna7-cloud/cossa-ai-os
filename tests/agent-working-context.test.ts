import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentWorkingContext, contextForMission } from "../src/lib/agent-working-context.ts";

const mission = {
  id: "m1",
  title: "Revenue mission",
} as never;

const employees = [
  { id: "e1", name: "Lead Hunter" },
  { id: "e2", name: "Lead Intake Coordinator" },
] as never;

test("preserves handoff reason, context and retained identifiers", () => {
  const entries = buildAgentWorkingContext({
    missions: [mission],
    employees,
    handoffs: [
      {
        id: "h1",
        mission_id: "m1",
        from_employee_id: "e1",
        to_employee_id: "e2",
        reason: "Qualify verified prospects",
        context: { objective: "Convert evidence into clean CRM work" },
        retained_record_ids: { hunt_id: "hunt-7", prospect_ids: ["p1"] },
        created_at: "2026-09-13T10:00:00Z",
        accepted_at: null,
        completed_at: null,
      },
    ],
    runs: [],
  } as never);

  assert.equal(entries.length, 2);
  assert.match(entries[0].summary, /Lead Hunter/);
  assert.equal(entries[0].retainedRecordIds.hunt_id, "hunt-7");
  assert.equal(entries[1].kind, "retained_records");
});

test("records completed output with explicit source scope and evidence boundary", () => {
  const entries = buildAgentWorkingContext({
    missions: [mission],
    employees,
    handoffs: [],
    runs: [
      {
        id: "r1",
        mission_id: "m1",
        employee_id: "e1",
        status: "completed",
        output: {
          content: "Two prospects survived verification.",
          source_scope: ["authenticated Lead Hunter route", "public website evidence"],
        },
        created_at: "2026-09-13T10:00:00Z",
        completed_at: "2026-09-13T10:05:00Z",
      },
    ],
  } as never);

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].sourceScope, ["authenticated Lead Hunter route", "public website evidence"]);
  assert.match(entries[0].evidenceBoundary, /External actions remain unproven/);
});

test("ignores failed or incomplete outputs and filters mission context", () => {
  const entries = buildAgentWorkingContext({
    missions: [mission, { id: "m2", title: "Other" }],
    employees,
    handoffs: [],
    runs: [
      { id: "r1", mission_id: "m1", employee_id: "e1", status: "failed", output: { content: "bad" }, created_at: "2026-09-13T10:00:00Z" },
      { id: "r2", mission_id: "m2", employee_id: "e2", status: "completed", output: { content: "valid" }, created_at: "2026-09-13T11:00:00Z", completed_at: "2026-09-13T11:01:00Z" },
    ],
  } as never);

  assert.equal(contextForMission(entries, "m1").length, 0);
  assert.equal(contextForMission(entries, "m2").length, 1);
});
