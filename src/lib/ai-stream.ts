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

export interface StreamChatOptions {
  signal?: AbortSignal;

  system?: string;

  provider?: CossaAiProvider;

  /**
   * Optional fallback provider.
   *
   * Used only when the primary provider fails before returning usable output.
   */
  fallbackProvider?:
    CossaAiProvider;

  /**
   * Prevent a workforce stage from hanging forever.
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

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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
       * If it is valid stream text rather than JSON,
       * return it as text.
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
      throw new Error(
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
/* PUBLIC STREAM API                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Streams a Cossa AI response through `/api/chat`.
 *
 * Compatibility:
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
 * The function now also provides:
 * - authentication validation;
 * - timeout protection;
 * - SSE and plain-text stream support;
 * - empty-output protection;
 * - Groq/OpenAI provider fallback;
 * - cleaner provider errors.
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

  const primaryProvider =
    provider;

  const fallbackProvider =
    primaryProvider ===
    "groq"
      ? DEFAULT_FALLBACK_PROVIDER
      : "groq";

  let primaryOutput =
    "";

  try {
    primaryOutput =
      await streamFromProvider({
        messages:
          validMessages,

        onToken,

        signal,

        system,

        provider:
          primaryProvider,

        timeoutMs:
          DEFAULT_TIMEOUT_MS,

        requireContent:
          true,
      });

    return primaryOutput;
  } catch (
    primaryError
  ) {
    /*
     * Never retry an explicitly cancelled request.
     */
    if (
      primaryError instanceof
        DOMException &&
      primaryError.name ===
        "AbortError"
    ) {
      throw primaryError;
    }

    /*
     * If the primary provider already streamed visible content,
     * automatically switching providers would duplicate or mix answers.
     *
     * Stop instead and allow the workforce run to be marked failed/retried.
     */
    if (
      primaryOutput.trim()
    ) {
      throw primaryError;
    }

    console.warn(
      `Primary AI provider ${primaryProvider} failed. Trying ${fallbackProvider}.`,
      primaryError,
    );

    try {
      return await streamFromProvider({
        messages:
          validMessages,

        onToken,

        signal,

        system,

        provider:
          fallbackProvider,

        timeoutMs:
          DEFAULT_TIMEOUT_MS,

        requireContent:
          true,
      });
    } catch (
      fallbackError
    ) {
      const primaryMessage =
        primaryError instanceof
        Error
          ? primaryError.message
          : String(
              primaryError,
            );

      const fallbackMessage =
        fallbackError instanceof
        Error
          ? fallbackError.message
          : String(
              fallbackError,
            );

      throw new Error(
        `AI workforce execution failed. ${primaryProvider}: ${primaryMessage} ${fallbackProvider}: ${fallbackMessage}`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* ADVANCED STREAM API                                                        */
/* -------------------------------------------------------------------------- */

/**
 * New API for callers that need explicit timeout/fallback behaviour without
 * breaking the existing streamChat() interface.
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
        ? "openai"
        : "groq"
    );

  const timeoutMs =
    Math.max(
      5_000,
      options.timeoutMs ??
        DEFAULT_TIMEOUT_MS,
    );

  const requireContent =
    options.requireContent ??
    true;

  try {
    return await streamFromProvider({
      messages:
        validMessages,

      onToken,

      signal:
        options.signal,

      system:
        options.system,

      provider,

      timeoutMs,

      requireContent,
    });
  } catch (
    primaryError
  ) {
    if (
      primaryError instanceof
        DOMException &&
      primaryError.name ===
        "AbortError"
    ) {
      throw primaryError;
    }

    if (
      fallbackProvider ===
      provider
    ) {
      throw primaryError;
    }

    console.warn(
      `Primary AI provider ${provider} failed. Trying ${fallbackProvider}.`,
      primaryError,
    );

    try {
      return await streamFromProvider({
        messages:
          validMessages,

        onToken,

        signal:
          options.signal,

        system:
          options.system,

        provider:
          fallbackProvider,

        timeoutMs,

        requireContent,
      });
    } catch (
      fallbackError
    ) {
      const primaryMessage =
        primaryError instanceof
        Error
          ? primaryError.message
          : String(
              primaryError,
            );

      const fallbackMessage =
        fallbackError instanceof
        Error
          ? fallbackError.message
          : String(
              fallbackError,
            );

      throw new Error(
        `Both AI providers failed. ${provider}: ${primaryMessage} ${fallbackProvider}: ${fallbackMessage}`,
      );
    }
  }
}