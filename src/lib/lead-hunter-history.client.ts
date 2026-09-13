import { supabase } from "@/integrations/supabase/client";
import type { LeadHunterHistoryDashboard } from "./lead-hunter-history-dashboard";

export type ProviderConfigState = "CONFIGURED" | "NOT_CONFIGURED";

export type LeadHunterProviderConfigurationHealth = {
  checked_at: string;
  environment: string;
  search_providers: {
    tavily: ProviderConfigState;
    serpapi: ProviderConfigState;
    newsapi: ProviderConfigState;
  };
  model_providers: {
    groq: {
      configuration: ProviderConfigState;
      model: string;
    };
    openai: {
      configuration: ProviderConfigState;
      model: string;
    };
    gemini: {
      configuration: ProviderConfigState;
      model: string;
    };
  };
  lead_hunter_search_available: boolean;
  model_reasoning_available: boolean;
  protected_runtime: {
    supabase: ProviderConfigState;
    runtime_worker: ProviderConfigState;
    history_writer: ProviderConfigState;
  };
  note: string;
};

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "Your session could not be verified.");
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to view Lead Hunter operational truth.");
  return token;
}

export async function fetchLeadHunterHistoryDashboard(
  signal?: AbortSignal,
): Promise<LeadHunterHistoryDashboard> {
  const token = await accessToken();
  const response = await fetch("/api/lead-hunter/history", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  const body = (await response.json().catch(() => null)) as
    | (LeadHunterHistoryDashboard & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error || `Lead Hunter history is unavailable (${response.status}).`);
  }
  if (!body || typeof body !== "object" || !("today" in body) || !("last_7_days" in body)) {
    throw new Error("Lead Hunter history returned an invalid response.");
  }
  return body as LeadHunterHistoryDashboard;
}

export async function fetchLeadHunterProviderConfigurationHealth(
  signal?: AbortSignal,
): Promise<LeadHunterProviderConfigurationHealth> {
  const token = await accessToken();
  const response = await fetch("/api/lead-hunter/provider-health", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  const body = (await response.json().catch(() => null)) as
    | (LeadHunterProviderConfigurationHealth & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error || `Lead Hunter provider health is unavailable (${response.status}).`);
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("search_providers" in body) ||
    !("model_providers" in body) ||
    !("lead_hunter_search_available" in body)
  ) {
    throw new Error("Lead Hunter provider health returned an invalid response.");
  }
  return body as LeadHunterProviderConfigurationHealth;
}
