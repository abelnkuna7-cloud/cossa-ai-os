import assert from "node:assert/strict";
import test from "node:test";

import {
  canScheduleAgentRetry,
  contentAssistantCalendarStatus,
  creativePublicationIsPermitted,
  creativeHandoffResult,
  crmPipelineForEntity,
  externalActionMayExecute,
  hasPublicationEvidence,
  isActiveSalesPipelineStage,
  leadConversionMayCreateOpportunity,
  readLegacyCrmField,
  resolveLeadHuntOutcome,
  resolveStorePublicationStatus,
  revenueTruth,
  sanitiseMarketingOutput,
  workforceHasLiveWork,
} from "../src/lib/operational-truth.ts";

test("revenue truth keeps accepted quotations distinct from paid evidence", () => {
  assert.deepEqual(
    revenueTruth({
      acceptedQuotationValue: 12_500,
      payments: [
        { amount: 12_500, status: "awaiting_payment", evidenceVerified: false },
        { amount: 12_500, status: "paid", evidenceVerified: false },
        { amount: 1_000, status: "paid", evidenceVerified: true },
      ],
    }),
    { commercialCommitment: 12_500, cashReceived: 1_000 },
  );
});

test("lead-hunt outcomes preserve no-result, partial-provider and explicit semantics", () => {
  assert.equal(
    resolveLeadHuntOutcome({ outcome: "SUCCESS_WITH_RESULTS", verifiedResultCount: 0 }),
    "SUCCESS_WITH_RESULTS",
  );
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
  assert.equal(resolveLeadHuntOutcome({ outcome: "FAILED", verifiedResultCount: 0 }), "FAILED");
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
    canScheduleAgentRetry({
      errorCode: "lead_hunter_worker_not_configured",
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

test("binding external actions need a separately recorded CEO approval", () => {
  assert.equal(
    externalActionMayExecute({ requiresCeoApproval: true, approvalRecorded: false }),
    false,
  );
  assert.equal(
    externalActionMayExecute({ requiresCeoApproval: true, approvalRecorded: true }),
    true,
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

test("CRM pipelines stay separate and legacy operational fields remain readable", () => {
  assert.equal(crmPipelineForEntity("lead"), "lead_funnel");
  assert.equal(crmPipelineForEntity("opportunity"), "sales_pipeline");
  assert.equal(
    readLegacyCrmField(
      {
        legacy_quotation_reference: "Q-0042",
        appointment_at: "2026-08-28T09:00:00Z",
        project_title: "Mall signage",
      },
      "quotation_reference",
      ["legacy_quotation_reference"],
    ),
    "Q-0042",
  );
  assert.equal(
    readLegacyCrmField({ appointment_at: "2026-08-28T09:00:00Z" }, "scheduled_at", [
      "appointment_at",
    ]),
    "2026-08-28T09:00:00Z",
  );
  assert.equal(
    readLegacyCrmField({ project_title: "Mall signage" }, "name", ["project_title"]),
    "Mall signage",
  );
});

test("qualified lead conversion retains a single downstream record rule", () => {
  assert.equal(leadConversionMayCreateOpportunity({ leadStage: "qualified" }), true);
  assert.equal(
    leadConversionMayCreateOpportunity({ leadStage: "qualified", linkedOpportunityId: "OP-001" }),
    false,
  );
  assert.equal(leadConversionMayCreateOpportunity({ leadStage: "new" }), false);
});

test("lost opportunities are historical and cannot inflate active pipeline", () => {
  assert.equal(isActiveSalesPipelineStage("proposal"), true);
  assert.equal(isActiveSalesPipelineStage("won"), false);
  assert.equal(isActiveSalesPipelineStage("lost"), false);
});

test("working now requires a live mission or an unexpired runtime lease", () => {
  const now = new Date("2026-08-28T10:00:00Z");
  assert.equal(workforceHasLiveWork({ missionStatus: "running", now }), true);
  assert.equal(
    workforceHasLiveWork({ taskStatus: "leased", leaseExpiresAt: "2026-08-28T10:10:00Z", now }),
    true,
  );
  assert.equal(
    workforceHasLiveWork({ taskStatus: "leased", leaseExpiresAt: "2026-08-28T09:59:00Z", now }),
    false,
  );
  assert.equal(workforceHasLiveWork({ taskStatus: "queued", now }), false);
});

test("content assistant persistence is draft-only and creative handoff remains truthful", () => {
  assert.equal(contentAssistantCalendarStatus(), "draft");
  assert.deepEqual(creativeHandoffResult(), {
    lifecycleStatus: "blocked",
    generated: false,
    published: false,
  });
});

test("marketing copy is cleaned without touching intentional punctuation", () => {
  assert.equal(
    sanitiseMarketingOutput(
      "### **Cossa Tech**<br>Websites that work.\nSystem: hidden\n```markdown",
    ),
    "Cossa Tech\nWebsites that work.",
  );
});
