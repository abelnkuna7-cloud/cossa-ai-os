import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

function resolveOrganisationId(): string {
  const configuredOrganisationId = import.meta.env.VITE_COSSA_ORGANISATION_ID?.trim();

  return configuredOrganisationId || DEFAULT_COSSA_ORGANISATION_ID;
}

export const COSSA_ORGANISATION_ID = resolveOrganisationId();

/**
 * Temporary compatibility wrapper.
 *
 * This should be removed once the generated Supabase Database types include
 * all Workforce AI tables.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
};

export type EmployeeStatus = "draft" | "active" | "paused" | "retired";

export type MissionStatus =
  | "draft"
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type MissionRunStatus = Exclude<MissionStatus, "draft">;

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
  priority: "low" | "normal" | "high" | "urgent";
  risk_level: "low" | "medium" | "high" | "critical";
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
  requested_by_employee_id: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  risk_level: "low" | "medium" | "high" | "critical";
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
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

type GrowthWorkforceProfile = Pick<
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

/**
 * The workforce starts as a controlled planning and briefing team. These
 * profiles are deliberately barred from publishing, spending, sending or
 * connecting third-party accounts until a separate approved integration exists.
 */
export const COSSA_GROWTH_WORKFORCE: readonly GrowthWorkforceProfile[] = [
  {
    employee_key: "website-seo-monitor",
    name: "Website & SEO Monitor",
    title: "AI Website & SEO Monitor",
    department: "Growth",
    mission:
      "Run controlled checks of the official Cossa website and turn verified observations into reviewable improvement requests.",
    responsibilities: [
      "Review only the owner-designated public Cossa website and authorised analytics or search data.",
      "Record availability, response, indexing and content observations with their source and check time.",
      "Escalate verified risks and missing access to the strategy team, AI CEO and owner.",
    ],
    kpis: [
      "Checks and recommendations that identify their exact source and time.",
      "No fabricated traffic, ranking, security, conversion or website-change claims.",
      "No website edit, hosting access, publication or external account change.",
    ],
    capabilities: ["website health review", "SEO checklists", "evidence handoffs"],
    allowed_actions: [
      "run the approved read-only website check",
      "review authorised website evidence",
      "draft internal improvement requests",
      "prepare CEO briefing inputs",
    ],
    prohibited_actions: [
      "edit the website",
      "publish website content",
      "claim search ranking or traffic without authorised data",
      "access hosting or analytics without an approved connection",
    ],
    system_instructions:
      "Use the official Cossa website and authorised data only. Label the exact check scope, source and time. Treat a website-health result as an observation, not a complete SEO, security or performance audit. Escalate needed owner approvals instead of changing the website.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "social-strategy-planner",
    name: "Social Strategy Planner",
    title: "AI Social Strategy Planner",
    department: "Growth",
    mission:
      "Turn approved Cossa business objectives into a practical, channel-aware social growth plan.",
    responsibilities: [
      "Define audience, offer, content pillars and cadence from approved Cossa information.",
      "Prepare a written plan for the content and scheduling workers.",
      "Escalate missing facts, strategy decisions and risk to the AI CEO and owner.",
    ],
    kpis: [
      "Clear, evidence-based planning briefs.",
      "No invented audience, performance or competitor claims.",
      "Every external action remains approval-gated.",
    ],
    capabilities: ["research synthesis", "channel planning", "brief writing"],
    allowed_actions: [
      "analyse approved context",
      "create internal plans",
      "draft internal handoffs",
    ],
    prohibited_actions: [
      "publish posts",
      "send messages",
      "spend advertising budget",
      "connect external accounts",
    ],
    system_instructions:
      "Use only approved Cossa knowledge, connected data and user-provided facts. State when information is missing. Produce a concise plan with assumptions, evidence and approval gates.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "content-writer",
    name: "Content Writer",
    title: "AI Content Writer",
    department: "Growth",
    mission:
      "Draft accurate, on-brand social, website and campaign content from an approved brief.",
    responsibilities: [
      "Create draft captions, articles, scripts and campaign copy.",
      "Preserve the approved Cossa brand voice and label unverified assumptions.",
      "Pass drafts to the scheduler only after human content approval.",
    ],
    kpis: [
      "Useful drafts grounded in approved business information.",
      "No unverified claims, testimonials or results.",
      "No direct publication.",
    ],
    capabilities: ["copywriting", "content repurposing", "editorial drafting"],
    allowed_actions: ["draft content", "prepare internal content packs", "request missing facts"],
    prohibited_actions: [
      "publish posts",
      "claim customer results",
      "use copyrighted material without approval",
    ],
    system_instructions:
      "Draft only from approved information. Separate facts from proposed wording. Do not invent performance, customer stories, offers, pricing or legal claims.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "social-schedule-coordinator",
    name: "Social Schedule Coordinator",
    title: "AI Social Schedule Coordinator",
    department: "Growth",
    mission:
      "Organise approved content into a reviewable publishing schedule without posting it externally.",
    responsibilities: [
      "Turn approved content into a proposed schedule with owners and approval points.",
      "Flag missing assets, channel access and consent requirements.",
      "Prepare handoff notes for account growth and paid media review.",
    ],
    kpis: [
      "Reviewable schedules with clear dependencies.",
      "No silent publishing or auto-sending.",
      "Every channel requirement is visible to the owner.",
    ],
    capabilities: ["content calendars", "dependency tracking", "approval checklists"],
    allowed_actions: [
      "create internal schedules",
      "create internal tasks",
      "flag missing approvals",
    ],
    prohibited_actions: ["publish posts", "send direct messages", "modify social accounts"],
    system_instructions:
      "Create internal scheduling recommendations only. Treat every social network as disconnected until the Integration Center shows an authorised live connection.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "account-growth-analyst",
    name: "Account Growth Analyst",
    title: "AI Account Growth Analyst",
    department: "Growth",
    mission:
      "Assess approved, connected account data and recommend responsible audience and account-growth actions.",
    responsibilities: [
      "Review only authorised account and campaign information.",
      "Recommend content, community and conversion improvements with evidence.",
      "Escalate missing data instead of estimating performance.",
    ],
    kpis: [
      "Source-labelled recommendations.",
      "No fabricated followers, reach, traffic or conversion data.",
      "No outreach without consent and approval.",
    ],
    capabilities: ["growth analysis", "funnel review", "account recommendations"],
    allowed_actions: [
      "analyse authorised data",
      "draft recommendations",
      "prepare CEO briefing inputs",
    ],
    prohibited_actions: [
      "follow users",
      "message people",
      "buy engagement",
      "claim performance results",
    ],
    system_instructions:
      "Only analyse connected and authorised data. If data is not present, say so and request the connection or source rather than estimating metrics.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "paid-media-specialist",
    name: "Paid Media Specialist",
    title: "AI Paid Media Specialist",
    department: "Growth",
    mission:
      "Prepare compliant, controlled Google and Meta advertising recommendations for owner approval.",
    responsibilities: [
      "Draft campaign structure, targeting hypotheses, creative briefs and measurement plans.",
      "Flag budget, policy, tracking and approval requirements before any campaign is launched.",
      "Supply a decision-ready paid-media summary to the AI CEO.",
    ],
    kpis: [
      "Clear assumptions and spend controls.",
      "No campaign launch or budget change without owner approval.",
      "No fabricated advertising metrics.",
    ],
    capabilities: ["ad planning", "creative briefing", "measurement planning"],
    allowed_actions: ["draft media plans", "draft ad copy", "prepare approval requests"],
    prohibited_actions: [
      "spend budget",
      "launch campaigns",
      "change bids",
      "connect advertising accounts",
    ],
    system_instructions:
      "Prepare recommendations only. No spend, campaign launch, bid adjustment or account change is allowed without an authorised connected account and a recorded human approval.",
    requires_approval_by_default: true,
    status: "active",
  },
  {
    employee_key: "ai-ceo",
    name: "Cossa AI CEO",
    title: "AI CEO",
    department: "Executive",
    mission:
      "Synthesize verified worker outputs into an owner-ready decision briefing for Cossa Nexus Holdings.",
    responsibilities: [
      "Check that handoff outputs are evidence-labelled and internally consistent.",
      "Summarise decisions, trade-offs, blockers and approval requests for the owner.",
      "Never approve or execute external actions on the owner's behalf.",
    ],
    kpis: [
      "Decision-ready briefings grounded in recorded information.",
      "Clear disclosure of missing evidence and connection gaps.",
      "Owner approval preserved for all external or high-risk action.",
    ],
    capabilities: ["executive synthesis", "risk review", "decision briefing"],
    allowed_actions: [
      "review internal handoffs",
      "prepare executive briefings",
      "recommend next actions",
    ],
    prohibited_actions: [
      "approve itself",
      "publish content",
      "spend money",
      "make legal or financial commitments",
    ],
    system_instructions:
      "Prepare a concise CEO briefing from verified Cossa records and workforce handoffs. Clearly label facts, recommendations, missing information and owner decisions required.",
    requires_approval_by_default: true,
    status: "active",
  },
] as const;

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

function createDatabaseError(operation: string, error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`${operation}: ${error.message}`);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return new Error(`${operation}: ${error.message}`);
  }

  return new Error(`${operation}: Unknown database error`);
}

async function rows<T>(
  operation: string,
  query: PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const { data, error } = await query;

  if (error) {
    throw createDatabaseError(operation, error);
  }

  return data ?? [];
}

function requireNonEmptyValue(value: string, fieldName: string): string {
  const cleanedValue = value.trim();

  if (!cleanedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return cleanedValue;
}

export function listEmployees(organisationId = COSSA_ORGANISATION_ID): Promise<AiEmployee[]> {
  return rows<AiEmployee>(
    "Unable to load AI employees",
    db
      .from("ai_employees")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("department", { ascending: true })
      .order("name", { ascending: true }),
  );
}

export function listActiveEmployees(organisationId = COSSA_ORGANISATION_ID): Promise<AiEmployee[]> {
  return rows<AiEmployee>(
    "Unable to load active AI employees",
    db
      .from("ai_employees")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("status", "active")
      .order("department", { ascending: true })
      .order("name", { ascending: true }),
  );
}

export function listMissions(organisationId = COSSA_ORGANISATION_ID): Promise<Mission[]> {
  return rows<Mission>(
    "Unable to load missions",
    db
      .from("missions")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  );
}

export function listMissionRuns(
  missionId: string,
  organisationId = COSSA_ORGANISATION_ID,
): Promise<MissionRun[]> {
  const validMissionId = requireNonEmptyValue(missionId, "Mission ID");

  return rows<MissionRun>(
    "Unable to load mission runs",
    db
      .from("mission_runs")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("mission_id", validMissionId)
      .order("created_at", { ascending: false }),
  );
}

export function listPendingApprovals(organisationId = COSSA_ORGANISATION_ID): Promise<Approval[]> {
  return rows<Approval>(
    "Unable to load pending approvals",
    db
      .from("approvals")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
  );
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  const title = requireNonEmptyValue(input.title, "Mission title");
  const instruction = requireNonEmptyValue(input.instruction, "Mission instruction");
  const objective = requireNonEmptyValue(input.objective, "Mission objective");

  if (
    input.required_result_count !== undefined &&
    input.required_result_count !== null &&
    (!Number.isInteger(input.required_result_count) || input.required_result_count <= 0)
  ) {
    throw new Error("Required result count must be a positive whole number");
  }

  const missionPayload = {
    organisation_id: COSSA_ORGANISATION_ID,
    title,
    instruction,
    objective,
    business_unit_id: input.business_unit_id ?? null,
    assigned_employee_id: input.assigned_employee_id ?? null,
    parent_mission_id: input.parent_mission_id ?? null,
    target_market: input.target_market?.trim() || null,
    target_location: input.target_location?.trim() || null,
    target_service: input.target_service?.trim() || null,
    required_result_count: input.required_result_count ?? null,
    constraints: input.constraints ?? [],
    prohibited_actions: input.prohibited_actions ?? [],
    output_schema: input.output_schema ?? {},
    priority: input.priority ?? "normal",
    risk_level: input.risk_level ?? "low",
    status: "draft" as const,
  };

  const { data, error } = await db.from("missions").insert(missionPayload).select("*").single();

  if (error) {
    throw createDatabaseError("Unable to create mission", error);
  }

  if (!data) {
    throw new Error("Unable to create mission: Supabase returned no mission record");
  }

  return data as Mission;
}

export async function queueMission(
  missionId: string,
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Mission> {
  const validMissionId = requireNonEmptyValue(missionId, "Mission ID");

  const { data, error } = await db
    .from("missions")
    .update({
      status: "queued",
      updated_at: new Date().toISOString(),
    })
    .eq("id", validMissionId)
    .eq("organisation_id", organisationId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw createDatabaseError("Unable to queue mission", error);
  }

  if (!data) {
    throw new Error("Unable to queue mission: The mission was not found or is not in draft status");
  }

  return data as Mission;
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  reason: string,
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Approval> {
  const validApprovalId = requireNonEmptyValue(approvalId, "Approval ID");
  const validReason = requireNonEmptyValue(reason, "Decision reason");

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw createDatabaseError("Unable to verify the authenticated user", userError);
  }

  if (!userData.user) {
    throw new Error("Authentication is required");
  }

  const { data, error } = await db
    .from("approvals")
    .update({
      status: decision,
      decision_reason: validReason,
      decided_by: userData.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", validApprovalId)
    .eq("organisation_id", organisationId)
    .eq("status", "pending")
    .is("decided_at", null)
    .select("*")
    .single();

  if (error) {
    throw createDatabaseError("Unable to update approval", error);
  }

  if (!data) {
    throw new Error(
      "Unable to update approval: It may already have been decided or may not belong to this organisation",
    );
  }

  return data as Approval;
}

export function listEmployeeHandoffs(
  organisationId = COSSA_ORGANISATION_ID,
): Promise<EmployeeHandoff[]> {
  return rows<EmployeeHandoff>(
    "Unable to load employee handoffs",
    db
      .from("employee_handoffs")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  );
}

/**
 * Inserts only missing default profiles. Existing Cossa workforce profiles are
 * never overwritten by this activation action.
 */
export async function installCossaGrowthWorkforce(): Promise<AiEmployee[]> {
  const existing = await listEmployees();
  const existingKeys = new Set(existing.map((employee) => employee.employee_key));
  const missingProfiles = COSSA_GROWTH_WORKFORCE.filter(
    (profile) => !existingKeys.has(profile.employee_key),
  );

  if (missingProfiles.length === 0) {
    return existing;
  }

  const { error } = await db.from("ai_employees").insert(
    missingProfiles.map((profile) => ({
      organisation_id: COSSA_ORGANISATION_ID,
      business_unit_id: null,
      ...profile,
    })),
  );

  if (error) {
    throw createDatabaseError("Unable to install the Cossa growth workforce", error);
  }

  return listEmployees();
}

export interface CreateGrowthCoordinationMissionInput {
  objective: string;
  target_market?: string | null;
  target_location?: string | null;
}

export interface GrowthCoordinationMissionResult {
  mission: Mission;
  handoffs: EmployeeHandoff[];
}

/**
 * Records a controlled internal work sequence. It does not call a model,
 * publish content, contact a person, spend budget or change an external
 * account. Those later actions need a connected provider and human approval.
 */
export async function createGrowthCoordinationMission(
  input: CreateGrowthCoordinationMissionInput,
): Promise<GrowthCoordinationMissionResult> {
  const objective = requireNonEmptyValue(input.objective, "Growth objective");
  const employees = await listEmployees();
  const employeeByKey = new Map(employees.map((employee) => [employee.employee_key, employee]));

  const handoffKeys = [
    "website-seo-monitor",
    "social-strategy-planner",
    "content-writer",
    "social-schedule-coordinator",
    "account-growth-analyst",
    "paid-media-specialist",
    "ai-ceo",
  ];

  const handoffEmployees = handoffKeys.map((key) => employeeByKey.get(key));

  if (handoffEmployees.some((employee) => !employee)) {
    throw new Error("Install the Cossa growth workforce before creating a coordination mission.");
  }

  const assignedEmployee = handoffEmployees[0]!;

  const mission = await createMission({
    title: `Growth coordination: ${objective.slice(0, 100)}`,
    instruction:
      "Coordinate an internal website, social, content and paid-media planning brief. Use approved Cossa information only. Preserve the handoff order, label missing evidence and do not perform an external action beyond the approved read-only Cossa website health check.",
    objective,
    assigned_employee_id: assignedEmployee.id,
    target_market: input.target_market?.trim() || null,
    target_location: input.target_location?.trim() || null,
    constraints: [
      "Planning and draft work only until a provider connection and owner approval exist.",
      "No social publishing, direct messaging, advertising spend or account changes. The only permitted external check is a read-only check of the official public Cossa website.",
      "Each worker must label verified facts, recommendations and missing information.",
      "The AI CEO prepares an owner briefing; the Cossa owner makes the final decision.",
    ],
    prohibited_actions: [
      "publish_social_content",
      "send_external_messages",
      "spend_ad_budget",
      "connect_or_modify_external_accounts",
      "make_legal_or_financial_commitments",
    ],
    output_schema: {
      required_sections: [
        "strategy brief",
        "website health observations",
        "content drafts",
        "proposed schedule",
        "account-growth recommendations",
        "paid-media recommendation",
        "AI CEO owner briefing",
      ],
      final_decision_owner: "Cossa Nexus Holdings owner",
    },
    priority: "normal",
    risk_level: "medium",
  });

  const handoffReasons = [
    "Check the official public Cossa website only and label the exact scope, source, time and any verified issue.",
    "Start with an evidence-based social growth strategy brief.",
    "Turn the approved strategy brief into draft content.",
    "Prepare a reviewable schedule; do not publish externally.",
    "Assess authorised account data or record the missing data connection.",
    "Prepare a controlled paid-media recommendation; do not spend or launch.",
    "Synthesize the workforce outputs into a Cossa owner decision briefing.",
  ];

  const handoffRows = handoffEmployees.map((employee, index) => ({
    organisation_id: COSSA_ORGANISATION_ID,
    mission_id: mission.id,
    run_id: null,
    from_employee_id: index === 0 ? null : handoffEmployees[index - 1]!.id,
    to_employee_id: employee!.id,
    reason: handoffReasons[index],
    context: {
      objective,
      stage: index + 1,
      total_stages: handoffEmployees.length,
      external_actions_enabled: false,
    },
    retained_record_ids: {},
    status: "pending" as const,
  }));

  const { data, error } = await db.from("employee_handoffs").insert(handoffRows).select("*");

  if (error) {
    throw createDatabaseError("Unable to create the workforce handoff plan", error);
  }

  return {
    mission,
    handoffs: (data ?? []) as EmployeeHandoff[],
  };
}
