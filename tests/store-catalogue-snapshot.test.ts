import assert from "node:assert/strict";
import test from "node:test";
import { compareCatalogueSnapshots } from "../src/lib/store-catalogue-snapshot.ts";

const item = (id: string, status = "active", publicPresent = true) => ({
  product_id: id,
  sku: `SKU-${id}`,
  slug: `item-${id}`,
  source_status: status,
  public_present: publicPresent,
});

test("identical snapshots have no differences", () => {
  const snapshot = [item("a"), item("b", "draft", false)];
  const result = compareCatalogueSnapshots(snapshot, snapshot);
  assert.deepEqual(
    Object.values(result).map((value) => value.length),
    [0, 0, 0, 0, 0, 0, 0],
  );
});

test("comparison reports source and public projection changes", () => {
  const result = compareCatalogueSnapshots(
    [item("a", "draft", false), item("gone"), item("archived")],
    [item("a"), item("new"), item("archived", "archived", false)],
  );
  assert.equal(result.added[0].product_id, "new");
  assert.equal(result.removed[0].product_id, "gone");
  assert.equal(result.activated[0].product_id, "a");
  assert.equal(result.publicAdditions[0].product_id, "a");
  assert.equal(result.archived[0].product_id, "archived");
});
