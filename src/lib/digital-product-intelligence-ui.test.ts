import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDigitalProductAssistant,
  getDigitalSubtypeOptions,
  mergeDraftPreflightIssues,
  shouldUseDigitalProductIntelligence,
} from "./digital-product-intelligence-ui.ts";

test("distinguishes an entered unsaved price from a missing persisted price", () => {
  const result = buildDigitalProductAssistant({
    name: "Children's eBook",
    description: "A storybook for ages 3-7",
    sellingPrice: 199,
    persistedSellingPrice: null,
  });
  assert.equal(result.sellingPriceState, "entered_unsaved");
  assert.ok(
    result.notices.includes(
      "Selling price is entered in the current form but is not yet persisted.",
    ),
  );
});

test("reports a truly missing price", () => {
  assert.equal(
    buildDigitalProductAssistant({
      name: "AI prompt pack",
      sellingPrice: 0,
      persistedSellingPrice: 0,
    }).sellingPriceState,
    "missing",
  );
});

test("reports a changed saved price as entered but unsaved", () => {
  assert.equal(
    buildDigitalProductAssistant({ sellingPrice: 199, persistedSellingPrice: 149 })
      .sellingPriceState,
    "entered_unsaved",
  );
});

test("rewrites only the displayed stale price blocker while retaining other server blockers", () => {
  assert.deepEqual(
    mergeDraftPreflightIssues(["Missing selling price", "Missing product image"], {
      sellingPrice: 199,
      persistedSellingPrice: 0,
    }),
    ["Selling price entered — save draft to persist it", "Missing product image"],
  );
});

test("provides all supported subtype options to the existing Product Manager", () => {
  const options = getDigitalSubtypeOptions();
  assert.equal(options.length, 15);
  assert.ok(options.some((option) => option.value === "ebook_storybook"));
  assert.ok(options.some((option) => option.value === "online_course"));
  assert.ok(options.some((option) => option.value === "software"));
});

test("digital intelligence is isolated from every existing non-digital product type", () => {
  assert.equal(shouldUseDigitalProductIntelligence("digital"), true);
  for (const productType of ["physical", "affiliate", "pod", "dropshipping"]) {
    assert.equal(shouldUseDigitalProductIntelligence(productType), false);
  }
});
