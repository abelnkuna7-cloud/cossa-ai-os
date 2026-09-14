import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentHandoffActivity } from "../src/lib/agent-handoff-activity.ts";

const handoff = {
  id: "h1", organisation_id: "org", mission_id: "m1", run_id: null,
  from_employee_id: "e1", to_employee_id: "e2", reason: "Qualify verified lead",
  context: { stage: 2, total_stages: 4, workflow: "Revenue acquisition:", execution_order: "strict_sequential", objective: "Win revenue" },
  retained_record_ids: { hunt_id: "hunt-1", prospect_ids: ["p1"] }, status: "pending",
  created_at: "2026-09-13T08:00:00Z", accepted_at: null, completed_at: null,
} as const;

const employee = (id: string, name: string) => ({ id, name, organisation_id: "org", business_unit_id: null, employee_key: id, title: name, department: "Revenue", mission: "", responsibilities: [], kpis: [], capabilities: [], allowed_actions: [], prohibited_actions: [], system_instructions: "", requires_approval_by_default: false, status: "active", created_by: null, created_at: "", updated_at: "" }) as const;
const mission = { id: "m1", title: "Revenue mission", organisation_id: "org", business_unit_id: null, assigned_employee_id: "e1", parent_mission_id: null, instruction: "", objective: "Win revenue", target_market: null, target_location: null, target_service: null, required_result_count: null, constraints: [], prohibited_actions: [], output_schema: {}, priority: "normal", risk_level: "medium", status: "running", created_by: null, created_at: "", updated_at: "" } as const;

test("shows recorded handoff route and retained record keys without inventing values", () => {
  const [item] = buildAgentHandoffActivity({ handoffs: [handoff] as never, employees: [employee("e1", "Lead Hunter"), employee("e2", "Lead Intake")] as never, missions: [mission] as never, now: new Date("2026-09-13T10:00:00Z") });
  assert.equal(item.fromEmployeeName, "Lead Hunter");
  assert.equal(item.toEmployeeName, "Lead Intake");
  assert.equal(item.stage, 2);
  assert.equal(item.totalStages, 4);
  assert.deepEqual(item.retainedRecordKeys, ["hunt_id", "prospect_ids"]);
  assert.equal(item.stuck, true);
});

test("completed handoffs are never labelled stuck", () => {
  const [item] = buildAgentHandoffActivity({ handoffs: [{ ...handoff, status: "completed", completed_at: "2026-09-13T08:10:00Z" }] as never, employees: [] as never, missions: [] as never, now: new Date("2026-09-14T10:00:00Z") });
  assert.equal(item.stuck, false);
  assert.equal(item.missionTitle, "Mission record unavailable");
});
