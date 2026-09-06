import "./lib/error-capture";

import {
  buildLegacyGatewayWindow,
  validateConversationMessages,
  type ChatWindowValidationResult,
} from "./lib/cossa-ai-chat-window";
import { loadServerMemoryGrounding } from "./lib/cossa-ai-memory.server";
import type { CossaConversationMessage } from "./lib/cossa-ai-memory";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ChatRequestPayload = {
  messages?: CossaConversationMessage[];
  system?: unknown;
  conversationId?: unknown;
  [key: string]: unknown;
};

const MAX_INGRESS_SYSTEM_CHARACTERS = 2_500;
const MAX_EXISTING_SYSTEM_WITH_MEMORY = 1_250;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function addSearchProtection(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  const publicPaths = new Set([
    "/",
    "/pricing",
    "/construction-growth",
    "/facility-services-growth",
    "/sme-growth",
    "/sitemap.xml",
    "/robots.txt",
  ]);

  if (publicPaths.has(pathname) || pathname.startsWith("/api/")) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function addMemoryExecutionHeaders(request: Request, response: Response): Response {
  if (new URL(request.url).pathname !== "/api/chat") return response;

  const memoryGrounded = request.headers.get("x-cossa-ai-memory-grounded");
  const conversationWindowed = request.headers.get("x-cossa-ai-conversation-windowed");

  if (!memoryGrounded && !conversationWindowed) return response;

  const headers = new Headers(response.headers);
  if (memoryGrounded) headers.set("X-Cossa-AI-Memory-Grounded", memoryGrounded);
  if (conversationWindowed) headers.set("X-Cossa-AI-Conversation-Windowed", conversationWindowed);

  const exposed = new Set(
    (headers.get("Access-Control-Expose-Headers") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (memoryGrounded) exposed.add("X-Cossa-AI-Memory-Grounded");
  if (conversationWindowed) exposed.add("X-Cossa-AI-Conversation-Windowed");
  headers.set("Access-Control-Expose-Headers", [...exposed].join(", "));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function shouldNormalizeLongChat(messages: CossaConversationMessage[]): boolean {
  if (messages.length > 40) return true;
  return messages.reduce((total, message) => total + message.content.length, 0) > 60_000;
}

function oversizedChatResponse(validation: ChatWindowValidationResult): Response {
  return new Response(validation.error ?? "This Cossa AI request is too large to process safely.", {
    status: 413,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-cossa-ai-conversation-continuable": "true",
    },
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

function memoryFeatureEnabled(): boolean {
  return process.env.COSSA_AI_MEMORY_ENABLED?.trim().toLowerCase() === "true";
}

function cleanConversationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 160);
}

function mergeMemoryIntoSystem(existingSystem: unknown, memoryGrounding: string): string {
  const existing = typeof existingSystem === "string" ? existingSystem.trim() : "";
  const boundedExisting = existing.slice(0, MAX_EXISTING_SYSTEM_WITH_MEMORY);
  const availableForMemory = Math.max(
    0,
    MAX_INGRESS_SYSTEM_CHARACTERS - boundedExisting.length - (boundedExisting ? 2 : 0),
  );
  const boundedMemory = memoryGrounding.slice(0, availableForMemory);

  return [boundedMemory, boundedExisting].filter(Boolean).join("\n\n");
}

/**
 * Chat ingress adapter for permanent long-lived Cossa AI conversations.
 *
 * Responsibilities:
 * - preserve the existing /api/chat gateway and its provider safeguards;
 * - prevent legacy per-request limits from ending a conversation;
 * - optionally ground requests in RLS-protected durable/conversation memory;
 * - fail open while the additive memory migration is not yet enabled.
 *
 * Memory is activated only when COSSA_AI_MEMORY_ENABLED=true in the protected
 * server environment. This lets the schema and retrieval path be verified
 * before any production database or deployment action.
 */
async function prepareChatRequest(request: Request): Promise<Request | Response> {
  const url = new URL(request.url);

  if (request.method !== "POST" || url.pathname !== "/api/chat") {
    return request;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return request;
  }

  let payload: ChatRequestPayload;

  try {
    payload = (await request.clone().json()) as ChatRequestPayload;
  } catch {
    return request;
  }

  if (!Array.isArray(payload.messages)) {
    return request;
  }

  const validation = validateConversationMessages(payload.messages);

  if (!validation.ok) {
    if (validation.error?.startsWith("This request is too large")) {
      return oversizedChatResponse(validation);
    }

    // Preserve the existing route's canonical validation for malformed input.
    return request;
  }

  const shouldWindow = shouldNormalizeLongChat(payload.messages);
  const forwardedMessages = shouldWindow
    ? buildLegacyGatewayWindow(payload.messages)
    : payload.messages;

  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  if (shouldWindow) headers.set("x-cossa-ai-conversation-windowed", "true");

  let system = payload.system;

  if (memoryFeatureEnabled()) {
    const latestUserMessage =
      [...payload.messages].reverse().find((message) => message.role === "user")?.content ?? "";

    const memory = await loadServerMemoryGrounding({
      latestUserMessage,
      bearerToken: getBearerToken(request),
      conversationId: cleanConversationId(payload.conversationId),
    });

    if (memory.text) {
      system = mergeMemoryIntoSystem(payload.system, memory.text);
      headers.set("x-cossa-ai-memory-grounded", "true");
      headers.set("x-cossa-ai-memory-items", String(memory.durableItems));
      headers.set(
        "x-cossa-ai-conversation-memory",
        memory.conversationMemoryLoaded ? "true" : "false",
      );
    } else {
      headers.set("x-cossa-ai-memory-grounded", "false");
    }
  }

  if (!shouldWindow && system === payload.system && !memoryFeatureEnabled()) {
    return request;
  }

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({
      ...payload,
      ...(system !== undefined ? { system } : {}),
      messages: forwardedMessages,
    }),
    signal: request.signal,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const prepared = await prepareChatRequest(request);
      if (prepared instanceof Response) return prepared;

      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(prepared, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(rawResponse);
      const memoryAnnotatedResponse = addMemoryExecutionHeaders(prepared, normalizedResponse);
      return addSearchProtection(prepared, memoryAnnotatedResponse);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
