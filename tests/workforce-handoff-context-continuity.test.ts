import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve(
  "supabase/migrations/20260913112500_workforce_handoff_context_continuity.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");

test("context continuity propagates only completed recorded handoff identifiers", () => {
  assert.match(sql, /new\.status <> 'completed'/);
  assert.match(sql, /old\.status = 'completed'/);
  assert.match(sql, /retained_record_ids/);
  assert.match(sql, /organisation_id = new\.organisation_id/);
  assert.match(sql, /mission_id = new\.mission_id/);
});

test("context continuity selects only a later numbered stage", () => {
  assert.match(sql, /context ->> 'stage'/);
  assert.match(sql, /> current_stage/);
  assert.match(sql, /order by \(eh\.context ->> 'stage'\)::integer asc/);
  assert.match(sql, /limit 1/);
});

test("context continuity is additive and cannot advance workflow state", () => {
  assert.match(sql, /set retained_record_ids =/);
  assert.match(sql, /status in \('pending', 'accepted'\)/);
  assert.doesNotMatch(sql, /set status =/i);
  assert.doesNotMatch(sql, /delete from/i);
});

test("browser roles cannot execute the security-definer helper directly", () => {
  assert.match(
    sql,
    /revoke all on function public\.propagate_workforce_handoff_retained_ids\(\) from authenticated;/,
  );
  assert.match(sql, /from anon;/);
  assert.match(sql, /from public;/);
});
