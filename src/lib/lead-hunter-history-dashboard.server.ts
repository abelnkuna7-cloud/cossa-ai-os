import {
  buildLeadHunterHistoryDashboard,
  type LeadHunterHistoryDashboard,
  type LeadHunterHistoryRow,
} from "./lead-hunter-history-dashboard.ts";

function environmentValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

async function readHistoryRows(organisationId: string): Promise<LeadHunterHistoryRow[]> {
  const supabaseUrl =
    environmentValue(process.env.SUPABASE_URL) ?? environmentValue(process.env.VITE_SUPABASE_URL);
  const serviceRoleKey = environmentValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Lead Hunter history dashboard requires protected Supabase server configuration.");
  }

  const cutoff = new Date(Date.now() - 31 * 86_400_000).toISOString();
  const query = new URLSearchParams({
    select:
      "hunt_id,execution_source,workflow_outcome,searched_at,completed_at,source_count,accepted_count,rejected_count,verified_count,partially_verified_count,hot_count,warm_count,cold_count,research_count,duplicate_count,tender_count,supplier_opportunity_count,provider_diagnostics,rejection_reason_counts",
    organisation_id: `eq.${organisationId}`,
    searched_at: `gte.${cutoff}`,
    order: "searched_at.desc",
    limit: "500",
  });
  const headers = new Headers({
    apikey: serviceRoleKey,
    Accept: "application/json",
  });
  if (!isNewSupabaseApiKey(serviceRoleKey)) {
    headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/lead_hunter_hunt_history?${query.toString()}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`Lead Hunter history dashboard query failed (${response.status}).`);
  }
  return (await response.json()) as LeadHunterHistoryRow[];
}

export async function getLeadHunterHistoryDashboard(
  organisationId: string,
): Promise<LeadHunterHistoryDashboard> {
  return buildLeadHunterHistoryDashboard(await readHistoryRows(organisationId));
}
