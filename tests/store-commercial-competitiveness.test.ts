import assert from "node:assert/strict";
import test from "node:test";

import {
  assessLocalSourceCandidate,
  reviewCommercialCompetitiveness,
  type CommercialReviewInput,
} from "../src/lib/store-commercial-competitiveness.ts";

const completeInternational = (
  overrides: Partial<CommercialReviewInput> = {},
): CommercialReviewInput => ({
  productId: "cj-product",
  productName: "Evidence-backed wireless charger",
  currentSellingPriceZar: 700,
  supplierPriority: "INTERNATIONAL_DROPSHIPPING",
  availabilityEvidence: "verified",
  minimumGrossMarginPercent: 35,
  cost: {
    supplierProductCostZar: 250,
    internationalOrLocalFreightZar: 50,
    currencyConversionZar: 0,
    dutiesTaxesFeesZar: 25,
    paymentOperationalCostZar: 5,
    recordedTotalLandedCostZar: null,
    recordedTotalLandedCostVerified: false,
    freightEvidence: "verified",
    dutiesTaxesFeesEvidence: "verified",
    paymentOperationalCostsConfigured: true,
  },
  marketBenchmark: {
    priceZar: 700,
    sourceUrl: "https://competitor.example/products/charger",
    checkedAt: "2026-09-02T00:00:00.000Z",
    matchStrength: "exact_model",
    note: "Same model identifier and specifications.",
  },
  localSourceMatch: null,
  ...overrides,
});

test("unknown international freight and import charges fail closed to HOLD", () => {
  const input = completeInternational();
  input.cost.internationalOrLocalFreightZar = null;
  input.cost.freightEvidence = "unknown";
  input.cost.dutiesTaxesFeesEvidence = "unknown";

  const result = reviewCommercialCompetitiveness(input);
  assert.equal(result.outcome, "HOLD");
  assert.ok(result.requirements.some((item) => item.includes("freight/logistics")));
  assert.ok(result.merchantWarnings.some((item) => item.includes("incomplete")));
  assert.equal(result.changesAutomatically, false);
});

test("complete evidence keeps an internationally sourced product only when margin and benchmark both pass", () => {
  const result = reviewCommercialCompetitiveness(completeInternational());
  assert.equal(result.totalLandedCostZar, 330);
  assert.equal(result.minimumSustainableSellingPriceZar, 507.69);
  assert.equal(result.outcome, "KEEP");
  assert.ok((result.grossMarginPercent ?? 0) > 35);
});

test("a commercially high price is marked REPRICE without changing the product", () => {
  const result = reviewCommercialCompetitiveness(
    completeInternational({ currentSellingPriceZar: 900 }),
  );
  assert.equal(result.outcome, "REPRICE");
  assert.equal(result.recommendedCompetitiveSellingPriceZar, 700);
  assert.equal(result.changesAutomatically, false);
});

test("an evidenced local equivalent is a source-replacement review, not a duplicate", () => {
  const local = assessLocalSourceCandidate({
    supplierName: "DMC Wholesale",
    supplierPriority: "APPROVED_SOUTH_AFRICAN_SUPPLIER",
    modelIdentifiers: ["WLC-10W-3IN1"],
    landedCostZar: 240,
    landedCostVerified: true,
  });
  const result = reviewCommercialCompetitiveness(
    completeInternational({ localSourceMatch: local }),
  );
  assert.equal(result.outcome, "LOCAL_SOURCE_OPPORTUNITY");
  assert.equal(result.localSourceMatch?.supplierName, "DMC Wholesale");
  assert.equal(result.changesAutomatically, false);
});

test("a title-only local candidate never proves an equivalent source", () => {
  const local = assessLocalSourceCandidate({
    supplierName: "DMC Wholesale",
    supplierPriority: "APPROVED_SOUTH_AFRICAN_SUPPLIER",
    titleSimilarityOnly: true,
    landedCostZar: 100,
    landedCostVerified: true,
  });
  const result = reviewCommercialCompetitiveness(
    completeInternational({ localSourceMatch: local }),
  );
  assert.equal(local.matchStrength, "title_only_candidate");
  assert.notEqual(result.outcome, "LOCAL_SOURCE_OPPORTUNITY");
});

test("a credible market price below the sustainable floor becomes an archive candidate without archiving", () => {
  const result = reviewCommercialCompetitiveness(
    completeInternational({
      marketBenchmark: {
        priceZar: 450,
        sourceUrl: "https://competitor.example/products/charger",
        checkedAt: "2026-09-02T00:00:00.000Z",
        matchStrength: "exact_model",
        note: null,
      },
    }),
  );
  assert.equal(result.outcome, "ARCHIVE_CANDIDATE");
  assert.equal(result.changesAutomatically, false);
});

test("category-only pricing is not accepted as a credible South African benchmark", () => {
  const result = reviewCommercialCompetitiveness(
    completeInternational({
      marketBenchmark: {
        priceZar: 500,
        sourceUrl: "https://competitor.example/search?q=charger",
        checkedAt: "2026-09-02T00:00:00.000Z",
        matchStrength: "category_only",
        note: "Same broad product category only.",
      },
    }),
  );
  assert.equal(result.outcome, "HOLD");
  assert.ok(result.requirements.some((item) => item.includes("comparable South African market")));
});

test("the existing Three in One Wireless Charger record stays HOLD until its international cost and comparable-market evidence is complete", () => {
  const result = reviewCommercialCompetitiveness({
    productId: "0664d457-46fb-445d-b1e9-e8abef7079a1",
    productName: "Three in one wireless charger",
    currentSellingPriceZar: 619.9,
    supplierPriority: "INTERNATIONAL_DROPSHIPPING",
    availabilityEvidence: "verified",
    minimumGrossMarginPercent: 35,
    cost: {
      // Current product-record values; this is not asserted to be a complete
      // landed-cost breakdown.
      supplierProductCostZar: 108.9,
      internationalOrLocalFreightZar: null,
      currencyConversionZar: 0,
      dutiesTaxesFeesZar: null,
      paymentOperationalCostZar: null,
      recordedTotalLandedCostZar: 398.66,
      recordedTotalLandedCostVerified: false,
      freightEvidence: "unknown",
      dutiesTaxesFeesEvidence: "unknown",
      paymentOperationalCostsConfigured: false,
    },
    marketBenchmark: null,
    localSourceMatch: null,
  });
  assert.equal(result.outcome, "HOLD");
  assert.equal(result.totalLandedCostZar, 398.66);
  assert.ok(Math.abs((result.grossMarginPercent ?? 0) - 35.69) < 0.01);
  assert.equal(result.changesAutomatically, false);
});
