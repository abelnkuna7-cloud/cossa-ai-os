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
  "controlled-plan": "Controlled execution",
  "not-connected": "Not connected",
};

/* -------------------------------------------------------------------------- */
/* LIVE DATA ROUTES                                                           */
/* -------------------------------------------------------------------------- */

/**
 * These routes read or manage real Cossa application records.
 *
 * "Live data" does not automatically mean:
 * - external publishing is connected;
 * - money can be spent;
 * - an external account can be changed;
 * - a third-party action occurred.
 *
 * It means the route is backed by real authorised Cossa application data.
 */
const LIVE_DATA_ROUTES = new Set<string>([
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

/* -------------------------------------------------------------------------- */
/* CONTROLLED EXECUTION ROUTES                                                */
/* -------------------------------------------------------------------------- */

/**
 * These routes coordinate real internal workflows, recorded state or
 * owner-controlled execution paths.
 *
 * They may create real missions, handoffs, runs, approval records or
 * configuration state, while still blocking unauthorised external actions.
 */
const CONTROLLED_EXECUTION_ROUTES = new Set<string>([
  "/ai/workforce",
  "/mission-control",
  "/playbooks",
  "/roadmap",
  "/integrations",
  "/marketplace",
]);

/* -------------------------------------------------------------------------- */
/* ROUTE OVERRIDES                                                            */
/* -------------------------------------------------------------------------- */

const ROUTE_OVERRIDES: Record<string, Partial<CapabilityDefinition>> = {
  "/ai/cossa": {
    summary:
      "Cossa AI reasons from verified company knowledge, authorised operational records, live workforce records and approved external intelligence when available.",

    evidence:
      "Reasoning capability does not by itself prove an external action occurred. Publishing, messaging, spending and external account changes require the applicable authorised execution workflow.",
  },

  "/ai/memory": {
    summary:
      "AI Memory supports guided recall and structured business memory work while verified shared company knowledge remains managed through the Cossa Knowledge Base.",

    evidence:
      "It should not claim a fact has been permanently stored or shared across workers unless the relevant Cossa data record confirms it.",
  },

  "/marketing/monitoring": {
    summary:
      "Website monitoring can perform authorised read-only checks of configured Cossa web properties and report recorded website-health observations.",

    evidence:
      "Availability, response time, page title, indexing signals and recorded issues are evidence only for the exact check performed. This is not automatically a full SEO, analytics, security or social-monitoring system.",
  },

  "/sales/lead-finder": {
    summary:
      "Lead Finder can work from configured evidence-producing research sources and authorised Cossa sales records.",

    evidence:
      "A research result is not proof of buying intent, consent, qualification or a confirmed opportunity. Outreach still requires an appropriate authorised communication process.",
  },

  "/ai/workforce": {
    state: "controlled-plan",

    label: "Controlled execution",

    summary:
      "Cossa AI Workforce manages real employee profiles, missions, employee handoffs, mission runs, recorded outputs, failures and owner-controlled approval checkpoints.",

    evidence:
      "Safe internal work can execute employee-to-employee automatically through the configured AI provider. External publishing, supplier orders, advertising spend, contracts, credential changes and other high-risk actions still require the relevant authorised integration and owner authority.",
  },

  "/mission-control": {
    summary:
      "Mission Control coordinates internal Cossa work, mission direction and execution planning across the operating system.",

    evidence:
      "Actual execution depends on the connected workforce, application records and authorised integrations available to the selected mission.",
  },

  "/integrations": {
    summary:
      "The Integration Center records and manages the connection layer required for Cossa employees to interact with approved external systems.",

    evidence:
      "A platform must not be described as connected merely because it appears in the Integration Center. A real authorised connection and usable server-side integration must exist.",
  },

  "/ai/automation": {
    summary:
      "AI Automation can design and reason about business automations using Cossa knowledge and authorised operational context.",

    evidence:
      "A designed automation is not automatically a running background workflow. Persistent execution requires a real trigger, server worker, scheduler, webhook or connected platform workflow.",
  },

  "/marketing/social": {
    summary:
      "Social Media can prepare strategy, copy, visual requirements, publishing queues, channel plans and internal social-media management work.",

    evidence:
      "Actual posting, inbox monitoring, replies and platform analytics require real authorised social platform integrations.",
  },

  "/marketing/content-studio": {
    summary:
      "Content Studio can produce publish-ready written content and visual production requirements using verified Cossa information.",

    evidence:
      "A visual brief is not a generated visual asset, and a content draft is not a published post until the applicable real workflow records that action.",
  },

  "/marketing/google-ads": {
    summary:
      "Google Ads can prepare campaign structures, targeting, copy, measurement plans and optimisation recommendations.",

    evidence:
      "Campaign creation, launch, budget changes, bidding changes and spend require a real authorised Google Ads connection and owner-controlled financial authority.",
  },

  "/marketing/meta-ads": {
    summary:
      "Meta Ads can prepare campaign strategy, audiences, creative requirements, copy and optimisation recommendations.",

    evidence:
      "Campaign creation, launch, budget changes and spend require a real authorised Meta connection and owner-controlled financial authority.",
  },
};

/* -------------------------------------------------------------------------- */
/* DEFAULT CAPABILITY DEFINITIONS                                             */
/* -------------------------------------------------------------------------- */

const LIVE_DATA: CapabilityDefinition = {
  state: "live-data",

  label: CAPABILITY_STATE_LABELS["live-data"],

  summary: "This workspace reads or manages real authorised Cossa application records.",

  evidence:
    "Displayed information depends on the records currently available to the authenticated Cossa workspace.",
};

const DRAFT_ONLY: CapabilityDefinition = {
  state: "draft-only",

  label: CAPABILITY_STATE_LABELS["draft-only"],

  summary: "This workspace provides AI reasoning, drafting, analysis or recommendations.",

  evidence:
    "AI reasoning alone does not prove that an external action, publication, message, payment, account change or system update occurred.",
};

const CONTROLLED_EXECUTION: CapabilityDefinition = {
  state: "controlled-plan",

  label: CAPABILITY_STATE_LABELS["controlled-plan"],

  summary:
    "This workspace participates in a real controlled internal execution or coordination workflow.",

  evidence:
    "Safe internal actions may proceed when supported by real application records and configured execution code. High-risk or external actions remain limited by integrations, policy and owner authority.",
};

/* -------------------------------------------------------------------------- */
/* ROUTE CAPABILITY RESOLUTION                                                */
/* -------------------------------------------------------------------------- */

export function capabilityForRoute(to: string): CapabilityDefinition {
  const base = LIVE_DATA_ROUTES.has(to)
    ? LIVE_DATA
    : CONTROLLED_EXECUTION_ROUTES.has(to)
      ? CONTROLLED_EXECUTION
      : DRAFT_ONLY;

  return {
    ...base,
    ...(ROUTE_OVERRIDES[to] ?? {}),
  };
}

/* -------------------------------------------------------------------------- */
/* EXTERNAL EXECUTION GAPS                                                    */
/* -------------------------------------------------------------------------- */

/**
 * These entries describe external execution capabilities that must not be
 * represented as operational until a real authorised integration exists.
 */
export const EXTERNAL_CAPABILITY_GAPS: ReadonlyArray<{
  name: string;
  scope: string;
  state: CapabilityState;
  requirement: string;
}> = [
  {
    name: "Social publishing and social inbox management",

    scope:
      "Facebook, Instagram, LinkedIn, TikTok, X, YouTube, Pinterest and other authorised social channels",

    state: "not-connected",

    requirement:
      "Owner-authorised platform connections, least-privilege server-side OAuth, encrypted token storage, platform-specific publishing adapters, publishing-result records, inbox/message permissions where required and a background execution worker.",
  },

  {
    name: "WhatsApp Business execution",

    scope:
      "WhatsApp Business messaging, templates, customer replies and approved automation workflows",

    state: "not-connected",

    requirement:
      "An authorised WhatsApp Business Platform connection, approved message templates where required, consent-aware communication rules, webhook processing and auditable send-status records.",
  },

  {
    name: "Social analytics and monitoring",

    scope:
      "Channel performance, post performance, account growth, audience metrics, comments, mentions and engagement",

    state: "not-connected",

    requirement:
      "Read-authorised platform analytics APIs, scheduled data synchronisation and stored source-labelled metric snapshots.",
  },

  {
    name: "Advertising execution",

    scope: "Google Ads, Meta Ads and other approved advertising platforms",

    state: "not-connected",

    requirement:
      "Verified advertising accounts, read-only reporting first, server-side authorised API access, strict budget controls and recorded owner approval before campaign launch or spend changes.",
  },

  {
    name: "Website analytics",

    scope:
      "Google Analytics, Google Search Console and other authorised website measurement systems",

    state: "not-connected",

    requirement:
      "Read-only authorised analytics connections, property verification and source-labelled metric storage before the workforce can claim traffic, search or conversion performance.",
  },

  {
    name: "Website implementation",

    scope:
      "Cossa websites, hosting, deployment systems, CMS platforms, domain configuration and client website delivery",

    state: "not-connected",

    requirement:
      "A controlled implementation workflow with repository or CMS access, deployment verification, credential protection and separate approval for DNS, production credentials and irreversible changes.",
  },

  {
    name: "Supplier research execution",

    scope: "Cossa Store supplier discovery, sourcing evidence and supplier verification",

    state: "not-connected",

    requirement:
      "An authorised research/search workflow that can retrieve real supplier websites or legitimate business sources, record source evidence, compare candidates and retain verification dates.",
  },

  {
    name: "Cossa Store catalogue execution",

    scope:
      "Product catalogue changes, product status, pricing, merchandising, stock evidence and product publishing",

    state: "not-connected",

    requirement:
      "A real Cossa Store catalogue data source or commerce platform integration with controlled write permissions, audit records and evidence-backed pricing and inventory data.",
  },

  {
    name: "Media generation",

    scope:
      "Social graphics, brochures, campaign creatives, product visuals, website assets and promotional media",

    state: "not-connected",

    requirement:
      "An authorised image or media-generation workflow that returns real asset records and storage references. A written visual brief alone must never be represented as a generated image.",
  },

  {
    name: "Email execution",

    scope: "Business email, outbound campaigns, customer follow-ups and internal notifications",

    state: "not-connected",

    requirement:
      "Owner-authorised Gmail, Microsoft 365 or another approved email connection with least-privilege scopes, consent controls and auditable send records.",
  },

  {
    name: "Calendar execution",

    scope: "Google Calendar, Microsoft Calendar and appointment synchronisation",

    state: "not-connected",

    requirement:
      "Owner-authorised calendar access with clear create/update permissions, conflict handling and auditable event records.",
  },

  {
    name: "Document drive execution",

    scope: "Google Drive, OneDrive, SharePoint and other authorised document repositories",

    state: "not-connected",

    requirement:
      "Owner-authorised organisation access, minimum necessary scopes, file ownership rules, retention controls and audit logging.",
  },

  {
    name: "Background workforce execution",

    scope:
      "Unattended employee missions, recurring website checks, daily social workflows, scheduled Store research and recurring operational work",

    state: "not-connected",

    requirement:
      "A server-side worker workers, scheduler or cron execution layer capable of claiming queued Cossa missions, running employees, recording results, retrying failures and stopping correctly at approval-controlled actions.",
  },
];
