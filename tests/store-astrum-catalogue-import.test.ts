import assert from "node:assert/strict";
import test from "node:test";
import { planAstrumImport } from "../src/lib/store-astrum-catalogue-import.ts";

const source = `sku,name,price,srp_price,stock,category\nA1,Alpha,100,150,10,Adapters\nA2,Beta,200,300,0,Audio\n,Missing SKU,50,70,1,Audio`;
test("Astrum source is validated and uses supplier SKU as the stable identity", () => {
  const plan = planAstrumImport(source, []);
  assert.deepEqual(plan.counts, {
    sourceRows: 3,
    acceptedRows: 2,
    rejectedRows: 1,
    newSkus: 2,
    updatedSkus: 0,
    unchangedSkus: 0,
    availableSkus: 1,
    unavailableSkus: 1,
    supplierAvailableUnits: 10,
    stockChanges: 0,
    costChanges: 0,
    rrpChanges: 0,
    newlyUnavailable: 0,
    backInStock: 0,
    missingFromSource: 0,
  });
  assert.equal(plan.upserts.length, 2);
});
test("identical repeat is unchanged and creates no new intake candidates", () => {
  const existing = [
    {
      id: "1",
      supplierProductRef: "A1",
      supplierCost: 100,
      supplierRrp: 150,
      supplierAvailableStock: 10,
      stockStatus: "available" as const,
    },
    {
      id: "2",
      supplierProductRef: "A2",
      supplierCost: 200,
      supplierRrp: 300,
      supplierAvailableStock: 0,
      stockStatus: "unavailable" as const,
    },
  ];
  const plan = planAstrumImport(source, existing);
  assert.equal(plan.counts.newSkus, 0);
  assert.equal(plan.counts.updatedSkus, 0);
  assert.equal(plan.counts.unchangedSkus, 2);
  assert.equal(plan.upserts.length, 0);
});
test("changes are evidence events while missing SKUs are never deleted", () => {
  const existing = [
    {
      id: "1",
      supplierProductRef: "A1",
      supplierCost: 90,
      supplierRrp: 140,
      supplierAvailableStock: 0,
      stockStatus: "unavailable" as const,
    },
    {
      id: "2",
      supplierProductRef: "OLD",
      supplierCost: 1,
      supplierRrp: 2,
      supplierAvailableStock: 1,
      stockStatus: "available" as const,
    },
  ];
  const plan = planAstrumImport(
    `sku,name,price,srp_price,stock,category\nA1,Alpha,100,150,10,Adapters\nA3,Gamma,1,2,0,Audio`,
    existing,
  );
  assert.equal(plan.counts.stockChanges, 1);
  assert.equal(plan.counts.costChanges, 1);
  assert.equal(plan.counts.rrpChanges, 1);
  assert.equal(plan.counts.backInStock, 1);
  assert.equal(plan.counts.newSkus, 1);
  assert.equal(plan.counts.missingFromSource, 1);
  assert.ok(plan.events.some((e) => e.type === "missing_from_source" && e.sku === "OLD"));
});
