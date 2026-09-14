import type { AiEmployee, EmployeeHandoff, Mission } from "./workforce-data";

export interface AgentHandoffActivityItem {
  id: string;
  missionId: string;
  missionTitle: string;
  fromEmployeeId: string | null;
  fromEmployeeName: string;
  toEmployeeId: string;
  toEmployeeName: string;
  reason: string;
  status: EmployeeHandoff["status"];
  stage: number | null;
  totalStages: number | null;
  workflow: string | null;
  executionOrder: string | null;
  retainedRecordKeys: string[];
  contextKeys: string[];
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  stuck: boolean;
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildAgentHandoffActivity(input: {
  handoffs: readonly EmployeeHandoff[];
  employees: readonly AiEmployee[];
  missions: readonly Mission[];
  now?: Date;
  stuckAfterMinutes?: number;
}): AgentHandoffActivityItem[] {
  const employees = new Map(input.employees.map((employee) => [employee.id, employee]));
  const missions = new Map(input.missions.map((mission) => [mission.id, mission]));
  const nowMs = (input.now ?? new Date()).getTime();
  const stuckAfterMs = Math.max(1, input.stuckAfterMinutes ?? 60) * 60_000;

  return input.handoffs
    .map((handoff) => {
      const context = handoff.context ?? {};
      const createdMs = Date.parse(handoff.created_at);
      const ageMs = Number.isFinite(createdMs) ? nowMs - createdMs : 0;
      return {
        id: handoff.id,
        missionId: handoff.mission_id,
        missionTitle: missions.get(handoff.mission_id)?.title ?? "Mission record unavailable",
        fromEmployeeId: handoff.from_employee_id,
        fromEmployeeName: handoff.from_employee_id
          ? employees.get(handoff.from_employee_id)?.name ?? "Recorded employee unavailable"
          : "Mission origin",
        toEmployeeId: handoff.to_employee_id,
        toEmployeeName: employees.get(handoff.to_employee_id)?.name ?? "Recorded employee unavailable",
        reason: handoff.reason,
        status: handoff.status,
        stage: positiveInteger(context.stage),
        totalStages: positiveInteger(context.total_stages),
        workflow: typeof context.workflow === "string" ? context.workflow : null,
        executionOrder: typeof context.execution_order === "string" ? context.execution_order : null,
        retainedRecordKeys: Object.keys(handoff.retained_record_ids ?? {}).sort(),
        contextKeys: Object.keys(context).sort(),
        createdAt: handoff.created_at,
        acceptedAt: handoff.accepted_at,
        completedAt: handoff.completed_at,
        stuck: (handoff.status === "pending" || handoff.status === "accepted") && ageMs >= stuckAfterMs,
      };
    })
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}
