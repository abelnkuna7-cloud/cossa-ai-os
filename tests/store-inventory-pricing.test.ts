import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePricing,
  compareWithMarket,
  inheritSupplierDefaults,
} from "../src/lib/store-inventory-pricing.ts";
import {
  canPublishInventoryLifecycle,
  customerSafeStoreProjection,
} from "../src/lib/store-inventory-safety.ts";

test("pricing calculates markup, gross profit and margin correctly", () => {
  const result = calculatePricing({ supplierCost: 87.2, markupPercent: 40 });
  assert.equal(result.calculatedSellingPrice, 122.08);
  assert.equal(result.sellingPrice, 122.08);
  assert.equal(result.grossProfit, 34.88);
  assert.ok(Math.abs((result.grossMarginPercent ?? 0) - 28.57) < 0.01);
});

test("manual selling price override changes the effective selling price", () => {
  const result = calculatePricing({
    supplierCost: 100,
    markupPercent: 20,
    sellingPriceOverride: 115,
  });
  assert.equal(result.calculatedSellingPrice, 120);
  assert.equal(result.sellingPrice, 115);
  assert.equal(result.grossProfit, 15);
  assert.equal(result.hasManualOverride, true);
});

test("zero cost and invalid markup never create an invented selling price", () => {
  assert.equal(
    calculatePricing({ supplierCost: 0, markupPercent: 25 }).calculatedSellingPrice,
    null,
  );
  assert.equal(
    calculatePricing({ supplierCost: 87.2, markupPercent: -1 }).calculatedSellingPrice,
    null,
  );
});

test("competitor comparison reports verified price position without inventing a benchmark", () => {
  const result = compareWithMarket({ cossaPrice: 159, marketPrice: 189, grossMarginPercent: 30 });
  assert.equal(result.differenceRand, 30);
  assert.ok(Math.abs((result.differencePercent ?? 0) - 15.87) < 0.01);
  assert.equal(result.status, "Competitive");
  assert.equal(
    compareWithMarket({ cossaPrice: 159, marketPrice: null, grossMarginPercent: 30 }).label,
    "Competitor benchmark not checked",
  );
});

test("supplier selection inherits registry defaults and profile", () => {
  const result = inheritSupplierDefaults({
    current: {
      supplierId: "",
      fulfilmentProfileId: "",
      businessModel: "wholesale",
      stockOrigin: "",
    },
    supplier: { id: "dmc", businessModel: "dropship", stockOrigin: "South Africa" },
    profileId: "dmc-customer-paid",
  });
  assert.deepEqual(result, {
    supplierId: "dmc",
    fulfilmentProfileId: "dmc-customer-paid",
    businessModel: "dropship",
    stockOrigin: "South Africa",
  });
});

test("lifecycle blocks publication while catalogue integration is disabled", () => {
  assert.equal(canPublishInventoryLifecycle("imported"), false);
  assert.equal(canPublishInventoryLifecycle("review"), false);
  assert.equal(canPublishInventoryLifecycle("approved"), false);
});

test("customer-safe projection excludes supplier cost and supplier identity", () => {
  const projection = customerSafeStoreProjection({
    name: "Portable Small Gadget Bag",
    price: 122.08,
    imageUrls: ["https://supplier.example/bag.jpg"],
    customerFulfilmentLabel: "Local SA fulfilment",
    customerDeliveryNotice: "Delivery is charged separately.",
    customerReturnsNotice: "Cossa Store customer terms apply.",
    customerWarrantyNotice: null,
  });
  assert.equal("supplierCost" in projection, false);
  assert.equal("supplierName" in projection, false);
  assert.equal(projection.customerFulfilmentLabel, "Local SA fulfilment");
});
