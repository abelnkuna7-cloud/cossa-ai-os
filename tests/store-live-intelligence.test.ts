import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupplierIntelligence,
  snapshotAgeLabel,
  supplierCatalogueLabel,
} from "../src/lib/store-live-intelligence.ts";

test("supplier intelligence separates imported/published records from supplier-wide catalogue stock", () => {
  const rows = buildSupplierIntelligence(
    [{ id: "dmc", name: "DMC Wholesale", code: "dmc-wholesale", sync_method: "manual supplier-page check", last_verified_at: null }],
    [
      { supplier_id: "dmc", approval_status: "published", stock_status: "available", sync_status: "verified", published_at: "2026-09-09T10:00:00Z" },
      { supplier_id: "dmc", approval_status: "draft", stock_status: "unavailable", sync_status: "manual", published_at: null },
    ],
  );

  assert.equal(rows[0]?.imported, 2);
  assert.equal(rows[0]?.published, 1);
  assert.equal(rows[0]?.draft, 1);
  assert.equal(rows[0]?.unavailable, 1);
  assert.equal(rows[0]?.catalogueAvailable, null);
  assert.equal(supplierCatalogueLabel(rows[0]?.catalogueAvailable ?? null), "Not synced");
});

test("snapshot age makes historical data visibly stale", () => {
  const now = new Date("2026-09-09T10:00:00Z").getTime();
  assert.equal(snapshotAgeLabel("2026-09-04T10:00:00Z", now), "5 days old");
});
