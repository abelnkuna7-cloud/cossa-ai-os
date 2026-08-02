import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (table: string) => any };

export const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

export type EmployeeStatus = "draft" | "active" | "paused" | "retired";
export type MissionStatus =
  "draft" | "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
export type ApprovalStatus =
  "pending" | "approved" | "rejected" | "expired" | "cancelled" | "executed";

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
  status: Exclude<MissionStatus, "draft">;
  model_provider: string | null;
  model_name: string | null;
  model_request_id: string | null;
  knowledge_version_ids: string[];
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
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
}

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: Error | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function listEmployees(organisationId = COSSA_ORGANISATION_ID): Promise<AiEmployee[]> {
  return rows<AiEmployee>(
    db
      .from("ai_employees")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("department")
      .order("name"),
  );
}

export function listMissions(organisationId = COSSA_ORGANISATION_ID): Promise<Mission[]> {
  return rows<Mission>(
    db
      .from("missions")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  );
}

export function listMissionRuns(missionId: string): Promise<MissionRun[]> {
  return rows<MissionRun>(
    db
      .from("mission_runs")
      .select("*")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false }),
  );
}

export function listPendingApprovals(organisationId = COSSA_ORGANISATION_ID): Promise<Approval[]> {
  return rows<Approval>(
    db
      .from("approvals")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
  );
}

export async function createMission(
  input: Pick<Mission, "title" | "instruction" | "objective"> &
    Partial<
      Pick<
        Mission,
        | "organisation_id"
        | "business_unit_id"
        | "assigned_employee_id"
        | "parent_mission_id"
        | "target_market"
        | "target_location"
        | "target_service"
        | "required_result_count"
        | "constraints"
        | "prohibited_actions"
        | "output_schema"
        | "priority"
        | "risk_level"
      >
    >,
): Promise<Mission> {
  const { data, error } = await db
    .from("missions")
    .insert({ organisation_id: COSSA_ORGANISATION_ID, ...input })
    .select("*")
    .single();
  if (error) throw error;
  return data as Mission;
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  reason: string,
): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required");

  const { error } = await db
    .from("approvals")
    .update({
      status: decision,
      decision_reason: reason,
      decided_by: userData.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("status", "pending");
  if (error) throw error;
}
