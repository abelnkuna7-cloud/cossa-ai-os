import type { AiEmployee, EmployeeHandoff, Mission, MissionRun } from "./workforce-data";

export interface AgentContextEntry {
  id: string;
  missionId: string;
  missionTitle: string;
  employeeId: string | null;
  employeeName: string;
  kind: "handoff" | "run_output" | "retained_records";
  recordedAt: string;
  summary: string;
  sourceScope: string[];
  retainedRecordIds: Record<string, unknown>;
  evidenceBoundary: string;
}

function employeeNameById(employees: readonly AiEmployee[]): Map<string, string> {
  return new Map(employees.map((employee) => [employee.id, employee.name]));
}

function missionById(missions: readonly Mission[]): Map<string, Mission> {
  return new Map(missions.map((mission) => [mission.id, mission]));
}

function safeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function runSourceScope(run: MissionRun): string[] {
  const output = run.output;
  if (!output || !Array.isArray(output.source_scope)) return [];
  return output.source_scope.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function runContent(run: MissionRun): string | null {
  return safeText(run.output?.content);
}

export function buildAgentWorkingContext(input: {
  missions: readonly Mission[];
  employees: readonly AiEmployee[];
  handoffs: readonly EmployeeHandoff[];
  runs: readonly MissionRun[];
}): AgentContextEntry[] {
  const employees = employeeNameById(input.employees);
  const missions = missionById(input.missions);
  const entries: AgentContextEntry[] = [];

  for (const handoff of input.handoffs) {
    const mission = missions.get(handoff.mission_id);
    const fromName = handoff.from_employee_id ? employees.get(handoff.from_employee_id) ?? "Recorded employee" : "Mission origin";
    const toName = employees.get(handoff.to_employee_id) ?? "Recorded employee";
    const contextSummary = safeText(handoff.context.summary) ?? safeText(handoff.context.objective);

    entries.push({
      id: `handoff-${handoff.id}`,
      missionId: handoff.mission_id,
      missionTitle: mission?.title ?? "Recorded mission",
      employeeId: handoff.to_employee_id,
      employeeName: toName,
      kind: "handoff",
      recordedAt: handoff.created_at,
      summary: `${fromName} → ${toName}: ${handoff.reason}${contextSummary ? ` — ${contextSummary}` : ""}`,
      sourceScope: [],
      retainedRecordIds: handoff.retained_record_ids ?? {},
      evidenceBoundary: "Handoff context is recorded workflow context, not proof that external work occurred.",
    });

    if (Object.keys(handoff.retained_record_ids ?? {}).length > 0) {
      entries.push({
        id: `records-${handoff.id}`,
        missionId: handoff.mission_id,
        missionTitle: mission?.title ?? "Recorded mission",
        employeeId: handoff.to_employee_id,
        employeeName: toName,
        kind: "retained_records",
        recordedAt: handoff.completed_at ?? handoff.accepted_at ?? handoff.created_at,
        summary: "Retained source identifiers are available for downstream stages.",
        sourceScope: [],
        retainedRecordIds: handoff.retained_record_ids,
        evidenceBoundary: "Identifiers preserve traceability; they do not by themselves prove the underlying claim.",
      });
    }
  }

  for (const run of input.runs) {
    const content = runContent(run);
    if (!content || run.status !== "completed") continue;
    const mission = missions.get(run.mission_id);
    entries.push({
      id: `run-${run.id}`,
      missionId: run.mission_id,
      missionTitle: mission?.title ?? "Recorded mission",
      employeeId: run.employee_id,
      employeeName: run.employee_id ? employees.get(run.employee_id) ?? "Recorded employee" : "Recorded employee",
      kind: "run_output",
      recordedAt: run.completed_at ?? run.created_at,
      summary: content,
      sourceScope: runSourceScope(run),
      retainedRecordIds: {},
      evidenceBoundary: "This is a recorded workforce output. External actions remain unproven unless separate execution evidence exists.",
    });
  }

  return entries.sort((a, b) => (Date.parse(b.recordedAt) || 0) - (Date.parse(a.recordedAt) || 0));
}

export function contextForMission(entries: readonly AgentContextEntry[], missionId: string): AgentContextEntry[] {
  return entries.filter((entry) => entry.missionId === missionId);
}
