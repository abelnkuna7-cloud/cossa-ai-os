export const COSSA_VOICE_RESTART_DELAY_MS = 350;
export const COSSA_VOICE_MAX_UTTERANCE_CHARACTERS = 280;
export const COSSA_VOICE_MAX_TRANSIENT_RETRIES = 4;
export const COSSA_VOICE_MAX_RETRY_DELAY_MS = 8_000;

const BENIGN_RECOGNITION_ERRORS = new Set(["aborted", "no-speech"]);
const TRANSIENT_RECOGNITION_ERRORS = new Set([
  "audio-capture",
  "network",
  "service-not-allowed",
]);
const PERMISSION_RECOGNITION_ERRORS = new Set(["not-allowed", "permission-denied"]);

export type CossaVoiceRecoveryAction = "restart" | "retry" | "pause";

export interface CossaVoiceRecoveryPlan {
  action: CossaVoiceRecoveryAction;
  delayMs: number;
  reason: string;
}

export function normaliseRecognitionError(error: unknown): string {
  return typeof error === "string" ? error.trim().toLowerCase() : "";
}

export function isBenignRecognitionError(error: unknown): boolean {
  return BENIGN_RECOGNITION_ERRORS.has(normaliseRecognitionError(error));
}

export function isTransientRecognitionError(error: unknown): boolean {
  const normalised = normaliseRecognitionError(error);
  return BENIGN_RECOGNITION_ERRORS.has(normalised) || TRANSIENT_RECOGNITION_ERRORS.has(normalised);
}

export function shouldRestartHandsFreeConversation({
  conversationMode,
  paused,
  thinking,
  speaking,
}: {
  conversationMode: boolean;
  paused: boolean;
  thinking: boolean;
  speaking: boolean;
}): boolean {
  return conversationMode && !paused && !thinking && !speaking;
}

export function voiceRetryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const exponential = COSSA_VOICE_RESTART_DELAY_MS * 2 ** safeAttempt;
  return Math.min(COSSA_VOICE_MAX_RETRY_DELAY_MS, exponential);
}

/**
 * Recognition recovery policy keeps the saved Cossa conversation alive while
 * avoiding endless microphone loops. Permission failures pause immediately;
 * transient browser/network failures retry with bounded exponential backoff.
 */
export function planRecognitionRecovery({
  error,
  attempt,
  conversationMode,
  paused,
}: {
  error: unknown;
  attempt: number;
  conversationMode: boolean;
  paused: boolean;
}): CossaVoiceRecoveryPlan {
  if (!conversationMode || paused) {
    return { action: "pause", delayMs: 0, reason: "Hands-free conversation is paused." };
  }

  const normalised = normaliseRecognitionError(error);

  if (PERMISSION_RECOGNITION_ERRORS.has(normalised)) {
    return {
      action: "pause",
      delayMs: 0,
      reason: "Microphone permission is required before voice conversation can continue.",
    };
  }

  if (isBenignRecognitionError(normalised)) {
    return {
      action: "restart",
      delayMs: COSSA_VOICE_RESTART_DELAY_MS,
      reason: "Speech recognition ended without a fatal error; resume listening.",
    };
  }

  if (TRANSIENT_RECOGNITION_ERRORS.has(normalised) && attempt < COSSA_VOICE_MAX_TRANSIENT_RETRIES) {
    return {
      action: "retry",
      delayMs: voiceRetryDelayMs(attempt),
      reason: "Transient speech-recognition failure; retry without deleting the conversation.",
    };
  }

  return {
    action: "pause",
    delayMs: 0,
    reason: "Voice recognition needs user attention before automatic listening resumes.",
  };
}

export function isRecoverableVoiceProviderStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * Provider recovery is deliberately bounded. A failed reasoning call may be
 * retried later, but the conversation ID/history stays intact and the browser
 * must never create multiple concurrent reasoning calls for one spoken turn.
 */
export function planVoiceProviderRecovery({
  status,
  attempt,
  retryAfterMs,
}: {
  status: number;
  attempt: number;
  retryAfterMs?: number | null;
}): CossaVoiceRecoveryPlan {
  if (!isRecoverableVoiceProviderStatus(status) || attempt >= COSSA_VOICE_MAX_TRANSIENT_RETRIES) {
    return {
      action: "pause",
      delayMs: 0,
      reason: "The reasoning provider failure should not be retried automatically.",
    };
  }

  const serverDelay =
    typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs >= 0
      ? Math.min(COSSA_VOICE_MAX_RETRY_DELAY_MS, Math.floor(retryAfterMs))
      : null;

  return {
    action: "retry",
    delayMs: serverDelay ?? voiceRetryDelayMs(attempt),
    reason:
      status === 429
        ? "Provider capacity is temporarily constrained; retry later without ending the conversation."
        : "Transient reasoning-provider failure; retry later without ending the conversation.",
  };
}

export function cleanSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Browser speech synthesis is significantly more reliable when long answers
 * are queued as bounded sentence-aware utterances instead of one very large
 * utterance. This keeps Cossa talking through long reasoning answers and lets
 * the hands-free loop resume only after the final chunk finishes.
 */
export function splitSpeechText(
  text: string,
  maxCharacters = COSSA_VOICE_MAX_UTTERANCE_CHARACTERS,
): string[] {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxCharacters) return [cleaned];

  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  const chunks: string[] = [];
  let current = "";

  function flush() {
    const value = current.trim();
    if (value) chunks.push(value);
    current = "";
  }

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > maxCharacters) {
      flush();
      const words = sentence.split(/\s+/);
      let wordChunk = "";
      for (const word of words) {
        const candidate = [wordChunk, word].filter(Boolean).join(" ");
        if (candidate.length > maxCharacters && wordChunk) {
          chunks.push(wordChunk);
          wordChunk = word;
        } else {
          wordChunk = candidate;
        }
      }
      if (wordChunk) chunks.push(wordChunk);
      continue;
    }

    const candidate = [current, sentence].filter(Boolean).join(" ");
    if (candidate.length > maxCharacters && current) {
      flush();
      current = sentence;
    } else {
      current = candidate;
    }
  }

  flush();
  return chunks;
}
