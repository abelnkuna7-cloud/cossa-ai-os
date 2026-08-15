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
 * Remove this when generated Supabase Database types contain the complete
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
  Exclude<MissionStatus, "draft">;

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "executed";

export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

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
    RiskLevel;

  status:
    MissionStatus;

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
  requested_by_employee_id: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  risk_level: RiskLevel;
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
  context: Record<string, unknown>;
  retained_record_ids: Record<string, unknown>;

  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "completed";

  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

type WorkforceProfile =
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
/* COMMON WORKFORCE RULES                                                     */
/* -------------------------------------------------------------------------- */

const INTERNAL_WORK_RULES = [
  "Complete safe internal work without unnecessary owner interruption.",
  "Collaborate with other Cossa AI employees and hand useful work forward.",
  "Use verified company knowledge, authorised operational records and authorised evidence only.",
  "Never invent customers, suppliers, products, inventory, prices, performance, revenue, results, partnerships or completed actions.",
  "Clearly identify missing information or missing integrations.",
  "Do not stop a safe internal workflow merely because another Cossa employee is required.",
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
/* DEFAULT WORKFORCE                                                          */
/* -------------------------------------------------------------------------- */

export const COSSA_GROWTH_WORKFORCE =
  [
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
        `${INTERNAL_WORK_RULES.join(" ")} Use official Cossa web properties and authorised website data only. A public website check proves only what was actually observed. Safe analysis and recommendations should continue automatically. Hand technical implementation requirements to the Website Delivery Specialist or Tech Solutions Specialist.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} Write strong professional Cossa content using verified information. When a post, promotion, product or campaign requires a visual, include a specific visual brief and hand it to the Creative Media Producer. Plain text is not a complete social media package when a visual should accompany the post.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Turn verified campaigns, services, products and content briefs into production-ready visual requirements and real media assets when an authorised media workflow exists.",

      responsibilities: [
        "Prepare visual concepts for social posts, brochures, banners, product promotions and websites.",
        "Coordinate visuals with Content, Social Media, Store Operations and Cossa Tech.",
        "Keep product, pricing, service and claim accuracy aligned with verified information.",
      ],

      kpis: [
        "Every visual has a purpose, format and channel.",
        "No fake product image, testimonial, award or business result.",
        "Social campaigns are not considered complete when required visuals are missing.",
      ],

      capabilities: [
        "visual briefs",
        "image generation briefs",
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
        "hand completed creative requirements to Social Media Manager",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim an image was generated when no media workflow generated it",
        "fabricate product appearance",
        "fabricate testimonials or endorsements",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Every social or promotional item should include the correct visual requirement when visuals improve or complete the content. Create production-ready visual briefs. When an authorised media-generation workflow exists, use it. Never pretend a visual asset exists when only a written description was produced.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Organise copy, visuals, campaigns and target channels.",
        "Check dependencies before handing work to the Social Media Manager.",
        "Maintain publishing cadence and campaign continuity.",
      ],

      kpis: [
        "Complete content packages.",
        "Clear scheduling dependencies.",
        "No false publishing claims.",
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
        `${INTERNAL_WORK_RULES.join(" ")} Routine internal scheduling does not require owner approval. Ensure each social package contains copy, platform, timing and the required visual asset or visual-production requirement before handing it to the Social Media Manager.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Own day-to-day social media operations across authorised Cossa brands and keep content, campaigns, channel health and publishing readiness moving continuously.",

      responsibilities: [
        "Receive strategy, copy, visuals and schedules from upstream workers.",
        "Maintain channel-specific content readiness for authorised social channels.",
        "Coordinate routine publishing when a verified authorised publishing integration exists.",
        "Hand performance evidence to the Account Growth Analyst.",
      ],

      kpis: [
        "Continuous channel readiness.",
        "No unnecessary owner interruption for routine internal social work.",
        "No false publishing claims.",
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
        "publish routine authorised content only through a verified publishing integration when permitted",
        "handoff performance requirements to analysts",
      ],

      prohibited_actions: [
        ...HIGH_RISK_ACTIONS,
        "claim account access without a verified connection",
        "claim a post was published without a verified publishing record",
        "buy followers or engagement",
        "send sensitive customer communications without approval",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} You own Cossa social media operations. Copy, visuals, scheduling and channel preparation should continue hand-to-hand without unnecessary owner interruption. External publishing is allowed only when a verified authorised publishing integration exists and the execution workflow explicitly supports publishing. Otherwise keep the publish-ready queue prepared and report the missing connection.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} Analyse only connected and authorised data. Missing data should create a clear integration requirement instead of guessed metrics. Routine internal analysis should continue without owner interruption.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Develop advertising strategy, targeting, creative requirements and measurement plans while keeping actual spending owner-controlled.",

      responsibilities: [
        "Prepare authorised advertising plans.",
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
        "Review catalogue health and merchandising requirements.",
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
        "place supplier orders without owner approval",
        "claim stock exists without evidence",
        "invent prices",
        "invent delivery times",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Operate as the Cossa Store internal workflow manager. Keep catalogue, product, supplier, creative and social-commerce work moving hand-to-hand. Safe internal store work does not require owner approval. Supplier orders, payments and binding commercial commitments do.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Identify product gaps, demand signals and merchandising opportunities.",
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
        `${INTERNAL_WORK_RULES.join(" ")} Use legitimate catalogue and market evidence. Product intelligence is internal decision support. Do not describe a trend, demand level, stock position or supplier as verified unless evidence supports it.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Record supplier source evidence, location, relevance and verification date.",
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
        "call a supplier verified from weak evidence",
      ],

      system_instructions:
        `${INTERNAL_WORK_RULES.join(" ")} Real supplier discovery requires authorised research sources. Record source evidence, operating location, product relevance, contact source and verification date. Do not order, pay, negotiate binding terms or claim a supplier is verified without evidence.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Own technical solution planning for Cossa Tech and coordinate implementation requirements across websites, systems and digital services.",

      responsibilities: [
        "Translate business and client needs into technical requirements.",
        "Coordinate Website Delivery, Content, Creative Media and Website Monitoring.",
        "Prepare implementation plans and identify missing technical dependencies.",
      ],

      kpis: [
        "Clear technical requirements.",
        "No fabricated implementation claims.",
        "No legitimate technical request left without an owner.",
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
        `${INTERNAL_WORK_RULES.join(" ")} Operate as Cossa Tech's technical coordination specialist. Safe technical analysis, planning, drafting and implementation preparation should continue internally. Route website implementation to Website Delivery and content or creative requirements to the relevant workers.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} If Cossa or a client needs a website, own the internal website-delivery workflow. Coordinate technical implementation, content, visuals and SEO. Do not leave the request waiting merely because several workers are required. Production domain, DNS, credentials and irreversible changes remain approval-controlled.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} Preserve original lead and source identifiers. Do not create duplicate records to inflate activity. Route legitimate work to the correct business unit and worker. Ordinary internal qualification and routing should continue automatically.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} Analyse authorised customer records and respect consent and opt-outs. Internal reactivation analysis should proceed automatically. Actual external communication must use an authorised communication workflow.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        `${INTERNAL_WORK_RULES.join(" ")} Produce evidence-backed commercial intelligence. Safe internal opportunity research and matching should proceed automatically. External introductions, negotiations and commitments require an authorised workflow and appropriate approval.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },

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
        "Prepare concise owner briefings only when genuine owner authority is required.",
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
        `${INTERNAL_WORK_RULES.join(" ")} You are the coordination layer for the Cossa AI workforce. Do not allow capable employees to remain idle merely because another internal employee is required. Route safe work hand-to-hand. Escalate only genuine owner decisions. You may recommend a high-risk action but may never approve yourself.`,

      requires_approval_by_default:
        false,

      status:
        "active",
    },
  ] satisfies readonly WorkforceProfile[];

/* -------------------------------------------------------------------------- */
/* WORKFLOW DEFINITIONS                                                       */
/* -------------------------------------------------------------------------- */

interface WorkforceStageDefinition {
  employeeKey: string;
  reason: string;
}

interface WorkforceMissionDefinition {
  prefix: string;
  instruction: string;
  stages: readonly WorkforceStageDefinition[];
  requiredSections: readonly string[];
  constraints: readonly string[];
}

const GROWTH_WORKFLOW_DEFINITION:
  WorkforceMissionDefinition =
  {
    prefix:
      "Growth coordination:",

    instruction:
      "Coordinate Cossa website intelligence, social strategy, content, visual production, scheduling, social media management, growth analysis and paid-media planning. Safe internal work must move worker-to-worker automatically. Escalate only genuinely high-risk external actions.",

    stages: [
      {
        employeeKey:
          "website-seo-monitor",
        reason:
          "Review authorised Cossa website evidence and identify verified website, SEO and content opportunities.",
      },
      {
        employeeKey:
          "social-strategy-planner",
        reason:
          "Turn verified website and business context into a practical channel-aware growth strategy.",
      },
      {
        employeeKey:
          "content-writer",
        reason:
          "Create accurate campaign, educational, conversion and social content from the approved strategy.",
      },
      {
        employeeKey:
          "creative-media-producer",
        reason:
          "Create production-ready visual requirements for each relevant social post, promotion, campaign and product asset.",
      },
      {
        employeeKey:
          "social-schedule-coordinator",
        reason:
          "Organise complete copy-and-creative packages into a practical channel schedule.",
      },
      {
        employeeKey:
          "social-media-manager",
        reason:
          "Prepare and manage the publishing queue and channel workflow. Publish only through a verified authorised integration when permitted.",
      },
      {
        employeeKey:
          "account-growth-analyst",
        reason:
          "Analyse authorised account evidence and identify audience, content and conversion improvements.",
      },
      {
        employeeKey:
          "paid-media-specialist",
        reason:
          "Prepare paid-media strategy and campaign recommendations. Do not spend or change budgets without owner authority.",
      },
      {
        employeeKey:
          "ai-ceo",
        reason:
          "Synthesize workforce outputs, resolve ordinary internal issues and escalate only genuine owner decisions.",
      },
    ],

    requiredSections: [
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

    constraints: [
      "Use verified Cossa knowledge and authorised operational evidence.",
      "Do not fabricate social performance, customers, suppliers, products, prices or business results.",
      "Posts requiring visuals must include a real asset or production-ready visual requirement.",
      "Routine internal planning, drafting, creative preparation, scheduling, analysis and handoffs continue without owner approval.",
      "External publishing requires a verified authorised social integration.",
      "Advertising spend, supplier orders, contracts, legal commitments, credentials and irreversible account changes remain owner-controlled.",
    ],
  };

const STORE_WORKFLOW_DEFINITION:
  WorkforceMissionDefinition =
  {
    prefix:
      "Store operations:",

    instruction:
      "Coordinate Cossa Store product intelligence, supplier research, catalogue readiness, creative production, social commerce and executive review. Safe research and preparation must continue automatically. Orders, payments and binding supplier commitments require owner approval.",

    stages: [
      {
        employeeKey:
          "product-intelligence-analyst",
        reason:
          "Analyse authorised Cossa Store catalogue and legitimate market evidence for trends, product gaps and commercial opportunities.",
      },
      {
        employeeKey:
          "supplier-sourcing-analyst",
        reason:
          "Research legitimate supplier candidates for identified product requirements and record traceable evidence.",
      },
      {
        employeeKey:
          "store-operations-manager",
        reason:
          "Assess catalogue readiness, supplier dependencies, merchandising requirements and commercial priorities.",
      },
      {
        employeeKey:
          "content-writer",
        reason:
          "Prepare accurate product, campaign and social-commerce copy using verified store information.",
      },
      {
        employeeKey:
          "creative-media-producer",
        reason:
          "Prepare product creatives, promotional assets, brochures and social-commerce visual requirements.",
      },
      {
        employeeKey:
          "social-media-manager",
        reason:
          "Prepare store social-commerce publishing queues and campaign readiness for authorised channels.",
      },
      {
        employeeKey:
          "account-growth-analyst",
        reason:
          "Analyse authorised store and campaign evidence and recommend growth improvements.",
      },
      {
        employeeKey:
          "ai-ceo",
        reason:
          "Synthesize store findings, resolve routine internal questions and escalate only genuine commercial owner decisions.",
      },
    ],

    requiredSections: [
      "product intelligence",
      "supplier research",
      "catalogue readiness",
      "store content",
      "product creative requirements",
      "social commerce readiness",
      "growth recommendations",
      "AI CEO briefing",
    ],

    constraints: [
      "Do not fabricate products, stock, supplier details, prices or delivery times.",
      "Supplier candidates require traceable evidence.",
      "Routine catalogue, research, content and merchandising work proceeds automatically.",
      "Supplier orders, payments and binding commercial terms require owner approval.",
    ],
  };

const TECH_WORKFLOW_DEFINITION:
  WorkforceMissionDefinition =
  {
    prefix:
      "Cossa Tech delivery:",

    instruction:
      "Coordinate Cossa Tech technical requirements, website delivery, content, creative assets, website quality and executive review. Safe planning and implementation preparation should move worker-to-worker without unnecessary owner interruption.",

    stages: [
      {
        employeeKey:
          "tech-solutions-specialist",
        reason:
          "Translate the business or client requirement into a clear technical solution and implementation scope.",
      },
      {
        employeeKey:
          "website-delivery-specialist",
        reason:
          "Prepare website architecture, build requirements, implementation tasks and QA dependencies where relevant.",
      },
      {
        employeeKey:
          "content-writer",
        reason:
          "Prepare accurate website, landing-page, service or customer-facing content required by the technical delivery.",
      },
      {
        employeeKey:
          "creative-media-producer",
        reason:
          "Prepare required website graphics, banners, mock-ups, brochures and visual production requirements.",
      },
      {
        employeeKey:
          "website-seo-monitor",
        reason:
          "Review authorised website and SEO evidence and prepare quality and optimisation requirements.",
      },
      {
        employeeKey:
          "ai-ceo",
        reason:
          "Synthesize technical outputs, resolve ordinary internal dependencies and escalate only genuine owner decisions.",
      },
    ],

    requiredSections: [
      "technical solution",
      "website delivery plan",
      "content requirements",
      "creative requirements",
      "SEO and quality review",
      "AI CEO briefing",
    ],

    constraints: [
      "Do not claim deployment or implementation occurred without verified evidence.",
      "Routine technical planning, content and creative preparation continue automatically.",
      "Production credentials, DNS changes, destructive changes and irreversible account actions require owner approval.",
    ],
  };

const REVENUE_WORKFLOW_DEFINITION:
  WorkforceMissionDefinition =
  {
    prefix:
      "Revenue intelligence:",

    instruction:
      "Coordinate legitimate Cossa lead, reactivation, procurement and commercial intelligence into actionable internal revenue work. Preserve source records, avoid duplicate leads and escalate only high-risk external commitments.",

    stages: [
      {
        employeeKey:
          "lead-intake-coordinator",
        reason:
          "Review authorised lead and opportunity records, retain original identifiers and determine correct routing.",
      },
      {
        employeeKey:
          "customer-reactivation-analyst",
        reason:
          "Identify legitimate repeat-business, dormant-customer and retention opportunities from authorised records.",
      },
      {
        employeeKey:
          "broker-deal-intelligence-analyst",
        reason:
          "Research and assess legitimate commercial, partner, buyer, supplier and deal opportunities.",
      },
      {
        employeeKey:
          "procurement-intelligence-analyst",
        reason:
          "Review relevant tender, RFQ and procurement opportunities and prepare evidence-backed bid-or-no-bid intelligence.",
      },
      {
        employeeKey:
          "ai-ceo",
        reason:
          "Synthesize revenue and procurement intelligence, resolve routine routing decisions and escalate genuine owner decisions.",
      },
    ],

    requiredSections: [
      "lead routing",
      "customer reactivation intelligence",
      "commercial opportunities",
      "procurement opportunities",
      "AI CEO briefing",
    ],

    constraints: [
      "Preserve original record identifiers.",
      "Do not create duplicate leads to inflate pipeline activity.",
      "Do not fabricate customer, tender, supplier or commercial information.",
      "Routine internal analysis and routing continue automatically.",
      "External negotiation, signed submissions and binding commitments require owner authority.",
    ],
  };

/* -------------------------------------------------------------------------- */
/* INPUT TYPES                                                                */
/* -------------------------------------------------------------------------- */

export interface CreateMissionInput {
  title: string;
  instruction: string;
  objective: string;
  business_unit_id?: string | null;
  assigned_employee_id?: string | null;
  parent_mission_id?: string | null;
  target_market?: string | null;
  target_location?: string | null;
  target_service?: string | null;
  required_result_count?: number | null;
  constraints?: unknown[];
  prohibited_actions?: unknown[];
  output_schema?: Record<string, unknown>;
  priority?: Mission["priority"];
  risk_level?: Mission["risk_level"];
}

export interface CreateCoordinationMissionInput {
  objective: string;
  target_market?: string | null;
  target_location?: string | null;
  target_service?: string | null;
}

export interface CoordinationMissionResult {
  mission: Mission;
  handoffs: EmployeeHandoff[];
}

export interface CreateGrowthCoordinationMissionInput
  extends CreateCoordinationMissionInput {}

export interface GrowthCoordinationMissionResult
  extends CoordinationMissionResult {}

export interface HighRiskApprovalInput {
  actionType: string;
  justification: string;
  actionPayload?: Record<string, unknown>;
  missionId?: string | null;
  runId?: string | null;
  requestedByEmployeeId?: string | null;
  riskLevel:
    | "high"
    | "critical";
}

/* -------------------------------------------------------------------------- */
/* DATABASE HELPERS                                                           */
/* -------------------------------------------------------------------------- */

function createDatabaseError(
  operation: string,
  error: unknown,
): Error {
  if (error instanceof Error) {
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
  query: PromiseLike<{
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

    if (!existingEmployee) {
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
      "Unable to queue mission: Mission was not found or is not in draft status",
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

        input: {
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
              .slice(0, 5)
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
        },

        started_at:
          startedAt,
      })
      .select("*")
      .single();

  if (runError) {
    throw createDatabaseError(
      "Unable to start the workforce run",
      runError,
    );
  }

  if (!run) {
    throw new Error(
      "Unable to start the workforce run: Supabase returned no run record",
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
        "Unable to claim the workforce handoff",
        handoffError,
      );
    }

    throw new Error(
      "Unable to claim the workforce handoff",
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

/**
 * IMPORTANT:
 *
 * Safe internal collaboration no longer creates an automatic approval after
 * the final employee.
 *
 * When the final handoff completes, the mission completes automatically.
 *
 * High-risk actions must call requestHighRiskApproval() separately.
 */
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
      "Workforce output",
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
        "authorised evidence recorded in the mission run",
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
      "Unable to save workforce output: No running run was updated",
    );
  }

  const {
    data:
      completedHandoff,

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
      )
      .select("id")
      .single();

  if (handoffError) {
    throw createDatabaseError(
      "Unable to mark the workforce handoff complete",
      handoffError,
    );
  }

  if (!completedHandoff) {
    throw new Error(
      "Unable to mark the workforce handoff complete",
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
            ? "completed"
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

  return {
    run:
      run as MissionRun,

    finalStage,

    approval:
      null,
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
          completedAt,
      })
      .eq(
        "id",
        input.run.mission_id,
      )
      .eq(
        "organisation_id",
        organisationId,
      )
      .neq(
        "status",
        "cancelled",
      );

  if (missionError) {
    throw createDatabaseError(
      "Unable to keep the mission available for retry",
      missionError,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* HIGH-RISK APPROVAL REQUEST                                                 */
/* -------------------------------------------------------------------------- */

/**
 * This is the owner interruption boundary.
 *
 * Safe internal work should NOT call this function.
 *
 * Use it only for genuinely high-risk actions such as:
 * - spending money;
 * - placing an order;
 * - signing or submitting a binding commitment;
 * - changing credentials;
 * - destructive or irreversible account changes;
 * - sensitive external communication.
 */
export async function requestHighRiskApproval(
  input:
    HighRiskApprovalInput,

  organisationId =
    COSSA_ORGANISATION_ID,
): Promise<Approval> {
  const actionType =
    requireNonEmptyValue(
      input.actionType,
      "Action type",
    );

  const justification =
    requireNonEmptyValue(
      input.justification,
      "Approval justification",
    );

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
        "action_type",
        actionType,
      )
      .eq(
        "status",
        "pending",
      )
      .eq(
        "mission_id",
        input.missionId ??
          null,
      )
      .maybeSingle();

  if (existingApprovalError) {
    throw createDatabaseError(
      "Unable to check existing high-risk approval",
      existingApprovalError,
    );
  }

  if (existingApproval) {
    return existingApproval as Approval;
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "approvals",
      )
      .insert({
        organisation_id:
          organisationId,

        mission_id:
          input.missionId ??
          null,

        run_id:
          input.runId ??
          null,

        requested_by_employee_id:
          input.requestedByEmployeeId ??
          null,

        action_type:
          actionType,

        action_payload:
          input.actionPayload ??
          {},

        risk_level:
          input.riskLevel,

        justification,

        status:
          "pending",
      })
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      "Unable to create high-risk approval request",
      error,
    );
  }

  if (!data) {
    throw new Error(
      "Unable to create high-risk approval request",
    );
  }

  if (input.missionId) {
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
            "awaiting_approval",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          input.missionId,
        )
        .eq(
          "organisation_id",
          organisationId,
        );

    if (missionError) {
      throw createDatabaseError(
        "Approval was created but the mission could not be paused",
        missionError,
      );
    }
  }

  return data as Approval;
}

/* -------------------------------------------------------------------------- */
/* APPROVAL DECISION                                                          */
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

  /*
   * Backward compatibility for older workflow-review approvals.
   */
  if (
    data.action_type ===
      "review_growth_coordination_output" &&
    data.mission_id
  ) {
    const {
      error:
        legacyMissionError,
    } =
      await db
        .from(
          "missions",
        )
        .update({
          status:
            decision ===
            "approved"
              ? "completed"
              : "running",

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
        );

    if (legacyMissionError) {
      throw createDatabaseError(
        "The legacy review was recorded but the mission could not be updated",
        legacyMissionError,
      );
    }

    return data as Approval;
  }

  /*
   * A high-risk approval only authorises that particular action.
   *
   * It does not automatically claim that the action executed.
   */
  if (
    data.mission_id
  ) {
    const {
      data:
        remainingPendingApprovals,

      error:
        remainingApprovalError,
    } =
      await db
        .from(
          "approvals",
        )
        .select("id")
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
          "pending");

    if (remainingApprovalError) {
      throw createDatabaseError(
        "Approval was recorded but remaining approvals could not be checked",
        remainingApprovalError,
      );
    }

    if (
      (
        remainingPendingApprovals ??
        []
      ).length ===
      0
    ) {
      const {
        data:
          pendingHandoffs,

        error:
          handoffError,
      } =
        await db
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
            data.mission_id,
          )
          .eq(
            "status",
            "pending");

      if (handoffError) {
        throw createDatabaseError(
          "Approval was recorded but mission handoffs could not be checked",
          handoffError,
        );
      }

      const nextStatus:
        MissionStatus =
        (
          pendingHandoffs ??
          []
        ).length >
        0
          ? "running"
          : "completed";

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
              nextStatus,

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
          );

      if (missionError) {
        throw createDatabaseError(
          "Approval was recorded but the mission could not resume",
          missionError,
        );
      }
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
/* GENERIC COLLABORATION MISSION ENGINE                                       */
/* -------------------------------------------------------------------------- */

async function createCollaborationMission(
  definition:
    WorkforceMissionDefinition,

  input:
    CreateCoordinationMissionInput,
): Promise<CoordinationMissionResult> {
  const objective =
    requireNonEmptyValue(
      input.objective,
      "Mission objective",
    );

  /*
   * Install/synchronise before mission creation so source-defined employees
   * become real database employees automatically.
   */
  const employees =
    await installCossaGrowthWorkforce();

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

  const missingKeys =
    definition.stages
      .map(
        (
          stage,
        ) =>
          stage.employeeKey,
      )
      .filter(
        (
          key,
        ) =>
          !employeeByKey.has(
            key,
          ),
      );

  if (
    missingKeys.length >
    0
  ) {
    throw new Error(
      `The workforce is missing required employees: ${missingKeys.join(", ")}.`,
    );
  }

  const stageEmployees =
    definition.stages.map(
      (
        stage,
      ) =>
        employeeByKey.get(
          stage.employeeKey,
        ) as AiEmployee,
    );

  const inactiveEmployees =
    stageEmployees.filter(
      (
        employee,
      ) =>
        employee.status !==
        "active",
    );

  if (
    inactiveEmployees.length >
    0
  ) {
    throw new Error(
      `This workflow contains inactive employees: ${inactiveEmployees
        .map(
          (
            employee,
          ) =>
            employee.name,
        )
        .join(", ")}.`,
    );
  }

  const assignedEmployee =
    stageEmployees[0];

  const mission =
    await createMission({
      title:
        `${definition.prefix} ${objective.slice(
          0,
          100,
        )}`,

      instruction:
        definition.instruction,

      objective,

      assigned_employee_id:
        assignedEmployee.id,

      target_market:
        input.target_market?.trim() ||
        null,

      target_location:
        input.target_location?.trim() ||
        null,

      target_service:
        input.target_service?.trim() ||
        null,

      constraints:
        [
          ...definition.constraints,
        ],

      prohibited_actions: [
        "fabricate_business_facts",
        "fabricate_external_actions",
        "spend_without_owner_authority",
        "make_binding_commitments_without_owner_authority",
        "change_credentials_without_owner_authority",
        "make_irreversible_account_changes_without_owner_authority",
      ],

      output_schema: {
        required_sections:
          [
            ...definition.requiredSections,
          ],

        collaboration_mode:
          "hand_to_hand",

        safe_internal_work:
          "continue_automatically",

        owner_interruption:
          "high_risk_only",

        final_decision_owner:
          "Cossa Nexus Holdings owner",
      },

      priority:
        "normal",

      risk_level:
        "medium",
    });

  const handoffRows =
    definition.stages.map(
      (
        stage,
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
            : stageEmployees[
                index -
                1
              ].id,

        to_employee_id:
          stageEmployees[
            index
          ].id,

        reason:
          stage.reason,

        context: {
          objective,

          stage:
            index +
            1,

          total_stages:
            definition.stages.length,

          workflow:
            definition.prefix,

          collaboration_mode:
            "hand_to_hand",

          safe_internal_work:
            "continue",

          owner_interruption:
            "high_risk_only",

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

  /*
   * Mission is immediately ready for workers.
   */
  const {
    error:
      missionStatusError,
  } =
    await db
      .from(
        "missions",
      )
      .update({
        status:
          "queued",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        mission.id,
      )
      .eq(
        "organisation_id",
        COSSA_ORGANISATION_ID,
      );

  if (missionStatusError) {
    throw createDatabaseError(
      "The workflow was created but could not be queued",
      missionStatusError,
    );
  }

  return {
    mission: {
      ...mission,

      status:
        "queued",
    },

    handoffs:
      (
        data ??
        []
      ) as EmployeeHandoff[],
  };
}

/* -------------------------------------------------------------------------- */
/* GROWTH COORDINATION                                                        */
/* -------------------------------------------------------------------------- */

export async function createGrowthCoordinationMission(
  input:
    CreateGrowthCoordinationMissionInput,
): Promise<GrowthCoordinationMissionResult> {
  return createCollaborationMission(
    GROWTH_WORKFLOW_DEFINITION,
    input,
  );
}

/* -------------------------------------------------------------------------- */
/* STORE COORDINATION                                                         */
/* -------------------------------------------------------------------------- */

export async function createStoreOperationsMission(
  input:
    CreateCoordinationMissionInput,
): Promise<CoordinationMissionResult> {
  return createCollaborationMission(
    STORE_WORKFLOW_DEFINITION,
    input,
  );
}

/* -------------------------------------------------------------------------- */
/* COSSA TECH COORDINATION                                                    */
/* -------------------------------------------------------------------------- */

export async function createTechDeliveryMission(
  input:
    CreateCoordinationMissionInput,
): Promise<CoordinationMissionResult> {
  return createCollaborationMission(
    TECH_WORKFLOW_DEFINITION,
    input,
  );
}

/* -------------------------------------------------------------------------- */
/* REVENUE / PROCUREMENT COORDINATION                                         */
/* -------------------------------------------------------------------------- */

export async function createRevenueIntelligenceMission(
  input:
    CreateCoordinationMissionInput,
): Promise<CoordinationMissionResult> {
  return createCollaborationMission(
    REVENUE_WORKFLOW_DEFINITION,
    input,
  );
}