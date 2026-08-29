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
