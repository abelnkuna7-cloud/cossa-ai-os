import assert from "node:assert/strict";
import test from "node:test";

import {
  assessPricingKnowledge,
  classifySupplierEvidence,
  findStoreProductDuplicates,
  recommendCossaCategory,
} from "../src/lib/store-knowledge-policy.ts";

test("category intelligence does not learn an unrelated historical supplier mapping", () => {
  const result = recommendCossaCategory({
    supplierCategory: "Self Care - Organising",
    taxonomy: ["Travel & Tech", "Home & Living"],
    mappings: [
      {
        supplier_category: "Self Care - Organising",
        cossa_category: "Travel & Tech",
      },
    ],
  });

  assert.equal(result.action, "ESCALATE");
  assert.equal(result.category, null);
  assert.equal(result.proposedCategory, "Self Care - Organising");
});

test("category intelligence can safely retain an exact current taxonomy match", () => {
  const result = recommendCossaCategory({
    supplierCategory: "Home & Living",
    taxonomy: ["Travel & Tech", "Home & Living"],
    mappings: [],
  });

  assert.equal(result.action, "AUTO");
  assert.equal(result.category, "Home & Living");
});

test("pricing keeps supplier RRP separate from independently sourced market evidence", () => {
  const result = assessPricingKnowledge({
    supplierCost: 79.2,
    supplierRrp: 99,
    marketPrice: null,
    marketPriceSourceUrl: null,
    sellingPrice: 159,
  });

  assert.equal(result.action, "VERIFY");
  assert.ok(
    result.requiresVerification.includes(
      "Supplier RRP is not a South African competitor benchmark.",
    ),
  );
});

test("duplicate checks compare supplier SKU and canonical source URLs before names", () => {
  const matches = findStoreProductDuplicates(
    [
      {
        id: "existing",
        name: "Portable organiser",
        supplier_id: "dmc",
        supplier_product_ref: "DM3762",
        source_url: "https://dmcwholesale.co.za/products/organiser?utm_source=old",
      },
    ],
    {
      supplierId: "dmc",
      supplierProductRef: "DM3762",
      sourceUrl: "https://dmcwholesale.co.za/products/organiser?utm_source=new",
      name: "Different customer title",
    },
  );

  assert.equal(matches[0]?.kind, "supplier_sku");
});

test("supplier discovery stays non-active until evidence is inspected", () => {
  const result = classifySupplierEvidence({
    websiteUrl: "https://supplier.example",
    contactInformation: "sales@supplier.example",
    policyReference: "Returns page",
    sourceProductUrl: null,
    conflictingDomain: false,
  });

  assert.equal(result.outcome, "NEEDS_MORE_EVIDENCE");
  assert.ok(result.entries.some((entry) => entry.classification === "UNVERIFIED"));
});

test("a conflicting recognised domain is rejected rather than duplicated", () => {
  const result = classifySupplierEvidence({
    websiteUrl: "https://dmcwholesale.co.za",
    contactInformation: "",
    policyReference: "",
    sourceProductUrl: "",
    conflictingDomain: true,
  });

  assert.equal(result.outcome, "REJECTED");
});
