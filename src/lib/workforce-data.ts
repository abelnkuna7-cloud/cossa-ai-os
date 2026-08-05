import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

function resolveOrganisationId(): string {
  const configuredOrganisationId =
    import.meta.env.VITE_COSSA_ORGANISATION_ID?.trim();

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

function createDatabaseError(
  operation: string,
  error: unknown,
): Error {
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

function requireNonEmptyValue(
  value: string,
  fieldName: string,
): string {
  const cleanedValue = value.trim();

  if (!cleanedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return cleanedValue;
}

export function listEmployees(
  organisationId = COSSA_ORGANISATION_ID,
): Promise<AiEmployee[]> {
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

export function listActiveEmployees(
  organisationId = COSSA_ORGANISATION_ID,
): Promise<AiEmployee[]> {
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

export function listMissions(
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Mission[]> {
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
  const validMissionId = requireNonEmptyValue(
    missionId,
    "Mission ID",
  );

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

export function listPendingApprovals(
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Approval[]> {
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

export async function createMission(
  input: CreateMissionInput,
): Promise<Mission> {
  const title = requireNonEmptyValue(input.title, "Mission title");
  const instruction = requireNonEmptyValue(
    input.instruction,
    "Mission instruction",
  );
  const objective = requireNonEmptyValue(
    input.objective,
    "Mission objective",
  );

  if (
    input.required_result_count !== undefined &&
    input.required_result_count !== null &&
    (!Number.isInteger(input.required_result_count) ||
      input.required_result_count <= 0)
  ) {
    throw new Error(
      "Required result count must be a positive whole number",
    );
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

  const { data, error } = await db
    .from("missions")
    .insert(missionPayload)
    .select("*")
    .single();

  if (error) {
    throw createDatabaseError("Unable to create mission", error);
  }

  if (!data) {
    throw new Error(
      "Unable to create mission: Supabase returned no mission record",
    );
  }

  return data as Mission;
}

export async function queueMission(
  missionId: string,
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Mission> {
  const validMissionId = requireNonEmptyValue(
    missionId,
    "Mission ID",
  );

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
    throw new Error(
      "Unable to queue mission: The mission was not found or is not in draft status",
    );
  }

  return data as Mission;
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  reason: string,
  organisationId = COSSA_ORGANISATION_ID,
): Promise<Approval> {
  const validApprovalId = requireNonEmptyValue(
    approvalId,
    "Approval ID",
  );
  const validReason = requireNonEmptyValue(
    reason,
    "Decision reason",
  );

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError) {
    throw createDatabaseError(
      "Unable to verify the authenticated user",
      userError,
    );
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

  return data as Approval;
}