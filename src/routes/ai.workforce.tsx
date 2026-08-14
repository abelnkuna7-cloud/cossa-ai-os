import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
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

const GROWTH_MISSION_PREFIX =
  "Growth coordination:";

const WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Check website",
    description:
      "Runs the approved read-only Cossa homepage check and flags verified issues.",
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
      "Prepares reviewable content drafts; it never publishes them.",
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
      "Uses authorised account data only and labels missing data.",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Review ads",
    description:
      "Prepares controlled paid-media recommendations; it cannot spend.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO briefing",
    description:
      "Synthesises verified worker outputs for the Cossa owner's decision.",
    icon: BrainCircuit,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* GENERIC RECORD HELPERS                                                     */
/* -------------------------------------------------------------------------- */

function recordValue(
  value: unknown,
  key: string,
): unknown {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  return (
    value as Record<
      string,
      unknown
    >
  )[key];
}

function recordString(
  value: unknown,
  key: string,
): string | null {
  const result =
    recordValue(
      value,
      key,
    );

  return typeof result ===
      "string" &&
    result.trim()
    ? result
    : null;
}

function recordBoolean(
  value: unknown,
  key: string,
): boolean | null {
  const result =
    recordValue(
      value,
      key,
    );

  return typeof result ===
    "boolean"
    ? result
    : null;
}

/* -------------------------------------------------------------------------- */
/* DISPLAY HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function formatStatus(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "No activity recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
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
  failedCount: number;
  approvalCount: number;
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
  approvals: Array<Record<string, unknown>>;
}): EmployeeOperationalView {
  const status =
    recordString(
      employee,
      "status",
    ) ?? "unknown";

  const employeeHandoffs =
    handoffs.filter(
      (handoff) =>
        handoff.to_employee_id ===
        employee.id,
    );

  const employeeMissionIds =
    new Set(
      employeeHandoffs.map(
        (handoff) =>
          handoff.mission_id,
      ),
    );

  const employeeRuns =
    runs.filter((run) =>
      employeeMissionIds.has(
        run.mission_id,
      ),
    );

  const employeeApprovals =
    approvals.filter(
      (approval) => {
        const missionId =
          typeof approval.mission_id ===
          "string"
            ? approval.mission_id
            : null;

        return (
          missionId !== null &&
          employeeMissionIds.has(
            missionId,
          )
        );
      },
    );

  const pendingHandoffs =
    employeeHandoffs.filter(
      (handoff) =>
        handoff.status ===
        "pending",
    );

  const activeHandoffs =
    employeeHandoffs.filter(
      (handoff) =>
        [
          "running",
          "in_progress",
          "processing",
          "working",
        ].includes(
          handoff.status,
        ),
    );

  const failedRuns =
    employeeRuns.filter(
      (run) =>
        run.status === "failed",
    );

  const activeRuns =
    employeeRuns.filter(
      (run) =>
        [
          "running",
          "processing",
          "in_progress",
        ].includes(
          run.status,
        ),
    );

  const latestHandoff =
    [...employeeHandoffs].sort(
      (left, right) =>
        right.created_at.localeCompare(
          left.created_at,
        ),
    )[0];

  const latestRun =
    [...employeeRuns].sort(
      (left, right) => {
        const leftTime =
          recordString(
            left,
            "updated_at",
          ) ??
          recordString(
            left,
            "created_at",
          ) ??
          "";

        const rightTime =
          recordString(
            right,
            "updated_at",
          ) ??
          recordString(
            right,
            "created_at",
          ) ??
          "";

        return rightTime.localeCompare(
          leftTime,
        );
      },
    )[0];

  const latestActivity =
    recordString(
      latestRun,
      "updated_at",
    ) ??
    recordString(
      latestRun,
      "created_at",
    ) ??
    latestHandoff?.created_at ??
    null;

  const currentTask =
    activeHandoffs[0]?.reason ??
    pendingHandoffs[0]?.reason ??
    latestHandoff?.reason ??
    "No task currently assigned";

  if (
    status !== "active"
  ) {
    return {
      state: "inactive",
      label:
        `${formatStatus(
          status,
        )} — not operational`,
      detail:
        "The employee profile exists but is not currently marked active.",
      currentTask,
      lastActivity:
        latestActivity,
      assignedCount:
        employeeHandoffs.length,
      pendingCount:
        pendingHandoffs.length,
      failedCount:
        failedRuns.length,
      approvalCount:
        employeeApprovals.length,
    };
  }

  if (
    failedRuns.length > 0
  ) {
    return {
      state: "attention",
      label:
        "Active — Needs attention",
      detail:
        "A recorded workforce run failed. Review the failure before retrying.",
      currentTask,
      lastActivity:
        latestActivity,
      assignedCount:
        employeeHandoffs.length,
      pendingCount:
        pendingHandoffs.length,
      failedCount:
        failedRuns.length,
      approvalCount:
        employeeApprovals.length,
    };
  }

  if (
    employeeApprovals.length >
    0
  ) {
    return {
      state: "approval",
      label:
        "Active — Approval required",
      detail:
        "Recorded work is waiting for owner review or approval.",
      currentTask,
      lastActivity:
        latestActivity,
      assignedCount:
        employeeHandoffs.length,
      pendingCount:
        pendingHandoffs.length,
      failedCount:
        failedRuns.length,
      approvalCount:
        employeeApprovals.length,
    };
  }

  if (
    activeRuns.length > 0 ||
    activeHandoffs.length > 0
  ) {
    return {
      state: "working",
      label:
        "Active — Working",
      detail:
        "A real workforce run or active handoff is currently recorded.",
      currentTask,
      lastActivity:
        latestActivity,
      assignedCount:
        employeeHandoffs.length,
      pendingCount:
        pendingHandoffs.length,
      failedCount:
        failedRuns.length,
      approvalCount:
        employeeApprovals.length,
    };
  }

  if (
    pendingHandoffs.length > 0
  ) {
    return {
      state: "waiting",
      label:
        "Active — Waiting for execution",
      detail:
        "A real task is assigned but has not started yet.",
      currentTask,
      lastActivity:
        latestActivity,
      assignedCount:
        employeeHandoffs.length,
      pendingCount:
        pendingHandoffs.length,
      failedCount:
        failedRuns.length,
      approvalCount:
        employeeApprovals.length,
    };
  }

  return {
    state: "idle",
    label:
      "Active — Idle",
    detail:
      employeeHandoffs.length >
      0
        ? "No task is currently pending or running."
        : "No real task has been assigned to this employee yet.",
    currentTask:
      employeeHandoffs.length >
      0
        ? currentTask
        : "No task currently assigned",
    lastActivity:
      latestActivity,
    assignedCount:
      employeeHandoffs.length,
    pendingCount:
      pendingHandoffs.length,
    failedCount:
      failedRuns.length,
    approvalCount:
      employeeApprovals.length,
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
    typeof run.output !==
      "object"
  ) {
    return null;
  }

  const content =
    (
      run.output as {
        content?: unknown;
      }
    ).content;

  return typeof content ===
      "string" &&
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
    `HTTP status: ${report.http_status ?? "not available"}`,
    `Response time: ${report.response_time_ms ?? "not available"} ms`,
    `Page title: ${report.page_title ?? "not detected"}`,
    `Noindex detected: ${report.noindex_detected ? "yes" : "no"}`,
    `Reported issues: ${
      report.issues.length > 0
        ? report.issues.join(
            "; ",
          )
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
            (
              output,
              index,
            ) =>
              `Earlier worker draft ${index + 1}:\n${output}`,
          )
          .join(
            "\n\n",
          )
      : "No earlier workforce output has been recorded.";

  return [
    `You are ${employee.title} in the controlled Cossa AI Workforce.`,

    "Create one internal, reviewable draft for the assigned handoff. External actions are disabled.",

    "Use only verified Cossa Knowledge Base information and authorised Cossa operational records supplied by the Cossa AI route. If information is unavailable, explicitly label it as missing; do not guess, fabricate customer results, claim account access, or name unverified competitors.",

    "Do not publish content, send messages, contact prospects, spend money, change budgets, alter accounts, connect providers, make legal or financial commitments, or claim that any of those actions occurred.",

    "Use these headings exactly: Verified inputs; Missing information or connections; Reviewable draft; Owner decisions required; External actions disabled.",

    `Mission objective: ${mission.objective}`,

    `Mission instruction: ${mission.instruction}`,

    `Target market: ${mission.target_market || "Not specified"}`,

    `Target location: ${mission.target_location || "Not specified"}`,

    `Assigned handoff: ${handoff.reason}`,

    `Recorded handoff context: ${JSON.stringify(
      handoff.context,
    )}`,

    authorisedEvidence.length >
    0
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
  ] =
    useState(
      "Build a controlled social media and paid-media growth plan for Cossa Nexus Holdings.",
    );

  const [
    targetMarket,
    setTargetMarket,
  ] =
    useState(
      "South Africa",
    );

  const [
    targetLocation,
    setTargetLocation,
  ] =
    useState(
      "Gauteng",
    );

  const [
    selectedMissionId,
    setSelectedMissionId,
  ] =
    useState<
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
        queryClient.invalidateQueries(
          {
            queryKey: [
              "ai-workforce-employees",
            ],
          },
        ),

        queryClient.invalidateQueries(
          {
            queryKey: [
              "ai-workforce-missions",
            ],
          },
        ),

        queryClient.invalidateQueries(
          {
            queryKey: [
              "ai-workforce-handoffs",
            ],
          },
        ),

        queryClient.invalidateQueries(
          {
            queryKey: [
              "ai-workforce-runs",
            ],
          },
        ),

        queryClient.invalidateQueries(
          {
            queryKey: [
              "ai-workforce-approvals",
            ],
          },
        ),
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
        async (
          employees,
        ) => {
          await refreshWorkforce();

          toast.success(
            "Cossa growth workforce is ready",
            {
              description:
                `${employees.length} workforce profiles were checked or installed. Existing employee records were preserved.`,
            },
          );
        },

      onError: (
        error,
      ) => {
        toast.error(
          "Workforce setup could not be completed",
          {
            description:
              error instanceof
              Error
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
          await refreshWorkforce();

          toast.success(
            "Coordination plan recorded",
            {
              description:
                `${mission.title} has ${handoffs.length} controlled handoff stages. No external action was started.`,
            },
          );
        },

      onError: (
        error,
      ) => {
        toast.error(
          "Coordination plan could not be created",
          {
            description:
              error instanceof
              Error
                ? error.message
                : "Unknown mission error.",
          },
        );
      },
    });

  /* ------------------------------------------------------------------------ */
  /* DATA MAPS                                                                */
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
            (
              employee,
            ) => [
              employee.employee_key,
              employee,
            ],
          ),
        ),
      [employees],
    );

  /* ------------------------------------------------------------------------ */
  /* EMPLOYEE OPERATIONAL STATE                                               */
  /* ------------------------------------------------------------------------ */

  const employeeOperationalViews =
    useMemo(
      () =>
        employees.map(
          (
            employee,
          ) => ({
            employee,

            operational:
              employeeOperationalView(
                {
                  employee,
                  handoffs,
                  runs,
                  approvals:
                    approvals as unknown as Array<
                      Record<
                        string,
                        unknown
                      >
                    >,
                },
              ),
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
          item.operational
            .state
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

  /* ------------------------------------------------------------------------ */
  /* EXISTING CONTROLLED WORKFLOW                                             */
  /* ------------------------------------------------------------------------ */

  const installedGrowthEmployees =
    COSSA_GROWTH_WORKFORCE.filter(
      (
        profile,
      ) =>
        employeesByKey.has(
          profile.employee_key,
        ),
    );

  const coordinationMissions =
    missions.filter(
      (
        mission,
      ) =>
        mission.title.startsWith(
          GROWTH_MISSION_PREFIX,
        ),
    );

  const coordinationMissionIds =
    new Set(
      coordinationMissions.map(
        (
          mission,
        ) =>
          mission.id,
      ),
    );

  const pendingHandoffs =
    handoffs.filter(
      (
        handoff,
      ) =>
        handoff.status ===
          "pending" &&
        coordinationMissionIds.has(
          handoff.mission_id,
        ),
    );

  const selectedMission =
    coordinationMissions.find(
      (
        mission,
      ) =>
        mission.id ===
        selectedMissionId,
    ) ??
    coordinationMissions[0] ??
    null;

  const selectedMissionHandoffs =
    selectedMission
      ? handoffs
          .filter(
            (
              handoff,
            ) =>
              handoff.mission_id ===
              selectedMission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.created_at.localeCompare(
                right.created_at,
              ),
          )
      : [];

  const nextHandoff =
    selectedMissionHandoffs.find(
      (
        handoff,
      ) =>
        handoff.status ===
        "pending",
    ) ?? null;

  const nextEmployee =
    nextHandoff
      ? employees.find(
          (
            employee,
          ) =>
            employee.id ===
            nextHandoff.to_employee_id,
        ) ??
        null
      : null;

  const selectedMissionRuns =
    selectedMission
      ? runs.filter(
          (
            run,
          ) =>
            run.mission_id ===
            selectedMission.id,
        )
      : [];

  const reviewableOutputs =
    selectedMissionRuns
      .map(
        (
          run,
        ) => ({
          run,

          content:
            reviewableOutputContent(
              run,
            ),
        }),
      )
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
      (
        approval,
      ) =>
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

  const canCreateCoordination =
    installedGrowthEmployees.length ===
      COSSA_GROWTH_WORKFORCE.length &&
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

          const priorOutputs =
            reviewableOutputs.map(
              (
                item,
              ) =>
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
            await startControlledWorkforceRun(
              {
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
              },
            );

          try {
            const content =
              await streamChat(
                [
                  {
                    role:
                      "user",

                    content:
                      controlledStagePrompt(
                        {
                          mission:
                            selectedMission,

                          handoff:
                            nextHandoff,

                          employee:
                            nextEmployee,

                          priorOutputs,

                          authorisedEvidence,
                        },
                      ),
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

            return completeControlledWorkforceRun(
              {
                run,

                handoff:
                  nextHandoff,

                employee:
                  nextEmployee,

                content,
              },
            );
          } catch (
            error
          ) {
            const message =
              error instanceof
              Error
                ? error.message
                : "The workforce provider failed to return an output.";

            try {
              await failControlledWorkforceRun(
                {
                  run,

                  handoff:
                    nextHandoff,

                  errorMessage:
                    message,
                },
              );
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
                  ? "The AI CEO briefing is saved for your internal review. No external action was enabled."
                  : "The next controlled handoff is now ready. No external action was enabled.",
            },
          );
        },

      onError: (
        error,
      ) => {
        toast.error(
          "Controlled workforce stage could not run",
          {
            description:
              error instanceof
              Error
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
                "This decision affects only the internal workforce mission. It does not authorise publication, messaging, account changes or advertising spend.",
            },
          );
        },

      onError: (
        error,
      ) => {
        toast.error(
          "Owner review could not be recorded",
          {
            description:
              error instanceof
              Error
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
              Central workforce
              command centre for Cossa
              Nexus Holdings. Employee
              status is based on real
              workforce records,
              handoffs, runs and
              approvals. An active
              profile is never
              automatically treated as
              proof that work is being
              performed.
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

      {/* CEO WORKFORCE METRICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Total employees"
          value={String(
            employees.length,
          )}
        />

        <Metric
          label="Working"
          value={String(
            workforceCounts.working,
          )}
        />

        <Metric
          label="Idle"
          value={String(
            workforceCounts.idle,
          )}
        />

        <Metric
          label="Waiting"
          value={String(
            workforceCounts.waiting,
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
            Every profile returned
            from the live workforce
            database appears here.
            Statuses are derived from
            recorded work and are not
            fabricated.
          </p>
        </div>

        {employeesQuery.isLoading ? (
          <div className="mt-5 rounded-xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
            Loading workforce
            records…
          </div>
        ) : employees.length ===
          0 ? (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
            No AI employee records
            were returned from the
            workforce database.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employeeOperationalViews.map(
              ({
                employee,
                operational,
              }) => {
                const department =
                  recordString(
                    employee,
                    "department",
                  ) ??
                  "Department not recorded";

                const businessUnit =
                  recordString(
                    employee,
                    "business_unit_name",
                  ) ??
                  recordString(
                    employee,
                    "business_unit",
                  ) ??
                  (recordString(
                    employee,
                    "business_unit_id",
                  )
                    ? "Assigned business unit"
                    : "Group-wide");

                const employeeStatus =
                  recordString(
                    employee,
                    "status",
                  ) ??
                  "unknown";

                const requiresApproval =
                  recordBoolean(
                    employee,
                    "requires_approval_by_default",
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
                        value={
                          department
                        }
                      />

                      <EmployeeDetail
                        label="Business unit"
                        value={
                          businessUnit
                        }
                      />

                      <EmployeeDetail
                        label="Profile status"
                        value={
                          formatStatus(
                            employeeStatus,
                          )
                        }
                      />

                      <EmployeeDetail
                        label="Approval control"
                        value={
                          requiresApproval ===
                          false
                            ? "Not required by default"
                            : "Owner approval required"
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

                    <div className="mt-4 grid grid-cols-3 gap-2">
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
                        label="Failed"
                        value={
                          operational.failedCount
                        }
                        warning={
                          operational.failedCount >
                          0
                        }
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
              Growth workers support
              one owner briefing
            </h2>
          </div>

          <p className="max-w-xl text-sm text-muted-foreground">
            This seven-stage workflow
            remains intentionally
            controlled. Other Cossa AI
            employees are visible in
            the Workforce Command
            Centre above and can be
            connected to additional
            workflows separately.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {WORKFLOW.map(
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

              return (
                <div
                  key={
                    step.key
                  }
                  className="relative rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  {index <
                  WORKFLOW.length -
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
                        employee
                          ? "h-3 w-3 text-success"
                          : "h-3 w-3 text-muted-foreground"
                      }
                    />

                    <span
                      className={
                        employee
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {employee
                        ? "Installed — controlled"
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
              Each stage saves its
              input and draft to the
              selected mission and
              leaves every external
              action disabled. Review
              the saved output before
              continuing.
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
                onChange={(
                  event,
                ) =>
                  setSelectedMissionId(
                    event.target
                      .value ||
                      null,
                  )
                }
                className="min-w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              >
                {coordinationMissions.map(
                  (
                    mission,
                  ) => (
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
            Nothing will run until you
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

                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {
                    selectedMission.status
                  }
                </span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {nextHandoff?.reason ??
                  "All recorded stages are complete. Review the saved final briefing and any owner review request below."}
              </p>

              <Button
                type="button"
                onClick={() =>
                  runNextStageMutation.mutate()
                }
                disabled={
                  !nextHandoff ||
                  !nextEmployee ||
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
                  ? "Saving controlled draft…"
                  : "Run next controlled stage"}
              </Button>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                If the configured AI
                provider is unavailable
                or out of credit, the
                failure is recorded.
                No stage silently
                pretends it succeeded.
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
                    }) => (
                      <article
                        key={
                          run.id
                        }
                        className="rounded-lg border border-border/60 bg-background/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {run.model_provider ===
                            "groq"
                              ? "Economy Groq"
                              : run.model_provider ||
                                "Recorded provider"}
                          </span>

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
                    ),
                  )}
                </div>
              )}

              {selectedMissionRuns.some(
                (
                  run,
                ) =>
                  run.status ===
                  "failed",
              ) ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                  A previous stage
                  failed. Its reason is
                  retained in the
                  mission run record.
                </p>
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
                growth coordination
                plan
              </h2>

              <p className="text-sm text-muted-foreground">
                This saves an internal
                mission and pending
                handoff stages. It does
                not make any external
                change.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              What is the growth
              objective?

              <textarea
                value={
                  objective
                }
                onChange={(
                  event,
                ) =>
                  setObjective(
                    event.target
                      .value,
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
                  onChange={(
                    event,
                  ) =>
                    setTargetMarket(
                      event.target
                        .value,
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
                  onChange={(
                    event,
                  ) =>
                    setTargetLocation(
                      event.target
                        .value,
                    )
                  }
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>
            </div>

            {!canCreateCoordination ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                The controlled Growth
                workflow still requires
                all{" "}
                {
                  COSSA_GROWTH_WORKFORCE.length
                }{" "}
                configured workflow
                profiles. This does not
                mean other Cossa AI
                employees are missing
                from the workforce.
              </p>
            ) : null}

            <Button
              type="button"
              onClick={() =>
                coordinationMutation.mutate(
                  {
                    objective,

                    target_market:
                      targetMarket,

                    target_location:
                      targetLocation,
                  },
                )
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
            Your final briefing stays
            with you
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            AI employees may analyse,
            prepare and coordinate
            internal work. Customer
            communication, account
            connections, spending and
            external commitments remain
            controlled.
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
              spend or account changes.
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              Missing sources and
              connections are reported
              rather than invented.
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
            No coordination plan has
            been saved yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {coordinationMissions
              .slice(
                0,
                6,
              )
              .map(
                (
                  mission,
                ) => {
                  const handoffCount =
                    handoffs.filter(
                      (
                        handoff,
                      ) =>
                        handoff.mission_id ===
                        mission.id,
                    ).length;

                  const reviewApproval =
                    workforceReviewApprovals.find(
                      (
                        approval,
                      ) =>
                        approval.mission_id ===
                        mission.id,
                    );

                  return (
                    <article
                      key={
                        mission.id
                      }
                      className="rounded-xl border border-border/60 bg-card/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-primary">
                          {
                            mission.status
                          }
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {
                            handoffCount
                          }{" "}
                          handoffs
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

                      {reviewApproval ? (
                        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                          <p className="text-xs font-medium text-foreground">
                            Owner review
                            required
                          </p>

                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Approval closes
                            only this
                            internal
                            briefing. It
                            does not approve
                            publishing,
                            customer contact
                            or spending.
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
                                  reviewMutation.mutate(
                                    {
                                      approvalId:
                                        reviewApproval.id,

                                      decision:
                                        "approved",
                                    },
                                  );
                                }
                              }}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Approve
                              internal
                              briefing
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                reviewMutation.isPending
                              }
                              onClick={() =>
                                reviewMutation.mutate(
                                  {
                                    approvalId:
                                      reviewApproval.id,

                                    decision:
                                      "rejected",
                                  },
                                )
                              }
                              className="border-warning/40 text-warning hover:bg-warning/10"
                            >
                              Request
                              changes
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                },
              )}
          </div>
        )}
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
      : state ===
          "attention"
        ? "border-destructive/35 bg-destructive/10 text-destructive"
        : state ===
            "approval"
          ? "border-warning/35 bg-warning/10 text-warning"
          : state ===
              "waiting"
            ? "border-primary/35 bg-primary/10 text-primary"
            : state ===
                "inactive"
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