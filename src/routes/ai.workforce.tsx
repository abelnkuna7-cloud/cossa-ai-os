import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileCheck2,
  FilePenLine,
  Globe2,
  KeyRound,
  Megaphone,
  PanelTop,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

import {
  COSSA_GROWTH_WORKFORCE,
  completeControlledWorkforceRun,
  createGrowthCoordinationMission,
  decideApproval,
  failControlledWorkforceRun,
  installCossaGrowthWorkforce,
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
  startControlledWorkforceRun,
  type AiEmployee,
  type Approval,
  type EmployeeHandoff,
  type Mission,
  type MissionRun,
} from "@/lib/workforce-data";

import { streamChat } from "@/lib/ai-stream";

import {
  checkOfficialWebsite,
  type OfficialWebsiteHealthReport,
} from "@/lib/website-health";

import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/ai/workforce")({
  component: AiWorkforce,

  head: () => ({
    meta: [
      {
        title: "AI Workforce — Cossa AI",
      },
      {
        name: "description",
        content:
          "Cossa Nexus Holdings AI workforce command centre for controlled planning, monitoring, handoffs and owner-approved AI operations.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const GROWTH_MISSION_PREFIX = "Growth coordination:";

/**
 * This is only the controlled Growth coordination workflow.
 *
 * It is intentionally separate from the complete Cossa workforce directory.
 * Employees such as Procurement Intelligence, Customer Reactivation,
 * Product Intelligence and Lead Intake may exist and operate through their
 * own future workflows without being forced through this social-growth chain.
 */
const GROWTH_WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Check website",
    description:
      "Runs the approved read-only Cossa website check and flags verified issues.",
    icon: Globe2,
  },
  {
    key: "social-strategy-planner",
    label: "Plan",
    description:
      "Creates the strategy brief from approved Cossa context.",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Write",
    description:
      "Prepares reviewable content drafts without publishing them.",
    icon: FilePenLine,
  },
  {
    key: "social-schedule-coordinator",
    label: "Schedule",
    description:
      "Organises approved work into a proposed publishing calendar.",
    icon: PanelTop,
  },
  {
    key: "account-growth-analyst",
    label: "Analyse growth",
    description:
      "Uses authorised account data only and reports missing data.",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Review ads",
    description:
      "Prepares controlled paid-media recommendations without spending.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO briefing",
    description:
      "Synthesises verified worker outputs for the owner's decision.",
    icon: BrainCircuit,
  },
] as const;

const GROWTH_WORKFLOW_KEYS = new Set<string>(
  GROWTH_WORKFLOW.map((step) => step.key),
);

/* -------------------------------------------------------------------------- */
/* GENERIC HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "No activity recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function latestRunTime(run: MissionRun): string {
  return (
    run.completed_at ??
    run.started_at ??
    run.created_at ??
    ""
  );
}

function employeeDepartment(employee: AiEmployee): string {
  return employee.department?.trim() || "Department not recorded";
}

function employeeBusinessUnit(employee: AiEmployee): string {
  return employee.business_unit_id
    ? "Assigned business unit"
    : "Group-wide";
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE MONITOR TYPES                                                    */
/* -------------------------------------------------------------------------- */

type OperationalState =
  | "working"
  | "idle"
  | "waiting"
  | "approval"
  | "attention"
  | "inactive";

interface EmployeeOperationalView {
  state: OperationalState;
  label: string;
  detail: string;

  currentTask: string;
  lastActivity: string | null;

  assignedCount: number;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  approvalCount: number;

  latestProvider: string | null;
  latestModel: string | null;
  latestFailure: string | null;
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE STATUS DERIVATION                                                */
/* -------------------------------------------------------------------------- */

function employeeOperationalView({
  employee,
  handoffs,
  runs,
  approvals,
}: {
  employee: AiEmployee;
  handoffs: EmployeeHandoff[];
  runs: MissionRun[];
  approvals: Approval[];
}): EmployeeOperationalView {
  /*
   * Only handoffs actually assigned TO this employee belong to this
   * employee's work queue.
   */
  const employeeHandoffs = handoffs.filter(
    (handoff) => handoff.to_employee_id === employee.id,
  );

  /*
   * IMPORTANT:
   * A mission may contain many workers.
   *
   * We must therefore use employee_id instead of assigning every run in the
   * mission to every worker who touched the mission.
   */
  const employeeRuns = runs.filter(
    (run) => run.employee_id === employee.id,
  );

  /*
   * Prefer approvals actually requested by this worker.
   *
   * Some final AI CEO approvals may also be attached to the mission/run.
   */
  const employeeRunIds = new Set(
    employeeRuns.map((run) => run.id),
  );

  const employeeApprovals = approvals.filter(
    (approval) =>
      approval.requested_by_employee_id === employee.id ||
      (approval.run_id !== null &&
        employeeRunIds.has(approval.run_id)),
  );

  const pendingHandoffs = employeeHandoffs.filter(
    (handoff) => handoff.status === "pending",
  );

  /*
   * employee_handoffs uses:
   * pending -> accepted -> completed
   *
   * "accepted" is therefore the real active handoff state.
   */
  const acceptedHandoffs = employeeHandoffs.filter(
    (handoff) => handoff.status === "accepted",
  );

  const activeRuns = employeeRuns.filter(
    (run) => run.status === "running",
  );

  const failedRuns = employeeRuns.filter(
    (run) => run.status === "failed",
  );

  const latestHandoff = [...employeeHandoffs].sort(
    (left, right) =>
      right.created_at.localeCompare(left.created_at),
  )[0];

  const latestRun = [...employeeRuns].sort(
    (left, right) =>
      latestRunTime(right).localeCompare(latestRunTime(left)),
  )[0];

  const latestFailure =
    latestRun?.status === "failed"
      ? latestRun.error_message ||
        latestRun.error_code ||
        "The latest recorded run failed."
      : null;

  const latestActivityCandidates = [
    latestRun ? latestRunTime(latestRun) : "",
    latestHandoff?.completed_at ?? "",
    latestHandoff?.accepted_at ?? "",
    latestHandoff?.created_at ?? "",
  ].filter(Boolean);

  const latestActivity =
    latestActivityCandidates.sort((left, right) =>
      right.localeCompare(left),
    )[0] ?? null;

  const currentTask =
    acceptedHandoffs[0]?.reason ??
    pendingHandoffs[0]?.reason ??
    latestHandoff?.reason ??
    "No task currently assigned";

  const common = {
    currentTask,

    lastActivity: latestActivity,

    assignedCount: employeeHandoffs.length,

    pendingCount: pendingHandoffs.length,

    runningCount:
      activeRuns.length + acceptedHandoffs.length,

    failedCount: failedRuns.length,

    approvalCount: employeeApprovals.length,

    latestProvider:
      latestRun?.model_provider ?? null,

    latestModel:
      latestRun?.model_name ?? null,

    latestFailure,
  };

  if (employee.status !== "active") {
    return {
      ...common,

      state: "inactive",

      label: `${formatStatus(
        employee.status,
      )} — Not operational`,

      detail:
        employee.status === "paused"
          ? "This employee has been intentionally paused and cannot start new controlled work."
          : employee.status === "retired"
            ? "This employee is retired and cannot start new controlled work."
            : "The employee profile exists but is not currently active.",
    };
  }

  /*
   * A historic failure should not permanently mark the employee as broken.
   * Only the latest run failing creates an active attention state.
   */
  if (latestRun?.status === "failed") {
    return {
      ...common,

      state: "attention",

      label: "Active — Needs attention",

      detail:
        latestFailure ??
        "The latest workforce run failed and should be reviewed before retrying.",
    };
  }

  if (employeeApprovals.length > 0) {
    return {
      ...common,

      state: "approval",

      label: "Active — Approval required",

      detail:
        "Recorded work is waiting for owner review or approval.",
    };
  }

  if (
    activeRuns.length > 0 ||
    acceptedHandoffs.length > 0
  ) {
    return {
      ...common,

      state: "working",

      label: "Active — Working",

      detail:
        "A real workforce run or accepted handoff is currently recorded for this employee.",
    };
  }

  if (pendingHandoffs.length > 0) {
    return {
      ...common,

      state: "waiting",

      label: "Active — Waiting",

      detail:
        "A real task has been assigned but execution has not started yet.",
    };
  }

  return {
    ...common,

    state: "idle",

    label: "Active — Idle",

    currentTask: "No task currently assigned",

    detail:
      employeeHandoffs.length > 0
        ? "This employee has recorded work history but no task is currently pending or running."
        : "The profile is active and available, but no real task has been assigned yet.",
  };
}

/* -------------------------------------------------------------------------- */
/* OUTPUT HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function reviewableOutputContent(
  run: MissionRun,
): string | null {
  if (
    !run.output ||
    typeof run.output !== "object"
  ) {
    return null;
  }

  const content = (
    run.output as {
      content?: unknown;
    }
  ).content;

  return typeof content === "string" &&
    content.trim()
    ? content
    : null;
}

function websiteReportEvidence(
  report: OfficialWebsiteHealthReport,
): string {
  return [
    "Authorised read-only official Cossa website health result",

    `Website: ${report.website}`,

    `Checked at: ${report.checked_at}`,

    `Availability: ${report.availability}`,

    `HTTP status: ${
      report.http_status ??
      "not available"
    }`,

    `Response time: ${
      report.response_time_ms ??
      "not available"
    } ms`,

    `Page title: ${
      report.page_title ??
      "not detected"
    }`,

    `Noindex detected: ${
      report.noindex_detected
        ? "yes"
        : "no"
    }`,

    `Reported issues: ${
      report.issues.length > 0
        ? report.issues.join("; ")
        : "none"
    }`,

    `Scope: ${report.monitoring_scope}`,
  ].join("\n");
}

function controlledStagePrompt({
  mission,
  handoff,
  employee,
  priorOutputs,
  authorisedEvidence,
}: {
  mission: Mission;
  handoff: EmployeeHandoff;
  employee: AiEmployee;
  priorOutputs: string[];
  authorisedEvidence: string[];
}): string {
  const previous =
    priorOutputs.length > 0
      ? priorOutputs
          .map(
            (output, index) =>
              `Earlier worker draft ${index + 1}:\n${output}`,
          )
          .join("\n\n")
      : "No earlier workforce output has been recorded.";

  return [
    `You are ${employee.title} in the controlled Cossa AI Workforce.`,

    "Create one internal, reviewable draft for the assigned handoff. External actions are disabled.",

    "Use only verified Cossa Knowledge Base information and authorised Cossa operational records supplied by the Cossa AI route.",

    "If information is unavailable, explicitly label it as missing. Do not guess, fabricate customer results, claim account access, invent performance data, or name unverified competitors.",

    "Do not publish content, send messages, contact prospects, spend money, change budgets, alter accounts, connect providers, make legal or financial commitments, or claim that any of those actions occurred.",

    "Use these headings exactly: Verified inputs; Missing information or connections; Reviewable draft; Owner decisions required; External actions disabled.",

    `Mission objective: ${mission.objective}`,

    `Mission instruction: ${mission.instruction}`,

    `Target market: ${
      mission.target_market ||
      "Not specified"
    }`,

    `Target location: ${
      mission.target_location ||
      "Not specified"
    }`,

    `Assigned handoff: ${handoff.reason}`,

    `Recorded handoff context: ${JSON.stringify(
      handoff.context,
    )}`,

    authorisedEvidence.length > 0
      ? `Authorised evidence for this stage:\n${authorisedEvidence.join(
          "\n\n",
        )}`
      : "No additional authorised evidence was collected for this stage.",

    previous,
  ].join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

function AiWorkforce() {
  const queryClient =
    useQueryClient();

  const [
    objective,
    setObjective,
  ] = useState(
    "Build a controlled social media and paid-media growth plan for Cossa Nexus Holdings.",
  );

  const [
    targetMarket,
    setTargetMarket,
  ] = useState(
    "South Africa",
  );

  const [
    targetLocation,
    setTargetLocation,
  ] = useState(
    "Gauteng",
  );

  const [
    selectedMissionId,
    setSelectedMissionId,
  ] = useState<
    string | null
  >(null);

  /* ------------------------------------------------------------------------ */
  /* QUERIES                                                                  */
  /* ------------------------------------------------------------------------ */

  const employeesQuery =
    useQuery({
      queryKey: [
        "ai-workforce-employees",
      ],

      queryFn: () =>
        listEmployees(),
    });

  const missionsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-missions",
      ],

      queryFn: () =>
        listMissions(),
    });

  const handoffsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-handoffs",
      ],

      queryFn: () =>
        listEmployeeHandoffs(),
    });

  const runsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-runs",
      ],

      queryFn: () =>
        listWorkforceRuns(),
    });

  const approvalsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-approvals",
      ],

      queryFn: () =>
        listPendingApprovals(),
    });

  /* ------------------------------------------------------------------------ */
  /* REFRESH                                                                  */
  /* ------------------------------------------------------------------------ */

  const refreshWorkforce =
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "ai-workforce-employees",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "ai-workforce-missions",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "ai-workforce-handoffs",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "ai-workforce-runs",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "ai-workforce-approvals",
          ],
        }),
      ]);
    };

  /* ------------------------------------------------------------------------ */
  /* SETUP                                                                    */
  /* ------------------------------------------------------------------------ */

  const installMutation =
    useMutation({
      mutationFn:
        installCossaGrowthWorkforce,

      onSuccess:
        async (result) => {
          await refreshWorkforce();

          const activeCount =
            result.filter(
              (employee) =>
                employee.status ===
                "active",
            ).length;

          toast.success(
            "Cossa workforce checked",
            {
              description:
                `${result.length} employee profiles are recorded. ${activeCount} are currently active. Existing records were preserved.`,
            },
          );
        },

      onError: (error) => {
        toast.error(
          "Workforce setup could not be completed",
          {
            description:
              error instanceof Error
                ? error.message
                : "Unknown workforce setup error.",
          },
        );
      },
    });

  /* ------------------------------------------------------------------------ */
  /* COORDINATION                                                             */
  /* ------------------------------------------------------------------------ */

  const coordinationMutation =
    useMutation({
      mutationFn:
        createGrowthCoordinationMission,

      onSuccess:
        async ({
          mission,
          handoffs,
        }) => {
          setSelectedMissionId(
            mission.id,
          );

          await refreshWorkforce();

          toast.success(
            "Coordination plan recorded",
            {
              description:
                `${mission.title} has ${handoffs.length} controlled handoff stages. No external action was started.`,
            },
          );
        },

      onError: (error) => {
        toast.error(
          "Coordination plan could not be created",
          {
            description:
              error instanceof Error
                ? error.message
                : "Unknown mission error.",
          },
        );
      },
    });

  /* ------------------------------------------------------------------------ */
  /* SOURCE DATA                                                              */
  /* ------------------------------------------------------------------------ */

  const employees =
    employeesQuery.data ??
    [];

  const missions =
    missionsQuery.data ??
    [];

  const handoffs =
    handoffsQuery.data ??
    [];

  const runs =
    runsQuery.data ??
    [];

  const approvals =
    approvalsQuery.data ??
    [];

  const employeesByKey =
    useMemo(
      () =>
        new Map(
          employees.map(
            (employee) => [
              employee.employee_key,
              employee,
            ],
          ),
        ),
      [employees],
    );

  /* ------------------------------------------------------------------------ */
  /* ALL EMPLOYEE OPERATIONAL STATE                                           */
  /* ------------------------------------------------------------------------ */

  const employeeOperationalViews =
    useMemo(
      () =>
        employees.map(
          (employee) => ({
            employee,

            operational:
              employeeOperationalView({
                employee,
                handoffs,
                runs,
                approvals,
              }),
          }),
        ),
      [
        employees,
        handoffs,
        runs,
        approvals,
      ],
    );

  const workforceCounts =
    useMemo(() => {
      let working = 0;
      let idle = 0;
      let waiting = 0;
      let approval = 0;
      let attention = 0;
      let inactive = 0;

      for (
        const item of
          employeeOperationalViews
      ) {
        switch (
          item.operational.state
        ) {
          case "working":
            working += 1;
            break;

          case "idle":
            idle += 1;
            break;

          case "waiting":
            waiting += 1;
            break;

          case "approval":
            approval += 1;
            break;

          case "attention":
            attention += 1;
            break;

          case "inactive":
            inactive += 1;
            break;
        }
      }

      return {
        working,
        idle,
        waiting,
        approval,
        attention,
        inactive,
      };
    }, [
      employeeOperationalViews,
    ]);

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            employees.map(
              (employee) =>
                employeeDepartment(
                  employee,
                ),
            ),
          ),
        ).sort(),
      [employees],
    );

  /* ------------------------------------------------------------------------ */
  /* DEFAULT WORKFORCE INSTALLATION STATE                                     */
  /* ------------------------------------------------------------------------ */

  const installedDefaultEmployees =
    COSSA_GROWTH_WORKFORCE.filter(
      (profile) =>
        employeesByKey.has(
          profile.employee_key,
        ),
    );

  const activeDefaultEmployees =
    COSSA_GROWTH_WORKFORCE.filter(
      (profile) =>
        employeesByKey.get(
          profile.employee_key,
        )?.status ===
        "active",
    );

  const activeControlledWorkflowEmployees =
    GROWTH_WORKFLOW.filter(
      (step) =>
        employeesByKey.get(
          step.key,
        )?.status ===
        "active",
    );

  /* ------------------------------------------------------------------------ */
  /* CONTROLLED GROWTH WORKFLOW                                               */
  /* ------------------------------------------------------------------------ */

  const coordinationMissions =
    missions.filter(
      (mission) =>
        mission.title.startsWith(
          GROWTH_MISSION_PREFIX,
        ),
    );

  const coordinationMissionIds =
    new Set(
      coordinationMissions.map(
        (mission) =>
          mission.id,
      ),
    );

  const pendingHandoffs =
    handoffs.filter(
      (handoff) =>
        handoff.status ===
          "pending" &&
        coordinationMissionIds.has(
          handoff.mission_id,
        ),
    );

  const selectedMission =
    coordinationMissions.find(
      (mission) =>
        mission.id ===
        selectedMissionId,
    ) ??
    coordinationMissions[0] ??
    null;

  const selectedMissionHandoffs =
    selectedMission
      ? handoffs
          .filter(
            (handoff) =>
              handoff.mission_id ===
              selectedMission.id,
          )
          .sort(
            (left, right) =>
              left.created_at.localeCompare(
                right.created_at,
              ),
          )
      : [];

  const nextHandoff =
    selectedMissionHandoffs.find(
      (handoff) =>
        handoff.status ===
        "pending",
    ) ?? null;

  const nextEmployee =
    nextHandoff
      ? employees.find(
          (employee) =>
            employee.id ===
            nextHandoff.to_employee_id,
        ) ?? null
      : null;

  const selectedMissionRuns =
    selectedMission
      ? runs.filter(
          (run) =>
            run.mission_id ===
            selectedMission.id,
        )
      : [];

  const reviewableOutputs =
    selectedMissionRuns
      .map((run) => ({
        run,
        content:
          reviewableOutputContent(
            run,
          ),
      }))
      .filter(
        (
          item,
        ): item is {
          run: MissionRun;
          content: string;
        } =>
          Boolean(
            item.content,
          ),
      );

  const workforceReviewApprovals =
    approvals.filter(
      (approval) =>
        approval.action_type ===
          "review_growth_coordination_output" &&
        coordinationMissionIds.has(
          approval.mission_id ??
            "",
        ),
    );

  const isLoading =
    employeesQuery.isLoading ||
    missionsQuery.isLoading ||
    handoffsQuery.isLoading ||
    runsQuery.isLoading ||
    approvalsQuery.isLoading;

  /*
   * Creating this specific coordination mission requires the seven employees
   * that actually participate in this workflow.
   *
   * Other employees can exist and remain available without being forced into
   * this social/paid-media pipeline.
   */
  const canCreateCoordination =
    activeControlledWorkflowEmployees.length ===
      GROWTH_WORKFLOW.length &&
    objective.trim().length >
      0;

  /* ------------------------------------------------------------------------ */
  /* RUN NEXT CONTROLLED STAGE                                                */
  /* ------------------------------------------------------------------------ */

  const runNextStageMutation =
    useMutation({
      mutationFn:
        async () => {
          if (
            !selectedMission ||
            !nextHandoff ||
            !nextEmployee
          ) {
            throw new Error(
              "Select a coordination mission with a pending workforce stage first.",
            );
          }

          if (
            nextEmployee.status !==
            "active"
          ) {
            throw new Error(
              `${nextEmployee.name} is ${nextEmployee.status} and cannot run this stage.`,
            );
          }

          const priorOutputs =
            reviewableOutputs.map(
              (item) =>
                item.content,
            );

          const authorisedEvidence =
            nextEmployee.employee_key ===
            "website-seo-monitor"
              ? [
                  websiteReportEvidence(
                    await checkOfficialWebsite(),
                  ),
                ]
              : [];

          const run =
            await startControlledWorkforceRun({
              mission:
                selectedMission,

              handoff:
                nextHandoff,

              employee:
                nextEmployee,

              provider:
                "groq",

              modelName:
                "llama-3.3-70b-versatile",

              priorOutputs,

              authorisedEvidence,
            });

          try {
            const content =
              await streamChat(
                [
                  {
                    role:
                      "user",

                    content:
                      controlledStagePrompt({
                        mission:
                          selectedMission,

                        handoff:
                          nextHandoff,

                        employee:
                          nextEmployee,

                        priorOutputs,

                        authorisedEvidence,
                      }),
                  },
                ],

                () =>
                  undefined,

                undefined,

                nextEmployee.system_instructions,

                "groq",
              );

            if (
              !content.trim()
            ) {
              throw new Error(
                "Cossa AI did not return a reviewable workforce draft.",
              );
            }

            return completeControlledWorkforceRun({
              run,

              handoff:
                nextHandoff,

              employee:
                nextEmployee,

              content,
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "The workforce provider failed to return an output.";

            try {
              await failControlledWorkforceRun({
                run,

                handoff:
                  nextHandoff,

                errorMessage:
                  message,
              });
            } catch (
              cleanupError
            ) {
              console.error(
                "Unable to record controlled workforce failure",
                cleanupError,
              );
            }

            throw error;
          }
        },

      onSuccess:
        async ({
          finalStage,
        }) => {
          await refreshWorkforce();

          toast.success(
            finalStage
              ? "Final owner review requested"
              : "Reviewable workforce draft saved",
            {
              description:
                finalStage
                  ? "The AI CEO briefing is saved for internal owner review. No external action was enabled."
                  : "The next controlled handoff is ready. No external action was enabled.",
            },
          );
        },

      onError: (error) => {
        toast.error(
          "Controlled workforce stage could not run",
          {
            description:
              error instanceof Error
                ? error.message
                : "Unknown workforce run error.",
          },
        );
      },
    });

  /* ------------------------------------------------------------------------ */
  /* APPROVAL                                                                 */
  /* ------------------------------------------------------------------------ */

  const reviewMutation =
    useMutation({
      mutationFn: ({
        approvalId,
        decision,
      }: {
        approvalId: string;

        decision:
          | "approved"
          | "rejected";
      }) =>
        decideApproval(
          approvalId,

          decision,

          decision ===
            "approved"
            ? "Owner approved the internal workforce briefing. External actions remain disabled."
            : "Owner requested changes to the internal workforce briefing. External actions remain disabled.",
        ),

      onSuccess:
        async (
          _,
          variables,
        ) => {
          await refreshWorkforce();

          toast.success(
            variables.decision ===
            "approved"
              ? "Internal briefing approved"
              : "Changes requested",
            {
              description:
                "This affects only the internal workforce mission. It does not authorise publication, messaging, account changes or advertising spend.",
            },
          );
        },

      onError: (error) => {
        toast.error(
          "Owner review could not be recorded",
          {
            description:
              error instanceof Error
                ? error.message
                : "Unknown approval error.",
          },
        );
      },
    });

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* HERO */}
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <UsersRound className="h-5 w-5" />
              </div>

              <StatusBadge
                status={
                  workspaceRuntimeStatus()
                }
              />
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Cossa{" "}
              <span className="text-gradient-gold">
                AI Workforce
              </span>
            </h1>

            <p className="mt-2 max-w-3xl text-muted-foreground">
              Central workforce command
              centre for Cossa Nexus
              Holdings. Employee status
              is derived from real
              employee records,
              handoffs, runs and pending
              approvals. An active
              profile means the employee
              is available for internal
              work; it does not falsely
              imply that the employee is
              currently working.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void refreshWorkforce()
              }
              disabled={
                isLoading
              }
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />

              Refresh records
            </Button>

            <Button
              type="button"
              onClick={() =>
                installMutation.mutate()
              }
              disabled={
                installMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <UsersRound className="mr-1.5 h-4 w-4" />

              {installMutation.isPending
                ? "Checking workforce…"
                : "Check workforce setup"}
            </Button>
          </div>
        </div>
      </section>

      {/* TOP METRICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Total employees"
          value={String(
            employees.length,
          )}
        />

        <Metric
          label="Active profiles"
          value={String(
            employees.filter(
              (employee) =>
                employee.status ===
                "active",
            ).length,
          )}
        />

        <Metric
          label="Working"
          value={String(
            workforceCounts.working,
          )}
        />

        <Metric
          label="Waiting"
          value={String(
            workforceCounts.waiting,
          )}
        />

        <Metric
          label="Idle"
          value={String(
            workforceCounts.idle,
          )}
        />

        <Metric
          label="Needs attention"
          value={String(
            workforceCounts.attention +
              workforceCounts.approval,
          )}
          warning={
            workforceCounts.attention +
              workforceCounts.approval >
            0
          }
        />
      </section>

      {/* WORKFORCE INSTALLATION STATUS */}
      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce integrity
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Default Cossa workforce
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              This compares the
              workforce definitions in
              source code with live
              employee records. Custom
              and existing employees are
              preserved and continue to
              appear in the full
              directory below.
            </p>
          </div>

          <div className="grid min-w-64 grid-cols-2 gap-2">
            <MiniMetric
              label="Installed"
              value={
                installedDefaultEmployees.length
              }
            />

            <MiniMetric
              label="Active"
              value={
                activeDefaultEmployees.length
              }
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Expected default profiles:{" "}
          <strong className="text-foreground">
            {
              COSSA_GROWTH_WORKFORCE.length
            }
          </strong>
          {" · "}
          Recorded:{" "}
          <strong className="text-foreground">
            {
              installedDefaultEmployees.length
            }
          </strong>
          {" · "}
          Active:{" "}
          <strong className="text-foreground">
            {
              activeDefaultEmployees.length
            }
          </strong>
          {" · "}
          Departments represented:{" "}
          <strong className="text-foreground">
            {
              departments.length
            }
          </strong>
        </div>
      </section>

      {/* FULL WORKFORCE DIRECTORY */}
      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce command centre
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              All Cossa AI employees
            </h2>
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground">
            Every employee returned
            from the live
            <code className="mx-1 text-primary">
              ai_employees
            </code>
            table appears here,
            including custom employees
            and roles outside the Growth
            coordination workflow.
          </p>
        </div>

        {employeesQuery.isLoading ? (
          <div className="mt-5 rounded-xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
            Loading workforce records…
          </div>
        ) : employeesQuery.isError ? (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            The workforce database could
            not be loaded. Refresh the
            page after checking the
            Supabase connection and
            access policies.
          </div>
        ) : employees.length === 0 ? (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
            No AI employee records were
            returned from the workforce
            database.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employeeOperationalViews.map(
              ({
                employee,
                operational,
              }) => {
                const inGrowthWorkflow =
                  GROWTH_WORKFLOW_KEYS.has(
                    employee.employee_key,
                  );

                return (
                  <article
                    key={
                      employee.id
                    }
                    className="rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">
                          {
                            employee.name
                          }
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {
                            employee.title
                          }
                        </p>
                      </div>

                      <OperationalBadge
                        state={
                          operational.state
                        }
                        label={
                          operational.label
                        }
                      />
                    </div>

                    <div className="mt-4 grid gap-2 text-xs">
                      <EmployeeDetail
                        label="Department"
                        value={employeeDepartment(
                          employee,
                        )}
                      />

                      <EmployeeDetail
                        label="Business unit"
                        value={employeeBusinessUnit(
                          employee,
                        )}
                      />

                      <EmployeeDetail
                        label="Profile status"
                        value={formatStatus(
                          employee.status,
                        )}
                      />

                      <EmployeeDetail
                        label="Growth workflow"
                        value={
                          inGrowthWorkflow
                            ? "Included"
                            : "Separate workflow"
                        }
                      />

                      <EmployeeDetail
                        label="Approval control"
                        value={
                          employee.requires_approval_by_default
                            ? "Owner approval required"
                            : "Not required by default"
                        }
                      />
                    </div>

                    <div className="mt-4 rounded-lg border border-border/50 bg-background/35 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Current task
                      </p>

                      <p className="mt-1 text-xs leading-relaxed">
                        {
                          operational.currentTask
                        }
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {
                        operational.detail
                      }
                    </p>

                    {operational.latestFailure ? (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-destructive">
                          Latest failure
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-destructive">
                          {
                            operational.latestFailure
                          }
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <MiniMetric
                        label="Assigned"
                        value={
                          operational.assignedCount
                        }
                      />

                      <MiniMetric
                        label="Pending"
                        value={
                          operational.pendingCount
                        }
                      />

                      <MiniMetric
                        label="Running"
                        value={
                          operational.runningCount
                        }
                      />

                      <MiniMetric
                        label="Failed"
                        value={
                          operational.failedCount
                        }
                        warning={
                          operational.latestFailure !==
                          null
                        }
                      />
                    </div>

                    <div className="mt-4 grid gap-2 border-t border-border/50 pt-3 text-xs">
                      <EmployeeDetail
                        label="Latest provider"
                        value={
                          operational.latestProvider ??
                          "No provider run recorded"
                        }
                      />

                      <EmployeeDetail
                        label="Latest model"
                        value={
                          operational.latestModel ??
                          "No model run recorded"
                        }
                      />

                      <EmployeeDetail
                        label="Pending approvals"
                        value={String(
                          operational.approvalCount,
                        )}
                      />
                    </div>

                    <div className="mt-4 border-t border-border/50 pt-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Last recorded activity
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(
                          operational.lastActivity,
                        )}
                      </p>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      {/* CONTROLLED GROWTH WORKFLOW */}
      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Controlled handoff line
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Growth coordination
              workflow
            </h2>
          </div>

          <p className="max-w-xl text-sm text-muted-foreground">
            This seven-stage chain is
            specifically for website,
            social, content and
            paid-media planning. Other
            Cossa employees remain
            visible above and should
            receive specialist workflows
            instead of being forced into
            unrelated work.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {GROWTH_WORKFLOW.map(
            (
              step,
              index,
            ) => {
              const Icon =
                step.icon;

              const employee =
                employeesByKey.get(
                  step.key,
                );

              const active =
                employee?.status ===
                "active";

              return (
                <div
                  key={
                    step.key
                  }
                  className="relative rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  {index <
                  GROWTH_WORKFLOW.length -
                    1 ? (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                  ) : null}

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="mt-3 text-sm font-semibold">
                    {
                      step.label
                    }
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      step.description
                    }
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest">
                    <CheckCircle2
                      className={
                        active
                          ? "h-3 w-3 text-success"
                          : employee
                            ? "h-3 w-3 text-warning"
                            : "h-3 w-3 text-muted-foreground"
                      }
                    />

                    <span
                      className={
                        active
                          ? "text-success"
                          : employee
                            ? "text-warning"
                            : "text-muted-foreground"
                      }
                    >
                      {active
                        ? "Installed — active"
                        : employee
                          ? `Installed — ${employee.status}`
                          : "Not installed"}
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* CONTROLLED EXECUTION */}
      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Controlled workforce execution
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Run one reviewable stage
              at a time
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Each stage records the
              employee, provider,
              mission input and
              reviewable output. No
              external action is enabled
              by this workflow.
            </p>
          </div>

          {coordinationMissions.length >
          0 ? (
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Coordination mission

              <select
                value={
                  selectedMission?.id ??
                  ""
                }
                onChange={(event) =>
                  setSelectedMissionId(
                    event.target.value ||
                      null,
                  )
                }
                className="min-w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              >
                {coordinationMissions.map(
                  (mission) => (
                    <option
                      key={
                        mission.id
                      }
                      value={
                        mission.id
                      }
                    >
                      {mission.objective.slice(
                        0,
                        100,
                      )}
                    </option>
                  ),
                )}
              </select>
            </label>
          ) : null}
        </div>

        {!selectedMission ? (
          <p className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            Create a controlled
            coordination plan first.
            Nothing runs until you
            explicitly start a stage.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Next stage
                  </p>

                  <h3 className="mt-1 text-sm font-semibold">
                    {nextEmployee
                      ? `${nextEmployee.name} — ${nextEmployee.title}`
                      : "No pending stage"}
                  </h3>
                </div>

                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                  {
                    selectedMission.status
                  }
                </span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {nextHandoff?.reason ??
                  "All recorded stages are complete. Review the saved final briefing and any owner review request below."}
              </p>

              {nextEmployee &&
              nextEmployee.status !==
                "active" ? (
                <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  {
                    nextEmployee.name
                  }{" "}
                  is currently{" "}
                  {formatStatus(
                    nextEmployee.status,
                  )}
                  . The stage cannot run
                  until the employee is
                  active.
                </p>
              ) : null}

              <Button
                type="button"
                onClick={() =>
                  runNextStageMutation.mutate()
                }
                disabled={
                  !nextHandoff ||
                  !nextEmployee ||
                  nextEmployee.status !==
                    "active" ||
                  runNextStageMutation.isPending ||
                  selectedMission.status ===
                    "awaiting_approval" ||
                  selectedMission.status ===
                    "completed"
                }
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                {runNextStageMutation.isPending ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}

                {runNextStageMutation.isPending
                  ? "Running controlled stage…"
                  : "Run next controlled stage"}
              </Button>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                If the configured AI
                provider is unavailable,
                out of credit or returns
                no usable output, the
                failure is recorded and
                the handoff returns to
                pending.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Saved reviewable outputs
                  </p>

                  <h3 className="text-sm font-semibold">
                    {
                      reviewableOutputs.length
                    }{" "}
                    saved for this mission
                  </h3>
                </div>
              </div>

              {reviewableOutputs.length ===
              0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No worker draft has
                  been saved yet.
                </p>
              ) : (
                <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {reviewableOutputs.map(
                    ({
                      run,
                      content,
                    }) => {
                      const worker =
                        employees.find(
                          (employee) =>
                            employee.id ===
                            run.employee_id,
                        );

                      return (
                        <article
                          key={
                            run.id
                          }
                          className="rounded-lg border border-border/60 bg-background/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-medium">
                                {worker?.name ??
                                  "Recorded worker"}
                              </span>

                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {run.model_provider ??
                                  "Provider not recorded"}
                                {run.model_name
                                  ? ` · ${run.model_name}`
                                  : ""}
                              </p>
                            </div>

                            <span className="text-[10px] uppercase tracking-widest text-success">
                              reviewable draft
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {
                              content
                            }
                          </p>
                        </article>
                      );
                    },
                  )}
                </div>
              )}

              {selectedMissionRuns.some(
                (run) =>
                  run.status ===
                  "failed",
              ) ? (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="flex items-start gap-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    This mission contains
                    one or more recorded
                    failed runs. A later
                    successful run does
                    not erase the audit
                    history.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* CREATE MISSION + OWNER CONTROL */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />

            <div>
              <h2 className="font-display text-xl font-semibold">
                Create a controlled
                Growth coordination
                plan
              </h2>

              <p className="text-sm text-muted-foreground">
                This creates an
                internal mission and
                seven pending handoffs.
                It does not publish,
                contact anyone or spend
                money.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Growth objective

              <textarea
                value={
                  objective
                }
                onChange={(event) =>
                  setObjective(
                    event.target.value,
                  )
                }
                rows={4}
                className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Target market

                <input
                  value={
                    targetMarket
                  }
                  onChange={(event) =>
                    setTargetMarket(
                      event.target.value,
                    )
                  }
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Target location

                <input
                  value={
                    targetLocation
                  }
                  onChange={(event) =>
                    setTargetLocation(
                      event.target.value,
                    )
                  }
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>
            </div>

            {!canCreateCoordination ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                The Growth coordination
                chain needs all{" "}
                {
                  GROWTH_WORKFLOW.length
                }{" "}
                workflow employees to
                exist and be active.
                Currently{" "}
                {
                  activeControlledWorkflowEmployees.length
                }{" "}
                of{" "}
                {
                  GROWTH_WORKFLOW.length
                }{" "}
                are active. This does
                not mean other Cossa AI
                employees are missing.
              </p>
            ) : null}

            <Button
              type="button"
              onClick={() =>
                coordinationMutation.mutate({
                  objective,

                  target_market:
                    targetMarket,

                  target_location:
                    targetLocation,
                })
              }
              disabled={
                !canCreateCoordination ||
                coordinationMutation.isPending
              }
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />

              {coordinationMutation.isPending
                ? "Creating controlled plan…"
                : "Create controlled coordination plan"}
            </Button>
          </div>
        </section>

        <section className="glass-card flex flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Owner control
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            External authority stays
            with you
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Cossa AI employees may
            analyse authorised
            information, prepare
            internal work and coordinate
            controlled missions.
            Customer communication,
            publishing, spending,
            account changes and external
            commitments remain governed
            separately.
          </p>

          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              No automatic social
              publishing or customer
              messaging from this
              screen.
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              No automatic advertising
              spend, bid change or
              account modification.
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              Missing data, integrations
              and evidence must be
              reported instead of
              invented.
            </div>
          </div>

          <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link to="/integrations">
                <Send className="mr-1.5 h-4 w-4" />

                Review connections
              </Link>
            </Button>

            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/ai/ceo">
                <BrainCircuit className="mr-1.5 h-4 w-4" />

                Open AI CEO briefing
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* SAVED MISSIONS */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Recorded coordination
              plans
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Real mission records
            </h2>
          </div>

          <span className="text-xs text-muted-foreground">
            {
              coordinationMissions.length
            }{" "}
            saved
          </span>
        </div>

        {coordinationMissions.length ===
        0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No Growth coordination plan
            has been saved yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {coordinationMissions
              .slice(0, 6)
              .map((mission) => {
                const missionHandoffs =
                  handoffs.filter(
                    (handoff) =>
                      handoff.mission_id ===
                      mission.id,
                  );

                const missionRuns =
                  runs.filter(
                    (run) =>
                      run.mission_id ===
                      mission.id,
                  );

                const reviewApproval =
                  workforceReviewApprovals.find(
                    (approval) =>
                      approval.mission_id ===
                      mission.id,
                  );

                const completedHandoffs =
                  missionHandoffs.filter(
                    (handoff) =>
                      handoff.status ===
                      "completed",
                  ).length;

                return (
                  <article
                    key={
                      mission.id
                    }
                    className="rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-primary">
                        {formatStatus(
                          mission.status,
                        )}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {
                          completedHandoffs
                        }
                        /
                        {
                          missionHandoffs.length
                        }{" "}
                        stages complete
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-semibold">
                      {
                        mission.objective
                      }
                    </h3>

                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {
                        mission.instruction
                      }
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <MiniMetric
                        label="Handoffs"
                        value={
                          missionHandoffs.length
                        }
                      />

                      <MiniMetric
                        label="Runs"
                        value={
                          missionRuns.length
                        }
                      />

                      <MiniMetric
                        label="Failed"
                        value={
                          missionRuns.filter(
                            (run) =>
                              run.status ===
                              "failed",
                          ).length
                        }
                        warning={
                          missionRuns.some(
                            (run) =>
                              run.status ===
                              "failed",
                          )
                        }
                      />
                    </div>

                    {reviewApproval ? (
                      <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                        <p className="text-xs font-medium text-foreground">
                          Owner review
                          required
                        </p>

                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Approval closes
                          only this internal
                          briefing. It does
                          not approve
                          publishing,
                          customer contact,
                          account changes or
                          spending.
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              reviewMutation.isPending
                            }
                            onClick={() => {
                              if (
                                confirm(
                                  "Approve this internal workforce briefing? External actions will remain disabled.",
                                )
                              ) {
                                reviewMutation.mutate({
                                  approvalId:
                                    reviewApproval.id,

                                  decision:
                                    "approved",
                                });
                              }
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Approve briefing
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              reviewMutation.isPending
                            }
                            onClick={() =>
                              reviewMutation.mutate({
                                approvalId:
                                  reviewApproval.id,

                                decision:
                                  "rejected",
                              })
                            }
                            className="border-warning/40 text-warning hover:bg-warning/10"
                          >
                            Request changes
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
          </div>
        )}
      </section>

      {/* QUEUE SUMMARY */}
      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce queue
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Current coordination
              position
            </h2>
          </div>

          <div className="text-xs text-muted-foreground">
            {
              pendingHandoffs.length
            }{" "}
            controlled Growth handoffs
            pending
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI HELPERS                                                                 */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div
        className={
          warning
            ? "mt-2 font-display text-2xl font-semibold text-warning"
            : "mt-2 font-display text-2xl font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-2 text-center">
      <div
        className={
          warning
            ? "text-sm font-semibold text-warning"
            : "text-sm font-semibold"
        }
      >
        {value}
      </div>

      <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function EmployeeDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function OperationalBadge({
  state,
  label,
}: {
  state: OperationalState;
  label: string;
}) {
  const className =
    state === "working"
      ? "border-success/35 bg-success/10 text-success"
      : state === "attention"
        ? "border-destructive/35 bg-destructive/10 text-destructive"
        : state === "approval"
          ? "border-warning/35 bg-warning/10 text-warning"
          : state === "waiting"
            ? "border-primary/35 bg-primary/10 text-primary"
            : state === "inactive"
              ? "border-border bg-secondary/50 text-muted-foreground"
              : "border-border bg-secondary/40 text-muted-foreground";

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}