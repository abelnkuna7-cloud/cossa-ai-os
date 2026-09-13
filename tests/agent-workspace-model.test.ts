import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentWorkspaceModel } from "../src/lib/agent-workspace-model.ts";

test("collects missions, runs, handoffs and approvals for one employee", () => {
  const model = buildAgentWorkspaceModel({
    employeeId: "e1",
    missions: [
      { id: "m1", assigned_employee_id: "e1", status: "running", created_at: "2026-09-13T10:00:00Z" },
      { id: "m2", assigned_employee_id: "e2", status: "completed", created_at: "2026-09-13T09:00:00Z" },
    ],
    runs: [
      { id: "r1", mission_id: "m1", employee_id: "e1", status: "running", created_at: "2026-09-13T10:05:00Z" },
      { id: "r2", mission_id: "m2", employee_id: "e2", status: "completed", created_at: "2026-09-13T09:05:00Z" },
    ],
    handoffs: [
      { id: "h1", mission_id: "m1", from_employee_id: null, to_employee_id: "e1", status: "pending", created_at: "2026-09-13T10:00:00Z" },
      { id: "h2", mission_id: "m1", from_employee_id: "e1", to_employee_id: "e2", status: "pending", created_at: "2026-09-13T10:10:00Z" },
    ],
    approvals: [
      { id: "a1", mission_id: "m1", run_id: "r1", requested_by_employee_id: "e1", status: "pending" },
    ],
  } as never);

  assert.equal(model.missions.length, 1);
  assert.equal(model.runs.length, 1);
  assert.equal(model.handoffs.length, 2);
  assert.equal(model.approvals.length, 1);
  assert.equal(model.counts.activeMissions, 1);
  assert.equal(model.counts.running, 1);
  assert.equal(model.counts.pendingApprovals, 1);
  assert.equal(model.counts.incomingHandoffs, 1);
  assert.equal(model.counts.outgoingHandoffs, 1);
});

test("does not leak unrelated employee records", () => {
  const model = buildAgentWorkspaceModel({
    employeeId: "e1",
    missions: [{ id: "m2", assigned_employee_id: "e2", status: "completed", created_at: "2026-09-13T09:00:00Z" }],
    runs: [{ id: "r2", mission_id: "m2", employee_id: "e2", status: "failed", created_at: "2026-09-13T09:05:00Z" }],
    handoffs: [],
    approvals: [],
  } as never);

  assert.equal(model.missions.length, 0);
  assert.equal(model.runs.length, 0);
  assert.equal(model.counts.failed, 0);
});
