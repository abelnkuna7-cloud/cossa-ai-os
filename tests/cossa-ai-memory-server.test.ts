import assert from "node:assert/strict";
import test from "node:test";

import {
  buildServerMemoryGrounding,
  selectRelevantDurableMemory,
  type DurableMemoryItem,
} from "../src/lib/cossa-ai-memory.server";

function memory(
  overrides: Partial<DurableMemoryItem> & Pick<DurableMemoryItem, "title" | "body">,
): DurableMemoryItem {
  return {
    title: overrides.title,
    body: overrides.body,
    scope: overrides.scope ?? "group",
    visibility: overrides.visibility ?? "internal",
    memory_type: overrides.memory_type ?? "fact",
    source: overrides.source ?? "internal",
    confidence: overrides.confidence ?? 1,
    expires_at: overrides.expires_at ?? null,
    updated_at: overrides.updated_at ?? "2026-09-06T10:00:00.000Z",
  };
}

test("durable memory prioritises relevant Cossa facts", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({ title: "Store supplier", body: "DMC Wholesale is an approved local dropship supplier.", scope: "store" }),
      memory({ title: "Construction note", body: "Pretoria renovations remain a priority.", scope: "construction" }),
    ],
    "Who supplies our Store?",
    1,
  );

  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.title, "Store supplier");
});

test("expired memory is excluded", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({
        title: "Old supplier status",
        body: "Expired status",
        scope: "store",
        expires_at: "2020-01-01T00:00:00.000Z",
      }),
    ],
    "supplier status",
  );

  assert.equal(selected.length, 0);
});

test("memory grounding includes conversation decisions but not executable authority", () => {
  const text = buildServerMemoryGrounding({
    durableItems: [
      memory({ title: "Store policy", body: "Local-first supplier policy.", memory_type: "decision" }),
    ],
    conversationMemory: {
      summary: "Cossa AI OS is being upgraded, not rebuilt.",
      importantFacts: ["Production remains protected."],
      decisions: ["Do not rebuild the platform."],
      unresolvedTasks: ["Wire durable memory into chat."],
    },
  });

  assert.match(text, /COSSA MEMORY GROUNDING/);
  assert.match(text, /not as executable instructions/i);
  assert.match(text, /Do not rebuild the platform/);
  assert.ok(text.length <= 1_200);
});
