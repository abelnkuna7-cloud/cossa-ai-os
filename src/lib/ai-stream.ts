import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Providers the browser may request from the Cossa AI gateway.
 *
 * "auto"
 * means:
 *
 * Let /api/chat select the best available reasoning provider.
 */
export type CossaAiProvider =
  | "auto"
  | "groq"
  | "gemini"
  | "openai";

/**
 * Providers that can actually execute a request.
 *
 * "auto" is a routing instruction, not an execution provider.
 */
export type CossaAiExecutionProvider =
  Exclude<
    CossaAiProvider,
    "auto"
  >;

export type ChatMessageRole =
  | "system"
  | "user"
  | "assistant";

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export type ProviderAttemptStatus =
  | "starting"
  | "streaming"
  | "completed"
  | "failed"
  | "fallback";

export interface ProviderAttemptEvent {
  /**
   * Provider currently involved in execution.
   */
  provider:
    CossaAiExecutionProvider;

  /**
   * Requested route.
   *
   * Example:
   *
   * requestedProvider = "auto"
   * provider = "gemini"
   */
  requestedProvider:
    CossaAiProvider;

  status:
    ProviderAttemptStatus;

  /**
   * True when the server reports that the final provider was reached through
   * fallback/provider failover rather than the original preferred route.
   */
  fallback:
    boolean;

  /**
   * Provider model reported by the server.
   */
  model?:
    string;

  error?:
    string;
}

export interface AiExecutionMetadata {
  /**
   * Route requested by the caller.
   */
  requestedProvider:
    CossaAiProvider;

  /**
   * Actual provider that returned the response.
   */
  provider:
    CossaAiExecutionProvider;

  /**
   * Actual provider model reported by /api/chat.
   */
  model:
    string | null;

  /**
   * Whether the server reports provider fallback.
   */
  fallback:
    boolean;

  /**
   * Optional server routing description.
   *
   * Example:
   *
   * groq>gemini
   */
  providerRoute:
    string | null;

  /**
   * Optional request/run identifier returned by Cossa AI.
   */
  requestId:
    string | null;
}

export interface StreamChatResult {
  content:
    string;

  metadata:
    AiExecutionMetadata;
}

export interface StreamChatOptions {
  signal?: AbortSignal;

  system?: string;

  /**
   * Provider routing request.
   *
   * Recommended default:
   *
   * "auto"
   *
   * The server gateway owns provider selection and fallback.
   */
  provider?: CossaAiProvider;

  /**
   * Legacy compatibility field.
   *
   * Browser-side fallback is intentionally disabled.
   *
   * If supplied, it is forwarded to /api/chat as a server routing preference
   * only. The browser itself never sends a second AI request.
   */
  fallbackProvider?:
    CossaAiExecutionProvider;

  /**
   * Prevent a browser request from hanging forever.
   *
   * Default: 120 seconds.
   */
  timeoutMs?:
    number;

  /**
   * Require a non-empty assistant response.
   *
   * Default: true.
   */
  requireContent?:
    boolean;

  /**
   * Optional provider lifecycle callback.
   *
   * Provider truth comes from /api/chat response headers.
   *
   * The client does not pretend that a requested provider necessarily executed
   * the request.
   */
  onProviderAttempt?:
    (
      event:
        ProviderAttemptEvent,
    ) => void;

  /**
   * Optional callback exposing the final provider/model metadata.
   *
   * Useful for:
   *
   * - mission_runs;
   * - activity UI;
   * - debugging;
   * - provider monitoring;
   * - CEO execution truth.
   */
  onExecutionMetadata?:
    (
      metadata:
        AiExecutionMetadata,
    ) => void;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

interface StreamGatewayInput {
  messages:
    ChatMessage[];

  onToken:
    (
      chunk:
        string,
    ) => void;

  signal?:
    AbortSignal;

  system?:
    string;

  provider:
    CossaAiProvider;

  fallbackProvider?:
    CossaAiExecutionProvider;

  timeoutMs:
    number;

  requireContent:
    boolean;

  onProviderAttempt?:
    StreamChatOptions["onProviderAttempt"];

  onExecutionMetadata?:
    StreamChatOptions["onExecutionMetadata"];
}

interface StreamGatewayResult {
  content:
    string;

  metadata:
    AiExecutionMetadata;
}

class ChatHttpError extends Error {
  readonly status:
    number;

  readonly requestedProvider:
    CossaAiProvider;

  readonly actualProvider:
    CossaAiExecutionProvider | null;

  constructor({
    status,
    message,
    requestedProvider,
    actualProvider,
  }: {
    status:
      number;

    message:
      string;

    requestedProvider:
      CossaAiProvider;

    actualProvider:
      CossaAiExecutionProvider | null;
  }) {
    super(
      message,
    );

    this.name =
      "ChatHttpError";

    this.status =
      status;

    this.requestedProvider =
      requestedProvider;

    this.actualProvider =
      actualProvider;
  }
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Cossa AI should normally let the server select the best available provider.
 */
const DEFAULT_PROVIDER:
  CossaAiProvider =
  "auto";

const DEFAULT_TIMEOUT_MS =
  120_000;

const MIN_TIMEOUT_MS =
  5_000;

/* -------------------------------------------------------------------------- */
/* RESPONSE HEADERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Existing header from your current /api/chat implementation.
 */
const HEADER_PROVIDER =
  "x-cossa-ai-provider";

/**
 * Recommended additional headers for the upgraded gateway.
 *
 * The client handles them safely even before all of them exist.
 */
const HEADER_MODEL =
  "x-cossa-ai-model";

const HEADER_FALLBACK =
  "x-cossa-ai-fallback";

const HEADER_PROVIDER_ROUTE =
  "x-cossa-ai-provider-route";

const HEADER_REQUEST_ID =
  "x-cossa-ai-request-id";

/* -------------------------------------------------------------------------- */
/* MESSAGE VALIDATION                                                         */
/* -------------------------------------------------------------------------- */

function requireMessages(
  messages:
    ChatMessage[],
): ChatMessage[] {
  if (
    !Array.isArray(
      messages,
    ) ||
    messages.length ===
      0
  ) {
    throw new Error(
      "At least one chat message is required.",
    );
  }

  return messages.map(
    (
      message,
      index,
    ) => {
      if (
        !message ||
        typeof message !==
          "object"
      ) {
        throw new Error(
          `Chat message ${index + 1} is invalid.`,
        );
      }

      if (
        ![
          "system",
          "user",
          "assistant",
        ].includes(
          message.role,
        )
      ) {
        throw new Error(
          `Chat message ${index + 1} has an invalid role.`,
        );
      }

      const content =
        message.content?.trim();

      if (!content) {
        throw new Error(
          `Chat message ${index + 1} has no content.`,
        );
      }

      return {
        role:
          message.role,

        content,
      };
    },
  );
}

/* -------------------------------------------------------------------------- */
/* PROVIDER VALIDATION                                                        */
/* -------------------------------------------------------------------------- */

function isExecutionProvider(
  value:
    unknown,
): value is CossaAiExecutionProvider {
  return (
    value ===
      "groq" ||
    value ===
      "gemini" ||
    value ===
      "openai"
  );
}

function requireProvider(
  value:
    CossaAiProvider,
): CossaAiProvider {
  if (
    value !==
      "auto" &&
    !isExecutionProvider(
      value,
    )
  ) {
    throw new Error(
      `Unsupported Cossa AI provider: ${String(
        value,
      )}`,
    );
  }

  return value;
}

/* -------------------------------------------------------------------------- */
/* AUTH                                                                       */
/* -------------------------------------------------------------------------- */

async function getAccessToken(): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `Unable to read the authenticated session: ${error.message}`,
    );
  }

  const accessToken =
    data.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  return accessToken;
}

/* -------------------------------------------------------------------------- */
/* ERROR HELPERS                                                              */
/* -------------------------------------------------------------------------- */

function normaliseErrorMessage(
  value:
    unknown,
): string | null {
  if (
    typeof value ===
    "string"
  ) {
    const cleaned =
      value.trim();

    return cleaned ||
      null;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const candidate =
      value as {
        error?: unknown;
        message?: unknown;
        detail?: unknown;
      };

    if (
      typeof candidate.message ===
        "string" &&
      candidate.message.trim()
    ) {
      return candidate.message.trim();
    }

    if (
      typeof candidate.detail ===
        "string" &&
      candidate.detail.trim()
    ) {
      return candidate.detail.trim();
    }

    if (
      typeof candidate.error ===
        "string" &&
      candidate.error.trim()
    ) {
      return candidate.error.trim();
    }

    if (
      candidate.error &&
      typeof candidate.error ===
        "object"
    ) {
      const nested =
        candidate.error as {
          message?: unknown;
        };

      if (
        typeof nested.message ===
          "string" &&
        nested.message.trim()
      ) {
        return nested.message.trim();
      }
    }
  }

  return null;
}

function errorMessage(
  error:
    unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
      "string"
  ) {
    return error;
  }

  return "Unknown Cossa AI gateway error.";
}

async function readErrorResponse(
  response:
    Response,
): Promise<string> {
  const fallback =
    `Chat request failed (${response.status})`;

  try {
    const text =
      await response.text();

    if (!text.trim()) {
      return fallback;
    }

    try {
      const parsed =
        JSON.parse(
          text,
        ) as unknown;

      return (
        normaliseErrorMessage(
          parsed,
        ) ??
        text.trim()
      );
    } catch {
      return text.trim();
    }
  } catch {
    return fallback;
  }
}

function isAbortError(
  error:
    unknown,
): boolean {
  return (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  );
}

/* -------------------------------------------------------------------------- */
/* PROVIDER CALLBACK SAFETY                                                   */
/* -------------------------------------------------------------------------- */

function notifyProviderAttempt(
  callback:
    StreamChatOptions["onProviderAttempt"],

  event:
    ProviderAttemptEvent,
): void {
  if (!callback) {
    return;
  }

  try {
    callback(
      event,
    );
  } catch (
    error
  ) {
    console.warn(
      "Cossa AI provider-status callback failed.",
      error,
    );
  }
}

function notifyExecutionMetadata(
  callback:
    StreamChatOptions["onExecutionMetadata"],

  metadata:
    AiExecutionMetadata,
): void {
  if (!callback) {
    return;
  }

  try {
    callback(
      metadata,
    );
  } catch (
    error
  ) {
    console.warn(
      "Cossa AI execution-metadata callback failed.",
      error,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* ABORT / TIMEOUT                                                            */
/* -------------------------------------------------------------------------- */

function createCombinedAbortSignal(
  externalSignal:
    AbortSignal | undefined,

  timeoutMs:
    number,
): {
  signal:
    AbortSignal;

  cleanup:
    () => void;

  didTimeout:
    () => boolean;
} {
  const controller =
    new AbortController();

  let timedOut =
    false;

  const abortFromExternal =
    () => {
      if (
        !controller.signal.aborted
      ) {
        controller.abort(
          externalSignal?.reason,
        );
      }
    };

  if (
    externalSignal?.aborted
  ) {
    controller.abort(
      externalSignal.reason,
    );
  } else {
    externalSignal?.addEventListener(
      "abort",
      abortFromExternal,
      {
        once:
          true,
      },
    );
  }

  const timeout =
    window.setTimeout(
      () => {
        timedOut =
          true;

        if (
          !controller.signal.aborted
        ) {
          controller.abort(
            new DOMException(
              "Chat request timed out.",
              "TimeoutError",
            ),
          );
        }
      },

      timeoutMs,
    );

  return {
    signal:
      controller.signal,

    cleanup: () => {
      window.clearTimeout(
        timeout,
      );

      externalSignal?.removeEventListener(
        "abort",
        abortFromExternal,
      );
    },

    didTimeout: () =>
      timedOut,
  };
}

/* -------------------------------------------------------------------------- */
/* SSE PARSING                                                                */
/* -------------------------------------------------------------------------- */

function parseServerSentEventData(
  block:
    string,
): string | null {
  const lines =
    block.split(
      /\r?\n/,
    );

  const dataLines =
    lines
      .filter(
        (
          line,
        ) =>
          line.startsWith(
            "data:",
          ),
      )
      .map(
        (
          line,
        ) =>
          line
            .slice(5)
            .trimStart(),
      );

  if (
    dataLines.length ===
    0
  ) {
    return null;
  }

  const data =
    dataLines.join(
      "\n",
    );

  if (
    data ===
    "[DONE]"
  ) {
    return "";
  }

  try {
    const parsed =
      JSON.parse(
        data,
      ) as unknown;

    if (
      typeof parsed ===
      "string"
    ) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      const event =
        parsed as {
          text?: unknown;
          content?: unknown;
          token?: unknown;
          delta?: unknown;
          error?: unknown;
        };

      const eventError =
        normaliseErrorMessage(
          event.error,
        );

      if (
        eventError
      ) {
        throw new Error(
          eventError,
        );
      }

      if (
        typeof event.text ===
        "string"
      ) {
        return event.text;
      }

      if (
        typeof event.content ===
        "string"
      ) {
        return event.content;
      }

      if (
        typeof event.token ===
        "string"
      ) {
        return event.token;
      }

      if (
        typeof event.delta ===
        "string"
      ) {
        return event.delta;
      }

      if (
        event.delta &&
        typeof event.delta ===
          "object"
      ) {
        const nestedDelta =
          event.delta as {
            content?: unknown;
            text?: unknown;
          };

        if (
          typeof nestedDelta.content ===
          "string"
        ) {
          return nestedDelta.content;
        }

        if (
          typeof nestedDelta.text ===
          "string"
        ) {
          return nestedDelta.text;
        }
      }
    }
  } catch (
    error
  ) {
    /*
     * Plain-text SSE payloads remain valid.
     */
    if (
      !data.startsWith(
        "{",
      ) &&
      !data.startsWith(
        "[",
      )
    ) {
      return data;
    }

    throw error;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* STREAM READERS                                                             */
/* -------------------------------------------------------------------------- */

async function readPlainTextStream(
  response:
    Response,

  onToken:
    (
      chunk:
        string,
    ) => void,
): Promise<string> {
  if (
    !response.body
  ) {
    throw new Error(
      "The AI response did not contain a readable stream.",
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let full =
    "";

  try {
    while (
      true
    ) {
      const {
        value,
        done,
      } =
        await reader.read();

      if (
        done
      ) {
        break;
      }

      const chunk =
        decoder.decode(
          value,
          {
            stream:
              true,
          },
        );

      if (
        !chunk
      ) {
        continue;
      }

      full +=
        chunk;

      onToken(
        chunk,
      );
    }

    const finalChunk =
      decoder.decode();

    if (
      finalChunk
    ) {
      full +=
        finalChunk;

      onToken(
        finalChunk,
      );
    }
  } finally {
    reader.releaseLock();
  }

  return full;
}

async function readEventStream(
  response:
    Response,

  onToken:
    (
      chunk:
        string,
    ) => void,
): Promise<string> {
  if (
    !response.body
  ) {
    throw new Error(
      "The AI response did not contain a readable stream.",
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer =
    "";

  let full =
    "";

  let finished =
    false;

  const processBlock =
    (
      block:
        string,
    ) => {
      const data =
        parseServerSentEventData(
          block,
        );

      if (
        data ===
        null
      ) {
        return;
      }

      if (
        data ===
        ""
      ) {
        finished =
          true;

        return;
      }

      full +=
        data;

      onToken(
        data,
      );
    };

  try {
    while (
      !finished
    ) {
      const {
        value,
        done,
      } =
        await reader.read();

      if (
        done
      ) {
        break;
      }

      buffer +=
        decoder.decode(
          value,
          {
            stream:
              true,
          },
        );

      const blocks =
        buffer.split(
          /\r?\n\r?\n/,
        );

      buffer =
        blocks.pop() ??
        "";

      for (
        const block of
          blocks
      ) {
        processBlock(
          block,
        );

        if (
          finished
        ) {
          break;
        }
      }
    }

    buffer +=
      decoder.decode();

    if (
      buffer.trim() &&
      !finished
    ) {
      processBlock(
        buffer,
      );
    }
  } finally {
    reader.releaseLock();
  }

  return full;
}

/* -------------------------------------------------------------------------- */
/* RESPONSE METADATA                                                          */
/* -------------------------------------------------------------------------- */

function headerBoolean(
  value:
    string | null,
): boolean {
  if (
    !value
  ) {
    return false;
  }

  return [
    "1",
    "true",
    "yes",
    "fallback",
  ].includes(
    value
      .trim()
      .toLowerCase(),
  );
}

function extractExecutionMetadata({
  response,
  requestedProvider,
}: {
  response:
    Response;

  requestedProvider:
    CossaAiProvider;
}): AiExecutionMetadata {
  const rawProvider =
    response.headers
      .get(
        HEADER_PROVIDER,
      )
      ?.trim()
      .toLowerCase();

  let provider:
    CossaAiExecutionProvider;

  if (
    isExecutionProvider(
      rawProvider,
    )
  ) {
    provider =
      rawProvider;
  } else if (
    requestedProvider !==
      "auto"
  ) {
    provider =
      requestedProvider;
  } else {
    /*
     * The gateway should always report the actual execution provider.
     *
     * Falling back to Groq here is only for backwards compatibility with an
     * older /api/chat response that does not yet expose the provider header.
     *
     * Once the upgraded server gateway is installed, this branch should no
     * longer be reached.
     */
    provider =
      "groq";
  }

  const model =
    response.headers
      .get(
        HEADER_MODEL,
      )
      ?.trim() ||
    null;

  const providerRoute =
    response.headers
      .get(
        HEADER_PROVIDER_ROUTE,
      )
      ?.trim() ||
    null;

  const requestId =
    response.headers
      .get(
        HEADER_REQUEST_ID,
      )
      ?.trim() ||
    null;

  const explicitFallback =
    headerBoolean(
      response.headers.get(
        HEADER_FALLBACK,
      ),
    );

  const providerChanged =
    requestedProvider !==
      "auto" &&
    provider !==
      requestedProvider;

  return {
    requestedProvider,

    provider,

    model,

    fallback:
      explicitFallback ||
      providerChanged,

    providerRoute,

    requestId,
  };
}

/* -------------------------------------------------------------------------- */
/* GATEWAY EXECUTION                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Executes exactly ONE browser request.
 *
 * Provider fallback belongs to /api/chat.
 *
 * This prevents:
 *
 * browser request
 * → server fallback
 * → browser fallback
 * → second server routing chain
 *
 * which can otherwise duplicate model work, increase API cost and make mission
 * run provider records inaccurate.
 */
async function streamFromGateway({
  messages,
  onToken,
  signal,
  system,
  provider,
  fallbackProvider,
  timeoutMs,
  requireContent,
  onProviderAttempt,
  onExecutionMetadata,
}: StreamGatewayInput): Promise<StreamGatewayResult> {
  const accessToken =
    await getAccessToken();

  const {
    signal:
      combinedSignal,

    cleanup,

    didTimeout,
  } =
    createCombinedAbortSignal(
      signal,
      timeoutMs,
    );

  let visibleOutput =
    "";

  let streamingNotified =
    false;

  let executionMetadata:
    AiExecutionMetadata | null =
    null;

  try {
    const response =
      await fetch(
        "/api/chat",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "text/event-stream, text/plain, application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            JSON.stringify({
              messages,

              system:
                system?.trim() ||
                undefined,

              provider,

              fallback_provider:
                fallbackProvider,
            }),

          signal:
            combinedSignal,
        },
      );

    if (
      !response.ok
    ) {
      const rawProvider =
        response.headers
          .get(
            HEADER_PROVIDER,
          )
          ?.trim()
          .toLowerCase();

      const actualProvider =
        isExecutionProvider(
          rawProvider,
        )
          ? rawProvider
          : null;

      throw new ChatHttpError({
        status:
          response.status,

        message:
          await readErrorResponse(
            response,
          ),

        requestedProvider:
          provider,

        actualProvider,
      });
    }

    executionMetadata =
      extractExecutionMetadata({
        response,

        requestedProvider:
          provider,
      });

    notifyExecutionMetadata(
      onExecutionMetadata,
      executionMetadata,
    );

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          executionMetadata.provider,

        requestedProvider:
          provider,

        status:
          executionMetadata.fallback
            ? "fallback"
            : "starting",

        fallback:
          executionMetadata.fallback,

        model:
          executionMetadata.model ??
          undefined,
      },
    );

    if (
      !response.body
    ) {
      throw new Error(
        "The Cossa AI gateway returned no response stream.",
      );
    }

    const tokenHandler =
      (
        chunk:
          string,
      ) => {
        if (
          !chunk
        ) {
          return;
        }

        visibleOutput +=
          chunk;

        if (
          !streamingNotified
        ) {
          streamingNotified =
            true;

          notifyProviderAttempt(
            onProviderAttempt,
            {
              provider:
                executionMetadata!.provider,

              requestedProvider:
                provider,

              status:
                "streaming",

              fallback:
                executionMetadata!.fallback,

              model:
                executionMetadata!.model ??
                undefined,
            },
          );
        }

        onToken(
          chunk,
        );
      };

    const contentType =
      response.headers
        .get(
          "content-type",
        )
        ?.toLowerCase() ??
      "";

    const content =
      contentType.includes(
        "text/event-stream",
      )
        ? await readEventStream(
            response,
            tokenHandler,
          )
        : await readPlainTextStream(
            response,
            tokenHandler,
          );

    if (
      requireContent &&
      !content.trim()
    ) {
      throw new Error(
        `${executionMetadata.provider} returned an empty AI response.`,
      );
    }

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          executionMetadata.provider,

        requestedProvider:
          provider,

        status:
          "completed",

        fallback:
          executionMetadata.fallback,

        model:
          executionMetadata.model ??
          undefined,
      },
    );

    return {
      content,

      metadata:
        executionMetadata,
    };
  } catch (
    error
  ) {
    if (
      didTimeout()
    ) {
      const providerLabel =
        executionMetadata?.provider ??
        provider;

      throw new Error(
        `${providerLabel} AI request timed out after ${Math.round(
          timeoutMs /
            1_000,
        )} seconds.`,
      );
    }

    if (
      signal?.aborted
    ) {
      throw new DOMException(
        "The AI request was cancelled.",
        "AbortError",
      );
    }

    if (
      isAbortError(
        error,
      )
    ) {
      throw error;
    }

    if (
      executionMetadata
    ) {
      notifyProviderAttempt(
        onProviderAttempt,
        {
          provider:
            executionMetadata.provider,

          requestedProvider:
            provider,

          status:
            "failed",

          fallback:
            executionMetadata.fallback,

          model:
            executionMetadata.model ??
            undefined,

          error:
            errorMessage(
              error,
            ),
        },
      );
    }

    /*
     * If visible content already reached the user, preserve the truth that the
     * response partially existed.
     *
     * No browser fallback occurs.
     */
    if (
      visibleOutput.trim()
    ) {
      throw new Error(
        [
          "Cossa AI stopped after already returning part of the response.",

          "The partial answer was not replaced or mixed with another provider.",

          errorMessage(
            error,
          ),
        ].join(
          " ",
        ),
      );
    }

    throw error;
  } finally {
    cleanup();
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLIC STREAM API                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Backward-compatible Cossa AI stream API.
 *
 * Existing callers may continue using:
 *
 * streamChat(
 *   messages,
 *   onToken,
 *   signal,
 *   system,
 *   provider,
 * )
 *
 * Important architecture change:
 *
 * The browser now performs exactly one /api/chat request.
 *
 * Provider routing and fallback belong to the server gateway.
 */
export async function streamChat(
  messages:
    ChatMessage[],

  onToken:
    (
      chunk:
        string,
    ) => void,

  signal?:
    AbortSignal,

  system?:
    string,

  provider:
    CossaAiProvider =
      DEFAULT_PROVIDER,
): Promise<string> {
  const result =
    await streamChatWithMetadata(
      messages,

      onToken,

      {
        signal,

        system,

        provider,
      },
    );

  return result.content;
}

/* -------------------------------------------------------------------------- */
/* STREAM API WITH EXECUTION METADATA                                         */
/* -------------------------------------------------------------------------- */

/**
 * Use this where provider/model truth matters.
 *
 * Recommended for:
 *
 * - mission_runs;
 * - AI workforce execution;
 * - provider diagnostics;
 * - activity screens;
 * - CEO audit records.
 */
export async function streamChatWithMetadata(
  messages:
    ChatMessage[],

  onToken:
    (
      chunk:
        string,
    ) => void,

  options:
    StreamChatOptions =
      {},
): Promise<StreamChatResult> {
  const validMessages =
    requireMessages(
      messages,
    );

  const provider =
    requireProvider(
      options.provider ??
        DEFAULT_PROVIDER,
    );

  const timeoutMs =
    Math.max(
      MIN_TIMEOUT_MS,

      options.timeoutMs ??
        DEFAULT_TIMEOUT_MS,
    );

  const requireContent =
    options.requireContent ??
    true;

  const result =
    await streamFromGateway({
      messages:
        validMessages,

      onToken,

      signal:
        options.signal,

      system:
        options.system,

      provider,

      fallbackProvider:
        options.fallbackProvider,

      timeoutMs,

      requireContent,

      onProviderAttempt:
        options.onProviderAttempt,

      onExecutionMetadata:
        options.onExecutionMetadata,
    });

  return {
    content:
      result.content,

    metadata:
      result.metadata,
  };
}

/* -------------------------------------------------------------------------- */
/* ADVANCED STREAM API                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Existing advanced API retained for compatibility.
 *
 * It now uses server-side provider routing rather than sending separate browser
 * requests for primary and fallback providers.
 */
export async function streamChatWithOptions(
  messages:
    ChatMessage[],

  onToken:
    (
      chunk:
        string,
    ) => void,

  options:
    StreamChatOptions =
      {},
): Promise<string> {
  const result =
    await streamChatWithMetadata(
      messages,

      onToken,

      options,
    );

  return result.content;
}
