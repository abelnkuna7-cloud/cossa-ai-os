import { supabase } from "@/integrations/supabase/client";
import type { LeadHunterHistoryDashboard } from "./lead-hunter-history-dashboard";

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
