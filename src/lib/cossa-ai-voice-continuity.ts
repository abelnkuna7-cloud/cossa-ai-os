export const COSSA_VOICE_RESTART_DELAY_MS = 350;
export const COSSA_VOICE_MAX_UTTERANCE_CHARACTERS = 280;

const BENIGN_RECOGNITION_ERRORS = new Set(["aborted", "no-speech"]);

export function normaliseRecognitionError(error: unknown): string {
  return typeof error === "string" ? error.trim().toLowerCase() : "";
}

export function isBenignRecognitionError(error: unknown): boolean {
  return BENIGN_RECOGNITION_ERRORS.has(normaliseRecognitionError(error));
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
