import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260913091500_notification_event_stream.sql",
    import.meta.url,
  ),
  "utf8",
);

test("notification events are immutable browser-readable operational facts", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_events/);
  assert.match(migration, /ALTER TABLE public\.notification_events ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /FOR SELECT TO authenticated/);
  assert.doesNotMatch(migration, /FOR INSERT TO authenticated/);
  assert.doesNotMatch(migration, /FOR UPDATE TO authenticated/);
  assert.doesNotMatch(migration, /FOR DELETE TO authenticated/);
});

test("notification events are evidence-backed and duplicate-safe", () => {
  assert.match(migration, /evidence jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(migration, /UNIQUE \(organisation_id, event_key\)/);
  assert.match(migration, /occurred_at timestamptz NOT NULL/);
  assert.match(migration, /source_type text NOT NULL/);
});

test("notification event stream supports revenue and operational prioritisation", () => {
  for (const category of [
    "revenue",
    "approval",
    "workforce",
    "operations",
    "supplier",
    "compliance",
    "security",
    "system",
  ]) {
    assert.match(migration, new RegExp(`'${category}'`));
  }
  for (const severity of ["critical", "high", "normal", "info"]) {
    assert.match(migration, new RegExp(`'${severity}'`));
  }
});
