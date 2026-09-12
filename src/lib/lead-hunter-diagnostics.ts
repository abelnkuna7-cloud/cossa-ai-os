import type { LeadHunterProviderDiagnostic, LeadHunterWorkflowOutcome } from "./lead-hunter-data.ts";
import {
  resolveLeadHunterProviderTruthStatus,
  type LeadHunterProviderTruthStatus,
} from "./operational-truth.ts";

export interface LeadHunterProviderTruth {
  provider: string;
  status: LeadHunterProviderTruthStatus;
  configured: boolean;
  attempted: boolean;
  resultCount: number;
  httpStatus: number | null;
  errorReason: string | null;
  timingMs: number | null;
}

export interface LeadHunterDiagnosticsTruth {
  outcome: LeadHunterWorkflowOutcome;
  providers: LeadHunterProviderTruth[];
  rawCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  finalCount: number;
  headline: string;
  explanation: string;
}

function providerStatusLabel(status: LeadHunterProviderTruthStatus): string {
  switch (status) {
    case "SUCCESS":
      return "working";
    case "NO_RESULTS":
      return "returned no candidates";
    case "AUTH_ERROR":
      return "authentication failed";
    case "RATE_LIMITED":
      return "rate limited";
    case "PROVIDER_DOWN":
      return "provider unavailable";
    case "TIMEOUT":
      return "timed out";
    case "FILTERED_TO_ZERO":
      return "returned candidates that did not survive verification";
    case "FALLBACK_USED":
      return "working as fallback";
    case "NOT_CONFIGURED":
      return "not configured";
    case "NOT_ATTEMPTED":
      return "not needed for this hunt";
    default:
      return "failed";
  }
}

export function buildLeadHunterDiagnosticsTruth(input: {
  outcome: LeadHunterWorkflowOutcome;
  diagnostics: readonly LeadHunterProviderDiagnostic[];
  sourceCount: number;
  acceptedCount: number;
  rejectedCount: number;
  finalCount: number;
}): LeadHunterDiagnosticsTruth {
  const rawCandidateCount = Math.max(
    0,
    input.diagnostics.reduce((total, diagnostic) => total + Math.max(0, diagnostic.result_count), 0),
  );

  const providers = input.diagnostics.map((diagnostic) => ({
    provider: diagnostic.provider,
    status: resolveLeadHunterProviderTruthStatus({
      attempted: diagnostic.attempted,
      configured: diagnostic.configured,
      succeeded: diagnostic.succeeded,
      failed: diagnostic.failed,
      httpStatus: diagnostic.http_status,
      errorReason: diagnostic.error_reason,
      resultCount: diagnostic.result_count,
      rawCandidateCount: diagnostic.result_count,
      finalCount: diagnostic.succeeded && rawCandidateCount > 0 ? input.finalCount : diagnostic.result_count,
    }),
    configured: diagnostic.configured,
    attempted: diagnostic.attempted,
    resultCount: diagnostic.result_count,
    httpStatus: diagnostic.http_status,
    errorReason: diagnostic.error_reason,
    timingMs: diagnostic.timing_ms,
  }));

  const failedProviders = providers.filter((provider) =>
    ["AUTH_ERROR", "RATE_LIMITED", "PROVIDER_DOWN", "TIMEOUT", "FAILED"].includes(provider.status),
  );
  const configurationProblems = providers.filter((provider) => provider.status === "NOT_CONFIGURED");

  let headline = "Lead Hunter completed";
  let explanation = `${input.finalCount} verified prospect${input.finalCount === 1 ? "" : "s"} remained after verification.`;

  if (input.outcome === "FAILED") {
    headline = "Lead Hunter could not complete the hunt";
    explanation =
      failedProviders.length > 0
        ? failedProviders.map((provider) => `${provider.provider} ${providerStatusLabel(provider.status)}`).join("; ") + "."
        : "No configured search provider completed successfully.";
  } else if (input.finalCount === 0 && rawCandidateCount > 0) {
    headline = "Candidates were found, but none passed verification";
    explanation = `${rawCandidateCount} provider candidate${rawCandidateCount === 1 ? " was" : "s were"} discovered; ${input.rejectedCount} candidate${input.rejectedCount === 1 ? " was" : "s were"} rejected or filtered and no verified prospect remained.`;
  } else if (input.finalCount === 0) {
    headline = "No verified prospects found";
    const noResultProviders = providers.filter((provider) => provider.status === "NO_RESULTS");
    if (failedProviders.length > 0 || configurationProblems.length > 0) {
      explanation = [...failedProviders, ...configurationProblems]
        .map((provider) => `${provider.provider} ${providerStatusLabel(provider.status)}`)
        .join("; ") + ".";
    } else if (noResultProviders.length > 0) {
      explanation = "The configured providers completed but returned no usable candidates for the current search plan.";
    } else {
      explanation = "The hunt completed without a prospect strong enough to satisfy the active verification rules.";
    }
  } else if (input.outcome === "PARTIAL_PROVIDER_FAILURE" || input.outcome === "SUCCESS_WITH_PROVIDER_WARNINGS") {
    headline = "Lead Hunter completed with provider warnings";
    explanation = `${input.finalCount} verified prospect${input.finalCount === 1 ? "" : "s"} remained. ${[...failedProviders, ...configurationProblems]
      .map((provider) => `${provider.provider} ${providerStatusLabel(provider.status)}`)
      .join("; ")}.`;
  }

  return {
    outcome: input.outcome,
    providers,
    rawCandidateCount,
    acceptedCount: Math.max(0, input.acceptedCount),
    rejectedCount: Math.max(0, input.rejectedCount),
    finalCount: Math.max(0, input.finalCount),
    headline,
    explanation,
  };
}
