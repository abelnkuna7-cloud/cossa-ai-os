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
 * This must match the real Growth workflow created in workforce-data.ts.
 *
 * The source of truth is now the full nine-stage collaboration line:
 *
 * Website
 * → Strategy
 * → Content
 * → Creative
 * → Schedule
 * → Social Management
 * → Growth Analysis
 * → Paid Media
 * → AI CEO
 */
const EXECUTABLE_GROWTH_WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Website intelligence",
    description:
      "Checks authorised Cossa web properties and passes verified website, SEO and content observations into the Growth system.",
    icon: Globe2,
  },
  {
    key: "social-strategy-planner",
    label: "Social strategy",
    description:
      "Builds channel strategy, audience direction, campaign angles, positioning and marketing priorities from verified information.",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Content production",
    description:
      "Produces accurate marketing, educational, awareness, pain-point, solution and conversion-focused written content.",
    icon: FilePenLine,
  },
  {
    key: "creative-media-producer",
    label: "Creative media",
    description:
      "Turns content and campaign requirements into production-ready visual briefs, brochures, graphics, banners and media requirements.",
    icon: ImageIcon,
  },
  {
    key: "social-schedule-coordinator",
    label: "Content coordination",
    description:
      "Organises complete copy-and-creative packages into practical channel schedules and publishing queues.",
    icon: PanelTop,
  },
  {
    key: "social-media-manager",
    label: "Social management",
    description:
      "Owns day-to-day channel readiness, publishing preparation, campaign continuity and authorised social execution.",
    icon: Megaphone,
  },
  {
    key: "account-growth-analyst",
    label: "Growth analysis",
    description:
      "Analyses authorised account and campaign evidence to identify audience, content and conversion improvements.",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Paid media",
    description:
      "Prepares advertising strategy, targeting and optimisation recommendations while spend and launch authority remain owner-controlled.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO",
    description:
      "Synthesises workforce outputs, resolves ordinary internal questions and escalates only genuine owner decisions.",
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
 * Required specialist roles across the wider Cossa operating system.
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

      latestHandoff?.completed_at ?? "",
      latestHandoff?.accepted_at ?? "",
      latestHandoff?.created_at ?? "",
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
    )[0] ?? null;

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

      state:
        "inactive",

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
    activeRuns.length >
      0 ||
    acceptedHandoffs.length >
      0
  ) {
    return {
      ...common,

      state:
        "working",

      label:
        "Active — Working",

      detail:
        "A real workforce run or accepted handoff is currently recorded for this employee.",
    };
  }

  if (
    employeeApprovals.length >
    0
  ) {
    return {
      ...common,

      state:
        "approval",

      label:
        "Active — Approval required",

      detail:
        "Recorded work has reached an approval-controlled checkpoint.",
    };
  }

  if (
    latestRun?.status ===
    "failed"
  ) {
    return {
      ...common,

      state:
        "attention",

      label:
        "Active — Needs attention",

      detail:
        latestFailure ??
        "The latest workforce run failed and should be reviewed before retrying.",
    };
  }

  if (
    pendingHandoffs.length >
    0
  ) {
    return {
      ...common,

      state:
        "waiting",

      label:
        "Active — Assigned",

      detail:
        "A real task has been assigned and is ready for the workforce executor to claim.",
    };
  }

  return {
    ...common,

    state:
      "idle",

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

    "Do not request owner approval merely for internal analysis, planning, drafting, research synthesis, SEO recommendations, content creation, creative briefing, content scheduling, catalogue review, supplier-candidate analysis or employee-to-employee handoffs.",

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

  const executableGrowthRolesActive =
    EXECUTABLE_GROWTH_WORKFLOW.filter(
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

  /**
   * Important workflow-order rule:
   *
   * We always inspect the FIRST incomplete handoff.
   *
   * We never skip an accepted, rejected or otherwise incomplete earlier
   * employee merely because a later employee is still pending.
   */
  const firstIncompleteHandoff =
    selectedMissionHandoffs.find(
      (
        handoff,
      ) =>
        handoff.status !==
        "completed",
    ) ?? null;

  const nextHandoff =
    firstIncompleteHandoff?.status ===
    "pending"
      ? firstIncompleteHandoff
      : null;

  const blockedHandoff =
    firstIncompleteHandoff &&
    firstIncompleteHandoff.status !==
      "pending"
      ? firstIncompleteHandoff
      : null;

  const nextEmployee =
    firstIncompleteHandoff
      ? employees.find(
          (
            employee,
          ) =>
            employee.id ===
            firstIncompleteHandoff.to_employee_id,
        ) ?? null
      : null;

  /**
   * Execution context must flow in chronological order.
   *
   * listWorkforceRuns() returns newest-first, so we explicitly sort the
   * selected mission's runs oldest → newest before passing outputs forward.
   */
  const selectedMissionRuns =
    selectedMission
      ? runs
          .filter(
            (
              run,
            ) =>
              run.mission_id ===
              selectedMission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              latestRunTime(
                left,
              ).localeCompare(
                latestRunTime(
                  right,
                ),
              ),
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

  /**
   * Visual display may be newest-first.
   *
   * This never changes execution order.
   */
  const displayReviewableOutputs =
    [...reviewableOutputs].reverse();

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

    if (
      handoff.status !==
      "pending"
    ) {
      throw new Error(
        `${employee.name}'s handoff is ${handoff.status}, not pending. The workflow will not skip or duplicate this stage.`,
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
              role:
                "user",

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
            !selectedMission
          ) {
            throw new Error(
              "Select a Growth coordination mission first.",
            );
          }

          if (
            blockedHandoff
          ) {
            throw new Error(
              `The next workflow stage is currently ${blockedHandoff.status}. Cossa AI will not skip that earlier stage.`,
            );
          }

          if (
            !nextHandoff ||
            !nextEmployee
          ) {
            throw new Error(
              "This mission has no executable pending workforce stage.",
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
              ? "Growth workforce chain completed"
              : "Employee stage completed",
            {
              description:
                finalStage
                  ? "All recorded Growth stages completed successfully. The mission can now be reviewed as a completed internal workflow."
                  : "The employee completed its internal work and the next recorded handoff is ready.",
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
            "completed"
          ) {
            throw new Error(
              "This mission is already completed.",
            );
          }

          if (
            selectedMission.status ===
            "awaiting_approval"
          ) {
            throw new Error(
              "This mission is currently paused at an approval-controlled action.",
            );
          }

          const incomplete =
            selectedMissionHandoffs.filter(
              (
                handoff,
              ) =>
                handoff.status !==
                "completed",
            );

          if (
            incomplete.length ===
            0
          ) {
            throw new Error(
              "This mission has no incomplete workforce stages.",
            );
          }

          /**
           * Never jump over an earlier handoff.
           */
          const firstIncomplete =
            incomplete[0];

          if (
            firstIncomplete.status ===
            "accepted"
          ) {
            const employee =
              employees.find(
                (
                  candidate,
                ) =>
                  candidate.id ===
                  firstIncomplete.to_employee_id,
              );

            throw new Error(
              `${
                employee?.name ??
                "The next employee"
              } already owns the next workflow stage. The chain will not skip that accepted handoff.`,
            );
          }

          if (
            firstIncomplete.status !==
            "pending"
          ) {
            throw new Error(
              `The next workflow stage is ${firstIncomplete.status}. Automatic execution will not skip it.`,
            );
          }

          /**
           * Only collect the contiguous pending sequence.
           *
           * If any later non-pending incomplete stage appears, execution stops
           * before it rather than jumping over it.
           */
          const pendingSequence:
            EmployeeHandoff[] =
            [];

          for (
            const handoff of
              incomplete
          ) {
            if (
              handoff.status !==
              "pending"
            ) {
              break;
            }

            pendingSequence.push(
              handoff,
            );
          }

          if (
            pendingSequence.length ===
            0
          ) {
            throw new Error(
              "No executable pending workflow stage is available.",
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
              pendingSequence
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
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* HERO */}

      <section className="glass-card relative overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
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

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void refreshWorkforce()
              }
              disabled={
                isLoading
              }
              className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
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
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow sm:w-auto"
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

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {/* REAL SOCIAL OPERATING LINE */}

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Social operating model
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Nine-stage executable
              Growth collaboration line
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This is no longer a target
              diagram. It now represents
              the same nine employees
              expected by the Growth
              mission backend. A stage is
              marked active only when the
              corresponding live employee
              profile is active.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-64">
            <MiniMetric
              label="Required"
              value={
                EXECUTABLE_GROWTH_WORKFLOW.length
              }
            />

            <MiniMetric
              label="Active"
              value={
                executableGrowthRolesActive
              }
              warning={
                executableGrowthRolesActive <
                EXECUTABLE_GROWTH_WORKFLOW.length
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-9">
          {EXECUTABLE_GROWTH_WORKFLOW.map(
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
                  className="relative min-w-0 rounded-xl border border-border/60 bg-card/40 p-3"
                >
                  {index <
                  EXECUTABLE_GROWTH_WORKFLOW.length -
                    1 ? (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                  ) : null}

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>

                  <p className="mt-3 break-words text-xs font-semibold">
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

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Operating workforce
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Growth, Store, Tech and
              Revenue readiness
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Specialist coverage is
              checked directly against
              live employee records.
              Missing roles remain
              visible until they really
              exist.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-64">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
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
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-medium">
                                  {
                                    role.name
                                  }
                                </p>

                                <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">
                                  {
                                    role.responsibility
                                  }
                                </p>
                              </div>

                              <span
                                className={
                                  active
                                    ? "w-fit shrink-0 rounded-full border border-success/35 bg-success/10 px-2 py-1 text-[9px] uppercase tracking-wider text-success"
                                    : employee
                                      ? "w-fit shrink-0 rounded-full border border-warning/35 bg-warning/10 px-2 py-1 text-[9px] uppercase tracking-wider text-warning"
                                      : "w-fit shrink-0 rounded-full border border-border bg-secondary/40 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground"
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
                source profiles that
                actually exist in
                COSSA_GROWTH_WORKFORCE.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* SOURCE WORKFORCE STATUS */}

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce integrity
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Source-defined workforce
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Existing custom employees
              are preserved. Missing
              source profiles can be
              installed without deleting
              or silently replacing
              existing workforce records.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-64">
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

        <div className="mt-4 break-words text-xs text-muted-foreground">
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

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce command centre
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              All Cossa AI employees
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
                    className="min-w-0 rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold">
                          {
                            employee.name
                          }
                        </p>

                        <p className="mt-0.5 break-words text-xs text-muted-foreground">
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

                      <p className="mt-1 break-words text-xs leading-relaxed">
                        {
                          operational.currentTask
                        }
                      </p>
                    </div>

                    <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">
                      {
                        operational.detail
                      }
                    </p>

                    {operational.latestFailure ? (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-destructive">
                          Latest failure
                        </p>

                        <p className="mt-1 break-words text-xs leading-relaxed text-destructive">
                          {
                            operational.latestFailure
                          }
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Real executable handoff line
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Current Growth workflow
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            These nine employee stages
            now match the current Growth
            mission backend. The chain
            runs sequentially and will
            not skip an earlier
            incomplete employee stage.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-9">
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
                  className="relative min-w-0 rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  {index <
                  EXECUTABLE_GROWTH_WORKFLOW.length -
                    1 ? (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                  ) : null}

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="mt-3 break-words text-sm font-semibold">
                    {
                      step.label
                    }
                  </div>

                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
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

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Automatic safe execution
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Run internal employees
              hand-to-hand
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Every safe pending stage
              executes in recorded
              workflow order. Employee
              outputs are supplied
              forward chronologically. If
              an earlier stage is already
              accepted, blocked or in an
              invalid state, the chain
              stops instead of skipping
              it.
            </p>
          </div>

          {coordinationMissions.length >
          0 ? (
            <label className="grid w-full gap-1 text-xs font-medium text-muted-foreground lg:w-auto">
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
                className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 sm:min-w-64"
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
            Create a Growth coordination
            mission first.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Current execution position
              </p>

              <h3 className="mt-1 break-words text-sm font-semibold">
                {nextEmployee
                  ? `${nextEmployee.name} — ${nextEmployee.title}`
                  : firstIncompleteHandoff
                    ? "Workflow stage blocked"
                    : "No incomplete employee stage"}
              </h3>

              <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">
                {firstIncompleteHandoff?.reason ??
                  "No incomplete handoff remains for this mission."}
              </p>

              {blockedHandoff ? (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />

                    <div>
                      <p className="text-xs font-medium text-warning">
                        Earlier stage cannot be skipped
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-warning">
                        The first
                        incomplete handoff is{" "}
                        <strong>
                          {formatStatus(
                            blockedHandoff.status,
                          )}
                        </strong>
                        . The executor
                        will not run a
                        later employee
                        until this stage
                        is recovered or
                        completed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    runSafeWorkflowMutation.mutate()
                  }
                  disabled={
                    !nextHandoff ||
                    Boolean(
                      blockedHandoff,
                    ) ||
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
                    Boolean(
                      blockedHandoff,
                    ) ||
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
                  This page can run the
                  safe chain while the
                  browser request remains
                  active. Permanent
                  unattended execution,
                  recurring work,
                  scheduled posting and
                  autonomous external
                  publishing still need a
                  server-side worker or
                  scheduler with verified
                  authorised integrations.
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />

                <div className="min-w-0">
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
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {displayReviewableOutputs.map(
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
                          className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <span className="break-words text-xs font-medium">
                                {worker?.name ??
                                  "Recorded worker"}
                              </span>

                              <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                                {run.model_provider ??
                                  "Provider not recorded"}

                                {run.model_name
                                  ? ` · ${run.model_name}`
                                  : ""}
                              </p>
                            </div>

                            <span className="w-fit text-[10px] uppercase tracking-widest text-success">
                              completed
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
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
                    history is retained;
                    failed records are
                    not converted into
                    completed work.
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
          description="Strategy, copy, creative production, scheduling, social management and account-growth analysis now form one nine-stage Growth pipeline. Real unattended publishing still requires authenticated social integrations and a background executor."
        />

        <OperatingArea
          icon={
            ShoppingCart
          }
          title="Cossa Store"
          description="Store operations coordinate catalogue health, product intelligence, legitimate supplier sourcing, merchandising, product visuals, campaigns and social-commerce growth."
        />

        <OperatingArea
          icon={
            Code2
          }
          title="Cossa Tech"
          description="Cossa Tech coordinates websites, technical solutions, customer requirements, website content, graphics, SEO quality and delivery instead of leaving technical enquiries without a specialist owner."
        />
      </section>

      {/* CREATE MISSION + OWNER CONTROL */}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-4 sm:p-5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>
              <h2 className="font-display text-xl font-semibold">
                Create Growth
                coordination mission
              </h2>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Creates the real
                nine-stage Growth
                workforce chain with
                linked employee handoffs
                ready for controlled
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
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
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
                  className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
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
                  className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>
            </div>

            {!canCreateCoordination ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                The Growth chain requires
                all{" "}
                {
                  EXECUTABLE_GROWTH_WORKFLOW.length
                }{" "}
                executable employees to
                exist and be active.{" "}
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
                ? "Creating nine-stage workflow…"
                : "Create employee workflow"}
            </Button>
          </div>
        </section>

        <section className="glass-card flex flex-col p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Owner authority
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            Interrupt only for real
            high-risk decisions
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Internal research,
            analysis, drafting, content
            creation, visual briefs,
            scheduling, SEO, catalogue
            analysis, supplier-candidate
            research and employee
            handoffs should continue
            without unnecessary owner
            interruption.
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

      <section className="glass-card p-4 sm:p-5">
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

                  const completedHandoffs =
                    missionHandoffs.filter(
                      (
                        handoff,
                      ) =>
                        handoff.status ===
                        "completed",
                    ).length;

                  const acceptedHandoffs =
                    missionHandoffs.filter(
                      (
                        handoff,
                      ) =>
                        handoff.status ===
                        "accepted",
                    ).length;

                  const failedRuns =
                    missionRuns.filter(
                      (
                        run,
                      ) =>
                        run.status ===
                        "failed",
                    ).length;

                  return (
                    <article
                      key={
                        mission.id
                      }
                      className="min-w-0 rounded-xl border border-border/60 bg-card/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
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

                      <h3 className="mt-2 break-words text-sm font-semibold">
                        {
                          mission.objective
                        }
                      </h3>

                      <p className="mt-2 line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground">
                        {
                          mission.instruction
                        }
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MiniMetric
                          label="Handoffs"
                          value={
                            missionHandoffs.length
                          }
                        />

                        <MiniMetric
                          label="Completed"
                          value={
                            completedHandoffs
                          }
                        />

                        <MiniMetric
                          label="Accepted"
                          value={
                            acceptedHandoffs
                          }
                          warning={
                            acceptedHandoffs >
                            0
                          }
                        />

                        <MiniMetric
                          label="Failed"
                          value={
                            failedRuns
                          }
                          warning={
                            failedRuns >
                            0
                          }
                        />
                      </div>

                      {acceptedHandoffs >
                      0 ? (
                        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                          <p className="flex items-start gap-2 text-xs leading-relaxed text-warning">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                            This mission
                            currently has
                            an accepted
                            handoff. The
                            executor will
                            not skip past
                            it.
                          </p>
                        </div>
                      ) : null}

                      {failedRuns >
                      0 ? (
                        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                          <p className="flex items-start gap-2 text-xs leading-relaxed text-destructive">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                            This mission
                            contains
                            recorded
                            failed runs.
                            Audit history
                            remains
                            preserved.
                          </p>
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

      <section className="glass-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Operational truth
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Capability must be real,
              ordered and auditable
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              An active employee profile
              proves the worker is
              allowed to receive work. A
              pending handoff proves work
              is assigned. An accepted
              handoff proves that stage
              has been claimed. A running
              mission run proves
              execution. A completed run
              proves an internal result.
              Failed runs remain failed.
              Social publishing requires
              a real authenticated
              publishing integration.
              Visual generation requires
              a real media-generation
              workflow. Permanent
              unattended operation
              requires a server-side
              executor or scheduler.
            </p>
          </div>
        </div>
      </section>

      {/* QUEUE SUMMARY */}

      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Workforce queue
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Current Growth execution
              position
            </h2>

            {selectedMission &&
            firstIncompleteHandoff ? (
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                First incomplete stage:{" "}
                <strong className="text-foreground">
                  {nextEmployee?.name ??
                    "Unknown employee"}
                </strong>
                {" · "}
                {formatStatus(
                  firstIncompleteHandoff.status,
                )}
              </p>
            ) : null}
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
    <div className="glass-card min-w-0 p-4">
      <div className="break-words text-[10px] uppercase tracking-widest text-muted-foreground">
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
    <div className="min-w-0 rounded-lg border border-border/50 bg-background/30 p-2 text-center">
      <div
        className={
          warning
            ? "text-sm font-semibold text-warning"
            : "text-sm font-semibold"
        }
      >
        {value}
      </div>

      <div className="mt-0.5 break-words text-[9px] uppercase tracking-widest text-muted-foreground">
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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="break-words font-medium text-foreground sm:max-w-[58%] sm:text-right">
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
    <article className="glass-card min-w-0 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-3 break-words font-display text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
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
      className={`w-fit max-w-full shrink-0 break-words rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
