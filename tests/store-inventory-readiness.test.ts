import assert from "node:assert/strict";
import test from "node:test";

import { buildProductReadiness } from "../src/lib/store-inventory-readiness.ts";

const completeDmcProduct = {
  supplierRecognised: true,
  sourceUrl: "https://dmcwholesale.co.za/products/portable-small-gadget-bag",
  name: "Portable Small Gadget Bag",
  supplierProductRef: "DM8363",
  category: "Travel & Tech",
  shortDescription: "Compact organiser for small gadgets.",
  description: "A source-backed product description.",
  imageCount: 8,
  businessModel: "dropship",
  supplierCost: 87.2,
  finalSellingPrice: 159,
  stockStatus: "available",
  fulfilmentProfileSelected: true,
  stockOrigin: "South Africa",
  deliveryResolved: true,
  freeShippingResolved: true,
  supplierCostConfirmed: true,
  stockConfirmed: true,
};

test("optional, blank competitor and brand information stay out of requirements", () => {
  const readiness = buildProductReadiness(completeDmcProduct);

  assert.equal(readiness.draftReady, true);
  assert.equal(readiness.approvalReady, true);
  assert.deepEqual(readiness.draftMissing, []);
  assert.equal(readiness.items.find((item) => item.id === "brand")?.classification, "optional");
  assert.equal(
    readiness.items.find((item) => item.id === "competitor-benchmark")?.classification,
    "optional",
  );
});

test("readiness uses exact messages for the two approval confirmations", () => {
  const readiness = buildProductReadiness({
    ...completeDmcProduct,
    supplierCostConfirmed: false,
    stockConfirmed: false,
  });

  assert.equal(readiness.draftReady, true);
  assert.equal(readiness.approvalReady, false);
  assert.deepEqual(
    readiness.approvalMissing.map((item) => item.label),
    ["Supplier cost must be confirmed", "Current supplier stock must be confirmed"],
  );
});

test("supplier and fulfilment defaults are inherited requirements", () => {
  const readiness = buildProductReadiness({
    ...completeDmcProduct,
    fulfilmentProfileSelected: false,
    stockOrigin: "",
    deliveryResolved: false,
    freeShippingResolved: false,
  });

  assert.deepEqual(
    readiness.operationalMissing.map((item) => item.id),
    ["fulfilment-profile", "stock-origin", "delivery-rule"],
  );
});
