import "./lib/error-capture";

import {
  formatCossaAnswerContract,
  planCossaAnswerContract,
} from "./lib/cossa-ai-answer-contract.ts";
import {
  buildLegacyGatewayWindow,
  validateConversationMessages,
  type ChatWindowValidationResult,
} from "./lib/cossa-ai-chat-window.ts";
import {
  formatCossaCapabilityPlan,
  planCossaCapabilities,
} from "./lib/cossa-ai-capability-router.ts";
import { deriveConversationIdentity } from "./lib/cossa-ai-conversation-identity.ts";
import { resolveCossaMemoryActivation } from "./lib/cossa-ai-memory-activation.ts";
import { loadServerMemoryGrounding } from "./lib/cossa-ai-memory.server.ts";
import type { CossaConversationMessage } from "./lib/cossa-ai-memory.ts";
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
const MAX_CAPABILITY_PLAN_CHARACTERS = 800;
const MAX_ANSWER_CONTRACT_CHARACTERS = 700;

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

function addChatExecutionHeaders(request: Request, response: Response): Response {
  if (new URL(request.url).pathname !== "/api/chat") return response;

  const forwardedHeaders = [
    ["x-cossa-ai-memory-mode", "X-Cossa-AI-Memory-Mode"],
    ["x-cossa-ai-memory-grounded", "X-Cossa-AI-Memory-Grounded"],
    ["x-cossa-ai-conversation-windowed", "X-Cossa-AI-Conversation-Windowed"],
    ["x-cossa-ai-conversation-identity", "X-Cossa-AI-Conversation-Identity"],
    ["x-cossa-ai-capability-domains", "X-Cossa-AI-Capability-Domains"],
    ["x-cossa-ai-reasoning-depth", "X-Cossa-AI-Reasoning-Depth"],
    ["x-cossa-ai-intelligence-priority", "X-Cossa-AI-Intelligence-Priority"],
    ["x-cossa-ai-external-research", "X-Cossa-AI-External-Research"],
    ["x-cossa-ai-answer-mode", "X-Cossa-AI-Answer-Mode"],
    ["x-cossa-ai-evidence-standard", "X-Cossa-AI-Evidence-Standard"],
    ["x-cossa-ai-uncertainty-policy", "X-Cossa-AI-Uncertainty-Policy"],
    ["x-cossa-ai-conversation-continuity", "X-Cossa-AI-Conversation-Continuity"],
  ] as const;

  const headers = new Headers(response.headers);
  const exposed = new Set(
    (headers.get("Access-Control-Expose-Headers") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  let annotated = false;
  for (const [requestHeader, responseHeader] of forwardedHeaders) {
    const value = request.headers.get(requestHeader);
    if (!value) continue;
    headers.set(responseHeader, value);
    exposed.add(responseHeader);
    annotated = true;
  }

  if (!annotated) return response;

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

function cleanConversationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 160);
}

function mergeReasoningPlansIntoSystem(
  existingSystem: unknown,
  capabilityPlan: string,
  answerContract: string,
): string {
  const existing = typeof existingSystem === "string" ? existingSystem.trim() : "";
  const boundedCapability = capabilityPlan.slice(0, MAX_CAPABILITY_PLAN_CHARACTERS);
  const boundedAnswer = answerContract.slice(0, MAX_ANSWER_CONTRACT_CHARACTERS);
  const planning = [boundedCapability, boundedAnswer].filter(Boolean).join("\n\n");
  const availableForExisting = Math.max(
    0,
    MAX_INGRESS_SYSTEM_CHARACTERS - planning.length - (planning ? 2 : 0),
  );
  const boundedExisting = existing.slice(0, availableForExisting);

  return [planning, boundedExisting].filter(Boolean).join("\n\n");
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
 * - establish a stable conversation identity, preferring an explicit persisted ID;
 * - deterministically route each request to the relevant Cossa capabilities and reasoning depth;
 * - apply a deterministic answer-quality/evidence contract before provider reasoning;
 * - optionally ground requests in RLS-protected durable/conversation memory;
 * - keep memory activation fail-closed until read mode is explicitly enabled.
 *
 * Capability and answer-quality planning are deterministic and do not spend a
 * second provider call.
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

  const explicitConversationId = cleanConversationId(payload.conversationId);
  const conversationId = explicitConversationId ?? deriveConversationIdentity(payload.messages);
  const shouldWindow = shouldNormalizeLongChat(payload.messages);
  const forwardedMessages = shouldWindow
    ? buildLegacyGatewayWindow(payload.messages)
    : payload.messages;
  const latestUserMessage =
    [...payload.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const capabilityPlan = planCossaCapabilities(latestUserMessage);
  const answerContract = planCossaAnswerContract(latestUserMessage);
  const memoryActivation = resolveCossaMemoryActivation();

  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("x-cossa-ai-memory-mode", memoryActivation.mode);
  headers.set(
    "x-cossa-ai-conversation-identity",
    explicitConversationId ? "explicit" : "derived",
  );
  headers.set("x-cossa-ai-capability-domains", capabilityPlan.domains.join(","));
  headers.set("x-cossa-ai-reasoning-depth", capabilityPlan.reasoningDepth);
  headers.set("x-cossa-ai-intelligence-priority", capabilityPlan.priority);
  headers.set(
    "x-cossa-ai-external-research",
    capabilityPlan.needsExternalResearch ? "required" : "not-required",
  );
  headers.set("x-cossa-ai-answer-mode", answerContract.answerMode);
  headers.set("x-cossa-ai-evidence-standard", answerContract.evidenceStandard);
  headers.set("x-cossa-ai-uncertainty-policy", answerContract.uncertaintyPolicy);
  headers.set(
    "x-cossa-ai-conversation-continuity",
    answerContract.preserveConversationContinuity ? "preserve" : "normal",
  );
  if (shouldWindow) headers.set("x-cossa-ai-conversation-windowed", "true");

  let system = mergeReasoningPlansIntoSystem(
    payload.system,
    formatCossaCapabilityPlan(capabilityPlan),
    formatCossaAnswerContract(answerContract),
  );

  if (memoryActivation.readEnabled) {
    const memory = await loadServerMemoryGrounding({
      latestUserMessage,
      bearerToken: getBearerToken(request),
      conversationId,
    });

    if (memory.text) {
      system = mergeMemoryIntoSystem(system, memory.text);
      headers.set("x-cossa-ai-memory-grounded", "true");
      headers.set("x-cossa-ai-memory-items", String(memory.durableItems));
      headers.set(
        "x-cossa-ai-conversation-memory",
        memory.conversationMemoryLoaded ? "true" : "false",
      );
    } else {
      headers.set("x-cossa-ai-memory-grounded", "false");
    }
  } else {
    headers.set("x-cossa-ai-memory-grounded", "false");
  }

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({
      ...payload,
      conversationId,
      system,
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
      const annotatedResponse = addChatExecutionHeaders(prepared, normalizedResponse);
      return addSearchProtection(prepared, annotatedResponse);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};