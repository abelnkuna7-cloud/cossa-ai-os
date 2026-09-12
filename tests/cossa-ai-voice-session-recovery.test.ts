import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_COSSA_VOICE_SESSION_RECOVERY,
  planVoiceProviderSessionRecovery,
  planVoiceRecognitionSessionRecovery,
  resetVoiceProviderRecovery,
  resetVoiceRecognitionRecovery,
} from "../src/lib/cossa-ai-voice-session-recovery.ts";

test("transient recognition retries advance one bounded session counter", () => {
  const first = planVoiceRecognitionSessionRecovery({
    state: INITIAL_COSSA_VOICE_SESSION_RECOVERY,
    error: "network",
    conversationMode: true,
    paused: false,
  });
  assert.equal(first.plan.action, "retry");
  assert.equal(first.nextState.recognitionAttempts, 1);

  const second = planVoiceRecognitionSessionRecovery({
    state: first.nextState,
    error: "network",
    conversationMode: true,
    paused: false,
  });
  assert.equal(second.nextState.recognitionAttempts, 2);
  assert.ok(second.plan.delayMs >= first.plan.delayMs);
});

test("benign recognition ending restarts and clears transient penalty", () => {
  const result = planVoiceRecognitionSessionRecovery({
    state: { recognitionAttempts: 3, providerAttempts: 0 },
    error: "no-speech",
    conversationMode: true,
    paused: false,
  });
  assert.equal(result.plan.action, "restart");
  assert.equal(result.nextState.recognitionAttempts, 0);
});

test("permission failures pause and never increment automatic retry counter", () => {
  const result = planVoiceRecognitionSessionRecovery({
    state: INITIAL_COSSA_VOICE_SESSION_RECOVERY,
    error: "service-not-allowed",
    conversationMode: true,
    paused: false,
  });
  assert.equal(result.plan.action, "pause");
  assert.equal(result.nextState.recognitionAttempts, 0);
});

test("provider retry state honours retry-after while preserving conversation state", () => {
  const result = planVoiceProviderSessionRecovery({
    state: { recognitionAttempts: 2, providerAttempts: 0 },
    status: 429,
    retryAfterMs: 2400,
  });
  assert.equal(result.plan.action, "retry");
  assert.equal(result.plan.delayMs, 2400);
  assert.equal(result.nextState.providerAttempts, 1);
  assert.equal(result.nextState.recognitionAttempts, 2);
});

test("successful stages can reset recognition and provider counters independently", () => {
  const state = { recognitionAttempts: 3, providerAttempts: 2 };
  assert.deepEqual(resetVoiceRecognitionRecovery(state), {
    recognitionAttempts: 0,
    providerAttempts: 2,
  });
  assert.deepEqual(resetVoiceProviderRecovery(state), {
    recognitionAttempts: 3,
    providerAttempts: 0,
  });
});
