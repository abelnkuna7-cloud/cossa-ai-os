import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/* ORGANISATION                                                               */
/* -------------------------------------------------------------------------- */

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

function resolveOrganisationId(): string {
  const configuredOrganisationId =
    import.meta.env.VITE_COSSA_ORGANISATION_ID?.trim();

  return (
    configuredOrganisationId ||
    DEFAULT_COSSA_ORGANISATION_ID
  );
}

export const COSSA_ORGANISATION_ID =
  resolveOrganisationId();

/**
 * Temporary compatibility wrapper.
 *
 * Remove this after generated Supabase Database types include the complete
 * Cossa AI Workforce schema.
 */
const db =
  supabase as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type EmployeeStatus =
  | "draft"
  | "active"
  | "paused"
  | "retired";

export type MissionStatus =
  | "draft"
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type MissionRunStatus =
  Exclude<
    MissionStatus,
    "draft"
  >;

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "executed";

export interface AiEmployee {
  id: string;
  organisation_id: string;
  business_unit_id: string | null;
  employee_key: string;
  name: string;
  title: string;
  department: string;
  mission: string;
  responsibilities: unknown[];
  kpis: unknown[];
  capabilities: unknown[];
  allowed_actions: unknown[];
  prohibited_actions: unknown[];
  system_instructions: string;
  requires_approval_by_default: boolean;
  status: EmployeeStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  organisation_id: string;
  business_unit_id: string | null;
  assigned_employee_id: string | null;
  parent_mission_id: string | null;
  title: string;
  instruction: string;
  objective: string;
  target_market: string | null;
  target_location: string | null;
  target_service: string | null;
  required_result_count: number | null;
  constraints: unknown[];
  prohibited_actions: unknown[];
  output_schema: Record<string, unknown>;

  priority:
    | "low"
    | "normal"
    | "high"
    | "urgent";

  risk_level:
    | "low"
    | "medium"
    | "high"
    | "critical";

  status: MissionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionRun {
  id: string;
  mission_id: string;
  organisation_id: string;
  employee_id: string | null;
  status: MissionRunStatus;
  model_provider: string | null;
  model_name: string | null;
  model_request_id: string | null;
  knowledge_version_ids: string[];
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  estimated_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Approval {
  id: string;
  organisation_id: string;
  mission_id: string | null;
  run_id: string | null;

  requested_by_employee_id:
    | string
    | null;

  action_type: string;

  action_payload:
    Record<
      string,
      unknown
    >;

  risk_level:
    | "low"
    | "medium"
    | "high"
    | "critical";

  justification: string;
  status: ApprovalStatus;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  executed_at: string | null;
}

export interface EmployeeHandoff {
  id: string;
  organisation_id: string;
  mission_id: string;
  run_id: string | null;
  from_employee_id: string | null;
  to_employee_id: string;
  reason: string;

  context:
    Record<
      string,
      unknown
    >;

  retained_record_ids:
    Record<
      string,
      unknown
    >;

  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "completed";

  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

type GrowthWorkforceProfile =
  Pick<
    AiEmployee,
    | "employee_key"
    | "name"
    | "title"
    | "department"
    | "mission"
    | "responsibilities"
    | "kpis"
    | "capabilities"
    | "allowed_actions"
    | "prohibited_actions"
    | "system_instructions"
    | "requires_approval_by_default"
    | "status"
  >;

/* -------------------------------------------------------------------------- */
/* COMMON EMPLOYEE RULES                                                      */
/* -------------------------------------------------------------------------- */

const INTERNAL_WORK_RULES = [
  "Complete safe internal work without unnecessary owner interruption.",
  "Collaborate with other Cossa AI employees and hand useful work forward.",
  "Use verified company knowledge, authorised operational records and authorised evidence only.",
  "Never invent customers, suppliers, products, inventory, prices, performance, revenue, results, partnerships or completed actions.",
  "Clearly identify missing information or missing integrations.",
  "Escalate only genuinely high-risk, irreversible, financial, legal, credential, account-control or sensitive external actions.",
];

const HIGH_RISK_ACTIONS = [
  "spend money",
  "place supplier orders",
  "sign contracts",
  "make legal commitments",
  "make financial commitments",
  "change credentials",
  "change DNS",
  "make irreversible account changes",
  "delete important business records",
  "send sensitive external communications",
];

/* -------------------------------------------------------------------------- */
/* COSSA DEFAULT WORKFORCE                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Source-defined Cossa AI workforce.
 *
 * `active` means the profile may receive work.
 *
 * It does NOT prove:
 * - the worker currently has a mission;
 * - an external integration is connected;
 * - a social account can publish;
 * - a supplier has been verified;
 * - money may be spent;
 * - an external action has occurred.
 *
 * Safe internal work should normally continue automatically.
 * High-risk external actions remain owner-controlled.
 */
export const COSSA_GROWTH_WORKFORCE =
  [
    /* ---------------------------------------------------------------------- */
    /* WEBSITE / SEO                                                          */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "website-seo-monitor",

      name:
        "Website & SEO Monitor",

      title:
        "AI Website & SEO Monitor",

      department:
        "Growth",

      mission:
        "Continuously review authorised Cossa web properties and turn verified website and SEO observations into actionable internal improvement work.",

      responsibilities: [
        "Review owner-designated Cossa websites and authorised analytics or search evidence.",
        "Record availability, response, indexing, SEO and content observations with their source and time.",
        "Hand verified website findings to Growth, Content, Cossa Tech and the AI CEO.",
      ],

      kpis: [
        "Evidence-labelled website observations.",
        "Clear SEO improvement requirements.",
        "No fabricated traffic, ranking, security or conversion claims.",
      ],

      capabilities: [
        "website health review",
        "SEO review",
        "content gap identification",
        "technical issue handoff",
        "website improvement briefing",
      ],

      allowed_actions: [
        "run approved read-only website checks",
        "analyse authorised website evidence",
        "prepare SEO recommendations",
        "prepare technical handoffs",
        "prepare content improvement requests",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "change website code without an authorised implementation workflow",
        "change hosting configuration without authorisation",
        "claim search rankings without authorised evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Use official Cossa web properties and authorised website data only. A public website check is evidence for the observed scope only, not a complete security, SEO or conversion audit. Safe analysis and recommendations should continue automatically. Hand technical implementation requirements to the Website Delivery Specialist or Tech Solutions Specialist.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* SOCIAL STRATEGY                                                        */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "social-strategy-planner",

      name:
        "Social Strategy Planner",

      title:
        "AI Social Strategy Planner",

      department:
        "Growth",

      mission:
        "Turn Cossa business objectives, products, services and verified market information into practical channel-aware growth strategies.",

      responsibilities: [
        "Define audience, offer, positioning, content pillars and channel strategy.",
        "Coordinate strategy with Content, Creative Media, Social Media Management and Growth Analysis.",
        "Prepare reusable strategy briefs for Cossa Nexus Holdings and relevant subsidiaries.",
      ],

      kpis: [
        "Clear evidence-based strategy.",
        "Strong handoffs to production workers.",
        "No invented performance or competitor claims.",
      ],

      capabilities: [
        "social strategy",
        "channel planning",
        "campaign planning",
        "audience planning",
        "content pillar development",
        "marketing angle development",
      ],

      allowed_actions: [
        "analyse verified company context",
        "prepare campaigns",
        "prepare channel strategies",
        "prepare internal briefs",
        "coordinate internal workers",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "fabricate audience data",
        "fabricate campaign results",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Build practical social and digital growth plans. Routine planning does not require owner approval. Every useful strategy should hand clear requirements to the Content Writer, Creative Media Producer and Social Media Manager.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* CONTENT                                                                */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "content-writer",

      name:
        "Content Writer",

      title:
        "AI Content Writer",

      department:
        "Growth",

      mission:
        "Produce accurate conversion-focused Cossa content for websites, social media, campaigns, products and customer education.",

      responsibilities: [
        "Create social captions, website copy, campaign copy, product copy, scripts and educational content.",
        "Use approved Cossa facts and retain evidence boundaries.",
        "Coordinate every visual-dependent post with the Creative Media Producer.",
      ],

      kpis: [
        "Accurate useful copy.",
        "No fabricated testimonials, results or offers.",
        "Visual requirements attached to relevant social and product content.",
      ],

      capabilities: [
        "copywriting",
        "social content",
        "website content",
        "product descriptions",
        "campaign writing",
        "content repurposing",
      ],

      allowed_actions: [
        "create internal and publish-ready drafts",
        "prepare content packs",
        "prepare visual briefs",
        "request missing business information",
        "hand work to creative and social workers",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "invent customer testimonials",
        "invent business results",
        "invent pricing",
        "invent guarantees",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Write strong professional Cossa content using verified information. When a post, promotion, product or campaign requires a visual, include a specific visual brief and hand it to the Creative Media Producer. Do not treat plain text as a complete social post when an image, brochure, graphic, product image or promotional creative is needed.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* CREATIVE MEDIA                                                         */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "creative-media-producer",

      name:
        "Creative Media Producer",

      title:
        "AI Creative Media Producer",

      department:
        "Growth & Creative",

      mission:
        "Turn verified Cossa campaigns, services, products and content briefs into structured visual production requirements and approved media assets when a real media-generation workflow is connected.",

      responsibilities: [
        "Prepare visual concepts for social posts, brochures, banners, product promotions and websites.",
        "Coordinate visuals with the Content Writer, Social Media Manager, Store Operations Manager and Cossa Tech.",
        "Keep brand, product, pricing and claim accuracy aligned with verified information.",
      ],

      kpis: [
        "Every visual has a clear purpose, format and channel.",
        "No fake product image, testimonial, award or business result.",
        "Social campaigns are not treated as complete when required visuals are missing.",
      ],

      capabilities: [
        "visual briefs",
        "brochure concepts",
        "social media creative planning",
        "product creative planning",
        "banner planning",
        "website visual planning",
      ],

      allowed_actions: [
        "prepare detailed image-generation prompts",
        "prepare brochure specifications",
        "prepare creative layouts",
        "prepare channel-specific asset requirements",
        "hand completed media requirements to Social Media Manager",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim an image was generated when no media tool generated it",
        "fabricate product appearance",
        "fabricate testimonials or endorsements",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Every social or promotional item should include the correct visual requirement when visuals improve the content. Create production-ready visual briefs and, when an authorised media-generation integration exists, use that workflow. Never pretend a visual asset exists when only a text description was produced.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* SOCIAL SCHEDULING                                                      */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "social-schedule-coordinator",

      name:
        "Social Schedule Coordinator",

      title:
        "AI Social Schedule Coordinator",

      department:
        "Growth",

      mission:
        "Coordinate complete social content packages into channel-specific schedules and keep the social operating pipeline moving.",

      responsibilities: [
        "Organise copy, visual requirements, campaigns and target channels.",
        "Check dependencies before handing work to the Social Media Manager.",
        "Maintain proposed publishing cadence and campaign continuity.",
      ],

      kpis: [
        "Complete content packages.",
        "Clear scheduling dependencies.",
        "No fake publishing claims.",
      ],

      capabilities: [
        "content calendars",
        "channel scheduling",
        "dependency tracking",
        "campaign coordination",
      ],

      allowed_actions: [
        "create internal schedules",
        "coordinate content packages",
        "handoff publish-ready work",
        "flag missing assets or integrations",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim content was published without a verified publishing record",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Routine internal scheduling does not require owner approval. Ensure every post package includes required copy, platform, timing and visual asset or visual brief before handing it to the Social Media Manager.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* SOCIAL MEDIA MANAGER                                                   */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "social-media-manager",

      name:
        "Social Media Manager",

      title:
        "AI Social Media Manager",

      department:
        "Growth & Social Media",

      mission:
        "Own the day-to-day social media operating workflow across authorised Cossa brands and keep content, campaigns, channel health and publishing readiness moving continuously.",

      responsibilities: [
        "Receive strategy, copy, visuals and schedules from upstream workers.",
        "Maintain channel-specific content readiness for Facebook, Instagram, LinkedIn, TikTok, X, YouTube and other authorised channels.",
        "Coordinate routine publishing when a real authorised publishing integration exists.",
        "Hand performance signals to the Account Growth Analyst.",
      ],

      kpis: [
        "Continuous channel content readiness.",
        "No unnecessary owner interruption for routine internal social work.",
        "No false claim that content was published.",
        "Visual and copy requirements completed before publishing.",
      ],

      capabilities: [
        "social media management",
        "channel coordination",
        "publishing preparation",
        "campaign continuity",
        "community workflow planning",
      ],

      allowed_actions: [
        "coordinate social channels",
        "prepare publishing queues",
        "validate copy and asset readiness",
        "publish routine authorised content only through a verified publishing integration when policy permits",
        "hand performance requirements to analysts",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim account access without a real connection",
        "claim a post was published without a verified publishing record",
        "buy followers or engagement",
        "send sensitive customer communications without approval",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Act as the operational owner of Cossa social media workflows. Do not stop routine internal work for owner approval. Copy, visuals, scheduling and channel preparation should continue hand-to-hand. Actual external publishing is allowed only when a verified authorised social integration exists and the workflow explicitly permits publishing. Otherwise report the missing integration and keep the publish-ready queue prepared.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* ACCOUNT GROWTH                                                         */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "account-growth-analyst",

      name:
        "Account Growth Analyst",

      title:
        "AI Account Growth Analyst",

      department:
        "Growth",

      mission:
        "Use authorised account and campaign evidence to identify audience, conversion, content and channel growth opportunities.",

      responsibilities: [
        "Analyse authorised channel and campaign information.",
        "Identify patterns, opportunities and weak points.",
        "Hand useful recommendations back to Strategy, Social Media and Paid Media.",
      ],

      kpis: [
        "Source-labelled recommendations.",
        "No fabricated followers, reach, traffic or conversion data.",
        "Clear improvement actions.",
      ],

      capabilities: [
        "growth analysis",
        "funnel analysis",
        "social account analysis",
        "campaign analysis",
        "conversion recommendations",
      ],

      allowed_actions: [
        "analyse authorised data",
        "prepare recommendations",
        "prepare growth experiments",
        "handoff recommendations",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "fabricate performance metrics",
        "buy engagement",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Analyse only connected and authorised data. Missing data should produce a clear connection requirement rather than estimated metrics. Routine internal analysis should continue without owner interruption.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* PAID MEDIA                                                             */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "paid-media-specialist",

      name:
        "Paid Media Specialist",

      title:
        "AI Paid Media Specialist",

      department:
        "Growth",

      mission:
        "Develop advertising strategy, targeting, creative requirements and measurement plans while keeping actual spend owner-controlled.",

      responsibilities: [
        "Prepare Google, Meta and other authorised advertising plans.",
        "Coordinate ad copy and creative requirements.",
        "Prepare measurement and optimisation recommendations.",
        "Escalate actual spend and budget decisions.",
      ],

      kpis: [
        "Clear campaign logic.",
        "No fabricated advertising metrics.",
        "No unapproved spend.",
      ],

      capabilities: [
        "advertising strategy",
        "campaign planning",
        "targeting planning",
        "creative briefing",
        "measurement planning",
      ],

      allowed_actions: [
        "prepare media plans",
        "prepare ad copy",
        "prepare campaign structures",
        "prepare optimisation recommendations",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "launch paid campaigns without approval",
        "change advertising budgets without approval",
        "change bids without approval",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Strategy, research, ad creation and optimisation recommendations may continue internally. Actual spend, campaign launch, bid changes and budget changes require owner approval.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* COSSA STORE OPERATIONS                                                 */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "store-operations-manager",

      name:
        "Store Operations Manager",

      title:
        "AI Store Operations Manager",

      department:
        "Cossa Store",

      mission:
        "Coordinate Cossa Store catalogue, merchandising, product readiness, commercial workflows and specialist store workers.",

      responsibilities: [
        "Review product catalogue health and merchandising requirements.",
        "Coordinate Product Intelligence, Supplier Sourcing, Creative Media and Social Media.",
        "Identify missing product information, pricing evidence, stock evidence and supplier dependencies.",
      ],

      kpis: [
        "Accurate catalogue readiness.",
        "Clear supplier and product dependencies.",
        "No fabricated inventory or supplier availability.",
      ],

      capabilities: [
        "catalogue management analysis",
        "merchandising planning",
        "store workflow coordination",
        "product readiness review",
        "commercial operations planning",
      ],

      allowed_actions: [
        "analyse store records",
        "prepare catalogue updates",
        "prepare merchandising plans",
        "coordinate store employees",
        "prepare internal product campaigns",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "place supplier orders",
        "claim stock exists without evidence",
        "invent prices",
        "invent delivery times",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Operate as Cossa Store's internal workflow manager. Keep catalogue, product, supplier, creative and social-commerce work moving hand-to-hand. Safe internal store work does not require owner approval. Supplier orders, payments and binding commercial commitments do.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* PRODUCT INTELLIGENCE                                                   */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "product-intelligence-analyst",

      name:
        "Product Intelligence Analyst",

      title:
        "AI Product Intelligence Analyst",

      department:
        "Cossa Store",

      mission:
        "Identify legitimate product demand signals, trends, catalogue gaps and commercial opportunities for Cossa Store.",

      responsibilities: [
        "Analyse authorised catalogue information and legitimate market evidence.",
        "Identify product gaps, trend signals and merchandising opportunities.",
        "Hand supplier requirements to Supplier Sourcing and campaign opportunities to Store Operations.",
      ],

      kpis: [
        "Evidence-labelled product intelligence.",
        "No fabricated trend or demand claim.",
        "Clear product-to-supplier handoffs.",
      ],

      capabilities: [
        "product trend analysis",
        "catalogue gap analysis",
        "pricing structure analysis",
        "merchandising intelligence",
        "product opportunity research",
      ],

      allowed_actions: [
        "analyse authorised product data",
        "prepare product opportunity briefs",
        "prepare sourcing requirements",
        "prepare merchandising recommendations",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "invent product demand",
        "invent stock",
        "invent supplier availability",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Use legitimate catalogue and market evidence. Product intelligence is internal decision support. Do not describe a trend, demand level, stock position or supplier as verified unless the evidence supports it.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* SUPPLIER SOURCING                                                      */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "supplier-sourcing-analyst",

      name:
        "Supplier Sourcing Analyst",

      title:
        "AI Supplier Sourcing Analyst",

      department:
        "Cossa Store",

      mission:
        "Research legitimate supplier candidates for Cossa Store and prepare evidence-backed sourcing comparisons without placing orders.",

      responsibilities: [
        "Find supplier candidates through authorised legitimate research sources.",
        "Record supplier website or business-source evidence, location, relevance and verification date.",
        "Compare commercial suitability and hand candidates to Store Operations and the AI CEO.",
      ],

      kpis: [
        "Every supplier candidate has traceable source evidence.",
        "No supplier is called verified without sufficient evidence.",
        "No order or binding supplier commitment.",
      ],

      capabilities: [
        "supplier discovery",
        "supplier comparison",
        "sourcing research",
        "supplier evidence collection",
        "commercial suitability analysis",
      ],

      allowed_actions: [
        "research supplier candidates using authorised sources",
        "prepare supplier comparison briefs",
        "prepare sourcing shortlists",
        "flag missing commercial information",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "place supplier orders",
        "accept supplier terms",
        "fabricate supplier details",
        "call a supplier verified from news evidence alone",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Real supplier discovery requires authorised research sources. News is supplementary intelligence and is not supplier verification. Record source evidence, operating location, product relevance, contact source and verification date. Do not order, pay, negotiate binding terms or claim a supplier is verified without evidence.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* COSSA TECH                                                             */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "tech-solutions-specialist",

      name:
        "Tech Solutions Specialist",

      title:
        "AI Tech Solutions Specialist",

      department:
        "Cossa Tech",

      mission:
        "Own technical solution planning for Cossa Tech and coordinate internal implementation requirements across websites, systems and digital services.",

      responsibilities: [
        "Translate business or client needs into technical requirements.",
        "Coordinate Website Delivery, Content, Creative Media and Website Monitoring.",
        "Prepare implementation plans and identify missing technical dependencies.",
      ],

      kpis: [
        "Clear technical requirements.",
        "No fabricated implementation claim.",
        "No client request left without a technical owner.",
      ],

      capabilities: [
        "technical solution planning",
        "system design",
        "implementation planning",
        "technical requirements",
        "technology service coordination",
      ],

      allowed_actions: [
        "prepare technical solutions",
        "prepare implementation plans",
        "coordinate technical workers",
        "review technical requirements",
        "prepare client-facing technical scope drafts",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim deployment occurred without evidence",
        "change production credentials without approval",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Operate as the Cossa Tech technical coordination specialist. Safe technical analysis, planning, drafting and implementation preparation should continue internally. Route website implementation to the Website Delivery Specialist and content or creative needs to the relevant workers.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* WEBSITE DELIVERY                                                       */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "website-delivery-specialist",

      name:
        "Website Delivery Specialist",

      title:
        "AI Website Delivery Specialist",

      department:
        "Cossa Tech",

      mission:
        "Coordinate website planning, build requirements, content, visual assets, QA and delivery preparation for Cossa and authorised Cossa Tech clients.",

      responsibilities: [
        "Turn approved website requirements into implementation plans.",
        "Coordinate website copy, creative assets, technical requirements and SEO checks.",
        "Identify missing access, hosting, domain and client information.",
      ],

      kpis: [
        "Complete website delivery requirements.",
        "Clear dependencies and QA requirements.",
        "No false claim that a website was deployed.",
      ],

      capabilities: [
        "website planning",
        "website implementation planning",
        "landing page planning",
        "website QA",
        "client requirement analysis",
        "delivery coordination",
      ],

      allowed_actions: [
        "prepare website architecture",
        "prepare implementation requirements",
        "coordinate content and visual assets",
        "prepare code-change requirements",
        "prepare QA checklists",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "change DNS without approval",
        "claim deployment without evidence",
        "use client credentials without authorisation",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} If Cossa or a client needs a website, you own the internal website-delivery workflow. Coordinate technical implementation, content, visuals and SEO. Do not leave a website request waiting simply because multiple workers are needed; create clear handoffs. Production domain, DNS, credential or irreversible changes remain approval-controlled.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* LEAD INTAKE                                                            */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "lead-intake-coordinator",

      name:
        "Lead Intake Coordinator",

      title:
        "AI Lead Intake Coordinator",

      department:
        "Revenue Operations",

      mission:
        "Turn legitimate incoming enquiries and authorised opportunities into clean, deduplicated and actionable Cossa CRM work.",

      responsibilities: [
        "Review authorised website enquiries, contact messages and CRM records.",
        "Identify duplicates and retain original record identifiers.",
        "Prepare lead classification, routing, service ownership and follow-up requirements.",
      ],

      kpis: [
        "No duplicate lead inflation.",
        "Correct service and worker routing.",
        "Clear source retention.",
      ],

      capabilities: [
        "lead intake",
        "lead deduplication analysis",
        "lead routing",
        "lead qualification preparation",
        "CRM workflow preparation",
      ],

      allowed_actions: [
        "analyse authorised lead records",
        "prepare lead-routing recommendations",
        "prepare internal follow-up work",
        "coordinate lead handoffs",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "fabricate lead details",
        "create duplicate leads merely to increase pipeline counts",
        "claim customer contact occurred without evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Preserve original lead and source record identifiers. Do not create duplicate records to inflate activity. Route legitimate work to the correct business unit and worker. Ordinary internal qualification and routing should continue without unnecessary approval.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* CUSTOMER REACTIVATION                                                  */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "customer-reactivation-analyst",

      name:
        "Customer Reactivation Analyst",

      title:
        "AI Customer Reactivation Analyst",

      department:
        "Revenue Operations",

      mission:
        "Identify legitimate retention, repeat-business and customer-reactivation opportunities from authorised Cossa records.",

      responsibilities: [
        "Review CRM history, quotations and authorised consent information.",
        "Identify dormant or repeat-business opportunities.",
        "Prepare reactivation recommendations for Lead Intake and the AI CEO.",
      ],

      kpis: [
        "Source-labelled reactivation opportunities.",
        "No duplicate leads.",
        "No fabricated customer history.",
      ],

      capabilities: [
        "reactivation analysis",
        "retention analysis",
        "quotation follow-up analysis",
        "customer opportunity preparation",
      ],

      allowed_actions: [
        "analyse authorised CRM records",
        "prepare reactivation briefs",
        "prepare follow-up recommendations",
        "handoff opportunities",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "contact customers without an authorised communication workflow",
        "ignore opt-outs",
        "invent customer history",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Analyse authorised customer records and respect consent and opt-outs. Internal reactivation analysis should proceed automatically. Actual communication must use an authorised communication workflow and comply with applicable rules.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* DEAL INTELLIGENCE                                                      */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "broker-deal-intelligence-analyst",

      name:
        "Broker & Deal Intelligence Analyst",

      title:
        "AI Broker & Deal Intelligence Analyst",

      department:
        "Revenue Intelligence",

      mission:
        "Identify legitimate commercial, partner, buyer, supplier and deal opportunities and prepare evidence-backed internal matching briefs.",

      responsibilities: [
        "Analyse authorised commercial and market information.",
        "Assess fit, timing, constraints and opportunity evidence.",
        "Hand legitimate opportunities to Lead Intake and the AI CEO.",
      ],

      kpis: [
        "Evidence-labelled opportunities.",
        "No fabricated relationships or deals.",
        "No unsupported commercial probability.",
      ],

      capabilities: [
        "B2B opportunity research",
        "partner mapping",
        "deal matching",
        "commercial intelligence",
      ],

      allowed_actions: [
        "analyse authorised records",
        "research authorised market sources",
        "prepare commercial opportunity briefs",
        "handoff legitimate opportunities",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "fabricate relationships",
        "negotiate binding terms",
        "claim a deal is confirmed without evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Produce evidence-backed commercial intelligence. Safe internal opportunity research and matching should proceed without unnecessary owner approval. External introductions, negotiations and commitments require an authorised workflow and appropriate approval.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* PROCUREMENT                                                            */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "procurement-intelligence-analyst",

      name:
        "Procurement Intelligence Analyst",

      title:
        "AI Procurement Intelligence Analyst",

      department:
        "Operations Intelligence",

      mission:
        "Identify legitimate tender, RFQ, procurement and supplier opportunities and prepare decision-ready internal screening briefs.",

      responsibilities: [
        "Review authorised procurement sources and documents.",
        "Extract deadlines, requirements, eligibility criteria and risks.",
        "Prepare bid-or-no-bid recommendations.",
      ],

      kpis: [
        "Source-labelled opportunities.",
        "Deadline and requirement accuracy.",
        "No fabricated tender or eligibility claim.",
      ],

      capabilities: [
        "tender analysis",
        "RFQ analysis",
        "procurement screening",
        "eligibility review",
        "bid-or-no-bid preparation",
      ],

      allowed_actions: [
        "analyse procurement information",
        "prepare eligibility checklists",
        "prepare internal tender briefs",
        "prepare missing-document requirements",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "submit tenders without approval",
        "sign declarations",
        "commit pricing",
        "claim eligibility without evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Internal tender and procurement screening should continue automatically when evidence exists. Tender submission, signed commitments, declarations and binding pricing require owner approval.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

    /* ---------------------------------------------------------------------- */
    /* AI CEO                                                                 */
    /* ---------------------------------------------------------------------- */

    {
      employee_key:
        "ai-ceo",

      name:
        "Cossa AI CEO",

      title:
        "AI CEO",

      department:
        "Executive",

      mission:
        "Coordinate the Cossa AI workforce, synthesise verified worker outputs, resolve ordinary internal decisions and escalate only genuine owner decisions.",

      responsibilities: [
        "Review worker outputs for evidence, quality and consistency.",
        "Route safe work to the next capable employee.",
        "Resolve routine internal reasoning questions.",
        "Prepare concise owner briefings for high-risk or strategic decisions.",
      ],

      kpis: [
        "Workers collaborate instead of remaining isolated.",
        "Low-risk internal work continues without unnecessary owner interruption.",
        "Missing evidence is never converted into a fake fact.",
        "High-risk decisions remain with the owner.",
      ],

      capabilities: [
        "executive synthesis",
        "cross-department coordination",
        "workforce routing",
        "risk review",
        "decision briefing",
      ],

      allowed_actions: [
        "review internal handoffs",
        "route internal work",
        "prepare executive recommendations",
        "resolve ordinary internal questions",
        "prepare owner briefings",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "approve itself",
        "claim external work occurred without evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} You are the coordination layer for the Cossa AI workforce. Do not allow capable employees to remain idle merely because work needs another internal employee. Route safe work hand-to-hand. Escalate only genuine owner decisions. You may recommend a high-risk action but may not approve yourself.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },
  ] satisfies readonly GrowthWorkforceProfile[];

/* -------------------------------------------------------------------------- */
/* INPUT TYPES                                                                */
/* -------------------------------------------------------------------------- */

export interface CreateMissionInput {
  title: string;
  instruction: string;
  objective: string;
  business_unit_id?: string | null;

  assigned_employee_id?:
    | string
    | null;

  parent_mission_id?:
    | string
    | null;

  target_market?: string | null;

  target_location?:
    | string
    | null;

  target_service?: string | null;

  required_result_count?:
    | number
    | null;

  constraints?: unknown[];
  prohibited_actions?: unknown[];

  output_schema?:
    Record<
      string,
      unknown
    >;

  priority?:
    Mission["priority"];

  risk_level?:
    Mission["risk_level"];
}

/* -------------------------------------------------------------------------- */
/* DATABASE HELPERS                                                           */
/* -------------------------------------------------------------------------- */

function createDatabaseError(
  operation: string,
  error: unknown,
): Error {
  if (
    error instanceof Error
  ) {
    return new Error(
      `${operation}: ${error.message}`,
    );
  }

  if (
    typeof error ===
      "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message ===
      "string"
  ) {
    return new Error(
      `${operation}: ${error.message}`,
    );
  }

  return new Error(
    `${operation}: Unknown database error`,
  );
}

async function rows<T>(
  operation: string,

  query:
    PromiseLike<{
      data: T[] | null;
      error: unknown;
    }>,
): Promise<T[]> {
  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw createDatabaseError(
      operation,
      error,
    );
  }

  return data ?? [];
}

function requireNonEmptyValue(
  value: string,
  fieldName: string,
): string {
  const cleanedValue =
    value.trim();

  if (!cleanedValue) {
    throw new Error(
      `${fieldName} is required`,
    );
  }

  return cleanedValue;
}

/* -------------------------------------------------------------------------- */
/* EMPLOYEES                                                                  */
/* -------------------------------------------------------------------------- */

export function listEmployees(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<AiEmployee[]> {
  return rows<AiEmployee>(
    "Unable to load AI employees",

    db
      .from("ai_employees")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .order(
        "department",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),
  );
}

export function listActiveEmployees(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<AiEmployee[]> {
  return rows<AiEmployee>(
    "Unable to load active AI employees",

    db
      .from("ai_employees")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "active",
      )
      .order(
        "department",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* SOURCE PROFILE SYNCHRONISATION                                             */
/* -------------------------------------------------------------------------- */

/**
 * Keeps known source-defined employees aligned with this file.
 *
 * Important:
 * - custom employees are untouched;
 * - business_unit_id is untouched;
 * - created_by is untouched;
 * - paused and retired status is preserved;
 * - draft known employees become active when the source profile is active;
 * - source-defined responsibilities and instructions are upgraded.
 */
async function synchroniseKnownProfiles(
  existing:
    AiEmployee[],
): Promise<void> {
  const existingByKey =
    new Map(
      existing.map(
        (
          employee,
        ) => [
          employee.employee_key,
          employee,
        ],
      ),
    );

  for (
    const profile of
      COSSA_GROWTH_WORKFORCE
  ) {
    const existingEmployee =
      existingByKey.get(
        profile.employee_key,
      );

    if (
      !existingEmployee
    ) {
      continue;
    }

    const nextStatus:
      EmployeeStatus =
      existingEmployee.status ===
        "paused" ||
      existingEmployee.status ===
        "retired"
        ? existingEmployee.status
        : profile.status;

    const {
      error,
    } =
      await db
        .from(
          "ai_employees",
        )
        .update({
          name:
            profile.name,

          title:
            profile.title,

          department:
            profile.department,

          mission:
            profile.mission,

          responsibilities:
            profile.responsibilities,

          kpis:
            profile.kpis,

          capabilities:
            profile.capabilities,

          allowed_actions:
            profile.allowed_actions,

          prohibited_actions:
            profile.prohibited_actions,

          system_instructions:
            profile.system_instructions,

          requires_approval_by_default:
            profile.requires_approval_by_default,

          status:
            nextStatus,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "organisation_id",
          COSSA_ORGANISATION_ID,
        )
        .eq(
          "employee_key",
          profile.employee_key,
        );

    if (error) {
      throw createDatabaseError(
        `Unable to synchronise ${profile.name}`,
        error,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* MISSIONS                                                                   */
/* -------------------------------------------------------------------------- */

export function listMissions(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<Mission[]> {
  return rows<Mission>(
    "Unable to load missions",

    db
      .from("missions")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  );
}

export function listMissionRuns(
  missionId: string,

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<MissionRun[]> {
  const validMissionId =
    requireNonEmptyValue(
      missionId,
      "Mission ID",
    );

  return rows<MissionRun>(
    "Unable to load mission runs",

    db
      .from("mission_runs")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "mission_id",
        validMissionId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  );
}

export function listWorkforceRuns(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<MissionRun[]> {
  return rows<MissionRun>(
    "Unable to load workforce runs",

    db
      .from("mission_runs")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  );
}

export function listPendingApprovals(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<Approval[]> {
  return rows<Approval>(
    "Unable to load pending approvals",

    db
      .from("approvals")
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "pending",
      )
      .order(
        "requested_at",
        {
          ascending: false,
        },
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* CREATE MISSION                                                             */
/* -------------------------------------------------------------------------- */

export async function createMission(
  input:
    CreateMissionInput,
): Promise<Mission> {
  const title =
    requireNonEmptyValue(
      input.title,
      "Mission title",
    );

  const instruction =
    requireNonEmptyValue(
      input.instruction,
      "Mission instruction",
    );

  const objective =
    requireNonEmptyValue(
      input.objective,
      "Mission objective",
    );

  if (
    input.required_result_count !==
      undefined &&
    input.required_result_count !==
      null &&
    (
      !Number.isInteger(
        input.required_result_count,
      ) ||
      input.required_result_count <=
        0
    )
  ) {
    throw new Error(
      "Required result count must be a positive whole number",
    );
  }

  const missionPayload = {
    organisation_id:
      COSSA_ORGANISATION_ID,

    title,
    instruction,
    objective,

    business_unit_id:
      input.business_unit_id ??
      null,

    assigned_employee_id:
      input.assigned_employee_id ??
      null,

    parent_mission_id:
      input.parent_mission_id ??
      null,

    target_market:
      input.target_market?.trim() ||
      null,

    target_location:
      input.target_location?.trim() ||
      null,

    target_service:
      input.target_service?.trim() ||
      null,

    required_result_count:
      input.required_result_count ??
      null,

    constraints:
      input.constraints ??
      [],

    prohibited_actions:
      input.prohibited_actions ??
      [],

    output_schema:
      input.output_schema ??
      {},

    priority:
      input.priority ??
      "normal",

    risk_level:
      input.risk_level ??
      "low",

    status:
      "draft" as const,
  };

  const {
    data,
    error,
  } =
    await db
      .from("missions")
      .insert(
        missionPayload,
      )
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      "Unable to create mission",
      error,
    );
  }

  if (!data) {
    throw new Error(
      "Unable to create mission: Supabase returned no mission record",
    );
  }

  return data as Mission;
}

/* -------------------------------------------------------------------------- */
/* QUEUE MISSION                                                              */
/* -------------------------------------------------------------------------- */

export async function queueMission(
  missionId: string,

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<Mission> {
  const validMissionId =
    requireNonEmptyValue(
      missionId,
      "Mission ID",
    );

  const {
    data,
    error,
  } =
    await db
      .from("missions")
      .update({
        status:
          "queued",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        validMissionId,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "draft",
      )
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      "Unable to queue mission",
      error,
    );
  }

  if (!data) {
    throw new Error(
      "Unable to queue mission: The mission was not found or is not in draft status",
    );
  }

  return data as Mission;
}

/* -------------------------------------------------------------------------- */
/* CONTROLLED RUN TYPES                                                       */
/* -------------------------------------------------------------------------- */

export interface ControlledWorkforceRunInput {
  mission:
    Pick<
      Mission,
      | "id"
      | "objective"
      | "instruction"
      | "target_market"
      | "target_location"
    >;

  handoff:
    Pick<
      EmployeeHandoff,
      | "id"
      | "mission_id"
      | "to_employee_id"
      | "reason"
      | "context"
      | "status"
    >;

  employee:
    Pick<
      AiEmployee,
      | "id"
      | "employee_key"
      | "name"
      | "title"
      | "status"
    >;

  provider:
    | "groq"
    | "openai";

  modelName:
    string;

  priorOutputs:
    string[];

  authorisedEvidence?:
    string[];
}

export interface ControlledReviewableOutput {
  kind:
    "reviewable_draft";

  worker_key:
    string;

  worker_name:
    string;

  created_at:
    string;

  external_actions_enabled:
    false;

  source_scope:
    string[];

  content:
    string;
}

function compactPriorOutputs(
  outputs:
    string[],
): string[] {
  return outputs
    .map(
      (
        output,
      ) =>
        output.trim(),
    )
    .filter(Boolean)
    .slice(-4)
    .map(
      (
        output,
      ) =>
        output.slice(
          0,
          4_000,
        ),
    );
}

/* -------------------------------------------------------------------------- */
/* START CONTROLLED RUN                                                       */
/* -------------------------------------------------------------------------- */

export async function startControlledWorkforceRun(
  input:
    ControlledWorkforceRunInput,

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<MissionRun> {
  if (
    input.employee.status !==
    "active"
  ) {
    throw new Error(
      `${input.employee.name} is not active and cannot start a workforce run.`,
    );
  }

  if (
    input.handoff.status !==
    "pending"
  ) {
    throw new Error(
      "This handoff is no longer pending and cannot be started again.",
    );
  }

  if (
    input.handoff.mission_id !==
    input.mission.id
  ) {
    throw new Error(
      "The handoff does not belong to the selected mission.",
    );
  }

  if (
    input.handoff.to_employee_id !==
    input.employee.id
  ) {
    throw new Error(
      "The selected workforce profile does not own this handoff.",
    );
  }

  const startedAt =
    new Date().toISOString();

  const runInput = {
    kind:
      "controlled_workforce_stage",

    objective:
      input.mission.objective,

    instruction:
      input.mission.instruction,

    target_market:
      input.mission.target_market,

    target_location:
      input.mission.target_location,

    handoff_reason:
      input.handoff.reason,

    handoff_context:
      input.handoff.context,

    prior_reviewable_outputs:
      compactPriorOutputs(
        input.priorOutputs,
      ),

    authorised_evidence:
      (
        input.authorisedEvidence ??
        []
      )
        .map(
          (
            evidence,
          ) =>
            evidence.trim(),
        )
        .filter(Boolean)
        .slice(
          0,
          5,
        )
        .map(
          (
            evidence,
          ) =>
            evidence.slice(
              0,
              4_000,
            ),
        ),

    external_actions_enabled:
      false,
  };

  const {
    data:
      run,

    error:
      runError,
  } =
    await db
      .from(
        "mission_runs",
      )
      .insert({
        organisation_id:
          organisationId,

        mission_id:
          input.mission.id,

        employee_id:
          input.employee.id,

        status:
          "running",

        model_provider:
          input.provider,

        model_name:
          input.modelName,

        knowledge_version_ids:
          [],

        input:
          runInput,

        started_at:
          startedAt,
      })
      .select("*")
      .single();

  if (runError) {
    throw createDatabaseError(
      "Unable to start the controlled workforce run",
      runError,
    );
  }

  if (!run) {
    throw new Error(
      "Unable to start the controlled workforce run: Supabase returned no run record",
    );
  }

  const {
    data:
      acceptedHandoff,

    error:
      handoffError,
  } =
    await db
      .from(
        "employee_handoffs",
      )
      .update({
        status:
          "accepted",

        run_id:
          run.id,

        accepted_at:
          startedAt,
      })
      .eq(
        "id",
        input.handoff.id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "pending",
      )
      .select("id")
      .single();

  if (
    handoffError ||
    !acceptedHandoff
  ) {
    await db
      .from(
        "mission_runs",
      )
      .update({
        status:
          "failed",

        error_code:
          "handoff_acceptance_failed",

        error_message:
          "The workforce run could not claim its pending handoff.",

        completed_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        run.id,
      )
      .eq(
        "organisation_id",
        organisationId,
      );

    if (handoffError) {
      throw createDatabaseError(
        "Unable to claim the controlled workforce handoff",
        handoffError,
      );
    }

    throw new Error(
      "Unable to claim the controlled workforce handoff",
    );
  }

  const {
    error:
      missionError,
  } =
    await db
      .from("missions")
      .update({
        status:
          "running",

        updated_at:
          startedAt,
      })
      .eq(
        "id",
        input.mission.id,
      )
      .eq(
        "organisation_id",
        organisationId,
      );

  if (missionError) {
    throw createDatabaseError(
      "Unable to mark the mission as running",
      missionError,
    );
  }

  return run as MissionRun;
}

/* -------------------------------------------------------------------------- */
/* COMPLETE CONTROLLED RUN                                                    */
/* -------------------------------------------------------------------------- */

export async function completeControlledWorkforceRun(
  input: {
    run:
      Pick<
        MissionRun,
        | "id"
        | "mission_id"
      >;

    handoff:
      Pick<
        EmployeeHandoff,
        | "id"
        | "mission_id"
      >;

    employee:
      Pick<
        AiEmployee,
        | "id"
        | "employee_key"
        | "name"
      >;

    content:
      string;
  },

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<{
  run:
    MissionRun;

  finalStage:
    boolean;

  approval:
    Approval | null;
}> {
  const content =
    requireNonEmptyValue(
      input.content,
      "Reviewable workforce output",
    );

  const completedAt =
    new Date().toISOString();

  const output:
    ControlledReviewableOutput =
    {
      kind:
        "reviewable_draft",

      worker_key:
        input.employee.employee_key,

      worker_name:
        input.employee.name,

      created_at:
        completedAt,

      external_actions_enabled:
        false,

      source_scope: [
        "verified Cossa knowledge supplied by the Cossa AI route",
        "authorised operational records supplied by the Cossa AI route",
        "authorised read-only evidence recorded in the mission run",
        "recorded mission objective",
        "earlier workforce outputs",
      ],

      content,
    };

  const {
    data:
      run,

    error:
      runError,
  } =
    await db
      .from(
        "mission_runs",
      )
      .update({
        status:
          "completed",

        output,

        completed_at:
          completedAt,

        error_code:
          null,

        error_message:
          null,
      })
      .eq(
        "id",
        input.run.id,
      )
      .eq(
        "mission_id",
        input.run.mission_id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "running",
      )
      .select("*")
      .single();

  if (runError) {
    throw createDatabaseError(
      "Unable to save the workforce output",
      runError,
    );
  }

  if (!run) {
    throw new Error(
      "Unable to save the workforce output: No running mission record was updated",
    );
  }

  const {
    error:
      handoffError,
  } =
    await db
      .from(
        "employee_handoffs",
      )
      .update({
        status:
          "completed",

        run_id:
          run.id,

        completed_at:
          completedAt,
      })
      .eq(
        "id",
        input.handoff.id,
      )
      .eq(
        "mission_id",
        input.run.mission_id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "run_id",
        run.id,
      )
      .eq(
        "status",
        "accepted",
      );

  if (handoffError) {
    throw createDatabaseError(
      "Unable to mark the workforce handoff complete",
      handoffError,
    );
  }

  const remaining =
    await rows<
      Pick<
        EmployeeHandoff,
        "id"
      >
    >(
      "Unable to check remaining workforce handoffs",

      db
        .from(
          "employee_handoffs",
        )
        .select("id")
        .eq(
          "organisation_id",
          organisationId,
        )
        .eq(
          "mission_id",
          input.run.mission_id,
        )
        .eq(
          "status",
          "pending",
        ),
    );

  const finalStage =
    remaining.length ===
    0;

  const {
    error:
      missionError,
  } =
    await db
      .from(
        "missions",
      )
      .update({
        status:
          finalStage
            ? "awaiting_approval"
            : "running",

        updated_at:
          completedAt,
      })
      .eq(
        "id",
        input.run.mission_id,
      )
      .eq(
        "organisation_id",
        organisationId,
      );

  if (missionError) {
    throw createDatabaseError(
      "Unable to update the mission status",
      missionError,
    );
  }

  if (!finalStage) {
    return {
      run:
        run as MissionRun,

      finalStage:
        false,

      approval:
        null,
    };
  }

  const {
    data:
      existingApproval,

    error:
      existingApprovalError,
  } =
    await db
      .from(
        "approvals",
      )
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "mission_id",
        input.run.mission_id,
      )
      .eq(
        "action_type",
        "review_growth_coordination_output",
      )
      .eq(
        "status",
        "pending",
      )
      .maybeSingle();

  if (existingApprovalError) {
    throw createDatabaseError(
      "Unable to check the final workforce review request",
      existingApprovalError,
    );
  }

  if (existingApproval) {
    return {
      run:
        run as MissionRun,

      finalStage:
        true,

      approval:
        existingApproval as Approval,
    };
  }

  const {
    data:
      approval,

    error:
      approvalError,
  } =
    await db
      .from(
        "approvals",
      )
      .insert({
        organisation_id:
          organisationId,

        mission_id:
          input.run.mission_id,

        run_id:
          run.id,

        requested_by_employee_id:
          input.employee.id,

        action_type:
          "review_growth_coordination_output",

        action_payload: {
          external_actions_enabled:
            false,

          requested_decision:
            "Review the final internal workforce briefing.",
        },

        risk_level:
          "medium",

        justification:
          "The internal coordination chain has completed. This checkpoint closes the mission record only and does not authorise social publishing, spending, supplier orders, contracts, credentials or external account changes.",

        status:
          "pending",
      })
      .select("*")
      .single();

  if (approvalError) {
    throw createDatabaseError(
      "Unable to create the final workforce review request",
      approvalError,
    );
  }

  if (!approval) {
    throw new Error(
      "Unable to create the final workforce review request",
    );
  }

  return {
    run:
      run as MissionRun,

    finalStage:
      true,

    approval:
      approval as Approval,
  };
}

/* -------------------------------------------------------------------------- */
/* FAIL CONTROLLED RUN                                                        */
/* -------------------------------------------------------------------------- */

export async function failControlledWorkforceRun(
  input: {
    run:
      Pick<
        MissionRun,
        | "id"
        | "mission_id"
      >;

    handoff:
      Pick<
        EmployeeHandoff,
        "id"
      >;

    errorMessage:
      string;
  },

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<void> {
  const completedAt =
    new Date().toISOString();

  const errorMessage =
    input.errorMessage
      .trim()
      .slice(
        0,
        1_000,
      ) ||
    "The provider did not return a usable workforce output.";

  const {
    error:
      runError,
  } =
    await db
      .from(
        "mission_runs",
      )
      .update({
        status:
          "failed",

        error_code:
          "provider_or_output_failure",

        error_message:
          errorMessage,

        completed_at:
          completedAt,
      })
      .eq(
        "id",
        input.run.id,
      )
      .eq(
        "mission_id",
        input.run.mission_id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "running",
      );

  if (runError) {
    throw createDatabaseError(
      "Unable to record the workforce run failure",
      runError,
    );
  }

  const {
    error:
      handoffError,
  } =
    await db
      .from(
        "employee_handoffs",
      )
      .update({
        status:
          "pending",

        run_id:
          null,

        accepted_at:
          null,

        completed_at:
          null,
      })
      .eq(
        "id",
        input.handoff.id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "run_id",
        input.run.id,
      )
      .eq(
        "status",
        "accepted",
      );

  if (handoffError) {
    throw createDatabaseError(
      "Unable to return the handoff to pending state",
      handoffError,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* APPROVAL                                                                   */
/* -------------------------------------------------------------------------- */

export async function decideApproval(
  approvalId:
    string,

  decision:
    | "approved"
    | "rejected",

  reason:
    string,

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<Approval> {
  const validApprovalId =
    requireNonEmptyValue(
      approvalId,
      "Approval ID",
    );

  const validReason =
    requireNonEmptyValue(
      reason,
      "Decision reason",
    );

  const {
    data:
      userData,

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw createDatabaseError(
      "Unable to verify the authenticated user",
      userError,
    );
  }

  if (!userData.user) {
    throw new Error(
      "Authentication is required",
    );
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "approvals",
      )
      .update({
        status:
          decision,

        decision_reason:
          validReason,

        decided_by:
          userData.user.id,

        decided_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        validApprovalId,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .eq(
        "status",
        "pending",
      )
      .is(
        "decided_at",
        null,
      )
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      "Unable to update approval",
      error,
    );
  }

  if (!data) {
    throw new Error(
      "Unable to update approval: It may already have been decided or may not belong to this organisation",
    );
  }

  if (
    decision ===
      "approved" &&
    data.action_type ===
      "review_growth_coordination_output" &&
    data.mission_id
  ) {
    const {
      error:
        missionError,
    } =
      await db
        .from(
          "missions",
        )
        .update({
          status:
            "completed",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          data.mission_id,
        )
        .eq(
          "organisation_id",
          organisationId,
        )
        .eq(
          "status",
          "awaiting_approval",
        );

    if (missionError) {
      throw createDatabaseError(
        "The review was recorded but the mission could not be closed",
        missionError,
      );
    }
  }

  if (
    decision ===
      "rejected" &&
    data.action_type ===
      "review_growth_coordination_output" &&
    data.mission_id
  ) {
    const {
      data:
        finalHandoff,

      error:
        finalHandoffError,
    } =
      await db
        .from(
          "employee_handoffs",
        )
        .select("*")
        .eq(
          "organisation_id",
          organisationId,
        )
        .eq(
          "mission_id",
          data.mission_id,
        )
        .eq(
          "status",
          "completed",
        )
        .order(
          "completed_at",
          {
            ascending:
              false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (finalHandoffError) {
      throw createDatabaseError(
        "The review was recorded but the final handoff could not be found",
        finalHandoffError,
      );
    }

    if (!finalHandoff) {
      throw new Error(
        "The review was recorded but no completed handoff was available to reopen",
      );
    }

    const {
      error:
        reopenHandoffError,
    } =
      await db
        .from(
          "employee_handoffs",
        )
        .update({
          status:
            "pending",

          run_id:
            null,

          accepted_at:
            null,

          completed_at:
            null,
        })
        .eq(
          "id",
          finalHandoff.id,
        )
        .eq(
          "organisation_id",
          organisationId,
        )
        .eq(
          "status",
          "completed",
        );

    if (reopenHandoffError) {
      throw createDatabaseError(
        "The review was recorded but the final handoff could not be reopened",
        reopenHandoffError,
      );
    }

    const {
      error:
        missionError,
    } =
      await db
        .from(
          "missions",
        )
        .update({
          status:
            "running",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          data.mission_id,
        )
        .eq(
          "organisation_id",
          organisationId,
        )
        .eq(
          "status",
          "awaiting_approval",
        );

    if (missionError) {
      throw createDatabaseError(
        "The review was recorded but the mission could not be reopened",
        missionError,
      );
    }
  }

  return data as Approval;
}

/* -------------------------------------------------------------------------- */
/* HANDOFFS                                                                   */
/* -------------------------------------------------------------------------- */

export function listEmployeeHandoffs(
  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<EmployeeHandoff[]> {
  return rows<EmployeeHandoff>(
    "Unable to load employee handoffs",

    db
      .from(
        "employee_handoffs",
      )
      .select("*")
      .eq(
        "organisation_id",
        organisationId,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE INSTALL / ALIGNMENT                                              */
/* -------------------------------------------------------------------------- */

/**
 * Ensures all source-defined Cossa workers exist and are aligned.
 *
 * Existing custom employees are preserved.
 * Paused and retired known employees remain paused/retired.
 */
export async function installCossaGrowthWorkforce(): Promise<
  AiEmployee[]
> {
  const existing =
    await listEmployees();

  await synchroniseKnownProfiles(
    existing,
  );

  const refreshedExisting =
    await listEmployees();

  const existingKeys =
    new Set(
      refreshedExisting.map(
        (
          employee,
        ) =>
          employee.employee_key,
      ),
    );

  const missingProfiles =
    COSSA_GROWTH_WORKFORCE.filter(
      (
        profile,
      ) =>
        !existingKeys.has(
          profile.employee_key,
        ),
    );

  if (
    missingProfiles.length >
    0
  ) {
    const {
      error,
    } =
      await db
        .from(
          "ai_employees",
        )
        .insert(
          missingProfiles.map(
            (
              profile,
            ) => ({
              organisation_id:
                COSSA_ORGANISATION_ID,

              business_unit_id:
                null,

              ...profile,
            }),
          ),
        );

    if (error) {
      throw createDatabaseError(
        "Unable to install the Cossa AI workforce",
        error,
      );
    }
  }

  return listEmployees();
}

/* -------------------------------------------------------------------------- */
/* GROWTH COORDINATION MISSION                                                */
/* -------------------------------------------------------------------------- */

export interface CreateGrowthCoordinationMissionInput {
  objective:
    string;

  target_market?:
    | string
    | null;

  target_location?:
    | string
    | null;
}

export interface GrowthCoordinationMissionResult {
  mission:
    Mission;

  handoffs:
    EmployeeHandoff[];
}

/**
 * Growth collaboration chain:
 *
 * Website Intelligence
 * -> Strategy
 * -> Content
 * -> Creative Media
 * -> Scheduling
 * -> Social Media Management
 * -> Growth Analysis
 * -> Paid Media
 * -> AI CEO
 *
 * Internal safe stages may run sequentially.
 * High-risk external actions remain separately controlled.
 */
export async function createGrowthCoordinationMission(
  input:
    CreateGrowthCoordinationMissionInput,
): Promise<GrowthCoordinationMissionResult> {
  const objective =
    requireNonEmptyValue(
      input.objective,
      "Growth objective",
    );

  const employees =
    await listEmployees();

  const employeeByKey =
    new Map(
      employees.map(
        (
          employee,
        ) => [
          employee.employee_key,
          employee,
        ],
      ),
    );

  const handoffKeys = [
    "website-seo-monitor",
    "social-strategy-planner",
    "content-writer",
    "creative-media-producer",
    "social-schedule-coordinator",
    "social-media-manager",
    "account-growth-analyst",
    "paid-media-specialist",
    "ai-ceo",
  ] as const;

  const handoffEmployees =
    handoffKeys.map(
      (
        key,
      ) =>
        employeeByKey.get(
          key,
        ),
    );

  if (
    handoffEmployees.some(
      (
        employee,
      ) =>
        !employee,
    )
  ) {
    const missingKeys =
      handoffKeys.filter(
        (
          key,
        ) =>
          !employeeByKey.has(
            key,
          ),
      );

    throw new Error(
      `Install the complete Cossa workforce before creating this mission. Missing: ${missingKeys.join(", ")}.`,
    );
  }

  const inactiveEmployees =
    handoffEmployees.filter(
      (
        employee,
      ) =>
        employee &&
        employee.status !==
          "active",
    );

  if (
    inactiveEmployees.length >
    0
  ) {
    throw new Error(
      `The workflow contains inactive employees: ${inactiveEmployees
        .map(
          (
            employee,
          ) =>
            employee?.name,
        )
        .filter(Boolean)
        .join(", ")}.`,
    );
  }

  const activeHandoffEmployees =
    handoffEmployees as AiEmployee[];

  const assignedEmployee =
    activeHandoffEmployees[0];

  const mission =
    await createMission({
      title:
        `Growth coordination: ${objective.slice(
          0,
          100,
        )}`,

      instruction:
        "Coordinate an evidence-based Cossa growth workflow. Safe internal work must move employee-to-employee without unnecessary owner interruption. Every social content package should include appropriate visual requirements. High-risk external actions remain separately approval-controlled.",

      objective,

      assigned_employee_id:
        assignedEmployee.id,

      target_market:
        input.target_market?.trim() ||
        null,

      target_location:
        input.target_location?.trim() ||
        null,

      constraints: [
        "Use verified Cossa knowledge and authorised operational evidence.",
        "Do not invent social performance, customers, suppliers, products, prices or business results.",
        "Social and promotional posts requiring visuals must include a real visual asset or production-ready visual brief.",
        "Routine internal planning, drafting, creative preparation, scheduling, analysis and handoffs should continue without unnecessary owner approval.",
        "External publishing requires a verified authorised social integration.",
        "Advertising spend, contracts, supplier orders, legal commitments, credentials and irreversible account changes remain owner-controlled.",
      ],

      prohibited_actions: [
        "fabricate_business_facts",
        "fabricate_performance",
        "fabricate_supplier_information",
        "spend_without_owner_authority",
        "make_binding_commitments_without_owner_authority",
        "claim_external_action_without_verified_record",
      ],

      output_schema: {
        required_sections: [
          "website intelligence",
          "social strategy",
          "content production",
          "visual creative requirements",
          "channel schedule",
          "social media management readiness",
          "growth analysis",
          "paid media recommendation",
          "AI CEO briefing",
        ],

        final_decision_owner:
          "Cossa Nexus Holdings owner",
      },

      priority:
        "normal",

      risk_level:
        "medium",
    });

  const handoffReasons = [
    "Review authorised Cossa website evidence and identify verified website, SEO and content opportunities.",

    "Turn the verified website and business context into a practical channel-aware growth strategy.",

    "Create accurate campaign, educational, conversion and social content from the strategy.",

    "Create the visual production requirements for each relevant post, campaign, product or promotional asset.",

    "Organise the complete copy-and-creative packages into an operational channel schedule.",

    "Prepare the social media publishing queue and channel-management requirements. Publish only through a real authorised integration when permitted.",

    "Analyse authorised account evidence and identify audience, content and conversion improvements.",

    "Prepare paid-media strategy and campaign recommendations. Do not spend or change budgets.",

    "Synthesize all employee outputs, resolve ordinary internal issues and prepare only genuine owner decisions for escalation.",
  ];

  const handoffRows =
    activeHandoffEmployees.map(
      (
        employee,
        index,
      ) => ({
        organisation_id:
          COSSA_ORGANISATION_ID,

        mission_id:
          mission.id,

        run_id:
          null,

        from_employee_id:
          index ===
          0
            ? null
            : activeHandoffEmployees[
                index -
                  1
              ].id,

        to_employee_id:
          employee.id,

        reason:
          handoffReasons[
            index
          ],

        context: {
          objective,

          stage:
            index +
            1,

          total_stages:
            activeHandoffEmployees.length,

          collaboration_mode:
            "hand_to_hand",

          safe_internal_work:
            "continue",

          high_risk_actions:
            "owner_controlled",

          external_actions_enabled:
            false,
        },

        retained_record_ids:
          {},

        status:
          "pending" as const,
      }),
    );

  const {
    data,
    error,
  } =
    await db
      .from(
        "employee_handoffs",
      )
      .insert(
        handoffRows,
      )
      .select("*");

  if (error) {
    throw createDatabaseError(
      "Unable to create the workforce handoff plan",
      error,
    );
  }

  return {
    mission,

    handoffs:
      (
        data ??
        []
      ) as EmployeeHandoff[],
  };
}