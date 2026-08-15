import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Code2,
  FileCheck2,
  FilePenLine,
  Globe2,
  ImageIcon,
  KeyRound,
  Megaphone,
  PanelTop,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Store,
  UsersRound,
  Workflow,
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
          "Cossa Nexus Holdings AI workforce command centre for coordinated internal execution, specialist workforce readiness, employee handoffs and owner-controlled high-risk actions.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const GROWTH_MISSION_PREFIX =
  "Growth coordination:";

const DEFAULT_WORKFORCE_PROVIDER =
  "groq" as const;

const DEFAULT_WORKFORCE_MODEL =
  "llama-3.3-70b-versatile";

/**
 * IMPORTANT
 *
 * This array represents the workflow that createGrowthCoordinationMission()
 * currently creates in workforce-data.ts.
 *
 * Do not add a worker here as an executable stage until workforce-data.ts
 * creates a real handoff for that employee.
 */
const EXECUTABLE_GROWTH_WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Website intelligence",
    description:
      "Checks authorised Cossa web properties and passes verified observations into the growth system.",
    icon: Globe2,
  },
  {
    key: "social-strategy-planner",
    label: "Social strategy",
    description:
      "Builds channel strategy, audience direction, campaign angles and marketing priorities from verified information.",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Content production",
    description:
      "Produces accurate marketing, educational, awareness, pain-point and conversion-focused written content.",
    icon: FilePenLine,
  },
  {
    key: "social-schedule-coordinator",
    label: "Content coordination",
    description:
      "Organises approved content into channel schedules and hands execution requirements forward.",
    icon: PanelTop,
  },
  {
    key: "account-growth-analyst",
    label: "Growth analysis",
    description:
      "Analyses authorised account evidence and identifies growth, audience and conversion opportunities.",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Paid media",
    description:
      "Prepares advertising strategy while keeping spending, budget and campaign-launch authority owner-controlled.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO",
    description:
      "Synthesises workforce outputs, resolves ordinary internal questions and escalates genuine owner decisions.",
    icon: BrainCircuit,
  },
] as const;

const EXECUTABLE_GROWTH_WORKFLOW_KEYS =
  new Set<string>(
    EXECUTABLE_GROWTH_WORKFLOW.map(
      (step) => step.key,
    ),
  );

/**
 * Target Growth operating model.
 *
 * These two additional workers are required for the upgraded social operating
 * system, but they should only become executable workflow stages after the
 * workforce-data.ts handoff creator includes them.
 */
const TARGET_SOCIAL_WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Website intelligence",
    icon: Globe2,
  },
  {
    key: "social-strategy-planner",
    label: "Social strategy",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Content writer",
    icon: FilePenLine,
  },
  {
    key: "creative-media-producer",
    label: "Creative media",
    icon: ImageIcon,
  },
  {
    key: "social-schedule-coordinator",
    label: "Schedule",
    icon: PanelTop,
  },
  {
    key: "social-media-manager",
    label: "Social manager",
    icon: Megaphone,
  },
  {
    key: "account-growth-analyst",
    label: "Growth analysis",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Paid media",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO",
    icon: BrainCircuit,
  },
] as const;

/**
 * Required specialist roles across the wider Cossa operating system.
 *
 * A role may appear here before its live profile exists. That is intentional:
 * missing operating capability should be visible rather than silently hidden.
 */
const BUSINESS_OPERATING_ROLES = [
  {
    business: "Growth & Social",
    icon: Megaphone,

    roles: [
      {
        key: "social-strategy-planner",
        name: "Social Strategy Planner",
        responsibility:
          "Channel strategy, audience planning, marketing angles and campaign direction.",
      },
      {
        key: "content-writer",
        name: "Content Writer",
        responsibility:
          "Marketing copy, educational content, conversion copy and campaign content.",
      },
      {
        key: "creative-media-producer",
        name: "Creative Media Producer",
        responsibility:
          "Images, promotional graphics, brochures, campaign creatives and social visual assets.",
      },
      {
        key: "social-schedule-coordinator",
        name: "Social Schedule Coordinator",
        responsibility:
          "Content calendars, timing, channel coordination and publishing preparation.",
      },
      {
        key: "social-media-manager",
        name: "Social Media Manager",
        responsibility:
          "Daily social channel management, publishing coordination, content continuity and channel health.",
      },
      {
        key: "account-growth-analyst",
        name: "Account Growth Analyst",
        responsibility:
          "Performance analysis, audience growth, conversion opportunities and account improvement.",
      },
      {
        key: "paid-media-specialist",
        name: "Paid Media Specialist",
        responsibility:
          "Advertising planning, creative direction, targeting and measurement without unauthorised spend.",
      },
    ],
  },

  {
    business: "Cossa Store",
    icon: Store,

    roles: [
      {
        key: "store-operations-manager",
        name: "Store Operations Manager",
        responsibility:
          "Catalogue health, product status, merchandising, store quality and commercial workflow coordination.",
      },
      {
        key: "product-intelligence-analyst",
        name: "Product Intelligence Analyst",
        responsibility:
          "Product trends, demand signals, pricing research, product gaps and merchandising intelligence.",
      },
      {
        key: "supplier-sourcing-analyst",
        name: "Supplier Sourcing Analyst",
        responsibility:
          "Legitimate supplier discovery, evidence collection, supplier comparison and sourcing preparation.",
      },
      {
        key: "broker-deal-intelligence-analyst",
        name: "Broker & Deal Intelligence Analyst",
        responsibility:
          "Commercial opportunities, partners, distributors, suppliers and legitimate deal intelligence.",
      },
      {
        key: "creative-media-producer",
        name: "Creative Media Producer",
        responsibility:
          "Product visuals, catalogue creatives, promotional graphics, brochures and social-commerce assets.",
      },
      {
        key: "social-media-manager",
        name: "Social Media Manager",
        responsibility:
          "Store social publishing coordination, product campaigns and channel activity.",
      },
    ],
  },

  {
    business: "Cossa Tech",
    icon: Code2,

    roles: [
      {
        key: "tech-solutions-specialist",
        name: "Tech Solutions Specialist",
        responsibility:
          "Technology solution planning, implementation support and technical service delivery.",
      },
      {
        key: "website-delivery-specialist",
        name: "Website Delivery Specialist",
        responsibility:
          "Website planning, implementation, client requirements and delivery workflow support.",
      },
      {
        key: "website-seo-monitor",
        name: "Website & SEO Monitor",
        responsibility:
          "Website quality, SEO observations, website health evidence and improvement requirements.",
      },
      {
        key: "content-writer",
        name: "Content Writer",
        responsibility:
          "Website copy, service explanations, landing-page content and customer-facing written material.",
      },
      {
        key: "creative-media-producer",
        name: "Creative Media Producer",
        responsibility:
          "Website graphics, digital brochures, banners, mock-ups and client-facing visual assets.",
      },
      {
        key: "ai-ceo",
        name: "Cossa AI CEO",
        responsibility:
          "Cross-department reasoning, workforce coordination, escalation and executive synthesis.",
      },
    ],
  },

  {
    business: "Revenue & Procurement",
    icon: Search,

    roles: [
      {
        key: "customer-reactivation-analyst",
        name: "Customer Reactivation Analyst",
        responsibility:
          "Retention opportunities, dormant-customer analysis and consent-aware reactivation preparation.",
      },
      {
        key: "broker-deal-intelligence-analyst",
        name: "Broker & Deal Intelligence Analyst",
        responsibility:
          "Commercial matching, buyers, partners, suppliers, brokers and legitimate opportunity intelligence.",
      },
      {
        key: "procurement-intelligence-analyst",
        name: "Procurement Intelligence Analyst",
        responsibility:
          "Tender, RFQ, supplier and procurement opportunity analysis.",
      },
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/* GENERIC HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function formatStatus(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
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

function latestRunTime(
  run: MissionRun,
): string {
  return (
    run.completed_at ??
    run.started_at ??
    run.created_at ??
    ""
  );
}

function employeeDepartment(
  employee: AiEmployee,
): string {
  return (
    employee.department?.trim() ||
    "Department not recorded"
  );
}

function employeeBusinessUnit(
  employee: AiEmployee,
): string {
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
  state:
    OperationalState;

  label:
    string;

  detail:
    string;

  currentTask:
    string;

  lastActivity:
    string | null;

  assignedCount:
    number;

  pendingCount:
    number;

  runningCount:
    number;

  failedCount:
    number;

  approvalCount:
    number;

  latestProvider:
    string | null;

  latestModel:
    string | null;

  latestFailure:
    string | null;
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
  employee:
    AiEmployee;

  handoffs:
    EmployeeHandoff[];

  runs:
    MissionRun[];

  approvals:
    Approval[];
}): EmployeeOperationalView {
  const employeeHandoffs =
    handoffs.filter(
      (handoff) =>
        handoff.to_employee_id ===
        employee.id,
    );

  const employeeRuns =
    runs.filter(
      (run) =>
        run.employee_id ===
        employee.id,
    );

  const employeeRunIds =
    new Set(
      employeeRuns.map(
        (run) => run.id,
      ),
    );

  const employeeApprovals =
    approvals.filter(
      (approval) =>
        approval.requested_by_employee_id ===
          employee.id ||
        (
          approval.run_id !== null &&
          employeeRunIds.has(
            approval.run_id,
          )
        ),
    );

  const pendingHandoffs =
    employeeHandoffs.filter(
      (handoff) =>
        handoff.status ===
        "pending",
    );

  const acceptedHandoffs =
    employeeHandoffs.filter(
      (handoff) =>
        handoff.status ===
        "accepted",
    );

  const activeRuns =
    employeeRuns.filter(
      (run) =>
        run.status ===
        "running",
    );

  const failedRuns =
    employeeRuns.filter(
      (run) =>
        run.status ===
        "failed",
    );

  const latestHandoff =
    [...employeeHandoffs].sort(
      (
        left,
        right,
      ) =>
        right.created_at.localeCompare(
          left.created_at,
        ),
    )[0];

  const latestRun =
    [...employeeRuns].sort(
      (
        left,
        right,
      ) =>
        latestRunTime(
          right,
        ).localeCompare(
          latestRunTime(
            left,
          ),
        ),
    )[0];

  const latestFailure =
    latestRun?.status ===
    "failed"
      ? latestRun.error_message ||
        latestRun.error_code ||
        "The latest recorded run failed."
      : null;

  const latestActivityCandidates =
    [
      latestRun
        ? latestRunTime(
            latestRun,
          )
        : "",

      latestHandoff?.completed_at ??
        "",

      latestHandoff?.accepted_at ??
        "",

      latestHandoff?.created_at ??
        "",
    ].filter(Boolean);

  const latestActivity =
    latestActivityCandidates.sort(
      (
        left,
        right,
      ) =>
        right.localeCompare(
          left,
        ),
    )[0] ??
    null;

  const currentTask =
    acceptedHandoffs[0]?.reason ??
    pendingHandoffs[0]?.reason ??
    latestHandoff?.reason ??
    "No task currently assigned";

  const common = {
    currentTask,

    lastActivity:
      latestActivity,

    assignedCount:
      employeeHandoffs.length,

    pendingCount:
      pendingHandoffs.length,

    runningCount:
      activeRuns.length +
      acceptedHandoffs.length,

    failedCount:
      failedRuns.length,

    approvalCount:
      employeeApprovals.length,

    latestProvider:
      latestRun?.model_provider ??
      null,

    latestModel:
      latestRun?.model_name ??
      null,

    latestFailure,
  };

  if (
    employee.status !==
    "active"
  ) {
    return {
      ...common,

      state: "inactive",

      label:
        `${formatStatus(
          employee.status,
        )} — Not operational`,

      detail:
        employee.status ===
        "paused"
          ? "This employee has been intentionally paused and cannot start new work."
          : employee.status ===
              "retired"
            ? "This employee is retired and cannot start new work."
            : "The employee profile exists but is not currently active.",
    };
  }

  if (
    latestRun?.status ===
    "failed"
  ) {
    return {
      ...common,

      state: "attention",

      label:
        "Active — Needs attention",

      detail:
        latestFailure ??
        "The latest workforce run failed and should be reviewed before retrying.",
    };
  }

  if (
    employeeApprovals.length >
    0
  ) {
    return {
      ...common,

      state: "approval",

      label:
        "Active — Approval required",

      detail:
        "Recorded work has reached an approval-controlled checkpoint.",
    };
  }

  if (
    activeRuns.length >
      0 ||
    acceptedHandoffs.length >
      0
  ) {
    return {
      ...common,

      state: "working",

      label:
        "Active — Working",

      detail:
        "A real workforce run or accepted handoff is currently recorded for this employee.",
    };
  }

  if (
    pendingHandoffs.length >
    0
  ) {
    return {
      ...common,

      state: "waiting",

      label:
        "Active — Assigned",

      detail:
        "A real task has been assigned and is ready for the workforce executor to claim.",
    };
  }

  return {
    ...common,

    state: "idle",

    label:
      "Active — Available",

    currentTask:
      "No task currently assigned",

    detail:
      employeeHandoffs.length >
      0
        ? "This employee has recorded work history and is available for the next appropriate task."
        : "The employee is active and available, but no real task has yet been assigned.",
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
  report:
    OfficialWebsiteHealthReport,
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
      report.issues.length >
      0
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
  mission:
    Mission;

  handoff:
    EmployeeHandoff;

  employee:
    AiEmployee;

  priorOutputs:
    string[];

  authorisedEvidence:
    string[];
}): string {
  const previous =
    priorOutputs.length >
    0
      ? priorOutputs
          .map(
            (
              output,
              index,
            ) =>
              `Earlier worker output ${index + 1}:\n${output}`,
          )
          .join(
            "\n\n",
          )
      : "No earlier workforce output has been recorded.";

  return [
    `You are ${employee.title}, an active Cossa AI employee.`,

    `Your employee key is ${employee.employee_key}.`,

    `Department: ${employee.department}.`,

    `Employee mission: ${employee.mission}`,

    "Complete the assigned internal stage professionally and hand useful work forward.",

    "Do not behave like a placeholder. If the work can safely be completed with the supplied knowledge and evidence, complete it now.",

    "Do not request owner approval merely for internal analysis, planning, drafting, research synthesis, SEO recommendations, content creation, content scheduling, catalogue review, supplier-candidate analysis or employee-to-employee handoffs.",

    "Escalate only when a genuinely high-risk action requires owner authority, including spending money, legal commitments, signed contracts, supplier orders, credential changes, irreversible account changes or sensitive external communication.",

    "Use only verified Cossa knowledge, authorised operational records, authorised evidence and earlier workforce outputs.",

    "If information is unavailable, identify the exact missing information, source or integration rather than inventing it.",

    "Never invent customers, suppliers, products, inventory, sales, campaign performance, website performance, testimonials, revenue, delivery times, prices, partnerships or completed external actions.",

    "Social and marketing content must not disclose private Cossa financial or operational information.",

    "Marketing work may use education, awareness, pain-point marketing, solution marketing, trust-building, offers and calls to action when supported by verified information.",

    "Whenever a social, advertising, website or product post would benefit from a visual, include a concrete VISUAL BRIEF covering format, subject, headline, key text, brand treatment, dimensions or channel and the intended call to action.",

    "Do not claim that an image, brochure, banner, video or graphic was generated unless an authorised media-generation workflow actually created that asset.",

    "Do not unnecessarily stop the internal workflow. Complete your safe work and make the next employee's required input explicit.",

    "Use these headings exactly: Verified inputs; Work completed; Visual or media requirements; Missing information or integrations; Handoff to next employee; High-risk owner decisions required; External actions status.",

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
      "Build and continuously improve Cossa Nexus Holdings' professional social, digital growth, customer-acquisition and commercial operating system using verified company information.",
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

      queryFn:
        () =>
          listEmployees(),
    });

  const missionsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-missions",
      ],

      queryFn:
        () =>
          listMissions(),
    });

  const handoffsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-handoffs",
      ],

      queryFn:
        () =>
          listEmployeeHandoffs(),
    });

  const runsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-runs",
      ],

      queryFn:
        () =>
          listWorkforceRuns(),
    });

  const approvalsQuery =
    useQuery({
      queryKey: [
        "ai-workforce-approvals",
      ],

      queryFn:
        () =>
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
        async (
          result,
        ) => {
          await refreshWorkforce();

          const activeCount =
            result.filter(
              (employee) =>
                employee.status ===
                "active",
            ).length;

          toast.success(
            "Cossa workforce synchronized",
            {
              description:
                `${result.length} employee profiles are recorded. ${activeCount} are active. Existing custom employee records were preserved.`,
            },
          );
        },

      onError:
        (
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
          handoffs: createdHandoffs,
        }) => {
          setSelectedMissionId(
            mission.id,
          );

          await refreshWorkforce();

          toast.success(
            "Coordination mission created",
            {
              description:
                `${mission.title} created ${createdHandoffs.length} real employee handoff stages.`,
            },
          );
        },

      onError:
        (
          error,
        ) => {
          toast.error(
            "Coordination mission could not be created",
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
            (
              employee,
            ) => [
              employee.employee_key,
              employee,
            ],
          ),
        ),

      [
        employees,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* OPERATIONAL STATE                                                        */
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
    useMemo(
      () => {
        let working =
          0;

        let idle =
          0;

        let waiting =
          0;

        let approval =
          0;

        let attention =
          0;

        let inactive =
          0;

        for (
          const item of
            employeeOperationalViews
        ) {
          switch (
            item.operational.state
          ) {
            case "working":
              working +=
                1;
              break;

            case "idle":
              idle +=
                1;
              break;

            case "waiting":
              waiting +=
                1;
              break;

            case "approval":
              approval +=
                1;
              break;

            case "attention":
              attention +=
                1;
              break;

            case "inactive":
              inactive +=
                1;
              break;

            default:
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
      },

      [
        employeeOperationalViews,
      ],
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            employees.map(
              (
                employee,
              ) =>
                employeeDepartment(
                  employee,
                ),
            ),
          ),
        ).sort(),

      [
        employees,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* BUSINESS ROLE READINESS                                                  */
  /* ------------------------------------------------------------------------ */

  const requiredRoleKeys =
    useMemo(
      () =>
        Array.from(
          new Set(
            BUSINESS_OPERATING_ROLES.flatMap(
              (
                business,
              ) =>
                business.roles.map(
                  (
                    role,
                  ) =>
                    role.key,
                ),
            ),
          ),
        ),

      [],
    );

  const requiredRolesInstalled =
    requiredRoleKeys.filter(
      (
        key,
      ) =>
        employeesByKey.has(
          key,
        ),
    ).length;

  const requiredRolesActive =
    requiredRoleKeys.filter(
      (
        key,
      ) =>
        employeesByKey.get(
          key,
        )?.status ===
        "active",
    ).length;

  const targetSocialRolesActive =
    TARGET_SOCIAL_WORKFLOW.filter(
      (
        stage,
      ) =>
        employeesByKey.get(
          stage.key,
        )?.status ===
        "active",
    ).length;

  /* ------------------------------------------------------------------------ */
  /* SOURCE WORKFORCE STATUS                                                  */
  /* ------------------------------------------------------------------------ */

  const installedDefaultEmployees =
    COSSA_GROWTH_WORKFORCE.filter(
      (
        profile,
      ) =>
        employeesByKey.has(
          profile.employee_key,
        ),
    );

  const activeDefaultEmployees =
    COSSA_GROWTH_WORKFORCE.filter(
      (
        profile,
      ) =>
        employeesByKey.get(
          profile.employee_key,
        )?.status ===
        "active",
    );

  const activeExecutableWorkflowEmployees =
    EXECUTABLE_GROWTH_WORKFLOW.filter(
      (
        step,
      ) =>
        employeesByKey.get(
          step.key,
        )?.status ===
        "active",
    );

  /* ------------------------------------------------------------------------ */
  /* GROWTH WORKFLOW                                                          */
  /* ------------------------------------------------------------------------ */

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
    ) ??
    null;

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
          run:
            MissionRun;

          content:
            string;
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
    activeExecutableWorkflowEmployees.length ===
      EXECUTABLE_GROWTH_WORKFLOW.length &&
    objective.trim().length >
      0;

  /* ------------------------------------------------------------------------ */
  /* EXECUTE ONE HANDOFF                                                      */
  /* ------------------------------------------------------------------------ */

  async function executeControlledHandoff({
    mission,
    handoff,
    employee,
    priorOutputs,
  }: {
    mission:
      Mission;

    handoff:
      EmployeeHandoff;

    employee:
      AiEmployee;

    priorOutputs:
      string[];
  }): Promise<{
    content:
      string;

    finalStage:
      boolean;
  }> {
    if (
      employee.status !==
      "active"
    ) {
      throw new Error(
        `${employee.name} is ${employee.status} and cannot execute this stage.`,
      );
    }

    const authorisedEvidence =
      employee.employee_key ===
      "website-seo-monitor"
        ? [
            websiteReportEvidence(
              await checkOfficialWebsite(),
            ),
          ]
        : [];

    const run =
      await startControlledWorkforceRun({
        mission,

        handoff,

        employee,

        provider:
          DEFAULT_WORKFORCE_PROVIDER,

        modelName:
          DEFAULT_WORKFORCE_MODEL,

        priorOutputs,

        authorisedEvidence,
      });

    try {
      const content =
        await streamChat(
          [
            {
              role: "user",

              content:
                controlledStagePrompt({
                  mission,

                  handoff,

                  employee,

                  priorOutputs,

                  authorisedEvidence,
                }),
            },
          ],

          () => undefined,

          undefined,

          employee.system_instructions,

          DEFAULT_WORKFORCE_PROVIDER,
        );

      if (
        !content.trim()
      ) {
        throw new Error(
          `${employee.name} did not return a usable workforce output.`,
        );
      }

      const result =
        await completeControlledWorkforceRun({
          run,

          handoff,

          employee,

          content,
        });

      return {
        content,

        finalStage:
          result.finalStage,
      };
    } catch (
      error
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : "The workforce provider failed to return an output.";

      try {
        await failControlledWorkforceRun({
          run,

          handoff,

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
  }

  /* ------------------------------------------------------------------------ */
  /* RUN NEXT STAGE                                                           */
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

          return executeControlledHandoff({
            mission:
              selectedMission,

            handoff:
              nextHandoff,

            employee:
              nextEmployee,

            priorOutputs,
          });
        },

      onSuccess:
        async ({
          finalStage,
        }) => {
          await refreshWorkforce();

          toast.success(
            finalStage
              ? "Workforce chain reached its review checkpoint"
              : "Employee stage completed",
            {
              description:
                finalStage
                  ? "All recorded Growth stages completed. The mission has reached its current review checkpoint."
                  : "The employee completed its work and the next recorded handoff is ready.",
            },
          );
        },

      onError:
        (
          error,
        ) => {
          toast.error(
            "Workforce stage could not run",
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
  /* AUTOMATIC SAFE CHAIN                                                     */
  /* ------------------------------------------------------------------------ */

  const runSafeWorkflowMutation =
    useMutation({
      mutationFn:
        async () => {
          if (
            !selectedMission
          ) {
            throw new Error(
              "Select a Growth coordination mission first.",
            );
          }

          if (
            selectedMission.status ===
              "completed" ||
            selectedMission.status ===
              "awaiting_approval"
          ) {
            throw new Error(
              "This mission has no safe pending workflow stages available to run.",
            );
          }

          const pending =
            selectedMissionHandoffs.filter(
              (
                handoff,
              ) =>
                handoff.status ===
                "pending",
            );

          if (
            pending.length ===
            0
          ) {
            throw new Error(
              "This mission has no pending workforce handoffs.",
            );
          }

          const accumulatedOutputs =
            reviewableOutputs.map(
              (
                item,
              ) =>
                item.content,
            );

          let completedStages =
            0;

          let reachedFinalStage =
            false;

          for (
            const handoff of
              pending
          ) {
            const employee =
              employees.find(
                (
                  candidate,
                ) =>
                  candidate.id ===
                  handoff.to_employee_id,
              );

            if (!employee) {
              throw new Error(
                `A pending handoff references employee ${handoff.to_employee_id}, but that employee record was not found.`,
              );
            }

            if (
              employee.status !==
              "active"
            ) {
              throw new Error(
                `${employee.name} is ${employee.status}. Automatic execution stopped because an inactive employee cannot truthfully execute work.`,
              );
            }

            const result =
              await executeControlledHandoff({
                mission:
                  selectedMission,

                handoff,

                employee,

                priorOutputs:
                  accumulatedOutputs,
              });

            accumulatedOutputs.push(
              result.content,
            );

            completedStages +=
              1;

            reachedFinalStage =
              result.finalStage;

            if (
              reachedFinalStage
            ) {
              break;
            }
          }

          return {
            completedStages,

            reachedFinalStage,
          };
        },

      onSuccess:
        async ({
          completedStages,
          reachedFinalStage,
        }) => {
          await refreshWorkforce();

          toast.success(
            reachedFinalStage
              ? "Safe workforce chain completed"
              : "Safe workforce chain progressed",
            {
              description:
                `${completedStages} employee stage${completedStages === 1 ? "" : "s"} completed and handed work forward. High-risk external authority was not granted.`,
            },
          );
        },

      onError:
        (
          error,
        ) => {
          toast.error(
            "Automatic workforce chain stopped",
            {
              description:
                error instanceof
                Error
                  ? error.message
                  : "The automatic workforce chain stopped because a stage could not be completed.",
            },
          );
        },
    });

  /* ------------------------------------------------------------------------ */
  /* APPROVAL                                                                 */
  /* ------------------------------------------------------------------------ */

  const reviewMutation =
    useMutation({
      mutationFn:
        ({
          approvalId,
          decision,
        }: {
          approvalId:
            string;

          decision:
            | "approved"
            | "rejected";
        }) =>
          decideApproval(
            approvalId,

            decision,

            decision ===
              "approved"
              ? "Owner approved the recorded internal workforce briefing. This does not authorise unrelated external high-risk actions."
              : "Owner requested changes to the recorded internal workforce briefing.",
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
          );
        },

      onError:
        (
          error,
        ) => {
          toast.error(
            "Owner decision could not be recorded",
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
                <Workflow className="h-5 w-5" />
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
              Cossa AI employees operate
              as one coordinated business
              system. Safe internal work
              can move employee to
              employee automatically,
              while genuine high-risk,
              irreversible, legal and
              financial actions remain
              owner-controlled.
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
                ? "Synchronising workforce…"
                : "Synchronise workforce"}
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
              (
                employee,
              ) =>
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
          label="Assigned"
          value={String(
            workforceCounts.waiting,
          )}
        />

        <Metric
          label="Available"
          value={String(
            workforceCounts.idle,
          )}
        />

        <Metric
          label="Attention"
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

      {/* TARGET SOCIAL OPERATING LINE */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Social operating model
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Target nine-stage social
              collaboration line
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This shows the complete
              operating model we are
              building. A worker is only
              marked active when a live
              employee profile exists.
              The executable mission line
              below remains tied to real
              handoffs created by the
              backend.
            </p>
          </div>

          <div className="grid min-w-64 grid-cols-2 gap-2">
            <MiniMetric
              label="Required"
              value={
                TARGET_SOCIAL_WORKFLOW.length
              }
            />

            <MiniMetric
              label="Active"
              value={
                targetSocialRolesActive
              }
              warning={
                targetSocialRolesActive <
                TARGET_SOCIAL_WORKFLOW.length
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {TARGET_SOCIAL_WORKFLOW.map(
            (
              stage,
              index,
            ) => {
              const Icon =
                stage.icon;

              const employee =
                employeesByKey.get(
                  stage.key,
                );

              const active =
                employee?.status ===
                "active";

              return (
                <div
                  key={
                    stage.key
                  }
                  className="relative rounded-xl border border-border/60 bg-card/40 p-3"
                >
                  {index <
                  TARGET_SOCIAL_WORKFLOW.length -
                    1 ? (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                  ) : null}

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>

                  <p className="mt-3 text-xs font-semibold">
                    {
                      stage.label
                    }
                  </p>

                  <span
                    className={
                      active
                        ? "mt-2 inline-block text-[9px] uppercase tracking-wider text-success"
                        : employee
                          ? "mt-2 inline-block text-[9px] uppercase tracking-wider text-warning"
                          : "mt-2 inline-block text-[9px] uppercase tracking-wider text-muted-foreground"
                    }
                  >
                    {active
                      ? "Active"
                      : employee
                        ? formatStatus(
                            employee.status,
                          )
                        : "Missing"}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* BUSINESS WORKFORCE READINESS */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Operating workforce
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Growth, Store, Tech and
              Revenue readiness
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Specialist coverage is
              checked directly against
              live employee records.
              Missing roles remain
              visible until they really
              exist.
            </p>
          </div>

          <div className="grid min-w-64 grid-cols-2 gap-2">
            <MiniMetric
              label="Required"
              value={
                requiredRoleKeys.length
              }
            />

            <MiniMetric
              label="Active"
              value={
                requiredRolesActive
              }
              warning={
                requiredRolesActive <
                requiredRoleKeys.length
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {BUSINESS_OPERATING_ROLES.map(
            (
              business,
            ) => {
              const Icon =
                business.icon;

              return (
                <article
                  key={
                    business.business
                  }
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        {
                          business.business
                        }
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        Specialist
                        workforce
                        coverage
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {business.roles.map(
                      (
                        role,
                      ) => {
                        const employee =
                          employeesByKey.get(
                            role.key,
                          );

                        const active =
                          employee?.status ===
                          "active";

                        return (
                          <div
                            key={
                              `${business.business}-${role.key}`
                            }
                            className="rounded-lg border border-border/50 bg-background/30 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-medium">
                                  {
                                    role.name
                                  }
                                </p>

                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                  {
                                    role.responsibility
                                  }
                                </p>
                              </div>

                              <span
                                className={
                                  active
                                    ? "shrink-0 rounded-full border border-success/35 bg-success/10 px-2 py-1 text-[9px] uppercase tracking-wider text-success"
                                    : employee
                                      ? "shrink-0 rounded-full border border-warning/35 bg-warning/10 px-2 py-1 text-[9px] uppercase tracking-wider text-warning"
                                      : "shrink-0 rounded-full border border-border bg-secondary/40 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground"
                                }
                              >
                                {active
                                  ? "Active"
                                  : employee
                                    ? formatStatus(
                                        employee.status,
                                      )
                                    : "Missing"}
                              </span>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>

        {requiredRolesInstalled <
        requiredRoleKeys.length ? (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />

              <p className="text-xs leading-relaxed text-warning">
                Some specialist roles are
                still absent from the
                live employee table.
                Synchronising the
                workforce installs only
                profiles that actually
                exist in
                COSSA_GROWTH_WORKFORCE.
                Missing roles must first
                be added to
                workforce-data.ts.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* SOURCE WORKFORCE STATUS */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce integrity
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Source-defined workforce
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Existing custom employees
              are preserved. Missing
              source profiles can be
              installed without deleting
              or silently replacing
              existing workforce records.
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
          Source profiles:{" "}
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

          Departments:{" "}
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
            Working, assigned,
            available, failed and
            approval states are derived
            from real employee, handoff,
            run and approval records.
          </p>
        </div>

        {employeesQuery.isLoading ? (
          <div className="mt-5 rounded-xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
            Loading workforce records…
          </div>
        ) : employeesQuery.isError ? (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            The workforce database could
            not be loaded.
          </div>
        ) : employees.length ===
          0 ? (
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
                const inExecutableGrowthWorkflow =
                  EXECUTABLE_GROWTH_WORKFLOW_KEYS.has(
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
                        label="Growth mission line"
                        value={
                          inExecutableGrowthWorkflow
                            ? "Executable stage"
                            : "Specialist / separate workflow"
                        }
                      />

                      <EmployeeDetail
                        label="Approval default"
                        value={
                          employee.requires_approval_by_default
                            ? "Approval-controlled"
                            : "Safe internal work allowed"
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

      {/* EXECUTABLE GROWTH WORKFLOW */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Real executable handoff line
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Current Growth workflow
            </h2>
          </div>

          <p className="max-w-xl text-sm text-muted-foreground">
            These are the employee
            stages currently expected by
            the Growth mission backend.
            The chain can run
            sequentially without one
            manual click per employee.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {EXECUTABLE_GROWTH_WORKFLOW.map(
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
                  EXECUTABLE_GROWTH_WORKFLOW.length -
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

      {/* AUTOMATIC EXECUTION */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Automatic safe execution
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Run internal employees
              hand-to-hand
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Every pending safe stage
              can execute sequentially.
              The output from one worker
              is supplied to the next.
              A genuine failure stops the
              chain and remains visible
              in the audit history.
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
                    event.target.value ||
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
            Create a Growth
            coordination mission first.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Next employee
              </p>

              <h3 className="mt-1 text-sm font-semibold">
                {nextEmployee
                  ? `${nextEmployee.name} — ${nextEmployee.title}`
                  : "No pending employee stage"}
              </h3>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {nextHandoff?.reason ??
                  "No pending handoff remains for this mission."}
              </p>

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    runSafeWorkflowMutation.mutate()
                  }
                  disabled={
                    !nextHandoff ||
                    runSafeWorkflowMutation.isPending ||
                    runNextStageMutation.isPending ||
                    selectedMission.status ===
                      "awaiting_approval" ||
                    selectedMission.status ===
                      "completed"
                  }
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  {runSafeWorkflowMutation.isPending ? (
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Workflow className="mr-1.5 h-4 w-4" />
                  )}

                  {runSafeWorkflowMutation.isPending
                    ? "Employees are working hand-to-hand…"
                    : "Run all safe pending stages"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    runNextStageMutation.mutate()
                  }
                  disabled={
                    !nextHandoff ||
                    !nextEmployee ||
                    nextEmployee.status !==
                      "active" ||
                    runNextStageMutation.isPending ||
                    runSafeWorkflowMutation.isPending ||
                    selectedMission.status ===
                      "awaiting_approval" ||
                    selectedMission.status ===
                      "completed"
                  }
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  {runNextStageMutation.isPending ? (
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}

                  Run only next stage
                </Button>
              </div>

              <div className="mt-4 rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Execution boundary
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Automatic execution on
                  this page runs while
                  the browser request is
                  active. Permanent
                  unattended work,
                  recurring daily
                  execution, scheduled
                  posting and autonomous
                  external publishing
                  need a server-side
                  scheduler or worker
                  together with real
                  authorised
                  integrations.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Recorded outputs
                  </p>

                  <h3 className="text-sm font-semibold">
                    {
                      reviewableOutputs.length
                    }{" "}
                    employee outputs saved
                  </h3>
                </div>
              </div>

              {reviewableOutputs.length ===
              0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No employee output has
                  been saved for this
                  mission yet.
                </p>
              ) : (
                <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                  {reviewableOutputs.map(
                    ({
                      run,
                      content,
                    }) => {
                      const worker =
                        employees.find(
                          (
                            employee,
                          ) =>
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
                              completed
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
                (
                  run,
                ) =>
                  run.status ===
                  "failed",
              ) ? (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="flex items-start gap-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    This mission contains
                    one or more recorded
                    failed runs. Audit
                    history is retained.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* OPERATING AREAS */}

      <section className="grid gap-4 lg:grid-cols-3">
        <OperatingArea
          icon={
            Megaphone
          }
          title="Social media"
          description="Strategy, copy, visual production, scheduling, social management and account-growth analysis should work as one pipeline. Real unattended publishing requires authenticated social integrations and a background executor."
        />

        <OperatingArea
          icon={
            ShoppingCart
          }
          title="Cossa Store"
          description="Store operations should coordinate catalogue health, product intelligence, legitimate supplier sourcing, merchandising, product visuals, campaigns and social-commerce growth."
        />

        <OperatingArea
          icon={
            Code2
          }
          title="Cossa Tech"
          description="Cossa Tech should coordinate websites, technical solutions, customer requirements, website content, graphics, SEO quality and delivery rather than leaving technical enquiries without a specialist owner."
        />
      </section>

      {/* CREATE MISSION + OWNER CONTROL */}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />

            <div>
              <h2 className="font-display text-xl font-semibold">
                Create Growth
                coordination mission
              </h2>

              <p className="text-sm text-muted-foreground">
                Creates real linked
                employee handoffs ready
                for automatic safe
                execution.
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
                onChange={(
                  event,
                ) =>
                  setObjective(
                    event.target.value,
                  )
                }
                rows={
                  4
                }
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
                  onChange={(
                    event,
                  ) =>
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
                The currently
                executable Growth chain
                requires all{" "}
                {
                  EXECUTABLE_GROWTH_WORKFLOW.length
                }{" "}
                backend workflow
                employees to exist and
                be active.{" "}
                {
                  activeExecutableWorkflowEmployees.length
                }{" "}
                of{" "}
                {
                  EXECUTABLE_GROWTH_WORKFLOW.length
                }{" "}
                are currently active.
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
              <Workflow className="mr-1.5 h-4 w-4" />

              {coordinationMutation.isPending
                ? "Creating employee workflow…"
                : "Create employee workflow"}
            </Button>
          </div>
        </section>

        <section className="glass-card flex flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Owner authority
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            Interrupt only for real
            high-risk decisions
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Internal research,
            analysis, drafting, content
            creation, visual briefs,
            scheduling, SEO,
            catalogue analysis,
            supplier-candidate research
            and employee handoffs should
            continue without unnecessary
            owner interruption.
          </p>

          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <OwnerRule>
              Spending money, supplier
              orders and advertising
              budget changes remain
              owner-controlled.
            </OwnerRule>

            <OwnerRule>
              Contracts, legal
              commitments, signatures
              and binding commercial
              terms remain
              owner-controlled.
            </OwnerRule>

            <OwnerRule>
              Credentials, destructive
              operations and
              irreversible account
              changes remain
              owner-controlled.
            </OwnerRule>

            <OwnerRule>
              Missing integrations must
              be identified accurately
              rather than simulated.
            </OwnerRule>
          </div>

          <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link to="/integrations">
                <Send className="mr-1.5 h-4 w-4" />

                Connections
              </Link>
            </Button>

            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/ai/ceo">
                <BrainCircuit className="mr-1.5 h-4 w-4" />

                AI CEO
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
              Recorded workflows
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Growth mission history
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
            No Growth coordination
            mission has been created.
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
                  const missionHandoffs =
                    handoffs.filter(
                      (
                        handoff,
                      ) =>
                        handoff.mission_id ===
                        mission.id,
                    );

                  const missionRuns =
                    runs.filter(
                      (
                        run,
                      ) =>
                        run.mission_id ===
                        mission.id,
                    );

                  const reviewApproval =
                    workforceReviewApprovals.find(
                      (
                        approval,
                      ) =>
                        approval.mission_id ===
                        mission.id,
                    );

                  const completedHandoffs =
                    missionHandoffs.filter(
                      (
                        handoff,
                      ) =>
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
                          stages
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
                              (
                                run,
                              ) =>
                                run.status ===
                                "failed",
                            ).length
                          }
                          warning={
                            missionRuns.some(
                              (
                                run,
                              ) =>
                                run.status ===
                                "failed",
                            )
                          }
                        />
                      </div>

                      {reviewApproval ? (
                        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                          <p className="text-xs font-medium text-foreground">
                            Internal review
                            checkpoint
                          </p>

                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            This approval
                            closes the
                            internal
                            coordination
                            briefing. It
                            does not
                            authorise
                            publishing,
                            spending,
                            contracting,
                            customer
                            messaging or
                            account
                            changes.
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
                                  window.confirm(
                                    "Approve this recorded internal briefing?",
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
                              Approve
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
                },
              )}
          </div>
        )}
      </section>

      {/* EXECUTION REALITY */}

      <section className="glass-card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Operational truth
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Capability must be real,
              not cosmetic
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              An active employee
              profile proves the worker
              is allowed to receive
              work. A running mission
              run proves execution. A
              completed run proves an
              internal result. Social
              publishing requires a
              real authenticated
              publishing integration.
              Visual generation requires
              a real media-generation
              workflow. Supplier
              discovery requires a
              legitimate research
              source. Permanent
              unattended operation
              requires a server-side
              executor or scheduler.
            </p>
          </div>
        </div>
      </section>

      {/* QUEUE SUMMARY */}

      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce queue
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Current Growth execution
              position
            </h2>
          </div>

          <div className="text-xs text-muted-foreground">
            {
              pendingHandoffs.length
            }{" "}
            Growth handoff
            {pendingHandoffs.length ===
            1
              ? ""
              : "s"}{" "}
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
  label:
    string;

  value:
    string;

  warning?:
    boolean;
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
  label:
    string;

  value:
    number;

  warning?:
    boolean;
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
  label:
    string;

  value:
    string;
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

function OwnerRule({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <span>
        {children}
      </span>
    </div>
  );
}

function OperatingArea({
  icon: Icon,
  title,
  description,
}: {
  icon:
    typeof Store;

  title:
    string;

  description:
    string;
}) {
  return (
    <article className="glass-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

function OperationalBadge({
  state,
  label,
}: {
  state:
    OperationalState;

  label:
    string;
}) {
  const className =
    state ===
    "working"
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