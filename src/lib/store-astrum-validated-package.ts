import { createHash } from "node:crypto";

export const ASTRUM_EXPECTED_SOURCE_HASH =
  "9dcdfd55d985aafcc42337e2fa1b7d81951807605a84f6aead94ccb5ce38a056";
export const ASTRUM_EXPECTED_PACKAGE_HASH =
  "f28f1c37723dbdb6d5f4c6f2200dec4348a18895724d1d2a0a13c3fba257db19";

export const ASTRUM_EXPECTED_COUNTS = {
  sourceRows: 699,
  acceptedRows: 675,
  rejectedRows: 24,
  newSkus: 675,
  updatedSkus: 0,
  unchangedSkus: 0,
  availableSkus: 542,
  unavailableSkus: 133,
  supplierAvailableUnits: 36012,
  stockChanges: 0,
  costChanges: 0,
  rrpChanges: 0,
  newlyUnavailable: 0,
  backInStock: 0,
  missingFromSource: 0,
} as const;

const RESOLVE = "RESOLVE_FROM_PRODUCTION";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export type ValidatedAstrumPackage = {
  packageHash: string;
  rows: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  counts: Record<string, number>;
  sourceType: string;
  sourceFileName: string;
  sourceContentHash: string;
  sourceObservedAt: string;
};

export function validateAstrumProductionPackage(value: unknown): ValidatedAstrumPackage {
  const input = record(value);
  const rows = Array.isArray(input.p_rows)
    ? input.p_rows.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const events = Array.isArray(input.p_events)
    ? input.p_events.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const countsRaw = record(input.p_counts);
  const counts = Object.fromEntries(
    Object.entries(countsRaw).map(([key, item]) => [key, Number(item)]),
  ) as Record<string, number>;

  if (input.p_source_type !== "csv") throw new Error("Astrum package rejected: source type must be csv.");
  if (input.p_source_file_name !== "astrum_products_level1.csv")
    throw new Error("Astrum package rejected: unexpected source file name.");
  if (input.p_source_content_hash !== ASTRUM_EXPECTED_SOURCE_HASH)
    throw new Error("Astrum package rejected: source content hash does not match the approved catalogue snapshot.");
  if (rows.length !== ASTRUM_EXPECTED_COUNTS.acceptedRows)
    throw new Error(`Astrum package rejected: expected ${ASTRUM_EXPECTED_COUNTS.acceptedRows} accepted rows, received ${rows.length}.`);
  if (events.length !== 1374)
    throw new Error(`Astrum package rejected: expected 1374 import events, received ${events.length}.`);

  for (const [key, expected] of Object.entries(ASTRUM_EXPECTED_COUNTS)) {
    if (counts[key] !== expected)
      throw new Error(`Astrum package rejected: ${key} must equal ${expected}.`);
  }

  const seen = new Set<string>();
  let available = 0;
  let unavailable = 0;
  let units = 0;
  for (const row of rows) {
    const sku = String(row.sku ?? "").trim();
    const name = String(row.name ?? "").trim();
    const price = Number(row.price);
    const stock = Number(row.stock ?? 0);
    if (!sku || !name || !Number.isFinite(price) || price <= 0)
      throw new Error("Astrum package rejected: an accepted row failed SKU, name or supplier-cost validation.");
    const key = sku.toLowerCase();
    if (seen.has(key)) throw new Error(`Astrum package rejected: duplicate accepted SKU ${sku}.`);
    seen.add(key);
    if (Number.isFinite(stock) && stock > 0) {
      available += 1;
      units += stock;
    } else {
      unavailable += 1;
    }
  }
  if (available !== ASTRUM_EXPECTED_COUNTS.availableSkus || unavailable !== ASTRUM_EXPECTED_COUNTS.unavailableSkus)
    throw new Error("Astrum package rejected: availability totals do not reconcile to the approved snapshot.");
  if (units !== ASTRUM_EXPECTED_COUNTS.supplierAvailableUnits)
    throw new Error("Astrum package rejected: supplier available units do not reconcile to the approved snapshot.");

  // Reconstruct the exact approved pre-production package before hashing. Production
  // identifiers are intentionally excluded from the approval hash and are resolved
  // server-side only after the authenticated actor and supplier are checked.
  const canonical = {
    ...input,
    p_organisation_id: RESOLVE,
    p_supplier_id: RESOLVE,
    p_source_url: RESOLVE,
    p_created_by: RESOLVE,
  };
  const packageHash = sha256(JSON.stringify(canonical));
  if (packageHash !== ASTRUM_EXPECTED_PACKAGE_HASH)
    throw new Error("Astrum package rejected: package integrity hash does not match the independently approved import plan.");

  return {
    packageHash,
    rows,
    events,
    counts,
    sourceType: String(input.p_source_type),
    sourceFileName: String(input.p_source_file_name),
    sourceContentHash: String(input.p_source_content_hash),
    sourceObservedAt: String(input.p_source_observed_at ?? ""),
  };
}
