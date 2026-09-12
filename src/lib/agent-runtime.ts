import { supabase } from "@/integrations/supabase/client";
import type { AgentRuntimeDashboard } from "./agent-runtime-truth";

export {
  resolveAgentRuntimeTruth,
  type AgentRuntimeAdapter,
  type AgentRuntimeDashboard,
  type AgentRuntimeProvider,
  type AgentRuntimeTruth,
  type RuntimeHealthState,
  type RuntimeProviderStatus,
} from "./agent-runtime-truth";

export type LeadHunterRuntimeInput = {
  objective: string;
  targetCompany: string;
  targetService: string;
  targetLocation: string;
  resultCount: number;
};

export class AgentRuntimeUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentRuntimeUnavailableError";
    this.status = status;
  }
}

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
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Cossa Orchestrator request failed (${response.status}).`;

    if (response.status === 503) {
      throw new AgentRuntimeUnavailableError(message, response.status);
    }

    throw new Error(message);
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
