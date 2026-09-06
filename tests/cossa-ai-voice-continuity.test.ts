import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanSpeechText,
  isBenignRecognitionError,
  isRecoverableVoiceProviderStatus,
  planRecognitionRecovery,
  planVoiceProviderRecovery,
  shouldRestartHandsFreeConversation,
  splitSpeechText,
  voiceRetryDelayMs,
} from "../src/lib/cossa-ai-voice-continuity.ts";

test("long spoken answers are split into bounded speech chunks", () => {
  const text = `${"A useful sentence about Cossa operations. ".repeat(8)}${"Another sentence about reasoning and next actions. ".repeat(8)}`;
  const chunks = splitSpeechText(text, 180);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 180));
  assert.ok(chunks.every((chunk) => chunk.trim().length > 0));
});

test("speech text removes markdown noise without removing the answer", () => {
  const cleaned = cleanSpeechText("**Cossa AI** can use [Growth](https://example.com) and `Supabase`. # Continue");
  assert.equal(cleaned, "Cossa AI can use Growth and Supabase. Continue");
});

test("hands-free conversation restarts only when safe", () => {
  assert.equal(
    shouldRestartHandsFreeConversation({ conversationMode: true, paused: false, thinking: false, speaking: false }),
    true,
  );
  assert.equal(
    shouldRestartHandsFreeConversation({ conversationMode: true, paused: false, thinking: true, speaking: false }),
    false,
  );
  assert.equal(
    shouldRestartHandsFreeConversation({ conversationMode: true, paused: true, thinking: false, speaking: false }),
    false,
  );
});

test("no-speech and intentional abort are recoverable recognition events", () => {
  assert.equal(isBenignRecognitionError("no-speech"), true);
  assert.equal(isBenignRecognitionError("aborted"), true);
  assert.equal(isBenignRecognitionError("not-allowed"), false);
});

test("recognition recovery retries transient network failure without losing conversation", () => {
  const plan = planRecognitionRecovery({ error: "network", attempt: 1, conversationMode: true, paused: false });
  assert.equal(plan.action, "retry");
  assert.equal(plan.delayMs, voiceRetryDelayMs(1));
  assert.match(plan.reason, /without deleting the conversation/i);
});

test("microphone permission failures pause instead of looping", () => {
  for (const error of ["not-allowed", "permission-denied", "service-not-allowed"]) {
    const plan = planRecognitionRecovery({ error, attempt: 0, conversationMode: true, paused: false });
    assert.equal(plan.action, "pause");
    assert.equal(plan.delayMs, 0);
    assert.match(plan.reason, /permission/i);
  }
});

test("provider rate limit is recoverable with server retry-after when available", () => {
  assert.equal(isRecoverableVoiceProviderStatus(429), true);
  const plan = planVoiceProviderRecovery({ status: 429, attempt: 0, retryAfterMs: 2_500 });
  assert.equal(plan.action, "retry");
  assert.equal(plan.delayMs, 2_500);
  assert.match(plan.reason, /capacity/i);
});

test("authentication provider failures do not auto-retry spoken turns", () => {
  assert.equal(isRecoverableVoiceProviderStatus(401), false);
  const plan = planVoiceProviderRecovery({ status: 401, attempt: 0 });
  assert.equal(plan.action, "pause");
  assert.equal(plan.delayMs, 0);
});
