export type LeadHunterHistoryRow = {
  hunt_id: string;
  execution_source: "manual" | "workforce" | "scheduled";
  workflow_outcome:
    | "SUCCESS_WITH_RESULTS"
    | "SUCCESS_NO_VERIFIED_RESULTS"
    | "SUCCESS_WITH_PROVIDER_WARNINGS"
    | "PARTIAL_PROVIDER_FAILURE"
    | "FAILED";
  searched_at: string;
  completed_at: string | null;
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
  provider_diagnostics: unknown[];
  rejection_reason_counts: Record<string, number>;
};

export type LeadHunterHistoryWindow = {
  hunts: number;
  hunted: number;
  verified: number;
  partially_verified: number;
  hot: number;
  warm: number;
  cold: number;
  research: number;
  duplicates: number;
  tenders: number;
  supplier_opportunities: number;
  accepted: number;
  rejected: number;
  sources: number;
  failed_hunts: number;
  partial_provider_failures: number;
  last_successful_hunt_at: string | null;
};

export type LeadHunterHistoryDashboard = {
  generated_at: string;
  timezone: "Africa/Johannesburg";
  today: LeadHunterHistoryWindow;
  last_7_days: LeadHunterHistoryWindow;
  last_30_days: LeadHunterHistoryWindow;
};

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function startOfSouthAfricaDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  // South Africa is UTC+02:00 year-round.
  return new Date(Date.UTC(year, month - 1, day, -2, 0, 0, 0));
}

function emptyWindow(): LeadHunterHistoryWindow {
  return {
    hunts: 0,
    hunted: 0,
    verified: 0,
    partially_verified: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    research: 0,
    duplicates: 0,
    tenders: 0,
    supplier_opportunities: 0,
    accepted: 0,
    rejected: 0,
    sources: 0,
    failed_hunts: 0,
    partial_provider_failures: 0,
    last_successful_hunt_at: null,
  };
}

function aggregate(rows: readonly LeadHunterHistoryRow[], cutoff: Date): LeadHunterHistoryWindow {
  const window = emptyWindow();
  let lastSuccessful = 0;

  for (const row of rows) {
    const searched = Date.parse(row.searched_at);
    if (!Number.isFinite(searched) || searched < cutoff.getTime()) continue;

    window.hunts += 1;
    window.accepted += count(row.accepted_count);
    window.rejected += count(row.rejected_count);
    window.hunted += count(row.accepted_count) + count(row.rejected_count);
    window.verified += count(row.verified_count);
    window.partially_verified += count(row.partially_verified_count);
    window.hot += count(row.hot_count);
    window.warm += count(row.warm_count);
    window.cold += count(row.cold_count);
    window.research += count(row.research_count);
    window.duplicates += count(row.duplicate_count);
    window.tenders += count(row.tender_count);
    window.supplier_opportunities += count(row.supplier_opportunity_count);
    window.sources += count(row.source_count);
    if (row.workflow_outcome === "FAILED") window.failed_hunts += 1;
    if (row.workflow_outcome === "PARTIAL_PROVIDER_FAILURE") {
      window.partial_provider_failures += 1;
    }
    if (row.workflow_outcome.startsWith("SUCCESS") && searched > lastSuccessful) {
      lastSuccessful = searched;
      window.last_successful_hunt_at = row.searched_at;
    }
  }

  return window;
}

export function buildLeadHunterHistoryDashboard(
  rows: readonly LeadHunterHistoryRow[],
  now: Date = new Date(),
): LeadHunterHistoryDashboard {
  const todayStart = startOfSouthAfricaDay(now);
  const sevenDayStart = new Date(todayStart.getTime() - 6 * 86_400_000);
  const thirtyDayStart = new Date(todayStart.getTime() - 29 * 86_400_000);

  return {
    generated_at: now.toISOString(),
    timezone: "Africa/Johannesburg",
    today: aggregate(rows, todayStart),
    last_7_days: aggregate(rows, sevenDayStart),
    last_30_days: aggregate(rows, thirtyDayStart),
  };
}
