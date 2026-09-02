/**
 * Evidence-led commercial review for Cossa Store.
 *
 * This layer deliberately returns recommendations only. It never changes a
 * product, its source, a selling price, a public catalogue record, SEO, or a
 * Merchant feed. A reviewer must make every commercial change through the
 * established product and publication controls.
 */

export type CommercialReviewOutcome =
  | "KEEP"
  | "REPRICE"
  | "LOCAL_SOURCE_OPPORTUNITY"
  | "HOLD"
  | "ARCHIVE_CANDIDATE";

export type SupplierPriority =
  | "COSSA_OWNED_OR_LOCAL_STOCK"
  | "APPROVED_SOUTH_AFRICAN_SUPPLIER"
  | "VERIFIED_LOCAL_SUPPLIER"
  | "INTERNATIONAL_DROPSHIPPING"
  | "AFFILIATE_OR_PARTNER";

export type EvidenceState = "verified" | "not_applicable" | "unknown" | "unavailable";
/**
 * A South African price can influence a recommendation only when the product
 * comparison itself is evidence-backed. A familiar-looking title, category or
 * keyword is deliberately not enough.
 */
export type MarketMatchStrength =
  | "EXACT_MATCH"
  | "STRONG_COMPARABLE"
  | "BROADER_MARKET_CONTEXT"
  | "NOT_COMPARABLE";
export type LocalSourceMatchStrength =
  | "verified_identity"
  | "verified_functional_equivalence"
  | "title_only_candidate"
  | "unknown";

export type CommercialCostEvidence = {
  supplierProductCostZar: number | null;
  supplierProductCostEvidence: EvidenceState;
  internationalOrLocalFreightZar: number | null;
  currencyConversionZar: number | null;
  dutiesTaxesFeesZar: number | null;
  paymentOperationalCostZar: number | null;
  /** A recorded landed total can be used only when a reviewer has confirmed it. */
  recordedTotalLandedCostZar: number | null;
  recordedTotalLandedCostVerified: boolean;
  freightEvidence: EvidenceState;
  dutiesTaxesFeesEvidence: EvidenceState;
  paymentOperationalCostsConfigured: boolean;
};

export type SouthAfricanMarketBenchmark = {
  priceZar: number | null;
  sourceUrl: string | null;
  checkedAt: string | null;
  matchStrength: MarketMatchStrength;
  note: string | null;
};

export type CommercialEvidenceKind =
  | "SUPPLIER_PRODUCT_COST"
  | "SUPPLIER_FREIGHT"
  | "CURRENCY_CONVERSION"
  | "DUTIES_TAXES_FEES"
  | "PAYMENT_OR_OPERATIONAL_COST"
  | "COSSA_SELLING_PRICE"
  | "SUPPLIER_AVAILABILITY"
  | "SOUTH_AFRICAN_MARKET"
  | "LOCAL_SUPPLIER_MATCH";

/**
 * A source-preserving, review-only evidence item. It can be populated from a
 * supplier/API response, an existing Cossa record, or a human-reviewed market
 * source. Missing values are represented explicitly instead of guessed.
 */
export type CommercialEvidenceItem = {
  kind: CommercialEvidenceKind;
  state: EvidenceState;
  sourceLabel: string;
  sourceUrl: string | null;
  observedAt: string | null;
  valueZar: number | null;
  matchStrength?: MarketMatchStrength | LocalSourceMatchStrength | null;
  note: string | null;
};

export type LocalSourceMatch = {
  supplierName: string | null;
  supplierPriority: SupplierPriority | null;
  matchStrength: LocalSourceMatchStrength;
  evidence: string[];
  landedCostZar: number | null;
  landedCostVerified: boolean;
};

export type CommercialReviewInput = {
  productId: string;
  productName: string;
  currentSellingPriceZar: number | null;
  supplierPriority: SupplierPriority;
  availabilityEvidence: EvidenceState;
  minimumGrossMarginPercent: number;
  cost: CommercialCostEvidence;
  marketBenchmark: SouthAfricanMarketBenchmark | null;
  localSourceMatch: LocalSourceMatch | null;
  evidence?: CommercialEvidenceItem[];
};

export type CommercialReview = {
  outcome: CommercialReviewOutcome;
  totalLandedCostZar: number | null;
  totalLandedCostEvidence: "verified" | "indicative" | "unknown";
  grossProfitZar: number | null;
  grossMarginPercent: number | null;
  minimumSustainableSellingPriceZar: number | null;
  recommendedCompetitiveSellingPriceZar: number | null;
  marketDifferenceZar: number | null;
  marketDifferencePercent: number | null;
  requirements: string[];
  rationale: string[];
  merchantWarnings: string[];
  localSourceMatch: LocalSourceMatch | null;
  evidence: CommercialEvidenceItem[];
  evidenceDecisionState: "SUFFICIENT" | "MISSING_EVIDENCE";
  changesAutomatically: false;
};

export type LocalSourceCandidateEvidence = {
  supplierName: string;
  supplierPriority: SupplierPriority;
  modelIdentifiers?: string[];
  specificationMatches?: string[];
  featureMatches?: string[];
  imageEvidence?: boolean;
  titleSimilarityOnly?: boolean;
  landedCostZar?: number | null;
  landedCostVerified?: boolean;
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

function validMargin(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value < 100;
}

function needsInternationalFreight(priority: SupplierPriority): boolean {
  return priority === "INTERNATIONAL_DROPSHIPPING";
}

function hasCredibleBenchmark(
  benchmark: SouthAfricanMarketBenchmark | null,
): benchmark is SouthAfricanMarketBenchmark & { priceZar: number; sourceUrl: string } {
  return Boolean(
    benchmark &&
    positive(benchmark.priceZar) != null &&
    benchmark.priceZar! > 0 &&
    benchmark.sourceUrl?.trim() &&
    ["EXACT_MATCH", "STRONG_COMPARABLE"].includes(benchmark.matchStrength),
  );
}

function isVerifiedLocalMatch(match: LocalSourceMatch | null): match is LocalSourceMatch {
  return Boolean(
    match &&
    ["verified_identity", "verified_functional_equivalence"].includes(match.matchStrength) &&
    match.landedCostVerified &&
    positive(match.landedCostZar) != null,
  );
}

function reviewedLandedCost(input: CommercialReviewInput): {
  total: number | null;
  evidence: "verified" | "indicative" | "unknown";
  requirements: string[];
} {
  const requirements: string[] = [];
  const cost = input.cost;
  const supplierCost = positive(cost.supplierProductCostZar);
  const freight = positive(cost.internationalOrLocalFreightZar);
  const conversion = positive(cost.currencyConversionZar);
  const duties = positive(cost.dutiesTaxesFeesZar);
  const payment = positive(cost.paymentOperationalCostZar);
  const recorded = positive(cost.recordedTotalLandedCostZar);

  if (supplierCost == null || cost.supplierProductCostEvidence !== "verified")
    requirements.push("Supplier product cost needs current source evidence.");
  if (needsInternationalFreight(input.supplierPriority) && cost.freightEvidence !== "verified")
    requirements.push("International freight/logistics needs a current South Africa quotation.");
  if (
    needsInternationalFreight(input.supplierPriority) &&
    cost.dutiesTaxesFeesEvidence === "unknown"
  )
    requirements.push("Applicable duties, taxes or import fees need confirmation.");
  if (cost.paymentOperationalCostsConfigured && payment == null)
    requirements.push("Configured payment or operational cost is missing from the calculation.");

  if (recorded != null && cost.recordedTotalLandedCostVerified) {
    return { total: money(recorded), evidence: "verified", requirements };
  }

  if (recorded != null)
    requirements.push(
      "Recorded landed cost needs verification before it supports a commercial decision.",
    );

  const canDerive =
    supplierCost != null &&
    cost.supplierProductCostEvidence === "verified" &&
    (!needsInternationalFreight(input.supplierPriority) || freight != null) &&
    (!needsInternationalFreight(input.supplierPriority) ||
      cost.dutiesTaxesFeesEvidence !== "unknown") &&
    (!cost.paymentOperationalCostsConfigured || payment != null);
  const derived =
    canDerive && supplierCost != null
      ? money(supplierCost + (freight ?? 0) + (conversion ?? 0) + (duties ?? 0) + (payment ?? 0))
      : null;

  if (derived != null && requirements.length === 0)
    return { total: derived, evidence: "verified", requirements };
  if (recorded != null) return { total: money(recorded), evidence: "indicative", requirements };
  if (derived != null) return { total: derived, evidence: "indicative", requirements };
  return { total: null, evidence: "unknown", requirements };
}

function merchantWarnings(input: {
  outcome: CommercialReviewOutcome;
  requirements: string[];
  availabilityEvidence: EvidenceState;
  margin: number | null;
  minimumMargin: number;
}): string[] {
  const warnings: string[] = [];
  if (input.requirements.length)
    warnings.push(
      "Commercial evidence is incomplete; do not prioritise this product for Merchant/search campaigns.",
    );
  if (input.availabilityEvidence !== "verified")
    warnings.push("Current supplier availability is not verified for a customer-facing promotion.");
  if (input.margin == null || input.margin < input.minimumMargin)
    warnings.push(
      "Sustainable gross margin is not verified for the approved commercial threshold.",
    );
  if (input.outcome === "ARCHIVE_CANDIDATE")
    warnings.push(
      "The verified market benchmark is below the sustainable price; do not prioritise this listing.",
    );
  if (input.outcome === "LOCAL_SOURCE_OPPORTUNITY")
    warnings.push(
      "A verified local-source alternative needs human source-replacement review before promotion.",
    );
  return [...new Set(warnings)];
}

/**
 * Computes a recommendation from only supplied evidence. An incomplete review
 * fails closed to HOLD; the returned values are informative and no mutation is
 * performed.
 */
export function reviewCommercialCompetitiveness(input: CommercialReviewInput): CommercialReview {
  const landed = reviewedLandedCost(input);
  const requirements = [...landed.requirements];
  const sellingPrice = positive(input.currentSellingPriceZar);
  const marginIsValid = validMargin(input.minimumGrossMarginPercent);
  if (!marginIsValid)
    requirements.push("Configure a minimum gross-margin threshold between 0% and 100%.");
  if (sellingPrice == null || sellingPrice <= 0)
    requirements.push("Current Cossa selling price is missing or invalid.");
  if (input.availabilityEvidence !== "verified")
    requirements.push("Current supplier availability needs verification.");

  const total = landed.total;
  const grossProfit = sellingPrice != null && total != null ? money(sellingPrice - total) : null;
  const grossMargin =
    sellingPrice != null && sellingPrice > 0 && grossProfit != null
      ? (grossProfit / sellingPrice) * 100
      : null;
  const minimumSustainablePrice =
    total != null && marginIsValid
      ? money(total / (1 - input.minimumGrossMarginPercent / 100))
      : null;
  const benchmark = input.marketBenchmark;
  const credibleBenchmark = hasCredibleBenchmark(benchmark);
  if (!credibleBenchmark)
    requirements.push(
      "A current comparable South African market price with a credible source and match evidence is required.",
    );

  const marketDifference =
    sellingPrice != null && credibleBenchmark ? money(sellingPrice - benchmark.priceZar) : null;
  const marketDifferencePercent =
    marketDifference != null && credibleBenchmark && benchmark.priceZar > 0
      ? (marketDifference / benchmark.priceZar) * 100
      : null;

  let outcome: CommercialReviewOutcome = "HOLD";
  const rationale: string[] = [];
  let recommendedCompetitiveSellingPriceZar: number | null = null;

  if (requirements.length) {
    rationale.push(
      "The review is incomplete, so the commercial decision is held rather than inferred.",
    );
  } else if (
    total == null ||
    minimumSustainablePrice == null ||
    sellingPrice == null ||
    !credibleBenchmark
  ) {
    rationale.push(
      "A complete landed cost, selling price and credible local benchmark are required.",
    );
  } else if (isVerifiedLocalMatch(input.localSourceMatch)) {
    const localFloor = money(
      input.localSourceMatch.landedCostZar! / (1 - input.minimumGrossMarginPercent / 100),
    );
    if (input.localSourceMatch.landedCostZar! < total && localFloor <= benchmark.priceZar) {
      outcome = "LOCAL_SOURCE_OPPORTUNITY";
      recommendedCompetitiveSellingPriceZar = localFloor;
      rationale.push(
        "A verified local equivalent has lower evidenced landed cost and can meet the commercial margin at the market benchmark.",
      );
    }
  }

  if (
    outcome === "HOLD" &&
    requirements.length === 0 &&
    total != null &&
    minimumSustainablePrice != null &&
    sellingPrice != null &&
    credibleBenchmark
  ) {
    if (benchmark.priceZar < minimumSustainablePrice) {
      outcome = "ARCHIVE_CANDIDATE";
      rationale.push(
        "The credible South African benchmark is below the minimum sustainable price for this source.",
      );
    } else {
      recommendedCompetitiveSellingPriceZar = money(
        Math.max(minimumSustainablePrice, Math.min(sellingPrice, benchmark.priceZar)),
      );
      if (Math.abs(sellingPrice - recommendedCompetitiveSellingPriceZar) >= 0.01) {
        outcome = "REPRICE";
        rationale.push(
          "A competitive price adjustment is possible without falling below the approved gross-margin threshold.",
        );
      } else {
        outcome = "KEEP";
        rationale.push(
          "The current price is within the evidenced competitive range and meets the approved gross-margin threshold.",
        );
      }
    }
  }

  if (outcome === "HOLD" && input.localSourceMatch?.matchStrength === "title_only_candidate")
    rationale.push(
      "A title-only local match is a research lead, not proof of an equivalent product.",
    );

  return {
    outcome,
    totalLandedCostZar: total,
    totalLandedCostEvidence: landed.evidence,
    grossProfitZar: grossProfit,
    grossMarginPercent: grossMargin,
    minimumSustainableSellingPriceZar: minimumSustainablePrice,
    recommendedCompetitiveSellingPriceZar,
    marketDifferenceZar: marketDifference,
    marketDifferencePercent,
    requirements: [...new Set(requirements)],
    rationale,
    merchantWarnings: merchantWarnings({
      outcome,
      requirements,
      availabilityEvidence: input.availabilityEvidence,
      margin: grossMargin,
      minimumMargin: input.minimumGrossMarginPercent,
    }),
    localSourceMatch: input.localSourceMatch,
    evidence: input.evidence ?? [],
    evidenceDecisionState: requirements.length ? "MISSING_EVIDENCE" : "SUFFICIENT",
    changesAutomatically: false,
  };
}

/**
 * Titles alone can suggest research candidates, but cannot prove an identical
 * product or trigger a source replacement recommendation.
 */
export function assessLocalSourceCandidate(input: LocalSourceCandidateEvidence): LocalSourceMatch {
  const modelIdentifiers = (input.modelIdentifiers ?? []).filter((value) => value.trim());
  const specificationMatches = (input.specificationMatches ?? []).filter((value) => value.trim());
  const featureMatches = (input.featureMatches ?? []).filter((value) => value.trim());
  const evidence = [
    ...modelIdentifiers.map((value) => `Matching model identifier: ${value}`),
    ...specificationMatches.map((value) => `Matching specification: ${value}`),
    ...featureMatches.map((value) => `Matching feature: ${value}`),
    ...(input.imageEvidence ? ["Image evidence reviewed alongside product details."] : []),
  ];
  const matchStrength: LocalSourceMatchStrength = modelIdentifiers.length
    ? "verified_identity"
    : specificationMatches.length + featureMatches.length + (input.imageEvidence ? 1 : 0) >= 2
      ? "verified_functional_equivalence"
      : input.titleSimilarityOnly
        ? "title_only_candidate"
        : "unknown";
  return {
    supplierName: input.supplierName,
    supplierPriority: input.supplierPriority,
    matchStrength,
    evidence,
    landedCostZar: positive(input.landedCostZar),
    landedCostVerified: input.landedCostVerified === true,
  };
}
