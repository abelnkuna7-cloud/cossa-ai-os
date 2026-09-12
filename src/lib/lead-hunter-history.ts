export type LeadHunterHistoryExecutionSource = "manual" | "workforce" | "scheduled";

export type LeadHunterHistoryWorkflowOutcome =
  | "SUCCESS_WITH_RESULTS"
  | "SUCCESS_NO_VERIFIED_RESULTS"
  | "SUCCESS_WITH_PROVIDER_WARNINGS"
  | "PARTIAL_PROVIDER_FAILURE"
  | "FAILED";

type ProspectLike = {
  verification_status?: unknown;
  sales_priority?: unknown;
  classification?: unknown;
  duplicate_status?: unknown;
};

type HuntLike = {
  hunt_id?: unknown;
  status?: unknown;
  searched_at?: unknown;
  completed_at?: unknown;
  request?: unknown;
  prospects?: unknown;
  providers_used?: unknown;
  provider_diagnostics?: unknown;
  source_count?: unknown;
  accepted_count?: unknown;
  rejected_count?: unknown;
};

export type LeadHunterHuntHistoryRecord = {
  organisation_id: string;
  hunt_id: string;
  execution_source: LeadHunterHistoryExecutionSource;
  workflow_outcome: LeadHunterHistoryWorkflowOutcome;
  searched_at: string;
  completed_at: string | null;
  request: Record<string, unknown>;
  providers_used: string[];
  provider_diagnostics: unknown[];
  source_count: number;
  accepted_count: number;
  rejected_count: number;
  verified_count: number;
  partially_verified_count: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  research_count: number;
  duplicate_count: number;
  tender_count: number;
  supplier_opportunity_count: number;
  rejection_reason_counts: Record<string, number>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function countWhere(prospects: ProspectLike[], predicate: (prospect: ProspectLike) => boolean): number {
  return prospects.reduce((count, prospect) => count + (predicate(prospect) ? 1 : 0), 0);
}

export function buildLeadHunterHuntHistoryRecord(input: {
  organisationId: string;
  executionSource: LeadHunterHistoryExecutionSource;
  hunt: HuntLike;
  rejectionReasonCounts?: Record<string, number>;
}): LeadHunterHuntHistoryRecord {
  const hunt = input.hunt;
  const prospects = asArray(hunt.prospects).map((value) => asRecord(value) as ProspectLike);
  const huntId = readString(hunt.hunt_id);
  const outcome = readString(hunt.status) as LeadHunterHistoryWorkflowOutcome;
  const searchedAt = readString(hunt.searched_at);

  if (!input.organisationId || !huntId || !searchedAt) {
    throw new Error("Lead Hunter history requires organisation, hunt ID and searched-at timestamp.");
  }

  if (
    ![
      "SUCCESS_WITH_RESULTS",
      "SUCCESS_NO_VERIFIED_RESULTS",
      "SUCCESS_WITH_PROVIDER_WARNINGS",
      "PARTIAL_PROVIDER_FAILURE",
      "FAILED",
    ].includes(outcome)
  ) {
    throw new Error("Lead Hunter history requires a recognised workflow outcome.");
  }

  const duplicateStates = new Set([
    "possible_duplicate",
    "existing_crm_lead",
    "excluded_existing_crm_lead",
  ]);

  return {
    organisation_id: input.organisationId,
    hunt_id: huntId,
    execution_source: input.executionSource,
    workflow_outcome: outcome,
    searched_at: searchedAt,
    completed_at: readString(hunt.completed_at) || null,
    request: asRecord(hunt.request),
    providers_used: asArray(hunt.providers_used).map(readString).filter(Boolean),
    provider_diagnostics: asArray(hunt.provider_diagnostics),
    source_count: readCount(hunt.source_count),
    accepted_count: readCount(hunt.accepted_count),
    rejected_count: readCount(hunt.rejected_count),
    verified_count: countWhere(prospects, (prospect) => readString(prospect.verification_status) === "verified"),
    partially_verified_count: countWhere(
      prospects,
      (prospect) => readString(prospect.verification_status) === "partially_verified",
    ),
    hot_count: countWhere(prospects, (prospect) => readString(prospect.sales_priority) === "hot"),
    warm_count: countWhere(prospects, (prospect) => readString(prospect.sales_priority) === "warm"),
    cold_count: countWhere(prospects, (prospect) => readString(prospect.sales_priority) === "cold"),
    research_count: countWhere(prospects, (prospect) => readString(prospect.sales_priority) === "research"),
    duplicate_count: countWhere(prospects, (prospect) => duplicateStates.has(readString(prospect.duplicate_status))),
    tender_count: countWhere(prospects, (prospect) => readString(prospect.classification) === "tender"),
    supplier_opportunity_count: countWhere(
      prospects,
      (prospect) => readString(prospect.classification) === "supplier_opportunity",
    ),
    rejection_reason_counts: Object.fromEntries(
      Object.entries(input.rejectionReasonCounts ?? {}).filter(
        ([reason, count]) => reason.trim().length > 0 && Number.isFinite(count) && count >= 0,
      ),
    ),
  };
}
