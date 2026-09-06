import { selectRecentConversationWindow, type CossaConversationMessage } from "./cossa-ai-memory";

/**
 * User-facing conversations are not capped at a small fixed turn count.
 *
 * The application may retain the full conversation, while only a bounded
 * recent window plus rolling memory should be sent to reasoning providers.
 * This protects provider token/rate limits without ending the conversation.
 */
export const MAX_CHAT_MESSAGE_LENGTH = 12_000;
export const MAX_CHAT_REQUEST_CHARACTERS = 250_000;
export const DEFAULT_PROVIDER_RECENT_MESSAGES = 8;
export const DEFAULT_PROVIDER_RECENT_CHARACTERS = 8_000;

/**
 * Compatibility window for the existing /api/chat route while the durable
 * memory layer is being wired into that route. Keeping this below the legacy
 * route's old 40-message / 60k-character validation means a long-lived chat
 * can continue without forcing the user to start over.
 */
export const LEGACY_GATEWAY_MESSAGE_WINDOW = 32;
export const LEGACY_GATEWAY_CHARACTER_WINDOW = 50_000;

export interface ChatWindowValidationResult {
  ok: boolean;
  error?: string;
}

function isConversationRole(value: unknown): value is CossaConversationMessage["role"] {
  return value === "system" || value === "user" || value === "assistant";
}

export function validateConversationMessages(
  messages: CossaConversationMessage[],
): ChatWindowValidationResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "At least one chat message is required." };
  }

  let totalCharacters = 0;

  for (const message of messages) {
    if (
      !message ||
      typeof message !== "object" ||
      !isConversationRole(message.role) ||
      typeof message.content !== "string"
    ) {
      return { ok: false, error: "Every chat message must contain a supported role and text content." };
    }

    if (!message.content.trim()) {
      return { ok: false, error: "Chat messages cannot be empty." };
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
        error: "This request is too large to process safely. The conversation itself can continue; resend the newest message after the application has retained prior context, and Cossa AI can continue using durable memory plus recent context once memory persistence is enabled.",
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

/**
 * Produces a compatibility-safe request window for the current chat gateway.
 * This is not the conversation history itself; it is only the bounded slice
 * handed to the reasoning route.
 */
export function buildLegacyGatewayWindow(
  messages: CossaConversationMessage[],
): CossaConversationMessage[] {
  return buildProviderConversationWindow(messages, {
    maxMessages: LEGACY_GATEWAY_MESSAGE_WINDOW,
    maxCharacters: LEGACY_GATEWAY_CHARACTER_WINDOW,
  });
}
