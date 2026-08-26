import { supabase } from "@/integrations/supabase/client";

export type LeadHunterRuntimeInput = {
  objective: string;
  targetCompany: string;
  targetService: string;
  targetLocation: string;
  resultCount: number;
};

export type AgentRuntimeDashboard = {
  runtime: {
    server_execution: string;
    device_independence: string;
    provider_order: string[];
    worker_trigger_configuration_present: boolean;
    worker_deployment_verified: boolean;
    external_sending_enabled: boolean;
  };
  providers: Array<Record<string, unknown>>;
  agents: Array<Record<string, unknown>>;
  adapters: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  approvals: Array<Record<string, unknown>>;
  circuits: Array<Record<string, unknown>>;
  triggers: Array<Record<string, unknown>>;
  missions: Array<Record<string, unknown>>;
};

async function sessionHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session)
    throw new Error("Your session has expired. Sign in again to use Cossa Orchestrator.");
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

async function runtimeRequest<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/agent-runtime", {
    ...init,
    headers: { ...(await sessionHeaders()), ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Cossa Orchestrator request failed (${response.status}).`,
    );
  }
  return payload as T;
}

export function getAgentRuntimeDashboard(): Promise<AgentRuntimeDashboard> {
  return runtimeRequest<AgentRuntimeDashboard>();
}

export function queueLeadHunterRuntimeProof(
  input: LeadHunterRuntimeInput,
): Promise<{ missionId: string; queuedTasks: number }> {
  return runtimeRequest({
    method: "POST",
    body: JSON.stringify({ action: "queue_lead_hunter_proof", input }),
  });
}

export function setLeadHunterRuntimeSchedule(
  input: LeadHunterRuntimeInput,
  active: boolean,
): Promise<{ ok: true }> {
  return runtimeRequest({
    method: "POST",
    body: JSON.stringify({ action: "set_lead_hunter_schedule", input, active }),
  });
}

export function reviewOutreachDrafts(
  approvalId: string,
  decision: "approved" | "rejected",
): Promise<{ ok: true }> {
  return runtimeRequest({
    method: "POST",
    body: JSON.stringify({ action: "review_outreach_drafts", approvalId, decision }),
  });
}
