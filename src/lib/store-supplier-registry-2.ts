export type VerificationOutcome =
  | "VERIFIED"
  | "PROVISIONALLY_VERIFIED"
  | "NEEDS_MORE_EVIDENCE"
  | "HIGH_RISK"
  | "REJECTED";
export type SupplierDependencyCounts = {
  intakes: number;
  importBatches: number;
  importEvents: number;
  fulfilmentProfiles: number;
  orders: number;
  pricingAudit: number;
};

export function supplierDeletionEligibility(dependencies: SupplierDependencyCounts) {
  const entries = Object.entries(dependencies).filter(([, count]) => count > 0);
  return entries.length
    ? {
        allowed: false,
        reason: `Cannot permanently delete this supplier because ${entries.map(([name, count]) => `${count} ${name}`).join(", ")} reference it. Archive instead.`,
      }
    : { allowed: true, reason: null };
}
export function supplierVerificationTransition(input: {
  outcome: VerificationOutcome;
  activate: boolean;
  conflictingDomain: boolean;
}) {
  if (input.conflictingDomain)
    return { verificationStatus: "REJECTED" as const, canActivate: false, requiresReview: true };
  return {
    verificationStatus: input.outcome,
    canActivate: input.outcome === "VERIFIED" || input.outcome === "PROVISIONALLY_VERIFIED",
    requiresReview: input.outcome !== "VERIFIED",
  };
}
export function changedSupplierFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
) {
  const reverify = new Set([
    "source_url",
    "contact_information",
    "recognised_domains",
    "account_reference",
    "returns_notes",
    "warranty_notes",
    "default_fulfilment_profile_code",
  ]);
  return Object.keys(next)
    .filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]))
    .map((field) => ({
      field,
      oldValue: previous[field] ?? null,
      newValue: next[field] ?? null,
      requiresReverification: reverify.has(field),
    }));
}
