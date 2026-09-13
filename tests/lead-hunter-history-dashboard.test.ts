import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeadHunterHistoryDashboard,
  type LeadHunterHistoryRow,
} from "../src/lib/lead-hunter-history-dashboard.ts";

function row(overrides: Partial<LeadHunterHistoryRow> = {}): LeadHunterHistoryRow {
  return {
    hunt_id: "11111111-1111-4111-8111-111111111111",
    execution_source: "workforce",
    workflow_outcome: "SUCCESS_WITH_RESULTS",
    searched_at: "2026-09-12T08:00:00.000Z",
    completed_at: "2026-09-12T08:00:03.000Z",
    source_count: 5,
    accepted_count: 3,
    rejected_count: 2,
    verified_count: 2,
    partially_verified_count: 1,
    hot_count: 1,
    warm_count: 1,
    cold_count: 0,
    research_count: 1,
    duplicate_count: 1,
    tender_count: 1,
    supplier_opportunity_count: 0,
    provider_diagnostics: [],
    rejection_reason_counts: {},
    ...overrides,
  };
}

test("aggregates today, seven-day and thirty-day counters from durable hunts", () => {
  const dashboard = buildLeadHunterHistoryDashboard(
    [
      row(),
      row({
        hunt_id: "22222222-2222-4222-8222-222222222222",
        searched_at: "2026-09-08T10:00:00.000Z",
        accepted_count: 2,
        rejected_count: 1,
        verified_count: 1,
        hot_count: 0,
        tender_count: 0,
      }),
      row({
        hunt_id: "33333333-3333-4333-8333-333333333333",
        searched_at: "2026-08-20T10:00:00.000Z",
        accepted_count: 4,
        rejected_count: 0,
        verified_count: 3,
        hot_count: 2,
      }),
    ],
    new Date("2026-09-12T20:00:00.000Z"),
  );

  assert.equal(dashboard.timezone, "Africa/Johannesburg");
  assert.equal(dashboard.today.hunts, 1);
  assert.equal(dashboard.today.hunted, 5);
  assert.equal(dashboard.today.verified, 2);
  assert.equal(dashboard.today.hot, 1);
  assert.equal(dashboard.last_7_days.hunts, 2);
  assert.equal(dashboard.last_7_days.hunted, 8);
  assert.equal(dashboard.last_30_days.hunts, 3);
  assert.equal(dashboard.last_30_days.hot, 3);
});

test("keeps provider failures separate from zero-result successful hunts", () => {
  const dashboard = buildLeadHunterHistoryDashboard(
    [
      row({
        workflow_outcome: "SUCCESS_NO_VERIFIED_RESULTS",
        accepted_count: 0,
        rejected_count: 0,
        verified_count: 0,
        hot_count: 0,
      }),
      row({
        hunt_id: "44444444-4444-4444-8444-444444444444",
        workflow_outcome: "FAILED",
        searched_at: "2026-09-12T09:00:00.000Z",
        accepted_count: 0,
        rejected_count: 0,
        verified_count: 0,
        hot_count: 0,
      }),
      row({
        hunt_id: "55555555-5555-4555-8555-555555555555",
        workflow_outcome: "PARTIAL_PROVIDER_FAILURE",
        searched_at: "2026-09-12T10:00:00.000Z",
        accepted_count: 1,
        rejected_count: 2,
        verified_count: 1,
        hot_count: 0,
      }),
    ],
    new Date("2026-09-12T20:00:00.000Z"),
  );

  assert.equal(dashboard.today.hunts, 3);
  assert.equal(dashboard.today.failed_hunts, 1);
  assert.equal(dashboard.today.partial_provider_failures, 1);
  assert.equal(dashboard.today.last_successful_hunt_at, "2026-09-12T08:00:00.000Z");
});

test("today starts at Johannesburg midnight rather than UTC midnight", () => {
  const dashboard = buildLeadHunterHistoryDashboard(
    [
      row({ searched_at: "2026-09-11T21:59:59.000Z" }),
      row({
        hunt_id: "66666666-6666-4666-8666-666666666666",
        searched_at: "2026-09-11T22:00:00.000Z",
      }),
    ],
    new Date("2026-09-12T01:00:00.000Z"),
  );

  assert.equal(dashboard.today.hunts, 1);
});
