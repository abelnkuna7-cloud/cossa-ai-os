import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLegacyGatewayWindow,
  buildProviderConversationWindow,
  validateConversationMessages,
} from "../src/lib/cossa-ai-chat-window.ts";

test("long conversations are accepted without a 40-message cutoff", () => {
  const messages = Array.from({ length: 100 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message-${index + 1}`,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

  const validation = validateConversationMessages(messages);

  assert.equal(validation.ok, true);
});

test("provider context remains bounded to the newest messages", () => {
  const messages = Array.from({ length: 100 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message-${index + 1}`,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

  const window = buildProviderConversationWindow(messages, {
    maxMessages: 8,
    maxCharacters: 8_000,
  });

  assert.equal(window.length, 8);
  assert.equal(window[0]?.content, "message-93");
  assert.equal(window[7]?.content, "message-100");
});

test("legacy gateway compatibility window stays below the old request cutoff", () => {
  const messages = Array.from({ length: 100 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message-${index + 1}`,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

  const window = buildLegacyGatewayWindow(messages);

  assert.equal(window.length, 32);
  assert.equal(window[0]?.content, "message-69");
  assert.equal(window[31]?.content, "message-100");
  assert.ok(window.reduce((total, message) => total + message.content.length, 0) < 60_000);
});

test("oversized individual messages are rejected without ending the conversation model", () => {
  const validation = validateConversationMessages([
    { role: "user", content: "x".repeat(12_001) },
  ]);

  assert.equal(validation.ok, false);
  assert.match(validation.error ?? "", /single message/i);
});

test("runtime validation rejects unsupported roles before gateway normalization", () => {
  const validation = validateConversationMessages([
    { role: "tool" as "user", content: "unexpected role" },
  ]);

  assert.equal(validation.ok, false);
  assert.match(validation.error ?? "", /supported role/i);
});
