import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260913144500_direct_employee_runtime_bridge.sql", import.meta.url),
  "utf8",
);
const runtime = readFileSync(
  new URL("../src/lib/direct-employee-runtime.server.ts", import.meta.url),
  "utf8",
);
const endpoint = readFileSync(
  new URL("../src/routes/api.agent-runtime.execute.ts", import.meta.url),
  "utf8",
);

test("direct employee missions enter the durable agent task queue idempotently", () => {
  assert.match(migration, /task_type[\s\S]*'direct_employee_assignment'/);
  assert.match(migration, /'direct-employee:' \|\| NEW\.id::text \|\| ':internal'/);
  assert.match(migration, /ON CONFLICT \(organisation_id, idempotency_key\) DO NOTHING/);
  assert.match(migration, /handoff_id/);
});

test("generic direct employee work has a dedicated safe internal runtime agent and permission", () => {
  assert.match(migration, /employee-runtime-/);
  assert.match(migration, /'direct_employee_internal'/);
  assert.match(migration, /'WRITE_INTERNAL'/);
  assert.match(migration, /'external_actions_enabled', false/);
  assert.doesNotMatch(migration, /'SEND',[\s\S]*'allow'/);
  assert.doesNotMatch(migration, /'PUBLISH',[\s\S]*'allow'/);
  assert.doesNotMatch(migration, /'PAYMENT',[\s\S]*'allow'/);
});

test("Lead Hunter cannot be routed through the generic employee model executor", () => {
  assert.match(migration, /IF employee\.employee_key = 'lead-hunter'/);
  assert.match(migration, /'lead_research'/);
  assert.match(migration, /'lead_enrich'/);
  assert.match(migration, /'lead_qualify'/);
  assert.match(migration, /'lead_crm_save'/);
  assert.match(migration, /'lead_outreach_draft'/);
  assert.match(runtime, /employee\.employee_key === "lead-hunter"/);
  assert.match(runtime, /Lead Hunter may not use the generic direct employee executor/);
});

test("existing runtime cannot accidentally claim generic direct employee tasks", () => {
  assert.match(migration, /task\.task_type <> 'direct_employee_assignment'/);
  assert.match(migration, /claim_direct_employee_agent_tasks/);
  assert.match(runtime, /claim_direct_employee_agent_tasks/);
});

test("direct employee execution preserves mission and handoff identity and stays internal", () => {
  assert.match(runtime, /mission\.assigned_employee_id !== employee\.id/);
  assert.match(runtime, /handoff\.to_employee_id !== employee\.id/);
  assert.match(runtime, /external_actions_enabled: false/);
  assert.match(runtime, /reviewable_draft/);
  assert.match(runtime, /status: "completed"/);
});

test("hosted worker endpoint runs direct assignments inside the same protected runtime tick", () => {
  assert.match(endpoint, /requireRuntimeWorker\(request\)/);
  assert.match(endpoint, /runAgentRuntimeTick\(\)/);
  assert.match(endpoint, /runDirectEmployeeRuntimeTick\(\)/);
  assert.match(endpoint, /Promise\.all/);
});
