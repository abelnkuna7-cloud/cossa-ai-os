export type CossaAnswerMode = "direct" | "executive" | "diagnostic" | "action-plan";
export type CossaEvidenceStandard = "known" | "verified-internal" | "live-operational" | "current-external";
export type CossaUncertaintyPolicy = "state-limits" | "verify-before-claim";

export interface CossaAnswerContract {
  answerMode: CossaAnswerMode;
  evidenceStandard: CossaEvidenceStandard;
  uncertaintyPolicy: CossaUncertaintyPolicy;
  preserveConversationContinuity: boolean;
  instructions: string[];
}

const DIAGNOSTIC_TERMS = [
  "why",
  "root cause",
  "diagnose",
  "error",
  "failed",
  "failure",
  "broken",
  "not working",
  "issue",
  "problem",
];

const ACTION_PLAN_TERMS = [
  "plan",
  "next step",
  "what should",
  "how do we",
  "how should",
  "strategy",
  "roadmap",
  "priorit",
  "recommend",
];

const EXECUTIVE_TERMS = [
  "ceo",
  "executive",
  "briefing",
  "company status",
  "group status",
  "decision",
  "business impact",
];

const LIVE_OPERATIONAL_TERMS = [
  "today",
  "current",
  "latest",
  "right now",
  "inventory",
  "stock",
  "order",
  "orders",
  "lead",
  "leads",
  "customer",
  "customers",
  "revenue",
  "deployment",
  "mission",
  "run",
  "handoff",
];

const EXTERNAL_CURRENT_TERMS = [
  "news",
  "market today",
  "competitor",
  "regulation",
  "law changed",
  "tender today",
  "rfq today",
  "price today",
  "weather",
];

const INTERNAL_VERIFICATION_TERMS = [
  "our",
  "cossa",
  "supplier",
  "policy",
  "approved",
  "agreement",
  "payment provider",
  "store",
  "nexdocs",
  "construction",
  "facility",
  "tech",
];

const SHORT_FOLLOW_UPS = [
  "why",
  "continue",
  "go on",
  "how",
  "what next",
  "then what",
  "and store",
  "what about",
];

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function answerMode(text: string): CossaAnswerMode {
  if (includesAny(text, EXECUTIVE_TERMS)) return "executive";
  if (includesAny(text, DIAGNOSTIC_TERMS)) return "diagnostic";
  if (includesAny(text, ACTION_PLAN_TERMS)) return "action-plan";
  return "direct";
}

function evidenceStandard(text: string): CossaEvidenceStandard {
  if (includesAny(text, EXTERNAL_CURRENT_TERMS)) return "current-external";
  if (includesAny(text, LIVE_OPERATIONAL_TERMS)) return "live-operational";
  if (includesAny(text, INTERNAL_VERIFICATION_TERMS)) return "verified-internal";
  return "known";
}

function isFollowUp(text: string): boolean {
  if (text.length <= 32 && includesAny(text, SHORT_FOLLOW_UPS)) return true;
  return /^(and|also|then|but|so|okay|ok)[, ]/i.test(text);
}

export function planCossaAnswerContract(message: string): CossaAnswerContract {
  const text = normalise(message);
  const standard = evidenceStandard(text);
  const mode = answerMode(text);
  const continuity = isFollowUp(text);
  const uncertaintyPolicy: CossaUncertaintyPolicy =
    standard === "known" ? "state-limits" : "verify-before-claim";

  const instructions = [
    "Answer the user directly before adding explanation; do not bury the conclusion.",
    "Separate verified facts from inference, recommendation, and unknowns.",
    "Never invent a record, status, number, supplier fact, execution result, source, or completed action.",
  ];

  if (mode === "executive") {
    instructions.push(
      "For executive answers, prioritise business impact, decision, risk, dependency, and next action over technical detail.",
    );
  } else if (mode === "diagnostic") {
    instructions.push(
      "For diagnosis, distinguish observed evidence, strongest hypothesis, alternatives, and the next test that would confirm the cause.",
    );
  } else if (mode === "action-plan") {
    instructions.push(
      "For plans, order actions by dependency and value; identify approval-controlled execution separately from safe preparation.",
    );
  }

  if (standard === "live-operational") {
    instructions.push(
      "Do not answer current Cossa operational status from memory alone; require authorised live records when the claim is time-sensitive.",
    );
  } else if (standard === "current-external") {
    instructions.push(
      "Current external claims require fresh authorised research; label them separately from internal Cossa evidence.",
    );
  } else if (standard === "verified-internal") {
    instructions.push(
      "Prefer durable Cossa memory, verified knowledge, and authorised internal records for company-specific claims.",
    );
  }

  if (continuity) {
    instructions.push(
      "Treat this as a continuation of the saved conversation; resolve short references from recent context instead of resetting the topic.",
    );
  }

  return {
    answerMode: mode,
    evidenceStandard: standard,
    uncertaintyPolicy,
    preserveConversationContinuity: continuity,
    instructions,
  };
}

export function formatCossaAnswerContract(contract: CossaAnswerContract): string {
  return [
    "COSSA ANSWER QUALITY CONTRACT",
    `Answer mode: ${contract.answerMode}`,
    `Evidence standard: ${contract.evidenceStandard}`,
    `Uncertainty policy: ${contract.uncertaintyPolicy}`,
    `Conversation continuation: ${contract.preserveConversationContinuity ? "yes" : "no"}`,
    ...contract.instructions.map((instruction) => `- ${instruction}`),
  ].join("\n");
}
