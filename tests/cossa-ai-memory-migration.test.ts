import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260906002000_add_cossa_ai_memory.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, "utf8")).replace(/\s+/g, " ").toLowerCase();
}

test("memory migration binds conversation memory to persisted Cossa chats", async () => {
  const sql = await migrationSql();

  assert.match(sql, /conversation_id uuid not null/);
  assert.match(
    sql,
    /foreign key \(conversation_id, organisation_id\) references public\.ai_conversations\(id, organisation_id\) on delete cascade/,
  );
  assert.match(sql, /unique \(organisation_id, user_id, conversation_id\)/);
});

test("memory migration enforces authenticated organisation and conversation ownership", async () => {
  const sql = await migrationSql();

  assert.match(sql, /public\.is_organisation_member\(organisation_id\)/);
  assert.match(sql, /conversation\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
});

test("institutional memory does not grant general client mutation policies", async () => {
  const sql = await migrationSql();
  const institutionalPolicySection = sql.split("create policy \"users read own conversation memory\"")[0];

  assert.doesNotMatch(institutionalPolicySection, /on public\.cossa_ai_memory_items for insert/);
  assert.doesNotMatch(institutionalPolicySection, /on public\.cossa_ai_memory_items for update/);
  assert.doesNotMatch(institutionalPolicySection, /on public\.cossa_ai_memory_items for delete/);
  assert.doesNotMatch(sql, /to anon/);
});

test("memory migration keeps bounded structured memory fields", async () => {
  const sql = await migrationSql();

  assert.match(sql, /char_length\(rolling_summary\) <= 8000/);
  assert.match(sql, /jsonb_typeof\(important_facts\) = 'array'/);
  assert.match(sql, /jsonb_typeof\(decisions\) = 'array'/);
  assert.match(sql, /jsonb_typeof\(open_loops\) = 'array'/);
});
