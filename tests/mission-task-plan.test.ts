import assert from "node:assert/strict";
import test from "node:test";
import {
  missionStepIsReady,
  missionTaskPlanFromChildren,
  normaliseMissionStepStatus,
  validateMissionTaskPlanSteps,
  type MissionTaskPlanStep,
} from "../src/lib/mission-task-plan.ts";

test("child missions become a deterministic ordered task plan", () => {
  const plan = missionTaskPlanFromChildren({
    missionId: "parent",
    objective: "Win a verified commercial cleaning opportunity",
    children: [
      {
        id: "child-2",
        parent_mission_id: "parent",
        title: "Verify buyer evidence",
        objective: "Verify the buying signal and contactability.",
        status: "queued",
        created_at: "2026-09-13T09:02:00Z",
      },
      {
        id: "other",
        parent_mission_id: "different-parent",
        title: "Ignore me",
        objective: "Not part of this mission.",
        status: "running",
        created_at: "2026-09-13T09:00:00Z",
      },
      {
        id: "child-1",
        parent_mission_id: "parent",
        title: "Discover candidates",
        objective: "Find evidence-backed candidate opportunities.",
        status: "completed",
        created_at: "2026-09-13T09:01:00Z",
      },
    ],
  });

  assert.deepEqual(
    plan.steps.map((step) => step.id),
    ["child-1", "child-2"],
  );
  assert.deepEqual(plan.steps[0].dependsOn, []);
  assert.deepEqual(plan.steps[1].dependsOn, ["child-1"]);
  assert.equal(plan.steps[0].status, "completed");
  assert.equal(plan.steps[1].status, "ready");
});

test("awaiting approval is displayed as blocked and cannot be scheduled ready", () => {
  const plan = missionTaskPlanFromChildren({
    missionId: "parent",
    objective: "Prepare and publish an approved action",
    children: [
      {
        id: "approval-step",
        parent_mission_id: "parent",
        title: "Owner approval",
        objective: "Wait for CEO approval before the binding action.",
        status: "awaiting_approval",
      },
    ],
  });

  assert.equal(plan.steps[0].status, "blocked");
  assert.equal(plan.steps[0].requiresApproval, true);
  assert.equal(missionStepIsReady(plan.steps[0], plan.steps), false);
});

test("a dependent planned step is ready only after every dependency completed", () => {
  const steps: MissionTaskPlanStep[] = [
    {
      id: "research",
      title: "Research",
      objective: "Collect evidence.",
      order: 1,
      dependsOn: [],
      status: "completed",
      requiresApproval: false,
      evidenceRequired: [],
    },
    {
      id: "draft",
      title: "Draft",
      objective: "Prepare the internal draft.",
      order: 2,
      dependsOn: ["research"],
      status: "planned",
      requiresApproval: false,
      evidenceRequired: [],
    },
  ];

  assert.equal(missionStepIsReady(steps[1], steps), true);
  steps[0] = { ...steps[0], status: "failed" };
  assert.equal(missionStepIsReady(steps[1], steps), false);
});

test("plan validation rejects missing dependencies, self-dependency and cycles", () => {
  const steps: MissionTaskPlanStep[] = [
    {
      id: "a",
      title: "A",
      objective: "A objective",
      order: 1,
      dependsOn: ["b", "missing"],
      status: "planned",
      requiresApproval: false,
      evidenceRequired: [],
    },
    {
      id: "b",
      title: "B",
      objective: "B objective",
      order: 2,
      dependsOn: ["a", "b"],
      status: "planned",
      requiresApproval: false,
      evidenceRequired: [],
    },
  ];

  const result = validateMissionTaskPlanSteps(steps);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("missing step missing")));
  assert.ok(result.errors.some((error) => error.includes("cannot depend on itself")));
  assert.ok(result.errors.some((error) => error.includes("dependency cycle")));
});

test("unknown mission status fails closed to planned rather than claiming live execution", () => {
  assert.equal(normaliseMissionStepStatus("mystery_state"), "planned");
});
