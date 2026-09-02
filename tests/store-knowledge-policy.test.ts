import assert from "node:assert/strict";
import test from "node:test";

import {
  assessPricingKnowledge,
  classifySupplierEvidence,
  findDeterministicStoreProductDuplicates,
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

test("legacy category intelligence resolves an approved department slug, not a product-derived label", () => {
  const result = recommendCossaCategory({
    supplierCategory: "Home & Living",
    taxonomy: ["Travel & Tech", "Home & Living"],
    mappings: [],
  });

  assert.equal(result.action, "AUTO");
  assert.equal(result.category, "home-living");
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

test("an existing intake supplier SKU remains a blocked/reopen identity", () => {
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

test("an existing Store product supplier SKU blocks a new intake", () => {
  const matches = findDeterministicStoreProductDuplicates(
    [
      {
        id: "store-dm3762",
        name: "Self Care Organiser",
        supplier_product_ref: "DM3762",
        source_url: "https://dmcwholesale.co.za/products/self-care-organiser",
      },
    ],
    {
      supplierId: "dmc-wholesale",
      supplierProductRef: "DM3762",
      sourceUrl: "https://dmcwholesale.co.za/products/self-care-organiser",
      name: "New draft title",
    },
  );

  assert.deepEqual(
    matches.map((match) => match.kind),
    ["supplier_sku"],
  );
});

test("an existing canonical supplier URL blocks a new intake", () => {
  const matches = findDeterministicStoreProductDuplicates(
    [
      {
        id: "store-url-match",
        name: "Portable organiser",
        supplier_product_ref: null,
        source_url: "https://dmcwholesale.co.za/products/organiser?utm_source=old",
      },
    ],
    {
      supplierId: "dmc-wholesale",
      supplierProductRef: null,
      sourceUrl: "https://dmcwholesale.co.za/products/organiser?utm_source=new",
      name: "Different customer title",
    },
  );

  assert.deepEqual(
    matches.map((match) => match.kind),
    ["source_url"],
  );
});

test("a title-only possible duplicate remains a review warning, not a hard block", () => {
  const product = {
    id: "store-title-match",
    name: "Portable organiser",
    supplier_product_ref: null,
    source_url: "https://supplier.example/products/organiser",
  };
  const candidate = {
    supplierId: "other-supplier",
    supplierProductRef: null,
    sourceUrl: "https://other.example/products/organiser",
    name: "Portable organiser",
  };

  assert.equal(findStoreProductDuplicates([product], candidate)[0]?.kind, "name");
  assert.deepEqual(findDeterministicStoreProductDuplicates([product], candidate), []);
});

test("a unique product keeps the normal Save for review path available", () => {
  const matches = findDeterministicStoreProductDuplicates(
    [
      {
        id: "existing",
        name: "Existing product",
        supplier_product_ref: "DM1000",
        source_url: "https://dmcwholesale.co.za/products/existing-product",
      },
    ],
    {
      supplierId: "dmc-wholesale",
      supplierProductRef: "DM9999",
      sourceUrl: "https://dmcwholesale.co.za/products/new-product",
      name: "New product",
    },
  );

  assert.deepEqual(matches, []);
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
