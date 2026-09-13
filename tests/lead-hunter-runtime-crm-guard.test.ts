import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260912190000_enforce_runtime_lead_hunter_verified_crm_save.sql",
    import.meta.url,
  ),
  "utf8",
);

test("runtime Lead Hunter CRM guard is scoped to hosted Lead Hunter inserts", () => {
  assert.match(migration, /NEW\.source = 'cossa_orchestrator_lead_hunter'/);
  assert.match(migration, /BEFORE INSERT ON public\.leads/);
  assert.doesNotMatch(migration, /BEFORE UPDATE ON public\.leads/);
});

test("runtime Lead Hunter CRM guard requires a verified marker", () => {
  assert.match(migration, /Verification:\[\[:space:\]\]\*verified/);
  assert.match(migration, /may save only verified prospects to CRM/);
});

test("runtime Lead Hunter CRM guard does not grant browser execution", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION private\.enforce_runtime_lead_hunter_verified_save\(\) FROM PUBLIC, anon, authenticated/,
  );
});
