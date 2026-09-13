import type { Approval, EmployeeHandoff, Mission, MissionRun } from "./workforce-data";

export interface AgentWorkspaceModel {
  employeeId: string;
  missions: Mission[];
  runs: MissionRun[];
  handoffs: EmployeeHandoff[];
  approvals: Approval[];
  counts: {
    activeMissions: number;
    running: number;
    failed: number;
    pendingApprovals: number;
    incomingHandoffs: number;
    outgoingHandoffs: number;
  };
}

export function buildAgentWorkspaceModel(input: {
  employeeId: string;
  missions: readonly Mission[];
  runs: readonly MissionRun[];
  handoffs: readonly EmployeeHandoff[];
  approvals: readonly Approval[];
}): AgentWorkspaceModel {
  const runs = input.runs
    .filter((run) => run.employee_id === input.employeeId)
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const runIds = new Set(runs.map((run) => run.id));

  const handoffs = input.handoffs
    .filter(
      (handoff) =>
        handoff.to_employee_id === input.employeeId || handoff.from_employee_id === input.employeeId,
    )
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const missionIds = new Set<string>();
  for (const mission of input.missions) {
    if (mission.assigned_employee_id === input.employeeId) missionIds.add(mission.id);
  }
  for (const run of runs) missionIds.add(run.mission_id);
  for (const handoff of handoffs) missionIds.add(handoff.mission_id);

  const missions = input.missions
    .filter((mission) => missionIds.has(mission.id))
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const approvals = input.approvals.filter(
    (approval) =>
      approval.requested_by_employee_id === input.employeeId ||
      (approval.run_id !== null && runIds.has(approval.run_id)) ||
      (approval.mission_id !== null && missionIds.has(approval.mission_id)),
  );

  return {
    employeeId: input.employeeId,
    missions,
    runs,
    handoffs,
    approvals,
    counts: {
      activeMissions: missions.filter((mission) =>
        ["queued", "running", "awaiting_approval"].includes(mission.status),
      ).length,
      running: runs.filter((run) => run.status === "running").length,
      failed: runs.filter((run) => run.status === "failed").length,
      pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
      incomingHandoffs: handoffs.filter((handoff) => handoff.to_employee_id === input.employeeId).length,
      outgoingHandoffs: handoffs.filter((handoff) => handoff.from_employee_id === input.employeeId).length,
    },
  };
}
