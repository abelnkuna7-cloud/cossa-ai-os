import { createHash } from "node:crypto";

import type { ImportPlan, IntakeEvidence } from "./store-astrum-catalogue-import";

async function database() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export class SupplierImportPersistenceError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type SupplierImportPersistenceInput = {
  organisationId: string;
  actorId: string;
  supplierId: string;
  sourceType: "csv" | "xlsx" | "api" | "feed" | "manual";
  sourceFileName: string;
  sourceUrl: string;
  sourceText: string;
  sourceObservedAt?: string;
  plan: ImportPlan;
};

export function buildSupplierImportRpcPayload(input: SupplierImportPersistenceInput) {
  const contentHash = createHash("sha256").update(input.sourceText).digest("hex");
  if (contentHash !== input.plan.contentHash)
    throw new SupplierImportPersistenceError(
      "Source content hash does not match the planned import.",
    );
  if (!input.sourceFileName.trim() || !input.sourceUrl.trim())
    throw new SupplierImportPersistenceError(
      "A source file name and verified source URL are required.",
    );
  return {
    p_organisation_id: input.organisationId,
    p_supplier_id: input.supplierId,
    p_source_type: input.sourceType,
    p_source_file_name: input.sourceFileName.trim(),
    p_source_content_hash: contentHash,
    p_source_observed_at: input.sourceObservedAt ?? new Date().toISOString(),
    p_source_url: input.sourceUrl.trim(),
    p_rows: input.plan.upserts,
    p_events: input.plan.events,
    p_counts: input.plan.counts,
    p_created_by: input.actorId,
  };
}

/** Loads only server-verified prior supplier evidence; client identifiers never select another organisation. */
export async function loadSupplierImportEvidence(organisationId: string, supplierId: string) {
  const client = (await database()) as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          eq: (
            column: string,
            value: string,
          ) => {
            single: () => Promise<{
              data:
                | {
                    id: string;
                    status: string;
                    registry_status: string | null;
                    verification_status: string | null;
                    archived_at: string | null;
                  }
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
  const supplier = await client
    .from("store_suppliers")
    .select("id,status,registry_status,verification_status,archived_at")
    .eq("id", supplierId)
    .eq("organisation_id", organisationId)
    .single();
  if (supplier.error || !supplier.data)
    throw new SupplierImportPersistenceError(
      "Supplier is not available in this organisation.",
      404,
    );
  if (supplier.data.archived_at)
    throw new SupplierImportPersistenceError(
      "Archived suppliers cannot receive catalogue imports.",
      409,
    );
  if (
    supplier.data.status !== "active" ||
    supplier.data.registry_status !== "active" ||
    supplier.data.verification_status !== "VERIFIED"
  )
    throw new SupplierImportPersistenceError(
      "Catalogue import requires an ACTIVE and VERIFIED supplier registry record.",
      409,
    );

  const admin = (await database()) as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const result = await admin
    .from("store_inventory_intakes")
    .select(
      "id,supplier_product_ref,supplier_cost,supplier_rrp,supplier_available_stock,stock_status",
    )
    .eq("supplier_id", supplierId);
  if (result.error) throw new SupplierImportPersistenceError(result.error.message, 500);
  return (result.data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    supplierProductRef: String(row.supplier_product_ref ?? ""),
    supplierCost: typeof row.supplier_cost === "number" ? row.supplier_cost : null,
    supplierRrp: typeof row.supplier_rrp === "number" ? row.supplier_rrp : null,
    supplierAvailableStock:
      typeof row.supplier_available_stock === "number" ? row.supplier_available_stock : null,
    stockStatus:
      row.stock_status === "available" ||
      row.stock_status === "unavailable" ||
      row.stock_status === "unknown"
        ? row.stock_status
        : "unknown",
  })) satisfies IntakeEvidence[];
}

export async function persistSupplierCatalogueImport(input: SupplierImportPersistenceInput) {
  const payload = buildSupplierImportRpcPayload(input);
  const client = (await database()) as unknown as {
    rpc: (
      name: string,
      args: typeof payload,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc("persist_supplier_catalogue_import", payload);
  if (error) throw new SupplierImportPersistenceError(error.message, 500);
  return data;
}
