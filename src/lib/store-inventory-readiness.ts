export type IntakeRequirementClass = "required" | "inherited" | "auto_derived" | "optional";
export type IntakeReadinessStage = "draft" | "approval" | null;

export type IntakeReadinessItem = {
  id: string;
  label: string;
  classification: IntakeRequirementClass;
  requiredBefore: IntakeReadinessStage;
  satisfied: boolean;
};

export type ProductReadinessInput = {
  supplierRecognised: boolean;
  sourceUrl: string;
  name: string;
  supplierProductRef: string;
  category: string;
  shortDescription: string;
  description: string;
  imageCount: number;
  businessModel: string;
  supplierCost: number | null;
  finalSellingPrice: number | null;
  stockStatus: string;
  fulfilmentProfileSelected: boolean;
  stockOrigin: string;
  deliveryResolved: boolean;
  freeShippingResolved: boolean;
  supplierCostConfirmed: boolean;
  stockConfirmed: boolean;
};

export type ProductReadiness = {
  items: IntakeReadinessItem[];
  draftMissing: IntakeReadinessItem[];
  approvalMissing: IntakeReadinessItem[];
  operationalMissing: IntakeReadinessItem[];
  draftReady: boolean;
  approvalReady: boolean;
};

const hasText = (value: string) => Boolean(value.trim());

function physicalProduct(model: string) {
  return model !== "affiliate" && model !== "marketplace";
}

export function buildProductReadiness(input: ProductReadinessInput): ProductReadiness {
  const requiresPhysicalProductData = physicalProduct(input.businessModel);
  const items: IntakeReadinessItem[] = [
    {
      id: "supplier",
      label: "Select a recognised supplier",
      classification: "required",
      requiredBefore: "draft",
      satisfied: input.supplierRecognised,
    },
    {
      id: "source-url",
      label: "Paste a supplier product URL",
      classification: "required",
      requiredBefore: "draft",
      satisfied: hasText(input.sourceUrl),
    },
    {
      id: "title",
      label: "Add a customer product title",
      classification: "required",
      requiredBefore: "draft",
      satisfied: hasText(input.name),
    },
    {
      id: "supplier-sku",
      label: "Capture the supplier SKU / product ID",
      classification: "required",
      requiredBefore: requiresPhysicalProductData ? "draft" : null,
      satisfied: !requiresPhysicalProductData || hasText(input.supplierProductRef),
    },
    {
      id: "category",
      label: "Choose a Cossa category",
      classification: "required",
      requiredBefore: "draft",
      satisfied: hasText(input.category),
    },
    {
      id: "short-description",
      label: "Add a short customer description",
      classification: "required",
      requiredBefore: "draft",
      satisfied: hasText(input.shortDescription),
    },
    {
      id: "description",
      label: "Add a full customer description",
      classification: "required",
      requiredBefore: "draft",
      satisfied: hasText(input.description),
    },
    {
      id: "images",
      label: "Add at least one product image",
      classification: "required",
      requiredBefore: "draft",
      satisfied: input.imageCount > 0,
    },
    {
      id: "supplier-cost",
      label: "Enter a supplier cost",
      classification: "required",
      requiredBefore: requiresPhysicalProductData ? "draft" : null,
      satisfied: !requiresPhysicalProductData || input.supplierCost != null,
    },
    {
      id: "final-price",
      label: "Set a final selling price",
      classification: "auto_derived",
      requiredBefore: "draft",
      satisfied: input.finalSellingPrice != null && input.finalSellingPrice > 0,
    },
    {
      id: "stock-status",
      label: "Confirm a stock availability state",
      classification: "required",
      requiredBefore: requiresPhysicalProductData ? "draft" : null,
      satisfied:
        !requiresPhysicalProductData ||
        (input.stockStatus !== "not_checked" &&
          input.stockStatus !== "unknown" &&
          Boolean(input.stockStatus)),
    },
    {
      id: "fulfilment-profile",
      label: "Select or inherit a fulfilment profile",
      classification: "inherited",
      requiredBefore: "draft",
      satisfied: input.fulfilmentProfileSelected,
    },
    {
      id: "stock-origin",
      label: "Confirm the stock origin",
      classification: "inherited",
      requiredBefore: requiresPhysicalProductData ? "draft" : null,
      satisfied: !requiresPhysicalProductData || hasText(input.stockOrigin),
    },
    {
      id: "delivery-rule",
      label: "Resolve the delivery rule from the fulfilment profile",
      classification: "inherited",
      requiredBefore: "draft",
      satisfied: input.deliveryResolved && input.freeShippingResolved,
    },
    {
      id: "supplier-cost-confirmation",
      label: "Supplier cost must be confirmed",
      classification: "required",
      requiredBefore: requiresPhysicalProductData ? "approval" : null,
      satisfied: !requiresPhysicalProductData || input.supplierCostConfirmed,
    },
    {
      id: "stock-confirmation",
      label: "Current supplier stock must be confirmed",
      classification: "required",
      requiredBefore: requiresPhysicalProductData ? "approval" : null,
      satisfied: !requiresPhysicalProductData || input.stockConfirmed,
    },
    {
      id: "brand",
      label: "Brand (optional; use Unbranded / Generic where applicable)",
      classification: "optional",
      requiredBefore: null,
      satisfied: true,
    },
    {
      id: "competitor-benchmark",
      label: "Competitive benchmark (optional)",
      classification: "optional",
      requiredBefore: null,
      satisfied: true,
    },
  ];

  const draftMissing = items.filter((item) => item.requiredBefore === "draft" && !item.satisfied);
  const approvalOnlyMissing = items.filter(
    (item) => item.requiredBefore === "approval" && !item.satisfied,
  );
  const approvalMissing = [...draftMissing, ...approvalOnlyMissing];
  const operationalIds = new Set(["fulfilment-profile", "stock-origin", "delivery-rule"]);
  const operationalMissing = items.filter((item) => operationalIds.has(item.id) && !item.satisfied);

  return {
    items,
    draftMissing,
    approvalMissing,
    operationalMissing,
    draftReady: draftMissing.length === 0,
    approvalReady: approvalMissing.length === 0,
  };
}
