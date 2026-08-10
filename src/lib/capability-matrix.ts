export type CapabilityState = "live-data" | "draft-only" | "controlled-plan" | "not-connected";

export interface CapabilityDefinition {
  state: CapabilityState;
  label: string;
  summary: string;
  evidence: string;
}

export const CAPABILITY_STATE_LABELS: Record<CapabilityState, string> = {
  "live-data": "Live data",
  "draft-only": "Draft-only AI",
  "controlled-plan": "Controlled plan",
  "not-connected": "Not connected",
};

const LIVE_DATA_ROUTES = new Set([
  "/command-center",
  "/ai/knowledge",
  "/ai/prompts",
  "/ai/coach",
  "/ai-recommendations",
  "/opportunity-radar",
  "/sales/leads",
  "/sales/customers",
  "/sales/companies",
  "/sales/pipeline",
  "/sales/appointments",
  "/sales/quotations",
  "/sales/forecast",
  "/sales/analytics",
  "/sales/lead-scoring",
  "/sales/follow-ups",
  "/sales/lead-finder",
  "/operations/projects",
  "/operations/tasks",
  "/operations/calendar",
  "/operations/documents",
  "/operations/reports",
  "/operations/analytics",
  "/operations/business-intelligence",
  "/marketing/monitoring",
]);

const CONTROLLED_PLAN_ROUTES = new Set([
  "/ai/workforce",
  "/mission-control",
  "/playbooks",
  "/roadmap",
  "/integrations",
  "/marketplace",
]);

const ROUTE_OVERRIDES: Record<string, Partial<CapabilityDefinition>> = {
  "/ai/cossa": {
    summary:
      "Cossa AI prepares reviewed guidance from verified knowledge and authorised operational records when relevant.",
    evidence: "It does not perform external actions or replace human review.",
  },
  "/ai/memory": {
    summary:
      "AI Memory currently provides guided recall and drafting. Shared, verified company knowledge is managed in the Knowledge Base.",
    evidence: "It is not yet an independent long-term memory engine for every worker.",
  },
  "/marketing/monitoring": {
    summary: "Website Watch performs a read-only health check of the official Cossa homepage.",
    evidence:
      "It reports availability, response time, title and noindex signals only; it is not analytics, SEO ranking, security or social monitoring.",
  },
  "/sales/lead-finder": {
    summary:
      "Lead Hunter returns evidence-qualified research signals from configured public search providers.",
    evidence:
      "Results are never proof of buying intent and require human verification before outreach or tender action.",
  },
  "/ai/workforce": {
    summary:
      "The workforce records controlled, one-stage-at-a-time reviewable drafts and owner approval requests.",
    evidence: "It cannot publish, send messages, spend, alter accounts or connect providers.",
  },
  "/mission-control": {
    summary: "Mission Control guides the owner to the right Cossa workspace and planning steps.",
    evidence: "It does not autonomously execute work across modules.",
  },
};

const LIVE_DATA: CapabilityDefinition = {
  state: "live-data",
  label: CAPABILITY_STATE_LABELS["live-data"],
  summary:
    "This workspace reads or manages real Cossa records in the authorised application data layer.",
  evidence: "Displayed information depends on the records available to the signed-in Cossa user.",
};

const DRAFT_ONLY: CapabilityDefinition = {
  state: "draft-only",
  label: CAPABILITY_STATE_LABELS["draft-only"],
  summary: "This workspace prepares internal guidance or drafts for human review.",
  evidence:
    "It has no authority to publish, send, spend, change an account, or claim unverified results.",
};

const CONTROLLED_PLAN: CapabilityDefinition = {
  state: "controlled-plan",
  label: CAPABILITY_STATE_LABELS["controlled-plan"],
  summary: "This workspace records a reviewable internal plan and approval path.",
  evidence:
    "External actions remain disabled until a separate authorised integration and owner approval exist.",
};

export function capabilityForRoute(to: string): CapabilityDefinition {
  const base = LIVE_DATA_ROUTES.has(to)
    ? LIVE_DATA
    : CONTROLLED_PLAN_ROUTES.has(to)
      ? CONTROLLED_PLAN
      : DRAFT_ONLY;

  return { ...base, ...(ROUTE_OVERRIDES[to] ?? {}) };
}

export const EXTERNAL_CAPABILITY_GAPS: ReadonlyArray<{
  name: string;
  scope: string;
  state: CapabilityState;
  requirement: string;
}> = [
  {
    name: "Social publishing and inboxes",
    scope: "Facebook, Instagram, X, TikTok, Pinterest, YouTube, LinkedIn and WhatsApp",
    state: "not-connected",
    requirement:
      "Owner-authorised platform access, least-privilege server-side OAuth and an approved publishing or response process.",
  },
  {
    name: "Advertising and analytics",
    scope: "Google Ads, Meta Ads and Google Analytics",
    state: "not-connected",
    requirement:
      "Verified business accounts, read-only reporting first, budget controls and recorded owner approval before any spend.",
  },
  {
    name: "Email, calendars and document drives",
    scope: "Google Workspace, Microsoft 365, Google Drive, OneDrive and Calendar",
    state: "not-connected",
    requirement:
      "Owner-authorised organisation connection, minimum scopes and documented data-retention rules.",
  },
];
