import assert from "node:assert/strict";
import test from "node:test";

import {
  buildServerMemoryGrounding,
  selectRelevantDurableMemory,
  type DurableMemoryItem,
} from "../src/lib/cossa-ai-memory.server.ts";

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
    source_ref: overrides.source_ref ?? null,
    confidence: overrides.confidence ?? 1,
    effective_from: overrides.effective_from ?? null,
    expires_at: overrides.expires_at ?? null,
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

test("durable memory prioritises relevant Cossa facts", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({
        title: "Store supplier",
        body: "DMC Wholesale is an approved local dropship supplier.",
        scope: "store",
      }),
      memory({
        title: "Construction note",
        body: "Pretoria renovations remain a priority.",
        scope: "construction",
      }),
    ],
    "Who supplies our Store?",
    1,
  );

  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.title, "Store supplier");
});

test("scope-specific memory outranks unrelated group memory for domain requests", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({
        title: "General supplier policy",
        body: "Cossa uses approved suppliers.",
        scope: "group",
      }),
      memory({
        title: "Store supplier policy",
        body: "Cossa Store uses local-first supplier selection.",
        scope: "store",
        memory_type: "decision",
      }),
    ],
    "What is our Store supplier policy?",
    1,
  );

  assert.equal(selected[0]?.title, "Store supplier policy");
});

test("future and expired memory are excluded", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({
        title: "Old supplier status",
        body: "Expired status",
        scope: "store",
        expires_at: "2020-01-01T00:00:00.000Z",
      }),
      memory({
        title: "Future supplier status",
        body: "Not effective yet",
        scope: "store",
        effective_from: "2099-01-01T00:00:00.000Z",
      }),
    ],
    "supplier status",
  );

  assert.equal(selected.length, 0);
});

test("provenance-backed memory is preferred when relevance is otherwise equal", () => {
  const selected = selectRelevantDurableMemory(
    [
      memory({
        title: "Store rule A",
        body: "Supplier deliveries follow approved rules.",
        scope: "store",
        source: null,
        source_ref: null,
      }),
      memory({
        title: "Store rule B",
        body: "Supplier deliveries follow approved rules.",
        scope: "store",
        source: "supplier registry",
        source_ref: "DMC-2026",
      }),
    ],
    "Store supplier deliveries",
    1,
  );

  assert.equal(selected[0]?.title, "Store rule B");
});

test("memory grounding exposes provenance without granting executable authority", () => {
  const text = buildServerMemoryGrounding({
    durableItems: [
      memory({
        title: "Store policy",
        body: "Local-first supplier policy.",
        memory_type: "decision",
        source: "Store Operations Book",
        source_ref: "supplier-policy-local-first",
      }),
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
  assert.match(text, /source=Store Operations Book/);
  assert.match(text, /ref=supplier-policy-local-first/);
  assert.ok(text.length <= 1_200);
});
