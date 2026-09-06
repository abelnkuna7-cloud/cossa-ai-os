import {
  decideCossaIntelligenceSources,
  type CossaInformationSource,
  type CossaTaskPriority,
} from "./cossa-ai-intelligence.ts";

export type CossaCapabilityDomain =
  | "executive"
  | "sales"
  | "marketing"
  | "store"
  | "construction"
  | "facility"
  | "tech"
  | "nexdocs"
  | "workforce"
  | "customer-support"
  | "compliance"
  | "general";

export type CossaReasoningDepth = "quick" | "standard" | "deep";

export interface CossaCapabilityPlan {
  domains: CossaCapabilityDomain[];
  sources: CossaInformationSource[];
  priority: CossaTaskPriority;
  reasoningDepth: CossaReasoningDepth;
  needsLiveOperationalData: boolean;
  needsExternalResearch: boolean;
  ownerApprovalLikely: boolean;
  instructions: string[];
}

const DOMAIN_TERMS: Record<Exclude<CossaCapabilityDomain, "general">, readonly string[]> = {
  executive: [
    "ceo",
    "executive",
    "strategy",
    "group",
    "company status",
    "briefing",
    "decision",
    "priority",
  ],
  sales: [
    "lead",
    "customer",
    "crm",
    "pipeline",
    "quotation",
    "quote",
    "opportunity",
    "follow-up",
    "follow up",
    "sales",
  ],
  marketing: [
    "marketing",
    "campaign",
    "content",
    "social",
    "seo",
    "advert",
    "facebook",
    "instagram",
    "tiktok",
    "linkedin",
  ],
  store: [
    "store",
    "product",
    "catalogue",
    "catalog",
    "inventory",
    "stock",
    "supplier",
    "dropship",
    "printify",
    "dmc",
    "cj",
    "aliexpress",
    "order",
  ],
  construction: [
    "construction",
    "renovation",
    "tiling",
    "painting",
    "roofing",
    "building",
    "plumbing",
    "drywall",
    "rhinolite",
  ],
  facility: [
    "facility",
    "cleaning",
    "housekeeping",
    "hygiene",
    "landscaping",
    "waste",
    "pest",
  ],
  tech: [
    "tech",
    "technology",
    "website",
    "api",
    "webhook",
    "software",
    "code",
    "deployment",
    "vercel",
    "supabase",
    "github",
    "integration",
    "architecture",
    "system design",
    "infrastructure",
    "runtime",
    "database",
    "server",
  ],
  nexdocs: [
    "nexdocs",
    "invoice",
    "proposal",
    "contract",
    "document",
    "certificate",
    "risk assessment",
    "method statement",
  ],
  workforce: [
    "agent",
    "employee",
    "worker",
    "mission",
    "handoff",
    "approval",
    "supervisor",
    "workforce",
  ],
  "customer-support": [
    "support",
    "customer waiting",
    "complaint",
    "refund",
    "return",
    "delivery",
    "tracking",
    "help customer",
  ],
  compliance: [
    "compliance",
    "legal",
    "tax",
    "sars",
    "csd",
    "cidb",
    "bbbee",
    "tender",
    "rfq",
    "policy",
    "privacy",
  ],
};

const DEEP_REASONING_TERMS = [
  "strategy",
  "analyse",
  "analyze",
  "compare",
  "diagnose",
  "root cause",
  "architecture",
  "decision",
  "recommend",
  "plan",
  "why",
  "risk",
  "forecast",
  "business case",
  "tender",
  "pricing strategy",
];

const QUICK_TERMS = [
  "hello",
  "hi",
  "thanks",
  "thank you",
  "who are you",
  "what can you do",
];

const OWNER_APPROVAL_TERMS = [
  "pay",
  "payment",
  "spend",
  "purchase",
  "buy",
  "order supplier",
  "sign",
  "contract",
  "submit tender",
  "publish",
  "launch campaign",
  "ad budget",
  "dns",
  "domain change",
  "delete",
  "remove data",
  "rotate key",
  "credential",
];

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function hasAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function detectDomains(text: string): CossaCapabilityDomain[] {
  const domains = (Object.entries(DOMAIN_TERMS) as Array<
    [Exclude<CossaCapabilityDomain, "general">, readonly string[]]
  >)
    .filter(([, terms]) => hasAny(text, terms))
    .map(([domain]) => domain);

  return domains.length > 0 ? domains : ["general"];
}

function determineReasoningDepth(text: string, domains: CossaCapabilityDomain[]): CossaReasoningDepth {
  if (hasAny(text, QUICK_TERMS) && domains.length === 1 && domains[0] === "general") {
    return "quick";
  }

  if (hasAny(text, DEEP_REASONING_TERMS) || domains.length >= 3) {
    return "deep";
  }

  return "standard";
}

function buildInstructions(plan: Omit<CossaCapabilityPlan, "instructions">): string[] {
  const instructions: string[] = [
    "Check Cossa memory and verified knowledge before spending external provider or research calls.",
  ];

  if (plan.needsLiveOperationalData) {
    instructions.push(
      "Use authorised live Cossa records for current company, customer, workforce, Store or operational claims; do not infer live status from memory alone.",
    );
  }

  if (plan.needsExternalResearch) {
    instructions.push(
      "Use external research only after internal evidence is checked, and label external information separately from verified Cossa facts.",
    );
  } else {
    instructions.push("Do not perform external research by default for this request.");
  }

  if (plan.reasoningDepth === "deep") {
    instructions.push(
      "Reason through dependencies, risks, alternatives and next actions before answering; keep conclusions tied to evidence.",
    );
  }

  if (plan.ownerApprovalLikely) {
    instructions.push(
      "Separate analysis or drafting from the owner-controlled execution step; never claim an approval-controlled action occurred without verified approval and execution evidence.",
    );
  }

  return instructions;
}

/**
 * Deterministic pre-provider capability routing for Cossa AI.
 *
 * This does not make a second AI call. It gives the shared brain a compact
 * execution plan before provider reasoning begins.
 */
export function planCossaCapabilities(message: string): CossaCapabilityPlan {
  const text = normalise(message);
  const intelligence = decideCossaIntelligenceSources(message);
  const domains = detectDomains(text);
  const reasoningDepth = determineReasoningDepth(text, domains);
  const needsLiveOperationalData = intelligence.sources.includes("operational");
  const ownerApprovalLikely = hasAny(text, OWNER_APPROVAL_TERMS);

  const base: Omit<CossaCapabilityPlan, "instructions"> = {
    domains,
    sources: intelligence.sources,
    priority: intelligence.priority,
    reasoningDepth,
    needsLiveOperationalData,
    needsExternalResearch: intelligence.needsExternalResearch,
    ownerApprovalLikely,
  };

  return {
    ...base,
    instructions: buildInstructions(base),
  };
}

export function formatCossaCapabilityPlan(plan: CossaCapabilityPlan): string {
  const lines = [
    "COSSA CAPABILITY ROUTING PLAN",
    `Domains: ${plan.domains.join(", ")}`,
    `Evidence order: ${plan.sources.join(" -> ")}`,
    `Priority: ${plan.priority}`,
    `Reasoning depth: ${plan.reasoningDepth}`,
    `Live operational data required: ${plan.needsLiveOperationalData ? "yes" : "no"}`,
    `External research required: ${plan.needsExternalResearch ? "yes" : "no"}`,
    `Owner approval likely for execution: ${plan.ownerApprovalLikely ? "yes" : "no"}`,
    ...plan.instructions.map((instruction) => `- ${instruction}`),
  ];

  return lines.join("\n");
}
