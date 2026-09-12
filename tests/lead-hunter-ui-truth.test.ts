import assert from "node:assert/strict";
import test from "node:test";

import { leadHunterToastForResponse } from "../src/lib/lead-hunter-ui-truth.ts";
import type { LeadHunterSearchResponse } from "../src/lib/lead-hunter-data.ts";

function response(overrides: Partial<LeadHunterSearchResponse> = {}): LeadHunterSearchResponse {
  return {
    hunt_id: "11111111-1111-4111-8111-111111111111",
    status: "SUCCESS_NO_VERIFIED_RESULTS",
    searched_at: "2026-09-12T20:00:00.000Z",
    completed_at: "2026-09-12T20:00:01.000Z",
    request: {} as LeadHunterSearchResponse["request"],
    prospects: [],
    source_count: 0,
    accepted_count: 0,
    rejected_count: 0,
    warnings: [],
    providers_used: [],
    provider_diagnostics: [],
    ...overrides,
  };
}

test("legitimate provider zero is not presented as provider failure", () => {
  const result = leadHunterToastForResponse(response({
    provider_diagnostics: [{
      provider: "Tavily",
      attempted: true,
      configured: true,
      succeeded: true,
      failed: false,
      warning: null,
      http_status: 200,
      error_reason: null,
      result_count: 0,
      source_count: 0,
      timing_ms: 120,
      configuration_required: false,
    }],
  }));
  assert.equal(result.level, "warning");
  assert.equal(result.title, "No verified prospects found");
  assert.match(result.description, /returned no usable candidates/i);
});

test("provider authentication failure is explicit", () => {
  const result = leadHunterToastForResponse(response({
    status: "FAILED",
    provider_diagnostics: [{
      provider: "Tavily",
      attempted: true,
      configured: true,
      succeeded: false,
      failed: true,
      warning: "Authentication failed",
      http_status: 401,
      error_reason: "invalid api key",
      result_count: 0,
      source_count: 0,
      timing_ms: 90,
      configuration_required: false,
    }],
  }));
  assert.equal(result.level, "error");
  assert.match(result.description, /authentication failed/i);
});

test("filtered candidates are not described as an empty market", () => {
  const result = leadHunterToastForResponse(response({
    source_count: 6,
    rejected_count: 6,
    provider_diagnostics: [{
      provider: "SerpAPI",
      attempted: true,
      configured: true,
      succeeded: true,
      failed: false,
      warning: null,
      http_status: 200,
      error_reason: null,
      result_count: 6,
      source_count: 6,
      timing_ms: 180,
      configuration_required: false,
    }],
  }));
  assert.equal(result.title, "Candidates were found, but none passed verification");
  assert.match(result.description, /6 provider candidates were discovered/i);
});
