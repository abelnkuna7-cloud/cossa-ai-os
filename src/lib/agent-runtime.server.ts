import { canScheduleAgentRetry } from "./operational-truth";
import { retrySupabaseIssuedAtFuture } from "./supabase-jwt-retry";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const MAX_TASKS_PER_TICK = 6;
const TASK_LEASE_SECONDS = 420;
const MAX_LEAD_HUNTER_RESULTS = 20;
const MAX_MODEL_OUTPUT_CHARS = 9_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_SECONDS = 300;
const CONFIGURATION_CIRCUIT_OPEN_SECONDS = 60 * 60;
const LEAD_HUNTER_COMPANIES = [
  "cossa_nexus_construction",
  "cossa_facility_services",
  "cossa_tech",
  "cossa_ai_growth",
  "nexdocs",
  "cossa_store",
  "cossa_nexus_holdings",
] as const;
const LEAD_HUNTER_SERVICES = [
  "construction",
  "renovation",
  "property_maintenance",
  "painting",
  "tiling",
  "ceilings",
  "roofing",
  "plumbing",
  "facility_management",
  "commercial_cleaning",
  "deep_cleaning",
  "hygiene",
  "landscaping",
  "waste_management",
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
  "business_documents",
  "quotations",
  "proposals",
  "contracts",
  "ecommerce",
  "general",
] as const;

export type RuntimeRole = "owner" | "admin" | "manager" | "member" | "viewer";

export type RuntimeActor = {
  userId: string;
  organisationId: string;
  role: RuntimeRole;
};

type ModelProvider = "groq" | "openai" | "gemini";

type ProviderFailureCategory =
  | "rate_limited"
  | "quota_exhausted"
  | "provider_unavailable"
  | "timeout"
  | "model_unavailable"
  | "transient_network"
  | "authentication_failed"
  | "permission_denied"
  | "invalid_request"
  | "safety_refusal"
  | "invalid_response";

type ProviderDefinition = {
  key: ModelProvider;
  environmentKey: "groqApiKey" | "openAiApiKey" | "geminiApiKey";
  modelEnvironmentKey: "AGENT_GROQ_MODEL" | "AGENT_OPENAI_MODEL" | "AGENT_GEMINI_MODEL";
  defaultModel: string;
  priority: "primary" | "secondary" | "emergency";
  capabilities: readonly ("reasoning" | "drafting" | "structured_output")[];
};

const MODEL_PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  {
    key: "groq",
    environmentKey: "groqApiKey",
    modelEnvironmentKey: "AGENT_GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    priority: "primary",
    capabilities: ["reasoning", "drafting"],
  },
  {
    key: "openai",
    environmentKey: "openAiApiKey",
    modelEnvironmentKey: "AGENT_OPENAI_MODEL",
    defaultModel: "gpt-5.6",
    priority: "secondary",
    capabilities: ["reasoning", "drafting", "structured_output"],
  },
  {
    key: "gemini",
    environmentKey: "geminiApiKey",
    modelEnvironmentKey: "AGENT_GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    priority: "emergency",
    capabilities: ["reasoning", "drafting", "structured_output"],
  },
];

type RuntimeEnvironment = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  organisationId: string;
  publicSiteUrl: string | null;
  runtimeWorkerToken: string | null;
  groqApiKey: string | null;
  openAiApiKey: string | null;
  geminiApiKey: string | null;
  hunterApiKey: string | null;
  firecrawlApiKey: string | null;
};

type JsonObject = Record<string, unknown>;

type RuntimeAgent = {
  id: string;
  employee_id: string;
  agent_key: string;
  name: string;
  purpose: string;
  system_instructions: string;
  status: "draft" | "active" | "paused" | "retired";
};

type RuntimeEmployee = {
  id: string;
  employee_key: string;
  name: string;
  title: string;
  status: "draft" | "active" | "paused" | "retired";
};

type RuntimeTask = {
  id: string;
  organisation_id: string;
  mission_id: string | null;
  run_id: string | null;
  agent_id: string | null;
  parent_task_id: string | null;
  depends_on_task_id: string | null;
  approval_id: string | null;
  task_type: string;
  action_key: string;
  status: string;
  priority: number;
  payload: JsonObject;
  result: JsonObject | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  max_attempts: number;
  run_after: string;
  leased_by: string | null;
  lease_token: string | null;
  lease_expires_at: string | null;
  idempotency_key: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type RuntimeApproval = {
  id: string;
  mission_id: string | null;
  run_id: string | null;
  action_type: string;
  action_payload: JsonObject;
  risk_level: string;
  justification: string;
  status: string;
  requested_at: string;
  decided_at: string | null;
};

type RuntimeCircuit = {
  component_type: "provider" | "tool";
  component_key: string;
  state: "closed" | "open" | "half_open";
  failure_count: number;
  open_until: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  updated_at: string;
};

type RuntimeToolAdapter = {
  tool_key: string;
  connection_state: "disabled" | "prepared" | "connected" | "degraded";
  requires_approval: boolean;
};

type RuntimePermission = {
  agent_id: string | null;
  permission_class:
    | "READ"
    | "SEARCH"
    | "ANALYZE"
    | "DRAFT"
    | "WRITE_INTERNAL"
    | "WRITE_EXTERNAL"
    | "SEND"
    | "PUBLISH"
    | "DELETE"
    | "DEPLOY"
    | "FINANCIAL"
    | "PAYMENT"
    | "DNS_CHANGE"
    | "SECURITY_CHANGE"
    | "PRODUCTION_CHANGE";
  decision: "allow" | "require_approval" | "deny";
  risk_level: "low" | "medium" | "high" | "critical";
  rationale: string;
};

type LeadHunterInput = {
  objective: string;
  targetCompany: string;
  targetService: string;
  targetLocation: string;
  resultCount: number;
};

export class AgentRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "AgentRuntimeError";
  }
}

class ProviderExecutionError extends Error {
  constructor(
    public readonly provider: ModelProvider,
    public readonly category: ProviderFailureCategory,
    public readonly retryable: boolean,
    message: string,
    public readonly httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "ProviderExecutionError";
  }
}

function optionalEnvironmentValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function runtimeEnvironment(): RuntimeEnvironment | null {
  const supabaseUrl =
    optionalEnvironmentValue(process.env.SUPABASE_URL) ??
    optionalEnvironmentValue(process.env.VITE_SUPABASE_URL);
  const supabaseServiceRoleKey = optionalEnvironmentValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseServiceRoleKey,
    organisationId:
      optionalEnvironmentValue(process.env.COSSA_ORGANISATION_ID) ?? DEFAULT_COSSA_ORGANISATION_ID,
    publicSiteUrl: optionalEnvironmentValue(process.env.PUBLIC_SITE_URL),
    runtimeWorkerToken: optionalEnvironmentValue(process.env.AGENT_RUNTIME_WORKER_TOKEN),
    groqApiKey: optionalEnvironmentValue(process.env.GROQ_API_KEY),
    openAiApiKey: optionalEnvironmentValue(process.env.OPENAI_API_KEY),
    geminiApiKey: optionalEnvironmentValue(process.env.GEMINI_API_KEY),
    hunterApiKey: optionalEnvironmentValue(process.env.HUNTER_API_KEY),
    firecrawlApiKey: optionalEnvironmentValue(process.env.FIRECRAWL_API_KEY),
  };
}

function requireRuntimeEnvironment(): RuntimeEnvironment {
  const environment = runtimeEnvironment();
  if (!environment) {
    throw new AgentRuntimeError(
      "runtime_not_configured",
      "The agent runtime needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the protected server environment.",
      503,
    );
  }
  return environment;
}

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function agentRuntimeJson(body: unknown, status = 200): Response {
  return jsonResponse(body, status);
}

export function agentRuntimeErrorResponse(error: unknown): Response {
  if (error instanceof AgentRuntimeError) {
    return jsonResponse({ error: error.message, code: error.code }, error.httpStatus);
  }

  console.error("[agent-runtime] unhandled server error", error);
  return jsonResponse(
    {
      error: "The agent runtime could not complete this request. No external action was sent.",
      code: "runtime_error",
    },
    500,
  );
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

async function fixedTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", leftBytes),
    crypto.subtle.digest("SHA-256", rightBytes),
  ]);
  const leftView = new Uint8Array(leftHash);
  const rightView = new Uint8Array(rightHash);
  let difference = leftBytes.byteLength ^ rightBytes.byteLength;
  for (let index = 0; index < leftView.length; index += 1) {
    difference |= leftView[index] ^ rightView[index];
  }
  return difference === 0;
}

export async function requireRuntimeWorker(request: Request): Promise<void> {
  const environment = requireRuntimeEnvironment();
  const supplied = request.headers.get("x-cossa-agent-runtime-token") ?? "";

  if (
    !environment.runtimeWorkerToken ||
    !(await fixedTimeEqual(supplied, environment.runtimeWorkerToken))
  ) {
    throw new AgentRuntimeError("worker_unauthorized", "Unauthorized agent runtime worker.", 401);
  }
}

async function databaseRequest<T>(
  environment: RuntimeEnvironment,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("apikey", environment.supabaseServiceRoleKey);
  // New Supabase API keys are opaque credentials, not JWT bearer tokens.
  if (isNewSupabaseApiKey(environment.supabaseServiceRoleKey)) {
    headers.delete("Authorization");
  } else {
    headers.set("Authorization", `Bearer ${environment.supabaseServiceRoleKey}`);
  }
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await retrySupabaseIssuedAtFuture(
    () =>
      fetch(`${environment.supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers,
      }),
    typeof init.body !== "object" || init.body === null || typeof init.body === "string",
  );

  if (!response.ok) {
    const detail = clip(await response.text().catch(() => ""), 1_200);
    throw new AgentRuntimeError(
      "database_request_failed",
      `The protected agent data operation failed (${response.status})${detail ? `: ${detail}` : "."}`,
      502,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json().catch(() => undefined)) as T;
}

async function databaseRpc<T>(
  environment: RuntimeEnvironment,
  functionName: string,
  body: JsonObject = {},
): Promise<T> {
  return databaseRequest<T>(environment, `rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function protectedUser(
  request: Request,
  environment: RuntimeEnvironment,
): Promise<{ id: string }> {
  const token = bearerToken(request);
  if (!token)
    throw new AgentRuntimeError("unauthorized", "Sign in to use Cossa Orchestrator.", 401);

  const response = await fetch(`${environment.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: environment.supabaseServiceRoleKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok)
    throw new AgentRuntimeError(
      "unauthorized",
      "Your session could not be verified. Sign in again.",
      401,
    );

  const user = asRecord(await response.json());
  const id = readString(user.id);
  if (!id)
    throw new AgentRuntimeError(
      "unauthorized",
      "Your session could not be verified. Sign in again.",
      401,
    );
  return { id };
}

export async function requireRuntimeMember(
  request: Request,
  allowedRoles: readonly RuntimeRole[] = [],
): Promise<RuntimeActor> {
  const environment = requireRuntimeEnvironment();
  const user = await protectedUser(request, environment);
  const query = new URLSearchParams({
    select: "organisation_id,user_id,role,status",
    organisation_id: `eq.${environment.organisationId}`,
    user_id: `eq.${user.id}`,
    status: "eq.active",
    limit: "1",
  });
  const memberships = await databaseRequest<Array<JsonObject>>(
    environment,
    `organisation_members?${query.toString()}`,
  );
  const membership = memberships[0] ?? {};
  const role = readString(membership.role) as RuntimeRole;

  if (!role || !["owner", "admin", "manager", "member", "viewer"].includes(role)) {
    throw new AgentRuntimeError("not_a_member", "Cossa workspace membership is required.", 403);
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    throw new AgentRuntimeError(
      "insufficient_role",
      "A Cossa owner, admin or manager must perform that action.",
      403,
    );
  }

  return { userId: user.id, organisationId: environment.organisationId, role };
}

function validateLeadHunterInput(input: unknown): LeadHunterInput {
  const source = asRecord(input);
  const objective = clip(readString(source.objective), 600);
  const targetCompany = clip(readString(source.targetCompany), 120);
  const targetService = clip(readString(source.targetService), 160);
  const targetLocation = clip(readString(source.targetLocation), 160);
  const requestedCount = Math.floor(readNumber(source.resultCount, 10));

  if (
    objective.length < 12 ||
    targetCompany.length < 2 ||
    targetService.length < 2 ||
    targetLocation.length < 2
  ) {
    throw new AgentRuntimeError(
      "invalid_lead_hunter_request",
      "Provide an objective, Cossa business, service and location before queueing Lead Hunter.",
    );
  }

  if (!LEAD_HUNTER_COMPANIES.includes(targetCompany as (typeof LEAD_HUNTER_COMPANIES)[number])) {
    throw new AgentRuntimeError(
      "invalid_lead_hunter_company",
      "Select a valid Cossa business for Lead Hunter.",
    );
  }

  if (!LEAD_HUNTER_SERVICES.includes(targetService as (typeof LEAD_HUNTER_SERVICES)[number])) {
    throw new AgentRuntimeError(
      "invalid_lead_hunter_service",
      "Select a valid Cossa service for Lead Hunter.",
    );
  }

  return {
    objective,
    targetCompany,
    targetService,
    targetLocation,
    resultCount: Math.max(1, Math.min(MAX_LEAD_HUNTER_RESULTS, requestedCount)),
  };
}

async function logExecutionEvent(
  environment: RuntimeEnvironment,
  values: {
    organisationId: string;
    taskId?: string | null;
    missionId?: string | null;
    runId?: string | null;
    agentId?: string | null;
    eventType: string;
    severity?: "debug" | "info" | "warning" | "error";
    requestId?: string | null;
    message: string;
    metadata?: JsonObject;
  },
): Promise<void> {
  try {
    await databaseRequest(environment, "agent_execution_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        organisation_id: values.organisationId,
        task_id: values.taskId ?? null,
        mission_id: values.missionId ?? null,
        run_id: values.runId ?? null,
        agent_id: values.agentId ?? null,
        event_type: values.eventType,
        severity: values.severity ?? "info",
        request_id: values.requestId ?? null,
        message: clip(values.message, 1_500),
        metadata: values.metadata ?? {},
      }),
    });
  } catch (error) {
    console.error("[agent-runtime] unable to persist execution event", error);
  }
}

function capabilityForComponent(
  componentType: "provider" | "tool",
  componentKey: string,
): string | null {
  if (componentType !== "tool") return null;
  if (componentKey === "cossa-lead-hunter") return "lead-hunter";
  if (componentKey === "cossa-crm") return "growth-crm";
  return null;
}

function capabilityForTask(taskType: string): string | null {
  if (taskType === "orchestrate_lead_hunt" || taskType === "scheduled_lead_hunter_trigger") {
    return "cossa-orchestrator";
  }
  if (taskType === "lead_research") return "lead-hunter";
  if (taskType === "lead_crm_save") return "growth-crm";
  if (taskType === "lead_outreach_draft") return "outreach-drafting";
  return null;
}

async function recordCapabilityOutcome(
  environment: RuntimeEnvironment,
  capabilityKey: string,
  values: {
    status: "operational" | "integration_required" | "degraded";
    error?: Error | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const query = new URLSearchParams({
    organisation_id: `eq.${environment.organisationId}`,
    capability_key: `eq.${capabilityKey}`,
  });
  const payload = values.error
    ? {
        operational_status: values.status,
        last_failure_at: now,
        last_error: clip(values.error.message, 1_000),
      }
    : {
        operational_status: values.status,
        last_success_at: now,
        verified_at: now,
        last_error: null,
      };

  try {
    await databaseRequest(environment, `capability_registry?${query.toString()}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[agent-runtime] unable to record capability outcome", error);
  }
}

async function activeEmployeesAndAgents(environment: RuntimeEnvironment, organisationId: string) {
  const query = new URLSearchParams({
    select: "id,employee_key,name,title,status",
    organisation_id: `eq.${organisationId}`,
    order: "employee_key.asc",
  });
  const agentQuery = new URLSearchParams({
    select: "id,employee_id,agent_key,name,purpose,system_instructions,status",
    organisation_id: `eq.${organisationId}`,
    order: "agent_key.asc",
  });
  const [employees, agents] = await Promise.all([
    databaseRequest<RuntimeEmployee[]>(environment, `ai_employees?${query.toString()}`),
    databaseRequest<RuntimeAgent[]>(environment, `ai_agents?${agentQuery.toString()}`),
  ]);
  return { employees, agents };
}

async function createLeadHunterMission(
  environment: RuntimeEnvironment,
  input: LeadHunterInput,
  createdBy: string | null,
): Promise<{ missionId: string; taskIds: string[] }> {
  await databaseRpc<number>(environment, "install_cossa_agent_runtime_profiles", {
    p_organisation_id: environment.organisationId,
  });
  const { employees, agents } = await activeEmployeesAndAgents(
    environment,
    environment.organisationId,
  );
  const employeeByKey = new Map(employees.map((employee) => [employee.employee_key, employee]));
  const agentByKey = new Map(agents.map((agent) => [agent.agent_key, agent]));
  const requiredEmployees = [
    "cossa-orchestrator",
    "lead-hunter",
    "lead-intake-coordinator",
    "sales-conversion-specialist",
  ];
  const requiredAgents = [
    "cossa-orchestrator-agent",
    "lead-research-agent",
    "lead-enrichment-agent",
    "lead-qualification-agent",
    "crm-safe-save-agent",
    "outreach-draft-agent",
  ];

  const missingEmployee = requiredEmployees.find(
    (key) => employeeByKey.get(key)?.status !== "active",
  );
  const missingAgent = requiredAgents.find((key) => agentByKey.get(key)?.status !== "active");
  if (missingEmployee || missingAgent) {
    throw new AgentRuntimeError(
      "workforce_not_ready",
      `Cossa Workforce still needs its ${missingEmployee ? "employee" : "agent"} profile: ${missingEmployee ?? missingAgent}. Open AI Workforce and select Set up Cossa growth workforce, then refresh this page.`,
      409,
    );
  }

  const missionId = crypto.randomUUID();
  const mission = {
    id: missionId,
    organisation_id: environment.organisationId,
    assigned_employee_id: employeeByKey.get("cossa-orchestrator")!.id,
    title: `Orchestrated Lead Hunter: ${clip(input.objective, 90)}`,
    instruction:
      "Run the server-side Lead Hunter proof in this order: research, public enrichment, evidence-labelled qualification, duplicate-protected CRM save, outreach draft and owner approval request. No external communication may be sent.",
    objective: input.objective,
    target_market: "South Africa",
    target_location: input.targetLocation,
    target_service: input.targetService,
    required_result_count: input.resultCount,
    constraints: [
      "Use only the authorised Cossa Lead Hunter engine and permitted public enrichment.",
      "Save only verified, deduplicated prospects to the existing Growth CRM.",
      "Prepare outreach as a draft only; create an owner approval request but do not send it.",
    ],
    prohibited_actions: [
      "send_external_message",
      "publish_external_content",
      "payment_execute",
      "banking_change",
      "dns_change",
      "production_deploy",
      "delete_production_data",
    ],
    output_schema: {
      stages: ["research", "enrich", "qualify", "save_crm", "draft_outreach", "approval_request"],
      external_sending: false,
    },
    priority: "normal",
    risk_level: "high",
    status: "queued",
    created_by: createdBy,
  };

  await databaseRequest(environment, "missions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(mission),
  });

  const stages = [
    ["cossa-orchestrator-agent", "orchestrate_lead_hunt", "research_public_web"],
    ["lead-research-agent", "lead_research", "research_public_web"],
    ["lead-enrichment-agent", "lead_enrich", "enrich_public_contact"],
    ["lead-qualification-agent", "lead_qualify", "qualify_lead"],
    ["crm-safe-save-agent", "lead_crm_save", "save_verified_crm_lead"],
    ["outreach-draft-agent", "lead_outreach_draft", "draft_outreach"],
  ] as const;

  const taskIds = stages.map(() => crypto.randomUUID());
  const tasks = stages.map(([agentKey, taskType, actionKey], index) => ({
    id: taskIds[index],
    organisation_id: environment.organisationId,
    mission_id: missionId,
    agent_id: agentByKey.get(agentKey)!.id,
    parent_task_id: index === 0 ? null : taskIds[0],
    depends_on_task_id: index === 0 ? null : taskIds[index - 1],
    task_type: taskType,
    action_key: actionKey,
    priority: 80 - index,
    payload: { ...input, workflow: "lead_hunter_proof_v1", stage: index + 1 },
    idempotency_key: `mission:${missionId}:${taskType}`,
  }));

  await databaseRequest(environment, "agent_tasks", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(tasks),
  });

  await logExecutionEvent(environment, {
    organisationId: environment.organisationId,
    missionId,
    agentId: agentByKey.get("cossa-orchestrator-agent")!.id,
    eventType: "mission_queued",
    message: "Cossa Orchestrator queued a Lead Hunter proof mission.",
    metadata: {
      result_count: input.resultCount,
      target_company: input.targetCompany,
      target_service: input.targetService,
    },
  });

  return { missionId, taskIds };
}

export async function queueLeadHunterProof(
  input: unknown,
  actor: RuntimeActor,
): Promise<{ missionId: string; queuedTasks: number }> {
  const environment = requireRuntimeEnvironment();
  if (actor.organisationId !== environment.organisationId) {
    throw new AgentRuntimeError(
      "organisation_mismatch",
      "The requested organisation is not available to this runtime.",
      403,
    );
  }
  const mission = await createLeadHunterMission(
    environment,
    validateLeadHunterInput(input),
    actor.userId,
  );
  return { missionId: mission.missionId, queuedTasks: mission.taskIds.length };
}

function isCircuitOpen(circuit: RuntimeCircuit | undefined): boolean {
  return (
    circuit?.state === "open" &&
    Boolean(circuit.open_until && Date.parse(circuit.open_until) > Date.now())
  );
}

async function getCircuit(
  environment: RuntimeEnvironment,
  componentType: "provider" | "tool",
  componentKey: string,
): Promise<RuntimeCircuit | undefined> {
  const query = new URLSearchParams({
    select:
      "component_type,component_key,state,failure_count,open_until,last_error_code,last_error_message,updated_at",
    organisation_id: `eq.${environment.organisationId}`,
    component_type: `eq.${componentType}`,
    component_key: `eq.${componentKey}`,
    limit: "1",
  });
  const rows = await databaseRequest<RuntimeCircuit[]>(
    environment,
    `agent_circuit_breakers?${query.toString()}`,
  );
  return rows[0];
}

async function recordCircuitResult(
  environment: RuntimeEnvironment,
  componentType: "provider" | "tool",
  componentKey: string,
  error: Error | null,
): Promise<void> {
  const previous = await getCircuit(environment, componentType, componentKey);
  const failureCount = error ? (previous?.failure_count ?? 0) + 1 : 0;
  const providerFailure = error instanceof ProviderExecutionError ? error : null;
  const configurationFailure =
    providerFailure?.category === "authentication_failed" ||
    providerFailure?.category === "permission_denied";
  const open =
    Boolean(error) &&
    (configurationFailure ||
      previous?.state === "half_open" ||
      failureCount >= CIRCUIT_FAILURE_THRESHOLD);
  const now = new Date();
  const openUntil = open
    ? new Date(
        now.getTime() +
          (configurationFailure ? CONFIGURATION_CIRCUIT_OPEN_SECONDS : CIRCUIT_OPEN_SECONDS) *
            1_000,
      ).toISOString()
    : null;

  await databaseRequest(
    environment,
    "agent_circuit_breakers?on_conflict=organisation_id,component_type,component_key",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        organisation_id: environment.organisationId,
        component_type: componentType,
        component_key: componentKey,
        state: open ? "open" : "closed",
        failure_count: failureCount,
        opened_at: open ? now.toISOString() : null,
        open_until: openUntil,
        last_error_code: providerFailure?.category ?? (error ? "provider_or_tool_failure" : null),
        last_error_message: error ? clip(error.message, 1_000) : null,
        updated_at: now.toISOString(),
      }),
    },
  );

  const capabilityKey = capabilityForComponent(componentType, componentKey);
  if (capabilityKey) {
    await recordCapabilityOutcome(environment, capabilityKey, {
      status: error ? "degraded" : "operational",
      error,
    });
  }
}

async function circuitAllowsAttempt(
  environment: RuntimeEnvironment,
  componentType: "provider" | "tool",
  componentKey: string,
): Promise<boolean> {
  const circuit = await getCircuit(environment, componentType, componentKey);
  if (isCircuitOpen(circuit)) return false;

  if (circuit?.state === "open") {
    await databaseRequest(
      environment,
      `agent_circuit_breakers?organisation_id=eq.${encodeURIComponent(environment.organisationId)}&component_type=eq.${encodeURIComponent(componentType)}&component_key=eq.${encodeURIComponent(componentKey)}&state=eq.open`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "half_open", updated_at: new Date().toISOString() }),
      },
    );
  }
  return true;
}

async function requireSafeToolRoute(
  environment: RuntimeEnvironment,
  toolKey: string,
): Promise<void> {
  const query = new URLSearchParams({
    select: "tool_key,connection_state,requires_approval",
    organisation_id: `eq.${environment.organisationId}`,
    tool_key: `eq.${toolKey}`,
    limit: "1",
  });
  const adapter = (
    await databaseRequest<RuntimeToolAdapter[]>(
      environment,
      `agent_tool_adapters?${query.toString()}`,
    )
  )[0];
  if (!adapter) {
    throw new AgentRuntimeError(
      "tool_route_missing",
      `The ${toolKey} tool route has not been installed.`,
      409,
    );
  }
  if (adapter.connection_state === "disabled") {
    throw new AgentRuntimeError(
      "tool_route_disabled",
      `The ${toolKey} tool route is disabled by policy.`,
      403,
    );
  }
  if (adapter.requires_approval) {
    throw new AgentRuntimeError(
      "tool_route_requires_approval",
      `The ${toolKey} tool route requires an explicit approval before execution.`,
      409,
    );
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 25_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function configuredModelProviders(environment: RuntimeEnvironment): ModelProvider[] {
  const configured = (
    optionalEnvironmentValue(process.env.AGENT_MODEL_PROVIDER_ORDER) ?? "groq,openai,gemini"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ModelProvider =>
      MODEL_PROVIDER_DEFINITIONS.some((definition) => definition.key === value),
    );
  return [...new Set(configured)].filter((provider) => {
    const definition = providerDefinition(provider);
    return Boolean(environment[definition.environmentKey]);
  });
}

function providerDefinition(provider: ModelProvider): ProviderDefinition {
  const definition = MODEL_PROVIDER_DEFINITIONS.find((candidate) => candidate.key === provider);
  if (!definition) throw new Error(`Unknown Cossa model provider: ${provider}.`);
  return definition;
}

function providerModel(provider: ModelProvider): string {
  const definition = providerDefinition(provider);
  return (
    optionalEnvironmentValue(process.env[definition.modelEnvironmentKey]) ?? definition.defaultModel
  );
}

function providerErrorDetail(body: JsonObject): string {
  const error = asRecord(body.error);
  return clip(
    readString(error.message) ||
      readString(error.code) ||
      readString(body.message) ||
      "No detail returned.",
    500,
  );
}

function providerFailureFromResponse(
  provider: ModelProvider,
  status: number,
  body: JsonObject,
): ProviderExecutionError {
  const detail = providerErrorDetail(body);
  const lower = detail.toLowerCase();
  const category: ProviderFailureCategory =
    status === 401
      ? "authentication_failed"
      : status === 403
        ? "permission_denied"
        : status === 400 || status === 422
          ? "invalid_request"
          : status === 429 && (lower.includes("quota") || lower.includes("credit"))
            ? "quota_exhausted"
            : status === 429
              ? "rate_limited"
              : status === 404 || (lower.includes("model") && lower.includes("not found"))
                ? "model_unavailable"
                : lower.includes("safety") || lower.includes("policy") || lower.includes("refus")
                  ? "safety_refusal"
                  : status >= 500
                    ? "provider_unavailable"
                    : "invalid_response";
  const retryable = [
    "rate_limited",
    "quota_exhausted",
    "provider_unavailable",
    "model_unavailable",
    "transient_network",
    "timeout",
  ].includes(category);
  return new ProviderExecutionError(
    provider,
    category,
    retryable,
    `${provider} returned ${status}: ${detail}`,
    status,
  );
}

function providerFailureFromException(
  provider: ModelProvider,
  error: unknown,
): ProviderExecutionError {
  if (error instanceof ProviderExecutionError) return error;
  const message = error instanceof Error ? error.message : "Unknown provider network error.";
  const category: ProviderFailureCategory =
    error instanceof DOMException && error.name === "AbortError" ? "timeout" : "transient_network";
  return new ProviderExecutionError(
    provider,
    category,
    true,
    `${provider} could not be reached: ${message}`,
  );
}

async function providerCompletion(
  environment: RuntimeEnvironment,
  provider: "groq" | "openai" | "gemini",
  prompt: string,
): Promise<{ provider: string; model: string; content: string }> {
  if (provider === "groq") {
    const model = providerModel(provider);
    let response: Response;
    try {
      response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${environment.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 1_100,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      throw providerFailureFromException(provider, error);
    }
    const body = asRecord(await response.json().catch(() => ({})));
    const content = readString(asRecord(asRecord(asArray(body.choices)[0]).message).content);
    if (!response.ok) throw providerFailureFromResponse(provider, response.status, body);
    if (!content)
      throw new ProviderExecutionError(
        provider,
        "invalid_response",
        false,
        "Groq returned no usable completion content.",
        response.status,
      );
    return { provider, model, content: clip(content, MAX_MODEL_OUTPUT_CHARS) };
  }

  if (provider === "openai") {
    const model = providerModel(provider);
    let response: Response;
    try {
      response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${environment.openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 1_100,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      throw providerFailureFromException(provider, error);
    }
    const body = asRecord(await response.json().catch(() => ({})));
    const content = readString(asRecord(asRecord(asArray(body.choices)[0]).message).content);
    if (!response.ok) throw providerFailureFromResponse(provider, response.status, body);
    if (!content)
      throw new ProviderExecutionError(
        provider,
        "invalid_response",
        false,
        "OpenAI returned no usable completion content.",
        response.status,
      );
    return { provider, model, content: clip(content, MAX_MODEL_OUTPUT_CHARS) };
  }

  const model = providerModel(provider);
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(environment.geminiApiKey ?? "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1_100 },
        }),
      },
    );
  } catch (error) {
    throw providerFailureFromException(provider, error);
  }
  const body = asRecord(await response.json().catch(() => ({})));
  const candidate = asRecord(asArray(body.candidates)[0]);
  const candidateContent = asRecord(candidate.content);
  const parts = asArray(candidateContent.parts);
  const content = parts
    .map((part) => readString(asRecord(part).text))
    .filter(Boolean)
    .join("\n");
  if (!response.ok) throw providerFailureFromResponse(provider, response.status, body);
  if (!content)
    throw new ProviderExecutionError(
      provider,
      "invalid_response",
      false,
      "Gemini returned no usable completion content.",
      response.status,
    );
  return { provider, model, content: clip(content, MAX_MODEL_OUTPUT_CHARS) };
}

async function modelWithFallback(
  environment: RuntimeEnvironment,
  prompt: string,
): Promise<{ provider: string; model: string; content: string }> {
  const providers = configuredModelProviders(environment);
  if (providers.length === 0) {
    await recordCapabilityOutcome(environment, "provider-router", {
      status: "integration_required",
      error: new Error("No protected model provider is configured."),
    });
    throw new AgentRuntimeError(
      "model_not_configured",
      "No protected model provider is configured. Add at least one of GROQ_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY to the server environment.",
      503,
    );
  }

  const failures: string[] = [];
  for (const provider of providers) {
    if (!(await circuitAllowsAttempt(environment, "provider", provider))) {
      failures.push(`${provider} circuit is temporarily open`);
      continue;
    }

    try {
      const result = await providerCompletion(environment, provider, prompt);
      await recordCircuitResult(environment, "provider", provider, null);
      await recordCapabilityOutcome(environment, "provider-router", { status: "operational" });
      return result;
    } catch (error) {
      const failure = providerFailureFromException(provider, error);
      await recordCircuitResult(environment, "provider", provider, failure);
      failures.push(`${provider} (${failure.category}): ${failure.message}`);
      if (!failure.retryable) {
        await recordCapabilityOutcome(environment, "provider-router", {
          status:
            failure.category === "authentication_failed" || failure.category === "permission_denied"
              ? "integration_required"
              : "degraded",
          error: failure,
        });
        throw new AgentRuntimeError(
          failure.category === "authentication_failed" || failure.category === "permission_denied"
            ? "provider_configuration_required"
            : "provider_request_not_retryable",
          `${provider} could not safely process this task (${failure.category}). The router did not send the same request to another provider.`,
          failure.category === "authentication_failed" || failure.category === "permission_denied"
            ? 503
            : 422,
        );
      }
    }
  }

  await recordCapabilityOutcome(environment, "provider-router", {
    status: "degraded",
    error: new Error(
      `No configured model provider could complete the task. ${failures.join(" | ")}`,
    ),
  });
  throw new AgentRuntimeError(
    "all_model_providers_failed",
    `No configured model provider could complete the task. ${clip(failures.join(" | "), 700)}`,
    502,
  );
}

async function existingLeadHunterSearch(
  environment: RuntimeEnvironment,
  input: LeadHunterInput,
): Promise<JsonObject> {
  await requireSafeToolRoute(environment, "cossa-lead-hunter");
  if (!environment.publicSiteUrl || !environment.runtimeWorkerToken) {
    throw new AgentRuntimeError(
      "lead_hunter_worker_not_configured",
      "Lead Hunter background execution needs PUBLIC_SITE_URL and AGENT_RUNTIME_WORKER_TOKEN in protected server settings.",
      503,
    );
  }

  if (!(await circuitAllowsAttempt(environment, "tool", "cossa-lead-hunter"))) {
    throw new AgentRuntimeError(
      "lead_hunter_circuit_open",
      "The Lead Hunter search circuit is temporarily paused after repeated failures.",
      503,
    );
  }

  const request = {
    companies: [input.targetCompany],
    services: [input.targetService],
    locations: [input.targetLocation],
    result_count: input.resultCount,
    minimum_score: 60,
    minimum_evidence_sources: 2,
    include_private_sector: true,
    include_government_sector: false,
    include_nonprofits: false,
    include_small_projects: true,
    include_large_projects: true,
    require_public_phone_or_email: true,
    require_opportunity_signal: true,
    verified_sources_only: true,
    exclude_existing_crm_leads: true,
    search_instruction: input.objective,
    objectives: ["find_customers"],
    search_depth: "standard",
    revenue_mode: "quick_revenue",
    revenue_first: true,
    easy_wins_only: false,
    exclude_competitors: true,
    exclude_directories: true,
    exclude_expired_procurement: true,
    use_cached_results: true,
    notes:
      "Cossa Orchestrator hosted worker. Research and internal drafting only; no contact or sending.",
  };

  try {
    const response = await fetchWithTimeout(
      `${environment.publicSiteUrl.replace(/\/+$/, "")}/api/lead-hunter/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cossa-agent-runtime-token": environment.runtimeWorkerToken,
        },
        body: JSON.stringify(request),
      },
      90_000,
    );
    const rawBody = await response.text().catch(() => "");
    let body: JsonObject = {};
    if (rawBody) {
      try {
        body = asRecord(JSON.parse(rawBody));
      } catch {
        body = { error: rawBody };
      }
    }
    if (!response.ok) {
      const safeReason = clip(
        readString(body.error, rawBody || `Lead Hunter search failed (${response.status}).`),
        700,
      );
      throw new AgentRuntimeError(
        response.status === 400 ? "invalid_lead_hunter_request" : "lead_hunter_search_failed",
        safeReason,
        response.status,
      );
    }
    await recordCircuitResult(environment, "tool", "cossa-lead-hunter", null);
    return body;
  } catch (error) {
    const failure = error instanceof Error ? error : new Error("Lead Hunter search failed.");
    await recordCircuitResult(environment, "tool", "cossa-lead-hunter", failure);
    throw failure;
  }
}

function prospectSummary(prospect: JsonObject): JsonObject {
  return {
    id: readString(prospect.id),
    organisation_name: readString(prospect.organisation_name),
    website: readString(prospect.website),
    public_email: readString(prospect.public_email),
    public_phone: readString(prospect.public_phone),
    contact_page_url: readString(prospect.contact_page_url),
    city: readString(prospect.city),
    province: readString(prospect.province),
    recommended_service: readString(prospect.recommended_service),
    recommended_company: readString(prospect.recommended_company),
    classification: readString(prospect.classification),
    verification_status: readString(prospect.verification_status),
    total_score: readNumber(prospect.total_score),
    opportunity_summary: clip(readString(prospect.opportunity_summary), 800),
    primary_source_url: readString(prospect.primary_source_url),
  };
}

async function enrichProspects(
  environment: RuntimeEnvironment,
  prospects: JsonObject[],
): Promise<JsonObject[]> {
  const canUseHunter =
    Boolean(environment.hunterApiKey) &&
    (await circuitAllowsAttempt(environment, "tool", "hunter"));
  if (canUseHunter) await requireSafeToolRoute(environment, "hunter");
  const enriched: JsonObject[] = [];

  for (const prospect of prospects.slice(0, MAX_LEAD_HUNTER_RESULTS)) {
    const publicEmail = readString(prospect.public_email);
    const website = readString(prospect.website);
    const record: JsonObject = {
      ...prospectSummary(prospect),
      enrichment_source: publicEmail ? "lead_hunter_public_evidence" : "not_available",
    };

    if (!canUseHunter || publicEmail || !website) {
      enriched.push(record);
      continue;
    }

    try {
      const domain = new URL(website).hostname.replace(/^www\./, "");
      const endpoint = new URL("https://api.hunter.io/v2/domain-search");
      endpoint.searchParams.set("domain", domain);
      endpoint.searchParams.set("api_key", environment.hunterApiKey ?? "");
      const response = await fetchWithTimeout(endpoint.toString(), { method: "GET" });
      const body = asRecord(await response.json().catch(() => ({})));
      if (!response.ok) throw new Error(`Hunter enrichment failed (${response.status}).`);
      const data = asRecord(body.data);
      const email = asRecord(asArray(data.emails)[0]);
      const value = readString(email.value);
      enriched.push({
        ...record,
        public_email: value || null,
        contact_name: readString(email.first_name) || null,
        enrichment_source: value ? "hunter_domain_search" : "hunter_no_email_returned",
      });
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("Hunter enrichment failed.");
      await recordCircuitResult(environment, "tool", "hunter", failure);
      enriched.push({
        ...record,
        enrichment_source: "public_evidence_only",
        enrichment_warning: clip(failure.message, 250),
      });
    }
  }

  if (canUseHunter) await recordCircuitResult(environment, "tool", "hunter", null);
  return enriched;
}

function normalisedIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function saveVerifiedProspects(
  environment: RuntimeEnvironment,
  prospects: JsonObject[],
): Promise<{ createdLeadIds: string[]; duplicateLeadIds: string[]; rejectedCount: number }> {
  await requireSafeToolRoute(environment, "cossa-crm");
  const query = new URLSearchParams({
    select: "id,name,full_name,company,email,phone,source,cossa_source_identity",
    organisation_id: `eq.${environment.organisationId}`,
    order: "created_at.desc",
    limit: "500",
  });
  const existing = await databaseRequest<JsonObject[]>(environment, `leads?${query.toString()}`);
  const createdLeadIds: string[] = [];
  const duplicateLeadIds: string[] = [];
  let rejectedCount = 0;

  for (const prospect of prospects) {
    const verificationStatus = readString(prospect.verification_status);
    const organisationName = readString(prospect.organisation_name);
    const sourceUrl = readString(prospect.primary_source_url);
    if (verificationStatus === "rejected" || !organisationName || !sourceUrl) {
      rejectedCount += 1;
      continue;
    }

    const email = readString(prospect.public_email);
    const phone = readString(prospect.public_phone);
    const companyIdentity = normalisedIdentity(organisationName);
    const sourceIdentity = `lead-hunter:${readString(prospect.id) || sourceUrl}`;
    const duplicate = existing.find((lead) => {
      const sameEmail =
        email && normalisedIdentity(readString(lead.email)) === normalisedIdentity(email);
      const samePhone =
        phone && normalisedIdentity(readString(lead.phone)) === normalisedIdentity(phone);
      const sameCompany =
        companyIdentity && normalisedIdentity(readString(lead.company)) === companyIdentity;
      const sameSource = readString(lead.cossa_source_identity) === sourceIdentity;
      return Boolean(sameEmail || samePhone || sameCompany || sameSource);
    });
    if (duplicate) {
      duplicateLeadIds.push(readString(duplicate.id));
      continue;
    }

    const evidence = [
      "Cossa Orchestrator Lead Hunter proof",
      `Organisation: ${organisationName}`,
      `Classification: ${readString(prospect.classification, "research_prospect")}`,
      `Verification: ${verificationStatus || "unverified"}`,
      `Score: ${Math.max(0, Math.min(100, Math.floor(readNumber(prospect.total_score))))}/100`,
      `Service: ${readString(prospect.recommended_service)}`,
      `Source: ${sourceUrl}`,
      `Opportunity: ${clip(readString(prospect.opportunity_summary), 1_000)}`,
      "No contact was made by Cossa Orchestrator.",
    ].join("\n");
    const contactName = readString(prospect.contact_name) || organisationName;
    const response = await databaseRequest<JsonObject[]>(
      environment,
      "leads?on_conflict=organisation_id,cossa_source_identity&select=id",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({
          organisation_id: environment.organisationId,
          full_name: contactName,
          name: contactName,
          company: organisationName,
          email: email || null,
          phone: phone || null,
          service: readString(prospect.recommended_service) || null,
          location:
            [readString(prospect.city), readString(prospect.province), "South Africa"]
              .filter(Boolean)
              .join(", ") || null,
          source: "cossa_orchestrator_lead_hunter",
          cossa_source_identity: sourceIdentity,
          status: "Qualified",
          stage: "Qualified",
          score: Math.max(0, Math.min(100, Math.floor(readNumber(prospect.total_score)))),
          value: 0,
          estimated_value: 0,
          notes: evidence,
          next_follow_up: new Date().toISOString().slice(0, 10),
        }),
      },
    );
    const id = readString(response[0]?.id);
    if (id) {
      createdLeadIds.push(id);
      existing.push({
        id,
        company: organisationName,
        email,
        phone,
        cossa_source_identity: sourceIdentity,
      });
      continue;
    }

    const existingBySource = await databaseRequest<JsonObject[]>(
      environment,
      `leads?${new URLSearchParams({
        select: "id",
        organisation_id: `eq.${environment.organisationId}`,
        cossa_source_identity: `eq.${sourceIdentity}`,
        limit: "1",
      }).toString()}`,
    );
    const existingId = readString(existingBySource[0]?.id);
    if (existingId) duplicateLeadIds.push(existingId);
  }

  return { createdLeadIds, duplicateLeadIds: duplicateLeadIds.filter(Boolean), rejectedCount };
}

async function createMissionRun(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  agent: RuntimeAgent,
  provider: string,
  model: string,
): Promise<string | null> {
  if (!task.mission_id) return null;
  const runId = crypto.randomUUID();
  await databaseRequest(environment, "mission_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: runId,
      organisation_id: task.organisation_id,
      mission_id: task.mission_id,
      employee_id: agent.employee_id,
      status: "running",
      model_provider: provider,
      model_name: model,
      input: {
        kind: "durable_agent_task",
        task_id: task.id,
        task_type: task.task_type,
        agent_key: agent.agent_key,
        external_actions_enabled: false,
      },
      started_at: new Date().toISOString(),
    }),
  });

  await databaseRequest(
    environment,
    `agent_tasks?id=eq.${encodeURIComponent(task.id)}&lease_token=eq.${encodeURIComponent(task.lease_token ?? "")}&status=eq.running`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ run_id: runId }),
    },
  );
  return runId;
}

async function completeMissionRun(
  environment: RuntimeEnvironment,
  runId: string | null,
  output: JsonObject,
): Promise<void> {
  if (!runId) return;
  await databaseRequest(
    environment,
    `mission_runs?id=eq.${encodeURIComponent(runId)}&status=eq.running`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "completed", output, completed_at: new Date().toISOString() }),
    },
  );
}

async function failMissionRun(
  environment: RuntimeEnvironment,
  runId: string | null,
  error: Error,
): Promise<void> {
  if (!runId) return;
  await databaseRequest(
    environment,
    `mission_runs?id=eq.${encodeURIComponent(runId)}&status=eq.running`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "failed",
        error_code: error instanceof AgentRuntimeError ? error.code : "agent_task_failed",
        error_message: clip(error.message, 1_000),
        completed_at: new Date().toISOString(),
      }),
    },
  );
}

async function completedTaskResult(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  taskType: string,
): Promise<JsonObject> {
  if (!task.mission_id) return {};
  const query = new URLSearchParams({
    select: "result",
    organisation_id: `eq.${task.organisation_id}`,
    mission_id: `eq.${task.mission_id}`,
    task_type: `eq.${taskType}`,
    status: "eq.completed",
    limit: "1",
  });
  const rows = await databaseRequest<JsonObject[]>(environment, `agent_tasks?${query.toString()}`);
  return asRecord(rows[0]?.result);
}

function permissionClassForAction(actionKey: string): RuntimePermission["permission_class"] {
  const classes: Record<string, RuntimePermission["permission_class"]> = {
    trigger_lead_hunter: "SEARCH",
    research_public_web: "SEARCH",
    enrich_public_contact: "SEARCH",
    qualify_lead: "ANALYZE",
    save_verified_crm_lead: "WRITE_INTERNAL",
    draft_outreach: "DRAFT",
    send_external_message: "SEND",
    publish_external_content: "PUBLISH",
    production_deploy: "DEPLOY",
    dns_change: "DNS_CHANGE",
    payment_execute: "PAYMENT",
    banking_change: "FINANCIAL",
    delete_production_data: "DELETE",
  };
  const permissionClass = classes[actionKey];
  if (!permissionClass)
    throw new AgentRuntimeError(
      "permission_class_missing",
      `No permission class is defined for ${actionKey}. The action is denied until explicitly classified.`,
      403,
    );
  return permissionClass;
}

async function assertTaskPermission(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  agent: RuntimeAgent,
): Promise<void> {
  const query = new URLSearchParams({
    select: "agent_id,permission_class,decision,risk_level,rationale",
    organisation_id: `eq.${task.organisation_id}`,
    action_key: `eq.${task.action_key}`,
    enabled: "eq.true",
    or: `(agent_id.eq.${agent.id},agent_id.is.null)`,
  });
  const policies = await databaseRequest<RuntimePermission[]>(
    environment,
    `agent_permission_policies?${query.toString()}`,
  );
  const policy =
    policies.find((candidate) => candidate.agent_id === agent.id) ??
    policies.find((candidate) => !candidate.agent_id);
  const requiredPermissionClass = permissionClassForAction(task.action_key);

  // New capabilities remain denied until an explicit agent or organisation policy allows them.
  if (!policy) {
    throw new AgentRuntimeError(
      "agent_permission_missing",
      `No enabled permission policy allows ${task.action_key} for ${agent.name}.`,
      403,
    );
  }
  if (policy.permission_class !== requiredPermissionClass) {
    throw new AgentRuntimeError(
      "permission_class_mismatch",
      `${task.action_key} requires ${requiredPermissionClass}, but its policy is classified as ${policy.permission_class}.`,
      403,
    );
  }
  if (policy.decision === "deny") {
    throw new AgentRuntimeError(
      "agent_action_denied",
      `The policy blocks ${task.action_key}: ${policy.rationale}`,
      403,
    );
  }
  if (policy.decision === "require_approval") {
    throw new AgentRuntimeError(
      "agent_approval_required",
      `${task.action_key} requires a separately recorded human approval before any execution.`,
      409,
    );
  }
}

function taskInput(task: RuntimeTask): LeadHunterInput {
  const payload = asRecord(task.payload);
  // Scheduled trigger tasks deliberately wrap mission fields in configuration.
  return validateLeadHunterInput(
    task.task_type === "scheduled_lead_hunter_trigger" ? asRecord(payload.configuration) : payload,
  );
}

async function executeAgentTask(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  agent: RuntimeAgent,
): Promise<{ result: JsonObject; provider: string; model: string }> {
  const input = taskInput(task);

  if (task.task_type === "orchestrate_lead_hunt") {
    return {
      provider: "cossa_orchestrator",
      model: "policy-engine-v1",
      result: {
        summary:
          "Cossa Orchestrator approved the safe Lead Hunter workflow: research → enrich → qualify → duplicate-protected CRM save → outreach draft → owner approval request.",
        external_actions_enabled: false,
      },
    };
  }

  if (task.task_type === "lead_research") {
    const hunt = await existingLeadHunterSearch(environment, input);
    const prospects = asArray(hunt.prospects).map(asRecord).map(prospectSummary);
    return {
      provider: "cossa_lead_hunter",
      model: "evidence-engine-v1",
      result: {
        hunt_id: readString(hunt.hunt_id),
        searched_at: readString(hunt.searched_at),
        providers_used: asArray(hunt.providers_used)
          .map((value) => readString(value))
          .filter(Boolean),
        workflow_outcome: readString(hunt.status),
        provider_diagnostics: asArray(hunt.provider_diagnostics).map(asRecord),
        source_count: readNumber(hunt.source_count),
        accepted_count: readNumber(hunt.accepted_count),
        rejected_count: readNumber(hunt.rejected_count),
        warnings: asArray(hunt.warnings)
          .map((value) => clip(readString(value), 300))
          .filter(Boolean)
          .slice(0, 12),
        prospects,
        external_actions_enabled: false,
      },
    };
  }

  if (task.task_type === "lead_enrich") {
    const research = await completedTaskResult(environment, task, "lead_research");
    const prospects = asArray(research.prospects).map(asRecord);
    return {
      provider: environment.hunterApiKey ? "hunter_and_public_evidence" : "public_evidence",
      model: environment.hunterApiKey ? "hunter-domain-search-v2" : "lead-hunter-public-evidence",
      result: {
        research_hunt_id: readString(research.hunt_id),
        prospects: await enrichProspects(environment, prospects),
        external_actions_enabled: false,
      },
    };
  }

  if (task.task_type === "lead_qualify") {
    const enrichment = await completedTaskResult(environment, task, "lead_enrich");
    const prospects = asArray(enrichment.prospects).map(asRecord).slice(0, MAX_LEAD_HUNTER_RESULTS);
    const model = await modelWithFallback(
      environment,
      [
        "You are Cossa's Lead Qualification Agent.",
        "Produce an internal qualification brief using only the supplied evidence.",
        "Do not invent buyer intent, budgets, contacts, consent, tender status, conversations or outcomes.",
        "Every lead remains a research prospect until a human-approved outreach process produces real engagement.",
        `Mission: ${input.objective}`,
        `Target: ${input.targetCompany} / ${input.targetService} / ${input.targetLocation}`,
        "Prospects:",
        clip(JSON.stringify(prospects), 18_000),
      ].join("\n\n"),
    );
    return {
      provider: model.provider,
      model: model.model,
      result: {
        qualification_brief: model.content,
        prospect_count: prospects.length,
        external_actions_enabled: false,
      },
    };
  }

  if (task.task_type === "lead_crm_save") {
    const research = await completedTaskResult(environment, task, "lead_research");
    const prospects = asArray(research.prospects).map(asRecord);
    if (!(await circuitAllowsAttempt(environment, "tool", "cossa-crm"))) {
      throw new AgentRuntimeError(
        "crm_circuit_open",
        "The Cossa CRM save circuit is temporarily paused after repeated failures.",
        503,
      );
    }
    let saved: Awaited<ReturnType<typeof saveVerifiedProspects>>;
    try {
      saved = await saveVerifiedProspects(environment, prospects);
      await recordCircuitResult(environment, "tool", "cossa-crm", null);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("Cossa CRM save failed.");
      await recordCircuitResult(environment, "tool", "cossa-crm", failure);
      throw failure;
    }
    return {
      provider: "cossa_crm",
      model: "duplicate-protection-v1",
      result: { ...saved, prospect_count: prospects.length, external_actions_enabled: false },
    };
  }

  if (task.task_type === "lead_outreach_draft") {
    const enrichment = await completedTaskResult(environment, task, "lead_enrich");
    const qualification = await completedTaskResult(environment, task, "lead_qualify");
    const saved = await completedTaskResult(environment, task, "lead_crm_save");
    const prospects = asArray(enrichment.prospects).map(asRecord).slice(0, 10);
    const model = await modelWithFallback(
      environment,
      [
        "You are Cossa's Outreach Drafting Agent.",
        "Write concise, personalised, reviewable outreach drafts only for the supplied evidence-backed prospects.",
        "Do not say a message has been sent. Do not promise price, timelines, results, availability or legal terms.",
        "Use this exact structure for each draft: Prospect; Evidence used; Subject; Draft message; Human review notes.",
        `Mission: ${input.objective}`,
        `Qualification brief: ${clip(readString(qualification.qualification_brief), 6_000)}`,
        `CRM lead IDs already created or retained: ${
          asArray(saved.createdLeadIds)
            .concat(asArray(saved.duplicateLeadIds))
            .map((id) => readString(id))
            .filter(Boolean)
            .join(", ") || "None"
        }`,
        `Prospects: ${clip(JSON.stringify(prospects), 18_000)}`,
      ].join("\n\n"),
    );

    const runId = task.run_id;
    if (!task.mission_id || !runId)
      throw new AgentRuntimeError(
        "missing_mission_run",
        "The outreach draft is missing its mission run.",
        409,
      );
    const approvalRows = await databaseRequest<RuntimeApproval[]>(
      environment,
      "approvals?select=id,mission_id,run_id,action_type,action_payload,risk_level,justification,status,requested_at,decided_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          organisation_id: task.organisation_id,
          mission_id: task.mission_id,
          run_id: runId,
          requested_by_employee_id: agent.employee_id,
          action_type: "review_outreach_drafts",
          action_payload: {
            draft: model.content,
            external_send_permitted: false,
            lead_ids: [...asArray(saved.createdLeadIds), ...asArray(saved.duplicateLeadIds)]
              .map((value) => readString(value))
              .filter(Boolean),
          },
          risk_level: "high",
          justification:
            "Review the outreach drafts. Approval records acceptance of the internal draft only; it does not send an email, WhatsApp, message, tender, quote or proposal.",
        }),
      },
    );
    const approvalId = readString(approvalRows[0]?.id);
    if (!approvalId)
      throw new AgentRuntimeError(
        "approval_not_created",
        "The outreach draft was prepared but its owner review request could not be recorded.",
        502,
      );
    await databaseRequest(
      environment,
      `missions?id=eq.${encodeURIComponent(task.mission_id)}&organisation_id=eq.${encodeURIComponent(task.organisation_id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "awaiting_approval", updated_at: new Date().toISOString() }),
      },
    );
    return {
      provider: model.provider,
      model: model.model,
      result: { draft: model.content, approval_id: approvalId, external_actions_enabled: false },
    };
  }

  if (task.task_type === "scheduled_lead_hunter_trigger") {
    const configuration = asRecord(asRecord(task.payload).configuration);
    const mission = await createLeadHunterMission(
      environment,
      validateLeadHunterInput(configuration),
      null,
    );
    return {
      provider: "cossa_orchestrator",
      model: "schedule-trigger-v1",
      result: {
        scheduled_mission_id: mission.missionId,
        queued_tasks: mission.taskIds.length,
        external_actions_enabled: false,
      },
    };
  }

  throw new AgentRuntimeError(
    "unsupported_task_type",
    `Unsupported agent task type: ${task.task_type}.`,
    409,
  );
}

function retryDelaySeconds(attempt: number): number {
  return Math.min(15 * 60, 30 * 2 ** Math.max(0, attempt - 1));
}

function taskFailureIsRetryable(error: Error): boolean {
  if (error instanceof AgentRuntimeError) {
    return canScheduleAgentRetry({
      errorCode: error.code,
      attemptCount: 0,
      maxAttempts: 1,
    });
  }
  return true;
}

async function finishTask(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  result: JsonObject,
): Promise<void> {
  const query = new URLSearchParams({
    id: `eq.${task.id}`,
    lease_token: `eq.${task.lease_token ?? ""}`,
    status: "eq.running",
  });
  const rows = await databaseRequest<JsonObject[]>(environment, `agent_tasks?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "completed",
      result,
      lease_token: null,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }),
  });
  if (rows.length !== 1)
    throw new AgentRuntimeError(
      "task_lease_lost",
      "The hosted worker lost the task lease before completion.",
      409,
    );
}

async function failTask(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
  error: Error,
): Promise<"retry_scheduled" | "failed"> {
  const retry = canScheduleAgentRetry({
    errorCode: error instanceof AgentRuntimeError ? error.code : null,
    attemptCount: task.attempt_count,
    maxAttempts: task.max_attempts,
  });
  const query = new URLSearchParams({
    id: `eq.${task.id}`,
    lease_token: `eq.${task.lease_token ?? ""}`,
    status: "eq.running",
  });
  const status = retry ? "retry_scheduled" : "failed";
  const rows = await databaseRequest<JsonObject[]>(environment, `agent_tasks?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status,
      error_code: error instanceof AgentRuntimeError ? error.code : "agent_task_failed",
      error_message: clip(error.message, 1_000),
      lease_token: null,
      lease_expires_at: null,
      run_after: retry
        ? new Date(Date.now() + retryDelaySeconds(task.attempt_count) * 1_000).toISOString()
        : new Date().toISOString(),
      completed_at: retry ? null : new Date().toISOString(),
    }),
  });
  if (rows.length !== 1)
    throw new AgentRuntimeError(
      "task_lease_lost",
      "The hosted worker lost the task lease before the failure could be recorded.",
      409,
    );
  return status;
}

async function processOneTask(
  environment: RuntimeEnvironment,
  task: RuntimeTask,
): Promise<"completed" | "retried" | "failed"> {
  const { agents } = await activeEmployeesAndAgents(environment, task.organisation_id);
  const agent = agents.find((candidate) => candidate.id === task.agent_id);
  if (!agent || agent.status !== "active") {
    await failTask(
      environment,
      task,
      new AgentRuntimeError("agent_unavailable", "The task agent is not active.", 409),
    );
    return "failed";
  }

  let runId: string | null = null;
  try {
    await assertTaskPermission(environment, task, agent);
    const initialProvider =
      task.task_type.includes("lead_") &&
      !task.task_type.includes("qualify") &&
      !task.task_type.includes("outreach")
        ? "cossa_tool"
        : "model_router";
    runId = await createMissionRun(environment, task, agent, initialProvider, task.task_type);
    const result = await executeAgentTask(environment, { ...task, run_id: runId }, agent);
    await completeMissionRun(environment, runId, {
      kind: "agent_task_output",
      task_type: task.task_type,
      agent_key: agent.agent_key,
      execution_provider: result.provider,
      execution_name: result.model,
      external_actions_enabled: false,
      content:
        readString(result.result.draft) ||
        readString(result.result.qualification_brief) ||
        readString(result.result.summary) ||
        "Structured tool result recorded.",
      result: result.result,
    });
    await finishTask(environment, task, {
      ...result.result,
      execution_provider: result.provider,
      execution_name: result.model,
    });
    await logExecutionEvent(environment, {
      organisationId: task.organisation_id,
      taskId: task.id,
      missionId: task.mission_id,
      runId,
      agentId: agent.id,
      eventType: "task_completed",
      message: `${agent.name} completed ${task.task_type}.`,
      metadata: { provider: result.provider, model: result.model, external_actions_enabled: false },
    });
    const capabilityKey = capabilityForTask(task.task_type);
    if (capabilityKey) {
      await recordCapabilityOutcome(environment, capabilityKey, { status: "operational" });
    }
    return "completed";
  } catch (unknownError) {
    const error =
      unknownError instanceof Error ? unknownError : new Error("Unknown agent task failure.");
    await failMissionRun(environment, runId, error).catch((failure) =>
      console.error("[agent-runtime] unable to fail run", failure),
    );
    const status = await failTask(environment, task, error);
    const capabilityKey = capabilityForTask(task.task_type);
    if (
      capabilityKey &&
      !(error instanceof AgentRuntimeError && error.code.startsWith("invalid_lead_hunter_"))
    ) {
      await recordCapabilityOutcome(environment, capabilityKey, { status: "degraded", error });
    }
    if (status === "failed" && task.mission_id) {
      await databaseRequest(
        environment,
        `missions?id=eq.${encodeURIComponent(task.mission_id)}&organisation_id=eq.${encodeURIComponent(task.organisation_id)}&status=in.(queued,running)`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "failed", updated_at: new Date().toISOString() }),
        },
      );
    }
    await logExecutionEvent(environment, {
      organisationId: task.organisation_id,
      taskId: task.id,
      missionId: task.mission_id,
      runId,
      agentId: agent.id,
      eventType: status === "retry_scheduled" ? "task_retry_scheduled" : "task_failed",
      severity: "error",
      message: `${agent.name} could not complete ${task.task_type}: ${clip(error.message, 500)}`,
      metadata: { attempt: task.attempt_count, max_attempts: task.max_attempts },
    });
    return status === "retry_scheduled" ? "retried" : "failed";
  }
}

export async function runAgentRuntimeTick(): Promise<{
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
  approvalsReactivated: number;
  scheduledTriggersQueued: number;
}> {
  const environment = requireRuntimeEnvironment();
  const [approvalsReactivated, scheduled] = await Promise.all([
    databaseRpc<number>(environment, "reactivate_approved_agent_tasks", {
      p_organisation_id: environment.organisationId,
    }),
    databaseRpc<RuntimeTask[]>(environment, "enqueue_due_agent_triggers", {
      p_organisation_id: environment.organisationId,
      p_limit: 10,
    }),
  ]);
  const tasks = await databaseRpc<RuntimeTask[]>(environment, "claim_agent_tasks", {
    p_organisation_id: environment.organisationId,
    p_worker_id: crypto.randomUUID(),
    p_limit: MAX_TASKS_PER_TICK,
    p_lease_seconds: TASK_LEASE_SECONDS,
  });

  let completed = 0;
  let retried = 0;
  let failed = 0;
  for (const task of tasks) {
    const outcome = await processOneTask(environment, task);
    if (outcome === "completed") completed += 1;
    if (outcome === "retried") retried += 1;
    if (outcome === "failed") failed += 1;
  }

  // Only the shared-secret hosted worker can reach this path. Persisting its
  // completed tick gives the dashboard a real, recent deployment health signal.
  await logExecutionEvent(environment, {
    organisationId: environment.organisationId,
    eventType: "runtime_worker_heartbeat",
    message: "Authenticated hosted worker completed an agent-runtime tick.",
    metadata: {
      claimed: tasks.length,
      completed,
      retried,
      failed,
      scheduled_triggers_queued: scheduled.length,
      external_sending_enabled: false,
    },
  });
  await recordCapabilityOutcome(environment, "cossa-orchestrator", { status: "operational" });

  console.info(
    JSON.stringify({
      event: "agent_runtime_tick",
      claimed: tasks.length,
      completed,
      retried,
      failed,
    }),
  );
  return {
    claimed: tasks.length,
    completed,
    retried,
    failed,
    approvalsReactivated,
    scheduledTriggersQueued: scheduled.length,
  };
}

export async function orchestrationDashboard(actor: RuntimeActor): Promise<JsonObject> {
  const environment = requireRuntimeEnvironment();
  const organisationId = actor.organisationId;
  const [agents, adapters, tasks, approvals, circuits, triggers, missions, heartbeats] =
    await Promise.all([
      databaseRequest<JsonObject[]>(
        environment,
        `ai_agents?${new URLSearchParams({ select: "id,agent_key,name,purpose,status,employee_id", organisation_id: `eq.${organisationId}`, order: "agent_key.asc" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `agent_tool_adapters?${new URLSearchParams({ select: "id,tool_key,name,provider,capability,connection_state,risk_level,requires_approval,last_checked_at", organisation_id: `eq.${organisationId}`, order: "name.asc" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `agent_tasks?${new URLSearchParams({ select: "id,mission_id,task_type,action_key,status,priority,attempt_count,max_attempts,error_code,error_message,created_at,started_at,completed_at,result", organisation_id: `eq.${organisationId}`, order: "created_at.desc", limit: "30" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `approvals?${new URLSearchParams({ select: "id,mission_id,run_id,action_type,risk_level,justification,status,requested_at,decided_at,action_payload", organisation_id: `eq.${organisationId}`, order: "requested_at.desc", limit: "20" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `agent_circuit_breakers?${new URLSearchParams({ select: "component_type,component_key,state,failure_count,open_until,last_error_code,last_error_message,updated_at", organisation_id: `eq.${organisationId}`, order: "updated_at.desc" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `agent_triggers?${new URLSearchParams({ select: "id,name,trigger_type,status,interval_minutes,next_run_at,last_fired_at,configuration", organisation_id: `eq.${organisationId}`, order: "name.asc" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `missions?${new URLSearchParams({ select: "id,title,status,objective,target_service,target_location,created_at,updated_at", organisation_id: `eq.${organisationId}`, title: "ilike.Orchestrated Lead Hunter:*", order: "created_at.desc", limit: "12" })}`,
      ),
      databaseRequest<JsonObject[]>(
        environment,
        `agent_execution_events?${new URLSearchParams({ select: "created_at", organisation_id: `eq.${organisationId}`, event_type: "eq.runtime_worker_heartbeat", order: "created_at.desc", limit: "1" })}`,
      ),
    ]);

  const latestWorkerHeartbeat = readString(heartbeats[0]?.created_at);
  const workerDeploymentVerified =
    Boolean(latestWorkerHeartbeat) && Date.now() - Date.parse(latestWorkerHeartbeat) < 5 * 60_000;

  const circuitByComponent = new Map(
    circuits.map((circuit) => [
      `${readString(circuit.component_type)}:${readString(circuit.component_key)}`,
      circuit,
    ]),
  );
  const providers = MODEL_PROVIDER_DEFINITIONS.map((definition) => {
    const circuit = circuitByComponent.get(`provider:${definition.key}`) ?? {};
    const failureCategory = readString(circuit.last_error_code);
    const circuitOpen =
      readString(circuit.state) === "open" &&
      Date.parse(readString(circuit.open_until)) > Date.now();
    const status = !environment[definition.environmentKey]
      ? "configuration_required"
      : circuitOpen && ["rate_limited", "quota_exhausted"].includes(failureCategory)
        ? "rate_limited"
        : circuitOpen
          ? "provider_unavailable"
          : "ready";
    return {
      provider: definition.key,
      model: providerModel(definition.key),
      priority: definition.priority,
      capabilities: definition.capabilities,
      configured: Boolean(environment[definition.environmentKey]),
      status,
      last_error_category: failureCategory || null,
      circuit_state: readString(circuit.state, "closed"),
      circuit_open_until: readString(circuit.open_until) || null,
    };
  });
  const enrichedAdapters = adapters.map((adapter) => ({
    ...adapter,
    runtime_connection_state: (() => {
      const toolKey = readString(adapter.tool_key);
      if (readString(adapter.connection_state) === "disabled") return "disabled";
      if (toolKey === "cossa-crm") return "ready";
      if (toolKey === "cossa-lead-hunter") {
        const circuit = circuitByComponent.get("tool:cossa-lead-hunter");
        if (isCircuitOpen(circuit as RuntimeCircuit | undefined)) return "degraded";
        return environment.runtimeWorkerToken && environment.publicSiteUrl
          ? "ready"
          : "configuration_required";
      }
      if (toolKey === "hunter")
        return environment.hunterApiKey ? "ready" : "configuration_required";
      return "connection_required";
    })(),
  }));

  return {
    runtime: {
      server_execution: workerDeploymentVerified
        ? "active"
        : environment.runtimeWorkerToken && environment.publicSiteUrl
          ? "deployment_verification_required"
          : "configuration_required",
      device_independence:
        "After the hosted worker is deployed and its cron is verified, queued work continues while the CEO device is offline. External APIs still require hosted-server internet connectivity.",
      provider_order: configuredModelProviders(environment),
      worker_trigger_configuration_present: Boolean(
        environment.runtimeWorkerToken && environment.publicSiteUrl,
      ),
      worker_deployment_verified: workerDeploymentVerified,
      worker_last_seen_at: latestWorkerHeartbeat || null,
      external_sending_enabled: false,
    },
    providers,
    agents,
    adapters: enrichedAdapters,
    tasks,
    approvals,
    circuits,
    triggers,
    missions,
  };
}

export async function decideOrchestrationApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  actor: RuntimeActor,
): Promise<void> {
  const environment = requireRuntimeEnvironment();
  const id = readString(approvalId);
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    throw new AgentRuntimeError(
      "invalid_approval_decision",
      "Choose a valid owner approval decision.",
    );
  }

  const query = new URLSearchParams({
    select: "id,action_type,status",
    id: `eq.${id}`,
    organisation_id: `eq.${actor.organisationId}`,
    status: "eq.pending",
    limit: "1",
  });
  const approvals = await databaseRequest<RuntimeApproval[]>(
    environment,
    `approvals?${query.toString()}`,
  );
  const approval = approvals[0];
  if (!approval || approval.action_type !== "review_outreach_drafts") {
    throw new AgentRuntimeError(
      "approval_not_found",
      "That pending outreach-draft review was not found.",
      404,
    );
  }

  await databaseRequest(
    environment,
    `approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: decision,
        decided_by: actor.userId,
        decided_at: new Date().toISOString(),
        decision_reason:
          decision === "approved"
            ? "Owner approved the internal outreach drafts. This approval does not send any customer or prospect communication."
            : "Owner rejected the internal outreach drafts. No external communication was sent.",
      }),
    },
  );

  await logExecutionEvent(environment, {
    organisationId: actor.organisationId,
    missionId: approval.mission_id,
    runId: approval.run_id,
    eventType: "outreach_draft_reviewed",
    message:
      decision === "approved"
        ? "Owner approved internal outreach drafts; sending remains disabled."
        : "Owner rejected internal outreach drafts; sending remains disabled.",
    metadata: { approval_id: id, decision, external_sending_enabled: false },
  });
}

export async function setLeadHunterSchedule(
  input: unknown,
  active: boolean,
  actor: RuntimeActor,
): Promise<void> {
  const environment = requireRuntimeEnvironment();
  const validated = validateLeadHunterInput(input);
  const query = new URLSearchParams({
    select: "id",
    organisation_id: `eq.${actor.organisationId}`,
    name: "eq.Lead Hunter scheduled research",
    limit: "1",
  });
  const rows = await databaseRequest<JsonObject[]>(
    environment,
    `agent_triggers?${query.toString()}`,
  );
  const triggerId = readString(rows[0]?.id);
  if (!triggerId)
    throw new AgentRuntimeError(
      "schedule_not_found",
      "The Lead Hunter schedule has not been installed yet.",
      404,
    );
  await databaseRequest(
    environment,
    `agent_triggers?id=eq.${encodeURIComponent(triggerId)}&organisation_id=eq.${encodeURIComponent(actor.organisationId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: active ? "active" : "paused",
        next_run_at: active
          ? new Date(Date.now() + 60_000).toISOString()
          : new Date(Date.now() + 86_400_000).toISOString(),
        configuration: {
          objective: validated.objective,
          targetCompany: validated.targetCompany,
          targetService: validated.targetService,
          targetLocation: validated.targetLocation,
          resultCount: validated.resultCount,
        },
      }),
    },
  );
}
