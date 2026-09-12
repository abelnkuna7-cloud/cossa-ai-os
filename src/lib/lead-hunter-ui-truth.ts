import type { LeadHunterSearchResponse } from "./lead-hunter-data.ts";
import { buildLeadHunterDiagnosticsTruth } from "./lead-hunter-diagnostics.ts";

export function leadHunterDiagnosticsForResponse(response: LeadHunterSearchResponse) {
  return buildLeadHunterDiagnosticsTruth({
    outcome: response.status,
    diagnostics: response.provider_diagnostics,
    sourceCount: response.source_count,
    acceptedCount: response.accepted_count,
    rejectedCount: response.rejected_count,
    finalCount: response.prospects.length,
  });
}

export function leadHunterToastForResponse(response: LeadHunterSearchResponse): {
  level: "success" | "warning" | "error";
  title: string;
  description: string;
} {
  const truth = leadHunterDiagnosticsForResponse(response);

  if (response.status === "FAILED") {
    return { level: "error", title: truth.headline, description: truth.explanation };
  }
  if (response.prospects.length === 0) {
    return { level: "warning", title: truth.headline, description: truth.explanation };
  }
  if (
    response.status === "PARTIAL_PROVIDER_FAILURE" ||
    response.status === "SUCCESS_WITH_PROVIDER_WARNINGS"
  ) {
    return { level: "warning", title: truth.headline, description: truth.explanation };
  }
  return {
    level: "success",
    title: `${response.prospects.length} verified prospect${response.prospects.length === 1 ? "" : "s"} found`,
    description: `${response.source_count} candidate source${response.source_count === 1 ? " was" : "s were"} evaluated.`,
  };
}
