import { supabase } from "@/integrations/supabase/client";
import type { LeadHunterSearchResponse } from "./lead-hunter-data.ts";
import { buildLeadHunterDiagnosticsTruth } from "./lead-hunter-diagnostics.ts";
import type { LeadHunterHistoryDashboard } from "./lead-hunter-history-dashboard.ts";

export type LeadHunterHistoryLoadState =
  | { status: "loading"; dashboard: null; error: null }
  | { status: "ready"; dashboard: LeadHunterHistoryDashboard; error: null }
  | { status: "unavailable"; dashboard: null; error: string };

export function leadHunterDiagnosticsForResponse(response: LeadHunterSearchResponse) {
  return buildLeadHunterDiagnosticsTruth({
    outcome: response.status,
    diagnostics: response.provider_diagnostics,
    sourceCount: response.source_count,
    acceptedCount: response.accepted_count,
    rejectedCount: response.rejected_count,
    finalCount: response.prospects.length,
  });
}

export function leadHunterToastForResponse(response: LeadHunterSearchResponse): {
  level: "success" | "warning" | "error";
  title: string;
  description: string;
} {
  const truth = leadHunterDiagnosticsForResponse(response);

  if (response.status === "FAILED") {
    return { level: "error", title: truth.headline, description: truth.explanation };
  }
  if (response.prospects.length === 0) {
    return { level: "warning", title: truth.headline, description: truth.explanation };
  }
  if (
    response.status === "PARTIAL_PROVIDER_FAILURE" ||
    response.status === "SUCCESS_WITH_PROVIDER_WARNINGS"
  ) {
    return { level: "warning", title: truth.headline, description: truth.explanation };
  }
  return {
    level: "success",
    title: `${response.prospects.length} verified prospect${response.prospects.length === 1 ? "" : "s"} found`,
    description: `${response.source_count} candidate source${response.source_count === 1 ? " was" : "s were"} evaluated.`,
  };
}

export async function fetchLeadHunterHistoryDashboard(
  signal?: AbortSignal,
): Promise<LeadHunterHistoryDashboard> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || "Your session could not be verified.");
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sign in to view Lead Hunter history.");

  const response = await fetch("/api/lead-hunter/history", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
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
