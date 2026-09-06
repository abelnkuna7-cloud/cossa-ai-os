import type { CossaConversationMessage } from "./cossa-ai-memory.ts";

/**
 * Creates a stable compatibility identity for callers that have not yet been
 * upgraded to send their persisted ai_conversations.id explicitly.
 *
 * Only the first few conversational turns are used so the identity remains
 * stable as later turns are appended or the provider window is trimmed.
 * Explicit caller-provided conversation IDs always take precedence elsewhere.
 */
export function deriveConversationIdentity(
  messages: readonly CossaConversationMessage[],
): string {
  const seed = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, 3)
    .map((message) => `${message.role}:${message.content.trim()}`)
    .join("\n")
    .slice(0, 12_000);

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `derived-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
