import assert from "node:assert/strict";
import test from "node:test";

import { buildLeadHunterDiagnosticsTruth } from "../src/lib/lead-hunter-diagnostics.ts";
import type { LeadHunterProviderDiagnostic } from "../src/lib/lead-hunter-data.ts";

function diagnostic(
  overrides: Partial<LeadHunterProviderDiagnostic> & Pick<LeadHunterProviderDiagnostic, "provider">,
): LeadHunterProviderDiagnostic {
  return {
    provider: overrides.provider,
    attempted: true,
    configured: true,
    succeeded: true,
    failed: false,
    warning: null,
    http_status: null,
    error_reason: null,
    result_count: 0,
    source_count: 0,
    timing_ms: 100,
    configuration_required: false,
    ...overrides,
  };
}

test("distinguishes a legitimate no-result hunt from provider failure", () => {
  const truth = buildLeadHunterDiagnosticsTruth({
    outcome: "SUCCESS_NO_VERIFIED_RESULTS",
    diagnostics: [diagnostic({ provider: "Tavily", result_count: 0 })],
    sourceCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    finalCount: 0,
  });

  assert.equal(truth.providers[0]?.status, "NO_RESULTS");
  assert.equal(truth.headline, "No verified prospects found");
  assert.match(truth.explanation, /returned no usable candidates/i);
});

test("explains filtered-to-zero when providers found candidates but verification rejected them", () => {
  const truth = buildLeadHunterDiagnosticsTruth({
    outcome: "SUCCESS_NO_VERIFIED_RESULTS",
    diagnostics: [diagnostic({ provider: "Tavily", result_count: 6 })],
    sourceCount: 6,
    acceptedCount: 0,
    rejectedCount: 6,
    finalCount: 0,
  });

  assert.equal(truth.providers[0]?.status, "FILTERED_TO_ZERO");
  assert.equal(truth.rawCandidateCount, 6);
  assert.match(truth.headline, /none passed verification/i);
});

test("surfaces authentication and rate-limit causes instead of generic zero results", () => {
  const truth = buildLeadHunterDiagnosticsTruth({
    outcome: "FAILED",
    diagnostics: [
      diagnostic({
        provider: "Tavily",
        succeeded: false,
        failed: true,
        http_status: 401,
        error_reason: "Invalid API key",
      }),
      diagnostic({
        provider: "SerpAPI",
        succeeded: false,
        failed: true,
        http_status: 429,
        error_reason: "Rate limit exceeded",
      }),
    ],
    sourceCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    finalCount: 0,
  });

  assert.deepEqual(
    truth.providers.map((provider) => provider.status),
    ["AUTH_ERROR", "RATE_LIMITED"],
  );
  assert.match(truth.explanation, /authentication failed/i);
  assert.match(truth.explanation, /rate limited/i);
});

test("keeps unconfigured providers distinct from providers that were simply not needed", () => {
  const truth = buildLeadHunterDiagnosticsTruth({
    outcome: "SUCCESS_WITH_PROVIDER_WARNINGS",
    diagnostics: [
      diagnostic({
        provider: "NewsAPI",
        configured: false,
        attempted: false,
        succeeded: false,
        failed: false,
        configuration_required: true,
      }),
      diagnostic({
        provider: "SerpAPI",
        attempted: false,
        succeeded: false,
        failed: false,
      }),
    ],
    sourceCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    finalCount: 0,
  });

  assert.equal(truth.providers[0]?.status, "NOT_CONFIGURED");
  assert.equal(truth.providers[1]?.status, "NOT_ATTEMPTED");
});
