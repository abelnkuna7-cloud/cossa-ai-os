import type { DigitalProductProfile, DigitalProductSubtype } from "./digital-product-intelligence";
import { DIGITAL_PRODUCT_SUBTYPE_LABELS, evaluateDigitalProductProfile, inferDigitalSubtype } from "./digital-product-intelligence";
export type DigitalProductDraftContext = { name?: string | null; category?: string | null; description?: string | null; sellingPrice?: number | null; persistedSellingPrice?: number | null; fileNames?: string[]; profile?: Partial<DigitalProductProfile> | null; };
export function buildDigitalProductAssistant(context: DigitalProductDraftContext) {
  const proposedSubtype: DigitalProductSubtype = context.profile?.subtype ?? inferDigitalSubtype(context);
  const profile = { ...(context.profile ?? {}), subtype: proposedSubtype } as Partial<DigitalProductProfile>;
  const readiness = evaluateDigitalProductProfile(profile);
  const sellingPriceState = (context.persistedSellingPrice ?? 0) > 0 ? "saved" : (context.sellingPrice ?? 0) > 0 ? "entered_unsaved" : "missing";
  return { proposedSubtype, proposedSubtypeLabel: DIGITAL_PRODUCT_SUBTYPE_LABELS[proposedSubtype], metadataScore: readiness.score, missingMetadata: readiness.missing, sellingPriceState, notices: ["AI classification is a proposal until supported by product evidence.", "Unknown factual metadata must remain unknown; do not invent it to improve readiness.", ...(sellingPriceState === "entered_unsaved" ? ["Selling price is entered in the current form but is not yet persisted."] : [])] };
}
export function mergeDraftPreflightIssues(persistedIssues: string[], context: DigitalProductDraftContext) {
  const assistant = buildDigitalProductAssistant(context);
  return persistedIssues.map((issue) => issue.toLowerCase().includes("selling price") && assistant.sellingPriceState === "entered_unsaved" ? "Selling price entered — save draft to persist it" : issue);
}
export function getDigitalSubtypeOptions() {
  return Object.entries(DIGITAL_PRODUCT_SUBTYPE_LABELS).map(([value, label]) => ({ value: value as DigitalProductSubtype, label }));
}
