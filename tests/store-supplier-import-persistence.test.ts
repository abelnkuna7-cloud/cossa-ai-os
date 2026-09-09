import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { planAstrumImport } from "../src/lib/store-astrum-catalogue-import.ts";
import {
  SupplierImportPersistenceError,
  buildSupplierImportRpcPayload,
} from "../src/lib/store-supplier-import-persistence.server.ts";

const csv = "sku,name,price,srp_price,stock,category\nA-1,Sample,100,150,7,Keyboards\n";
const input = () => ({
  organisationId: "org",
  actorId: "actor",
  supplierId: "supplier",
  sourceType: "csv" as const,
  sourceFileName: "catalogue.csv",
  sourceUrl: "https://supplier.example/catalogue",
  sourceText: csv,
  plan: planAstrumImport(csv, []),
});

test("persistence payload binds the plan to its exact source bytes", () => {
  const payload = buildSupplierImportRpcPayload(input());
  assert.equal(payload.p_rows.length, 1);
  assert.equal(payload.p_rows[0]?.sku, "A-1");
  assert.equal(payload.p_counts.supplierAvailableUnits, 7);
  assert.equal("sellingPriceOverride" in payload.p_rows[0]!, false);
});

test("persistence rejects a stale or substituted plan", () => {
  const value = input();
  value.sourceText += "B-2,Other,10,20,1,Mice\n";
  assert.throws(() => buildSupplierImportRpcPayload(value), SupplierImportPersistenceError);
});

test("fatal database validation failures have a full-rollback contract", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260909170000_supplier_import_persistence_rpc.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /accepted row failed server validation/);
  assert.match(
    migration,
    /Fatal persistence failures roll back the entire import transaction; failed attempts[\s\S]*rather than persisted as completed import batches/,
  );
  assert.doesNotMatch(migration, /exception when others/i);
  assert.doesNotMatch(migration, /status = 'failed'/i);
});

test("identical source hashes remain idempotent", () => {
  const first = buildSupplierImportRpcPayload(input());
  const second = buildSupplierImportRpcPayload(input());
  assert.equal(first.p_source_content_hash, second.p_source_content_hash);
  assert.deepEqual(first.p_rows, second.p_rows);
});
