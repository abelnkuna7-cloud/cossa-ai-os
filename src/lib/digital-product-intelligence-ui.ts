import type {
  DigitalProductProfile,
  DigitalProductSubtype,
} from "./digital-product-intelligence.ts";
import {
  DIGITAL_PRODUCT_SUBTYPE_LABELS,
  digitalProductFieldLabel,
  evaluateDigitalProductProfile,
  inferDigitalSubtypeWithEvidence,
} from "./digital-product-intelligence.ts";

export type DigitalProductDraftContext = {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  sellingPrice?: number | null;
  persistedSellingPrice?: number | null;
  fileNames?: string[];
  profile?: Partial<DigitalProductProfile> | null;
};

export type SellingPriceState = "saved" | "entered_unsaved" | "missing";

function positiveFinite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function buildDigitalProductAssistant(context: DigitalProductDraftContext) {
  const inference = inferDigitalSubtypeWithEvidence(context);
  const selectedSubtype = context.profile?.subtype ?? "other";
  const profile = {
    ...(context.profile ?? {}),
    subtype: selectedSubtype,
  } as Partial<DigitalProductProfile>;
  const readiness = evaluateDigitalProductProfile(profile);
  const enteredPrice = positiveFinite(context.sellingPrice);
  const persistedPrice = positiveFinite(context.persistedSellingPrice);
  const sellingPriceState: SellingPriceState = enteredPrice
    ? persistedPrice === enteredPrice
      ? "saved"
      : "entered_unsaved"
    : "missing";

  return {
    proposedSubtype: inference.subtype,
    proposedSubtypeLabel: DIGITAL_PRODUCT_SUBTYPE_LABELS[inference.subtype],
    proposedSubtypeEvidence: inference.evidenceSources,
    selectedSubtype,
    selectedSubtypeLabel: DIGITAL_PRODUCT_SUBTYPE_LABELS[selectedSubtype],
    metadataScore: readiness.score,
    missingMetadata: readiness.missing.map((field) =>
      typeof field === "string"
        ? digitalProductFieldLabel(field as keyof DigitalProductProfile)
        : field,
    ),
    sellingPriceState,
    notices: [
      "Subtype classification is a proposal based only on the supplied product text and file names.",
      "Unknown factual metadata must remain unknown; do not invent it to improve readiness.",
      ...(sellingPriceState === "entered_unsaved"
        ? ["Selling price is entered in the current form but is not yet persisted."]
        : []),
    ],
  };
}

export function mergeDraftPreflightIssues(
  persistedIssues: string[],
  context: DigitalProductDraftContext,
) {
  const assistant = buildDigitalProductAssistant(context);
  return persistedIssues.map((issue) =>
    /selling price/i.test(issue) && assistant.sellingPriceState === "entered_unsaved"
      ? "Selling price entered — save draft to persist it"
      : issue,
  );
}

export function getDigitalSubtypeOptions() {
  return Object.entries(DIGITAL_PRODUCT_SUBTYPE_LABELS).map(([value, label]) => ({
    value: value as DigitalProductSubtype,
    label,
  }));
}

export function shouldUseDigitalProductIntelligence(productType: string): boolean {
  return productType === "digital";
}
