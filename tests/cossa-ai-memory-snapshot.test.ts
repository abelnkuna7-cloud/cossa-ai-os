import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConversationMemorySnapshot,
  conversationMemoryStats,
  shouldRefreshConversationMemory,
} from "../src/lib/cossa-ai-memory-snapshot.ts";

const messages = [
  { role: "user" as const, content: "We have DMC approved as a local supplier. Do not rebuild the Store architecture." },
  { role: "assistant" as const, content: "Understood. The upgrade stays additive." },
  { role: "user" as const, content: "Next we need to verify delivery pricing and connect CJ through the existing API." },
];

test("buildConversationMemorySnapshot creates bounded deterministic memory without an AI call", () => {
  const snapshot = buildConversationMemorySnapshot(messages);

  assert.match(snapshot.summary, /DMC approved/);
  assert.ok(snapshot.importantFacts.some((item) => item.toLowerCase().includes("dmc")));
  assert.ok(snapshot.decisions.some((item) => item.toLowerCase().includes("do not rebuild")));
  assert.ok(snapshot.unresolvedTasks.some((item) => item.toLowerCase().includes("verify delivery pricing")));
  assert.ok(snapshot.summary.length <= 2400);
});

test("shouldRefreshConversationMemory only refreshes at the configured interval", () => {
  assert.equal(shouldRefreshConversationMemory({ messageCount: 3, lastSummarizedMessageCount: 0 }), true);
  assert.equal(shouldRefreshConversationMemory({ messageCount: 8, lastSummarizedMessageCount: 3, interval: 6 }), false);
  assert.equal(shouldRefreshConversationMemory({ messageCount: 9, lastSummarizedMessageCount: 3, interval: 6 }), true);
});

test("conversationMemoryStats reports persisted chat composition", () => {
  assert.deepEqual(conversationMemoryStats(messages), {
    messages: 3,
    userMessages: 2,
    assistantMessages: 1,
  });
});
