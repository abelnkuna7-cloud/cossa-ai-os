import {
  salesFollowUps,
  salesLeads,
  salesOpportunities,
  salesQuotations,
} from "@/lib/business-data";

export type GrowthSignalArea = "Sales" | "Customers";

export type GrowthSignalImpact = "High" | "Medium";

export type GrowthSignalRoute =
  | "/sales/leads"
  | "/sales/pipeline"
  | "/sales/quotations"
  | "/sales/follow-ups";

export interface GrowthSignal {
  id: string;
  area: GrowthSignalArea;
  impact: GrowthSignalImpact;
  title: string;
  detail: string;
  evidence: string;
  value: number | null;
  count: number;
  to: GrowthSignalRoute;
  actionLabel: string;
}

const CLOSED_FOLLOW_UP_STATUSES = new Set(["done", "completed", "cancelled", "canceled", "closed"]);

const OPEN_OPPORTUNITY_STAGES = new Set(["prospect", "qualified", "proposal", "negotiation"]);

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function readDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function currencyAmount(rows: Array<{ amount?: number | null; value?: number | null }>): number {
  return rows.reduce((total, row) => total + Number(row.amount ?? row.value ?? 0), 0);
}

function humanCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/**
 * Produces operational signals only from records already held in the CRM.
 * It is deliberately rule based: no signal is shown unless the supporting
 * record, date, status or score exists in the live workspace.
 */
export async function listVerifiedGrowthSignals(): Promise<GrowthSignal[]> {
  const [leads, opportunities, quotations, followUps] = await Promise.all([
    salesLeads.list(),
    salesOpportunities.list(),
    salesQuotations.list(),
    salesFollowUps.list(),
  ]);

  const today = startOfToday();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  const signals: GrowthSignal[] = [];

  const overdueFollowUps = followUps.filter((followUp) => {
    const dueAt = readDate(followUp.due_at);
    return (
      dueAt !== null &&
      dueAt < today &&
      !CLOSED_FOLLOW_UP_STATUSES.has(followUp.status.trim().toLowerCase())
    );
  });

  if (overdueFollowUps.length > 0) {
    signals.push({
      id: "overdue-follow-ups",
      area: "Customers",
      impact: "High",
      title: `Complete ${humanCount(overdueFollowUps.length, "overdue follow-up")}`,
      detail: "These customer actions are past their recorded due date and need a human review.",
      evidence: `Based on ${humanCount(overdueFollowUps.length, "open follow-up")} with a due date before today.`,
      value: null,
      count: overdueFollowUps.length,
      to: "/sales/follow-ups",
      actionLabel: "Open follow-ups",
    });
  }

  const expiredQuotes = quotations.filter((quotation) => {
    const validUntil = readDate(quotation.valid_until);
    return (
      quotation.status.trim().toLowerCase() === "sent" && validUntil !== null && validUntil < today
    );
  });

  if (expiredQuotes.length > 0) {
    signals.push({
      id: "expired-sent-quotes",
      area: "Sales",
      impact: "High",
      title: `Review ${humanCount(expiredQuotes.length, "expired sent quotation")}`,
      detail: "The customer has a sent quotation whose recorded validity date has passed.",
      evidence: `Based on sent quotations with a valid-until date before today.`,
      value: currencyAmount(expiredQuotes),
      count: expiredQuotes.length,
      to: "/sales/quotations",
      actionLabel: "Review quotations",
    });
  }

  const quotesExpiringSoon = quotations.filter((quotation) => {
    const validUntil = readDate(quotation.valid_until);
    const status = quotation.status.trim().toLowerCase();
    return (
      (status === "draft" || status === "sent") &&
      validUntil !== null &&
      validUntil >= today &&
      validUntil <= sevenDaysFromNow
    );
  });

  if (quotesExpiringSoon.length > 0) {
    signals.push({
      id: "quotes-expiring-soon",
      area: "Sales",
      impact: "Medium",
      title: `${humanCount(quotesExpiringSoon.length, "quotation")} expiring in seven days`,
      detail: "Review their customer status and send a lawful, relevant follow-up if appropriate.",
      evidence:
        "Based on draft or sent quotations with a valid-until date within the next seven days.",
      value: currencyAmount(quotesExpiringSoon),
      count: quotesExpiringSoon.length,
      to: "/sales/quotations",
      actionLabel: "Open quotations",
    });
  }

  const pastExpectedClose = opportunities.filter((opportunity) => {
    const expectedClose = readDate(opportunity.expected_close);
    return (
      expectedClose !== null &&
      expectedClose < today &&
      OPEN_OPPORTUNITY_STAGES.has(opportunity.stage.trim().toLowerCase())
    );
  });

  if (pastExpectedClose.length > 0) {
    signals.push({
      id: "past-expected-close",
      area: "Sales",
      impact: "High",
      title: `${humanCount(pastExpectedClose.length, "open opportunity")} past expected close`,
      detail: "The recorded expected-close date has passed while the opportunity remains open.",
      evidence: "Based on open pipeline records with an expected-close date before today.",
      value: currencyAmount(pastExpectedClose),
      count: pastExpectedClose.length,
      to: "/sales/pipeline",
      actionLabel: "Review pipeline",
    });
  }

  const hotNewLeads = leads.filter((lead) => {
    const status = lead.status.trim().toLowerCase();
    return lead.score >= 70 && (status === "new" || status === "uncontacted");
  });

  if (hotNewLeads.length > 0) {
    signals.push({
      id: "hot-new-leads",
      area: "Sales",
      impact: "High",
      title: `${humanCount(hotNewLeads.length, "high-scoring new lead")} waiting for review`,
      detail: "Prioritise a human check of fit, consent and contact details before any outreach.",
      evidence: "Based on leads scored 70 or higher that are still marked new or uncontacted.",
      value: null,
      count: hotNewLeads.length,
      to: "/sales/leads",
      actionLabel: "Review leads",
    });
  }

  return signals.sort((left, right) => {
    if (left.impact !== right.impact) return left.impact === "High" ? -1 : 1;
    return right.count - left.count;
  });
}

export function totalSignalValue(signals: GrowthSignal[]): number {
  return signals.reduce((total, signal) => total + (signal.value ?? 0), 0);
}
