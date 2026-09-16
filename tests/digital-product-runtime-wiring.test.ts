import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productManager = readFileSync("src/routes/businesses.store-products.tsx", "utf8");
const workforce = readFileSync("src/lib/workforce-data.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260916070000_add_digital_product_intelligence.sql",
  "utf8",
);

test("existing Product Manager flows remain present beside direct digital intelligence wiring", () => {
  for (const existingFlow of [
    "generateSku",
    "uploadProductImage",
    "uploadDigitalFile",
    "uploadCustomerFiles",
    "persistImageOrder",
    "persistDeliverableOrder",
    "runPreflight",
    "saveProduct",
    '"physical"',
    '"affiliate"',
    '"pod"',
    '"dropshipping"',
  ]) {
    assert.ok(
      productManager.includes(existingFlow),
      `Missing existing Product Manager flow: ${existingFlow}`,
    );
  }
  assert.ok(productManager.includes("DigitalProductIntelligencePanel"));
  assert.ok(productManager.includes('form.product_type === "digital"'));
  assert.ok(productManager.includes('from("store_digital_product_intelligence")'));
  assert.ok(productManager.includes('{ onConflict: "product_id" }'));
  assert.ok(productManager.includes("mergeDraftPreflightIssues"));
  assert.ok(productManager.includes("if (!result?.ready) return"));
});

test("Workforce composes capability upgrades into the existing runtime source of truth", () => {
  assert.ok(workforce.includes("composeDigitalProductWorkforceProfiles"));
  assert.ok(workforce.includes("BASE_COSSA_GROWTH_WORKFORCE"));
  assert.ok(workforce.includes('employee_key: "product-intelligence-analyst"'));
  assert.ok(workforce.includes('employee_key: "store-operations-manager"'));
  assert.ok(workforce.includes("synchroniseKnownProfiles"));
  assert.ok(workforce.includes("requires_approval_by_default"));
});

test("digital intelligence migration is additive, RLS-protected and invoker-safe", () => {
  assert.doesNotMatch(migration, /\b(drop\s+table|truncate|delete\s+from)\b/i);
  assert.doesNotMatch(migration, /security\s+definer/i);
  assert.match(migration, /create table if not exists public\.store_digital_product_intelligence/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /member\.role = any \(array\['owner'::text, 'admin'::text\]\)/i);
  assert.match(
    migration,
    /product\.organisation_id = store_digital_product_intelligence\.organisation_id/i,
  );
  assert.match(migration, /security invoker/i);
  assert.match(
    migration,
    /revoke all on table public\.store_digital_product_intelligence from anon/i,
  );
  assert.match(migration, /grant select, insert, update, delete/i);
});
