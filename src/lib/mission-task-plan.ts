export type MissionTaskPlanStepStatus =
  | "planned"
  | "ready"
  | "blocked"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface MissionTaskPlanStep {
  id: string;
  title: string;
  objective: string;
  order: number;
  dependsOn: readonly string[];
  status: MissionTaskPlanStepStatus;
  requiresApproval: boolean;
  evidenceRequired: readonly string[];
  assignedEmployeeId?: string | null;
  childMissionId?: string | null;
}

export interface MissionTaskPlan {
  missionId: string;
  objective: string;
  steps: readonly MissionTaskPlanStep[];
}

export interface MissionChildLike {
  id: string;
  parent_mission_id: string | null;
  title: string;
  objective: string;
  status: string;
  assigned_employee_id?: string | null;
  created_at?: string;
}

const STATUS_MAP: Record<string, MissionTaskPlanStepStatus> = {
  draft: "planned",
  queued: "ready",
  running: "running",
  awaiting_approval: "blocked",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
};

export function normaliseMissionStepStatus(value: unknown): MissionTaskPlanStepStatus {
  const key = String(value ?? "").trim().toLowerCase();
  return STATUS_MAP[key] ?? "planned";
}

export function validateMissionTaskPlanSteps(
  steps: readonly MissionTaskPlanStep[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const step of steps) {
    if (!step.id.trim()) errors.push("Every task-plan step must have an id.");
    if (!step.title.trim()) errors.push(`Step ${step.id || "unknown"} must have a title.`);
    if (!step.objective.trim()) errors.push(`Step ${step.id || "unknown"} must have an objective.`);
    if (!Number.isInteger(step.order) || step.order < 1)
      errors.push(`Step ${step.id || "unknown"} must have a positive integer order.`);
    if (ids.has(step.id)) errors.push(`Duplicate task-plan step id: ${step.id}.`);
    ids.add(step.id);
  }

  for (const step of steps) {
    for (const dependency of step.dependsOn) {
      if (!ids.has(dependency))
        errors.push(`Step ${step.id} depends on missing step ${dependency}.`);
      if (dependency === step.id) errors.push(`Step ${step.id} cannot depend on itself.`);
    }
  }

  const byId = new Map(steps.map((step) => [step.id, step] as const));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      errors.push(`Task-plan dependency cycle detected at ${id}.`);
      return;
    }
    visiting.add(id);
    const step = byId.get(id);
    for (const dependency of step?.dependsOn ?? []) {
      if (byId.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const step of steps) visit(step.id);

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

/**
 * Builds a truthful display plan from already-persisted child missions.
 * It does not create missions, grant permissions or claim that planning means
 * execution has occurred.
 */
export function missionTaskPlanFromChildren(input: {
  missionId: string;
  objective: string;
  children: readonly MissionChildLike[];
}): MissionTaskPlan {
  const children = input.children
    .filter((child) => child.parent_mission_id === input.missionId)
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.created_at ?? "") || 0;
      const rightTime = Date.parse(right.created_at ?? "") || 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.id.localeCompare(right.id);
    });

  const steps: MissionTaskPlanStep[] = children.map((child, index) => ({
    id: child.id,
    title: child.title,
    objective: child.objective,
    order: index + 1,
    dependsOn: index === 0 ? [] : [children[index - 1].id],
    status: normaliseMissionStepStatus(child.status),
    requiresApproval: String(child.status).trim().toLowerCase() === "awaiting_approval",
    evidenceRequired: [],
    assignedEmployeeId: child.assigned_employee_id ?? null,
    childMissionId: child.id,
  }));

  return {
    missionId: input.missionId,
    objective: input.objective,
    steps,
  };
}

/**
 * Determines whether a planned step can start from plan facts alone. This is
 * scheduling readiness only; it never authorises execution or bypasses an
 * approval requirement.
 */
export function missionStepIsReady(
  step: MissionTaskPlanStep,
  allSteps: readonly MissionTaskPlanStep[],
): boolean {
  if (step.requiresApproval) return false;
  if (!["planned", "ready"].includes(step.status)) return false;

  const byId = new Map(allSteps.map((candidate) => [candidate.id, candidate] as const));
  return step.dependsOn.every((id) => byId.get(id)?.status === "completed");
}
