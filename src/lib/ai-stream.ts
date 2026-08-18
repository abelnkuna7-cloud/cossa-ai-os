import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CossaAiProvider =
  | "groq"
  | "openai";

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
  provider: CossaAiProvider;

  status: ProviderAttemptStatus;

  fallback:
    boolean;

  error?:
    string;
}

export interface StreamChatOptions {
  signal?: AbortSignal;

  system?: string;

  provider?: CossaAiProvider;

  /**
   * Optional fallback provider.
   *
   * Used only when the primary provider fails before returning visible output.
   */
  fallbackProvider?:
    CossaAiProvider;

  /**
   * Prevent a chat/workforce stage from hanging forever.
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
   * This allows the CEO/workforce UI to show:
   *
   * - Groq starting
   * - Groq failed
   * - falling back to OpenAI
   * - OpenAI completed
   *
   * without pretending provider health exists when it has not been observed.
   */
  onProviderAttempt?:
    (
      event:
        ProviderAttemptEvent,
    ) => void;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

interface ProviderExecutionInput {
  messages: ChatMessage[];

  onToken:
    (chunk: string) => void;

  signal?:
    AbortSignal;

  system?:
    string;

  primaryProvider:
    CossaAiProvider;

  fallbackProvider:
    CossaAiProvider;

  timeoutMs:
    number;

  requireContent:
    boolean;

  onProviderAttempt?:
    (
      event:
        ProviderAttemptEvent,
    ) => void;
}

class ChatHttpError extends Error {
  readonly status:
    number;

  constructor(
    status:
      number,

    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "ChatHttpError";

    this.status =
      status;
  }
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_PROVIDER:
  CossaAiProvider =
  "groq";

const DEFAULT_FALLBACK_PROVIDER:
  CossaAiProvider =
  "openai";

const DEFAULT_TIMEOUT_MS =
  120_000;

const MIN_TIMEOUT_MS =
  5_000;

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

  return "Unknown Cossa AI provider error.";
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

/**
 * Decides whether another reasoning provider is worth trying.
 *
 * Do not switch providers when the problem is clearly:
 *
 * - invalid request;
 * - expired Cossa authentication;
 * - organisation permission;
 * - route validation.
 *
 * Another provider cannot fix those conditions.
 *
 * Provider availability, quota, rate limit, network and upstream failures may
 * safely fall back when no visible output has already been emitted.
 */
function shouldAttemptFallback(
  error:
    unknown,
): boolean {
  if (
    isAbortError(
      error,
    )
  ) {
    return false;
  }

  if (
    error instanceof
    ChatHttpError
  ) {
    if (
      error.status ===
        400 ||
      error.status ===
        401 ||
      error.status ===
        403
    ) {
      return false;
    }

    return true;
  }

  /*
   * Network errors, timeouts and unexpected provider failures can generally
   * attempt another configured provider.
   */
  return true;
}

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
    /*
     * Provider status UI must never break AI execution.
     */
    console.warn(
      "Cossa AI provider-status callback failed.",
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

      const error =
        normaliseErrorMessage(
          event.error,
        );

      if (error) {
        throw new Error(
          error,
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
    if (
      error instanceof Error &&
      error.message !==
        "Unexpected end of JSON input"
    ) {
      /*
       * A plain text SSE payload is still valid provider output.
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
    (chunk: string) => void,
): Promise<string> {
  if (!response.body) {
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
    while (true) {
      const {
        value,
        done,
      } =
        await reader.read();

      if (done) {
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

      if (!chunk) {
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

    if (finalChunk) {
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
    (chunk: string) => void,
): Promise<string> {
  if (!response.body) {
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

      if (done) {
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
/* PROVIDER REQUEST                                                           */
/* -------------------------------------------------------------------------- */

async function streamFromProvider({
  messages,
  onToken,
  signal,
  system,
  provider,
  timeoutMs,
  requireContent,
}: {
  messages:
    ChatMessage[];

  onToken:
    (chunk: string) => void;

  signal?:
    AbortSignal;

  system?:
    string;

  provider:
    CossaAiProvider;

  timeoutMs:
    number;

  requireContent:
    boolean;
}): Promise<string> {
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
            }),

          signal:
            combinedSignal,
        },
      );

    if (
      !response.ok
    ) {
      throw new ChatHttpError(
        response.status,

        await readErrorResponse(
          response,
        ),
      );
    }

    if (
      !response.body
    ) {
      throw new Error(
        "The AI provider returned no response stream.",
      );
    }

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
            onToken,
          )
        : await readPlainTextStream(
            response,
            onToken,
          );

    if (
      requireContent &&
      !content.trim()
    ) {
      throw new Error(
        `${provider} returned an empty AI response.`,
      );
    }

    return content;
  } catch (
    error
  ) {
    if (
      didTimeout()
    ) {
      throw new Error(
        `${provider} AI request timed out after ${Math.round(
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

    throw error;
  } finally {
    cleanup();
  }
}

/* -------------------------------------------------------------------------- */
/* SHARED PROVIDER EXECUTION                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Executes a primary provider and optionally a fallback provider.
 *
 * Critical safety rule:
 *
 * A fallback is permitted only when the primary provider failed before any
 * visible assistant content reached the caller.
 *
 * Once output has been displayed, switching providers would mix two model
 * responses into one answer and corrupt the CEO/workforce record.
 */
async function executeProviderChain({
  messages,
  onToken,
  signal,
  system,
  primaryProvider,
  fallbackProvider,
  timeoutMs,
  requireContent,
  onProviderAttempt,
}: ProviderExecutionInput): Promise<string> {
  let primaryVisibleOutput =
    "";

  let primaryStreamingNotified =
    false;

  const primaryTokenHandler =
    (
      chunk:
        string,
    ) => {
      if (!chunk) {
        return;
      }

      primaryVisibleOutput +=
        chunk;

      if (
        !primaryStreamingNotified
      ) {
        primaryStreamingNotified =
          true;

        notifyProviderAttempt(
          onProviderAttempt,
          {
            provider:
              primaryProvider,

            status:
              "streaming",

            fallback:
              false,
          },
        );
      }

      onToken(
        chunk,
      );
    };

  notifyProviderAttempt(
    onProviderAttempt,
    {
      provider:
        primaryProvider,

      status:
        "starting",

      fallback:
        false,
    },
  );

  try {
    const content =
      await streamFromProvider({
        messages,

        onToken:
          primaryTokenHandler,

        signal,

        system,

        provider:
          primaryProvider,

        timeoutMs,

        requireContent,
      });

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          primaryProvider,

        status:
          "completed",

        fallback:
          false,
      },
    );

    return content;
  } catch (
    primaryError
  ) {
    if (
      isAbortError(
        primaryError,
      )
    ) {
      throw primaryError;
    }

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          primaryProvider,

        status:
          "failed",

        fallback:
          false,

        error:
          errorMessage(
            primaryError,
          ),
      },
    );

    /*
     * CRITICAL:
     *
     * The previous implementation assigned primaryOutput only after the entire
     * stream completed. If Groq emitted half an answer and then failed,
     * primaryOutput remained empty and OpenAI could start writing into the same
     * visible answer.
     *
     * Track chunks as they arrive instead.
     */
    if (
      primaryVisibleOutput.trim()
    ) {
      throw new Error(
        `${primaryProvider} stopped after already returning part of the response. Cossa AI did not switch providers because mixing two provider answers would corrupt the conversation. ${errorMessage(
          primaryError,
        )}`,
      );
    }

    if (
      fallbackProvider ===
      primaryProvider
    ) {
      throw primaryError;
    }

    if (
      !shouldAttemptFallback(
        primaryError,
      )
    ) {
      throw primaryError;
    }

    console.warn(
      `Primary AI provider ${primaryProvider} failed before visible output. Trying ${fallbackProvider}.`,
      primaryError,
    );

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          fallbackProvider,

        status:
          "fallback",

        fallback:
          true,

        error:
          errorMessage(
            primaryError,
          ),
      },
    );

    let fallbackVisibleOutput =
      "";

    let fallbackStreamingNotified =
      false;

    const fallbackTokenHandler =
      (
        chunk:
          string,
      ) => {
        if (!chunk) {
          return;
        }

        fallbackVisibleOutput +=
          chunk;

        if (
          !fallbackStreamingNotified
        ) {
          fallbackStreamingNotified =
            true;

          notifyProviderAttempt(
            onProviderAttempt,
            {
              provider:
                fallbackProvider,

              status:
                "streaming",

              fallback:
                true,
            },
          );
        }

        onToken(
          chunk,
        );
      };

    notifyProviderAttempt(
      onProviderAttempt,
      {
        provider:
          fallbackProvider,

        status:
          "starting",

        fallback:
          true,
      },
    );

    try {
      const content =
        await streamFromProvider({
          messages,

          onToken:
            fallbackTokenHandler,

          signal,

          system,

          provider:
            fallbackProvider,

          timeoutMs,

          requireContent,
        });

      notifyProviderAttempt(
        onProviderAttempt,
        {
          provider:
            fallbackProvider,

          status:
            "completed",

          fallback:
            true,
        },
      );

      return content;
    } catch (
      fallbackError
    ) {
      if (
        isAbortError(
          fallbackError,
        )
      ) {
        throw fallbackError;
      }

      notifyProviderAttempt(
        onProviderAttempt,
        {
          provider:
            fallbackProvider,

          status:
            "failed",

          fallback:
            true,

          error:
            errorMessage(
              fallbackError,
            ),
        },
      );

      /*
       * If the fallback itself started producing visible content, preserve the
       * truth that a partial response existed instead of pretending the entire
       * request simply failed before output.
       */
      if (
        fallbackVisibleOutput.trim()
      ) {
        throw new Error(
          `${fallbackProvider} stopped after returning part of the fallback response. The partial response was not replaced. ${errorMessage(
            fallbackError,
          )}`,
        );
      }

      throw new Error(
        [
          "Cossa AI reasoning providers could not complete the request.",

          `${primaryProvider}: ${errorMessage(
            primaryError,
          )}`,

          `${fallbackProvider}: ${errorMessage(
            fallbackError,
          )}`,

          "No external Cossa action should be treated as completed from this failed reasoning request.",
        ].join(
          " ",
        ),
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLIC STREAM API                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Streams a Cossa AI response through `/api/chat`.
 *
 * Backward compatibility:
 *
 * Existing callers can continue using:
 *
 * streamChat(
 *   messages,
 *   onToken,
 *   signal,
 *   system,
 *   provider,
 * )
 *
 * Current behaviour:
 *
 * - validates messages;
 * - validates authenticated Supabase session;
 * - protects against hanging requests;
 * - supports SSE and plain-text streams;
 * - rejects empty output;
 * - safely falls back between Groq and OpenAI;
 * - never mixes a partial answer from one provider with another provider;
 * - does not waste fallback calls on authentication/permission/validation
 *   failures.
 *
 * Provider routing will later move primarily into the server gateway when
 * Gemini and broader provider-health routing are added.
 */
export async function streamChat(
  messages:
    ChatMessage[],

  onToken:
    (chunk: string) => void,

  signal?:
    AbortSignal,

  system?:
    string,

  provider:
    CossaAiProvider =
      DEFAULT_PROVIDER,
): Promise<string> {
  const validMessages =
    requireMessages(
      messages,
    );

  const fallbackProvider =
    provider ===
    "groq"
      ? DEFAULT_FALLBACK_PROVIDER
      : "groq";

  return executeProviderChain({
    messages:
      validMessages,

    onToken,

    signal,

    system,

    primaryProvider:
      provider,

    fallbackProvider,

    timeoutMs:
      DEFAULT_TIMEOUT_MS,

    requireContent:
      true,
  });
}

/* -------------------------------------------------------------------------- */
/* ADVANCED STREAM API                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Advanced Cossa AI streaming API.
 *
 * Use this API when the caller needs:
 *
 * - explicit timeout control;
 * - explicit primary/fallback provider choice;
 * - provider lifecycle information;
 * - optional empty-output behaviour.
 *
 * The legacy streamChat() interface remains fully supported.
 */
export async function streamChatWithOptions(
  messages:
    ChatMessage[],

  onToken:
    (chunk: string) => void,

  options:
    StreamChatOptions =
      {},
): Promise<string> {
  const validMessages =
    requireMessages(
      messages,
    );

  const provider =
    options.provider ??
    DEFAULT_PROVIDER;

  const fallbackProvider =
    options.fallbackProvider ??
    (
      provider ===
      "groq"
        ? DEFAULT_FALLBACK_PROVIDER
        : "groq"
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

  return executeProviderChain({
    messages:
      validMessages,

    onToken,

    signal:
      options.signal,

    system:
      options.system,

    primaryProvider:
      provider,

    fallbackProvider,

    timeoutMs,

    requireContent,

    onProviderAttempt:
      options.onProviderAttempt,
  });
}
