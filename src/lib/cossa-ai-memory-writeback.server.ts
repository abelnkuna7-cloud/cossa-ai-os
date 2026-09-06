import { resolveCossaMemoryActivation } from "./cossa-ai-memory-activation.ts";
import type { CossaConversationMemory } from "./cossa-ai-memory.ts";

const DEFAULT_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const MAX_CONVERSATION_ID_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 8_000;
const MAX_MEMORY_LIST_ITEMS = 32;
const MAX_MEMORY_ITEM_LENGTH = 800;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ConversationMemoryWritebackInput {
  bearerToken: string | null;
  conversationId: string | null | undefined;
  memory: CossaConversationMemory;
  messageCount: number;
  lastMessageAt?: string | null;
}

export interface ConversationMemoryWritebackResult {
  written: boolean;
  reason:
    | "written"
    | "disabled"
    | "missing-auth"
    | "missing-conversation"
    | "invalid-conversation"
    | "missing-config"
    | "invalid-user"
    | "request-failed";
}

interface ConversationMemoryUpsertRow {
  organisation_id: string;
  user_id: string;
  conversation_id: string;
  rolling_summary: string;
  important_facts: string[];
  decisions: string[];
  open_loops: string[];
  last_summarized_message_count: number;
  last_message_at: string | null;
  updated_at: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanList(values: readonly string[]): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const cleaned = cleanText(value, MAX_MEMORY_ITEM_LENGTH);
    if (cleaned) unique.add(cleaned);
    if (unique.size >= MAX_MEMORY_LIST_ITEMS) break;
  }

  return [...unique];
}

function decodeJwtSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadPart.padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub.trim() : null;
  } catch {
    return null;
  }
}

export function buildConversationMemoryUpsertRow({
  organisationId,
  userId,
  conversationId,
  memory,
  messageCount,
  lastMessageAt,
  now = new Date().toISOString(),
}: {
  organisationId: string;
  userId: string;
  conversationId: string;
  memory: CossaConversationMemory;
  messageCount: number;
  lastMessageAt?: string | null;
  now?: string;
}): ConversationMemoryUpsertRow {
  return {
    organisation_id: organisationId,
    user_id: userId,
    conversation_id: cleanText(conversationId, MAX_CONVERSATION_ID_LENGTH),
    rolling_summary: cleanText(memory.summary, MAX_SUMMARY_LENGTH),
    important_facts: cleanList(memory.importantFacts),
    decisions: cleanList(memory.decisions),
    open_loops: cleanList(memory.unresolvedTasks),
    last_summarized_message_count: Math.max(0, Math.floor(messageCount || 0)),
    last_message_at: lastMessageAt?.trim() || null,
    updated_at: now,
  };
}

export async function writeConversationMemorySnapshot(
  input: ConversationMemoryWritebackInput,
): Promise<ConversationMemoryWritebackResult> {
  if (!resolveCossaMemoryActivation().writeEnabled) {
    return { written: false, reason: "disabled" };
  }

  const token = input.bearerToken?.trim() || "";
  if (!token) return { written: false, reason: "missing-auth" };

  const conversationId = input.conversationId?.trim() || "";
  if (!conversationId) return { written: false, reason: "missing-conversation" };
  if (!UUID_PATTERN.test(conversationId)) {
    return { written: false, reason: "invalid-conversation" };
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const organisationId =
    process.env.COSSA_ORGANISATION_ID?.trim() ||
    process.env.VITE_COSSA_ORGANISATION_ID?.trim() ||
    DEFAULT_ORGANISATION_ID;

  if (!supabaseUrl || !supabaseKey) {
    return { written: false, reason: "missing-config" };
  }

  const userId = decodeJwtSubject(token);
  if (!userId) return { written: false, reason: "invalid-user" };

  const row = buildConversationMemoryUpsertRow({
    organisationId,
    userId,
    conversationId,
    memory: input.memory,
    messageCount: input.messageCount,
    lastMessageAt: input.lastMessageAt,
  });

  try {
    const params = new URLSearchParams({
      on_conflict: "organisation_id,user_id,conversation_id",
    });

    const response = await fetch(
      `${trimTrailingSlash(supabaseUrl)}/rest/v1/cossa_ai_conversation_memory?${params.toString()}`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(row),
      },
    );

    if (!response.ok) {
      console.warn("Cossa AI conversation memory writeback failed.", response.status);
      return { written: false, reason: "request-failed" };
    }

    return { written: true, reason: "written" };
  } catch (error) {
    console.warn("Cossa AI conversation memory writeback connection failed.", error);
    return { written: false, reason: "request-failed" };
  }
}
