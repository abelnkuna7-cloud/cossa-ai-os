import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useMemo,
  useState,
  type LucideIcon,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  ChevronRight,
  ClipboardList,
  Code2,
  Command,
  FileCheck2,
  FilePenLine,
  Filter,
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
  Store,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

import {
  COSSA_GROWTH_WORKFORCE,
  canonicalEmployeeKey,
  completeControlledWorkforceRun,
  createDirectEmployeeMission,
  createGrowthCoordinationMission,
  failControlledWorkforceRun,
  installCossaGrowthWorkforce,
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
  mergeHandoffRetainedRecordIds,
  startControlledWorkforceRun,
  type AiEmployee,
  type Approval,
  type EmployeeHandoff,
  type Mission,
  type MissionRun,
} from "@/lib/workforce-data";

import {
  DEFAULT_LEAD_HUNTER_REQUEST,
  buildHuntSummary,
  huntProspects,
  saveProspectsToCrm,
  type LeadHunterProspect,
  type LeadHunterSearchResponse,
} from "@/lib/lead-hunter-data";

import { streamChat } from "@/lib/ai-stream";

import {
  checkOfficialWebsite,
  type OfficialWebsiteHealthReport,
} from "@/lib/website-health";

import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type WorkforceView =
  | "command"
  | "departments"
  | "employees"
  | "workflows"
  | "activity"
  | "control";

type WorkforceDepartment =
  | "all"
  | "executive"
  | "growth"
  | "store"
  | "tech"
  | "revenue";

interface WorkforceSearch {
  view: WorkforceView;
  department: WorkforceDepartment;
}

type OperationalState =
  | "working"
  | "idle"
  | "waiting"
  | "approval"
  | "attention"
  | "inactive";

type EmployeeExecutionMode =
  | "lead-hunter"
  | "website-assisted-llm"
  | "language-model"
  | "not-connected";

interface EmployeeExecutionCapability {
  mode: EmployeeExecutionMode;
  executable: boolean;
  label: string;
  providerLabel: string;
  detail: string;
}

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
  historicalFailureCount: number;
  retryReady: boolean;
}

interface DepartmentDefinition {
  key: Exclude<
    WorkforceDepartment,
    "all"
  >;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  employeeKeys: readonly string[];
}

interface ResponsibilityDefinition {
  employeeKey: string;
  label: string;
  keywords: readonly string[];
}

interface EmployeeDirectoryItem {
  employee: AiEmployee;
  operational: EmployeeOperationalView;
  execution: EmployeeExecutionCapability;
  departmentKeys: string[];
  responsibilityLabels: string[];
  searchText: string;
}

interface DirectAssignmentRequest {
  employee: AiEmployee;
  objective: string;
  targetMarket: string;
  targetLocation: string;
  targetService: string;
  hunterResultCount: number;
  saveHunterProspectsToCrm: boolean;
}

interface HunterExecutionOptions {
  resultCount: number;
  saveToCrm: boolean;
}

/* -------------------------------------------------------------------------- */
/* ROUTE SEARCH                                                               */
/* -------------------------------------------------------------------------- */

const WORKFORCE_VIEWS: readonly WorkforceView[] = [
  "command",
  "departments",
  "employees",
  "workflows",
  "activity",
  "control",
];

const WORKFORCE_DEPARTMENTS: readonly WorkforceDepartment[] = [
  "all",
  "executive",
  "growth",
  "store",
  "tech",
  "revenue",
];

function isWorkforceView(
  value: unknown,
): value is WorkforceView {
  return (
    typeof value === "string" &&
    WORKFORCE_VIEWS.includes(
      value as WorkforceView,
    )
  );
}

function isWorkforceDepartment(
  value: unknown,
): value is WorkforceDepartment {
  return (
    typeof value === "string" &&
    WORKFORCE_DEPARTMENTS.includes(
      value as WorkforceDepartment,
    )
  );
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route =
  createFileRoute(
    "/ai/workforce",
  )({
    validateSearch: (
      search: Record<
        string,
        unknown
      >,
    ): WorkforceSearch => ({
      view: isWorkforceView(
        search.view,
      )
        ? search.view
        : "command",

      department:
        isWorkforceDepartment(
          search.department,
        )
          ? search.department
          : "all",
    }),

    component: AiWorkforce,

    head: () => ({
      meta: [
        {
          title:
            "AI Workforce — Cossa AI",
        },
        {
          name:
            "description",
          content:
            "Cossa Nexus Holdings AI company command centre for departments, employees, coordinated missions, operational execution and owner-controlled actions.",
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

const LEAD_HUNTER_PROVIDER =
  "cossa_tool" as const;

const LEAD_HUNTER_EXECUTOR_NAME =
  "lead-hunter-search-v1";

const MAX_STAGE_PROMPT_CHARS =
  6_000;

const MAX_PRIOR_OUTPUTS =
  2;

const MAX_PRIOR_OUTPUT_CHARS =
  900;

const MAX_AUTHORISEDEVIDENCE_ITEMS =
  2;

const MAX_AUTHORISEDEVIDENCE_CHARS =
  1_200;

const MAX_HANDOFF_CONTEXT_CHARS =
  700;

const PROVIDER_MAX_ATTEMPTS =
  3;

const PROVIDER_RETRY_DELAYS_MS = [
  2_000,
  5_000,
] as const;

const WORKFORCE_STAGE_DELAY_MS =
  2_000;

const DEFAULT_DIRECT_HUNTER_RESULTS =
  10;

const MAX_HUNTER_OUTPUT_PROSPECTS =
  10;

/* -------------------------------------------------------------------------- */
/* EXECUTABLE GROWTH WORKFLOW                                                 */
/* -------------------------------------------------------------------------- */

const EXECUTABLE_GROWTH_WORKFLOW = [
  {
    key:
      "website-seo-monitor",
    label:
      "Website intelligence",
    description:
      "Checks authorised Cossa web properties and passes verified website, SEO and content observations into the Growth system.",
    icon: Globe2,
  },
  {
    key:
      "social-strategy-planner",
    label:
      "Social strategy",
    description:
      "Builds channel strategy, audience direction, campaign angles, positioning and marketing priorities.",
    icon: Megaphone,
  },
  {
    key:
      "content-writer",
    label:
      "Content production",
    description:
      "Produces marketing, educational, awareness and conversion-focused written content.",
    icon:
      FilePenLine,
  },
  {
    key:
      "creative-media-producer",
    label:
      "Creative media",
    description:
      "Creates production-ready visual requirements for graphics, campaigns, banners and media.",
    icon:
      ImageIcon,
  },
  {
    key:
      "social-schedule-coordinator",
    label:
      "Content coordination",
    description:
      "Organises approved copy and creative packages into channel schedules and publishing queues.",
    icon:
      PanelTop,
  },
  {
    key:
      "social-media-manager",
    label:
      "Social management",
    description:
      "Owns channel readiness, publishing preparation and authorised social execution.",
    icon:
      Megaphone,
  },
  {
    key:
      "account-growth-analyst",
    label:
      "Growth analysis",
    description:
      "Analyses authorised account and campaign evidence for growth and conversion improvements.",
    icon:
      BarChart3,
  },
  {
    key:
      "paid-media-specialist",
    label:
      "Paid media",
    description:
      "Prepares advertising strategy and optimisation recommendations without unauthorised spend.",
    icon:
      KeyRound,
  },
  {
    key:
      "ai-ceo",
    label:
      "AI CEO",
    description:
      "Synthesises workforce outputs and escalates only genuine owner decisions.",
    icon:
      BrainCircuit,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* DEPARTMENT MODEL                                                           */
/* -------------------------------------------------------------------------- */

const DEPARTMENTS:
  DepartmentDefinition[] =
  [
    {
      key:
        "executive",
      name:
        "Executive Office",
      shortName:
        "Executive",
      description:
        "Company-wide coordination, owner briefing, escalation and executive decision support.",
      icon:
        BrainCircuit,
      employeeKeys: [
        "ai-ceo",
      ],
    },

    {
      key:
        "growth",
      name:
        "Marketing & Growth",
      shortName:
        "Growth",
      description:
        "Social media, SEO, content, creative production, campaign planning, account growth and paid media.",
      icon:
        Megaphone,
      employeeKeys: [
        "website-seo-monitor",
        "social-strategy-planner",
        "content-writer",
        "creative-media-producer",
        "social-schedule-coordinator",
        "social-media-manager",
        "account-growth-analyst",
        "paid-media-specialist",
      ],
    },

    {
      key:
        "store",
      name:
        "Cossa Store",
      shortName:
        "Store",
      description:
        "Catalogue operations, product intelligence, supplier sourcing, merchandising and social commerce.",
      icon:
        Store,
      employeeKeys: [
        "store-operations-manager",
        "product-intelligence-analyst",
        "supplier-sourcing-analyst",
        "broker-deal-intelligence-analyst",
        "creative-media-producer",
        "social-media-manager",
        "account-growth-analyst",
      ],
    },

    {
      key:
        "tech",
      name:
        "Cossa Tech",
      shortName:
        "Tech",
      description:
        "Website delivery, technology solutions, technical implementation, website content and SEO quality.",
      icon:
        Code2,
      employeeKeys: [
        "tech-solutions-specialist",
        "website-delivery-specialist",
        "website-seo-monitor",
        "content-writer",
        "creative-media-producer",
        "ai-ceo",
      ],
    },

    {
      key:
        "revenue",
      name:
        "Revenue & Procurement",
      shortName:
        "Revenue",
      description:
        "Lead hunting, qualification, sales conversion, customer reactivation, procurement and commercial intelligence.",
      icon:
        Search,
      employeeKeys: [
        "lead-hunter",
        "lead-intake-coordinator",
        "sales-conversion-specialist",
        "customer-reactivation-analyst",
        "broker-deal-intelligence-analyst",
        "procurement-intelligence-analyst",
        "ai-ceo",
      ],
    },
  ];

/* -------------------------------------------------------------------------- */
/* RESPONSIBILITY / SEARCH MATRIX                                             */
/* -------------------------------------------------------------------------- */

const RESPONSIBILITY_MATRIX:
  ResponsibilityDefinition[] =
  [
    {
      employeeKey:
        "ai-ceo",
      label:
        "Executive coordination",
      keywords: [
        "ceo",
        "boss",
        "executive",
        "company",
        "coordinate",
        "delegate",
        "decision",
        "briefing",
        "strategy",
        "manage team",
        "who should do this",
      ],
    },

    {
      employeeKey:
        "website-seo-monitor",
      label:
        "Website & SEO monitoring",
      keywords: [
        "seo",
        "website seo",
        "ranking",
        "website health",
        "website audit",
        "search engine",
        "meta title",
        "meta description",
        "website performance",
        "keywords",
      ],
    },

    {
      employeeKey:
        "social-strategy-planner",
      label:
        "Social strategy",
      keywords: [
        "social strategy",
        "marketing strategy",
        "campaign strategy",
        "audience",
        "content pillars",
        "marketing angle",
        "social plan",
        "facebook strategy",
        "instagram strategy",
        "tiktok strategy",
      ],
    },

    {
      employeeKey:
        "content-writer",
      label:
        "Content & copywriting",
      keywords: [
        "content",
        "write",
        "writing",
        "post",
        "caption",
        "copy",
        "article",
        "blog",
        "website copy",
        "landing page",
        "script",
        "headline",
        "description",
        "marketing copy",
      ],
    },

    {
      employeeKey:
        "creative-media-producer",
      label:
        "Creative & design production",
      keywords: [
        "flyer",
        "poster",
        "graphic",
        "design",
        "image",
        "creative",
        "brochure",
        "banner",
        "visual",
        "reel",
        "video",
        "thumbnail",
        "advert",
        "ad creative",
        "social graphic",
      ],
    },

    {
      employeeKey:
        "social-schedule-coordinator",
      label:
        "Content scheduling",
      keywords: [
        "schedule",
        "calendar",
        "content calendar",
        "posting time",
        "publishing plan",
        "queue",
        "social calendar",
      ],
    },

    {
      employeeKey:
        "social-media-manager",
      label:
        "Social media management",
      keywords: [
        "social media",
        "facebook",
        "instagram",
        "tiktok",
        "linkedin",
        "youtube",
        "whatsapp status",
        "publish",
        "social account",
        "community",
        "posting",
      ],
    },

    {
      employeeKey:
        "account-growth-analyst",
      label:
        "Growth analytics",
      keywords: [
        "analytics",
        "growth",
        "performance",
        "engagement",
        "conversion",
        "account growth",
        "audience growth",
        "metrics",
        "results",
        "improve account",
      ],
    },

    {
      employeeKey:
        "paid-media-specialist",
      label:
        "Paid advertising",
      keywords: [
        "ads",
        "advertising",
        "google ads",
        "meta ads",
        "facebook ads",
        "paid media",
        "campaign budget",
        "targeting",
        "cpc",
        "roas",
        "ad strategy",
      ],
    },

    {
      employeeKey:
        "store-operations-manager",
      label:
        "Store operations",
      keywords: [
        "store",
        "catalogue",
        "catalog",
        "merchandising",
        "store quality",
        "ecommerce operations",
        "shop",
      ],
    },

    {
      employeeKey:
        "product-intelligence-analyst",
      label:
        "Product intelligence",
      keywords: [
        "product",
        "products",
        "product research",
        "trending product",
        "product demand",
        "pricing research",
        "product opportunity",
        "what to sell",
        "dropshipping product",
      ],
    },

    {
      employeeKey:
        "supplier-sourcing-analyst",
      label:
        "Supplier sourcing",
      keywords: [
        "supplier",
        "suppliers",
        "source product",
        "sourcing",
        "manufacturer",
        "wholesaler",
        "vendor",
        "dropshipping supplier",
      ],
    },

    {
      employeeKey:
        "broker-deal-intelligence-analyst",
      label:
        "Deals & partnerships",
      keywords: [
        "deal",
        "broker",
        "partner",
        "partnership",
        "buyer",
        "distributor",
        "commercial opportunity",
        "business opportunity",
      ],
    },

    {
      employeeKey:
        "procurement-intelligence-analyst",
      label:
        "Procurement intelligence",
      keywords: [
        "tender",
        "rfq",
        "rfp",
        "procurement",
        "quotation opportunity",
        "bid",
        "government tender",
        "supplier opportunity",
      ],
    },

    {
      employeeKey:
        "customer-reactivation-analyst",
      label:
        "Customer reactivation",
      keywords: [
        "reactivate customer",
        "old customer",
        "dormant customer",
        "retention",
        "repeat customer",
        "follow up customer",
        "win back",
      ],
    },

    {
      employeeKey:
        "lead-hunter",
      label:
        "Revenue hunting",
      keywords: [
        "hunter",
        "lead hunter",
        "customers",
        "customer hunting",
        "prospects",
        "find customers",
        "opportunities",
        "revenue",
        "buyers",
        "projects",
        "tenders",
        "rfqs",
        "quick revenue",
        "sales leads",
      ],
    },

    {
      employeeKey:
        "lead-intake-coordinator",
      label:
        "Lead intake",
      keywords: [
        "lead",
        "new lead",
        "enquiry",
        "inquiry",
        "qualification",
        "customer enquiry",
        "sales lead",
        "lead intake",
        "deduplicate",
      ],
    },

    {
      employeeKey:
        "sales-conversion-specialist",
      label:
        "Sales & conversion",
      keywords: [
        "sales",
        "conversion",
        "close",
        "closing",
        "follow up",
        "outreach",
        "proposal",
        "quotation",
        "objection",
        "discovery call",
        "customer conversion",
      ],
    },

    {
      employeeKey:
        "tech-solutions-specialist",
      label:
        "Technology solutions",
      keywords: [
        "tech",
        "technology",
        "software",
        "technical",
        "system",
        "solution",
        "implementation",
        "automation",
      ],
    },

    {
      employeeKey:
        "website-delivery-specialist",
      label:
        "Website delivery",
      keywords: [
        "website",
        "build website",
        "web development",
        "landing page implementation",
        "client website",
        "web design",
        "website delivery",
      ],
    },
  ];

/* -------------------------------------------------------------------------- */
/* GENERIC HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function clampText(
  value: string,
  maxCharacters: number,
): string {
  const cleaned =
    value.trim();

  if (
    cleaned.length <=
    maxCharacters
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    Math.max(
      0,
      maxCharacters -
        80,
    ),
  )}\n\n[Context truncated by Cossa AI.]`;
}

function formatStatus(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
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
      dateStyle:
        "medium",
      timeStyle:
        "short",
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

function normaliseErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  return "Unknown workforce execution error.";
}

function isRetryableProviderError(
  error: unknown,
): boolean {
  const message =
    normaliseErrorMessage(
      error,
    ).toLowerCase();

  return [
    "rate limit",
    "rate-limit",
    "429",
    "temporarily",
    "temporary",
    "timeout",
    "timed out",
    "overloaded",
    "service unavailable",
    "unavailable",
    "bad gateway",
    "gateway timeout",
    "502",
    "503",
    "504",
    "connection reset",
    "network error",
    "fetch failed",
  ].some(
    (marker) =>
      message.includes(
        marker,
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* CANONICAL EMPLOYEE VIEW                                                    */
/* -------------------------------------------------------------------------- */

/**
 * We do NOT delete legacy duplicate DB rows here.
 *
 * We only collapse semantic duplicates in the UI so an old underscore-key
 * profile and the canonical hyphen-key profile do not appear as two employees.
 *
 * Canonical rows win whenever both exist.
 */
function canonicalEmployeeView(
  employees: AiEmployee[],
): AiEmployee[] {
  const map =
    new Map<
      string,
      AiEmployee
    >();

  for (
    const employee of
      employees
  ) {
    const canonicalKey =
      canonicalEmployeeKey(
        employee.employee_key,
      );

    const current =
      map.get(
        canonicalKey,
      );

    if (!current) {
      map.set(
        canonicalKey,
        employee,
      );
      continue;
    }

    const currentIsCanonical =
      current.employee_key ===
      canonicalKey;

    const candidateIsCanonical =
      employee.employee_key ===
      canonicalKey;

    if (
      candidateIsCanonical &&
      !currentIsCanonical
    ) {
      map.set(
        canonicalKey,
        employee,
      );
      continue;
    }

    if (
      candidateIsCanonical ===
      currentIsCanonical &&
      employee.updated_at >
        current.updated_at
    ) {
      map.set(
        canonicalKey,
        employee,
      );
    }
  }

  return Array.from(
    map.values(),
  ).sort(
    (
      left,
      right,
    ) => {
      const departmentCompare =
        employeeDepartment(
          left,
        ).localeCompare(
          employeeDepartment(
            right,
          ),
        );

      if (
        departmentCompare !==
        0
      ) {
        return departmentCompare;
      }

      return left.name.localeCompare(
        right.name,
      );
    },
  );
}

/* -------------------------------------------------------------------------- */
/* EXECUTION CAPABILITY                                                       */
/* -------------------------------------------------------------------------- */

const SOURCE_EMPLOYEE_KEYS =
  new Set(
    COSSA_GROWTH_WORKFORCE.map(
      (profile) =>
        profile.employee_key,
    ),
  );

function executionCapabilityForEmployee(
  employee: AiEmployee,
): EmployeeExecutionCapability {
  const key =
    canonicalEmployeeKey(
      employee.employee_key,
    );

  if (
    key ===
    "lead-hunter"
  ) {
    return {
      mode:
        "lead-hunter",
      executable:
        true,
      label:
        "Authenticated specialised revenue tool",
      providerLabel:
        "Cossa Lead Hunter",
      detail:
        "Runs through the authenticated /api/lead-hunter/search workflow. It does not use Groq to manufacture prospects.",
    };
  }

  if (
    key ===
    "website-seo-monitor"
  ) {
    return {
      mode:
        "website-assisted-llm",
      executable:
        true,
      label:
        "Website evidence + controlled reasoning",
      providerLabel:
        "Cossa website health + Groq",
      detail:
        "Collects real website-health evidence first, then uses the controlled language-model executor to interpret and hand the evidence forward.",
    };
  }

  if (
    SOURCE_EMPLOYEE_KEYS.has(
      key,
    )
  ) {
    return {
      mode:
        "language-model",
      executable:
        true,
      label:
        "Controlled language-model worker",
      providerLabel:
        "Groq workforce executor",
      detail:
        "A real controlled workforce execution path exists. Runtime provider failures are recorded rather than hidden.",
    };
  }

  return {
    mode:
      "not-connected",
    executable:
      false,
    label:
      "Waiting for execution integration",
    providerLabel:
      "No executor configured",
    detail:
      "This employee record exists, but no verified execution adapter is registered for it yet.",
  };
}

/* -------------------------------------------------------------------------- */
/* SEARCH HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function departmentKeysForEmployee(
  employeeKey: string,
): string[] {
  const canonicalKey =
    canonicalEmployeeKey(
      employeeKey,
    );

  return DEPARTMENTS.filter(
    (department) =>
      department.employeeKeys.includes(
        canonicalKey,
      ),
  ).map(
    (department) =>
      department.key,
  );
}

function responsibilityLabelsForEmployee(
  employeeKey: string,
): string[] {
  const canonicalKey =
    canonicalEmployeeKey(
      employeeKey,
    );

  return RESPONSIBILITY_MATRIX.filter(
    (item) =>
      item.employeeKey ===
      canonicalKey,
  ).map(
    (item) =>
      item.label,
  );
}

function searchTermsForEmployee(
  employee: AiEmployee,
): string {
  const canonicalKey =
    canonicalEmployeeKey(
      employee.employee_key,
    );

  const responsibilityTerms =
    RESPONSIBILITY_MATRIX.filter(
      (item) =>
        item.employeeKey ===
        canonicalKey,
    ).flatMap(
      (item) => [
        item.label,
        ...item.keywords,
      ],
    );

  const departmentTerms =
    DEPARTMENTS.filter(
      (department) =>
        department.employeeKeys.includes(
          canonicalKey,
        ),
    ).flatMap(
      (department) => [
        department.name,
        department.shortName,
        department.description,
      ],
    );

  return [
    employee.name,
    employee.title,
    canonicalKey,
    employee.department ??
      "",
    employee.mission ??
      "",
    ...responsibilityTerms,
    ...departmentTerms,
  ]
    .join(" ")
    .toLowerCase();
}

function searchScore(
  employee: EmployeeDirectoryItem,
  query: string,
): number {
  const q =
    query
      .trim()
      .toLowerCase();

  if (!q) {
    return 0;
  }

  let score = 0;

  const employeeName =
    employee.employee.name.toLowerCase();

  const employeeTitle =
    employee.employee.title.toLowerCase();

  const employeeKey =
    canonicalEmployeeKey(
      employee.employee.employee_key,
    ).toLowerCase();

  if (
    employeeName === q ||
    employeeTitle === q
  ) {
    score += 200;
  }

  if (
    employeeName.includes(
      q,
    )
  ) {
    score += 100;
  }

  if (
    employeeTitle.includes(
      q,
    )
  ) {
    score += 90;
  }

  if (
    employeeKey.includes(
      q,
    )
  ) {
    score += 80;
  }

  for (
    const responsibility of
      RESPONSIBILITY_MATRIX
  ) {
    if (
      responsibility.employeeKey !==
      employeeKey
    ) {
      continue;
    }

    if (
      responsibility.label
        .toLowerCase()
        .includes(q)
    ) {
      score += 75;
    }

    for (
      const keyword of
        responsibility.keywords
    ) {
      const keywordLower =
        keyword.toLowerCase();

      if (
        keywordLower ===
        q
      ) {
        score += 120;
      } else if (
        keywordLower.includes(
          q,
        ) ||
        q.includes(
          keywordLower,
        )
      ) {
        score += 55;
      }
    }
  }

  if (
    employee.searchText.includes(
      q,
    )
  ) {
    score += 20;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT COMPACTION                                                         */
/* -------------------------------------------------------------------------- */

function compactPriorOutputsForPrompt(
  outputs: string[],
): string[] {
  return outputs
    .map(
      (output) =>
        output.trim(),
    )
    .filter(Boolean)
    .slice(
      -MAX_PRIOR_OUTPUTS,
    )
    .map(
      (output) =>
        clampText(
          output,
          MAX_PRIOR_OUTPUT_CHARS,
        ),
    );
}

function compactAuthorisedEvidence(
  evidence: string[],
): string[] {
  return evidence
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean)
    .slice(
      0,
      MAX_AUTHORISEDEVIDENCE_ITEMS,
    )
    .map(
      (item) =>
        clampText(
          item,
          MAX_AUTHORISEDEVIDENCE_CHARS,
        ),
    );
}

/* -------------------------------------------------------------------------- */
/* WORKFLOW HELPERS                                                           */
/* -------------------------------------------------------------------------- */

function handoffStageNumber(
  handoff: EmployeeHandoff,
): number | null {
  const stage =
    handoff.context?.stage;

  return (
    typeof stage ===
      "number" &&
    Number.isFinite(
      stage,
    )
  )
    ? stage
    : null;
}

function sortWorkflowHandoffs(
  handoffs: EmployeeHandoff[],
): EmployeeHandoff[] {
  return [
    ...handoffs,
  ].sort(
    (
      left,
      right,
    ) => {
      const leftStage =
        handoffStageNumber(
          left,
        );

      const rightStage =
        handoffStageNumber(
          right,
        );

      if (
        leftStage !==
          null &&
        rightStage !==
          null &&
        leftStage !==
          rightStage
      ) {
        return (
          leftStage -
          rightStage
        );
      }

      return left.created_at.localeCompare(
        right.created_at,
      );
    },
  );
}

function nextWorkflowEmployeeForHandoff({
  currentHandoff,
  workflowHandoffs,
  employees,
}: {
  currentHandoff: EmployeeHandoff;
  workflowHandoffs: EmployeeHandoff[];
  employees: AiEmployee[];
}): AiEmployee | null {
  const ordered =
    sortWorkflowHandoffs(
      workflowHandoffs,
    );

  const currentIndex =
    ordered.findIndex(
      (handoff) =>
        handoff.id ===
        currentHandoff.id,
    );

  if (
    currentIndex <
      0 ||
    currentIndex >=
      ordered.length -
        1
  ) {
    return null;
  }

  const nextHandoff =
    ordered[
      currentIndex + 1
    ];

  return (
    employees.find(
      (employee) =>
        employee.id ===
        nextHandoff.to_employee_id,
    ) ??
    null
  );
}

/* -------------------------------------------------------------------------- */
/* OPERATIONAL STATE                                                          */
/* -------------------------------------------------------------------------- */

function employeeOperationalView({
  employee,
  handoffs,
  runs,
  approvals,
  execution,
}: {
  employee: AiEmployee;
  handoffs: EmployeeHandoff[];
  runs: MissionRun[];
  approvals: Approval[];
  execution: EmployeeExecutionCapability;
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
        (run) =>
          run.id,
      ),
    );

  const employeeApprovals =
    approvals.filter(
      (approval) =>
        approval.requested_by_employee_id ===
          employee.id ||
        (
          approval.run_id !==
            null &&
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

  const orderedHandoffs = [
    ...employeeHandoffs,
  ].sort(
    (
      left,
      right,
    ) =>
      right.created_at.localeCompare(
        left.created_at,
      ),
  );

  const orderedRuns = [
    ...employeeRuns,
  ].sort(
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
  );

  const latestHandoff =
    orderedHandoffs[0];

  const latestRun =
    orderedRuns[0];

  const latestFailure =
    latestRun?.status ===
    "failed"
      ? latestRun.error_message ||
        latestRun.error_code ||
        "The latest recorded run failed."
      : null;

  const retryReady =
    latestRun?.status ===
      "failed" &&
    pendingHandoffs.length >
      0;

  const latestActivityCandidates =
    [
      latestRun
        ? latestRunTime(
            latestRun,
          )
        : "",
      latestHandoff
        ?.completed_at ??
        "",
      latestHandoff
        ?.accepted_at ??
        "",
      latestHandoff
        ?.created_at ??
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
    )[0] ?? null;

  const currentTask =
    acceptedHandoffs[0]
      ?.reason ??
    pendingHandoffs[0]
      ?.reason ??
    latestHandoff
      ?.reason ??
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
    historicalFailureCount:
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
    retryReady,
  };

  if (
    employee.status !==
    "active"
  ) {
    return {
      ...common,
      state:
        "inactive",
      label: `${formatStatus(
        employee.status,
      )} — Not operational`,
      detail:
        employee.status ===
        "paused"
          ? "This employee is paused and cannot receive new work."
          : employee.status ===
              "retired"
            ? "This employee is retired."
            : "This employee profile is not currently active.",
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
        "A real workforce run or accepted handoff is currently recorded.",
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
        "Recorded work has reached an owner-controlled approval checkpoint.",
    };
  }

  if (
    retryReady
  ) {
    return {
      ...common,
      state:
        "waiting",
      label:
        "Active — Retry ready",
      detail:
        "The previous attempt failed, but the task safely returned to pending.",
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
        "The latest workforce run failed and has not returned to a retryable state.",
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
        "A real task is assigned and waiting for the workforce executor.",
    };
  }

  if (
    !execution.executable
  ) {
    return {
      ...common,
      state:
        "waiting",
      label:
        "Active — Waiting for integration",
      currentTask:
        "No executable task path is connected",
      detail:
        execution.detail,
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
      "The employee has a registered execution path and is available for a real task.",
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

  const content = (
    run.output as {
      content?: unknown;
    }
  ).content;

  return (
    typeof content ===
      "string" &&
    content.trim()
  )
    ? content
    : null;
}

function websiteReportEvidence(
  report: OfficialWebsiteHealthReport,
): string {
  return [
    "Official Cossa website health",
    `Website: ${report.website}`,
    `Availability: ${report.availability}`,
    `HTTP: ${
      report.http_status ??
      "unknown"
    }`,
    `Response: ${
      report.response_time_ms ??
      "unknown"
    } ms`,
    `Title: ${
      report.page_title ??
      "not detected"
    }`,
    `Noindex: ${
      report.noindex_detected
        ? "yes"
        : "no"
    }`,
    `Issues: ${
      report.issues.length >
      0
        ? report.issues.join(
            "; ",
          )
        : "none"
    }`,
  ].join("\n");
}

function buildLeadHunterInstruction({
  objective,
  targetLocation,
  targetService,
  resultCount,
}: {
  objective: string;
  targetLocation: string | null;
  targetService: string | null;
  resultCount: number;
}): string {
  const lines = [
    objective.trim(),
  ];

  if (
    targetService?.trim()
  ) {
    lines.push(
      `Services: ${targetService.trim()}`,
    );
  }

  if (
    targetLocation?.trim()
  ) {
    lines.push(
      `Location: ${targetLocation.trim()}`,
    );
  }

  lines.push(
    `Results: ${resultCount}`,
  );

  lines.push(
    "Prioritise evidence quality, realistic revenue potential, contactability and practical next actions.",
  );

  lines.push(
    "Do not contact prospects automatically.",
  );

  return lines.join(
    "\n",
  );
}

function formatHunterProspect(
  prospect: LeadHunterProspect,
  index: number,
): string {
  const evidenceUrls =
    prospect.evidence
      .slice(
        0,
        3,
      )
      .map(
        (item) =>
          item.url,
      );

  return [
    `${index + 1}. ${prospect.organisation_name}`,
    `Service: ${prospect.recommended_service}`,
    `Classification: ${prospect.classification}`,
    `Verification: ${prospect.verification_status}`,
    `Priority: ${prospect.sales_priority}`,
    `Score: ${prospect.total_score}/100`,
    `Revenue potential: ${prospect.revenue_potential_score}/100`,
    `Ease to close: ${prospect.ease_to_close_score}/100`,
    `Location: ${
      [
        prospect.city,
        prospect.province,
        prospect.country,
      ]
        .filter(Boolean)
        .join(", ") ||
      "Not confirmed"
    }`,
    `Phone: ${
      prospect.public_phone ??
      "Not found"
    }`,
    `Email: ${
      prospect.public_email ??
      "Not found"
    }`,
    `Website: ${
      prospect.website ??
      "Not found"
    }`,
    `Opportunity: ${prospect.opportunity_summary}`,
    `Next action: ${prospect.next_action}`,
    evidenceUrls.length >
    0
      ? `Evidence: ${evidenceUrls.join(
          " | ",
        )}`
      : "Evidence: No valid evidence URL retained",
  ].join("\n");
}

function buildLeadHunterWorkforceOutput({
  response,
  crmCreated,
  crmDuplicates,
  crmFailed,
  crmSaveRequested,
}: {
  response: LeadHunterSearchResponse;
  crmCreated: number;
  crmDuplicates: number;
  crmFailed: number;
  crmSaveRequested: boolean;
}): string {
  const summary =
    buildHuntSummary(
      response.request,
    );

  const prospects =
    response.prospects
      .slice(
        0,
        MAX_HUNTER_OUTPUT_PROSPECTS,
      )
      .map(
        formatHunterProspect,
      );

  return [
    "LEAD HUNTER EXECUTION",
    "",
    `Hunt ID: ${response.hunt_id}`,
    `Status: ${response.status}`,
    `Providers used: ${
      response.providers_used.length >
      0
        ? response.providers_used.join(
            ", ",
          )
        : "No provider name returned"
    }`,
    `Sources inspected/returned: ${response.source_count}`,
    `Accepted prospects: ${response.accepted_count}`,
    `Rejected prospects: ${response.rejected_count}`,
    "",
    "HUNT CONFIGURATION",
    ...summary.map(
      (item) =>
        `- ${item}`,
    ),
    "",
    "CRM ROUTING",
    crmSaveRequested
      ? `CRM save requested: YES. Created ${crmCreated}, duplicate/existing ${crmDuplicates}, failed ${crmFailed}.`
      : "CRM save requested: NO. Prospects remain research output until a separate authorised CRM action is requested.",
    "",
    "VERIFIED / ACCEPTED PROSPECTS",
    ...(prospects.length >
    0
      ? prospects
      : [
          "No prospect passed the current Hunter acceptance rules. Zero fabricated leads were created.",
        ]),
    "",
    "WARNINGS",
    ...(response.warnings.length >
    0
      ? response.warnings.map(
          (warning) =>
            `- ${warning}`,
        )
      : [
          "- No Hunter warning was returned.",
        ]),
    "",
    "EXTERNAL ACTIONS STATUS",
    "No prospect was contacted automatically.",
    "No tender was submitted automatically.",
    "No binding commercial commitment was made.",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* COMPACT CONTROLLED STAGE PROMPT                                            */
/* -------------------------------------------------------------------------- */

function controlledStagePrompt({
  mission,
  handoff,
  employee,
  nextEmployee,
  priorOutputs,
  authorisedEvidence,
}: {
  mission: Mission;
  handoff: EmployeeHandoff;
  employee: AiEmployee;
  nextEmployee: AiEmployee | null;
  priorOutputs: string[];
  authorisedEvidence: string[];
}): string {
  const compactPrevious =
    compactPriorOutputsForPrompt(
      priorOutputs,
    );

  const compactEvidence =
    compactAuthorisedEvidence(
      authorisedEvidence,
    );

  const stage =
    handoffStageNumber(
      handoff,
    );

  const totalStages =
    typeof handoff.context
      ?.total_stages ===
    "number"
      ? handoff.context
          .total_stages
      : null;

  const safeHandoffContext =
    clampText(
      JSON.stringify(
        handoff.context,
      ),
      MAX_HANDOFF_CONTEXT_CHARS,
    );

  const nextInstruction =
    nextEmployee
      ? `Next recorded worker: ${nextEmployee.name} (${canonicalEmployeeKey(
          nextEmployee.employee_key,
        )}). Hand work only to that worker.`
      : "This is the final recorded stage. Do not invent another worker.";

  const evidence =
    compactEvidence.length >
    0
      ? compactEvidence.join(
          "\n\n",
        )
      : "No extra authorised evidence.";

  const previous =
    compactPrevious.length >
    0
      ? compactPrevious
          .map(
            (
              output,
              index,
            ) =>
              `Prior output ${index + 1}:\n${output}`,
          )
          .join(
            "\n\n",
          )
      : "No prior output required.";

  const prompt = [
    `Role: ${employee.title} (${canonicalEmployeeKey(
      employee.employee_key,
    )}).`,
    `Department: ${employee.department}.`,
    stage !== null
      ? `Workflow stage: ${stage}${
          totalStages
            ? `/${totalStages}`
            : ""
        }.`
      : "",
    `Assigned work: ${handoff.reason}`,
    `Mission objective: ${mission.objective}`,
    `Target: ${
      mission.target_market ||
      "unspecified"
    } / ${
      mission.target_location ||
      "unspecified"
    }.`,
    nextInstruction,

    "Complete the safe internal work now.",
    "Use verified Cossa information only.",
    "Do not invent customers, suppliers, products, prices, results, account access, publication, spend or external actions.",
    "Normal research, analysis, drafting, content, visual briefs, scheduling and internal handoffs do not need owner approval.",
    "Escalate only money, legal commitments, supplier orders, credentials, destructive changes, irreversible changes or sensitive external communication.",
    "If something is missing, name the missing information or integration briefly.",
    "Do not repeat earlier outputs unnecessarily.",
    "For visual-dependent work, provide format, subject, headline, key text, brand treatment, channel/dimensions and CTA.",
    "Never claim publishing or asset generation unless verified execution exists.",

    "Return these short sections:",
    "Verified inputs",
    "Work completed",
    "Visual or media requirements",
    "Missing information or integrations",
    "Handoff to next employee",
    "High-risk owner decisions required",
    "External actions status",

    `Context: ${safeHandoffContext}`,
    `Evidence:\n${evidence}`,
    previous,
  ]
    .filter(Boolean)
    .join("\n\n");

  return clampText(
    prompt,
    MAX_STAGE_PROMPT_CHARS,
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

function AiWorkforce() {
  const queryClient =
    useQueryClient();

  const navigate =
    useNavigate({
      from:
        "/ai/workforce",
    });

  const search =
    Route.useSearch();

  const view =
    search.view;

  const selectedDepartment =
    search.department;

  const [
    employeeSearch,
    setEmployeeSearch,
  ] =
    useState("");

  const [
    selectedEmployeeId,
    setSelectedEmployeeId,
  ] =
    useState<
      string | null
    >(null);

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

  const [
    ceoCommand,
    setCeoCommand,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* URL NAVIGATION                                                           */
  /* ------------------------------------------------------------------------ */

  function setView(
    nextView: WorkforceView,
  ) {
    void navigate({
      search:
        (
          previous,
        ) => ({
          ...previous,
          view:
            nextView,
        }),
    });
  }

  function setSelectedDepartment(
    department: WorkforceDepartment,
  ) {
    void navigate({
      search:
        (
          previous,
        ) => ({
          ...previous,
          department,
        }),
    });
  }

  function openEmployees(
    department: WorkforceDepartment = "all",
  ) {
    void navigate({
      search:
        (
          previous,
        ) => ({
          ...previous,
          view:
            "employees",
          department,
        }),
    });
  }

  function openDepartment(
    department:
      Exclude<
        WorkforceDepartment,
        "all"
      >,
  ) {
    setEmployeeSearch(
      "",
    );

    setSelectedEmployeeId(
      null,
    );

    openEmployees(
      department,
    );
  }

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
        async (
          result,
        ) => {
          await refreshWorkforce();

          const canonicalResult =
            canonicalEmployeeView(
              result,
            );

          const activeCount =
            canonicalResult.filter(
              (employee) =>
                employee.status ===
                "active",
            ).length;

          toast.success(
            "Cossa workforce synchronised",
            {
              description: `${canonicalResult.length} canonical workforce profiles are represented and ${activeCount} are active. Legacy database records were preserved.`,
            },
          );
        },

      onError:
        (error) => {
          toast.error(
            "Workforce setup could not be completed",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
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
          handoffs:
            createdHandoffs,
        }) => {
          setSelectedMissionId(
            mission.id,
          );

          await refreshWorkforce();

          toast.success(
            "CEO mission created",
            {
              description: `${createdHandoffs.length} real workforce handoff stages were created.`,
            },
          );

          setView(
            "workflows",
          );
        },

      onError:
        (error) => {
          toast.error(
            "Mission could not be created",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
            },
          );
        },
    });

  /* ------------------------------------------------------------------------ */
  /* SOURCE DATA                                                              */
  /* ------------------------------------------------------------------------ */

  const rawEmployees =
    employeesQuery.data ??
    [];

  const employees =
    useMemo(
      () =>
        canonicalEmployeeView(
          rawEmployees,
        ),
      [
        rawEmployees,
      ],
    );

  const legacyDuplicateCount =
    Math.max(
      0,
      rawEmployees.length -
        employees.length,
    );

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
              canonicalEmployeeKey(
                employee.employee_key,
              ),
              employee,
            ],
          ),
        ),
      [
        employees,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* OPERATIONAL DIRECTORY                                                    */
  /* ------------------------------------------------------------------------ */

  const employeeOperationalViews =
    useMemo(
      () =>
        employees.map(
          (
            employee,
          ) => {
            const execution =
              executionCapabilityForEmployee(
                employee,
              );

            return {
              employee,
              execution,

              operational:
                employeeOperationalView({
                  employee,
                  handoffs,
                  runs,
                  approvals,
                  execution,
                }),
            };
          },
        ),
      [
        employees,
        handoffs,
        runs,
        approvals,
      ],
    );

  const employeeDirectory =
    useMemo<
      EmployeeDirectoryItem[]
    >(
      () =>
        employeeOperationalViews.map(
          ({
            employee,
            operational,
            execution,
          }) => ({
            employee,
            operational,
            execution,

            departmentKeys:
              departmentKeysForEmployee(
                employee.employee_key,
              ),

            responsibilityLabels:
              responsibilityLabelsForEmployee(
                employee.employee_key,
              ),

            searchText:
              searchTermsForEmployee(
                employee,
              ),
          }),
        ),
      [
        employeeOperationalViews,
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
    }, [
      employeeOperationalViews,
    ]);

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

  const searchedEmployees =
    useMemo(() => {
      const query =
        employeeSearch
          .trim()
          .toLowerCase();

      return employeeDirectory
        .filter(
          (item) => {
            if (
              selectedDepartment !==
                "all" &&
              !item.departmentKeys.includes(
                selectedDepartment,
              )
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return (
              searchScore(
                item,
                query,
              ) >
              0
            );
          },
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (!query) {
              if (
                left.operational.state ===
                  "working" &&
                right.operational.state !==
                  "working"
              ) {
                return -1;
              }

              if (
                right.operational.state ===
                  "working" &&
                left.operational.state !==
                  "working"
              ) {
                return 1;
              }

              return left.employee.name.localeCompare(
                right.employee.name,
              );
            }

            return (
              searchScore(
                right,
                query,
              ) -
              searchScore(
                left,
                query,
              )
            );
          },
        );
    }, [
      employeeDirectory,
      employeeSearch,
      selectedDepartment,
    ]);

  const selectedEmployee =
    employeeDirectory.find(
      (item) =>
        item.employee.id ===
        selectedEmployeeId,
    ) ??
    null;

  /* ------------------------------------------------------------------------ */
  /* READINESS                                                                */
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
      ) => {
        const employee =
          employeesByKey.get(
            step.key,
          );

        return (
          employee?.status ===
            "active" &&
          executionCapabilityForEmployee(
            employee,
          ).executable
        );
      },
    );

  /* ------------------------------------------------------------------------ */
  /* MISSION DATA                                                             */
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
      ? sortWorkflowHandoffs(
          handoffs.filter(
            (
              handoff,
            ) =>
              handoff.mission_id ===
              selectedMission.id,
          ),
        )
      : [];

  const firstIncompleteHandoff =
    selectedMissionHandoffs.find(
      (
        handoff,
      ) =>
        handoff.status !==
        "completed",
    ) ??
    null;

  const nextHandoff =
    firstIncompleteHandoff
      ?.status ===
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
        ) ??
        null
      : null;

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
          run: MissionRun;
          content: string;
        } =>
          Boolean(
            item.content,
          ),
      );

  const displayReviewableOutputs =
    [
      ...reviewableOutputs,
    ].reverse();

  const selectedMissionFailedRuns =
    selectedMissionRuns.filter(
      (
        run,
      ) =>
        run.status ===
        "failed",
    );

  const selectedMissionCompletedRuns =
    selectedMissionRuns.filter(
      (
        run,
      ) =>
        run.status ===
        "completed",
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
  /* CEO COMMAND                                                              */
  /* ------------------------------------------------------------------------ */

  function submitCeoCommand() {
    const command =
      ceoCommand.trim();

    if (!command) {
      return;
    }

    if (
      activeExecutableWorkflowEmployees.length !==
      EXECUTABLE_GROWTH_WORKFLOW.length
    ) {
      toast.error(
        "Growth workforce is not fully executable",
        {
          description: `${activeExecutableWorkflowEmployees.length} of ${EXECUTABLE_GROWTH_WORKFLOW.length} Growth employees currently have active executable paths.`,
        },
      );

      return;
    }

    setObjective(
      command,
    );

    coordinationMutation.mutate({
      objective:
        command,

      target_market:
        targetMarket,

      target_location:
        targetLocation,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* PROVIDER EXECUTION                                                       */
  /* ------------------------------------------------------------------------ */

  async function executeProviderWithRetry({
    prompt,
    employee,
  }: {
    prompt: string;
    employee: AiEmployee;
  }): Promise<string> {
    let lastError:
      unknown =
      null;

    for (
      let attempt = 1;
      attempt <=
      PROVIDER_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const content =
          await streamChat(
            [
              {
                role:
                  "user",

                content:
                  prompt,
              },
            ],

            () =>
              undefined,

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

        return content.trim();
      } catch (error) {
        lastError =
          error;

        const retryable =
          isRetryableProviderError(
            error,
          );

        const hasAnotherAttempt =
          attempt <
          PROVIDER_MAX_ATTEMPTS;

        if (
          !retryable ||
          !hasAnotherAttempt
        ) {
          break;
        }

        const delay =
          PROVIDER_RETRY_DELAYS_MS[
            attempt -
              1
          ] ??
          5_000;

        console.warn(
          `Cossa AI provider attempt ${attempt} failed for ${canonicalEmployeeKey(
            employee.employee_key,
          )}. Retrying in ${delay}ms.`,
          error,
        );

        await sleep(
          delay,
        );
      }
    }

    throw lastError instanceof
    Error
      ? lastError
      : new Error(
          "The workforce provider failed after all retry attempts.",
        );
  }

  /* ------------------------------------------------------------------------ */
  /* LEAD HUNTER EXECUTOR                                                     */
  /* ------------------------------------------------------------------------ */

  async function executeLeadHunter({
    mission,
    handoff,
    employee,
    workflowHandoffs,
    hunterOptions,
  }: {
    mission: Mission;
    handoff: EmployeeHandoff;
    employee: AiEmployee;
    workflowHandoffs: EmployeeHandoff[];
    hunterOptions?: HunterExecutionOptions;
  }): Promise<{
    content: string;
    finalStage: boolean;
  }> {
    const resultCount =
      Math.max(
        1,
        Math.min(
          50,
          Math.round(
            hunterOptions
              ?.resultCount ??
              mission.required_result_count ??
              DEFAULT_DIRECT_HUNTER_RESULTS,
          ),
        ),
      );

    const instruction =
      buildLeadHunterInstruction({
        objective:
          mission.objective,

        targetLocation:
          mission.target_location,

        targetService:
          mission.target_service,

        resultCount,
      });

    const run =
      await startControlledWorkforceRun({
        mission,
        handoff,
        employee,

        provider:
          LEAD_HUNTER_PROVIDER,

        modelName:
          LEAD_HUNTER_EXECUTOR_NAME,

        executionKind:
          "tool",

        priorOutputs:
          [],

        authorisedEvidence:
          [],
      });

    try {
      const searchResponse =
        await huntProspects({
          ...DEFAULT_LEAD_HUNTER_REQUEST,

          search_instruction:
            instruction,

          result_count:
            resultCount,

          locations:
            mission.target_location
              ?.trim()
              ? [
                  mission.target_location.trim(),
                ]
              : DEFAULT_LEAD_HUNTER_REQUEST.locations,

          notes:
            mission.objective,

          use_cached_results:
            true,

          exclude_existing_crm_leads:
            true,

          exclude_competitors:
            true,

          exclude_directories:
            true,

          exclude_expired_procurement:
            true,
        });

      let crmCreated =
        0;

      let crmDuplicates =
        0;

      let crmFailed =
        0;

      let createdLeadIds:
        string[] =
        [];

      let duplicateLeadIds:
        string[] =
        [];

      const saveToCrm =
        hunterOptions
          ?.saveToCrm ??
        false;

      if (
        saveToCrm &&
        searchResponse.prospects.length >
          0
      ) {
        const crmResult =
          await saveProspectsToCrm(
            searchResponse.prospects,
          );

        crmCreated =
          crmResult.created.length;

        crmDuplicates =
          crmResult.duplicates.length;

        crmFailed =
          crmResult.failed.length;

        createdLeadIds =
          crmResult.created.map(
            (item) =>
              item.lead_id,
          );

        duplicateLeadIds =
          crmResult.duplicates.map(
            (item) =>
              item.lead_id,
          );
      }

      await mergeHandoffRetainedRecordIds({
        handoffId:
          handoff.id,

        missionId:
          mission.id,

        recordIds: {
          hunt_id:
            searchResponse.hunt_id,

          prospect_ids:
            searchResponse.prospects.map(
              (prospect) =>
                prospect.id,
            ),

          lead_ids:
            createdLeadIds,

          duplicate_lead_ids:
            duplicateLeadIds,

          providers_used:
            searchResponse.providers_used,

          accepted_count:
            searchResponse.accepted_count,

          rejected_count:
            searchResponse.rejected_count,

          crm_save_requested:
            saveToCrm,
        },
      });

      const content =
        buildLeadHunterWorkforceOutput({
          response:
            searchResponse,

          crmCreated,

          crmDuplicates,

          crmFailed,

          crmSaveRequested:
            saveToCrm,
        });

      const result =
        await completeControlledWorkforceRun({
          run,
          handoff,
          employee,
          content,
        });

      /**
       * We currently preserve and expose the next employee through the recorded
       * workflow rather than creating a duplicate runtime handoff here.
       *
       * In Revenue acquisition missions the Lead Intake handoff already exists.
       * In direct single-employee assignments there is intentionally no fake
       * downstream handoff.
       */
      void workflowHandoffs;

      return {
        content,

        finalStage:
          result.finalStage,
      };
    } catch (error) {
      const message =
        normaliseErrorMessage(
          error,
        );

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
          "Unable to record Lead Hunter workforce failure",
          cleanupError,
        );
      }

      throw error;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* EXECUTE ONE HANDOFF                                                      */
  /* ------------------------------------------------------------------------ */

  async function executeControlledHandoff({
    mission,
    handoff,
    employee,
    priorOutputs,
    workflowHandoffs,
    hunterOptions,
  }: {
    mission: Mission;
    handoff: EmployeeHandoff;
    employee: AiEmployee;
    priorOutputs: string[];
    workflowHandoffs: EmployeeHandoff[];
    hunterOptions?: HunterExecutionOptions;
  }): Promise<{
    content: string;
    finalStage: boolean;
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

    const execution =
      executionCapabilityForEmployee(
        employee,
      );

    if (
      !execution.executable
    ) {
      throw new Error(
        `${employee.name} cannot run yet because no verified execution adapter is registered for employee key "${canonicalEmployeeKey(
          employee.employee_key,
        )}".`,
      );
    }

    if (
      execution.mode ===
      "lead-hunter"
    ) {
      return executeLeadHunter({
        mission,
        handoff,
        employee,
        workflowHandoffs,
        hunterOptions,
      });
    }

    const actualNextEmployee =
      nextWorkflowEmployeeForHandoff({
        currentHandoff:
          handoff,

        workflowHandoffs,

        employees,
      });

    const authorisedEvidence =
      execution.mode ===
      "website-assisted-llm"
        ? [
            websiteReportEvidence(
              await checkOfficialWebsite(),
            ),
          ]
        : [];

    const compactPriorOutputs =
      compactPriorOutputsForPrompt(
        priorOutputs,
      );

    const compactEvidence =
      compactAuthorisedEvidence(
        authorisedEvidence,
      );

    const run =
      await startControlledWorkforceRun({
        mission,
        handoff,
        employee,

        provider:
          DEFAULT_WORKFORCE_PROVIDER,

        modelName:
          DEFAULT_WORKFORCE_MODEL,

        executionKind:
          "language_model",

        priorOutputs:
          compactPriorOutputs,

        authorisedEvidence:
          compactEvidence,
      });

    try {
      const prompt =
        controlledStagePrompt({
          mission,
          handoff,
          employee,

          nextEmployee:
            actualNextEmployee,

          priorOutputs:
            compactPriorOutputs,

          authorisedEvidence:
            compactEvidence,
        });

      if (
        prompt.length >
        MAX_STAGE_PROMPT_CHARS
      ) {
        throw new Error(
          `Cossa AI prompt safety check failed. Prompt length ${prompt.length} exceeds ${MAX_STAGE_PROMPT_CHARS}.`,
        );
      }

      const content =
        await executeProviderWithRetry({
          prompt,
          employee,
        });

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
    } catch (error) {
      const message =
        normaliseErrorMessage(
          error,
        );

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
  /* DIRECT EMPLOYEE ASSIGNMENT                                               */
  /* ------------------------------------------------------------------------ */

  const directAssignmentMutation =
    useMutation({
      mutationFn:
        async (
          request: DirectAssignmentRequest,
        ) => {
          const objective =
            request.objective.trim();

          if (
            !objective
          ) {
            throw new Error(
              "Write the employee task first.",
            );
          }

          const execution =
            executionCapabilityForEmployee(
              request.employee,
            );

          if (
            !execution.executable
          ) {
            throw new Error(
              `${request.employee.name} is waiting for an execution integration. No fake task will be recorded.`,
            );
          }

          const assignment =
            await createDirectEmployeeMission({
              employeeId:
                request.employee.id,

              objective,

              target_market:
                request.targetMarket.trim() ||
                null,

              target_location:
                request.targetLocation.trim() ||
                null,

              target_service:
                request.targetService.trim() ||
                null,

              context: {
                command_source:
                  "employee_drawer",

                execute_immediately:
                  true,

                requested_employee_key:
                  canonicalEmployeeKey(
                    request.employee.employee_key,
                  ),

                hunter_result_count:
                  request.hunterResultCount,

                hunter_save_to_crm:
                  request.saveHunterProspectsToCrm,
              },
            });

          const result =
            await executeControlledHandoff({
              mission:
                assignment.mission,

              handoff:
                assignment.handoff,

              employee:
                assignment.employee,

              priorOutputs:
                [],

              workflowHandoffs: [
                assignment.handoff,
              ],

              hunterOptions:
                canonicalEmployeeKey(
                  assignment.employee.employee_key,
                ) ===
                "lead-hunter"
                  ? {
                      resultCount:
                        request.hunterResultCount,

                      saveToCrm:
                        request.saveHunterProspectsToCrm,
                    }
                  : undefined,
            });

          return {
            ...assignment,
            ...result,
          };
        },

      onSuccess:
        async (
          result,
        ) => {
          await refreshWorkforce();

          toast.success(
            `${result.employee.name} completed the task`,
            {
              description:
                result.finalStage
                  ? "The direct employee mission was executed and recorded."
                  : "The employee completed its recorded stage.",
            },
          );
        },

      onError:
        (error) => {
          void refreshWorkforce();

          toast.error(
            "Employee task could not run",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
            },
          );
        },
    });

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
              `The next workflow stage is ${blockedHandoff.status}. Cossa AI will not skip it.`,
            );
          }

          if (
            !nextHandoff ||
            !nextEmployee
          ) {
            throw new Error(
              "This mission has no executable pending stage.",
            );
          }

          const priorOutputs =
            compactPriorOutputsForPrompt(
              reviewableOutputs.map(
                (
                  item,
                ) =>
                  item.content,
              ),
            );

          return executeControlledHandoff({
            mission:
              selectedMission,

            handoff:
              nextHandoff,

            employee:
              nextEmployee,

            priorOutputs,

            workflowHandoffs:
              selectedMissionHandoffs,
          });
        },

      onSuccess:
        async ({
          finalStage,
        }) => {
          await refreshWorkforce();

          toast.success(
            finalStage
              ? "Growth workflow completed"
              : "Employee stage completed",
            {
              description:
                finalStage
                  ? "All recorded stages completed successfully."
                  : "The employee completed the stage and handed work forward.",
            },
          );
        },

      onError:
        (error) => {
          toast.error(
            "Workforce stage could not run",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
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
              "This mission is paused at an owner approval checkpoint.",
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
              "This mission has no incomplete stages.",
            );
          }

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
              } already owns the next stage. The chain will not skip it.`,
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

          let accumulatedOutputs =
            compactPriorOutputsForPrompt(
              reviewableOutputs.map(
                (
                  item,
                ) =>
                  item.content,
              ),
            );

          let completedStages =
            0;

          let reachedFinalStage =
            false;

          for (
            let index = 0;
            index <
            pendingSequence.length;
            index += 1
          ) {
            const handoff =
              pendingSequence[
                index
              ];

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
                `Pending handoff references missing employee ${handoff.to_employee_id}.`,
              );
            }

            if (
              employee.status !==
              "active"
            ) {
              throw new Error(
                `${employee.name} is ${employee.status}. Automatic execution stopped.`,
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

                workflowHandoffs:
                  selectedMissionHandoffs,
              });

            accumulatedOutputs =
              compactPriorOutputsForPrompt(
                [
                  ...accumulatedOutputs,
                  result.content,
                ],
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

            if (
              index <
              pendingSequence.length -
                1
            ) {
              await sleep(
                WORKFORCE_STAGE_DELAY_MS,
              );
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
              ? "Workforce mission completed"
              : "Workforce mission progressed",
            {
              description: `${completedStages} employee stage${
                completedStages ===
                1
                  ? ""
                  : "s"
              } completed.`,
            },
          );
        },

      onError:
        (error) => {
          toast.error(
            "Automatic workforce chain stopped",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
            },
          );
        },
    });

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      {/* COMPANY HEADER */}

      <section className="glass-card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                  <Building2 className="h-5 w-5" />
                </div>

                <StatusBadge
                  status={workspaceRuntimeStatus()}
                />
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
                Cossa{" "}
                <span className="text-gradient-gold">
                  AI Company
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Find the right department or employee,
                delegate work to the AI CEO, run the real
                Lead Hunter revenue system and monitor company
                execution without pretending that missing
                integrations exist.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void refreshWorkforce()
                }
                disabled={isLoading}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </Button>

              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                <Link to="/ai/ceo">
                  <BrainCircuit className="mr-1.5 h-4 w-4" />
                  Open AI CEO
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />

            <input
              value={employeeSearch}
              onChange={(event) => {
                const value =
                  event.target.value;

                setEmployeeSearch(
                  value,
                );

                if (
                  value.trim()
                ) {
                  openEmployees(
                    "all",
                  );
                }
              }}
              placeholder='Find anyone by name or responsibility — try "Lead Hunter", "customers", "sales", "SEO", "supplier", "website"...'
              className="h-14 w-full rounded-2xl border border-primary/30 bg-background/60 pl-12 pr-12 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/10"
            />

            {employeeSearch ? (
              <button
                type="button"
                onClick={() =>
                  setEmployeeSearch(
                    "",
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* COMPANY NAVIGATION */}

      <section className="glass-card overflow-x-auto p-2">
        <div className="flex min-w-max gap-1">
          <TopNavButton
            active={
              view ===
              "command"
            }
            icon={Command}
            label="Command Centre"
            onClick={() =>
              setView(
                "command",
              )
            }
          />

          <TopNavButton
            active={
              view ===
              "departments"
            }
            icon={Building2}
            label="Departments"
            onClick={() =>
              setView(
                "departments",
              )
            }
          />

          <TopNavButton
            active={
              view ===
              "employees"
            }
            icon={UsersRound}
            label="Employees"
            onClick={() =>
              openEmployees(
                selectedDepartment,
              )
            }
          />

          <TopNavButton
            active={
              view ===
              "workflows"
            }
            icon={Workflow}
            label="Workflows"
            onClick={() =>
              setView(
                "workflows",
              )
            }
          />

          <TopNavButton
            active={
              view ===
              "activity"
            }
            icon={Activity}
            label="Activity"
            onClick={() =>
              setView(
                "activity",
              )
            }
          />

          <TopNavButton
            active={
              view ===
              "control"
            }
            icon={ShieldCheck}
            label="Control Room"
            onClick={() =>
              setView(
                "control",
              )
            }
          />
        </div>
      </section>

      {/* TOP COMPANY METRICS */}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Employees"
          value={String(
            employees.length,
          )}
        />

        <Metric
          label="Active"
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
          label="Working now"
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

      {/* COMMAND CENTRE */}

      {view ===
      "command" ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  CEO command
                </p>

                <h2 className="mt-1 font-display text-2xl font-semibold">
                  Tell the AI CEO what result you need
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Give the business objective. The recorded
                  Growth workforce coordinates it through the
                  correct internal stages.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-3">
              <textarea
                value={ceoCommand}
                onChange={(event) =>
                  setCeoCommand(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Example: Create a professional Facebook campaign for Cossa Facility Services in Gauteng, including copy, visual requirements and a posting plan. Do not publish or spend money."
                className="w-full resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />

              <div className="mt-3 flex flex-col gap-2 border-t border-primary/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Target:{" "}
                  <strong className="text-foreground">
                    {targetMarket}
                  </strong>
                  {" · "}
                  <strong className="text-foreground">
                    {targetLocation}
                  </strong>
                </div>

                <Button
                  type="button"
                  onClick={
                    submitCeoCommand
                  }
                  disabled={
                    !ceoCommand.trim() ||
                    coordinationMutation.isPending
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  {coordinationMutation.isPending ? (
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}

                  {coordinationMutation.isPending
                    ? "CEO is organising the team…"
                    : "Delegate to AI CEO"}
                </Button>
              </div>
            </div>
          </section>

          <section className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Company departments
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Go straight to the team
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setView(
                    "departments",
                  )
                }
                className="text-primary"
              >
                View all

                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {DEPARTMENTS.map(
                (
                  department,
                ) => {
                  const Icon =
                    department.icon;

                  const activeCount =
                    department.employeeKeys.filter(
                      (
                        key,
                      ) =>
                        employeesByKey.get(
                          key,
                        )?.status ===
                        "active",
                    ).length;

                  return (
                    <button
                      key={
                        department.key
                      }
                      type="button"
                      onClick={() =>
                        openDepartment(
                          department.key,
                        )
                      }
                      className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {department.name}
                        </p>

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {activeCount} active team member
                          {activeCount ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <section className="glass-card p-5 xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Current work
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  What needs attention now
                </h2>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setView(
                    "activity",
                  )
                }
                className="border-primary/30 text-primary"
              >
                <Activity className="mr-1.5 h-4 w-4" />
                Open activity
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <QueueCard
                icon={Play}
                title="Working"
                value={workforceCounts.working}
                description="Employees with a real running record."
              />

              <QueueCard
                icon={ClipboardList}
                title="Assigned"
                value={workforceCounts.waiting}
                description="Tasks waiting, retry-ready or awaiting a real integration."
              />

              <QueueCard
                icon={AlertTriangle}
                title="Needs attention"
                value={
                  workforceCounts.attention +
                  workforceCounts.approval
                }
                description="Failures or owner-controlled checkpoints."
                warning={
                  workforceCounts.attention +
                    workforceCounts.approval >
                  0
                }
              />
            </div>
          </section>
        </div>
      ) : null}

      {/* DEPARTMENTS */}

      {view ===
      "departments" ? (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Organisation
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">
                Departments
              </h2>

              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Choose the business function first. Every
                department opens directly to the employees
                responsible for that work.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {DEPARTMENTS.length} operating groups
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEPARTMENTS.map(
              (
                department,
              ) => {
                const Icon =
                  department.icon;

                const team =
                  employeeDirectory.filter(
                    (
                      item,
                    ) =>
                      department.employeeKeys.includes(
                        canonicalEmployeeKey(
                          item.employee.employee_key,
                        ),
                      ),
                  );

                const activeTeam =
                  team.filter(
                    (
                      item,
                    ) =>
                      item.employee.status ===
                      "active",
                  );

                return (
                  <article
                    key={
                      department.key
                    }
                    className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>

                      <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] text-success">
                        {activeTeam.length} active
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-xl font-semibold">
                      {department.name}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {department.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {team
                        .slice(
                          0,
                          5,
                        )
                        .map(
                          (
                            item,
                          ) => (
                            <span
                              key={item.employee.id}
                              className="rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground"
                            >
                              {item.employee.name}
                            </span>
                          ),
                        )}

                      {team.length >
                      5 ? (
                        <span className="rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                          +{team.length - 5}
                        </span>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      onClick={() =>
                        openDepartment(
                          department.key,
                        )
                      }
                      className="mt-5 w-full bg-primary/10 text-primary hover:bg-primary/20"
                      variant="ghost"
                    >
                      Open department
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </article>
                );
              },
            )}
          </div>
        </section>
      ) : null}

      {/* EMPLOYEES */}

      {view ===
      "employees" ? (
        <section className="glass-card p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Employee directory
                </p>

                <h2 className="mt-1 font-display text-2xl font-semibold">
                  Find the right person quickly
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Every executable employee now has a direct
                  command area inside their profile. Lead Hunter
                  uses its specialised search engine; normal AI
                  workers use their controlled workforce executor.
                </p>
              </div>

              <span className="text-xs text-muted-foreground">
                {searchedEmployees.length} matching employee
                {searchedEmployees.length ===
                1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip
                active={
                  selectedDepartment ===
                  "all"
                }
                label={`All employees (${employees.length})`}
                onClick={() =>
                  setSelectedDepartment(
                    "all",
                  )
                }
              />

              {DEPARTMENTS.map(
                (
                  department,
                ) => {
                  const count =
                    employeeDirectory.filter(
                      (
                        item,
                      ) =>
                        item.departmentKeys.includes(
                          department.key,
                        ),
                    ).length;

                  return (
                    <FilterChip
                      key={department.key}
                      active={
                        selectedDepartment ===
                        department.key
                      }
                      label={`${department.shortName} (${count})`}
                      onClick={() =>
                        setSelectedDepartment(
                          department.key,
                        )
                      }
                    />
                  );
                },
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={employeeSearch}
                onChange={(event) =>
                  setEmployeeSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employee or responsibility…"
                className="w-full rounded-xl border border-border/60 bg-background/50 py-3 pl-10 pr-10 text-sm outline-none focus:border-primary/50"
              />

              {employeeSearch ? (
                <button
                  type="button"
                  onClick={() =>
                    setEmployeeSearch(
                      "",
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear employee search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {employeesQuery.isLoading ? (
              <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
                Loading employees…
              </div>
            ) : searchedEmployees.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium">
                  No employee matched that search
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {searchedEmployees.map(
                  (
                    item,
                  ) => (
                    <EmployeeCard
                      key={item.employee.id}
                      item={item}
                      onOpen={() =>
                        setSelectedEmployeeId(
                          item.employee.id,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* WORKFLOWS */}

      {view ===
      "workflows" ? (
        <div className="grid gap-5">
          <section className="glass-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Active workflow
                </p>

                <h2 className="mt-1 font-display text-2xl font-semibold">
                  Growth workforce execution
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  The existing coordinated Growth workflow is
                  preserved. Direct employee commands are an
                  additional execution route, not a replacement.
                </p>
              </div>

              {coordinationMissions.length >
              0 ? (
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Mission

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
                    className="min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  >
                    {coordinationMissions.map(
                      (
                        mission,
                      ) => (
                        <option
                          key={mission.id}
                          value={mission.id}
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

            <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-9">
              {EXECUTABLE_GROWTH_WORKFLOW.map(
                (
                  step,
                  index,
                ) => {
                  const Icon =
                    step.icon;

                  const handoff =
                    selectedMissionHandoffs[
                      index
                    ];

                  const status =
                    handoff?.status ??
                    "not_created";

                  return (
                    <div
                      key={step.key}
                      className="relative rounded-xl border border-border/60 bg-card/40 p-3"
                    >
                      {index <
                      EXECUTABLE_GROWTH_WORKFLOW.length -
                        1 ? (
                        <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                      ) : null}

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      <p className="mt-2 text-xs font-medium">
                        {step.label}
                      </p>

                      <p
                        className={
                          status ===
                          "completed"
                            ? "mt-1 text-[9px] uppercase tracking-widest text-success"
                            : status ===
                                "accepted"
                              ? "mt-1 text-[9px] uppercase tracking-widest text-warning"
                              : status ===
                                  "pending"
                                ? "mt-1 text-[9px] uppercase tracking-widest text-primary"
                                : "mt-1 text-[9px] uppercase tracking-widest text-muted-foreground"
                        }
                      >
                        {formatStatus(
                          status,
                        )}
                      </p>
                    </div>
                  );
                },
              )}
            </div>

            {!selectedMission ? (
              <div className="mt-5 rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                No Growth coordination mission is selected.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Current position
                  </p>

                  <h3 className="mt-1 text-base font-semibold">
                    {nextEmployee
                      ? `${nextEmployee.name} — ${nextEmployee.title}`
                      : firstIncompleteHandoff
                        ? "Workflow stage blocked"
                        : "Workflow complete"}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {firstIncompleteHandoff?.reason ??
                      "No incomplete handoff remains."}
                  </p>

                  {blockedHandoff ? (
                    <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                      <p className="text-xs text-warning">
                        Earlier stage is{" "}
                        <strong>
                          {formatStatus(
                            blockedHandoff.status,
                          )}
                        </strong>
                        . Cossa AI will not skip it.
                      </p>
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
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                    >
                      {runSafeWorkflowMutation.isPending ? (
                        <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Workflow className="mr-1.5 h-4 w-4" />
                      )}

                      {runSafeWorkflowMutation.isPending
                        ? "Team is working…"
                        : "Run safe workflow"}
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
                      className="border-primary/40 text-primary"
                    >
                      {runNextStageMutation.isPending ? (
                        <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-4 w-4" />
                      )}

                      Run next employee only
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Mission outputs
                      </p>

                      <h3 className="text-sm font-semibold">
                        {reviewableOutputs.length} saved employee output
                        {reviewableOutputs.length ===
                        1
                          ? ""
                          : "s"}
                      </h3>
                    </div>

                    <FileCheck2 className="h-5 w-5 text-primary" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniMetric
                      label="Completed"
                      value={selectedMissionCompletedRuns.length}
                    />

                    <MiniMetric
                      label="Pending"
                      value={
                        selectedMissionHandoffs.filter(
                          (
                            handoff,
                          ) =>
                            handoff.status ===
                            "pending",
                        ).length
                      }
                    />

                    <MiniMetric
                      label="Failed history"
                      value={selectedMissionFailedRuns.length}
                      warning={
                        selectedMissionFailedRuns.length >
                        0
                      }
                    />
                  </div>

                  {displayReviewableOutputs.length >
                  0 ? (
                    <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
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
                              key={run.id}
                              className="rounded-lg border border-border/60 bg-background/40 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium">
                                  {worker?.name ??
                                    "Recorded worker"}
                                </span>

                                <span className="text-[9px] uppercase tracking-widest text-success">
                                  completed
                                </span>
                              </div>

                              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                                {content}
                              </p>
                            </article>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No employee output has been saved for this mission yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="glass-card p-5">
            <div className="flex items-start gap-3">
              <Workflow className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  New workflow
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Create Growth coordination mission
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <textarea
                value={objective}
                onChange={(event) =>
                  setObjective(
                    event.target.value,
                  )
                }
                rows={4}
                className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary/50"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Target market

                  <input
                    value={targetMarket}
                    onChange={(event) =>
                      setTargetMarket(
                        event.target.value,
                      )
                    }
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted-foreground">
                  Target location

                  <input
                    value={targetLocation}
                    onChange={(event) =>
                      setTargetLocation(
                        event.target.value,
                      )
                    }
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>
              </div>

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
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                <Workflow className="mr-1.5 h-4 w-4" />

                {coordinationMutation.isPending
                  ? "Creating workflow…"
                  : "Create workflow"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ACTIVITY */}

      {view ===
      "activity" ? (
        <section className="glass-card p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Company activity
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Employee work status
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Current state is based on recorded handoffs,
              runs, approvals and the existence of a real
              execution adapter.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {employeeDirectory
              .slice()
              .sort(
                (
                  left,
                  right,
                ) => {
                  const priority: Record<
                    OperationalState,
                    number
                  > = {
                    working:
                      0,
                    attention:
                      1,
                    approval:
                      2,
                    waiting:
                      3,
                    idle:
                      4,
                    inactive:
                      5,
                  };

                  return (
                    priority[
                      left.operational.state
                    ] -
                    priority[
                      right.operational.state
                    ]
                  );
                },
              )
              .map(
                (
                  item,
                ) => (
                  <EmployeeActivityCard
                    key={item.employee.id}
                    item={item}
                    onOpen={() =>
                      setSelectedEmployeeId(
                        item.employee.id,
                      )
                    }
                  />
                ),
              )}
          </div>
        </section>
      ) : null}

      {/* CONTROL ROOM */}

      {view ===
      "control" ? (
        <div className="grid gap-5">
          <section className="glass-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Workforce control room
                </p>

                <h2 className="mt-1 font-display text-2xl font-semibold">
                  System integrity & administration
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Existing workflows and database records are
                  preserved. Canonical UI identity prevents old
                  legacy aliases from appearing as duplicate employees.
                </p>
              </div>

              <Button
                type="button"
                onClick={() =>
                  installMutation.mutate()
                }
                disabled={
                  installMutation.isPending
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UsersRound className="mr-1.5 h-4 w-4" />

                {installMutation.isPending
                  ? "Synchronising…"
                  : "Synchronise workforce"}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ControlMetric
                label="Source profiles"
                value={COSSA_GROWTH_WORKFORCE.length}
                description="Profiles defined in Cossa source."
              />

              <ControlMetric
                label="Installed"
                value={installedDefaultEmployees.length}
                description="Canonical source profiles recorded."
              />

              <ControlMetric
                label="Active source"
                value={activeDefaultEmployees.length}
                description="Installed and active."
              />

              <ControlMetric
                label="Departments"
                value={departments.length}
                description="Recorded employee departments."
              />

              <ControlMetric
                label="Legacy rows preserved"
                value={legacyDuplicateCount}
                description="Hidden semantic duplicates retained safely in the database until controlled migration."
              />
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Lead Hunter execution
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Specialised revenue tool
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <OwnerRule>
                Lead Hunter uses the authenticated Cossa
                Hunter route instead of generic LLM prospect generation.
              </OwnerRule>

              <OwnerRule>
                Hunt IDs, prospect IDs and optional CRM lead
                IDs are retained with the workforce handoff.
              </OwnerRule>

              <OwnerRule>
                CRM saving is optional from a direct Hunter
                command; research results are not automatically
                pushed into CRM just to inflate pipeline numbers.
              </OwnerRule>

              <OwnerRule>
                External prospect contact remains disabled.
              </OwnerRule>
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Owner authority
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  High-risk actions remain controlled
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <OwnerRule>
                Spending money, supplier orders and
                advertising budget changes remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>
                Contracts, legal commitments, signatures
                and binding commercial terms remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>
                Credentials, destructive operations and
                irreversible account changes remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>
                Missing integrations must be reported,
                never simulated.
              </OwnerRule>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="border-primary/40 text-primary"
              >
                <Link to="/integrations">
                  <Send className="mr-1.5 h-4 w-4" />
                  Connections
                </Link>
              </Button>

              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/ai/ceo">
                  <BrainCircuit className="mr-1.5 h-4 w-4" />
                  AI CEO
                </Link>
              </Button>
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Execution safeguards
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Provider & context controls
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ControlMetric
                label="Prompt ceiling"
                value={MAX_STAGE_PROMPT_CHARS}
                description="Maximum characters per language-model stage."
              />

              <ControlMetric
                label="Prior outputs"
                value={MAX_PRIOR_OUTPUTS}
                description={`Maximum ${MAX_PRIOR_OUTPUT_CHARS} characters each.`}
              />

              <ControlMetric
                label="Provider attempts"
                value={PROVIDER_MAX_ATTEMPTS}
                description="Maximum temporary LLM retry attempts."
              />

              <ControlMetric
                label="Stage delay"
                value={
                  WORKFORCE_STAGE_DELAY_MS /
                  1_000
                }
                suffix=" sec"
                description="Delay between automatic employees."
              />
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Audit history
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Growth mission records
                </h2>
              </div>

              <span className="text-xs text-muted-foreground">
                {coordinationMissions.length} saved
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {coordinationMissions
                .slice(
                  0,
                  9,
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

                    const completed =
                      missionHandoffs.filter(
                        (
                          handoff,
                        ) =>
                          handoff.status ===
                          "completed",
                      ).length;

                    const failed =
                      missionRuns.filter(
                        (
                          run,
                        ) =>
                          run.status ===
                          "failed",
                      ).length;

                    return (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() => {
                          setSelectedMissionId(
                            mission.id,
                          );

                          setView(
                            "workflows",
                          );
                        }}
                        className="rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] uppercase tracking-widest text-primary">
                            {formatStatus(
                              mission.status,
                            )}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {completed}/{missionHandoffs.length}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm font-medium">
                          {mission.objective}
                        </p>

                        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {missionRuns.length} run
                            {missionRuns.length ===
                            1
                              ? ""
                              : "s"}
                          </span>

                          <span
                            className={
                              failed >
                              0
                                ? "text-warning"
                                : ""
                            }
                          >
                            {failed} failure
                            {failed ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
            </div>
          </section>
        </div>
      ) : null}

      {/* EMPLOYEE DRAWER */}

      {selectedEmployee ? (
        <EmployeeDrawer
          item={selectedEmployee}
          assignmentPending={
            directAssignmentMutation.isPending
          }
          onClose={() =>
            setSelectedEmployeeId(
              null,
            )
          }
          onOpenDepartment={() => {
            const firstDepartment =
              selectedEmployee.departmentKeys[
                0
              ];

            if (
              firstDepartment &&
              isWorkforceDepartment(
                firstDepartment,
              ) &&
              firstDepartment !==
                "all"
            ) {
              openDepartment(
                firstDepartment,
              );
            }
          }}
          onRunAssignment={(
            request,
          ) =>
            directAssignmentMutation.mutateAsync(
              request,
            )
          }
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function TopNavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          : "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full border border-primary bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary"
          : "shrink-0 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-primary"
      }
    >
      {label}
    </button>
  );
}

function EmployeeCard({
  item,
  onOpen,
}: {
  item: EmployeeDirectoryItem;
  onOpen: () => void;
}) {
  const {
    employee,
    operational,
    execution,
  } =
    item;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {employee.name}
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {employee.title}
          </p>
        </div>

        <OperationalBadge
          state={operational.state}
          label={operational.label}
        />
      </div>

      <div className="mt-3 rounded-lg border border-border/50 bg-background/30 p-2">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Execution
        </p>

        <p
          className={
            execution.executable
              ? "mt-1 text-[10px] font-medium text-primary"
              : "mt-1 text-[10px] font-medium text-warning"
          }
        >
          {execution.label}
        </p>
      </div>

      {item.responsibilityLabels.length >
      0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.responsibilityLabels.map(
            (
              label,
            ) => (
              <span
                key={label}
                className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] text-primary"
              >
                {label}
              </span>
            ),
          )}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-border/50 bg-background/30 p-3">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Current work
        </p>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed">
          {operational.currentTask}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-[10px] text-muted-foreground">
          {employeeDepartment(
            employee,
          )}
        </span>

        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
          Open employee

          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function EmployeeActivityCard({
  item,
  onOpen,
}: {
  item: EmployeeDirectoryItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {item.employee.name}
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.employee.title}
          </p>
        </div>

        <OperationalBadge
          state={item.operational.state}
          label={item.operational.label}
        />
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {item.operational.currentTask}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric
          label="Pending"
          value={item.operational.pendingCount}
        />

        <MiniMetric
          label="Running"
          value={item.operational.runningCount}
        />

        <MiniMetric
          label="Failures"
          value={item.operational.historicalFailureCount}
          warning={
            item.operational.latestFailure !==
            null
          }
        />
      </div>
    </button>
  );
}

function EmployeeDrawer({
  item,
  onClose,
  onOpenDepartment,
  onRunAssignment,
  assignmentPending,
}: {
  item: EmployeeDirectoryItem;
  onClose: () => void;
  onOpenDepartment: () => void;
  onRunAssignment: (
    request: DirectAssignmentRequest,
  ) => Promise<unknown>;
  assignmentPending: boolean;
}) {
  const {
    employee,
    operational,
    execution,
  } =
    item;

  const employeeKey =
    canonicalEmployeeKey(
      employee.employee_key,
    );

  const isLeadHunter =
    employeeKey ===
    "lead-hunter";

  const [
    command,
    setCommand,
  ] =
    useState("");

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
      isLeadHunter
        ? "Pretoria, Centurion, Gauteng"
        : "Gauteng",
    );

  const [
    targetService,
    setTargetService,
  ] =
    useState("");

  const [
    hunterResultCount,
    setHunterResultCount,
  ] =
    useState(
      DEFAULT_DIRECT_HUNTER_RESULTS,
    );

  const [
    saveHunterProspectsToCrm,
    setSaveHunterProspectsToCrm,
  ] =
    useState(false);

  async function runAssignment() {
    const objective =
      command.trim();

    if (
      !objective
    ) {
      toast.error(
        "Write the employee task first.",
      );

      return;
    }

    await onRunAssignment({
      employee,
      objective,
      targetMarket,
      targetLocation,
      targetService,
      hunterResultCount,
      saveHunterProspectsToCrm,
    });

    setCommand(
      "",
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Close employee profile"
      />

      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-foreground"
            aria-label="Close employee profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            {isLeadHunter ? (
              <Search className="h-6 w-6" />
            ) : (
              <UsersRound className="h-6 w-6" />
            )}
          </div>

          <h2 className="mt-4 font-display text-2xl font-semibold">
            {employee.name}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {employee.title}
          </p>

          <div className="mt-3">
            <OperationalBadge
              state={operational.state}
              label={operational.label}
            />
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            Execution path
          </p>

          <h3 className="mt-1 text-sm font-semibold">
            {execution.label}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {execution.detail}
          </p>

          <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-3">
            <EmployeeDetail
              label="Executor"
              value={execution.providerLabel}
            />
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            What this employee owns
          </p>

          {item.responsibilityLabels.length >
          0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.responsibilityLabels.map(
                (
                  label,
                ) => (
                  <span
                    key={label}
                    className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No responsibility matrix label has been assigned yet.
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {employee.mission}
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Current task
          </p>

          <p className="mt-2 text-sm leading-relaxed">
            {operational.currentTask}
          </p>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {operational.detail}
          </p>
        </section>

        {/* REAL DIRECT ASSIGNMENT */}

        <section className="mt-4 rounded-2xl border border-primary/35 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {isLeadHunter ? (
                <Search className="h-4 w-4" />
              ) : (
                <Command className="h-4 w-4" />
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary">
                Direct assignment
              </p>

              <h3 className="mt-1 text-base font-semibold">
                Tell {employee.name} what to do
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This creates a real mission, a real employee
                handoff and a real execution record before the
                employee is reported as having worked.
              </p>
            </div>
          </div>

          <textarea
            value={command}
            onChange={(event) =>
              setCommand(
                event.target.value,
              )
            }
            rows={6}
            disabled={
              assignmentPending ||
              !execution.executable ||
              employee.status !==
                "active"
            }
            placeholder={
              isLeadHunter
                ? "Example: Find 10 property managers, offices and businesses in Pretoria and Centurion that may need property maintenance, commercial cleaning or website services. Prioritise quick revenue and verified public contacts. Do not contact anyone."
                : `Example: ${employee.name}, prepare the work required for Cossa using verified information only.`
            }
            className="mt-4 w-full resize-y rounded-xl border border-primary/25 bg-background/60 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Target market
              <input
                value={targetMarket}
                onChange={(event) =>
                  setTargetMarket(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Target location
              <input
                value={targetLocation}
                onChange={(event) =>
                  setTargetLocation(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1 text-xs text-muted-foreground">
            Target service / work type
            <input
              value={targetService}
              onChange={(event) =>
                setTargetService(
                  event.target.value,
                )
              }
              placeholder={
                isLeadHunter
                  ? "Example: property maintenance, commercial cleaning, website design"
                  : "Optional"
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </label>

          {isLeadHunter ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                Lead Hunter controls
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Maximum accepted results
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={hunterResultCount}
                    onChange={(event) => {
                      const next =
                        Number(
                          event.target.value,
                        );

                      setHunterResultCount(
                        Number.isFinite(
                          next,
                        )
                          ? Math.max(
                              1,
                              Math.min(
                                50,
                                Math.round(
                                  next,
                                ),
                              ),
                            )
                          : DEFAULT_DIRECT_HUNTER_RESULTS,
                      );
                    }}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>

                <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Discovery engine
                  </p>

                  <p className="mt-1 text-xs font-medium text-primary">
                    Authenticated Cossa Lead Hunter
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Generic Groq prospect generation is blocked.
                  </p>
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
                <input
                  type="checkbox"
                  checked={
                    saveHunterProspectsToCrm
                  }
                  onChange={(event) =>
                    setSaveHunterProspectsToCrm(
                      event.target.checked,
                    )
                  }
                  className="mt-0.5"
                />

                <span className="text-xs leading-relaxed">
                  <strong>
                    Save accepted Hunter prospects to CRM after verification.
                  </strong>
                  <span className="mt-1 block text-muted-foreground">
                    Leave this off when you only want research.
                    Duplicate protection still applies when enabled.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {!execution.executable ? (
            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              This employee profile is preserved, but no verified
              executor is connected yet. Cossa AI will not fake
              an assignment.
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() =>
              void runAssignment()
            }
            disabled={
              assignmentPending ||
              !command.trim() ||
              !execution.executable ||
              employee.status !==
                "active"
            }
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            {assignmentPending ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : isLeadHunter ? (
              <Search className="mr-1.5 h-4 w-4" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" />
            )}

            {assignmentPending
              ? `${employee.name} is working…`
              : isLeadHunter
                ? "Run Lead Hunter"
                : `Assign & run ${employee.name}`}
          </Button>
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="grid gap-3 text-xs">
            <EmployeeDetail
              label="Employee key"
              value={employeeKey}
            />

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
              label="Execution status"
              value={
                execution.executable
                  ? execution.label
                  : "Waiting for integration"
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

            <EmployeeDetail
              label="Latest provider"
              value={
                operational.latestProvider ??
                "No execution recorded"
              }
            />

            <EmployeeDetail
              label="Latest model / tool"
              value={
                operational.latestModel ??
                "No execution recorded"
              }
            />

            <EmployeeDetail
              label="Last activity"
              value={formatDateTime(
                operational.lastActivity,
              )}
            />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-4 gap-2">
          <MiniMetric
            label="Assigned"
            value={operational.assignedCount}
          />

          <MiniMetric
            label="Pending"
            value={operational.pendingCount}
          />

          <MiniMetric
            label="Running"
            value={operational.runningCount}
          />

          <MiniMetric
            label="Failures"
            value={operational.historicalFailureCount}
            warning={
              operational.latestFailure !==
              null
            }
          />
        </section>

        {operational.latestFailure ? (
          <section className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-warning">
              {operational.retryReady
                ? "Previous attempt — retry ready"
                : "Latest failure"}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-warning">
              {operational.latestFailure}
            </p>
          </section>
        ) : null}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenDepartment}
            className="border-primary/40 text-primary"
          >
            <Building2 className="mr-1.5 h-4 w-4" />
            Open team
          </Button>

          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/ai/ceo">
              <BrainCircuit className="mr-1.5 h-4 w-4" />
              Delegate through CEO
            </Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}

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
    <div className="glass-card min-w-0 p-4">
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

function QueueCard({
  icon: Icon,
  title,
  value,
  description,
  warning = false,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  description: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className={
            warning
              ? "flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning"
              : "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="h-4 w-4" />
        </div>

        <span
          className={
            warning
              ? "font-display text-2xl font-semibold text-warning"
              : "font-display text-2xl font-semibold"
          }
        >
          {value}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium">
        {title}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ControlMetric({
  label,
  value,
  description,
  suffix = "",
}: {
  label: string;
  value: number;
  description: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 font-display text-2xl font-semibold">
        {value.toLocaleString()}
        {suffix}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="break-words font-medium text-foreground sm:max-w-[60%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function OwnerRule({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <span>
        {children}
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
      className={`w-fit max-w-full shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
