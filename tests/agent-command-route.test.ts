import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/routes/ai.employee.$employeeId.command.tsx", import.meta.url), "utf8");

test("agent command workspace queues through the existing direct employee mission path", () => {
  assert.match(route, /createDirectEmployeeMission/);
  assert.match(route, /employeeId, objective: trimmed/);
  assert.match(route, /Queue internal mission/);
});

test("agent command workspace states that it does not execute external actions", () => {
  assert.match(route, /does not start a workforce run/);
  assert.match(route, /send messages/);
  assert.match(route, /spend money/);
  assert.match(route, /perform external actions/);
});

test("agent command workspace does not call controlled run execution directly", () => {
  assert.doesNotMatch(route, /startControlledWorkforceRun/);
  assert.doesNotMatch(route, /completeControlledWorkforceRun/);
  assert.doesNotMatch(route, /failControlledWorkforceRun/);
});
