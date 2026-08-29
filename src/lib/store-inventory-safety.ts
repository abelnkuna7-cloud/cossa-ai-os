export type InventoryIntakeLifecycle = "imported" | "review" | "draft" | "approved";

export function canAdvanceInventoryIntake(
  currentStatus: InventoryIntakeLifecycle,
  nextStatus: InventoryIntakeLifecycle,
): boolean {
  return (
    currentStatus === nextStatus ||
    (currentStatus === "imported" && nextStatus === "review") ||
    (currentStatus === "review" && nextStatus === "draft") ||
    (currentStatus === "draft" && nextStatus === "approved")
  );
}

export function saveStatusForInventoryIntake(
  sourceId: string | undefined,
  currentStatus: InventoryIntakeLifecycle,
): InventoryIntakeLifecycle {
  // New records enter review; an existing approved record remains approved
  // when the CEO saves edits to its internal or customer-safe copy.
  return sourceId ? currentStatus : "review";
}

export function canPublishInventoryLifecycle(currentStatus: string): boolean {
  // Publication is intentionally held back while catalogue sync is reviewed.
  return currentStatus === "approved" && false;
}

export function customerSafeStoreProjection(input: {
  name: string;
  price: number;
  imageUrls: string[];
  customerFulfilmentLabel: string | null;
  customerDeliveryNotice: string | null;
  customerReturnsNotice: string | null;
  customerWarrantyNotice: string | null;
}): typeof input {
  return { ...input, imageUrls: [...input.imageUrls] };
}
