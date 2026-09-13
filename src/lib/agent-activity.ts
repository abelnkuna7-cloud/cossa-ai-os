export type AgentActivityKind = "run" | "approval";
export type AgentActivityState =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled"
  | "pending_approval";

export interface AgentActivityRunLike {
  id: string;
  mission_id: string;
  employee_id: string | null;
  status: string;
  model_provider: string | null;
  model_name: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AgentActivityApprovalLike {
  id: string;
  mission_id: string | null;
  run_id: string | null;
  requested_by_employee_id: string | null;
  action_type: string;
  risk_level: string;
  justification: string;
  status: string;
  requested_at: string;
}

export interface AgentActivityItem {
  id: string;
  kind: AgentActivityKind;
  employeeId: string | null;
  missionId: string | null;
  runId: string | null;
  state: AgentActivityState;
  title: string;
  detail: string;
  provider: string | null;
  model: string | null;
  occurredAt: string;
  riskLevel: string | null;
}

function runState(status: string): AgentActivityState {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "awaiting_approval" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }
  return "queued";
}

export function buildAgentActivityFeed(input: {
  runs: readonly AgentActivityRunLike[];
  approvals: readonly AgentActivityApprovalLike[];
}): AgentActivityItem[] {
  const runs: AgentActivityItem[] = input.runs.map((run) => ({
    id: `run:${run.id}`,
    kind: "run",
    employeeId: run.employee_id,
    missionId: run.mission_id,
    runId: run.id,
    state: runState(run.status),
    title: `Mission run ${run.status.replaceAll("_", " ")}`,
    detail:
      run.status === "failed"
        ? run.error_message || run.error_code || "Mission run failed without a recorded error detail."
        : "Recorded workforce execution state.",
    provider: run.model_provider,
    model: run.model_name,
    occurredAt: run.completed_at || run.started_at || run.created_at,
    riskLevel: null,
  }));

  const approvals: AgentActivityItem[] = input.approvals
    .filter((approval) => approval.status === "pending")
    .map((approval) => ({
      id: `approval:${approval.id}`,
      kind: "approval",
      employeeId: approval.requested_by_employee_id,
      missionId: approval.mission_id,
      runId: approval.run_id,
      state: "pending_approval",
      title: `Approval required: ${approval.action_type.replaceAll("_", " ")}`,
      detail: approval.justification || "Owner approval is required before this action can proceed.",
      provider: null,
      model: null,
      occurredAt: approval.requested_at,
      riskLevel: approval.risk_level,
    }));

  return [...runs, ...approvals].sort((left, right) => {
    const leftTime = Date.parse(left.occurredAt) || 0;
    const rightTime = Date.parse(right.occurredAt) || 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}
