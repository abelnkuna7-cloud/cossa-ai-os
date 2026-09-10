import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("src/routes/api.store-supplier-catalogue-import.ts", "utf8");
const persistence = readFileSync(
  "src/lib/store-supplier-import-persistence.server.ts",
  "utf8",
);
const ui = readFileSync("src/routes/businesses.store-supplier-csv.tsx", "utf8");

test("CSV intaker is preview-first and requires explicit write confirmation", () => {
  assert.match(api, /payload\.confirmWrite !== true/);
  assert.match(api, /dryRun: true/);
  assert.match(ui, /Preview & validate CSV/);
  assert.match(ui, /Confirm internal Astrum import/);
});

test("supplier import is gated to active verified registry records", () => {
  assert.match(persistence, /supplier\.data\.status !== "active"/);
  assert.match(persistence, /supplier\.data\.registry_status !== "active"/);
  assert.match(persistence, /supplier\.data\.verification_status !== "VERIFIED"/);
  assert.match(persistence, /Archived suppliers cannot receive catalogue imports/);
});

test("CSV endpoint keeps catalogue persistence on the existing server helper", () => {
  assert.match(api, /persistSupplierCatalogueImport/);
  assert.match(api, /sourceType: "csv"/);
  assert.match(api, /requireRuntimeMember\(request, \["owner", "admin", "manager"\]\)/);
});

test("UI states the no-publish no-Cossa-stock boundary", () => {
  assert.match(ui, /Supplier stock stays supplier-owned/);
  assert.match(ui, /does not set Cossa selling prices/);
  assert.match(ui, /create Cossa on-hand stock/);
  assert.match(ui, /publish products/);
});
