import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectAllMissionContextIntegrity,
  inspectMissionContextIntegrity,
} from "../src/lib/agent-context-integrity.ts";

function handoff(input: Partial<Record<string, unknown>> & { id: string; mission_id: string; to_employee_id: string; status: string; stage: number }) {
  return {
    id: input.id,
    mission_id: input.mission_id,
    from_employee_id: null,
    to_employee_id: input.to_employee_id,
    reason: "stage",
    context: { stage: input.stage, total_stages: 3 },
    retained_record_ids: input.retained_record_ids ?? {},
    status: input.status,
    created_at: `2026-09-13T10:0${input.stage}:00Z`,
    accepted_at: null,
    completed_at: input.status === "completed" ? `2026-09-13T10:1${input.stage}:00Z` : null,
  } as never;
}

test("reports healthy when context and outputs survive into downstream stage", () => {
  const handoffs = [
    handoff({ id: "h1", mission_id: "m1", to_employee_id: "e1", status: "completed", stage: 1, retained_record_ids: { hunt_id: "hunt-1" } }),
    handoff({ id: "h2", mission_id: "m1", to_employee_id: "e2", status: "accepted", stage: 2, retained_record_ids: { hunt_id: "hunt-1" } }),
  ];
  const runs = [
    { id: "r1", mission_id: "m1", employee_id: "e1", status: "completed", output: { content: "verified output" } },
  ] as never;

  const report = inspectMissionContextIntegrity({ missionId: "m1", handoffs, runs });
  assert.equal(report.status, "healthy");
  assert.equal(report.issues.length, 0);
});

test("detects retained record loss on a downstream stage", () => {
  const handoffs = [
    handoff({ id: "h1", mission_id: "m1", to_employee_id: "e1", status: "completed", stage: 1, retained_record_ids: { prospect_ids: ["p1"] } }),
    handoff({ id: "h2", mission_id: "m1", to_employee_id: "e2", status: "pending", stage: 2 }),
  ];

  const report = inspectMissionContextIntegrity({ missionId: "m1", handoffs, runs: [] });
  assert.equal(report.status, "attention");
  assert.ok(report.issues.some((issue) => issue.code === "missing_retained_records"));
});

test("detects downstream completion before prior stage completion", () => {
  const handoffs = [
    handoff({ id: "h1", mission_id: "m1", to_employee_id: "e1", status: "pending", stage: 1 }),
    handoff({ id: "h2", mission_id: "m1", to_employee_id: "e2", status: "completed", stage: 2 }),
  ];

  const report = inspectMissionContextIntegrity({ missionId: "m1", handoffs, runs: [] });
  assert.equal(report.status, "critical");
  assert.ok(report.issues.some((issue) => issue.code === "ordering_violation"));
});

test("detects accepted downstream stage when prior completed handoff has no recorded output", () => {
  const handoffs = [
    handoff({ id: "h1", mission_id: "m1", to_employee_id: "e1", status: "completed", stage: 1 }),
    handoff({ id: "h2", mission_id: "m1", to_employee_id: "e2", status: "accepted", stage: 2 }),
  ];

  const report = inspectMissionContextIntegrity({ missionId: "m1", handoffs, runs: [] });
  assert.equal(report.status, "attention");
  assert.ok(report.issues.some((issue) => issue.code === "missing_prior_completed_output"));
});

test("sorts critical mission reports before healthy ones", () => {
  const handoffs = [
    handoff({ id: "a1", mission_id: "critical", to_employee_id: "e1", status: "pending", stage: 1 }),
    handoff({ id: "a2", mission_id: "critical", to_employee_id: "e2", status: "completed", stage: 2 }),
    handoff({ id: "b1", mission_id: "healthy", to_employee_id: "e1", status: "pending", stage: 1 }),
  ];

  const reports = inspectAllMissionContextIntegrity({ handoffs, runs: [] });
  assert.equal(reports[0].missionId, "critical");
  assert.equal(reports[0].status, "critical");
});
