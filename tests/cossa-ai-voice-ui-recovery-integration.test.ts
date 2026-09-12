import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/cossa-voice-assistant.tsx", import.meta.url),
  "utf8",
);

test("voice UI uses the shared bounded recognition recovery state", () => {
  assert.match(source, /planVoiceRecognitionSessionRecovery/);
  assert.match(source, /voiceRecoveryStateRef/);
  assert.match(source, /recognitionRecoveryPlanRef/);
  assert.match(source, /planRecognitionSessionRecovery\(recognitionError\)/);
});

test("voice UI resets recognition penalties after a completed transcript", () => {
  assert.match(
    source,
    /results\.some\(\(result\) => result\.isFinal\)[\s\S]{0,160}markRecognitionHealthy\(\)/,
  );
  assert.match(source, /resetVoiceRecognitionRecovery/);
});

test("voice UI follows recovery-planner delay instead of old fixed recognition retry delays", () => {
  assert.match(source, /scheduleListeningRestart\(recovery\?\.delayMs \?\? COSSA_VOICE_RESTART_DELAY_MS\)/);
  assert.match(source, /scheduleListeningRestart\(recovery\.delayMs\)/);
  assert.doesNotMatch(source, /isBenignRecognitionError/);
  assert.doesNotMatch(source, /scheduleListeningRestart\(900\)/);
  assert.doesNotMatch(source, /scheduleListeningRestart\(500\)/);
});

test("stopping or disabling hands-free clears automatic recovery state", () => {
  assert.match(source, /voiceRecoveryStateRef\.current = resetVoiceSessionRecovery\(\)/);
  assert.match(source, /conversationPausedRef\.current = true/);
});
