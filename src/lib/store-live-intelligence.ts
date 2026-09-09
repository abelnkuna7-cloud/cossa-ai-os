export type LiveStoreCounts = {
  totalProducts: number;
  livePublic: number;
  draft: number;
  archived: number;
  dmcPublished: number;
  otherSources: number;
  awaitingReview: number;
  awaitingApproval: number;
  outOfStock: number;
};

export type SupplierIntelligenceRow = {
  supplierId: string;
  supplierName: string;
  catalogueStatus: "connected" | "manual" | "not_synced";
  catalogueAvailable: number | null;
  imported: number;
  published: number;
  draft: number;
  unavailable: number;
  supplierAvailableUnits: number | null;
  lastSyncAt: string | null;
  syncHealth: "healthy" | "stale" | "manual" | "not_synced";
};

type Supplier = {
  id: string;
  name: string;
  code: string;
  sync_method: string | null;
  last_verified_at: string | null;
};

type Intake = {
  supplier_id: string;
  approval_status: string;
  stock_status: string;
  sync_status: string;
  published_at: string | null;
  supplier_available_stock?: number | null;
};

export function buildSupplierIntelligence(
  suppliers: Supplier[],
  intakes: Intake[],
): SupplierIntelligenceRow[] {
  return suppliers.map((supplier) => {
    const supplierIntakes = intakes.filter((item) => item.supplier_id === supplier.id);
    const syncMethod = supplier.sync_method?.trim().toLowerCase() ?? "";
    const connected = Boolean(syncMethod && !syncMethod.includes("manual"));
    const hasManualEvidence = supplierIntakes.length > 0 || syncMethod.includes("manual");
    const stale = supplierIntakes.some(
      (item) => item.sync_status === "stale" || item.sync_status === "failed",
    );

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      catalogueStatus: connected ? "connected" : hasManualEvidence ? "manual" : "not_synced",
      // Never invent a supplier-wide catalogue count. This stays null until a supplier feed/API
      // or an audited supplier catalogue snapshot provides a trustworthy count.
      catalogueAvailable: null,
      imported: supplierIntakes.length,
      published: supplierIntakes.filter((item) => item.approval_status === "published").length,
      draft: supplierIntakes.filter((item) => item.approval_status === "draft").length,
      unavailable: supplierIntakes.filter((item) => item.stock_status === "unavailable").length,
      supplierAvailableUnits: supplierIntakes.some((item) => item.supplier_available_stock != null)
        ? supplierIntakes.reduce(
            (total, item) => total + (Number(item.supplier_available_stock) || 0),
            0,
          )
        : null,
      lastSyncAt: supplier.last_verified_at,
      syncHealth: stale
        ? "stale"
        : connected
          ? "healthy"
          : hasManualEvidence
            ? "manual"
            : "not_synced",
    };
  });
}

export function supplierCatalogueLabel(value: number | null): string {
  return value == null ? "Not synced" : value.toLocaleString("en-ZA");
}

export function snapshotAgeLabel(createdAt: string | null, now = Date.now()): string {
  if (!createdAt) return "No snapshot";
  const ageMs = Math.max(0, now - new Date(createdAt).getTime());
  const days = Math.floor(ageMs / 86_400_000);
  if (days === 0) return "Captured today";
  return `${days} day${days === 1 ? "" : "s"} old`;
}
