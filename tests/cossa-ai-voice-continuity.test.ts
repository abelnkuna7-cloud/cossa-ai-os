import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanSpeechText,
  isBenignRecognitionError,
  shouldRestartHandsFreeConversation,
  splitSpeechText,
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
    shouldRestartHandsFreeConversation({
      conversationMode: true,
      paused: false,
      thinking: false,
      speaking: false,
    }),
    true,
  );
  assert.equal(
    shouldRestartHandsFreeConversation({
      conversationMode: true,
      paused: false,
      thinking: true,
      speaking: false,
    }),
    false,
  );
  assert.equal(
    shouldRestartHandsFreeConversation({
      conversationMode: true,
      paused: true,
      thinking: false,
      speaking: false,
    }),
    false,
  );
});

test("no-speech and intentional abort are recoverable recognition events", () => {
  assert.equal(isBenignRecognitionError("no-speech"), true);
  assert.equal(isBenignRecognitionError("aborted"), true);
  assert.equal(isBenignRecognitionError("not-allowed"), false);
});
