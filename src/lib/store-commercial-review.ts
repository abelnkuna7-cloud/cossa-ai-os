import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import {
  assessLocalSourceCandidate,
  reviewCommercialCompetitiveness,
  type CommercialReview,
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
  cost_price: number | string | null;
  price: number | string | null;
  source_currency: string | null;
  source_cost: number | string | null;
  fx_rate_to_zar: number | string | null;
  inventory_last_verified_at: string | null;
};

type IntakeCommercialEvidence = {
  publication_store_product_id: string | null;
  market_price: number | string | null;
  market_price_source_url: string | null;
  market_price_notes: string | null;
  last_price_checked_at: string | null;
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

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
  const sourceCost = asNumber(product.source_cost);
  if (sourceCost == null) return null;
  const sourceCurrency = normalise(product.source_currency);
  if (!sourceCurrency || sourceCurrency === "zar") return sourceCost;
  const fx = asNumber(product.fx_rate_to_zar);
  return fx == null ? null : Math.round((sourceCost * fx + Number.EPSILON) * 100) / 100;
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

/**
 * Loads the existing product and intake evidence without writing back to either
 * Store table. Market-price notes are useful evidence but have no structured
 * proof of a same-model match, so they begin as unverified in the review.
 */
export async function loadStoreCommercialReviews(): Promise<CommercialReviewItem[]> {
  const [productsResult, intakesResult, suppliersResult] = await Promise.all([
    db
      .from<StoreCommercialProduct>("store_products")
      .select(
        "id,name,sku,status,supplier_name,supplier_product_ref,supplier_url,product_type,fulfilment_model,inventory_ownership,inventory_source_status,cost_price,price,source_currency,source_cost,fx_rate_to_zar,inventory_last_verified_at",
      )
      .order("updated_at", { ascending: false }),
    db
      .from<IntakeCommercialEvidence>("store_inventory_intakes")
      .select(
        "publication_store_product_id,market_price,market_price_source_url,market_price_notes,last_price_checked_at",
      ),
    db.from<SupplierRecord>("store_suppliers").select("name,status,registry_status,stock_origin"),
  ]);
  if (productsResult.error)
    throw new Error(
      `Unable to load Store products for commercial review: ${productsResult.error.message}`,
    );
  if (intakesResult.error)
    throw new Error(`Unable to load saved market evidence: ${intakesResult.error.message}`);
  if (suppliersResult.error)
    throw new Error(`Unable to load the Supplier Registry: ${suppliersResult.error.message}`);

  const products = productsResult.data ?? [];
  const intakesByProduct = new Map(
    (intakesResult.data ?? [])
      .filter((item) => item.publication_store_product_id)
      .map((item) => [item.publication_store_product_id!, item]),
  );
  const suppliers = suppliersResult.data ?? [];

  return products
    .filter((product) => product.status === "active")
    .map((product) => {
      const intake = intakesByProduct.get(product.id);
      const priority = supplierPriorityFor(product, suppliers);
      const costPrice = asNumber(product.cost_price);
      const review = reviewCommercialCompetitiveness({
        productId: product.id,
        productName: product.name,
        currentSellingPriceZar: asNumber(product.price),
        supplierPriority: priority,
        availabilityEvidence:
          product.inventory_source_status === "verified" ? "verified" : "unknown",
        minimumGrossMarginPercent: MINIMUM_COMMERCIAL_MARGIN_PERCENT,
        cost: {
          supplierProductCostZar:
            priority === "INTERNATIONAL_DROPSHIPPING" ? sourceCostInZar(product) : costPrice,
          internationalOrLocalFreightZar: null,
          currencyConversionZar: 0,
          dutiesTaxesFeesZar: null,
          paymentOperationalCostZar: null,
          recordedTotalLandedCostZar: costPrice,
          // The current product record has a cost value but no separate
          // financial-evidence contract in this query. This remains a review
          // requirement rather than an assumed landed-cost confirmation.
          recordedTotalLandedCostVerified: false,
          freightEvidence: priority === "INTERNATIONAL_DROPSHIPPING" ? "unknown" : "not_applicable",
          dutiesTaxesFeesEvidence:
            priority === "INTERNATIONAL_DROPSHIPPING" ? "unknown" : "not_applicable",
          paymentOperationalCostsConfigured: false,
        },
        marketBenchmark: intake
          ? {
              priceZar: asNumber(intake.market_price),
              sourceUrl: intake.market_price_source_url,
              checkedAt: intake.last_price_checked_at,
              // The existing intake stores a price and source URL, but no
              // deterministic model/equivalence assertion. Do not upgrade it
              // to a comparable benchmark automatically.
              matchStrength: "unknown",
              note: intake.market_price_notes,
            }
          : null,
        localSourceMatch: localSourceMatch(product, products, suppliers),
      });
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        supplierName: product.supplier_name,
        supplierPriority: priority,
        fulfilmentModel: product.fulfilment_model,
        currentSellingPriceZar: asNumber(product.price),
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
