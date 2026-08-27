import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

type ProductType = "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
type ProductStatus = "draft" | "active" | "archived";
type FulfilmentModel =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital";
type InventoryOwnership =
  | "cossa_owned"
  | "supplier_managed"
  | "pod_managed"
  | "affiliate_merchant"
  | "digital"
  | "not_applicable"
  | "unknown";
type InventorySourceStatus =
  | "verified"
  | "manual"
  | "stale"
  | "not_connected"
  | "failed"
  | "unknown";

export interface StoreIntelligenceProduct {
  id: string;
  name: string;
  sku: string | null;
  product_type: ProductType;
  fulfilment_model: FulfilmentModel;
  status: ProductStatus;
  supplier_name: string | null;
  cost_price: number | string | null;
  price: number | string | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  unlimited_stock: boolean;
  inventory_ownership: InventoryOwnership | null;
  inventory_source_status: InventorySourceStatus | null;
  image_urls: string[] | null;
  description: string | null;
  category: string | null;
  updated_at: string;
  created_at: string;
}

export interface StoreIntelligenceSnapshot {
  generatedAt: string;
  products: StoreIntelligenceProduct[];
  total: number;
  active: number;
  draft: number;
  archived: number;
  byType: Record<ProductType, number>;
  byOwnership: Record<InventoryOwnership, number>;
  verifiedInventory: number;
  staleInventory: number;
  unknownInventory: number;
  outOfStockCossaOwned: number;
  incompleteDrafts: number;
  pricingReview: number;
  supplierManaged: number;
  grossMarginKnown: number;
  grossMarginUnknown: number;
  averageKnownGrossMarginPercent: number | null;
  variants: {
    total: number;
    available: number;
    unavailable: number;
    unknownFreshness: number;
    staleOrFailed: number;
  };
  productsWithNoAvailableVariants: number;
  paidOrderCount: number;
  paidRevenue: number;
  productRevenue: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  fastMovers: string[];
  slowMovers: string[];
  noSaleProducts: number;
  oldestProductAgeDays: number | null;
  orderIntelligenceAvailable: boolean;
  variantIntelligenceAvailable: boolean;
  supplierCostMovementAvailable: false;
}

const db = asDynamicSupabaseClient(supabase);

const PRODUCT_TYPES: ProductType[] = ["physical", "digital", "affiliate", "pod", "dropshipping"];
const OWNERSHIP_TYPES: InventoryOwnership[] = [
  "cossa_owned",
  "supplier_managed",
  "pod_managed",
  "affiliate_merchant",
  "digital",
  "not_applicable",
  "unknown",
];

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function missingCoreProductData(product: StoreIntelligenceProduct): boolean {
  if (!product.name.trim() || !product.category?.trim() || !product.description?.trim())
    return true;
  if ((product.image_urls ?? []).length === 0) return true;
  if (product.product_type !== "affiliate" && !product.sku?.trim()) return true;
  const price = number(product.price);
  if (product.product_type !== "affiliate" && (price == null || price <= 0)) return true;
  if (
    ["affiliate", "pod", "dropshipping"].includes(product.product_type) &&
    !product.supplier_name?.trim()
  )
    return true;
  return false;
}

export async function loadStoreIntelligence(): Promise<StoreIntelligenceSnapshot> {
  const [{ data, error }, variantsResult, ordersResult, orderItemsResult] = await Promise.all([
    db
      .from<StoreIntelligenceProduct>("store_products")
      .select(
        "id,name,sku,product_type,fulfilment_model,status,supplier_name,cost_price,price,track_inventory,stock_quantity,unlimited_stock,inventory_ownership,inventory_source_status,image_urls,description,category,updated_at,created_at",
      )
      .order("updated_at", { ascending: false }),
    db
      .from("store_product_variants")
      .select(
        "id,product_id,is_available,availability_source_status,availability_last_verified_at",
      ),
    db.from("store_orders").select("id,status,total,paid_at,created_at"),
    db.from("store_order_items").select("order_id,product_id,product_name,quantity,line_total"),
  ]);

  if (error) throw new Error(`Unable to load Cossa Store intelligence: ${error.message}`);

  const products = (data ?? []) as StoreIntelligenceProduct[];
  const variants = variantsResult.error
    ? []
    : ((variantsResult.data ?? []) as Array<{
        product_id: string;
        is_available: boolean;
        availability_source_status: InventorySourceStatus | null;
      }>);
  const orders = ordersResult.error
    ? []
    : ((ordersResult.data ?? []) as Array<{
        id: string;
        status: string;
        total: number | string | null;
        paid_at: string | null;
      }>);
  const orderItems = orderItemsResult.error
    ? []
    : ((orderItemsResult.data ?? []) as Array<{
        order_id: string;
        product_id: string | null;
        product_name: string;
        quantity: number;
        line_total: number | string;
      }>);
  const byType = Object.fromEntries(PRODUCT_TYPES.map((type) => [type, 0])) as Record<
    ProductType,
    number
  >;
  const byOwnership = Object.fromEntries(OWNERSHIP_TYPES.map((type) => [type, 0])) as Record<
    InventoryOwnership,
    number
  >;

  let verifiedInventory = 0;
  let staleInventory = 0;
  let unknownInventory = 0;
  let outOfStockCossaOwned = 0;
  let incompleteDrafts = 0;
  let pricingReview = 0;
  let supplierManaged = 0;
  let grossMarginKnown = 0;
  let grossMarginUnknown = 0;
  let grossMarginPercentTotal = 0;

  for (const product of products) {
    byType[product.product_type] += 1;

    const ownership = product.inventory_ownership ?? "unknown";
    byOwnership[ownership] += 1;

    const sourceState = product.inventory_source_status ?? "unknown";
    if (sourceState === "verified") verifiedInventory += 1;
    if (sourceState === "stale" || sourceState === "failed") staleInventory += 1;
    if (sourceState === "unknown" || sourceState === "not_connected") unknownInventory += 1;

    if (["supplier_managed", "pod_managed", "affiliate_merchant"].includes(ownership))
      supplierManaged += 1;

    if (
      ownership === "cossa_owned" &&
      product.track_inventory &&
      !product.unlimited_stock &&
      Number(product.stock_quantity ?? 0) <= 0
    ) {
      outOfStockCossaOwned += 1;
    }

    if (product.status === "draft" && missingCoreProductData(product)) incompleteDrafts += 1;

    const price = number(product.price);
    const cost = number(product.cost_price);
    if (
      product.product_type !== "affiliate" &&
      (price == null || price <= 0 || cost == null || cost < 0)
    ) {
      pricingReview += 1;
      grossMarginUnknown += 1;
      continue;
    }

    if (price != null && price > 0 && cost != null && cost >= 0) {
      const marginPercent = ((price - cost) / price) * 100;
      grossMarginKnown += 1;
      grossMarginPercentTotal += marginPercent;
      if (marginPercent < 10) pricingReview += 1;
    } else {
      grossMarginUnknown += 1;
    }
  }

  const paidOrderIds = new Set(
    orders
      .filter(
        (order) =>
          order.paid_at !== null && ["paid", "processing", "completed"].includes(order.status),
      )
      .map((order) => order.id),
  );
  const productPerformance = new Map<
    string,
    { productId: string | null; name: string; quantity: number; revenue: number }
  >();
  for (const item of orderItems) {
    if (!paidOrderIds.has(item.order_id)) continue;
    const key = item.product_id ?? item.product_name;
    const current = productPerformance.get(key) ?? {
      productId: item.product_id,
      name: item.product_name,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += Number(item.quantity ?? 0);
    current.revenue += Number(item.line_total ?? 0);
    productPerformance.set(key, current);
  }
  const productRevenue = [...productPerformance.values()].sort((a, b) => b.revenue - a.revenue);
  const soldProductIds = new Set(productRevenue.map((item) => item.productId).filter(Boolean));
  const variantProducts = new Set(variants.map((variant) => variant.product_id));
  const productsWithNoAvailableVariants = [...variantProducts].filter(
    (productId) =>
      !variants.some((variant) => variant.product_id === productId && variant.is_available),
  ).length;
  const oldestCreatedAt = products.reduce<number | null>((oldest, product) => {
    const created = Date.parse(product.created_at);
    return Number.isFinite(created) && (oldest == null || created < oldest) ? created : oldest;
  }, null);

  return {
    generatedAt: new Date().toISOString(),
    products,
    total: products.length,
    active: products.filter((product) => product.status === "active").length,
    draft: products.filter((product) => product.status === "draft").length,
    archived: products.filter((product) => product.status === "archived").length,
    byType,
    byOwnership,
    verifiedInventory,
    staleInventory,
    unknownInventory,
    outOfStockCossaOwned,
    incompleteDrafts,
    pricingReview,
    supplierManaged,
    grossMarginKnown,
    grossMarginUnknown,
    averageKnownGrossMarginPercent:
      grossMarginKnown > 0 ? grossMarginPercentTotal / grossMarginKnown : null,
    variants: {
      total: variants.length,
      available: variants.filter((variant) => variant.is_available).length,
      unavailable: variants.filter((variant) => !variant.is_available).length,
      unknownFreshness: variants.filter(
        (variant) =>
          !variant.availability_source_status ||
          ["unknown", "not_connected"].includes(variant.availability_source_status),
      ).length,
      staleOrFailed: variants.filter((variant) =>
        ["stale", "failed"].includes(variant.availability_source_status ?? "unknown"),
      ).length,
    },
    productsWithNoAvailableVariants,
    paidOrderCount: paidOrderIds.size,
    paidRevenue: orders
      .filter((order) => paidOrderIds.has(order.id))
      .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
    productRevenue,
    fastMovers: productRevenue.slice(0, 5).map((item) => `${item.name} (${item.quantity})`),
    slowMovers: [...productRevenue]
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map((item) => `${item.name} (${item.quantity})`),
    noSaleProducts: products.filter(
      (product) => product.status === "active" && !soldProductIds.has(product.id),
    ).length,
    oldestProductAgeDays:
      oldestCreatedAt == null
        ? null
        : Math.max(0, Math.floor((Date.now() - oldestCreatedAt) / 86_400_000)),
    orderIntelligenceAvailable: !ordersResult.error && !orderItemsResult.error,
    variantIntelligenceAvailable: !variantsResult.error,
    supplierCostMovementAvailable: false,
  };
}
