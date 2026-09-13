import type { Approval, Mission, MissionRun } from "./workforce-data.ts";

export interface AgentMissionWatch {
  mission: Mission | null;
  latestRun: MissionRun | null;
  pendingApprovals: Approval[];
  phase: "idle" | "queued" | "running" | "approval" | "completed" | "failed" | "cancelled";
}

const missionTime = (mission: Mission) => Date.parse(mission.updated_at || mission.created_at) || 0;
const runTime = (run: MissionRun) => Date.parse(run.completed_at ?? run.started_at ?? run.created_at) || 0;

export function buildAgentMissionWatch(input: {
  employeeId: string;
  missions: readonly Mission[];
  runs: readonly MissionRun[];
  approvals: readonly Approval[];
}): AgentMissionWatch {
  const employeeMissions = input.missions
    .filter((mission) => mission.assigned_employee_id === input.employeeId)
    .slice()
    .sort((a, b) => missionTime(b) - missionTime(a));

  const mission = employeeMissions[0] ?? null;
  if (!mission) return { mission: null, latestRun: null, pendingApprovals: [], phase: "idle" };

  const latestRun = input.runs
    .filter((run) => run.mission_id === mission.id && run.employee_id === input.employeeId)
    .slice()
    .sort((a, b) => runTime(b) - runTime(a))[0] ?? null;

  const pendingApprovals = input.approvals.filter(
    (approval) => approval.status === "pending" &&
      (approval.requested_by_employee_id === input.employeeId || approval.mission_id === mission.id || approval.run_id === latestRun?.id),
  );

  let phase: AgentMissionWatch["phase"];
  if (pendingApprovals.length > 0 || mission.status === "awaiting_approval") phase = "approval";
  else if (latestRun?.status === "failed" || mission.status === "failed") phase = "failed";
  else if (latestRun?.status === "completed" || mission.status === "completed") phase = "completed";
  else if (mission.status === "cancelled") phase = "cancelled";
  else if (latestRun?.status === "running" || mission.status === "running") phase = "running";
  else phase = "queued";

  return { mission, latestRun, pendingApprovals, phase };
}
