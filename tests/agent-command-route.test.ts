import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/routes/ai.employee.$employeeId.command.tsx", import.meta.url), "utf8");

test("agent command workspace queues through the existing direct employee mission path", () => {
  assert.match(route, /createDirectEmployeeMission/);
  assert.match(route, /employeeId,/);
  assert.match(route, /objective: trimmed/);
  assert.match(route, /Queue internal mission/);
  assert.match(route, /durable task queue/);
});

test("agent command workspace keeps external actions disabled", () => {
  assert.match(route, /cannot send messages/);
  assert.match(route, /spend money/);
  assert.match(route, /publish content/);
  assert.match(route, /deploy production changes/);
  assert.match(route, /external-action boundaries remain unchanged/);
});

test("Lead Hunter commands require structured evidence-engine routing fields", () => {
  assert.match(route, /employee\?\.employee_key === "lead-hunter"/);
  assert.match(route, /target_market: leadHunterBusiness/);
  assert.match(route, /target_service: leadHunterService/);
  assert.match(route, /target_location: leadHunterLocation\.trim\(\)/);
  assert.match(route, /Generic language-model prospect discovery is not allowed/);
});

test("agent command workspace does not execute controlled workforce runs in the browser", () => {
  assert.doesNotMatch(route, /startControlledWorkforceRun/);
  assert.doesNotMatch(route, /completeControlledWorkforceRun/);
  assert.doesNotMatch(route, /failControlledWorkforceRun/);
});
