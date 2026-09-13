import type { LeadHunterSearchResponse } from "./lead-hunter-data.ts";
import {
  buildLeadHunterHuntHistoryRecord,
  type LeadHunterHistoryExecutionSource,
} from "./lead-hunter-history.ts";

type LeadHunterHistoryWriterEnvironment = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string | null;
  organisationId: string;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Writes one immutable completed-hunt record through the protected service role.
 *
 * History is operational intelligence, not a search prerequisite. A history
 * outage must therefore never turn a truthful Lead Hunter result into a false
 * search failure. The caller can surface the boolean as an observability signal.
 */
export async function persistLeadHunterHuntHistory(input: {
  environment: LeadHunterHistoryWriterEnvironment;
  executionSource: LeadHunterHistoryExecutionSource;
  hunt: LeadHunterSearchResponse;
  rejectionReasonCounts?: Record<string, number>;
}): Promise<boolean> {
  const serviceRoleKey = input.environment.supabaseServiceRoleKey?.trim() ?? "";
  if (!serviceRoleKey) return false;

  const record = buildLeadHunterHuntHistoryRecord({
    organisationId: input.environment.organisationId,
    executionSource: input.executionSource,
    hunt: input.hunt,
    rejectionReasonCounts: input.rejectionReasonCounts,
  });

  const headers = new Headers({
    apikey: serviceRoleKey,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates,return=minimal",
  });

  // New Supabase secret keys are opaque API keys rather than JWT bearer tokens.
  if (!isNewSupabaseApiKey(serviceRoleKey)) {
    headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  }

  try {
    const response = await fetch(
      `${input.environment.supabaseUrl.replace(/\/+$/, "")}/rest/v1/lead_hunter_hunt_history?on_conflict=organisation_id,hunt_id`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(record),
      },
    );

    if (!response.ok) {
      console.warn("Lead Hunter hunt history write skipped:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      "Lead Hunter hunt history write failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return false;
  }
}
