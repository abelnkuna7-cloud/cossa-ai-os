export type PublicationBlocker = {
  code: string;
  message: string;
};

export type CustomerStorePreview = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string | null;
  shortDescription: string | null;
  description: string | null;
  features: string[];
  specifications: string | null;
  imageUrls: string[];
  availability: string | null;
  fulfilmentLabel: string;
  deliveryNotice: string | null;
  returnsNotice: string | null;
  warrantyNotice: string | null;
  freeShippingEligible: boolean;
  price: number | null;
  compareAtPrice: number | null;
  productType: string;
  fulfilmentModel: string;
};

export type PublicationPreflight = {
  ready: boolean;
  blockers: PublicationBlocker[];
  customer: CustomerStorePreview | null;
};

const INTERNAL_FIELD_NAMES = new Set([
  "supplierCost",
  "costPrice",
  "grossProfit",
  "grossMargin",
  "supplierName",
  "supplierUrl",
  "supplierProductRef",
  "supplierAccount",
  "supplierNotes",
  "operationalNotes",
  "marketPrice",
  "competitor",
  "importTrace",
  "registryId",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalisePublicationPreflight(value: unknown): PublicationPreflight {
  const source = isRecord(value) ? value : {};
  const customer = isRecord(source.customer) ? source.customer : null;
  return {
    ready: source.ready === true,
    blockers: Array.isArray(source.blockers)
      ? source.blockers.filter(isRecord).map((blocker) => ({
          code: typeof blocker.code === "string" ? blocker.code : "publication_blocked",
          message:
            typeof blocker.message === "string"
              ? blocker.message
              : "This product needs more customer-facing information.",
        }))
      : [],
    customer: customer
      ? {
          name: typeof customer.name === "string" ? customer.name : "",
          slug: typeof customer.slug === "string" ? customer.slug : "",
          sku: typeof customer.sku === "string" ? customer.sku : "",
          category: typeof customer.category === "string" ? customer.category : "",
          brand:
            typeof customer.brand === "string" && customer.brand.trim() ? customer.brand : null,
          shortDescription:
            typeof customer.shortDescription === "string" ? customer.shortDescription : null,
          description: typeof customer.description === "string" ? customer.description : null,
          features: strings(customer.features),
          specifications:
            typeof customer.specifications === "string" ? customer.specifications : null,
          imageUrls: strings(customer.imageUrls),
          availability: typeof customer.availability === "string" ? customer.availability : null,
          fulfilmentLabel:
            typeof customer.fulfilmentLabel === "string" ? customer.fulfilmentLabel : "",
          deliveryNotice:
            typeof customer.deliveryNotice === "string" ? customer.deliveryNotice : null,
          returnsNotice: typeof customer.returnsNotice === "string" ? customer.returnsNotice : null,
          warrantyNotice:
            typeof customer.warrantyNotice === "string" ? customer.warrantyNotice : null,
          freeShippingEligible: customer.freeShippingEligible === true,
          price: numberOrNull(customer.price),
          compareAtPrice: numberOrNull(customer.compareAtPrice),
          productType: typeof customer.productType === "string" ? customer.productType : "",
          fulfilmentModel:
            typeof customer.fulfilmentModel === "string" ? customer.fulfilmentModel : "",
        }
      : null,
  };
}

export function previewHasNoInternalFields(value: unknown): boolean {
  if (!isRecord(value)) return true;
  return (
    Object.entries(value).every(([, nested]) => {
      if (Array.isArray(nested)) return nested.every(previewHasNoInternalFields);
      return !isRecord(nested) || previewHasNoInternalFields(nested);
    }) && Object.keys(value).every((key) => !INTERNAL_FIELD_NAMES.has(key))
  );
}

export function validCompareAtPrice(
  compareAtPrice: number | null,
  sellingPrice: number | null,
): boolean {
  return compareAtPrice == null || (sellingPrice != null && compareAtPrice >= sellingPrice);
}

export function selectedFinalPrice(input: {
  sellingPriceOverride: number | null;
  calculatedSellingPrice: number | null;
}): number | null {
  return input.sellingPriceOverride ?? input.calculatedSellingPrice;
}
