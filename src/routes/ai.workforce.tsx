import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMemo, useRef, useState, type ReactNode } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  CircleStop,
  Code2,
  Command,
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
  Store,
  UsersRound,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

import {
  canonicalEmployeeKey,
  COSSA_GROWTH_WORKFORCE,
  completeControlledWorkforceRun,
  createGrowthCoordinationMission,
  createRevenueAcquisitionMission,
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
  type CreateCoordinationMissionInput,
  type CreateGrowthCoordinationMissionInput,
  type EmployeeHandoff,
  type Mission,
  type MissionRun,
} from "@/lib/workforce-data";

import {
  DEFAULT_LEAD_HUNTER_REQUEST,
  huntProspects,
  minimumDepthForServiceCount,
  saveProspectsToCrm,
  validateSearchRequest,
  type LeadHunterCompany,
  type LeadHunterObjective,
  type LeadHunterProspect,
  type LeadHunterRevenueMode,
  type LeadHunterSearchRequest,
  type LeadHunterServiceCategory,
} from "@/lib/lead-hunter-data";

import { streamChat, streamChatWithMetadata } from "@/lib/ai-stream";

import { checkOfficialWebsite, type OfficialWebsiteHealthReport } from "@/lib/website-health";

import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";
import { getAgentRuntimeDashboard } from "@/lib/agent-runtime";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type WorkforceView = "command" | "departments" | "employees" | "workflows" | "activity" | "control";

type WorkforceDepartment = "all" | "executive" | "growth" | "store" | "tech" | "revenue";

type WorkforceKind = "growth" | "revenue";

interface WorkforceSearch {
  view: WorkforceView;
  department: WorkforceDepartment;
}

type OperationalState = "working" | "idle" | "waiting" | "approval" | "attention" | "inactive";

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
  key: Exclude<WorkforceDepartment, "all">;
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
  departmentKeys: string[];
  responsibilityLabels: string[];
  searchText: string;
}

interface ExecutableWorkflowStep {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface LeadHunterExecutionResult {
  content: string;
  retainedRecordIds: Record<string, unknown>;
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

function isWorkforceView(value: unknown): value is WorkforceView {
  return typeof value === "string" && WORKFORCE_VIEWS.includes(value as WorkforceView);
}

function isWorkforceDepartment(value: unknown): value is WorkforceDepartment {
  return typeof value === "string" && WORKFORCE_DEPARTMENTS.includes(value as WorkforceDepartment);
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/ai/workforce")({
  validateSearch: (search: Record<string, unknown>): WorkforceSearch => ({
    view: isWorkforceView(search.view) ? search.view : "command",

    department: isWorkforceDepartment(search.department) ? search.department : "all",
  }),

  component: AiWorkforce,

  head: () => ({
    meta: [
      {
        title: "AI Workforce — Cossa AI",
      },
      {
        name: "description",
        content:
          "Cossa Nexus Holdings AI company command centre for departments, employees, coordinated missions, real Lead Hunter execution and owner-controlled actions.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const GROWTH_MISSION_PREFIX = "Growth coordination:";

const REVENUE_MISSION_PREFIX = "Revenue acquisition:";

const DEFAULT_WORKFORCE_PROVIDER = "groq" as const;

const DEFAULT_WORKFORCE_MODEL = "llama-3.3-70b-versatile";

const LEAD_HUNTER_TOOL_PROVIDER = "cossa_tool" as const;

const LEAD_HUNTER_TOOL_NAME = "lead-hunter-evidence-engine-v1";

const MAX_STAGE_PROMPT_CHARS = 6_000;

const MAX_PRIOR_OUTPUTS = 2;

const MAX_PRIOR_OUTPUT_CHARS = 900;

const MAX_AUTHORISED_EVIDENCE_ITEMS = 2;

const MAX_AUTHORISED_EVIDENCE_CHARS = 1_200;

const MAX_HANDOFF_CONTEXT_CHARS = 700;

const MAX_RETAINED_RECORD_CONTEXT_CHARS = 1_200;

const PROVIDER_MAX_ATTEMPTS = 3;

const PROVIDER_RETRY_DELAYS_MS = [2_000, 5_000] as const;

const WORKFORCE_STAGE_DELAY_MS = 2_000;

const DEFAULT_WORKFORCE_HUNT_RESULTS = 10;
const EMPTY_EMPLOYEES: AiEmployee[] = [];
const EMPTY_MISSIONS: Mission[] = [];
const EMPTY_HANDOFFS: EmployeeHandoff[] = [];
const EMPTY_RUNS: MissionRun[] = [];
const EMPTY_APPROVALS: Approval[] = [];

/* -------------------------------------------------------------------------- */
/* EXECUTABLE WORKFLOWS                                                       */
/* -------------------------------------------------------------------------- */

const EXECUTABLE_GROWTH_WORKFLOW: readonly ExecutableWorkflowStep[] = [
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
      "Builds channel strategy, audience direction, campaign angles, positioning and marketing priorities.",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Content production",
    description:
      "Produces marketing, educational, awareness and conversion-focused written content.",
    icon: FilePenLine,
  },
  {
    key: "creative-media-producer",
    label: "Creative media",
    description:
      "Creates production-ready visual requirements for graphics, campaigns, banners and media.",
    icon: ImageIcon,
  },
  {
    key: "social-schedule-coordinator",
    label: "Content coordination",
    description:
      "Organises approved copy and creative packages into channel schedules and publishing queues.",
    icon: PanelTop,
  },
  {
    key: "social-media-manager",
    label: "Social management",
    description: "Owns channel readiness, publishing preparation and authorised social execution.",
    icon: Megaphone,
  },
  {
    key: "account-growth-analyst",
    label: "Growth analysis",
    description:
      "Analyses authorised account and campaign evidence for growth and conversion improvements.",
    icon: BarChart3,
  },
  {
    key: "paid-media-specialist",
    label: "Paid media",
    description:
      "Prepares advertising strategy and optimisation recommendations without unauthorised spend.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO",
    description: "Synthesises workforce outputs and escalates only genuine owner decisions.",
    icon: BrainCircuit,
  },
];

const EXECUTABLE_REVENUE_WORKFLOW: readonly ExecutableWorkflowStep[] = [
  {
    key: "lead-hunter",
    label: "Lead Hunter",
    description:
      "Uses Cossa's authenticated evidence-backed search system to discover real commercial opportunities without fabricating prospects.",
    icon: Search,
  },
  {
    key: "lead-intake-coordinator",
    label: "Lead Intake",
    description:
      "Preserves source records, checks routing and prepares verified Hunter results for sales work.",
    icon: ClipboardList,
  },
  {
    key: "sales-conversion-specialist",
    label: "Sales & Conversion",
    description:
      "Turns verified leads into qualification, outreach, discovery, quotation and conversion next actions.",
    icon: BarChart3,
  },
  {
    key: "ai-ceo",
    label: "AI CEO",
    description:
      "Reviews revenue evidence, prioritises opportunities and escalates only genuine owner-controlled actions.",
    icon: BrainCircuit,
  },
];

/* -------------------------------------------------------------------------- */
/* DEPARTMENT MODEL                                                           */
/* -------------------------------------------------------------------------- */

const DEPARTMENTS: DepartmentDefinition[] = [
  {
    key: "executive",
    name: "Executive Office",
    shortName: "Executive",
    description:
      "Company-wide coordination, owner briefing, escalation and executive decision support.",
    icon: BrainCircuit,
    employeeKeys: ["ai-ceo"],
  },

  {
    key: "growth",
    name: "Marketing & Growth",
    shortName: "Growth",
    description:
      "Social media, SEO, content, creative production, campaign planning, account growth and paid media.",
    icon: Megaphone,
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
    key: "store",
    name: "Cossa Store",
    shortName: "Store",
    description:
      "Catalogue operations, product intelligence, supplier sourcing, merchandising and social commerce.",
    icon: Store,
    employeeKeys: [
      "store-operations-manager",
      "product-intelligence-analyst",
      "supplier-sourcing-analyst",
      "broker-deal-intelligence-analyst",
      "creative-media-producer",
      "social-media-manager",
    ],
  },

  {
    key: "tech",
    name: "Cossa Tech",
    shortName: "Tech",
    description:
      "Website delivery, technology solutions, technical implementation, website content and SEO quality.",
    icon: Code2,
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
    key: "revenue",
    name: "Revenue & Procurement",
    shortName: "Revenue",
    description:
      "Lead hunting, lead intake, sales conversion, customer reactivation, commercial opportunities and procurement intelligence.",
    icon: Search,
    employeeKeys: [
      "lead-hunter",
      "lead-intake-coordinator",
      "sales-conversion-specialist",
      "customer-reactivation-analyst",
      "broker-deal-intelligence-analyst",
      "procurement-intelligence-analyst",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* RESPONSIBILITY / SEARCH MATRIX                                             */
/* -------------------------------------------------------------------------- */

const RESPONSIBILITY_MATRIX: ResponsibilityDefinition[] = [
  {
    employeeKey: "ai-ceo",
    label: "Executive coordination",
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
    employeeKey: "lead-hunter",
    label: "Revenue hunting",
    keywords: [
      "hunter",
      "lead hunter",
      "find customers",
      "find clients",
      "prospects",
      "prospecting",
      "customer acquisition",
      "find buyers",
      "buyer intent",
      "sales prospects",
      "new customers",
      "find opportunities",
      "quick revenue",
      "cash flow",
      "commercial opportunity",
      "tender search",
      "rfq search",
      "website prospects",
      "maintenance prospects",
      "cleaning prospects",
      "construction prospects",
    ],
  },

  {
    employeeKey: "sales-conversion-specialist",
    label: "Sales & conversion",
    keywords: [
      "sales",
      "conversion",
      "close lead",
      "close customer",
      "qualify lead",
      "follow up",
      "sales follow up",
      "discovery questions",
      "objection handling",
      "quotation",
      "proposal",
      "sales strategy",
      "outreach",
      "convert prospect",
    ],
  },

  {
    employeeKey: "website-seo-monitor",
    label: "Website & SEO monitoring",
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
    employeeKey: "social-strategy-planner",
    label: "Social strategy",
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
    employeeKey: "content-writer",
    label: "Content & copywriting",
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
    employeeKey: "creative-media-producer",
    label: "Creative & design production",
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
    employeeKey: "social-schedule-coordinator",
    label: "Content scheduling",
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
    employeeKey: "social-media-manager",
    label: "Social media management",
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
    employeeKey: "account-growth-analyst",
    label: "Growth analytics",
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
    employeeKey: "paid-media-specialist",
    label: "Paid advertising",
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
    employeeKey: "store-operations-manager",
    label: "Store operations",
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
    employeeKey: "product-intelligence-analyst",
    label: "Product intelligence",
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
    employeeKey: "supplier-sourcing-analyst",
    label: "Supplier sourcing",
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
    employeeKey: "broker-deal-intelligence-analyst",
    label: "Deals & partnerships",
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
    employeeKey: "procurement-intelligence-analyst",
    label: "Procurement intelligence",
    keywords: [
      "tender",
      "rfq",
      "procurement",
      "quotation opportunity",
      "bid",
      "government tender",
      "supplier opportunity",
    ],
  },

  {
    employeeKey: "customer-reactivation-analyst",
    label: "Customer reactivation",
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
    employeeKey: "lead-intake-coordinator",
    label: "Lead intake",
    keywords: [
      "lead",
      "new lead",
      "enquiry",
      "inquiry",
      "qualification",
      "customer enquiry",
      "sales lead",
      "lead intake",
      "route lead",
    ],
  },

  {
    employeeKey: "tech-solutions-specialist",
    label: "Technology solutions",
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
    employeeKey: "website-delivery-specialist",
    label: "Website delivery",
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

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function clampText(value: string, maxCharacters: number): string {
  const cleaned = value.trim();

  if (cleaned.length <= maxCharacters) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxCharacters - 80))}\n\n[Context truncated by Cossa AI.]`;
}

function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  return run.completed_at ?? run.started_at ?? run.created_at ?? "";
}

function employeeDepartment(employee: AiEmployee): string {
  return employee.department?.trim() || "Department not recorded";
}

function employeeBusinessUnit(employee: AiEmployee): string {
  return employee.business_unit_id ? "Assigned business unit" : "Group-wide";
}

function normaliseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown workforce execution error.";
}

function isRetryableProviderError(error: unknown): boolean {
  const message = normaliseErrorMessage(error).toLowerCase();

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
  ].some((marker) => message.includes(marker));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/* -------------------------------------------------------------------------- */
/* MISSION / WORKFLOW HELPERS                                                 */
/* -------------------------------------------------------------------------- */

function missionWorkforceKind(mission: Mission | null): WorkforceKind {
  if (mission?.title.startsWith(REVENUE_MISSION_PREFIX)) {
    return "revenue";
  }

  return "growth";
}

function workflowForMission(mission: Mission | null): readonly ExecutableWorkflowStep[] {
  return missionWorkforceKind(mission) === "revenue"
    ? EXECUTABLE_REVENUE_WORKFLOW
    : EXECUTABLE_GROWTH_WORKFLOW;
}

function commandLooksLikeRevenueWork(command: string): boolean {
  const value = command.toLowerCase();

  return [
    "find customer",
    "find customers",
    "find client",
    "find clients",
    "find lead",
    "find leads",
    "lead hunter",
    "prospect",
    "prospects",
    "new customers",
    "new clients",
    "sales opportunity",
    "revenue opportunity",
    "quick revenue",
    "cash flow",
    "cashflow",
    "tender",
    "rfq",
    "request for quotation",
    "customer acquisition",
    "buyer",
    "buyers",
  ].some((marker) => value.includes(marker));
}

/* -------------------------------------------------------------------------- */
/* SEARCH HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function departmentKeysForEmployee(employeeKey: string): string[] {
  const canonicalKey = canonicalEmployeeKey(employeeKey);

  return DEPARTMENTS.filter((department) => department.employeeKeys.includes(canonicalKey)).map(
    (department) => department.key,
  );
}

function responsibilityLabelsForEmployee(employeeKey: string): string[] {
  const canonicalKey = canonicalEmployeeKey(employeeKey);

  return RESPONSIBILITY_MATRIX.filter((item) => item.employeeKey === canonicalKey).map(
    (item) => item.label,
  );
}

function searchTermsForEmployee(employee: AiEmployee): string {
  const canonicalKey = canonicalEmployeeKey(employee.employee_key);

  const responsibilityTerms = RESPONSIBILITY_MATRIX.filter(
    (item) => item.employeeKey === canonicalKey,
  ).flatMap((item) => [item.label, ...item.keywords]);

  const departmentTerms = DEPARTMENTS.filter((department) =>
    department.employeeKeys.includes(canonicalKey),
  ).flatMap((department) => [department.name, department.shortName, department.description]);

  return [
    employee.name,
    employee.title,
    canonicalKey,
    employee.department ?? "",
    employee.mission ?? "",
    ...responsibilityTerms,
    ...departmentTerms,
  ]
    .join(" ")
    .toLowerCase();
}

function searchScore(employee: EmployeeDirectoryItem, query: string): number {
  const q = query.trim().toLowerCase();

  if (!q) {
    return 0;
  }

  let score = 0;

  const employeeName = employee.employee.name.toLowerCase();

  const employeeTitle = employee.employee.title.toLowerCase();

  const employeeKey = canonicalEmployeeKey(employee.employee.employee_key).toLowerCase();

  if (employeeName === q || employeeTitle === q) {
    score += 200;
  }

  if (employeeName.includes(q)) {
    score += 100;
  }

  if (employeeTitle.includes(q)) {
    score += 90;
  }

  if (employeeKey.includes(q)) {
    score += 80;
  }

  for (const responsibility of RESPONSIBILITY_MATRIX) {
    if (responsibility.employeeKey !== employeeKey) {
      continue;
    }

    if (responsibility.label.toLowerCase().includes(q)) {
      score += 75;
    }

    for (const keyword of responsibility.keywords) {
      const keywordLower = keyword.toLowerCase();

      if (keywordLower === q) {
        score += 120;
      } else if (keywordLower.includes(q) || q.includes(keywordLower)) {
        score += 55;
      }
    }
  }

  if (employee.searchText.includes(q)) {
    score += 20;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT COMPACTION                                                         */
/* -------------------------------------------------------------------------- */

function compactPriorOutputsForPrompt(outputs: string[]): string[] {
  return outputs
    .map((output) => output.trim())
    .filter(Boolean)
    .slice(-MAX_PRIOR_OUTPUTS)
    .map((output) => clampText(output, MAX_PRIOR_OUTPUT_CHARS));
}

function compactAuthorisedEvidence(evidence: string[]): string[] {
  return evidence
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_AUTHORISED_EVIDENCE_ITEMS)
    .map((item) => clampText(item, MAX_AUTHORISED_EVIDENCE_CHARS));
}

/* -------------------------------------------------------------------------- */
/* WORKFLOW HELPERS                                                           */
/* -------------------------------------------------------------------------- */

function handoffStageNumber(handoff: EmployeeHandoff): number | null {
  const stage = handoff.context?.stage;

  if (typeof stage === "number" && Number.isFinite(stage)) {
    return stage;
  }

  if (typeof stage === "string") {
    const parsed = Number(stage);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function sortWorkflowHandoffs(handoffs: EmployeeHandoff[]): EmployeeHandoff[] {
  return [...handoffs].sort((left, right) => {
    const leftStage = handoffStageNumber(left);

    const rightStage = handoffStageNumber(right);

    if (leftStage !== null && rightStage !== null && leftStage !== rightStage) {
      return leftStage - rightStage;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

function nextWorkflowHandoffForHandoff({
  currentHandoff,
  workflowHandoffs,
}: {
  currentHandoff: EmployeeHandoff;
  workflowHandoffs: EmployeeHandoff[];
}): EmployeeHandoff | null {
  const ordered = sortWorkflowHandoffs(workflowHandoffs);

  const currentIndex = ordered.findIndex((handoff) => handoff.id === currentHandoff.id);

  if (currentIndex < 0 || currentIndex >= ordered.length - 1) {
    return null;
  }

  return ordered[currentIndex + 1] ?? null;
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
  const nextHandoff = nextWorkflowHandoffForHandoff({
    currentHandoff,
    workflowHandoffs,
  });

  if (!nextHandoff) {
    return null;
  }

  return employees.find((employee) => employee.id === nextHandoff.to_employee_id) ?? null;
}

/* -------------------------------------------------------------------------- */
/* OPERATIONAL STATE                                                          */
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
  const employeeHandoffs = handoffs.filter((handoff) => handoff.to_employee_id === employee.id);

  const employeeRuns = runs.filter((run) => run.employee_id === employee.id);

  const employeeRunIds = new Set(employeeRuns.map((run) => run.id));

  const employeeApprovals = approvals.filter(
    (approval) =>
      approval.requested_by_employee_id === employee.id ||
      (approval.run_id !== null && employeeRunIds.has(approval.run_id)),
  );

  const pendingHandoffs = employeeHandoffs.filter((handoff) => handoff.status === "pending");

  const acceptedHandoffs = employeeHandoffs.filter((handoff) => handoff.status === "accepted");

  const activeRuns = employeeRuns.filter((run) => run.status === "running");

  const failedRuns = employeeRuns.filter((run) => run.status === "failed");

  const orderedHandoffs = [...employeeHandoffs].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );

  const orderedRuns = [...employeeRuns].sort((left, right) =>
    latestRunTime(right).localeCompare(latestRunTime(left)),
  );

  const latestHandoff = orderedHandoffs[0];

  const latestRun = orderedRuns[0];

  const latestFailure =
    latestRun?.status === "failed"
      ? latestRun.error_message || latestRun.error_code || "The latest recorded run failed."
      : null;

  const retryReady = latestRun?.status === "failed" && pendingHandoffs.length > 0;

  const latestActivityCandidates = [
    latestRun ? latestRunTime(latestRun) : "",
    latestHandoff?.completed_at ?? "",
    latestHandoff?.accepted_at ?? "",
    latestHandoff?.created_at ?? "",
  ].filter(Boolean);

  const latestActivity =
    latestActivityCandidates.sort((left, right) => right.localeCompare(left))[0] ?? null;

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
    runningCount: activeRuns.length + acceptedHandoffs.length,
    failedCount: failedRuns.length,
    historicalFailureCount: failedRuns.length,
    approvalCount: employeeApprovals.length,
    latestProvider: latestRun?.model_provider ?? null,
    latestModel: latestRun?.model_name ?? null,
    latestFailure,
    retryReady,
  };

  if (employee.status !== "active") {
    return {
      ...common,
      state: "inactive",
      label: "Disabled",
      detail:
        employee.status === "paused"
          ? "This employee is paused and cannot receive new work."
          : employee.status === "retired"
            ? "This employee is retired."
            : "This employee profile is not currently active.",
    };
  }

  if (activeRuns.length > 0 || acceptedHandoffs.length > 0) {
    return {
      ...common,
      state: "working",
      label: "Working",
      detail: "A real workforce run or accepted handoff is currently recorded.",
    };
  }

  if (employeeApprovals.length > 0) {
    return {
      ...common,
      state: "approval",
      label: "Awaiting approval",
      detail: "Recorded work has reached an owner-controlled approval checkpoint.",
    };
  }

  if (retryReady) {
    return {
      ...common,
      state: "waiting",
      label: "Waiting",
      detail: "The previous attempt failed, but the task safely returned to pending.",
    };
  }

  if (latestRun?.status === "failed") {
    return {
      ...common,
      state: "attention",
      label: "Failed",
      detail:
        latestFailure ??
        "The latest workforce run failed and has not returned to a retryable state.",
    };
  }

  if (pendingHandoffs.length > 0) {
    return {
      ...common,
      state: "waiting",
      label: "Waiting",
      detail: "A real task is assigned and waiting for the workforce executor.",
    };
  }

  return {
    ...common,
    state: "idle",
    label: "Ready",
    currentTask: "No task currently assigned",
    detail:
      employeeHandoffs.length > 0
        ? "This employee is available for the next appropriate task."
        : "This employee is active and available.",
  };
}

/* -------------------------------------------------------------------------- */
/* OUTPUT HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function reviewableOutputContent(run: MissionRun): string | null {
  if (!run.output || typeof run.output !== "object") {
    return null;
  }

  const content = (
    run.output as {
      content?: unknown;
    }
  ).content;

  return typeof content === "string" && content.trim() ? content : null;
}

function websiteReportEvidence(report: OfficialWebsiteHealthReport): string {
  return [
    "Official Cossa website health",
    `Website: ${report.website}`,
    `Availability: ${report.availability}`,
    `HTTP: ${report.http_status ?? "unknown"}`,
    `Response: ${report.response_time_ms ?? "unknown"} ms`,
    `Title: ${report.page_title ?? "not detected"}`,
    `Noindex: ${report.noindex_detected ? "yes" : "no"}`,
    `Issues: ${report.issues.length > 0 ? report.issues.join("; ") : "none"}`,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* LEAD HUNTER INTELLIGENCE                                                   */
/* -------------------------------------------------------------------------- */

const LEAD_HUNTER_SERVICE_RULES: Array<{
  service: LeadHunterServiceCategory;
  pattern: RegExp;
}> = [
  {
    service: "construction",
    pattern: /\bconstruction\b|\bbuilding\b|\bcontractor\b/i,
  },
  {
    service: "renovation",
    pattern: /\brenovation\b|\brenovations\b|\brefurbish/i,
  },
  {
    service: "property_maintenance",
    pattern: /\bproperty maintenance\b|\bmaintenance\b|\brepairs?\b/i,
  },
  {
    service: "painting",
    pattern: /\bpainting\b|\brepainting\b/i,
  },
  {
    service: "tiling",
    pattern: /\btiling\b|\btiles?\b/i,
  },
  {
    service: "ceilings",
    pattern: /\bceilings?\b|\bdrywall\b/i,
  },
  {
    service: "roofing",
    pattern: /\broofing\b|\broof repair/i,
  },
  {
    service: "plumbing",
    pattern: /\bplumbing\b|\bplumber\b/i,
  },
  {
    service: "facility_management",
    pattern: /\bfacility management\b|\bfacilities management\b/i,
  },
  {
    service: "commercial_cleaning",
    pattern: /\bcommercial cleaning\b|\boffice cleaning\b|\bcleaning contract\b/i,
  },
  {
    service: "deep_cleaning",
    pattern: /\bdeep cleaning\b/i,
  },
  {
    service: "hygiene",
    pattern: /\bhygiene\b|\bsanitation\b/i,
  },
  {
    service: "landscaping",
    pattern: /\blandscap/i,
  },
  {
    service: "waste_management",
    pattern: /\bwaste management\b|\bwaste removal\b/i,
  },
  {
    service: "website_design",
    pattern: /\bwebsite\b|\bweb design\b|\bweb development\b|\bsite redesign\b/i,
  },
  {
    service: "logo_design",
    pattern: /\blogo\b|\blogo design\b/i,
  },
  {
    service: "branding",
    pattern: /\bbranding\b|\bbrand identity\b/i,
  },
  {
    service: "seo",
    pattern: /\bseo\b|\bsearch engine optimisation\b|\bsearch engine optimization\b/i,
  },
  {
    service: "digital_marketing",
    pattern: /\bdigital marketing\b|\bonline marketing\b/i,
  },
  {
    service: "social_media_management",
    pattern: /\bsocial media\b|\bfacebook management\b|\binstagram management\b/i,
  },
  {
    service: "google_business_profile",
    pattern: /\bgoogle business\b|\bgoogle profile\b|\bgoogle maps\b/i,
  },
  {
    service: "lead_generation",
    pattern: /\blead generation\b|\bget leads\b|\bprospecting\b/i,
  },
  {
    service: "crm",
    pattern: /\bcrm\b|\bcustomer relationship management\b/i,
  },
  {
    service: "ai_automation",
    pattern: /\bai automation\b|\bautomation\b|\bai assistant\b|\bchatbot\b/i,
  },
  {
    service: "business_documents",
    pattern: /\bbusiness documents?\b|\bnexdocs\b/i,
  },
  {
    service: "quotations",
    pattern: /\bquotations?\b|\bquote document\b/i,
  },
  {
    service: "proposals",
    pattern: /\bbusiness proposals?\b|\bproposal document\b/i,
  },
  {
    service: "contracts",
    pattern: /\bcontracts?\b|\bagreement document\b/i,
  },
  {
    service: "ecommerce",
    pattern: /\becommerce\b|\be-commerce\b|\bonline store\b/i,
  },
];

function inferHunterServices(text: string): LeadHunterServiceCategory[] {
  const matches = LEAD_HUNTER_SERVICE_RULES.filter(({ pattern }) => pattern.test(text)).map(
    ({ service }) => service,
  );

  if (matches.length > 0) {
    return uniqueStrings(matches) as LeadHunterServiceCategory[];
  }

  return [...DEFAULT_LEAD_HUNTER_REQUEST.services];
}

function inferHunterCompanies(services: LeadHunterServiceCategory[]): LeadHunterCompany[] {
  const result: LeadHunterCompany[] = [];

  const constructionServices = new Set<LeadHunterServiceCategory>([
    "construction",
    "renovation",
    "property_maintenance",
    "painting",
    "tiling",
    "ceilings",
    "roofing",
    "plumbing",
  ]);

  const facilityServices = new Set<LeadHunterServiceCategory>([
    "property_maintenance",
    "facility_management",
    "commercial_cleaning",
    "deep_cleaning",
    "hygiene",
    "landscaping",
    "waste_management",
  ]);

  const techServices = new Set<LeadHunterServiceCategory>([
    "website_design",
    "logo_design",
    "branding",
    "seo",
    "digital_marketing",
    "social_media_management",
    "google_business_profile",
    "lead_generation",
    "crm",
    "ai_automation",
    "ecommerce",
  ]);

  const documentServices = new Set<LeadHunterServiceCategory>([
    "business_documents",
    "quotations",
    "proposals",
    "contracts",
  ]);

  if (services.some((service) => constructionServices.has(service))) {
    result.push("cossa_nexus_construction");
  }

  if (services.some((service) => facilityServices.has(service))) {
    result.push("cossa_facility_services");
  }

  if (services.some((service) => techServices.has(service))) {
    result.push("cossa_tech");
  }

  if (services.some((service) => documentServices.has(service))) {
    result.push("nexdocs");
  }

  if (result.length === 0) {
    return [...DEFAULT_LEAD_HUNTER_REQUEST.companies];
  }

  return uniqueStrings(result) as LeadHunterCompany[];
}

function inferHunterObjectives(text: string): LeadHunterObjective[] {
  const value = text.toLowerCase();

  const objectives: LeadHunterObjective[] = ["find_customers"];

  if (/\btender\b|\brfq\b|\brfp\b|\bprocurement\b/.test(value)) {
    objectives.push("find_active_tenders", "find_rfqs");
  }

  if (/\bsupplier registration\b|\bsupplier database\b/.test(value)) {
    objectives.push("find_supplier_registrations");
  }

  if (/\bsubcontract\b|\bsubcontractor\b/.test(value)) {
    objectives.push("find_subcontracting");
  }

  if (/\bpartner\b|\bpartnership\b/.test(value)) {
    objectives.push("find_partners");
  }

  if (/\bwebsite\b|\bweb design\b|\boutdated site\b/.test(value)) {
    objectives.push("find_weak_websites");
  }

  if (/\bbranding\b|\blogo\b/.test(value)) {
    objectives.push("find_branding_gaps");
  }

  if (/\bmarketing\b|\bsocial media\b|\bseo\b/.test(value)) {
    objectives.push("find_marketing_gaps");
  }

  if (/\bmaintenance\b|\brepair\b|\brenovation\b/.test(value)) {
    objectives.push("find_maintenance_needs", "find_projects");
  }

  if (/\bcleaning\b|\bhygiene\b/.test(value)) {
    objectives.push("find_cleaning_contracts");
  }

  if (/\brecurring\b|\bretainer\b|\bcontract\b/.test(value)) {
    objectives.push("find_recurring_contracts");
  }

  if (/\bquick revenue\b|\bcash flow\b|\bcashflow\b|\bimmediate\b|\burgent\b/.test(value)) {
    objectives.push("find_immediate_cashflow");
  }

  return [...new Set(objectives)];
}

function inferHunterRevenueMode(text: string): LeadHunterRevenueMode {
  const value = text.toLowerCase();

  if (
    /\bquick revenue\b|\bcash flow\b|\bcashflow\b|\bfast\b|\bimmediate\b|\bsmall project\b/.test(
      value,
    )
  ) {
    return "quick_revenue";
  }

  if (/\beasy win\b|\beasy wins\b|\blow effort\b/.test(value)) {
    return "easy_wins";
  }

  if (/\brecurring\b|\bretainer\b|\bmaintenance contract\b|\bcleaning contract\b/.test(value)) {
    return "recurring_revenue";
  }

  if (/\bhigh value\b|\blarge project\b|\bbig contract\b/.test(value)) {
    return "high_value";
  }

  if (/\bstrategic\b|\bframework\b|\blong term\b|\blong-term\b/.test(value)) {
    return "strategic";
  }

  return "balanced";
}

function locationTokens(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return uniqueStrings(value.split(/[,;/|]+/g).map((item) => item.trim()));
}

function buildLeadHunterRequest(
  mission: Mission,
  handoff: EmployeeHandoff,
): LeadHunterSearchRequest {
  const combinedText = [
    mission.objective,
    mission.instruction,
    mission.target_service ?? "",
    mission.target_market ?? "",
    mission.target_location ?? "",
    handoff.reason,
  ].join("\n");

  const services = inferHunterServices(combinedText);

  const companies = inferHunterCompanies(services);

  const objectives = inferHunterObjectives(combinedText);

  const revenueMode = inferHunterRevenueMode(combinedText);

  const tenderFocused =
    objectives.includes("find_active_tenders") || objectives.includes("find_rfqs");

  const minimumDepth = minimumDepthForServiceCount(services.length);

  const searchDepth = tenderFocused ? "deep" : minimumDepth;

  const locations = locationTokens(mission.target_location);

  const resultCount = Math.max(
    1,
    Math.min(20, mission.required_result_count ?? DEFAULT_WORKFORCE_HUNT_RESULTS),
  );

  const searchInstruction = [
    mission.objective,
    mission.target_market ? `Target market: ${mission.target_market}.` : null,
    mission.target_location ? `Target location: ${mission.target_location}.` : null,
    mission.target_service ? `Target service: ${mission.target_service}.` : null,
    "Find legitimate organisations and opportunities that Cossa can realistically serve.",
    "Prioritise buyer intent, current pain signals, urgency, public contactability, revenue potential, ease to close, recurring value and geographic fit.",
    "Reject competitors, directories, duplicate CRM leads, unsupported assumptions and unverifiable prospects.",
    "Do not invent organisations, contacts, needs, budgets, tenders, deadlines, evidence or completed actions.",
    "Prefer recent and independently corroborated public evidence.",
    "Return only prospects that survive the Lead Hunter verification rules.",
  ]
    .filter(Boolean)
    .join(" ");

  return validateSearchRequest({
    ...DEFAULT_LEAD_HUNTER_REQUEST,

    companies,

    services,

    locations: locations.length > 0 ? locations : DEFAULT_LEAD_HUNTER_REQUEST.locations,

    result_count: resultCount,

    minimum_score: tenderFocused ? 70 : 60,

    minimum_evidence_sources: 2,

    require_public_phone_or_email: true,

    require_opportunity_signal: true,

    verified_sources_only: true,

    exclude_existing_crm_leads: true,

    search_instruction: searchInstruction,

    revenue_mode: revenueMode,

    objectives,

    search_depth: searchDepth,

    search_scope: locations.length > 0 ? "custom" : DEFAULT_LEAD_HUNTER_REQUEST.search_scope,

    revenue_first: true,

    easy_wins_only: revenueMode === "easy_wins" || revenueMode === "quick_revenue",

    exclude_competitors: true,

    exclude_directories: true,

    exclude_expired_procurement: true,

    use_cached_results: true,

    notes: `Cossa AI workforce mission ${mission.id}.`,
  });
}

function formatHunterProspect(prospect: LeadHunterProspect, index: number): string {
  const contact =
    prospect.public_phone ||
    prospect.public_email ||
    prospect.contact_page_url ||
    "No public direct contact retained";

  const location = [prospect.suburb, prospect.city, prospect.province, prospect.country]
    .filter(Boolean)
    .join(", ");

  const independentSources = prospect.verification_meta?.independent_source_count ?? 0;

  return [
    `${index + 1}. ${prospect.organisation_name}`,
    `Priority: ${prospect.sales_priority.toUpperCase()} | Score: ${prospect.total_score}/100`,
    `Recommended service: ${prospect.recommended_service}`,
    `Cossa business: ${prospect.recommended_company}`,
    `Location: ${location || "Not confirmed"}`,
    `Contact route: ${contact}`,
    `Opportunity: ${prospect.opportunity_summary}`,
    `Why contact: ${
      prospect.why_contact.length > 0 ? prospect.why_contact.join(" ") : prospect.service_fit_reason
    }`,
    `Independent sources: ${independentSources}`,
    `Primary evidence: ${prospect.primary_source_url}`,
    `Next action: ${prospect.next_action}`,
  ].join("\n");
}

async function executeLeadHunterTool({
  mission,
  handoff,
  workflowHandoffs,
}: {
  mission: Mission;
  handoff: EmployeeHandoff;
  workflowHandoffs: EmployeeHandoff[];
}): Promise<LeadHunterExecutionResult> {
  const request = buildLeadHunterRequest(mission, handoff);

  const response = await huntProspects(request);

  const crmResult = await saveProspectsToCrm(response.prospects);

  const createdLeadIds = crmResult.created.map((item) => item.lead_id);

  const duplicateLeadIds = crmResult.duplicates.map((item) => item.lead_id);

  const leadIds = uniqueStrings([...createdLeadIds, ...duplicateLeadIds]);

  const prospectIds = uniqueStrings(response.prospects.map((prospect) => prospect.id));

  const retainedRecordIds: Record<string, unknown> = {
    hunt_id: response.hunt_id,

    prospect_ids: prospectIds,

    lead_ids: leadIds,

    crm_created_lead_ids: createdLeadIds,

    crm_existing_lead_ids: duplicateLeadIds,
  };

  await mergeHandoffRetainedRecordIds({
    handoffId: handoff.id,

    missionId: mission.id,

    recordIds: retainedRecordIds,
  });

  handoff.retained_record_ids = {
    ...(handoff.retained_record_ids ?? {}),
    ...retainedRecordIds,
  };

  const nextHandoff = nextWorkflowHandoffForHandoff({
    currentHandoff: handoff,
    workflowHandoffs,
  });

  if (nextHandoff) {
    await mergeHandoffRetainedRecordIds({
      handoffId: nextHandoff.id,

      missionId: mission.id,

      recordIds: retainedRecordIds,
    });

    nextHandoff.retained_record_ids = {
      ...(nextHandoff.retained_record_ids ?? {}),
      ...retainedRecordIds,
    };
  }

  const prospectSummary =
    response.prospects.length > 0
      ? response.prospects
          .slice(0, 10)
          .map((prospect, index) => formatHunterProspect(prospect, index))
          .join("\n\n")
      : "No prospect passed the current verification and qualification rules.";

  const content = [
    "LEAD HUNTER EXECUTION",
    "",
    "Verified inputs",
    `Hunt ID: ${response.hunt_id}`,
    `Workflow outcome: ${response.status}`,
    `Execution engine: ${LEAD_HUNTER_TOOL_NAME}`,
    `Providers used: ${
      response.providers_used.length > 0
        ? response.providers_used.join(", ")
        : "Server route did not report provider names"
    }`,
    `Public evidence sources processed: ${response.source_count}`,
    `Provider diagnostics: ${response.provider_diagnostics.map((item) => `${item.provider}=${item.configuration_required ? "configuration required" : item.failed ? "failed" : item.succeeded ? "succeeded" : "not attempted"} (${item.result_count} results)`).join("; ") || "None reported"}`,
    "",
    "Work completed",
    `Verified prospects accepted: ${response.accepted_count}`,
    `Prospects rejected by search/verification rules: ${response.rejected_count}`,
    `CRM records created: ${crmResult.created.length}`,
    `Existing CRM matches retained instead of duplicated: ${crmResult.duplicates.length}`,
    `CRM save failures: ${crmResult.failed.length}`,
    "",
    "Verified prospect intelligence",
    prospectSummary,
    "",
    "Retained record identifiers",
    `Lead Hunter hunt ID: ${response.hunt_id}`,
    `Prospect IDs: ${prospectIds.length > 0 ? prospectIds.join(", ") : "None"}`,
    `CRM lead IDs: ${leadIds.length > 0 ? leadIds.join(", ") : "None"}`,
    "",
    "Warnings",
    response.warnings.length > 0
      ? response.warnings.map((warning) => `- ${warning}`).join("\n")
      : "No server warnings returned.",
    crmResult.failed.length > 0
      ? [
          "",
          "CRM save issues",
          ...crmResult.failed
            .slice(0, 5)
            .map((failure) => `- ${failure.prospect.organisation_name}: ${failure.error}`),
        ].join("\n")
      : "",
    "",
    "Handoff to next employee",
    nextHandoff
      ? "The verified Hunt ID, prospect IDs and CRM lead IDs were retained on the next recorded handoff. Lead Intake must use these real records rather than inventing replacement leads."
      : "This is the final recorded workforce stage.",
    "",
    "High-risk owner decisions required",
    "None for internal research and CRM preparation.",
    "",
    "External actions status",
    "No prospect was contacted. No email, WhatsApp message, phone call, quotation, proposal, tender submission, contract, payment or external commitment was performed.",
  ]
    .filter((value) => value !== "")
    .join("\n");

  return {
    content,
    retainedRecordIds,
  };
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
  const compactPrevious = compactPriorOutputsForPrompt(priorOutputs);

  const compactEvidence = compactAuthorisedEvidence(authorisedEvidence);

  const stage = handoffStageNumber(handoff);

  const totalStages =
    typeof handoff.context?.total_stages === "number" ? handoff.context.total_stages : null;

  const safeHandoffContext = clampText(JSON.stringify(handoff.context), MAX_HANDOFF_CONTEXT_CHARS);

  const retainedRecordContext = clampText(
    JSON.stringify(handoff.retained_record_ids ?? {}),
    MAX_RETAINED_RECORD_CONTEXT_CHARS,
  );

  const nextInstruction = nextEmployee
    ? `Next recorded worker: ${nextEmployee.name} (${canonicalEmployeeKey(
        nextEmployee.employee_key,
      )}). Hand work only to that worker.`
    : "This is the final recorded stage. Do not invent another worker.";

  const evidence =
    compactEvidence.length > 0 ? compactEvidence.join("\n\n") : "No extra authorised evidence.";

  const previous =
    compactPrevious.length > 0
      ? compactPrevious.map((output, index) => `Prior output ${index + 1}:\n${output}`).join("\n\n")
      : "No prior output required.";

  const employeeKey = canonicalEmployeeKey(employee.employee_key);

  const specialistInstructions =
    employeeKey === "lead-intake-coordinator"
      ? [
          "Use retained Hunt, prospect and CRM lead IDs as authoritative record references.",
          "Do not create replacement fictional leads.",
          "Separate newly created CRM records from existing duplicate CRM records.",
          "Classify and route only what is supported by the Lead Hunter evidence.",
        ]
      : employeeKey === "sales-conversion-specialist"
        ? [
            "Use only verified prospect and CRM information supplied by prior stages.",
            "Prioritise HOT and WARM opportunities using evidence, value, urgency and contactability.",
            "Prepare outreach strategy, discovery questions, objections, follow-up and quotation/proposal requirements.",
            "Do not claim outreach was sent or a customer agreed unless a verified external execution record exists.",
          ]
        : [];

  const prompt = [
    `Role: ${employee.title} (${employeeKey}).`,
    `Department: ${employee.department}.`,
    stage !== null ? `Workflow stage: ${stage}${totalStages ? `/${totalStages}` : ""}.` : "",
    `Assigned work: ${handoff.reason}`,
    `Mission objective: ${mission.objective}`,
    `Target: ${mission.target_market || "unspecified"} / ${
      mission.target_location || "unspecified"
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

    ...specialistInstructions,

    "Return these short sections:",
    "Verified inputs",
    "Work completed",
    "Visual or media requirements",
    "Missing information or integrations",
    "Handoff to next employee",
    "High-risk owner decisions required",
    "External actions status",

    `Context: ${safeHandoffContext}`,
    `Retained source and CRM record IDs: ${retainedRecordContext}`,
    `Evidence:\n${evidence}`,
    previous,
  ]
    .filter(Boolean)
    .join("\n\n");

  return clampText(prompt, MAX_STAGE_PROMPT_CHARS);
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

function AiWorkforce() {
  const queryClient = useQueryClient();

  const navigate = useNavigate({
    from: "/ai/workforce",
  });

  const search = Route.useSearch();

  const view = search.view;

  const selectedDepartment = search.department;

  const [employeeSearch, setEmployeeSearch] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [objective, setObjective] = useState(
    "Build and continuously improve Cossa Nexus Holdings' professional social, digital growth, customer-acquisition and commercial operating system using verified company information.",
  );

  const [targetMarket, setTargetMarket] = useState("South Africa");

  const [targetLocation, setTargetLocation] = useState("Gauteng");

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const [ceoCommand, setCeoCommand] = useState("");

  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "success" | "error">("idle");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* URL NAVIGATION                                                           */
  /* ------------------------------------------------------------------------ */

  function setView(nextView: WorkforceView) {
    void navigate({
      search: (previous) => ({
        ...previous,
        view: nextView,
      }),
    });
  }

  function setSelectedDepartment(department: WorkforceDepartment) {
    void navigate({
      search: (previous) => ({
        ...previous,
        department,
      }),
    });
  }

  function openEmployees(department: WorkforceDepartment = "all") {
    void navigate({
      search: (previous) => ({
        ...previous,
        view: "employees",
        department,
      }),
    });
  }

  function openDepartment(department: Exclude<WorkforceDepartment, "all">) {
    setEmployeeSearch("");

    setSelectedEmployeeId(null);

    openEmployees(department);
  }

  /* ------------------------------------------------------------------------ */
  /* QUERIES                                                                  */
  /* ------------------------------------------------------------------------ */

  const employeesQuery = useQuery({
    queryKey: ["ai-workforce-employees"],
    queryFn: () => listEmployees(),
  });

  const missionsQuery = useQuery({
    queryKey: ["ai-workforce-missions"],
    queryFn: () => listMissions(),
  });

  const handoffsQuery = useQuery({
    queryKey: ["ai-workforce-handoffs"],
    queryFn: () => listEmployeeHandoffs(),
  });

  const runsQuery = useQuery({
    queryKey: ["ai-workforce-runs"],
    queryFn: () => listWorkforceRuns(),
  });

  const approvalsQuery = useQuery({
    queryKey: ["ai-workforce-approvals"],
    queryFn: () => listPendingApprovals(),
  });

  const runtimeQuery = useQuery({
    queryKey: ["cossa-agent-runtime"],
    queryFn: getAgentRuntimeDashboard,
  });

  /* ------------------------------------------------------------------------ */
  /* REFRESH                                                                  */
  /* ------------------------------------------------------------------------ */

  const refreshWorkforce = async () => {
    if (refreshState === "refreshing") return;

    setRefreshState("refreshing");
    setRefreshError(null);

    const results = await Promise.allSettled([
      employeesQuery.refetch(),
      missionsQuery.refetch(),
      handoffsQuery.refetch(),
      runsQuery.refetch(),
      approvalsQuery.refetch(),
      runtimeQuery.refetch(),
      queryClient.refetchQueries({ queryKey: ["ops-tasks"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["integrations"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["notifications"], type: "active" }),
    ]);

    const failed = results.find((result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" &&
        typeof result.value === "object" &&
        result.value !== null &&
        "isError" in result.value &&
        result.value.isError === true),
    );

    if (failed) {
      const message = failed.status === "rejected" && failed.reason instanceof Error
        ? failed.reason.message
        : "One or more critical workforce sources could not be refreshed.";
      setRefreshError(message);
      setRefreshState("error");
      toast.error("Workforce refresh failed", { description: message });
      return;
    }

    const completedAt = new Date().toISOString();
    setLastRefreshedAt(completedAt);
    setRefreshState("success");
    toast.success("Workforce refreshed", {
      description: "Employees, missions, assignments, runs, approvals and runtime state were refetched.",
    });
  };

  /* ------------------------------------------------------------------------ */
  /* SETUP                                                                    */
  /* ------------------------------------------------------------------------ */

  const installMutation = useMutation({
    mutationFn: () => installCossaGrowthWorkforce(),

    onSuccess: async (result) => {
      await refreshWorkforce();

      const activeCount = result.filter((employee) => employee.status === "active").length;

      toast.success("Cossa workforce synchronised", {
        description: `${result.length} employee records are available and ${activeCount} are active. Existing custom employees were preserved.`,
      });
    },

    onError: (error) => {
      toast.error("Workforce setup could not be completed", {
        description: normaliseErrorMessage(error),
      });
    },
  });

  /* ------------------------------------------------------------------------ */
  /* WORKFLOW CREATION                                                        */
  /* ------------------------------------------------------------------------ */

  const coordinationMutation = useMutation({
    mutationFn: (input: CreateGrowthCoordinationMissionInput) =>
      createGrowthCoordinationMission(input),

    onSuccess: async ({ mission, handoffs: createdHandoffs }) => {
      setSelectedMissionId(mission.id);

      await refreshWorkforce();

      toast.success("Growth mission created", {
        description: `${createdHandoffs.length} real Growth workforce stages were created.`,
      });

      setView("workflows");
    },

    onError: (error) => {
      toast.error("Growth mission could not be created", {
        description: normaliseErrorMessage(error),
      });
    },
  });

  const revenueMutation = useMutation({
    mutationFn: (input: CreateCoordinationMissionInput) => createRevenueAcquisitionMission(input),

    onSuccess: async ({ mission, handoffs: createdHandoffs }) => {
      setSelectedMissionId(mission.id);

      await refreshWorkforce();

      toast.success("Revenue hunt created", {
        description: `${createdHandoffs.length} real revenue stages were created: Lead Hunter → Lead Intake → Sales & Conversion → AI CEO.`,
      });

      setView("workflows");
    },

    onError: (error) => {
      toast.error("Revenue hunt could not be created", {
        description: normaliseErrorMessage(error),
      });
    },
  });

  /* ------------------------------------------------------------------------ */
  /* SOURCE DATA                                                              */
  /* ------------------------------------------------------------------------ */

  const employees = employeesQuery.data ?? EMPTY_EMPLOYEES;

  const missions = missionsQuery.data ?? EMPTY_MISSIONS;

  const handoffs = handoffsQuery.data ?? EMPTY_HANDOFFS;

  const runs = runsQuery.data ?? EMPTY_RUNS;

  const approvals = approvalsQuery.data ?? EMPTY_APPROVALS;

  const employeesByKey = useMemo(() => {
    const map = new Map<string, AiEmployee>();

    for (const employee of employees) {
      const key = canonicalEmployeeKey(employee.employee_key);

      const existing = map.get(key);

      if (!existing || employee.employee_key === key) {
        map.set(key, employee);
      }
    }

    return map;
  }, [employees]);

  /* ------------------------------------------------------------------------ */
  /* OPERATIONAL DIRECTORY                                                    */
  /* ------------------------------------------------------------------------ */

  const employeeOperationalViews = useMemo(
    () =>
      employees.map((employee) => ({
        employee,

        operational: employeeOperationalView({
          employee,
          handoffs,
          runs,
          approvals,
        }),
      })),
    [employees, handoffs, runs, approvals],
  );

  const employeeDirectory = useMemo<EmployeeDirectoryItem[]>(
    () =>
      employeeOperationalViews.map(({ employee, operational }) => ({
        employee,
        operational,

        departmentKeys: departmentKeysForEmployee(employee.employee_key),

        responsibilityLabels: responsibilityLabelsForEmployee(employee.employee_key),

        searchText: searchTermsForEmployee(employee),
      })),
    [employeeOperationalViews],
  );

  const workforceCounts = useMemo(() => {
    let working = 0;
    let idle = 0;
    let waiting = 0;
    let approval = 0;
    let attention = 0;
    let inactive = 0;

    for (const item of employeeOperationalViews) {
      switch (item.operational.state) {
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
  }, [employeeOperationalViews]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employeeDepartment(employee)))).sort(),
    [employees],
  );

  const searchedEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    return employeeDirectory
      .filter((item) => {
        if (selectedDepartment !== "all" && !item.departmentKeys.includes(selectedDepartment)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return searchScore(item, query) > 0;
      })
      .sort((left, right) => {
        if (!query) {
          if (left.operational.state === "working" && right.operational.state !== "working") {
            return -1;
          }

          if (right.operational.state === "working" && left.operational.state !== "working") {
            return 1;
          }

          return left.employee.name.localeCompare(right.employee.name);
        }

        return searchScore(right, query) - searchScore(left, query);
      });
  }, [employeeDirectory, employeeSearch, selectedDepartment]);

  const selectedEmployee =
    employeeDirectory.find((item) => item.employee.id === selectedEmployeeId) ?? null;

  /* ------------------------------------------------------------------------ */
  /* READINESS                                                                */
  /* ------------------------------------------------------------------------ */

  const installedDefaultEmployees = COSSA_GROWTH_WORKFORCE.filter((profile) =>
    employeesByKey.has(profile.employee_key),
  );

  const activeDefaultEmployees = COSSA_GROWTH_WORKFORCE.filter(
    (profile) => employeesByKey.get(profile.employee_key)?.status === "active",
  );

  const activeExecutableGrowthEmployees = EXECUTABLE_GROWTH_WORKFLOW.filter(
    (step) => employeesByKey.get(step.key)?.status === "active",
  );

  const activeExecutableRevenueEmployees = EXECUTABLE_REVENUE_WORKFLOW.filter(
    (step) => employeesByKey.get(step.key)?.status === "active",
  );

  /* ------------------------------------------------------------------------ */
  /* MISSION DATA                                                             */
  /* ------------------------------------------------------------------------ */

  const coordinationMissions = missions.filter(
    (mission) =>
      mission.title.startsWith(GROWTH_MISSION_PREFIX) ||
      mission.title.startsWith(REVENUE_MISSION_PREFIX),
  );

  const selectedMission =
    coordinationMissions.find((mission) => mission.id === selectedMissionId) ??
    coordinationMissions[0] ??
    null;

  const selectedWorkflowKind = missionWorkforceKind(selectedMission);

  const selectedWorkflowSteps = workflowForMission(selectedMission);

  const selectedMissionHandoffs = selectedMission
    ? sortWorkflowHandoffs(handoffs.filter((handoff) => handoff.mission_id === selectedMission.id))
    : [];

  const firstIncompleteHandoff =
    selectedMissionHandoffs.find((handoff) => handoff.status !== "completed") ?? null;

  const nextHandoff = firstIncompleteHandoff?.status === "pending" ? firstIncompleteHandoff : null;

  const blockedHandoff =
    firstIncompleteHandoff && firstIncompleteHandoff.status !== "pending"
      ? firstIncompleteHandoff
      : null;

  const nextEmployee = firstIncompleteHandoff
    ? (employees.find((employee) => employee.id === firstIncompleteHandoff.to_employee_id) ?? null)
    : null;

  const selectedMissionRuns = selectedMission
    ? runs
        .filter((run) => run.mission_id === selectedMission.id)
        .sort((left, right) => latestRunTime(left).localeCompare(latestRunTime(right)))
    : [];

  const reviewableOutputs = selectedMissionRuns
    .map((run) => ({
      run,

      content: reviewableOutputContent(run),
    }))
    .filter(
      (
        item,
      ): item is {
        run: MissionRun;
        content: string;
      } => Boolean(item.content),
    );

  const displayReviewableOutputs = [...reviewableOutputs].reverse();

  const selectedMissionFailedRuns = selectedMissionRuns.filter((run) => run.status === "failed");

  const selectedMissionCompletedRuns = selectedMissionRuns.filter(
    (run) => run.status === "completed",
  );

  const isLoading =
    employeesQuery.isLoading ||
    missionsQuery.isLoading ||
    handoffsQuery.isLoading ||
    runsQuery.isLoading ||
    approvalsQuery.isLoading;

  const canCreateGrowth =
    activeExecutableGrowthEmployees.length === EXECUTABLE_GROWTH_WORKFLOW.length &&
    objective.trim().length > 0;

  const canCreateRevenue =
    activeExecutableRevenueEmployees.length === EXECUTABLE_REVENUE_WORKFLOW.length &&
    objective.trim().length > 0;

  const workflowCreationPending = coordinationMutation.isPending || revenueMutation.isPending;

  /* ------------------------------------------------------------------------ */
  /* CEO COMMAND                                                              */
  /* ------------------------------------------------------------------------ */

  function submitCeoCommand() {
    const command = ceoCommand.trim();

    if (!command) {
      return;
    }

    const revenueRequest = commandLooksLikeRevenueWork(command);

    if (revenueRequest) {
      if (activeExecutableRevenueEmployees.length !== EXECUTABLE_REVENUE_WORKFLOW.length) {
        toast.error("Revenue workforce is not fully active", {
          description: `${activeExecutableRevenueEmployees.length} of ${EXECUTABLE_REVENUE_WORKFLOW.length} revenue employees are active.`,
        });

        return;
      }

      setObjective(command);

      revenueMutation.mutate({
        objective: command,

        target_market: targetMarket,

        target_location: targetLocation,
      });

      return;
    }

    if (activeExecutableGrowthEmployees.length !== EXECUTABLE_GROWTH_WORKFLOW.length) {
      toast.error("Growth workforce is not fully active", {
        description: `${activeExecutableGrowthEmployees.length} of ${EXECUTABLE_GROWTH_WORKFLOW.length} Growth employees are active.`,
      });

      return;
    }

    setObjective(command);

    coordinationMutation.mutate({
      objective: command,

      target_market: targetMarket,

      target_location: targetLocation,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* LANGUAGE MODEL EXECUTION                                                 */
  /* ------------------------------------------------------------------------ */

  async function executeProviderWithRetry({
    prompt,
    employee,
  }: {
    prompt: string;
    employee: AiEmployee;
  }): Promise<string> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= PROVIDER_MAX_ATTEMPTS; attempt += 1) {
      try {
        const content = await streamChat(
          [
            {
              role: "user",

              content: prompt,
            },
          ],

          () => undefined,

          undefined,

          employee.system_instructions,

          DEFAULT_WORKFORCE_PROVIDER,
        );

        if (!content.trim()) {
          throw new Error(`${employee.name} did not return a usable workforce output.`);
        }

        return content.trim();
      } catch (error) {
        lastError = error;

        const retryable = isRetryableProviderError(error);

        const hasAnotherAttempt = attempt < PROVIDER_MAX_ATTEMPTS;

        if (!retryable || !hasAnotherAttempt) {
          break;
        }

        const delay = PROVIDER_RETRY_DELAYS_MS[attempt - 1] ?? 5_000;

        console.warn(
          `Cossa AI provider attempt ${attempt} failed for ${employee.employee_key}. Retrying in ${delay}ms.`,
          error,
        );

        await sleep(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("The workforce language-model provider failed after all retry attempts.");
  }

  /* ------------------------------------------------------------------------ */
  /* EXECUTE ONE HANDOFF                                                      */
  /* ------------------------------------------------------------------------ */

  async function executeControlledHandoff({
    mission,
    handoff,
    employee,
    priorOutputs,
  }: {
    mission: Mission;
    handoff: EmployeeHandoff;
    employee: AiEmployee;
    priorOutputs: string[];
  }): Promise<{
    content: string;
    finalStage: boolean;
  }> {
    if (employee.status !== "active") {
      throw new Error(`${employee.name} is ${employee.status} and cannot execute this stage.`);
    }

    if (handoff.status !== "pending") {
      throw new Error(
        `${employee.name}'s handoff is ${handoff.status}, not pending. The workflow will not skip or duplicate this stage.`,
      );
    }

    const employeeKey = canonicalEmployeeKey(employee.employee_key);

    const leadHunterStage = employeeKey === "lead-hunter";

    const actualNextEmployee = nextWorkflowEmployeeForHandoff({
      currentHandoff: handoff,

      workflowHandoffs: selectedMissionHandoffs,

      employees,
    });

    const authorisedEvidence =
      employeeKey === "website-seo-monitor"
        ? [websiteReportEvidence(await checkOfficialWebsite())]
        : [];

    const compactPrevious = compactPriorOutputsForPrompt(priorOutputs);

    const compactEvidence = compactAuthorisedEvidence(authorisedEvidence);

    const run = await startControlledWorkforceRun({
      mission,
      handoff,
      employee,

      provider: leadHunterStage ? LEAD_HUNTER_TOOL_PROVIDER : DEFAULT_WORKFORCE_PROVIDER,

      modelName: leadHunterStage ? LEAD_HUNTER_TOOL_NAME : DEFAULT_WORKFORCE_MODEL,

      executionKind: leadHunterStage ? "tool" : "language_model",

      priorOutputs: compactPrevious,

      authorisedEvidence: compactEvidence,
    });

    try {
      let content: string;

      if (leadHunterStage) {
        const hunterResult = await executeLeadHunterTool({
          mission,
          handoff,
          workflowHandoffs: selectedMissionHandoffs,
        });

        content = hunterResult.content;
      } else {
        const prompt = controlledStagePrompt({
          mission,
          handoff,
          employee,

          nextEmployee: actualNextEmployee,

          priorOutputs: compactPrevious,

          authorisedEvidence: compactEvidence,
        });

        if (prompt.length > MAX_STAGE_PROMPT_CHARS) {
          throw new Error(
            `Cossa AI prompt safety check failed. Prompt length ${prompt.length} exceeds ${MAX_STAGE_PROMPT_CHARS}.`,
          );
        }

        content = await executeProviderWithRetry({
          prompt,
          employee,
        });
      }

      const result = await completeControlledWorkforceRun({
        run,
        handoff,
        employee,
        content,
        missionObjective: mission.objective,
      });

      return {
        content,

        finalStage: result.finalStage,
      };
    } catch (error) {
      const message = normaliseErrorMessage(error);

      try {
        await failControlledWorkforceRun({
          run,
          handoff,

          errorMessage: message,
        });
      } catch (cleanupError) {
        console.error("Unable to record controlled workforce failure", cleanupError);
      }

      throw error;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RUN NEXT STAGE                                                           */
  /* ------------------------------------------------------------------------ */

  const runNextStageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMission) {
        throw new Error("Select a workforce mission first.");
      }

      if (blockedHandoff) {
        throw new Error(
          `The next workflow stage is ${blockedHandoff.status}. Cossa AI will not skip it.`,
        );
      }

      if (!nextHandoff || !nextEmployee) {
        throw new Error("This mission has no executable pending stage.");
      }

      const priorOutputs = compactPriorOutputsForPrompt(
        reviewableOutputs.map((item) => item.content),
      );

      return executeControlledHandoff({
        mission: selectedMission,

        handoff: nextHandoff,

        employee: nextEmployee,

        priorOutputs,
      });
    },

    onSuccess: async ({ finalStage }) => {
      await refreshWorkforce();

      toast.success(finalStage ? "Workforce workflow completed" : "Employee stage completed", {
        description: finalStage
          ? "All recorded stages completed successfully."
          : "The employee completed the stage and handed work forward.",
      });
    },

    onError: (error) => {
      toast.error("Workforce stage could not run", {
        description: normaliseErrorMessage(error),
      });
    },
  });

  /* ------------------------------------------------------------------------ */
  /* AUTOMATIC SAFE CHAIN                                                     */
  /* ------------------------------------------------------------------------ */

  const runSafeWorkflowMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMission) {
        throw new Error("Select a workforce mission first.");
      }

      if (selectedMission.status === "completed") {
        throw new Error("This mission is already completed.");
      }

      if (selectedMission.status === "awaiting_approval") {
        throw new Error("This mission is paused at an owner approval checkpoint.");
      }

      const incomplete = selectedMissionHandoffs.filter(
        (handoff) => handoff.status !== "completed",
      );

      if (incomplete.length === 0) {
        throw new Error("This mission has no incomplete stages.");
      }

      const firstIncomplete = incomplete[0];

      if (firstIncomplete.status === "accepted") {
        const employee = employees.find(
          (candidate) => candidate.id === firstIncomplete.to_employee_id,
        );

        throw new Error(
          `${
            employee?.name ?? "The next employee"
          } already owns the next stage. The chain will not skip it.`,
        );
      }

      if (firstIncomplete.status !== "pending") {
        throw new Error(
          `The next workflow stage is ${firstIncomplete.status}. Automatic execution will not skip it.`,
        );
      }

      const pendingSequence: EmployeeHandoff[] = [];

      for (const handoff of incomplete) {
        if (handoff.status !== "pending") {
          break;
        }

        pendingSequence.push(handoff);
      }

      if (pendingSequence.length === 0) {
        throw new Error("No executable pending workflow stage is available.");
      }

      let accumulatedOutputs = compactPriorOutputsForPrompt(
        reviewableOutputs.map((item) => item.content),
      );

      let completedStages = 0;

      let reachedFinalStage = false;

      for (let index = 0; index < pendingSequence.length; index += 1) {
        const handoff = pendingSequence[index];

        const employee = employees.find((candidate) => candidate.id === handoff.to_employee_id);

        if (!employee) {
          throw new Error(`Pending handoff references missing employee ${handoff.to_employee_id}.`);
        }

        if (employee.status !== "active") {
          throw new Error(`${employee.name} is ${employee.status}. Automatic execution stopped.`);
        }

        const result = await executeControlledHandoff({
          mission: selectedMission,

          handoff,

          employee,

          priorOutputs: accumulatedOutputs,
        });

        accumulatedOutputs = compactPriorOutputsForPrompt([...accumulatedOutputs, result.content]);

        completedStages += 1;

        reachedFinalStage = result.finalStage;

        if (reachedFinalStage) {
          break;
        }

        if (index < pendingSequence.length - 1) {
          await sleep(WORKFORCE_STAGE_DELAY_MS);
        }
      }

      return {
        completedStages,
        reachedFinalStage,
      };
    },

    onSuccess: async ({ completedStages, reachedFinalStage }) => {
      await refreshWorkforce();

      toast.success(
        reachedFinalStage ? "Workforce mission completed" : "Workforce mission progressed",
        {
          description: `${completedStages} employee stage${
            completedStages === 1 ? "" : "s"
          } completed.`,
        },
      );
    },

    onError: (error) => {
      toast.error("Automatic workforce chain stopped", {
        description: normaliseErrorMessage(error),
      });
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

                <StatusBadge status={workspaceRuntimeStatus()} />
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
                Cossa <span className="text-gradient-gold">AI Company</span>
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Find the right department or employee, delegate work to the AI CEO, run the real
                Lead Hunter revenue system and monitor company execution without pretending that
                missing integrations exist.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshWorkforce()}
                disabled={isLoading || refreshState === "refreshing"}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshState === "refreshing" ? "animate-spin" : ""}`} />
                {refreshState === "refreshing" ? "Refreshing" : "Refresh"}
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

          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground" aria-live="polite">
            <span className={refreshState === "error" ? "text-destructive" : refreshState === "success" ? "text-primary" : ""}>
              {refreshState === "refreshing" ? "REFRESHING" : refreshState === "success" ? "SUCCESS" : refreshState === "error" ? "ERROR" : "READY"}
            </span>
            <span>LAST REFRESHED: {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleString("en-ZA") : "Not yet"}</span>
            {refreshError ? <span className="normal-case tracking-normal text-destructive">{refreshError}</span> : null}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />

            <input
              value={employeeSearch}
              onChange={(event) => {
                const value = event.target.value;

                setEmployeeSearch(value);

                if (value.trim()) {
                  openEmployees("all");
                }
              }}
              placeholder='Find anyone by name or responsibility — try "Lead Hunter", "customers", "sales", "SEO", "supplier", "website"...'
              className="h-14 w-full rounded-2xl border border-primary/30 bg-background/60 pl-12 pr-12 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/10"
            />

            {employeeSearch ? (
              <button
                type="button"
                onClick={() => setEmployeeSearch("")}
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
            active={view === "command"}
            icon={Command}
            label="Command Centre"
            onClick={() => setView("command")}
          />

          <TopNavButton
            active={view === "departments"}
            icon={Building2}
            label="Departments"
            onClick={() => setView("departments")}
          />

          <TopNavButton
            active={view === "employees"}
            icon={UsersRound}
            label="Employees"
            onClick={() => openEmployees(selectedDepartment)}
          />

          <TopNavButton
            active={view === "workflows"}
            icon={Workflow}
            label="Workflows"
            onClick={() => setView("workflows")}
          />

          <TopNavButton
            active={view === "activity"}
            icon={Activity}
            label="Activity"
            onClick={() => setView("activity")}
          />

          <TopNavButton
            active={view === "control"}
            icon={ShieldCheck}
            label="Control Room"
            onClick={() => setView("control")}
          />
        </div>
      </section>

      {/* COMPANY METRICS */}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Employees" value={String(employees.length)} />

        <Metric
          label="Active"
          value={String(employees.filter((employee) => employee.status === "active").length)}
        />

        <Metric label="Working now" value={String(workforceCounts.working)} />

        <Metric label="Assigned" value={String(workforceCounts.waiting)} />

        <Metric label="Available" value={String(workforceCounts.idle)} />

        <Metric
          label="Needs attention"
          value={String(workforceCounts.attention + workforceCounts.approval)}
          warning={workforceCounts.attention + workforceCounts.approval > 0}
        />
      </section>

      {/* COMMAND CENTRE */}

      {view === "command" ? (
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
                  Customer and lead-hunting commands are automatically routed to the real Revenue
                  workflow. Marketing and campaign work stays in the Growth workflow.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-3">
              <textarea
                value={ceoCommand}
                onChange={(event) => setCeoCommand(event.target.value)}
                rows={4}
                placeholder="Example: Find 10 verified businesses in Pretoria and Centurion that are likely to need construction, commercial cleaning or website services. Prioritise quick revenue and do not contact anyone."
                className="w-full resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />

              <div className="mt-3 flex flex-col gap-2 border-t border-primary/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Target: <strong className="text-foreground">{targetMarket}</strong>
                  {" · "}
                  <strong className="text-foreground">{targetLocation}</strong>
                </div>

                <Button
                  type="button"
                  onClick={submitCeoCommand}
                  disabled={!ceoCommand.trim() || workflowCreationPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  {workflowCreationPending ? (
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}

                  {workflowCreationPending ? "CEO is organising the team…" : "Delegate to AI CEO"}
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/30 bg-background/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Search className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                    Revenue Hunter
                  </p>

                  <h3 className="mt-1 text-sm font-semibold">
                    Real prospect research — not Groq-generated leads
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The Lead Hunter uses the authenticated Cossa search and verification engine,
                    applies buyer-fit and evidence rules, protects CRM duplicates and carries real
                    lead IDs into Sales.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full border-primary/40 text-primary"
                onClick={() => {
                  setCeoCommand(
                    "Find 10 verified businesses in Pretoria, Centurion, Midrand and Johannesburg that Cossa Nexus Construction, Cossa Facility Services or Cossa Tech can realistically serve. Prioritise current pain signals, public contactability, quick revenue, recurring revenue and strong evidence. Do not contact anyone.",
                  );

                  setTargetMarket("South Africa");

                  setTargetLocation("Pretoria, Centurion, Midrand, Johannesburg");
                }}
              >
                <Search className="mr-1.5 h-4 w-4" />
                Prepare first real revenue hunt
              </Button>
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Quick requests
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  "Find 10 verified construction, cleaning or website prospects in Gauteng.",
                  "Find quick-revenue customers in Pretoria and Centurion.",
                  "Create a Facebook post and visual brief for Cossa.",
                  "Audit our website and prepare SEO improvements.",
                  "Build a 7-day social-media content plan.",
                  "Prepare a paid-media recommendation without spending money.",
                ].map((request) => (
                  <button
                    key={request}
                    type="button"
                    onClick={() => setCeoCommand(request)}
                    className="rounded-xl border border-border/60 bg-card/40 p-3 text-left text-xs leading-relaxed transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start gap-2">
                      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />

                      <span>{request}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Company departments
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">Go straight to the team</h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("departments")}
                className="text-primary"
              >
                View all
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {DEPARTMENTS.map((department) => {
                const Icon = department.icon;

                const activeCount = department.employeeKeys.filter(
                  (key) => employeesByKey.get(key)?.status === "active",
                ).length;

                return (
                  <button
                    key={department.key}
                    type="button"
                    onClick={() => openDepartment(department.key)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{department.name}</p>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {activeCount} active team member
                        {activeCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </button>
                );
              })}
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
                onClick={() => setView("activity")}
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
                description="Tasks waiting or ready to retry."
              />

              <QueueCard
                icon={AlertTriangle}
                title="Needs attention"
                value={workforceCounts.attention + workforceCounts.approval}
                description="Failures or owner-controlled checkpoints."
                warning={workforceCounts.attention + workforceCounts.approval > 0}
              />
            </div>
          </section>
        </div>
      ) : null}

      {/* DEPARTMENTS */}

      {view === "departments" ? (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Organisation
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">Departments</h2>

              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Choose the business function first. Revenue now includes the real Lead Hunter, Lead
                Intake and Sales & Conversion chain.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {DEPARTMENTS.length} operating groups
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEPARTMENTS.map((department) => {
              const Icon = department.icon;

              const team = employeeDirectory.filter((item) =>
                department.employeeKeys.includes(canonicalEmployeeKey(item.employee.employee_key)),
              );

              const activeTeam = team.filter((item) => item.employee.status === "active");

              return (
                <article
                  key={department.key}
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

                  <h3 className="mt-4 font-display text-xl font-semibold">{department.name}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {department.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {team.slice(0, 5).map((item) => (
                      <span
                        key={item.employee.id}
                        className="rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        {item.employee.name}
                      </span>
                    ))}

                    {team.length > 5 ? (
                      <span className="rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                        +{team.length - 5}
                      </span>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    onClick={() => openDepartment(department.key)}
                    className="mt-5 w-full bg-primary/10 text-primary hover:bg-primary/20"
                    variant="ghost"
                  >
                    Open department
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* EMPLOYEES */}

      {view === "employees" ? (
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
                  Search by employee, responsibility or normal business language. Try Lead Hunter,
                  customers, sales, flyer, SEO, supplier, website or tender.
                </p>
              </div>

              <span className="text-xs text-muted-foreground">
                {searchedEmployees.length} matching employee
                {searchedEmployees.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip
                active={selectedDepartment === "all"}
                label={`All employees (${employees.length})`}
                onClick={() => setSelectedDepartment("all")}
              />

              {DEPARTMENTS.map((department) => {
                const count = employeeDirectory.filter((item) =>
                  item.departmentKeys.includes(department.key),
                ).length;

                return (
                  <FilterChip
                    key={department.key}
                    active={selectedDepartment === department.key}
                    label={`${department.shortName} (${count})`}
                    onClick={() => setSelectedDepartment(department.key)}
                  />
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search employee or responsibility…"
                className="w-full rounded-xl border border-border/60 bg-background/50 py-3 pl-10 pr-10 text-sm outline-none focus:border-primary/50"
              />

              {employeeSearch ? (
                <button
                  type="button"
                  onClick={() => setEmployeeSearch("")}
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
            ) : searchedEmployees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium">No employee matched that search</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Try Lead Hunter, customers, sales, flyer, website, SEO, supplier, tender, Facebook
                  or leads.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {searchedEmployees.map((item) => (
                  <EmployeeCard
                    key={item.employee.id}
                    item={item}
                    onOpen={() => setSelectedEmployeeId(item.employee.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* WORKFLOWS */}

      {view === "workflows" ? (
        <div className="grid gap-5">
          <section className="glass-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Active workflow
                </p>

                <h2 className="mt-1 font-display text-2xl font-semibold">
                  {selectedWorkflowKind === "revenue"
                    ? "Revenue acquisition execution"
                    : "Growth workforce execution"}
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {selectedWorkflowKind === "revenue"
                    ? "Revenue missions run through the real Lead Hunter tool first, then Lead Intake, Sales & Conversion and the AI CEO."
                    : "Growth missions coordinate website intelligence, strategy, content, creative, social operations and growth analysis."}
                </p>
              </div>

              {coordinationMissions.length > 0 ? (
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Mission
                  <select
                    value={selectedMission?.id ?? ""}
                    onChange={(event) => setSelectedMissionId(event.target.value || null)}
                    className="min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  >
                    {coordinationMissions.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.title.startsWith(REVENUE_MISSION_PREFIX)
                          ? "[Revenue] "
                          : "[Growth] "}
                        {mission.objective.slice(0, 90)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div
              className={
                selectedWorkflowSteps.length <= 4
                  ? "mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4"
                  : "mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-9"
              }
            >
              {selectedWorkflowSteps.map((step, index) => {
                const Icon = step.icon;

                const handoff = selectedMissionHandoffs[index];

                const status = handoff?.status ?? "not_created";

                return (
                  <div
                    key={step.key}
                    className="relative rounded-xl border border-border/60 bg-card/40 p-3"
                  >
                    {index < selectedWorkflowSteps.length - 1 ? (
                      <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                    ) : null}

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>

                    <p className="mt-2 text-xs font-medium">{step.label}</p>

                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>

                    <p
                      className={
                        status === "completed"
                          ? "mt-2 text-[9px] uppercase tracking-widest text-success"
                          : status === "accepted"
                            ? "mt-2 text-[9px] uppercase tracking-widest text-warning"
                            : status === "pending"
                              ? "mt-2 text-[9px] uppercase tracking-widest text-primary"
                              : "mt-2 text-[9px] uppercase tracking-widest text-muted-foreground"
                      }
                    >
                      {formatStatus(status)}
                    </p>
                  </div>
                );
              })}
            </div>

            {!selectedMission ? (
              <div className="mt-5 rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                No Growth or Revenue coordination mission is selected.
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
                    {firstIncompleteHandoff?.reason ?? "No incomplete handoff remains."}
                  </p>

                  {nextEmployee &&
                  canonicalEmployeeKey(nextEmployee.employee_key) === "lead-hunter" ? (
                    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <p className="text-xs font-medium text-primary">
                        Real Lead Hunter tool stage
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        This employee will execute the authenticated Lead Hunter engine. It will not
                        use Groq to invent prospects.
                      </p>
                    </div>
                  ) : null}

                  {blockedHandoff ? (
                    <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                      <p className="text-xs text-warning">
                        Earlier stage is <strong>{formatStatus(blockedHandoff.status)}</strong>.
                        Cossa AI will not skip it.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2">
                    <Button
                      type="button"
                      onClick={() => runSafeWorkflowMutation.mutate()}
                      disabled={
                        !nextHandoff ||
                        Boolean(blockedHandoff) ||
                        runSafeWorkflowMutation.isPending ||
                        runNextStageMutation.isPending ||
                        selectedMission.status === "awaiting_approval" ||
                        selectedMission.status === "completed"
                      }
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                    >
                      {runSafeWorkflowMutation.isPending ? (
                        <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Workflow className="mr-1.5 h-4 w-4" />
                      )}

                      {runSafeWorkflowMutation.isPending ? "Team is working…" : "Run safe workflow"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => runNextStageMutation.mutate()}
                      disabled={
                        !nextHandoff ||
                        !nextEmployee ||
                        Boolean(blockedHandoff) ||
                        nextEmployee.status !== "active" ||
                        runNextStageMutation.isPending ||
                        runSafeWorkflowMutation.isPending ||
                        selectedMission.status === "awaiting_approval" ||
                        selectedMission.status === "completed"
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
                        {reviewableOutputs.length === 1 ? "" : "s"}
                      </h3>
                    </div>

                    <FileCheck2 className="h-5 w-5 text-primary" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniMetric label="Completed" value={selectedMissionCompletedRuns.length} />

                    <MiniMetric
                      label="Pending"
                      value={
                        selectedMissionHandoffs.filter((handoff) => handoff.status === "pending")
                          .length
                      }
                    />

                    <MiniMetric
                      label="Failed history"
                      value={selectedMissionFailedRuns.length}
                      warning={selectedMissionFailedRuns.length > 0}
                    />
                  </div>

                  {displayReviewableOutputs.length > 0 ? (
                    <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                      {displayReviewableOutputs.map(({ run, content }) => {
                        const worker = employees.find(
                          (employee) => employee.id === run.employee_id,
                        );

                        return (
                          <article
                            key={run.id}
                            className="rounded-lg border border-border/60 bg-background/40 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <span className="text-xs font-medium">
                                  {worker?.name ?? "Recorded worker"}
                                </span>

                                {run.model_provider ? (
                                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                                    {run.model_provider}
                                    {run.model_name ? ` · ${run.model_name}` : ""}
                                  </p>
                                ) : null}
                              </div>

                              <span className="text-[9px] uppercase tracking-widest text-success">
                                completed
                              </span>
                            </div>

                            <div className="mt-2 text-xs leading-relaxed text-muted-foreground [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:mt-2 [&_p:first-child]:mt-0 [&_ul]:ml-4 [&_ul]:list-disc">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            </div>
                          </article>
                        );
                      })}
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

          {/* CREATE WORKFLOW */}

          <section className="glass-card p-5">
            <div className="flex items-start gap-3">
              <Workflow className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  New workflow
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  Create Growth or Revenue mission
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <textarea
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                rows={4}
                className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary/50"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Target market
                  <input
                    value={targetMarket}
                    onChange={(event) => setTargetMarket(event.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted-foreground">
                  Target location
                  <input
                    value={targetLocation}
                    onChange={(event) => setTargetLocation(event.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() =>
                    coordinationMutation.mutate({
                      objective,

                      target_market: targetMarket,

                      target_location: targetLocation,
                    })
                  }
                  disabled={!canCreateGrowth || workflowCreationPending}
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Megaphone className="mr-1.5 h-4 w-4" />

                  {coordinationMutation.isPending
                    ? "Creating Growth workflow…"
                    : "Create Growth workflow"}
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    revenueMutation.mutate({
                      objective,

                      target_market: targetMarket,

                      target_location: targetLocation,
                    })
                  }
                  disabled={!canCreateRevenue || workflowCreationPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  <Search className="mr-1.5 h-4 w-4" />

                  {revenueMutation.isPending ? "Creating revenue hunt…" : "Create Revenue Hunt"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* ACTIVITY */}

      {view === "activity" ? (
        <section className="glass-card p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Company activity
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">Employee work status</h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Current state is based on recorded handoffs, runs and approvals. Lead Hunter tool runs
              appear as cossa_tool instead of being falsely reported as Groq model execution.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {employeeDirectory
              .slice()
              .sort((left, right) => {
                const priority: Record<OperationalState, number> = {
                  working: 0,
                  attention: 1,
                  approval: 2,
                  waiting: 3,
                  idle: 4,
                  inactive: 5,
                };

                return priority[left.operational.state] - priority[right.operational.state];
              })
              .map((item) => (
                <EmployeeActivityCard
                  key={item.employee.id}
                  item={item}
                  onOpen={() => setSelectedEmployeeId(item.employee.id)}
                />
              ))}
          </div>
        </section>
      ) : null}

      {/* CONTROL ROOM */}

      {view === "control" ? (
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
                  Technical controls remain available, but they do not block ordinary safe internal
                  business work.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => installMutation.mutate()}
                disabled={installMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UsersRound className="mr-1.5 h-4 w-4" />

                {installMutation.isPending ? "Synchronising…" : "Synchronise workforce"}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ControlMetric
                label="Source profiles"
                value={COSSA_GROWTH_WORKFORCE.length}
                description="Profiles defined in Cossa source."
              />

              <ControlMetric
                label="Installed"
                value={installedDefaultEmployees.length}
                description="Source profiles recorded."
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
                Lead Hunter uses the authenticated Cossa Hunter route instead of generic LLM
                prospect generation.
              </OwnerRule>

              <OwnerRule>
                Verified Hunter prospects are passed forward using Hunt IDs, prospect IDs and CRM
                lead IDs.
              </OwnerRule>

              <OwnerRule>
                Existing CRM matches are retained rather than duplicated to inflate pipeline counts.
              </OwnerRule>

              <OwnerRule>
                External prospect contact remains disabled until a verified communication workflow
                and approval boundary permits it.
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
                Spending money, supplier orders and advertising budget changes remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>
                Contracts, legal commitments, signatures and binding commercial terms remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>
                Credentials, destructive operations and irreversible account changes remain
                owner-controlled.
              </OwnerRule>

              <OwnerRule>Missing integrations must be reported, never simulated.</OwnerRule>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-primary/40 text-primary">
                <Link to="/integrations">
                  <Send className="mr-1.5 h-4 w-4" />
                  Connections
                </Link>
              </Button>

              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                value={WORKFORCE_STAGE_DELAY_MS / 1_000}
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
                  Growth & Revenue mission records
                </h2>
              </div>

              <span className="text-xs text-muted-foreground">
                {coordinationMissions.length} saved
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {coordinationMissions.slice(0, 9).map((mission) => {
                const missionHandoffs = handoffs.filter(
                  (handoff) => handoff.mission_id === mission.id,
                );

                const missionRuns = runs.filter((run) => run.mission_id === mission.id);

                const completed = missionHandoffs.filter(
                  (handoff) => handoff.status === "completed",
                ).length;

                const failed = missionRuns.filter((run) => run.status === "failed").length;

                return (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => {
                      setSelectedMissionId(mission.id);

                      setView("workflows");
                    }}
                    className="rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-widest text-primary">
                        {mission.title.startsWith(REVENUE_MISSION_PREFIX) ? "Revenue" : "Growth"}
                        {" · "}
                        {formatStatus(mission.status)}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {completed}/{missionHandoffs.length}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm font-medium">{mission.objective}</p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {missionRuns.length} run
                        {missionRuns.length === 1 ? "" : "s"}
                      </span>

                      <span className={failed > 0 ? "text-warning" : ""}>
                        {failed} failure
                        {failed === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {/* EMPLOYEE DRAWER */}

      {selectedEmployee ? (
        <EmployeeDrawer
          item={selectedEmployee}
          onClose={() => setSelectedEmployeeId(null)}
          onOpenDepartment={() => {
            const firstDepartment = selectedEmployee.departmentKeys[0];

            if (
              firstDepartment &&
              isWorkforceDepartment(firstDepartment) &&
              firstDepartment !== "all"
            ) {
              openDepartment(firstDepartment);
            }
          }}
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

function EmployeeCard({ item, onOpen }: { item: EmployeeDirectoryItem; onOpen: () => void }) {
  const { employee, operational } = item;

  const isHunter = canonicalEmployeeKey(employee.employee_key) === "lead-hunter";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        isHunter
          ? "group rounded-xl border border-primary/40 bg-primary/5 p-4 text-left transition hover:border-primary/70 hover:bg-primary/10"
          : "group rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{employee.name}</p>

          <p className="mt-0.5 text-xs text-muted-foreground">{employee.title}</p>

          {isHunter ? (
            <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-primary">
              Specialised tool worker
            </p>
          ) : null}
        </div>

        <OperationalBadge state={operational.state} label={operational.label} />
      </div>

      {item.responsibilityLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.responsibilityLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] text-primary"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-border/50 bg-background/30 p-3">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Current work</p>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed">{operational.currentTask}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-[10px] text-muted-foreground">{employeeDepartment(employee)}</span>

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
          <p className="text-sm font-semibold">{item.employee.name}</p>

          <p className="mt-0.5 text-xs text-muted-foreground">{item.employee.title}</p>

          {item.operational.latestProvider ? (
            <p className="mt-1 text-[9px] text-muted-foreground">
              Latest executor: {item.operational.latestProvider}
              {item.operational.latestModel ? ` · ${item.operational.latestModel}` : ""}
            </p>
          ) : null}
        </div>

        <OperationalBadge state={item.operational.state} label={item.operational.label} />
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {item.operational.currentTask}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="Pending" value={item.operational.pendingCount} />

        <MiniMetric label="Running" value={item.operational.runningCount} />

        <MiniMetric
          label="Failures"
          value={item.operational.historicalFailureCount}
          warning={item.operational.latestFailure !== null}
        />
      </div>
    </button>
  );
}

function EmployeeDrawer({
  item,
  onClose,
  onOpenDepartment,
}: {
  item: EmployeeDirectoryItem;
  onClose: () => void;
  onOpenDepartment: () => void;
}) {
  const { employee, operational } = item;

  const employeeKey = canonicalEmployeeKey(employee.employee_key);

  const isHunter = employeeKey === "lead-hunter";

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
            {isHunter ? <Search className="h-6 w-6" /> : <UsersRound className="h-6 w-6" />}
          </div>

          <h2 className="mt-4 font-display text-2xl font-semibold">{employee.name}</h2>

          <p className="mt-1 text-sm text-muted-foreground">{employee.title}</p>

          {isHunter ? (
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Authenticated specialised revenue tool
            </p>
          ) : null}

          <div className="mt-3">
            <OperationalBadge state={operational.state} label={operational.label} />
          </div>
        </div>

        {isHunter ? (
          <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-primary">
              Lead Hunter intelligence
            </p>

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <p>• Searches through the authenticated Cossa Lead Hunter server route.</p>

              <p>
                • Prioritises evidence, buyer intent, urgency, contactability, revenue potential,
                recurring value and geographic fit.
              </p>

              <p>
                • Rejects unsupported prospects, competitors, directories and existing CRM
                duplicates according to Hunter rules.
              </p>

              <p>• Carries Hunt IDs, prospect IDs and CRM lead IDs into Lead Intake and Sales.</p>

              <p>• Does not use Groq to manufacture leads.</p>

              <p>• Does not automatically contact prospects.</p>
            </div>
          </section>
        ) : null}

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            What this employee owns
          </p>

          {item.responsibilityLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.responsibilityLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No responsibility matrix label has been assigned yet.
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{employee.mission}</p>
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Current task
          </p>

          <p className="mt-2 text-sm leading-relaxed">{operational.currentTask}</p>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{operational.detail}</p>
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="grid gap-3 text-xs">
            <EmployeeDetail label="Employee key" value={employeeKey} />

            <EmployeeDetail label="Department" value={employeeDepartment(employee)} />

            <EmployeeDetail label="Business unit" value={employeeBusinessUnit(employee)} />

            <EmployeeDetail label="Status" value={formatStatus(employee.status)} />

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
              value={operational.latestProvider ?? "No execution recorded"}
            />

            <EmployeeDetail
              label="Latest model / tool"
              value={operational.latestModel ?? "No execution recorded"}
            />

            <EmployeeDetail
              label="Last activity"
              value={formatDateTime(operational.lastActivity)}
            />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-4 gap-2">
          <MiniMetric label="Assigned" value={operational.assignedCount} />

          <MiniMetric label="Pending" value={operational.pendingCount} />

          <MiniMetric label="Running" value={operational.runningCount} />

          <MiniMetric
            label="Failures"
            value={operational.historicalFailureCount}
            warning={operational.latestFailure !== null}
          />
        </section>

        {operational.latestFailure ? (
          <section className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-[10px] uppercase tracking-widest text-warning">
              {operational.retryReady ? "Previous attempt — retry ready" : "Latest failure"}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-warning">{operational.latestFailure}</p>
          </section>
        ) : null}

        <EmployeeConversation employee={employee} />

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

          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/ai/ceo">
              <BrainCircuit className="mr-1.5 h-4 w-4" />
              Delegate through CEO
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Conversation is internal advice and drafting. It does not start a workflow, publish,
          send, pay, or change a customer record.
        </p>
      </aside>
    </div>
  );
}

type EmployeeConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function employeeConversationSystem(employee: AiEmployee): string {
  return [
    `You are ${employee.name}, ${employee.title}, an AI employee in Cossa Nexus Holdings.`,
    "Cossa Nexus Holdings coordinates Cossa Store, Cossa Growth, NexDocs, Cossa Tech, Cossa Construction and Cossa Facility Services.",
    "Write like a capable Cossa colleague: warm, specific and natural. Avoid robotic filler, generic hype and unsupported certainty.",
    "Use South African business context where helpful. Treat company facts, prices, customers, performance, integrations and completed work as unknown unless supplied or verified in the conversation.",
    "Work hand-in-hand with other Cossa employees by naming the practical next handoff when one is needed.",
    "This is an internal conversation. You may analyse, plan and draft, but you must not claim you sent, published, paid, contacted, changed or executed anything.",
    `Your assigned mission: ${employee.mission}`,
    `Your operating instructions: ${employee.system_instructions.slice(0, 1_800)}`,
  ].join("\n\n");
}

function EmployeeConversation({ employee }: { employee: AiEmployee }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<EmployeeConversationMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;

    const prior = [...messages.slice(-6), { role: "user" as const, content }];
    setDraft("");
    setMessages(prior);
    setSending(true);
    setStreaming("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await streamChatWithMetadata(
        prior,
        (chunk) => setStreaming((current) => `${current ?? ""}${chunk}`),
        {
          signal: controller.signal,
          provider: "auto",
          system: employeeConversationSystem(employee),
        },
      );
      setMessages((current) => [...current, { role: "assistant", content: result.content }]);
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(`${employee.name} could not reply`, {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(null);
      setSending(false);
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
        Talk with {employee.name}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Ask for a plan, draft, explanation or the next internal handoff. This conversation remains
        inside Growth.
      </p>

      {messages.length > 0 || streaming !== null ? (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-6 rounded-lg bg-background/80 p-2 text-xs leading-relaxed"
                  : "mr-3 rounded-lg border border-border/60 bg-card/60 p-2 text-xs leading-relaxed text-muted-foreground"
              }
            >
              {message.content}
            </div>
          ))}
          {streaming !== null ? (
            <div className="mr-3 rounded-lg border border-border/60 bg-card/60 p-2 text-xs leading-relaxed text-muted-foreground">
              {streaming || "Thinking…"}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-end gap-2 rounded-lg border border-border/60 bg-background/60 p-2 focus-within:border-primary/50">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          rows={2}
          placeholder={`Message ${employee.name}…`}
          className="min-h-12 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none"
          disabled={sending}
        />
        {sending ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop employee response"
          >
            <CircleStop className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => void sendMessage()}
            disabled={!draft.trim()}
            aria-label={`Send message to ${employee.name}`}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
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
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>

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
      <div className={warning ? "text-sm font-semibold text-warning" : "text-sm font-semibold"}>
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

      <p className="mt-3 text-sm font-medium">{title}</p>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
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
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>

      <p className="mt-2 font-display text-2xl font-semibold">
        {value.toLocaleString()}
        {suffix}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function EmployeeDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>

      <span className="break-words font-medium text-foreground sm:max-w-[60%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function OwnerRule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <span>{children}</span>
    </div>
  );
}

function OperationalBadge({ state, label }: { state: OperationalState; label: string }) {
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
      className={`w-fit max-w-full shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
