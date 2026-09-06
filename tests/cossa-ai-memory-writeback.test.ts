import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConversationMemoryUpsertRow,
  writeConversationMemorySnapshot,
} from "../src/lib/cossa-ai-memory-writeback.server.ts";

const sampleMemory = {
  summary: "  Customer discussed a Store supplier review.  ",
  importantFacts: ["DMC is local", "DMC is local", "CJ has an API"],
  decisions: ["Keep local-first supplier policy"],
  unresolvedTasks: ["Verify delivery pricing"],
};

test("buildConversationMemoryUpsertRow sanitises and de-duplicates memory", () => {
  const row = buildConversationMemoryUpsertRow({
    organisationId: "org-1",
    userId: "user-1",
    conversationId: "conversation-1",
    memory: sampleMemory,
    messageCount: 17.9,
    lastMessageAt: "2026-09-06T12:00:00.000Z",
    now: "2026-09-06T12:01:00.000Z",
  });

  assert.equal(row.rolling_summary, "Customer discussed a Store supplier review.");
  assert.deepEqual(row.important_facts, ["DMC is local", "CJ has an API"]);
  assert.equal(row.last_summarized_message_count, 17);
  assert.equal(row.conversation_id, "conversation-1");
  assert.equal(row.updated_at, "2026-09-06T12:01:00.000Z");
});

test("writeback remains disabled unless explicitly enabled", async () => {
  const previous = process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
  delete process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;

  try {
    const result = await writeConversationMemorySnapshot({
      bearerToken: "not-used",
      conversationId: "conversation-1",
      memory: sampleMemory,
      messageCount: 4,
    });

    assert.deepEqual(result, { written: false, reason: "disabled" });
  } finally {
    if (previous === undefined) delete process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
    else process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED = previous;
  }
});

test("enabled writeback still refuses missing authentication", async () => {
  const previous = process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
  process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED = "true";

  try {
    const result = await writeConversationMemorySnapshot({
      bearerToken: null,
      conversationId: "conversation-1",
      memory: sampleMemory,
      messageCount: 4,
    });

    assert.deepEqual(result, { written: false, reason: "missing-auth" });
  } finally {
    if (previous === undefined) delete process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
    else process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED = previous;
  }
});

test("enabled writeback refuses compatibility or arbitrary conversation IDs", async () => {
  const previous = process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
  process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED = "true";

  try {
    const result = await writeConversationMemorySnapshot({
      bearerToken: "present-but-not-used-before-id-validation",
      conversationId: "cossa-compat-conversation",
      memory: sampleMemory,
      messageCount: 6,
    });

    assert.deepEqual(result, { written: false, reason: "invalid-conversation" });
  } finally {
    if (previous === undefined) delete process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED;
    else process.env.COSSA_AI_MEMORY_WRITEBACK_ENABLED = previous;
  }
});
