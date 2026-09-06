export type CossaMemoryVisibility = "public" | "customer" | "internal" | "ceo";

export interface CossaConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CossaConversationMemory {
  summary: string;
  importantFacts: string[];
  decisions: string[];
  unresolvedTasks: string[];
}

const DEFAULT_RECENT_MESSAGE_LIMIT = 8;
const DEFAULT_RECENT_CHARACTER_LIMIT = 8_000;

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Keeps the reasoning window bounded while allowing the actual conversation
 * to continue indefinitely in persistent storage.
 */
export function selectRecentConversationWindow(
  messages: readonly CossaConversationMessage[],
  maxMessages = DEFAULT_RECENT_MESSAGE_LIMIT,
  maxCharacters = DEFAULT_RECENT_CHARACTER_LIMIT,
): CossaConversationMessage[] {
  const selected: CossaConversationMessage[] = [];
  let usedCharacters = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const content = compactText(message.content);

    if (!content) continue;

    const remaining = maxCharacters - usedCharacters;
    if (remaining <= 0) break;

    const boundedContent = content.length > remaining ? content.slice(content.length - remaining) : content;

    selected.push({
      role: message.role,
      content: boundedContent,
    });

    usedCharacters += boundedContent.length;

    if (selected.length >= maxMessages) break;
  }

  return selected.reverse();
}

export function formatConversationMemory(memory: CossaConversationMemory | null | undefined): string {
  if (!memory) return "";

  const sections: string[] = [];
  const summary = compactText(memory.summary || "");

  if (summary) sections.push(`Conversation summary:\n${summary}`);
  if (memory.importantFacts.length) sections.push(`Important facts:\n- ${memory.importantFacts.join("\n- ")}`);
  if (memory.decisions.length) sections.push(`Decisions already made:\n- ${memory.decisions.join("\n- ")}`);
  if (memory.unresolvedTasks.length) sections.push(`Unresolved tasks:\n- ${memory.unresolvedTasks.join("\n- ")}`);

  return sections.join("\n\n");
}

const VISIBILITY_RANK: Record<CossaMemoryVisibility, number> = {
  public: 0,
  customer: 1,
  internal: 2,
  ceo: 3,
};

/**
 * Prevents a lower-trust assistant surface from receiving higher-trust memory.
 */
export function canReadMemory(
  actorVisibility: CossaMemoryVisibility,
  memoryVisibility: CossaMemoryVisibility,
): boolean {
  return VISIBILITY_RANK[actorVisibility] >= VISIBILITY_RANK[memoryVisibility];
}

export function buildMemoryGroundingBlock(
  memory: CossaConversationMemory | null | undefined,
  recentMessages: readonly CossaConversationMessage[],
): string {
  const memoryText = formatConversationMemory(memory);
  const recentText = selectRecentConversationWindow(recentMessages)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return [memoryText, recentText ? `Recent conversation:\n${recentText}` : ""]
    .filter(Boolean)
    .join("\n\n");
}
