export type PricingSnapshot = {
  calculatedSellingPrice: number | null;
  sellingPrice: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  hasManualOverride: boolean;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validNonNegativeNumber(value: number | null): boolean {
  return value != null && Number.isFinite(value) && value >= 0;
}

export function calculatePricing(input: {
  supplierCost: number | null;
  markupPercent: number | null;
  sellingPriceOverride?: number | null;
}): PricingSnapshot {
  const cost = input.supplierCost;
  const markup = input.markupPercent;
  const override = input.sellingPriceOverride ?? null;
  const canCalculate =
    cost != null &&
    markup != null &&
    validNonNegativeNumber(cost) &&
    cost > 0 &&
    validNonNegativeNumber(markup);
  const calculatedSellingPrice =
    canCalculate && cost != null && markup != null ? roundMoney(cost * (1 + markup / 100)) : null;
  const sellingPrice =
    override != null && Number.isFinite(override) && override > 0
      ? roundMoney(override)
      : calculatedSellingPrice;
  const grossProfit = sellingPrice != null && cost != null ? roundMoney(sellingPrice - cost) : null;
  const grossMarginPercent =
    sellingPrice != null && sellingPrice > 0 && grossProfit != null
      ? (grossProfit / sellingPrice) * 100
      : null;

  return {
    calculatedSellingPrice,
    sellingPrice,
    grossProfit,
    grossMarginPercent,
    hasManualOverride: override != null && Number.isFinite(override) && override > 0,
  };
}

export type CompetitorComparison = {
  differenceRand: number | null;
  differencePercent: number | null;
  label: string;
  status: "Competitive" | "Near Market" | "Above Market" | "Margin Too Low" | null;
};

export function compareWithMarket(input: {
  cossaPrice: number | null;
  marketPrice: number | null;
  grossMarginPercent: number | null;
}): CompetitorComparison {
  if (!input.cossaPrice || !input.marketPrice || input.marketPrice <= 0) {
    return {
      differenceRand: null,
      differencePercent: null,
      label: "Competitor benchmark not checked",
      status: null,
    };
  }

  const differenceRand = roundMoney(input.marketPrice - input.cossaPrice);
  const differencePercent = (differenceRand / input.marketPrice) * 100;
  const label =
    differenceRand > 0
      ? `${Math.abs(differenceRand).toFixed(2)} cheaper`
      : differenceRand < 0
        ? `${Math.abs(differenceRand).toFixed(2)} above benchmark`
        : "At benchmark";
  const status =
    input.grossMarginPercent != null && input.grossMarginPercent < 10
      ? "Margin Too Low"
      : differencePercent >= 10
        ? "Competitive"
        : differencePercent >= -10
          ? "Near Market"
          : "Above Market";
  return { differenceRand, differencePercent, label, status };
}

export function inheritSupplierDefaults<
  T extends {
    supplierId: string;
    fulfilmentProfileId: string;
    businessModel: string;
    stockOrigin: string;
  },
>(input: {
  current: T;
  supplier: { id: string; businessModel: string; stockOrigin: string | null } | null;
  profileId: string | null;
}): T {
  if (!input.supplier) return input.current;
  return {
    ...input.current,
    supplierId: input.supplier.id,
    businessModel: input.supplier.businessModel,
    stockOrigin: input.supplier.stockOrigin ?? "",
    fulfilmentProfileId: input.profileId ?? "",
  };
}
