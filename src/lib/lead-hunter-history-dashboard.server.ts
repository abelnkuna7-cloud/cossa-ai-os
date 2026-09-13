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

function supabaseServerConfiguration(): {
  supabaseUrl: string;
  publishableKey: string | null;
  serviceRoleKey: string | null;
} {
  const supabaseUrl =
    environmentValue(process.env.SUPABASE_URL) ?? environmentValue(process.env.VITE_SUPABASE_URL);

  if (!supabaseUrl) {
    throw new Error("Lead Hunter history dashboard requires Supabase URL configuration.");
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    publishableKey:
      environmentValue(process.env.SUPABASE_PUBLISHABLE_KEY) ??
      environmentValue(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
      environmentValue(process.env.SUPABASE_ANON_KEY) ??
      environmentValue(process.env.VITE_SUPABASE_ANON_KEY),
    serviceRoleKey: environmentValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

async function readHistoryRows(
  organisationId: string,
  accessToken?: string | null,
): Promise<LeadHunterHistoryRow[]> {
  const { supabaseUrl, publishableKey, serviceRoleKey } = supabaseServerConfiguration();

  /*
   * Browser/API reads should use the authenticated user's bearer token so the
   * existing lead_hunter_hunt_history RLS policy remains the authority.
   *
   * The service-role path is retained only for trusted server-side callers
   * that do not have a user token. It is never exposed to the browser.
   */
  const userToken = accessToken?.trim() || null;
  const apiKey = userToken ? publishableKey : serviceRoleKey;

  if (!apiKey) {
    throw new Error(
      userToken
        ? "Lead Hunter history dashboard requires the Supabase publishable server configuration."
        : "Lead Hunter history dashboard requires protected Supabase server configuration.",
    );
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
    apikey: apiKey,
    Accept: "application/json",
  });

  if (userToken) {
    headers.set("Authorization", `Bearer ${userToken}`);
  } else if (!isNewSupabaseApiKey(apiKey)) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/lead_hunter_hunt_history?${query.toString()}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`Lead Hunter history dashboard query failed (${response.status}).`);
  }

  return (await response.json()) as LeadHunterHistoryRow[];
}

export async function getLeadHunterHistoryDashboard(
  organisationId: string,
  accessToken?: string | null,
): Promise<LeadHunterHistoryDashboard> {
  return buildLeadHunterHistoryDashboard(await readHistoryRows(organisationId, accessToken));
}
