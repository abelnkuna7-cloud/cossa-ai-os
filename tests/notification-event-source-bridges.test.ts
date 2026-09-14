import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260913100000_notification_event_source_bridges.sql",
    import.meta.url,
  ),
  "utf8",
);

test("pending approvals project one duplicate-safe CEO notification event", () => {
  assert.match(migration, /AFTER INSERT ON public\.approvals/);
  assert.match(migration, /IF NEW\.status <> 'pending'/);
  assert.match(migration, /'approval:pending:' \|\| NEW\.id::text/);
  assert.match(migration, /'approval'/);
  assert.match(migration, /ON CONFLICT \(organisation_id, event_key\) DO NOTHING/);
});

test("failed mission runs project one workforce failure event", () => {
  assert.match(migration, /AFTER INSERT OR UPDATE OF status ON public\.mission_runs/);
  assert.match(migration, /IF NEW\.status <> 'failed'/);
  assert.match(migration, /OLD\.status = 'failed'/);
  assert.match(migration, /'workforce:run_failed:' \|\| NEW\.id::text/);
  assert.match(migration, /'workforce'/);
});

test("source bridge functions are not callable by browser roles", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION private\.project_pending_approval_notification_event\(\) FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION private\.project_failed_mission_run_notification_event\(\) FROM PUBLIC, anon, authenticated/,
  );
});

test("projected events carry evidence and action targets without sending messages", () => {
  assert.match(migration, /jsonb_build_object\(/);
  assert.match(migration, /'\/ai\/workforce'/);
  assert.doesNotMatch(migration, /http|webhook|callmebot|whatsapp|send_message/i);
});
