import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/routes/mission-control.live.tsx", "utf8");

test("live mission control reads persisted workforce facts", () => {
  assert.match(source, /listMissions/);
  assert.match(source, /listWorkforceRuns/);
  assert.match(source, /listPendingApprovals/);
  assert.match(source, /buildLiveMissionControlModels/);
});

test("live mission control remains observational and fail-closed", () => {
  assert.match(source, /does not start work, bypass approvals/);
  assert.match(source, /No progress is being guessed/);
  assert.match(source, /will not invent a task\s+plan or claim work is underway/);
  assert.doesNotMatch(source, /queueMission\(/);
  assert.doesNotMatch(source, /createMission\(/);
  assert.doesNotMatch(source, /fetch\(/);
});

test("live mission control exposes plan execution truth", () => {
  assert.match(source, /persisted completion/);
  assert.match(source, /Approval gate/);
  assert.match(source, /Dependencies/);
  assert.match(source, /Latest root run/);
});
