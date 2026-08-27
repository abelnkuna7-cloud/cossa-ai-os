/**
 * Small, dependency-free safety rules used at operational boundaries. Keeping
 * them here makes their behaviour testable without a browser or live database.
 */

export type LeadHuntOutcome =
  | "SUCCESS_WITH_RESULTS"
  | "SUCCESS_NO_VERIFIED_RESULTS"
  | "SUCCESS_WITH_PROVIDER_WARNINGS"
  | "PARTIAL_PROVIDER_FAILURE"
  | "FAILED";

const LEAD_HUNT_OUTCOMES = new Set<LeadHuntOutcome>([
  "SUCCESS_WITH_RESULTS",
  "SUCCESS_NO_VERIFIED_RESULTS",
  "SUCCESS_WITH_PROVIDER_WARNINGS",
  "PARTIAL_PROVIDER_FAILURE",
  "FAILED",
]);

export function resolveLeadHuntOutcome(input: {
  outcome: unknown;
  verifiedResultCount: number;
  providerDiagnostics?: readonly { attempted?: boolean; failed?: boolean }[];
}): LeadHuntOutcome {
  if (
    typeof input.outcome === "string" &&
    LEAD_HUNT_OUTCOMES.has(input.outcome as LeadHuntOutcome)
  ) {
    return input.outcome as LeadHuntOutcome;
  }

  const diagnostics = input.providerDiagnostics ?? [];
  const attempted = diagnostics.filter((diagnostic) => diagnostic.attempted).length;
  const failed = diagnostics.filter((diagnostic) => diagnostic.failed).length;

  if (failed > 0 && failed < attempted) return "PARTIAL_PROVIDER_FAILURE";
  if (attempted > 0 && failed === attempted && input.verifiedResultCount === 0) return "FAILED";
  return input.verifiedResultCount > 0 ? "SUCCESS_WITH_RESULTS" : "SUCCESS_NO_VERIFIED_RESULTS";
}

const NON_RETRYABLE_AGENT_FAILURE_CODES = new Set([
  "invalid_lead_hunter_request",
  "invalid_lead_hunter_company",
  "invalid_lead_hunter_service",
  "workforce_not_ready",
  "model_not_configured",
  "provider_configuration_required",
  "provider_request_not_retryable",
  "lead_hunter_worker_not_configured",
  "agent_permission_missing",
  "permission_class_missing",
  "permission_class_mismatch",
  "agent_action_denied",
  "agent_approval_required",
  "tool_route_missing",
  "tool_route_disabled",
  "tool_route_requires_approval",
  "unsupported_task_type",
  "missing_mission_run",
]);

export function canScheduleAgentRetry(input: {
  errorCode: string | null;
  attemptCount: number;
  maxAttempts: number;
}): boolean {
  return (
    input.attemptCount < input.maxAttempts &&
    (input.errorCode === null || !NON_RETRYABLE_AGENT_FAILURE_CODES.has(input.errorCode))
  );
}

export function externalActionMayExecute(input: {
  requiresCeoApproval: boolean;
  approvalRecorded: boolean;
}): boolean {
  return !input.requiresCeoApproval || input.approvalRecorded;
}

export function hasPublicationEvidence(input: {
  postUrl?: string | null;
  publishedAt?: string | null;
  postedAt?: string | null;
}): boolean {
  return [input.postUrl, input.publishedAt, input.postedAt].some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

export function resolveStorePublicationStatus(input: {
  currentStatus: "draft" | "active" | "archived";
  requestedStatus: "draft" | "active" | "archived";
  actor: "human" | "source_sync";
}): "draft" | "active" | "archived" {
  return input.actor === "source_sync" && input.requestedStatus === "active"
    ? input.currentStatus
    : input.requestedStatus;
}

export function creativePublicationIsPermitted(input: {
  lifecycleStatus: "blocked" | "ready" | "generated";
  approved: boolean;
  externalPublicationAuthorised: boolean;
}): boolean {
  return (
    input.lifecycleStatus === "generated" && input.approved && input.externalPublicationAuthorised
  );
}

export function revenueTruth(input: {
  acceptedQuotationValue: number;
  payments?: readonly { amount: number; status: string; evidenceVerified: boolean }[];
}): { commercialCommitment: number; cashReceived: number | null } {
  return {
    commercialCommitment: input.acceptedQuotationValue,
    cashReceived: input.payments
      ? input.payments
          .filter((payment) => payment.status === "paid" && payment.evidenceVerified)
          .reduce((total, payment) => total + payment.amount, 0)
      : null,
  };
}

export function crmPipelineForEntity(
  entity: "lead" | "opportunity",
): "lead_funnel" | "sales_pipeline" {
  return entity === "lead" ? "lead_funnel" : "sales_pipeline";
}

export function readLegacyCrmField(
  record: Readonly<Record<string, unknown>>,
  canonicalField: string,
  legacyFields: readonly string[],
): string | null {
  for (const field of [canonicalField, ...legacyFields]) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
