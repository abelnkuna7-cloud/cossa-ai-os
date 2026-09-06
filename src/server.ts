import "./lib/error-capture";

import {
  buildLegacyGatewayWindow,
  validateConversationMessages,
  type ChatWindowValidationResult,
} from "./lib/cossa-ai-chat-window";
import type { CossaConversationMessage } from "./lib/cossa-ai-memory";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ChatRequestPayload = {
  messages?: CossaConversationMessage[];
  [key: string]: unknown;
};

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

/**
 * Transitional gateway adapter for long-lived Cossa AI conversations.
 *
 * The existing /api/chat route still contains legacy per-request limits. The
 * conversation itself must not end when those request limits are reached, so
 * the server forwards only a bounded recent slice while durable memory is
 * integrated into the route. This is additive and does not change other APIs.
 */
async function normalizeLongChatRequest(request: Request): Promise<Request | Response> {
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

  if (!shouldNormalizeLongChat(payload.messages)) {
    return request;
  }

  const boundedMessages = buildLegacyGatewayWindow(payload.messages);
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("x-cossa-ai-conversation-windowed", "true");

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({
      ...payload,
      messages: boundedMessages,
    }),
    signal: request.signal,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const normalized = await normalizeLongChatRequest(request);
      if (normalized instanceof Response) return normalized;

      const handler = await getServerEntry();
      const response = await handler.fetch(normalized, env, ctx);
      return addSearchProtection(normalized, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
