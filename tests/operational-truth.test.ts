import assert from "node:assert/strict";
import test from "node:test";

import {
  canScheduleAgentRetry,
  creativePublicationIsPermitted,
  crmPipelineForEntity,
  hasPublicationEvidence,
  readLegacyCrmField,
  resolveLeadHuntOutcome,
  resolveStorePublicationStatus,
  revenueTruth,
} from "../src/lib/operational-truth.ts";

test("revenue truth keeps accepted quotations distinct from paid evidence", () => {
  assert.deepEqual(
    revenueTruth({
      acceptedQuotationValue: 12_500,
      payments: [
        { amount: 12_500, status: "awaiting_payment", evidenceVerified: false },
        { amount: 1_000, status: "paid", evidenceVerified: true },
      ],
    }),
    { commercialCommitment: 12_500, cashReceived: 1_000 },
  );
});

test("lead-hunt outcomes preserve no-result, partial-provider and explicit semantics", () => {
  assert.equal(
    resolveLeadHuntOutcome({ outcome: null, verifiedResultCount: 0 }),
    "SUCCESS_NO_VERIFIED_RESULTS",
  );
  assert.equal(
    resolveLeadHuntOutcome({
      outcome: null,
      verifiedResultCount: 3,
      providerDiagnostics: [
        { attempted: true, failed: false },
        { attempted: true, failed: true },
      ],
    }),
    "PARTIAL_PROVIDER_FAILURE",
  );
  assert.equal(
    resolveLeadHuntOutcome({ outcome: "SUCCESS_WITH_PROVIDER_WARNINGS", verifiedResultCount: 0 }),
    "SUCCESS_WITH_PROVIDER_WARNINGS",
  );
});

test("approval and configuration failures cannot create retry storms", () => {
  assert.equal(
    canScheduleAgentRetry({
      errorCode: "agent_approval_required",
      attemptCount: 0,
      maxAttempts: 3,
    }),
    false,
  );
  assert.equal(
    canScheduleAgentRetry({ errorCode: "provider_timeout", attemptCount: 1, maxAttempts: 3 }),
    true,
  );
  assert.equal(
    canScheduleAgentRetry({ errorCode: "provider_timeout", attemptCount: 3, maxAttempts: 3 }),
    false,
  );
});

test("publication and store boundaries demand separate evidence and human action", () => {
  assert.equal(hasPublicationEvidence({}), false);
  assert.equal(hasPublicationEvidence({ postUrl: "https://example.com/post" }), true);
  assert.equal(
    resolveStorePublicationStatus({
      currentStatus: "draft",
      requestedStatus: "active",
      actor: "source_sync",
    }),
    "draft",
  );
  assert.equal(
    creativePublicationIsPermitted({
      lifecycleStatus: "blocked",
      approved: false,
      externalPublicationAuthorised: false,
    }),
    false,
  );
});

test("CRM pipelines stay separate and legacy source fields remain readable", () => {
  assert.equal(crmPipelineForEntity("lead"), "lead_funnel");
  assert.equal(crmPipelineForEntity("opportunity"), "sales_pipeline");
  assert.equal(
    readLegacyCrmField({ legacy_source: "website" }, "source", ["legacy_source", "origin"]),
    "website",
  );
});
