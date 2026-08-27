import { supabase } from "@/integrations/supabase/client";
import { dashboardStats } from "@/lib/business-data";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

type GrowthQueryError = { message: string };

interface GrowthQueryResult<T extends Record<string, unknown>> {
  data: T[] | null;
  count: number | null;
  error: GrowthQueryError | null;
}

interface GrowthQuery<T extends Record<string, unknown>> extends PromiseLike<GrowthQueryResult<T>> {
  select(columns: string, options?: { count?: "exact"; head?: boolean }): GrowthQuery<T>;
  eq(column: string, value: string): GrowthQuery<T>;
  limit(limit: number): GrowthQuery<T>;
}

interface GrowthDataReader {
  from<T extends Record<string, unknown>>(table: string): GrowthQuery<T>;
}

const db = supabase as unknown as GrowthDataReader;

interface LeadFunnelSourceRow extends Record<string, unknown> {
  id: string;
  stage: string | null;
  status: string | null;
  estimated_value: number | string | null;
}

interface NormalizedLeadFunnelRow {
  stage: string;
  estimatedValue: number;
}

export interface LeadFunnelStage {
  key: string;
  label: string;
  count: number;
  estimatedValue: number;
  rawStages: string[];
}

export interface MarketingOperationCounts {
  contentItems: number;
  socialPosts: number;
  socialAccounts: number;
  referrals: number;
  reviewRequests: number;
}

export interface ConsolidatedGrowthIntelligence {
  dashboard: Awaited<ReturnType<typeof dashboardStats>>;
  leadFunnel: LeadFunnelStage[];
  unmappedLeadStages: LeadFunnelStage[];
  marketingOperations: MarketingOperationCounts;
}

const LEAD_STAGE_GROUPS: Array<{
  key: string;
  label: string;
  aliases: string[];
}> = [
  { key: "new", label: "New / Intake", aliases: ["new", "new_lead"] },
  { key: "contacted", label: "Contacted", aliases: ["contacted"] },
  { key: "qualified", label: "Qualified", aliases: ["qualified"] },
  { key: "inspection_booked", label: "Inspection", aliases: ["inspection_booked"] },
  { key: "quote_sent", label: "Quote Sent", aliases: ["quote_sent"] },
  { key: "follow_up", label: "Follow Up", aliases: ["follow_up"] },
  { key: "negotiation", label: "Negotiation", aliases: ["negotiation"] },
  { key: "won", label: "Won", aliases: ["won"] },
  { key: "converted", label: "Converted", aliases: ["converted"] },
  { key: "completed", label: "Completed", aliases: ["completed", "referral_requested"] },
  { key: "lost", label: "Lost", aliases: ["lost", "rejected"] },
];

function cleanStage(value: unknown): string {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") || "unknown"
  );
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function safeCount(table: string): Promise<number> {
  const { count, error } = await db
    .from<{ id: string }>(table)
    .select("id", { count: "exact", head: true });
  if (error) {
    // Missing optional legacy operational tables must not make the core command
    // centre fail. The caller can still show zero rather than inventing data.
    return 0;
  }
  return Number(count ?? 0);
}

export async function consolidatedGrowthIntelligence(): Promise<ConsolidatedGrowthIntelligence> {
  const [
    dashboard,
    leadResult,
    contentItems,
    socialPosts,
    socialAccounts,
    referrals,
    reviewRequests,
  ] = await Promise.all([
    dashboardStats(),
    db
      .from<LeadFunnelSourceRow>("leads")
      .select("id,stage,status,estimated_value")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .limit(5000),
    safeCount("content_calendar"),
    safeCount("social_posts"),
    safeCount("social_accounts"),
    safeCount("referrals"),
    safeCount("review_requests"),
  ]);

  if (leadResult.error) {
    throw new Error(`Unable to load the canonical lead funnel: ${leadResult.error.message}`);
  }

  const leadRows: NormalizedLeadFunnelRow[] = (leadResult.data ?? []).map((row) => ({
    stage: cleanStage(row.stage ?? row.status),
    estimatedValue: money(row.estimated_value),
  }));

  const recognised = new Set(LEAD_STAGE_GROUPS.flatMap((group) => group.aliases));

  const leadFunnel = LEAD_STAGE_GROUPS.map((group) => {
    const rows = leadRows.filter((row) => group.aliases.includes(row.stage));
    return {
      key: group.key,
      label: group.label,
      count: rows.length,
      estimatedValue: rows.reduce((sum, row) => sum + row.estimatedValue, 0),
      rawStages: [...group.aliases],
    } satisfies LeadFunnelStage;
  });

  const unmappedMap = new Map<string, { count: number; estimatedValue: number }>();
  for (const row of leadRows) {
    if (recognised.has(row.stage)) continue;
    const existing = unmappedMap.get(row.stage) ?? { count: 0, estimatedValue: 0 };
    existing.count += 1;
    existing.estimatedValue += row.estimatedValue;
    unmappedMap.set(row.stage, existing);
  }

  const unmappedLeadStages = [...unmappedMap.entries()].map(([stage, values]) => ({
    key: `unmapped:${stage}`,
    label: stage.replaceAll("_", " "),
    count: values.count,
    estimatedValue: values.estimatedValue,
    rawStages: [stage],
  }));

  return {
    dashboard,
    leadFunnel,
    unmappedLeadStages,
    marketingOperations: {
      contentItems,
      socialPosts,
      socialAccounts,
      referrals,
      reviewRequests,
    },
  };
}
