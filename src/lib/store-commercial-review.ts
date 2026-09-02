import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import {
  assessLocalSourceCandidate,
  reviewCommercialCompetitiveness,
  type CommercialEvidenceItem,
  type CommercialReview,
  type EvidenceState,
  type MarketMatchStrength,
  type SupplierPriority,
} from "@/lib/store-commercial-competitiveness";

type ProductStatus = "draft" | "active" | "archived";
type InventorySourceStatus =
  | "verified"
  | "manual"
  | "stale"
  | "not_connected"
  | "failed"
  | "unknown";

type StoreCommercialProduct = {
  id: string;
  name: string;
  sku: string | null;
  status: ProductStatus;
  supplier_name: string | null;
  supplier_product_ref: string | null;
  supplier_url: string | null;
  product_type: string;
  fulfilment_model: string;
  inventory_ownership: string | null;
  inventory_source_status: InventorySourceStatus | null;
  inventory_source_reference: string | null;
  cost_price: number | string | null;
  price: number | string | null;
  source_currency: string | null;
  source_cost: number | string | null;
  fx_rate_to_zar: number | string | null;
  inventory_last_verified_at: string | null;
};

type IntakeCommercialEvidence = {
  id: string;
  publication_store_product_id: string | null;
  supplier_cost: number | string | null;
  supplier_cost_confirmed: boolean | null;
  supplier_cost_confirmed_at: string | null;
  supplier_cost_source_label: string | null;
  stock_confirmed: boolean | null;
  stock_confirmed_at: string | null;
  market_price: number | string | null;
  market_price_source_url: string | null;
  market_price_notes: string | null;
  last_price_checked_at: string | null;
};

type StoreProductVariant = {
  id: string;
  product_id: string;
  title: string | null;
  source_currency: string | null;
  source_cost: number | string | null;
  fx_rate_to_zar: number | string | null;
  price_zar: number | string | null;
  cost_zar: number | string | null;
  is_default: boolean | null;
  is_available: boolean | null;
  availability_source_status: InventorySourceStatus | null;
  availability_source_reference: string | null;
  availability_last_verified_at: string | null;
  raw_provider_data: unknown;
  updated_at: string | null;
};

type SupplierRecord = {
  name: string;
  status: string;
  registry_status: string | null;
  stock_origin: string | null;
};

export type CommercialReviewItem = {
  id: string;
  name: string;
  sku: string | null;
  supplierName: string | null;
  supplierPriority: SupplierPriority;
  fulfilmentModel: string;
  currentSellingPriceZar: number | null;
  reviewedVariant: {
    title: string | null;
    sourceProductCostZar: number | null;
    supplierFreightZar: number | null;
    quoteCheckedAt: string | null;
    sourceLabel: string | null;
  } | null;
  review: CommercialReview;
  marketEvidence: {
    sourceUrl: string | null;
    checkedAt: string | null;
    note: string | null;
  };
  inventoryLastVerifiedAt: string | null;
};

const db = asDynamicSupabaseClient(supabase);
const MINIMUM_COMMERCIAL_MARGIN_PERCENT = 35;

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amountInZar(input: {
  amount: number | string | null;
  currency: string | null;
  fxRateToZar: number | string | null;
}): number | null {
  const amount = asNumber(input.amount);
  if (amount == null) return null;
  const currency = normalise(input.currency);
  if (!currency || currency === "zar") return amount;
  const fxRate = asNumber(input.fxRateToZar);
  return fxRate == null ? null : money(amount * fxRate);
}

type VariantCommercialQuote = {
  sourceProductCostZar: number | null;
  supplierFreightZar: number | null;
  preDutySupplierAndFreightZar: number | null;
  quoteCheckedAt: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  dutiesTaxesFeesEvidence: EvidenceState;
  freightEvidence: EvidenceState;
};

/**
 * Reads only structured values already saved from the supplier result. The
 * `landed_zar` field is explicitly labelled pre-duty by the quote structure;
 * it must never be promoted to a complete landed cost while import charges are
 * unknown.
 */
function commercialQuoteFromVariant(
  variant: StoreProductVariant | null,
): VariantCommercialQuote | null {
  if (!variant) return null;
  const raw = asRecord(variant.raw_provider_data);
  const commercial = asRecord(raw?.commercial);
  const source = asString(raw?.source) ?? asString(variant.availability_source_reference);
  const fxRate = asNumber(commercial?.fx_zar_per_usd) ?? asNumber(variant.fx_rate_to_zar);
  const sourceProductCostZar = amountInZar({
    amount: variant.source_cost,
    currency: variant.source_currency,
    fxRateToZar: fxRate,
  });
  const shippingUsd = asNumber(commercial?.shipping_usd);
  const supplierFreightZar =
    shippingUsd != null && fxRate != null ? money(shippingUsd * fxRate) : null;
  const rawPreDuty = asNumber(commercial?.landed_zar);
  const preDutySupplierAndFreightZar =
    rawPreDuty ??
    (sourceProductCostZar != null && supplierFreightZar != null
      ? money(sourceProductCostZar + supplierFreightZar)
      : null);
  const quoteCheckedAt = asString(commercial?.priced_at) ?? variant.updated_at;

  return {
    sourceProductCostZar,
    supplierFreightZar,
    preDutySupplierAndFreightZar,
    quoteCheckedAt,
    sourceLabel: source,
    sourceUrl: null,
    dutiesTaxesFeesEvidence: "unknown",
    freightEvidence: supplierFreightZar == null ? "unknown" : "verified",
  };
}

function reviewVariant(variants: StoreProductVariant[]): StoreProductVariant | null {
  if (!variants.length) return null;
  return (
    variants.find((variant) => variant.is_default && variant.is_available !== false) ??
    variants.find((variant) => variant.is_available !== false) ??
    variants.find((variant) => variant.is_default) ??
    variants[0] ??
    null
  );
}

function availabilityEvidenceFor(
  product: StoreCommercialProduct,
  variant: StoreProductVariant | null,
  intake: IntakeCommercialEvidence | undefined,
): EvidenceState {
  if (variant?.availability_source_status === "verified") return "verified";
  if (intake?.stock_confirmed && intake.stock_confirmed_at) return "verified";
  return product.inventory_source_status === "verified" ? "verified" : "unknown";
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function supplierPriorityFor(
  product: StoreCommercialProduct,
  suppliers: SupplierRecord[],
): SupplierPriority {
  if (product.inventory_ownership === "cossa_owned" || product.fulfilment_model === "cossa_stock")
    return "COSSA_OWNED_OR_LOCAL_STOCK";
  if (product.product_type === "affiliate" || product.fulfilment_model === "affiliate")
    return "AFFILIATE_OR_PARTNER";
  if (product.fulfilment_model === "international_dropshipping")
    return "INTERNATIONAL_DROPSHIPPING";

  const supplier = suppliers.find(
    (item) => normalise(item.name) === normalise(product.supplier_name),
  );
  if (
    supplier &&
    supplier.status === "active" &&
    supplier.registry_status === "active" &&
    /south africa/i.test(supplier.stock_origin ?? "")
  ) {
    return "APPROVED_SOUTH_AFRICAN_SUPPLIER";
  }
  return "VERIFIED_LOCAL_SUPPLIER";
}

function sourceCostInZar(product: StoreCommercialProduct): number | null {
  return amountInZar({
    amount: product.source_cost,
    currency: product.source_currency,
    fxRateToZar: product.fx_rate_to_zar,
  });
}

function localSourceMatch(
  product: StoreCommercialProduct,
  products: StoreCommercialProduct[],
  suppliers: SupplierRecord[],
) {
  const sourceRef = normalise(product.supplier_product_ref);
  if (!sourceRef) return null;
  const candidate = products.find((item) => {
    if (item.id === product.id || item.status === "archived") return false;
    if (normalise(item.supplier_product_ref) !== sourceRef) return false;
    const priority = supplierPriorityFor(item, suppliers);
    return [
      "COSSA_OWNED_OR_LOCAL_STOCK",
      "APPROVED_SOUTH_AFRICAN_SUPPLIER",
      "VERIFIED_LOCAL_SUPPLIER",
    ].includes(priority);
  });
  if (!candidate) return null;
  return assessLocalSourceCandidate({
    supplierName: candidate.supplier_name ?? "Cossa local stock",
    supplierPriority: supplierPriorityFor(candidate, suppliers),
    modelIdentifiers: [sourceRef],
    landedCostZar: asNumber(candidate.cost_price),
    // Availability verification is not a landed-cost verification. A reviewer
    // must still confirm this before a local replacement can be recommended.
    landedCostVerified: false,
  });
}

function commercialEvidenceFor(input: {
  product: StoreCommercialProduct;
  intake: IntakeCommercialEvidence | undefined;
  variant: StoreProductVariant | null;
  quote: VariantCommercialQuote | null;
  availability: EvidenceState;
  marketMatchStrength: MarketMatchStrength;
  localMatch: ReturnType<typeof localSourceMatch>;
}): CommercialEvidenceItem[] {
  const sourceLabel = input.quote?.sourceLabel ?? input.product.supplier_name ?? "Supplier record";
  const supplierCost =
    input.quote?.sourceProductCostZar ??
    (input.intake?.supplier_cost_confirmed ? asNumber(input.intake.supplier_cost) : null) ??
    sourceCostInZar(input.product);
  const supplierCostState: EvidenceState =
    input.quote?.sourceProductCostZar != null ||
    (input.intake?.supplier_cost_confirmed && input.intake.supplier_cost_confirmed_at)
      ? "verified"
      : "unknown";
  const cossaPrice = asNumber(input.variant?.price_zar) ?? asNumber(input.product.price);
  const cossaPriceObservedAt =
    input.variant?.updated_at ?? input.product.inventory_last_verified_at;
  const localMatchEvidence = input.localMatch;

  return [
    {
      kind: "SUPPLIER_PRODUCT_COST",
      state: supplierCostState,
      sourceLabel:
        input.intake?.supplier_cost_source_label ?? `${sourceLabel} product/variant record`,
      sourceUrl: input.product.supplier_url,
      observedAt: input.quote?.quoteCheckedAt ?? input.intake?.supplier_cost_confirmed_at ?? null,
      valueZar: supplierCost,
      note:
        supplierCostState === "verified"
          ? "Supplier product cost is retained separately from freight and import costs."
          : "A current supplier cost still needs source confirmation.",
    },
    {
      kind: "SUPPLIER_FREIGHT",
      state: input.quote?.freightEvidence ?? "unknown",
      sourceLabel: input.quote?.sourceLabel ?? "No supplier freight quotation recorded",
      sourceUrl: input.quote?.sourceUrl ?? null,
      observedAt: input.quote?.quoteCheckedAt ?? null,
      valueZar: input.quote?.supplierFreightZar ?? null,
      note:
        input.quote?.preDutySupplierAndFreightZar != null
          ? `Supplier cost plus freight before duties/taxes: R${input.quote.preDutySupplierAndFreightZar.toFixed(2)}.`
          : "A current South Africa freight quotation is required.",
    },
    {
      kind: "DUTIES_TAXES_FEES",
      state: input.quote?.dutiesTaxesFeesEvidence ?? "unknown",
      sourceLabel: "No verified duty/tax/fee breakdown recorded",
      sourceUrl: null,
      observedAt: null,
      valueZar: null,
      note: "Unknown import components are not treated as zero.",
    },
    {
      kind: "COSSA_SELLING_PRICE",
      state: cossaPrice != null ? "verified" : "unknown",
      sourceLabel: input.variant
        ? "Current Cossa customer variant price"
        : "Current Cossa product price",
      sourceUrl: null,
      observedAt: cossaPriceObservedAt,
      valueZar: cossaPrice,
      note: input.variant?.title ? `Reviewed variant: ${input.variant.title}.` : null,
    },
    {
      kind: "SUPPLIER_AVAILABILITY",
      state: input.availability,
      sourceLabel:
        input.variant?.availability_source_reference ??
        input.product.inventory_source_reference ??
        input.product.supplier_name ??
        "Supplier availability record",
      sourceUrl: null,
      observedAt:
        input.variant?.availability_last_verified_at ??
        input.intake?.stock_confirmed_at ??
        input.product.inventory_last_verified_at,
      valueZar: null,
      note:
        input.availability === "verified"
          ? "Current availability is a supplier signal, not an assumed stock quantity."
          : "Availability needs a current supplier or staff confirmation.",
    },
    {
      kind: "SOUTH_AFRICAN_MARKET",
      state:
        input.intake?.market_price != null && input.intake.market_price_source_url
          ? "verified"
          : "unknown",
      sourceLabel: input.intake?.market_price_source_url
        ? "Saved market evidence"
        : "No market source recorded",
      sourceUrl: input.intake?.market_price_source_url ?? null,
      observedAt: input.intake?.last_price_checked_at ?? null,
      valueZar: asNumber(input.intake?.market_price),
      matchStrength: input.marketMatchStrength,
      note: input.intake?.market_price_source_url
        ? "A reviewer must record an exact or strong-comparable match before this price can influence a recommendation."
        : "No comparable South African market evidence is recorded.",
    },
    {
      kind: "LOCAL_SUPPLIER_MATCH",
      state: localMatchEvidence?.landedCostVerified ? "verified" : "unknown",
      sourceLabel: localMatchEvidence?.supplierName ?? "Approved local supplier registry search",
      sourceUrl: null,
      observedAt: null,
      valueZar: localMatchEvidence?.landedCostZar ?? null,
      matchStrength: localMatchEvidence?.matchStrength ?? null,
      note: localMatchEvidence
        ? localMatchEvidence.evidence.join(" ") || "Local candidate requires review."
        : "No deterministic approved-local equivalent was found.",
    },
  ];
}

/**
 * Loads the existing product and intake evidence without writing back to either
 * Store table. Market-price notes are useful evidence but have no structured
 * proof of a same-model match, so they begin as unverified in the review.
 */
export async function loadStoreCommercialReviews(): Promise<CommercialReviewItem[]> {
  const [productsResult, intakesResult, suppliersResult, variantsResult] = await Promise.all([
    db
      .from<StoreCommercialProduct>("store_products")
      .select(
        "id,name,sku,status,supplier_name,supplier_product_ref,supplier_url,product_type,fulfilment_model,inventory_ownership,inventory_source_status,inventory_source_reference,cost_price,price,source_currency,source_cost,fx_rate_to_zar,inventory_last_verified_at",
      )
      .order("updated_at", { ascending: false }),
    db
      .from<IntakeCommercialEvidence>("store_inventory_intakes")
      .select(
        "id,publication_store_product_id,supplier_cost,supplier_cost_confirmed,supplier_cost_confirmed_at,supplier_cost_source_label,stock_confirmed,stock_confirmed_at,market_price,market_price_source_url,market_price_notes,last_price_checked_at",
      ),
    db.from<SupplierRecord>("store_suppliers").select("name,status,registry_status,stock_origin"),
    db
      .from<StoreProductVariant>("store_product_variants")
      .select(
        "id,product_id,title,source_currency,source_cost,fx_rate_to_zar,price_zar,cost_zar,is_default,is_available,availability_source_status,availability_source_reference,availability_last_verified_at,raw_provider_data,updated_at",
      ),
  ]);
  if (productsResult.error)
    throw new Error(
      `Unable to load Store products for commercial review: ${productsResult.error.message}`,
    );
  if (intakesResult.error)
    throw new Error(`Unable to load saved market evidence: ${intakesResult.error.message}`);
  if (suppliersResult.error)
    throw new Error(`Unable to load the Supplier Registry: ${suppliersResult.error.message}`);
  if (variantsResult.error)
    throw new Error(`Unable to load supplier variant evidence: ${variantsResult.error.message}`);

  const products = productsResult.data ?? [];
  const intakesByProduct = new Map(
    (intakesResult.data ?? [])
      .filter((item) => item.publication_store_product_id)
      .map((item) => [item.publication_store_product_id!, item]),
  );
  const suppliers = suppliersResult.data ?? [];
  const variantsByProduct = new Map<string, StoreProductVariant[]>();
  for (const variant of variantsResult.data ?? []) {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.product_id, current);
  }

  return products
    .filter((product) => product.status === "active")
    .map((product) => {
      const intake = intakesByProduct.get(product.id);
      const priority = supplierPriorityFor(product, suppliers);
      const variant = reviewVariant(variantsByProduct.get(product.id) ?? []);
      const quote = commercialQuoteFromVariant(variant);
      const availability = availabilityEvidenceFor(product, variant, intake);
      const hasConfirmedIntakeCost = Boolean(
        intake?.supplier_cost_confirmed && intake.supplier_cost_confirmed_at,
      );
      const supplierProductCostZar =
        priority === "INTERNATIONAL_DROPSHIPPING"
          ? (quote?.sourceProductCostZar ?? sourceCostInZar(product))
          : hasConfirmedIntakeCost
            ? asNumber(intake?.supplier_cost)
            : null;
      const supplierProductCostEvidence: EvidenceState =
        priority === "INTERNATIONAL_DROPSHIPPING"
          ? quote?.sourceProductCostZar != null
            ? "verified"
            : "unknown"
          : hasConfirmedIntakeCost
            ? "verified"
            : "unknown";
      const marketMatchStrength: MarketMatchStrength = "NOT_COMPARABLE";
      const localMatch = localSourceMatch(product, products, suppliers);
      const currentSellingPriceZar = asNumber(variant?.price_zar) ?? asNumber(product.price);
      const evidence = commercialEvidenceFor({
        product,
        intake,
        variant,
        quote,
        availability,
        marketMatchStrength,
        localMatch,
      });
      const review = reviewCommercialCompetitiveness({
        productId: product.id,
        productName: product.name,
        currentSellingPriceZar,
        supplierPriority: priority,
        availabilityEvidence: availability,
        minimumGrossMarginPercent: MINIMUM_COMMERCIAL_MARGIN_PERCENT,
        cost: {
          supplierProductCostZar,
          supplierProductCostEvidence,
          internationalOrLocalFreightZar:
            priority === "INTERNATIONAL_DROPSHIPPING" ? (quote?.supplierFreightZar ?? null) : 0,
          currencyConversionZar: 0,
          dutiesTaxesFeesZar: null,
          paymentOperationalCostZar: null,
          // Older product `cost_price` values and CJ's pre-duty supplier-plus-
          // freight quote are useful evidence, but neither is a verified full
          // landed total without the import-cost treatment.
          recordedTotalLandedCostZar: null,
          recordedTotalLandedCostVerified: false,
          freightEvidence:
            priority === "INTERNATIONAL_DROPSHIPPING"
              ? (quote?.freightEvidence ?? "unknown")
              : "not_applicable",
          dutiesTaxesFeesEvidence:
            priority === "INTERNATIONAL_DROPSHIPPING"
              ? (quote?.dutiesTaxesFeesEvidence ?? "unknown")
              : "not_applicable",
          paymentOperationalCostsConfigured: false,
        },
        marketBenchmark: intake
          ? {
              priceZar: asNumber(intake.market_price),
              sourceUrl: intake.market_price_source_url,
              checkedAt: intake.last_price_checked_at,
              // A saved price and URL become useful only after the reviewer
              // records exact/strong-comparable evidence. Never infer that
              // from a title, category or search result.
              matchStrength: marketMatchStrength,
              note: intake.market_price_notes,
            }
          : null,
        localSourceMatch: localMatch,
        evidence,
      });
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        supplierName: product.supplier_name,
        supplierPriority: priority,
        fulfilmentModel: product.fulfilment_model,
        currentSellingPriceZar,
        reviewedVariant: variant
          ? {
              title: variant.title,
              sourceProductCostZar: quote?.sourceProductCostZar ?? null,
              supplierFreightZar: quote?.supplierFreightZar ?? null,
              quoteCheckedAt: quote?.quoteCheckedAt ?? null,
              sourceLabel: quote?.sourceLabel ?? null,
            }
          : null,
        review,
        marketEvidence: {
          sourceUrl: intake?.market_price_source_url ?? null,
          checkedAt: intake?.last_price_checked_at ?? null,
          note: intake?.market_price_notes ?? null,
        },
        inventoryLastVerifiedAt: product.inventory_last_verified_at,
      };
    })
    .sort((left, right) => {
      const weight = (outcome: CommercialReview["outcome"]) =>
        ({ ARCHIVE_CANDIDATE: 0, HOLD: 1, LOCAL_SOURCE_OPPORTUNITY: 2, REPRICE: 3, KEEP: 4 })[
          outcome
        ];
      return (
        weight(left.review.outcome) - weight(right.review.outcome) ||
        left.name.localeCompare(right.name)
      );
    });
}

export { MINIMUM_COMMERCIAL_MARGIN_PERCENT };
