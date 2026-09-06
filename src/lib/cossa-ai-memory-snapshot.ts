import type { CossaConversationMemory, CossaConversationMessage } from "./cossa-ai-memory.ts";

const MAX_SUMMARY_CHARACTERS = 2_400;
const MAX_LIST_ITEMS = 12;
const MAX_ITEM_CHARACTERS = 320;
const DEFAULT_RECENT_MESSAGES = 10;

function clean(value: string, max = MAX_ITEM_CHARACTERS): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values: readonly string[], limit = MAX_LIST_ITEMS): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const item = clean(value);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

function userMessages(messages: readonly CossaConversationMessage[]): CossaConversationMessage[] {
  return messages.filter((message) => message.role === "user");
}

function assistantMessages(messages: readonly CossaConversationMessage[]): CossaConversationMessage[] {
  return messages.filter((message) => message.role === "assistant");
}

function extractFacts(messages: readonly CossaConversationMessage[]): string[] {
  const facts: string[] = [];
  const factPatterns = [
    /\b(?:we have|we use|our [^.!?]{1,50} is|our [^.!?]{1,50} are|approved|connected|registered|supplier|partner|provider)\b[^.!?]{0,220}/gi,
  ];

  for (const message of userMessages(messages)) {
    for (const pattern of factPatterns) {
      for (const match of message.content.matchAll(pattern)) {
        facts.push(match[0]);
      }
    }
  }

  return unique(facts);
}

function extractDecisions(messages: readonly CossaConversationMessage[]): string[] {
  const decisions: string[] = [];
  const decisionPatterns = [
    /\b(?:we will|we'll|let's|we should|we must|keep|do not|don't|no rebuild|no downgrade|approved decision|decision:)\b[^.!?]{0,220}/gi,
  ];

  for (const message of userMessages(messages)) {
    for (const pattern of decisionPatterns) {
      for (const match of message.content.matchAll(pattern)) {
        decisions.push(match[0]);
      }
    }
  }

  return unique(decisions);
}

function extractOpenLoops(messages: readonly CossaConversationMessage[]): string[] {
  const tasks: string[] = [];
  const taskPatterns = [
    /\b(?:next|need to|still need|todo|to-do|follow up|verify|check|review|finish|complete|connect|integrate|deploy|test)\b[^.!?]{0,220}/gi,
  ];

  for (const message of userMessages(messages)) {
    for (const pattern of taskPatterns) {
      for (const match of message.content.matchAll(pattern)) {
        tasks.push(match[0]);
      }
    }
  }

  return unique(tasks);
}

function buildSummary(messages: readonly CossaConversationMessage[]): string {
  const recent = messages.slice(-DEFAULT_RECENT_MESSAGES);
  const lines = recent
    .map((message) => {
      const speaker = message.role === "user" ? "User" : message.role === "assistant" ? "Cossa AI" : "System";
      return `${speaker}: ${clean(message.content, 420)}`;
    })
    .filter((line) => !line.endsWith(": "));

  if (!lines.length) return "";
  return clean(lines.join(" | "), MAX_SUMMARY_CHARACTERS);
}

export function buildConversationMemorySnapshot(
  messages: readonly CossaConversationMessage[],
): CossaConversationMemory {
  return {
    summary: buildSummary(messages),
    importantFacts: extractFacts(messages),
    decisions: extractDecisions(messages),
    unresolvedTasks: extractOpenLoops(messages),
  };
}

export function shouldRefreshConversationMemory({
  messageCount,
  lastSummarizedMessageCount,
  interval = 6,
}: {
  messageCount: number;
  lastSummarizedMessageCount?: number | null;
  interval?: number;
}): boolean {
  const current = Math.max(0, Math.floor(messageCount || 0));
  const previous = Math.max(0, Math.floor(lastSummarizedMessageCount || 0));
  const safeInterval = Math.max(1, Math.floor(interval || 1));

  return current > 0 && (previous === 0 || current - previous >= safeInterval);
}

export function conversationMemoryStats(messages: readonly CossaConversationMessage[]) {
  return {
    messages: messages.length,
    userMessages: userMessages(messages).length,
    assistantMessages: assistantMessages(messages).length,
  };
}
