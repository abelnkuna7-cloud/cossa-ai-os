/**
 * Store Knowledge & Policy layer.
 *
 * These are deterministic, source-aware decisions shared by intake screens and
 * server-side importers. They deliberately do not publish, mutate a catalogue,
 * or manufacture a commercial fact.
 */

export type KnowledgeAction = "AUTO" | "VERIFY" | "BLOCK" | "ESCALATE";
export type EvidenceClassification =
  | "VERIFIED_FACT"
  | "SUPPLIER_CLAIM"
  | "INDEPENDENT_EVIDENCE"
  | "UNVERIFIED"
  | "CONFLICTING_INFORMATION";

export type CategoryRecommendation = {
  action: KnowledgeAction;
  category: string | null;
  reason: string;
  proposedCategory: string | null;
  alternatives: string[];
};

export type ProductDuplicateMatch = {
  kind: "supplier_sku" | "source_url" | "name";
  id: string;
  label: string;
};

export type ProductKnowledgeAssessment = {
  action: KnowledgeAction;
  facts: string[];
  supplierClaims: string[];
  requiresVerification: string[];
  blockers: string[];
};

export type PricingKnowledgeAssessment = {
  action: KnowledgeAction;
  facts: string[];
  requiresVerification: string[];
  blockers: string[];
};

type ExistingCategoryMapping = {
  supplier_category: string;
  cossa_category: string;
};

type ExistingProduct = {
  id: string;
  name: string;
  supplier_id?: string | null;
  supplier_product_ref?: string | null;
  source_url?: string | null;
};

function text(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalise(value: string | null | undefined): string {
  return text(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalise(value)
      .split(" ")
      .filter((item) => item.length > 2 && !["and", "the", "for", "with"].includes(item)),
  );
}

function overlap(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter((item) => rightTokens.has(item)).length;
  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function canonicalUrl(value: string | null | undefined): string | null {
  if (!text(value)) return null;
  try {
    const url = new URL(value!);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Recommends only from the actual current Store taxonomy supplied by the
 * caller. Historical mappings are not trusted if their source and target do
 * not describe materially similar categories.
 */
export function recommendCossaCategory(input: {
  supplierCategory: string | null | undefined;
  taxonomy: string[];
  mappings: ExistingCategoryMapping[];
}): CategoryRecommendation {
  const supplierCategory = text(input.supplierCategory);
  const taxonomy = [...new Set(input.taxonomy.map(text).filter(Boolean))];
  if (!supplierCategory) {
    return {
      action: "VERIFY",
      category: null,
      reason:
        "The supplier did not expose a category. Choose an existing Cossa category during review.",
      proposedCategory: null,
      alternatives: taxonomy.slice(0, 8),
    };
  }

  const exact = taxonomy.find((category) => normalise(category) === normalise(supplierCategory));
  if (exact) {
    return {
      action: "AUTO",
      category: exact,
      reason: "The supplier category exactly matches an existing Cossa Store category.",
      proposedCategory: null,
      alternatives: [],
    };
  }

  const coherentMapping = input.mappings.find(
    (mapping) =>
      normalise(mapping.supplier_category) === normalise(supplierCategory) &&
      taxonomy.some((category) => normalise(category) === normalise(mapping.cossa_category)) &&
      overlap(mapping.supplier_category, mapping.cossa_category) >= 0.5,
  );
  if (coherentMapping) {
    return {
      action: "AUTO",
      category: coherentMapping.cossa_category,
      reason:
        "A semantically coherent supplier-to-Cossa mapping exists in the Store Operations Book.",
      proposedCategory: null,
      alternatives: [],
    };
  }

  const ranked = taxonomy
    .map((category) => ({ category, score: overlap(supplierCategory, category) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 0.5) {
    return {
      action: "VERIFY",
      category: null,
      reason:
        "A similar existing category was found, but category assignment still needs a human confirmation.",
      proposedCategory: null,
      alternatives: ranked.slice(0, 3).map((item) => item.category),
    };
  }

  return {
    action: "ESCALATE",
    category: null,
    reason:
      "No reliable match exists in the current Cossa Store taxonomy. Propose a category; do not create one automatically.",
    proposedCategory: supplierCategory,
    alternatives: ranked.slice(0, 3).map((item) => item.category),
  };
}

export function findStoreProductDuplicates(
  products: ExistingProduct[],
  candidate: {
    supplierId: string | null | undefined;
    supplierProductRef: string | null | undefined;
    sourceUrl: string | null | undefined;
    name: string | null | undefined;
  },
): ProductDuplicateMatch[] {
  const supplierSku = normalise(candidate.supplierProductRef);
  const sourceUrl = canonicalUrl(candidate.sourceUrl);
  const name = normalise(candidate.name);
  return products.flatMap((product): ProductDuplicateMatch[] => {
    if (
      supplierSku &&
      normalise(product.supplier_product_ref) === supplierSku &&
      (!product.supplier_id || product.supplier_id === candidate.supplierId)
    ) {
      return [{ kind: "supplier_sku" as const, id: product.id, label: product.name }];
    }
    if (sourceUrl && canonicalUrl(product.source_url) === sourceUrl)
      return [{ kind: "source_url" as const, id: product.id, label: product.name }];
    if (name && normalise(product.name) === name)
      return [{ kind: "name" as const, id: product.id, label: product.name }];
    return [];
  });
}

export function assessProductKnowledge(input: {
  title: string | null | undefined;
  description: string | null | undefined;
  specifications: string[];
  features: string[];
  brand: string | null | undefined;
  brandClassification: EvidenceClassification;
  imageCount: number;
  duplicateImagesRemoved: number;
  supplierSku: string | null | undefined;
  stockStatus: "available" | "unavailable" | "preorder" | "unknown" | "not_checked";
}): ProductKnowledgeAssessment {
  const facts: string[] = [];
  const supplierClaims: string[] = [];
  const requiresVerification: string[] = [];
  const blockers: string[] = [];

  if (text(input.title)) facts.push("Product title was obtained from the supplier source.");
  else blockers.push("A source-backed product title is required.");
  if (text(input.supplierSku))
    facts.push("Supplier SKU/product ID is present for duplicate protection.");
  else blockers.push("Supplier SKU/product ID is missing.");
  if (text(input.description) || input.specifications.length || input.features.length)
    supplierClaims.push(
      "Descriptions, specifications and features remain supplier-sourced claims until reviewed.",
    );
  else blockers.push("No source-backed description or specification was found.");
  if (input.imageCount)
    facts.push(
      `${input.imageCount} unique supplier image${input.imageCount === 1 ? "" : "s"} retained.`,
    );
  else blockers.push("At least one permitted product image is required.");
  if (input.duplicateImagesRemoved)
    facts.push(
      `${input.duplicateImagesRemoved} duplicate image reference${input.duplicateImagesRemoved === 1 ? " was" : "s were"} removed.`,
    );
  if (text(input.brand)) {
    if (input.brandClassification === "VERIFIED_FACT")
      facts.push("Brand has direct structured product evidence.");
    else
      requiresVerification.push(
        "Brand is not direct product evidence and remains blank until verified.",
      );
  }
  if (input.stockStatus === "unknown" || input.stockStatus === "not_checked")
    requiresVerification.push("Supplier availability is not yet known.");
  else
    supplierClaims.push(
      "Supplier availability is a current supplier signal, not an exact stock quantity.",
    );

  return {
    action: blockers.length ? "BLOCK" : requiresVerification.length ? "VERIFY" : "AUTO",
    facts,
    supplierClaims,
    requiresVerification,
    blockers,
  };
}

export function assessPricingKnowledge(input: {
  supplierCost: number | null;
  supplierRrp: number | null;
  marketPrice: number | null;
  marketPriceSourceUrl: string | null | undefined;
  sellingPrice: number | null;
}): PricingKnowledgeAssessment {
  const facts: string[] = [];
  const requiresVerification: string[] = [];
  const blockers: string[] = [];
  if (input.supplierCost != null)
    facts.push("Supplier cost is retained separately from retail-price signals.");
  else blockers.push("A confirmed supplier cost is required before approval.");
  if (input.supplierRrp != null)
    requiresVerification.push("Supplier RRP is not a South African competitor benchmark.");
  if (input.marketPrice != null && canonicalUrl(input.marketPriceSourceUrl))
    facts.push("A competitor benchmark has a source URL for review.");
  else
    requiresVerification.push(
      "A current comparable South African market price and source are required for a competitive-price decision.",
    );
  if (input.sellingPrice == null || input.sellingPrice <= 0)
    blockers.push("A non-zero selling price is required before draft.");
  return {
    action: blockers.length ? "BLOCK" : requiresVerification.length ? "VERIFY" : "AUTO",
    facts,
    requiresVerification,
    blockers,
  };
}

export function classifySupplierEvidence(input: {
  websiteUrl: string | null | undefined;
  contactInformation: string | null | undefined;
  policyReference: string | null | undefined;
  sourceProductUrl: string | null | undefined;
  conflictingDomain: boolean;
}): {
  outcome: "VERIFIED" | "PROVISIONALLY_VERIFIED" | "NEEDS_MORE_EVIDENCE" | "HIGH_RISK" | "REJECTED";
  entries: Array<{ label: string; classification: EvidenceClassification }>;
} {
  const entries: Array<{ label: string; classification: EvidenceClassification }> = [];
  // A URL supplied in a form is a lead, not proof that the company or terms
  // behind it are genuine. It becomes evidence only after the authorised
  // product-source importer or a human review has inspected it.
  if (canonicalUrl(input.websiteUrl))
    entries.push({ label: "Public supplier website to inspect", classification: "UNVERIFIED" });
  if (canonicalUrl(input.sourceProductUrl))
    entries.push({ label: "Supplier product source", classification: "SUPPLIER_CLAIM" });
  if (text(input.contactInformation))
    entries.push({ label: "Supplier contact detail", classification: "SUPPLIER_CLAIM" });
  if (text(input.policyReference))
    entries.push({ label: "Policy or agreement reference", classification: "SUPPLIER_CLAIM" });
  if (input.conflictingDomain) {
    entries.push({
      label: "Conflicting recognised domain",
      classification: "CONFLICTING_INFORMATION",
    });
    return { outcome: "REJECTED", entries };
  }
  if (entries.some((entry) => entry.classification === "VERIFIED_FACT") && entries.length >= 3)
    return { outcome: "PROVISIONALLY_VERIFIED", entries };
  if (entries.length) return { outcome: "NEEDS_MORE_EVIDENCE", entries };
  return {
    outcome: "HIGH_RISK",
    entries: [{ label: "No public source supplied", classification: "UNVERIFIED" }],
  };
}
