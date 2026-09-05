import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMemoryGroundingBlock,
  canReadMemory,
  selectRecentConversationWindow,
} from "../src/lib/cossa-ai-memory.ts";

test("keeps only recent bounded conversation context without ending the conversation", () => {
  const messages = Array.from({ length: 100 }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `message-${index + 1}`,
  }));

  const selected = selectRecentConversationWindow(messages, 8, 8_000);

  assert.equal(selected.length, 8);
  assert.equal(selected[0]?.content, "message-93");
  assert.equal(selected[7]?.content, "message-100");
});

test("visibility prevents public surfaces from reading internal or CEO memory", () => {
  assert.equal(canReadMemory("public", "public"), true);
  assert.equal(canReadMemory("public", "internal"), false);
  assert.equal(canReadMemory("customer", "internal"), false);
  assert.equal(canReadMemory("internal", "customer"), true);
  assert.equal(canReadMemory("ceo", "internal"), true);
  assert.equal(canReadMemory("ceo", "ceo"), true);
});

test("grounding block combines durable memory and recent turns", () => {
  const block = buildMemoryGroundingBlock(
    {
      summary: "Cossa Store supplier work is in progress.",
      importantFacts: ["Use local-first supplier policy."],
      decisions: ["Do not rebuild Cossa AI OS."],
      unresolvedTasks: ["Complete intelligence wiring."],
    },
    [{ role: "user", content: "Continue the upgrade." }],
  );

  assert.match(block, /Cossa Store supplier work is in progress/);
  assert.match(block, /Do not rebuild Cossa AI OS/);
  assert.match(block, /Continue the upgrade/);
});
