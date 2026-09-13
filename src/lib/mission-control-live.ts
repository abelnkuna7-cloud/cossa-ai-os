import type { Approval, Mission, MissionRun } from "./workforce-data.ts";
import {
  missionStepIsReady,
  missionTaskPlanFromChildren,
  validateMissionTaskPlanSteps,
  type MissionTaskPlan,
} from "./mission-task-plan.ts";

export interface LiveMissionControlModel {
  mission: Mission;
  plan: MissionTaskPlan;
  valid: boolean;
  errors: readonly string[];
  pendingApprovalCount: number;
  latestRun: MissionRun | null;
  progress: {
    total: number;
    completed: number;
    running: number;
    blocked: number;
    failed: number;
    ready: number;
    percent: number;
  };
}

export function buildLiveMissionControlModels(input: {
  missions: readonly Mission[];
  runs: readonly MissionRun[];
  approvals: readonly Approval[];
}): LiveMissionControlModel[] {
  const roots = input.missions.filter((mission) => mission.parent_mission_id === null);

  return roots.map((mission) => {
    const plan = missionTaskPlanFromChildren({
      missionId: mission.id,
      objective: mission.objective,
      children: input.missions,
    });
    const validation = validateMissionTaskPlanSteps(plan.steps);
    const missionRuns = input.runs
      .filter((run) => run.mission_id === mission.id)
      .slice()
      .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));

    const approvalMissionIds = new Set([
      mission.id,
      ...input.missions
        .filter((candidate) => candidate.parent_mission_id === mission.id)
        .map((candidate) => candidate.id),
    ]);
    const pendingApprovalCount = input.approvals.filter(
      (approval) =>
        approval.mission_id !== null &&
        approvalMissionIds.has(approval.mission_id) &&
        approval.status === "pending",
    ).length;

    const completed = plan.steps.filter((step) => step.status === "completed").length;
    const running = plan.steps.filter((step) => step.status === "running").length;
    const failed = plan.steps.filter((step) => step.status === "failed").length;
    const ready = plan.steps.filter((step) => missionStepIsReady(step, plan.steps)).length;
    const blocked = plan.steps.filter(
      (step) =>
        step.status === "blocked" ||
        ((step.status === "planned" || step.status === "ready") &&
          !missionStepIsReady(step, plan.steps)),
    ).length;
    const total = plan.steps.length;

    return {
      mission,
      plan,
      valid: validation.valid,
      errors: validation.errors,
      pendingApprovalCount,
      latestRun: missionRuns[0] ?? null,
      progress: {
        total,
        completed,
        running,
        blocked,
        failed,
        ready,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
    };
  });
}
