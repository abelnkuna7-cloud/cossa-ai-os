export function canPublishInventoryLifecycle(currentStatus: string): boolean {
  return currentStatus === "approved";
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
