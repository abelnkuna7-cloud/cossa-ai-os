import { createFileRoute } from "@tanstack/react-router";

import { buildConversationMemorySnapshot } from "../../lib/cossa-ai-memory-snapshot.ts";
import { writeConversationMemorySnapshot } from "../../lib/cossa-ai-memory-writeback.server.ts";
import type { CossaConversationMessage } from "../../lib/cossa-ai-memory.ts";

const MAX_MEMORY_MESSAGES = 250;
const MEMORY_REFRESH_INTERVAL = 6;

interface MemoryRefreshPayload {
  conversationId?: unknown;
  messages?: unknown;
  messageCount?: unknown;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

function cleanConversationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, 160) : null;
}

function validMessages(value: unknown): CossaConversationMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MEMORY_MESSAGES) return null;

  const result: CossaConversationMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as { role?: unknown; content?: unknown };
    if (
      candidate.role !== "system" &&
      candidate.role !== "user" &&
      candidate.role !== "assistant"
    ) {
      return null;
    }
    if (typeof candidate.content !== "string" || !candidate.content.trim()) return null;
    result.push({ role: candidate.role, content: candidate.content.trim() });
  }

  return result;
}

function cleanMessageCount(value: unknown, minimum: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const count = Math.max(0, Math.floor(value));
  return count >= minimum ? count : null;
}

function refreshDue(messageCount: number): boolean {
  if (messageCount < MEMORY_REFRESH_INTERVAL) return false;
  return messageCount % MEMORY_REFRESH_INTERVAL === 0;
}

export const Route = createFileRoute("/api/chat-memory")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: MemoryRefreshPayload;

        try {
          payload = (await request.json()) as MemoryRefreshPayload;
        } catch {
          return Response.json({ written: false, reason: "invalid-json" }, { status: 400 });
        }

        const conversationId = cleanConversationId(payload.conversationId);
        const messages = validMessages(payload.messages);
        const messageCount = messages ? cleanMessageCount(payload.messageCount, messages.length) : null;

        if (!conversationId || !messages || messageCount === null) {
          return Response.json({ written: false, reason: "invalid-payload" }, { status: 400 });
        }

        // This endpoint is called only after a complete assistant response. A
        // completed thread therefore ends with assistant content. Refuse
        // partial/interrupted histories so they are never promoted to durable
        // conversation memory.
        if (messages.at(-1)?.role !== "assistant") {
          return Response.json({ written: false, reason: "incomplete-response" }, { status: 409 });
        }

        // Refresh once per six completed non-system messages (three normal
        // user/assistant turns). The client may send only the newest 250
        // messages for very long conversations while preserving the full
        // completed-message count for cadence and persistence metadata.
        if (!refreshDue(messageCount)) {
          return Response.json({ written: false, reason: "not-due" });
        }

        const memory = buildConversationMemorySnapshot(messages);
        const result = await writeConversationMemorySnapshot({
          bearerToken: bearerToken(request),
          conversationId,
          memory,
          messageCount,
          lastMessageAt: new Date().toISOString(),
        });

        return Response.json(result, {
          status: result.reason === "missing-auth" || result.reason === "invalid-user" ? 401 : 200,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
