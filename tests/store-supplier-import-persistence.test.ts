import assert from "node:assert/strict";
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
