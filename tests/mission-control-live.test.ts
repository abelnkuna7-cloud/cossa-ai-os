import assert from "node:assert/strict";
import test from "node:test";

import { buildLiveMissionControlModels } from "../src/lib/mission-control-live.ts";

const root = {
  id: "root",
  organisation_id: "org",
  business_unit_id: null,
  assigned_employee_id: null,
  parent_mission_id: null,
  title: "Revenue mission",
  instruction: "Work safely",
  objective: "Find and convert verified opportunities",
  target_market: null,
  target_location: null,
  target_service: null,
  required_result_count: null,
  constraints: [],
  prohibited_actions: [],
  output_schema: {},
  priority: "high",
  risk_level: "medium",
  status: "running",
  created_by: null,
  created_at: "2026-09-13T08:00:00Z",
  updated_at: "2026-09-13T08:00:00Z",
} as const;

const child = (id: string, status: string, created_at: string) => ({
  ...root,
  id,
  parent_mission_id: "root",
  title: id,
  objective: `Complete ${id}`,
  status,
  created_at,
});

test("builds progress only from persisted child mission facts", () => {
  const models = buildLiveMissionControlModels({
    missions: [root, child("research", "completed", "2026-09-13T08:01:00Z"), child("qualify", "queued", "2026-09-13T08:02:00Z")],
    runs: [],
    approvals: [],
  } as never);

  assert.equal(models.length, 1);
  assert.equal(models[0].progress.total, 2);
  assert.equal(models[0].progress.completed, 1);
  assert.equal(models[0].progress.ready, 1);
  assert.equal(models[0].progress.blocked, 0);
  assert.equal(models[0].progress.percent, 50);
  assert.equal(models[0].valid, true);
});

test("queued child with an unmet dependency is counted as blocked rather than ready", () => {
  const models = buildLiveMissionControlModels({
    missions: [
      root,
      child("research", "queued", "2026-09-13T08:01:00Z"),
      child("qualify", "queued", "2026-09-13T08:02:00Z"),
    ],
    runs: [],
    approvals: [],
  } as never);

  assert.equal(models[0].progress.ready, 1);
  assert.equal(models[0].progress.blocked, 1);
});

test("approval-gated child mission remains blocked and its approval counts under the root", () => {
  const models = buildLiveMissionControlModels({
    missions: [root, child("approval", "awaiting_approval", "2026-09-13T08:01:00Z")],
    runs: [],
    approvals: [{ id: "approval-1", mission_id: "approval", status: "pending" }],
  } as never);

  assert.equal(models[0].progress.blocked, 1);
  assert.equal(models[0].progress.ready, 0);
  assert.equal(models[0].pendingApprovalCount, 1);
});

test("root and child pending approvals are counted without unrelated missions", () => {
  const models = buildLiveMissionControlModels({
    missions: [root, child("research", "queued", "2026-09-13T08:01:00Z")],
    runs: [],
    approvals: [
      { id: "root-approval", mission_id: "root", status: "pending" },
      { id: "child-approval", mission_id: "research", status: "pending" },
      { id: "other-approval", mission_id: "other", status: "pending" },
    ],
  } as never);

  assert.equal(models[0].pendingApprovalCount, 2);
});

test("does not invent progress when a mission has no persisted child steps", () => {
  const models = buildLiveMissionControlModels({ missions: [root], runs: [], approvals: [] } as never);
  assert.equal(models[0].progress.total, 0);
  assert.equal(models[0].progress.percent, 0);
});
