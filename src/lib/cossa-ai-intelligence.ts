export type CossaInformationSource =
  | "memory"
  | "knowledge"
  | "operational"
  | "external";

export type CossaTaskPriority = "critical" | "high" | "normal" | "background";

export interface CossaIntelligenceDecision {
  sources: CossaInformationSource[];
  needsExternalResearch: boolean;
  priority: CossaTaskPriority;
  reason: string;
}

const EXTERNAL_FRESHNESS_TERMS = [
  "today",
  "latest",
  "current",
  "right now",
  "news",
  "market price",
  "competitor",
  "tender",
  "rfq",
  "regulation",
  "law",
  "weather",
  "exchange rate",
];

const OPERATIONAL_TERMS = [
  "lead",
  "customer",
  "quotation",
  "quote",
  "project",
  "appointment",
  "order",
  "inventory",
  "stock",
  "supplier",
  "agent",
  "mission",
  "approval",
  "revenue",
];

const CRITICAL_TERMS = [
  "ceo",
  "production",
  "security",
  "payment",
  "customer waiting",
  "urgent",
  "failed deployment",
  "release blocker",
];

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

/**
 * Decides what Cossa AI should consult before spending provider tokens.
 *
 * Core rule:
 *   memory -> verified knowledge -> authorised live Cossa data -> external research
 *
 * External research is opt-in and should only happen when freshness or missing
 * internal evidence genuinely requires it.
 */
export function decideCossaIntelligenceSources(message: string): CossaIntelligenceDecision {
  const text = normalise(message);
  const needsOperationalData = containsAny(text, OPERATIONAL_TERMS);
  const needsExternalResearch = containsAny(text, EXTERNAL_FRESHNESS_TERMS);
  const critical = containsAny(text, CRITICAL_TERMS);

  const sources: CossaInformationSource[] = ["memory", "knowledge"];

  if (needsOperationalData) {
    sources.push("operational");
  }

  if (needsExternalResearch) {
    sources.push("external");
  }

  return {
    sources,
    needsExternalResearch,
    priority: critical ? "critical" : needsOperationalData ? "high" : "normal",
    reason: needsExternalResearch
      ? "The request appears time-sensitive, so current external evidence may be required after Cossa memory, knowledge and live data are checked."
      : needsOperationalData
        ? "The request can be grounded in Cossa memory, verified knowledge and authorised live company data without defaulting to external research."
        : "The request should be answered from Cossa memory and verified knowledge first; no external lookup is required by default.",
  };
}

export interface GroqCapacitySnapshot {
  remainingRequests?: number | null;
  remainingTokens?: number | null;
}

export type GroqCapacityMode = "normal" | "conserve" | "protect";

/**
 * Converts Groq rate-limit telemetry into a simple operating mode.
 * Thresholds are deliberately conservative and can later become environment
 * configuration once production telemetry shows normal Cossa usage patterns.
 */
export function getGroqCapacityMode(snapshot: GroqCapacitySnapshot): GroqCapacityMode {
  const remainingRequests = snapshot.remainingRequests ?? Number.POSITIVE_INFINITY;
  const remainingTokens = snapshot.remainingTokens ?? Number.POSITIVE_INFINITY;

  if (remainingRequests <= 5 || remainingTokens <= 1_000) {
    return "protect";
  }

  if (remainingRequests <= 20 || remainingTokens <= 3_000) {
    return "conserve";
  }

  return "normal";
}

export function shouldDeferBackgroundWork(
  priority: CossaTaskPriority,
  capacityMode: GroqCapacityMode,
): boolean {
  if (priority === "critical" || priority === "high") {
    return false;
  }

  return capacityMode === "protect" || (priority === "background" && capacityMode === "conserve");
}
