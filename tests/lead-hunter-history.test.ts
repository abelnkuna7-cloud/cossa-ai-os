import assert from "node:assert/strict";
import test from "node:test";

import { buildLeadHunterHuntHistoryRecord } from "../src/lib/lead-hunter-history.ts";

test("builds durable Lead Hunter counters from a completed hunt", () => {
  const record = buildLeadHunterHuntHistoryRecord({
    organisationId: "00000000-0000-4000-8000-000000000001",
    executionSource: "manual",
    hunt: {
      hunt_id: "11111111-1111-4111-8111-111111111111",
      status: "SUCCESS_WITH_RESULTS",
      searched_at: "2026-09-12T18:00:00.000Z",
      completed_at: "2026-09-12T18:00:05.000Z",
      request: { companies: ["cossa_facility_services"] },
      providers_used: ["Tavily", "SerpAPI"],
      provider_diagnostics: [{ provider: "Tavily", succeeded: true }],
      source_count: 12,
      accepted_count: 4,
      rejected_count: 8,
      prospects: [
        {
          verification_status: "verified",
          sales_priority: "hot",
          classification: "tender",
          duplicate_status: "clear",
        },
        {
          verification_status: "verified",
          sales_priority: "warm",
          classification: "supplier_opportunity",
          duplicate_status: "possible_duplicate",
        },
        {
          verification_status: "partially_verified",
          sales_priority: "cold",
          classification: "prospect",
          duplicate_status: "clear",
        },
        {
          verification_status: "verified",
          sales_priority: "research",
          classification: "prospect",
          duplicate_status: "existing_crm_lead",
        },
      ],
    },
    rejectionReasonCounts: { directory: 5, competitor: 3 },
  });

  assert.equal(record.verified_count, 3);
  assert.equal(record.partially_verified_count, 1);
  assert.equal(record.hot_count, 1);
  assert.equal(record.warm_count, 1);
  assert.equal(record.cold_count, 1);
  assert.equal(record.research_count, 1);
  assert.equal(record.duplicate_count, 2);
  assert.equal(record.tender_count, 1);
  assert.equal(record.supplier_opportunity_count, 1);
  assert.deepEqual(record.rejection_reason_counts, { directory: 5, competitor: 3 });
});

test("rejects incomplete or invented history identity", () => {
  assert.throws(
    () =>
      buildLeadHunterHuntHistoryRecord({
        organisationId: "",
        executionSource: "workforce",
        hunt: {
          hunt_id: "",
          status: "SUCCESS_WITH_RESULTS",
          searched_at: "",
        },
      }),
    /requires organisation, hunt ID and searched-at timestamp/i,
  );
});

test("rejects unrecognised workflow outcomes", () => {
  assert.throws(
    () =>
      buildLeadHunterHuntHistoryRecord({
        organisationId: "00000000-0000-4000-8000-000000000001",
        executionSource: "scheduled",
        hunt: {
          hunt_id: "11111111-1111-4111-8111-111111111111",
          status: "DONE",
          searched_at: "2026-09-12T18:00:00.000Z",
        },
      }),
    /recognised workflow outcome/i,
  );
});
