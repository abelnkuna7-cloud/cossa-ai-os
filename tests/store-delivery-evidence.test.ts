import assert from "node:assert/strict";
import test from "node:test";

import { parseStoreDeliveryEvidence } from "../src/lib/store-delivery-evidence.ts";

test("parses labelled product dimensions with attached units", () => {
  const result = parseStoreDeliveryEvidence("Product Size: 30cm x 20cm x 10cm");
  assert.deepEqual(result.dimensions && [result.dimensions.length, result.dimensions.width, result.dimensions.height], [30, 20, 10]);
  assert.equal(result.dimensions?.kind, "product");
});

test("parses millimetres and packed dimensions without guessing", () => {
  const result = parseStoreDeliveryEvidence("Packed Dimensions: 300 x 200 x 100 mm");
  assert.deepEqual(result.dimensions && [result.dimensions.length, result.dimensions.width, result.dimensions.height], [30, 20, 10]);
  assert.equal(result.dimensions?.kind, "package");
});

test("parses explicit package and weight evidence", () => {
  const result = parseStoreDeliveryEvidence("Package Size is about 10x10x5cm. Net Weight: 500 g");
  assert.equal(result.dimensions?.kind, "package");
  assert.equal(result.weight?.kg, 0.5);
  assert.equal(result.weight?.kind, "product");
});

test("rejects unlabelled triples and generic small-size claims", () => {
  const result = parseStoreDeliveryEvidence("Small size 30 x 20 x 10. Lightweight item.");
  assert.equal(result.dimensions, null);
  assert.equal(result.weight, null);
});
