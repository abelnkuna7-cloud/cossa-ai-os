import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentMissionWatch } from "../src/lib/agent-mission-watch.ts";

test("shows latest queued mission for one employee without inventing execution", () => {
  const watch = buildAgentMissionWatch({
    employeeId: "e1",
    missions: [
      { id: "m1", assigned_employee_id: "e1", status: "queued", created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z" },
      { id: "m2", assigned_employee_id: "e2", status: "running", created_at: "2026-09-13T11:00:00Z", updated_at: "2026-09-13T11:00:00Z" },
    ],
    runs: [],
    approvals: [],
  } as never);

  assert.equal(watch.mission?.id, "m1");
  assert.equal(watch.latestRun, null);
  assert.equal(watch.phase, "queued");
});

test("prefers recorded pending approval over running state", () => {
  const watch = buildAgentMissionWatch({
    employeeId: "e1",
    missions: [{ id: "m1", assigned_employee_id: "e1", status: "running", created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:10:00Z" }],
    runs: [{ id: "r1", mission_id: "m1", employee_id: "e1", status: "running", created_at: "2026-09-13T10:10:00Z", started_at: "2026-09-13T10:10:00Z" }],
    approvals: [{ id: "a1", mission_id: "m1", run_id: "r1", requested_by_employee_id: "e1", status: "pending" }],
  } as never);

  assert.equal(watch.latestRun?.id, "r1");
  assert.equal(watch.pendingApprovals.length, 1);
  assert.equal(watch.phase, "approval");
});

test("does not leak another employee's latest mission", () => {
  const watch = buildAgentMissionWatch({
    employeeId: "e1",
    missions: [{ id: "m2", assigned_employee_id: "e2", status: "completed", created_at: "2026-09-13T12:00:00Z", updated_at: "2026-09-13T12:00:00Z" }],
    runs: [],
    approvals: [],
  } as never);

  assert.equal(watch.mission, null);
  assert.equal(watch.phase, "idle");
});
