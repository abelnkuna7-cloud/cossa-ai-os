import assert from "node:assert/strict";
import test from "node:test";

import { persistLeadHunterHuntHistory } from "../src/lib/lead-hunter-history.server.ts";
import type { LeadHunterSearchResponse } from "../src/lib/lead-hunter-data.ts";

function hunt(): LeadHunterSearchResponse {
  return {
    hunt_id: "11111111-1111-4111-8111-111111111111",
    status: "SUCCESS_NO_VERIFIED_RESULTS",
    searched_at: "2026-09-12T18:00:00.000Z",
    completed_at: "2026-09-12T18:00:02.000Z",
    request: {
      sector: "private",
      companies: ["cossa_store"],
      services: ["ecommerce"],
      locations: ["Gauteng"],
      industries: [],
      organisation_types: [],
      keywords: [],
      opportunity_signals: [],
      result_count: 10,
      minimum_score: 60,
      minimum_evidence_sources: 2,
      include_private_sector: true,
      include_government_sector: false,
      include_nonprofits: false,
      include_small_projects: true,
      include_large_projects: true,
      require_public_phone_or_email: true,
      require_opportunity_signal: true,
      verified_sources_only: true,
      exclude_existing_crm_leads: true,
      notes: null,
    },
    prospects: [],
    source_count: 0,
    accepted_count: 0,
    rejected_count: 0,
    warnings: [],
    providers_used: [],
    provider_diagnostics: [],
  };
}

test("history writer fails closed without protected service-role credentials", async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const persisted = await persistLeadHunterHuntHistory({
      environment: {
        supabaseUrl: "https://example.supabase.co",
        supabaseServiceRoleKey: null,
        organisationId: "00000000-0000-4000-8000-000000000001",
      },
      executionSource: "manual",
      hunt: hunt(),
    });
    assert.equal(persisted, false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("history writer records zero-result hunts and uses idempotent hunt identity", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let body: Record<string, unknown> = {};
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const persisted = await persistLeadHunterHuntHistory({
      environment: {
        supabaseUrl: "https://example.supabase.co/",
        supabaseServiceRoleKey: "legacy-service-role-jwt",
        organisationId: "00000000-0000-4000-8000-000000000001",
      },
      executionSource: "workforce",
      hunt: hunt(),
      rejectionReasonCounts: { provider_zero_results: 1 },
    });
    assert.equal(persisted, true);
    assert.match(requestedUrl, /lead_hunter_hunt_history\?on_conflict=organisation_id,hunt_id$/);
    assert.equal(body.hunt_id, "11111111-1111-4111-8111-111111111111");
    assert.equal(body.execution_source, "workforce");
    assert.equal(body.accepted_count, 0);
    assert.deepEqual(body.rejection_reason_counts, { provider_zero_results: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("history outage does not rewrite a truthful hunt as a search failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("missing table", { status: 404 })) as typeof fetch;

  try {
    const persisted = await persistLeadHunterHuntHistory({
      environment: {
        supabaseUrl: "https://example.supabase.co",
        supabaseServiceRoleKey: "legacy-service-role-jwt",
        organisationId: "00000000-0000-4000-8000-000000000001",
      },
      executionSource: "scheduled",
      hunt: hunt(),
    });
    assert.equal(persisted, false);
    assert.equal(hunt().status, "SUCCESS_NO_VERIFIED_RESULTS");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
