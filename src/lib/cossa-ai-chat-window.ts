import { selectRecentConversationWindow, type CossaConversationMessage } from "./cossa-ai-memory";

/**
 * User-facing conversations are not capped at a small fixed turn count.
 *
 * The full conversation should be persisted by the application, while only a
 * bounded recent window plus rolling memory is sent to reasoning providers.
 * This protects provider token/rate limits without ending the conversation.
 */
export const MAX_CHAT_MESSAGE_LENGTH = 12_000;
export const MAX_CHAT_REQUEST_CHARACTERS = 250_000;
export const DEFAULT_PROVIDER_RECENT_MESSAGES = 8;
export const DEFAULT_PROVIDER_RECENT_CHARACTERS = 8_000;

export interface ChatWindowValidationResult {
  ok: boolean;
  error?: string;
}

export function validateConversationMessages(
  messages: CossaConversationMessage[],
): ChatWindowValidationResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "At least one chat message is required." };
  }

  let totalCharacters = 0;

  for (const message of messages) {
    if (!message || typeof message.content !== "string") {
      return { ok: false, error: "Every chat message must contain text content." };
    }

    if (message.content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return {
        ok: false,
        error: `A single message may not exceed ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      };
    }

    totalCharacters += message.content.length;

    if (totalCharacters > MAX_CHAT_REQUEST_CHARACTERS) {
      return {
        ok: false,
        error: "This request is too large to process safely. The conversation itself can continue; send the newest message again and Cossa AI will use its saved memory plus recent context.",
      };
    }
  }

  return { ok: true };
}

export function buildProviderConversationWindow(
  messages: CossaConversationMessage[],
  options?: {
    maxMessages?: number;
    maxCharacters?: number;
  },
): CossaConversationMessage[] {
  return selectRecentConversationWindow(
    messages,
    options?.maxMessages ?? DEFAULT_PROVIDER_RECENT_MESSAGES,
    options?.maxCharacters ?? DEFAULT_PROVIDER_RECENT_CHARACTERS,
  );
}
