import type { EmployeeHandoff, MissionRun } from "./workforce-data";

export type AgentContextIntegritySeverity = "critical" | "high" | "normal";

export interface AgentContextIntegrityIssue {
  id: string;
  missionId: string;
  handoffId: string;
  stage: number | null;
  severity: AgentContextIntegritySeverity;
  code:
    | "ordering_violation"
    | "missing_retained_records"
    | "missing_prior_completed_output";
  summary: string;
}

export interface AgentContextIntegrityReport {
  missionId: string;
  issues: AgentContextIntegrityIssue[];
  status: "healthy" | "attention" | "critical";
  checkedHandoffs: number;
}

function stageNumber(handoff: EmployeeHandoff): number | null {
  const value = handoff.context?.stage;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function hasRetainedRecords(handoff: EmployeeHandoff): boolean {
  return Object.keys(handoff.retained_record_ids ?? {}).length > 0;
}

function runHasCompletedOutput(run: MissionRun): boolean {
  if (run.status !== "completed" || !run.output || typeof run.output !== "object") return false;
  const content = (run.output as { content?: unknown }).content;
  return typeof content === "string" && content.trim().length > 0;
}

function orderedHandoffs(handoffs: readonly EmployeeHandoff[]): EmployeeHandoff[] {
  return [...handoffs].sort((left, right) => {
    const leftStage = stageNumber(left);
    const rightStage = stageNumber(right);
    if (leftStage !== null && rightStage !== null && leftStage !== rightStage) {
      return leftStage - rightStage;
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

export function inspectMissionContextIntegrity(input: {
  missionId: string;
  handoffs: readonly EmployeeHandoff[];
  runs: readonly MissionRun[];
}): AgentContextIntegrityReport {
  const missionHandoffs = orderedHandoffs(
    input.handoffs.filter((handoff) => handoff.mission_id === input.missionId),
  );
  const missionRuns = input.runs.filter((run) => run.mission_id === input.missionId);
  const issues: AgentContextIntegrityIssue[] = [];

  for (let index = 1; index < missionHandoffs.length; index += 1) {
    const current = missionHandoffs[index];
    const prior = missionHandoffs[index - 1];
    const currentStage = stageNumber(current);

    if (current.status === "completed" && prior.status !== "completed") {
      issues.push({
        id: `${current.id}-ordering`,
        missionId: input.missionId,
        handoffId: current.id,
        stage: currentStage,
        severity: "critical",
        code: "ordering_violation",
        summary: "A downstream stage is recorded completed before the immediately prior stage completed.",
      });
    }

    const earlierCompleted = missionHandoffs.slice(0, index).filter((handoff) => handoff.status === "completed");
    const upstreamHasRetainedRecords = earlierCompleted.some(hasRetainedRecords);

    if (
      upstreamHasRetainedRecords &&
      !hasRetainedRecords(current) &&
      ["pending", "accepted", "completed"].includes(current.status)
    ) {
      issues.push({
        id: `${current.id}-records`,
        missionId: input.missionId,
        handoffId: current.id,
        stage: currentStage,
        severity: "high",
        code: "missing_retained_records",
        summary: "Upstream completed work retained source identifiers, but this downstream stage has no retained identifiers recorded.",
      });
    }

    const immediatelyPriorCompleted = prior.status === "completed";
    const priorWorkerHasOutput = missionRuns.some(
      (run) => run.employee_id === prior.to_employee_id && runHasCompletedOutput(run),
    );

    if (
      immediatelyPriorCompleted &&
      !priorWorkerHasOutput &&
      ["accepted", "completed"].includes(current.status)
    ) {
      issues.push({
        id: `${current.id}-output`,
        missionId: input.missionId,
        handoffId: current.id,
        stage: currentStage,
        severity: "high",
        code: "missing_prior_completed_output",
        summary: "The prior handoff is completed, but no completed workforce output from that prior worker is recorded for this mission.",
      });
    }
  }

  const status: AgentContextIntegrityReport["status"] = issues.some((issue) => issue.severity === "critical")
    ? "critical"
    : issues.length > 0
      ? "attention"
      : "healthy";

  return {
    missionId: input.missionId,
    issues,
    status,
    checkedHandoffs: missionHandoffs.length,
  };
}

export function inspectAllMissionContextIntegrity(input: {
  handoffs: readonly EmployeeHandoff[];
  runs: readonly MissionRun[];
}): AgentContextIntegrityReport[] {
  const missionIds = [...new Set(input.handoffs.map((handoff) => handoff.mission_id))];
  return missionIds
    .map((missionId) => inspectMissionContextIntegrity({ missionId, handoffs: input.handoffs, runs: input.runs }))
    .sort((left, right) => {
      const rank = { critical: 0, attention: 1, healthy: 2 } as const;
      return rank[left.status] - rank[right.status];
    });
}
