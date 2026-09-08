import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/routes/businesses.store-inventory.tsx", import.meta.url), "utf8");

test("public catalogue projection is not organisation-filtered", () => {
  const start = source.indexOf('from<{ id: string }>("store_public_products")');
  assert.notEqual(start, -1, "store_public_products count query should exist");
  const publicQuery = source.slice(start, start + 220);
  assert.doesNotMatch(publicQuery, /organisation_id/);
});

test("public catalogue count failure is non-fatal to Store Operations Book loading", () => {
  const start = source.indexOf("const error =");
  const end = source.indexOf("storeProductIdentityResult.error;", start);
  assert.notEqual(start, -1, "fatal Store Operations Book error chain should exist");
  assert.notEqual(end, -1, "fatal Store Operations Book error chain should terminate");
  const fatalChain = source.slice(start, end + "storeProductIdentityResult.error;".length);
  assert.doesNotMatch(fatalChain, /publicCatalogueCountResult\.error/);
  assert.match(source, /Supplier and fulfilment data remain available/);
});
