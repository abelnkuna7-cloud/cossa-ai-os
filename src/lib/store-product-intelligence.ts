import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

const db = asDynamicSupabaseClient(supabase);

export type StoreProductType = "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
export type StoreFulfilmentModel =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital";

export type StoreProductPreflightInput = {
  productId?: string | null;
  name: string;
  slug: string;
  sku?: string | null;
  productType: StoreProductType;
  fulfilmentModel: StoreFulfilmentModel;
  category?: string | null;
  description?: string | null;
  price: number;
  imageUrls: string[];
  digitalFilePath?: string | null;
  supplierName?: string | null;
  supplierProductRef?: string | null;
  supplierUrl?: string | null;
  affiliateUrl?: string | null;
  trackInventory?: boolean;
  unlimitedStock?: boolean;
  stockQuantity?: number;
};

export type StoreProductConflict = {
  id: string;
  name: string;
  sku?: string | null;
  slug?: string | null;
};

export type StoreProductPreflightResult = {
  ready: boolean;
  issues: string[];
  warnings: string[];
  duplicate_sku: StoreProductConflict | null;
  duplicate_slug: StoreProductConflict | null;
  suggested_sku: string | null;
  digital_file_verified: boolean | null;
};

function clean(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

/**
 * Server-backed publication intelligence for Cossa Store products.
 *
 * This deliberately mirrors the production publication rules instead of relying
 * only on browser-side checks. It catches duplicate SKU/slug collisions, verifies
 * secure digital files actually exist, and can return the next safe SKU suggestion.
 */
export async function runStoreProductPreflight(
  input: StoreProductPreflightInput,
): Promise<StoreProductPreflightResult> {
  const { data, error } = await db.rpc("store_product_preflight", {
    p_product_id: input.productId ?? null,
    p_name: clean(input.name),
    p_slug: clean(input.slug),
    p_sku: clean(input.sku),
    p_product_type: input.productType,
    p_fulfilment_model: input.fulfilmentModel,
    p_category: clean(input.category),
    p_description: clean(input.description),
    p_price: Number.isFinite(input.price) ? input.price : 0,
    p_image_urls: input.imageUrls,
    p_digital_file_path: clean(input.digitalFilePath),
    p_supplier_name: clean(input.supplierName),
    p_supplier_product_ref: clean(input.supplierProductRef),
    p_supplier_url: clean(input.supplierUrl),
    p_affiliate_url: clean(input.affiliateUrl),
    p_track_inventory: Boolean(input.trackInventory),
    p_unlimited_stock: input.unlimitedStock ?? true,
    p_stock_quantity: Math.max(0, Math.floor(input.stockQuantity ?? 0)),
  });

  if (error) {
    throw new Error(`Product preflight failed: ${error.message}`);
  }

  const result = data as StoreProductPreflightResult | null;
  if (!result || typeof result.ready !== "boolean") {
    throw new Error("Product preflight returned an invalid response.");
  }

  return {
    ready: result.ready,
    issues: Array.isArray(result.issues) ? result.issues : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    duplicate_sku: result.duplicate_sku ?? null,
    duplicate_slug: result.duplicate_slug ?? null,
    suggested_sku: result.suggested_sku ?? null,
    digital_file_verified:
      typeof result.digital_file_verified === "boolean" ? result.digital_file_verified : null,
  };
}

export async function nextAvailableStoreSku(prefix: string, startNumber = 1): Promise<string> {
  const cleanPrefix = prefix.trim().toUpperCase();
  if (!cleanPrefix) throw new Error("SKU prefix is required.");

  const { data, error } = await db.rpc("next_available_store_sku", {
    p_prefix: cleanPrefix,
    p_start_number: Math.max(1, Math.floor(startNumber)),
  });

  if (error) throw new Error(`Could not generate next Store SKU: ${error.message}`);
  if (typeof data !== "string" || !data.trim()) {
    throw new Error("The Store SKU generator returned an invalid response.");
  }
  return data;
}

export function preflightSummary(result: StoreProductPreflightResult) {
  if (result.ready) return "Publication preflight passed.";
  if (result.warnings.length > 0) return result.warnings.join(" ");
  if (result.issues.length > 0) return `Complete before publishing: ${result.issues.join(", ")}.`;
  return "This product is not ready to publish.";
}
