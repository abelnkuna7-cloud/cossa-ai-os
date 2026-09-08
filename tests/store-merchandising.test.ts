import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompetitivePricingNotes,
  normaliseAdditionalDepartments,
  normaliseFeatureLines,
  normaliseMerchandisingTags,
} from "../src/lib/store-merchandising.ts";

test("additional departments remain canonical, unique and separate from the primary department", () => {
  assert.deepEqual(
    normaliseAdditionalDepartments("automotive", [
      "Cleaning Products",
      "home-living",
      "automotive",
      "Tools & Industrial",
      "Cleaning Products",
      "made-up-category",
    ]),
    ["cleaning-household", "home-living", "tools-industrial"],
  );
});

test("feature lines are cleaned and deduplicated without inventing claims", () => {
  assert.deepEqual(
    normaliseFeatureLines(["• Cordless operation", "Cordless operation", "  Rechargeable  ", ""]),
    ["Cordless operation", "Rechargeable"],
  );
});

test("merchandising tags accept only controlled Store flags", () => {
  assert.deepEqual(
    normaliseMerchandisingTags(["Trending", "new-arrival", "best_seller", "sale", "viral", "sale"]),
    ["trending", "new_arrival", "best_seller", "sale"],
  );
});

test("competitive pricing notes are deterministic and preserve manually reviewed notes", () => {
  const generated = buildCompetitivePricingNotes({
    cossaPrice: 299,
    marketPrice: 329,
    marketPriceSourceUrl: "https://example.com/product",
  });
  assert.match(generated, /below the recorded market benchmark/);
  assert.match(generated, /Competitor source recorded/);
  assert.equal(
    buildCompetitivePricingNotes({
      cossaPrice: 299,
      marketPrice: 329,
      existingNotes: "Manual benchmark checked by CEO.",
    }),
    "Manual benchmark checked by CEO.",
  );
});
