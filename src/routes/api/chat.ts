import { createFileRoute } from "@tanstack/react-router";

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

/**
 * Confirmed available in the current Groq project.
 *
 * GROQ_MODEL can still override this from the protected environment.
 */
const DEFAULT_GROQ_MODEL =
  "openai/gpt-oss-120b";

const DEFAULT_GEMINI_MODEL =
  "gemini-3.7-flash";

const MAX_MESSAGES =
  40;

const MAX_MESSAGE_LENGTH =
  12_000;

const MAX_TOTAL_MESSAGE_LENGTH =
  60_000;

/**
 * Browser history may contain much more than we should send to a provider.
 *
 * The server keeps only a short recent reasoning window.
 */
const MAX_RECENT_HISTORY_MESSAGES =
  6;

const MAX_RECENT_HISTORY_LENGTH =
  6_000;

/**
 * Context budgets are intentionally conservative.
 *
 * Groq's current account tier rejected an 11,885-token request against an
 * 8,000 TPM allowance.
 *
 * Cossa therefore aims to keep the reasoning request materially below that
 * limit instead of depending on paid tier expansion.
 */
const MAX_KNOWLEDGE_CONTEXT_LENGTH =
  4_200;

const MAX_SELECTED_KNOWLEDGE_DOCUMENTS =
  7;

const MAX_OPERATIONAL_CONTEXT_LENGTH =
  5_000;

const MAX_WORKFORCE_CONTEXT_LENGTH =
  4_500;

const MAX_EXTERNAL_NEWS_CONTEXT_LENGTH =
  2_500;

const MAX_CUSTOM_SYSTEM_LENGTH =
  2_500;

/**
 * Final protection after all context assembly.
 *
 * Character count is only an approximation of tokens, but approximately
 * 4 characters per token is a useful conservative operating heuristic for
 * English business text.
 *
 * 22,000 characters is usually around 5,500 tokens before provider-specific
 * tokenisation, leaving room for completion output under an 8,000-token
 * request/TPM ceiling.
 */
const MAX_PROVIDER_INPUT_CHARACTERS =
  22_000;

const MAX_SYSTEM_PROMPT_CHARACTERS =
  15_000;

const MAX_GROQ_COMPLETION_TOKENS =
  800;

const MAX_GEMINI_COMPLETION_TOKENS =
  900;

const MAX_OPENAI_COMPLETION_TOKENS =
  1_000;

/**
 * Limits raw records before prompt formatting.
 *
 * The CEO does not need 80 full handoff rows to answer:
 *
 * "Give me today's briefing."
 *
 * It needs enough current evidence to reason correctly.
 */
const MAX_CONTEXT_RECORDS = {
  leads: 12,
  quoteRequests: 8,
  contactMessages: 8,
  opportunities: 10,
  quotations: 10,
  customers: 10,
  projects: 10,
  appointments: 10,

  employees: 30,
  missions: 15,
  runs: 18,
  handoffs: 18,
  approvals: 15,
} as const;

/**
 * Cossa default reasoning route.
 *
 * Every request is first grounded by the Cossa AI gateway with verified
 * company knowledge, conversation memory and authorised operational context.
 * It then uses configured reasoning providers in this order:
 *
 * OpenAI
 *   Primary quality route when the protected project credential is usable.
 *
 * Gemini
 *   Secondary route when configured.
 *
 * Groq
 *   Final resilience fallback. Groq is never the browser default or the first
 *   provider tried by Cossa AI.
 */
const DEFAULT_PROVIDER_ORDER:
  readonly ChatProvider[] = [
    "openai",
    "gemini",
    "groq",
  ];

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ChatRole =
  | "system"
  | "user"
  | "assistant";

type ChatProvider =
  | "groq"
  | "gemini"
  | "openai";

type ChatProviderPreference =
  | ChatProvider
  | "auto";

interface ChatMessage {
  role: ChatRole;

  content: string;
}

interface ChatPayload {
  messages?: ChatMessage[];

  system?: string;

  provider?: ChatProviderPreference;
}

interface SupabaseUser {
  id: string;

  email?: string;
}

interface KnowledgeDocument {
  title: string;

  body: string;

  category: string | null;

  tags: string[];

  source: string | null;

  source_url: string | null;

  updated_at: string;
}

interface RestRequestOptions {
  table: string;

  query: string;

  token: string;

  supabaseUrl: string;

  supabaseKey: string;
}

interface NewsApiArticle {
  source?: {
    id?: string | null;

    name?: string | null;
  };

  author?: string | null;

  title?: string | null;

  description?: string | null;

  url?: string | null;

  publishedAt?: string | null;

  content?: string | null;
}

interface NewsApiResponse {
  status?: string;

  totalResults?: number;

  articles?: NewsApiArticle[];

  code?: string;

  message?: string;
}

interface ProviderErrorBody {
  error?: {
    code?: string | null;

    type?: string | null;

    message?: string | null;

    status?: string | null;
  };
}

interface OpenAiResponsePayload {
  output_text?: unknown;

  output?: Array<{
    content?: Array<{
      type?: unknown;

      text?: unknown;
    }>;
  }>;
}

interface OpenAiCompatibleCompletion {
  choices?: Array<{
    message?: {
      content?: unknown;
    };

    delta?: {
      content?: unknown;
    };
  }>;
}

interface ProviderEnvironment {
  groqApiKey:
    string | undefined;

  geminiApiKey:
    string | undefined;

  openAiApiKey:
    string | undefined;

  newsApiKey:
    string | undefined;

  supabaseUrl:
    string;

  supabaseKey:
    string;

  organisationId:
    string;

  groqModel:
    string;

  geminiModel:
    string;

  openAiModel:
    string | null;
}

interface ProviderSuccess {
  ok: true;

  provider:
    ChatProvider;

  model:
    string;

  stream:
    ReadableStream<Uint8Array>;
}

interface ProviderFailure {
  ok: false;

  provider:
    ChatProvider;

  model:
    string | null;

  status:
    number;

  safeMessage:
    string;

  internalMessage:
    string;

  retryable:
    boolean;
}

type ProviderResult =
  | ProviderSuccess
  | ProviderFailure;

interface ProviderAttemptRecord {
  provider:
    ChatProvider;

  model:
    string | null;

  status:
    | "success"
    | "failed"
    | "not_configured";

  httpStatus?: number;

  message?: string;
}

interface PrimedStreamSuccess {
  ok: true;

  stream:
    ReadableStream<Uint8Array>;
}

interface PrimedStreamFailure {
  ok: false;

  error:
    string;
}

type PrimedStreamResult =
  | PrimedStreamSuccess
  | PrimedStreamFailure;

interface ContextNeeds {
  operational:
    boolean;

  workforce:
    boolean;

  externalNews:
    boolean;

  leadContacts:
    boolean;

  briefing:
    boolean;
}

/* -------------------------------------------------------------------------- */
/* REQUEST ID                                                                 */
/* -------------------------------------------------------------------------- */

function createRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return [
      "cossa",
      Date.now().toString(36),
      Math.random()
        .toString(36)
        .slice(2),
    ].join("-");
  }
}

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT                                                                */
/* -------------------------------------------------------------------------- */

function trimTrailingSlash(
  value: string,
): string {
  return value.replace(
    /\/+$/,
    "",
  );
}

function resolveGroqModel(): string {
  return (
    process.env.GROQ_MODEL?.trim() ||
    DEFAULT_GROQ_MODEL
  );
}

function resolveGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

/**
 * OpenAI remains intentionally environment-controlled.
 *
 * Do not silently choose a paid OpenAI model.
 */
function resolveOpenAiModel(): string | null {
  const configured =
    process.env.OPENAI_MODEL?.trim();

  return configured || null;
}

function getEnvironment():
  ProviderEnvironment |
  null {
  const groqApiKey =
    process.env.GROQ_API_KEY?.trim();

  const geminiApiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim();

  const openAiApiKey =
    process.env.OPENAI_API_KEY?.trim();

  const newsApiKey =
    process.env.NEWS_API_KEY?.trim();

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  const organisationId =
    process.env.COSSA_ORGANISATION_ID?.trim() ||
    process.env.VITE_COSSA_ORGANISATION_ID?.trim() ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    return null;
  }

  if (
    !groqApiKey &&
    !geminiApiKey &&
    !openAiApiKey
  ) {
    return null;
  }

  return {
    groqApiKey,

    geminiApiKey,

    openAiApiKey,

    newsApiKey,

    supabaseUrl:
      trimTrailingSlash(
        supabaseUrl,
      ),

    supabaseKey,

    organisationId,

    groqModel:
      resolveGroqModel(),

    geminiModel:
      resolveGeminiModel(),

    openAiModel:
      resolveOpenAiModel(),
  };
}

/* -------------------------------------------------------------------------- */
/* AUTH                                                                       */
/* -------------------------------------------------------------------------- */

function getBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  return token || null;
}

async function verifySupabaseUser({
  token,
  supabaseUrl,
  supabaseKey,
}: {
  token:
    string;

  supabaseUrl:
    string;

  supabaseKey:
    string;
}): Promise<SupabaseUser | null> {
  try {
    const response =
      await fetch(
        `${supabaseUrl}/auth/v1/user`,
        {
          headers: {
            apikey:
              supabaseKey,

            Authorization:
              `Bearer ${token}`,
          },
        },
      );

    if (
      !response.ok
    ) {
      return null;
    }

    return (
      await response.json()
    ) as SupabaseUser;
  } catch (
    error
  ) {
    console.error(
      "Supabase user verification failed.",
      error,
    );

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* SUPABASE REST                                                              */
/* -------------------------------------------------------------------------- */

async function restSelect<T>({
  table,
  query,
  token,
  supabaseUrl,
  supabaseKey,
}: RestRequestOptions): Promise<T[]> {
  let response:
    Response;

  try {
    response =
      await fetch(
        `${supabaseUrl}/rest/v1/${table}?${query}`,
        {
          headers: {
            apikey:
              supabaseKey,

            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        },
      );
  } catch (
    error
  ) {
    console.error(
      `Supabase connection failed for ${table}.`,
      error,
    );

    return [];
  }

  if (
    !response.ok
  ) {
    const errorText =
      await response
        .text()
        .catch(
          () => "",
        );

    console.error(
      `Supabase query failed for ${table}:`,
      response.status,
      errorText,
    );

    return [];
  }

  try {
    return (
      await response.json()
    ) as T[];
  } catch (
    error
  ) {
    console.error(
      `Supabase response could not be decoded for ${table}.`,
      error,
    );

    return [];
  }
}

async function verifyOrganisationMembership({
  token,
  userId,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  token:
    string;

  userId:
    string;

  organisationId:
    string;

  supabaseUrl:
    string;

  supabaseKey:
    string;
}): Promise<boolean> {
  const rows =
    await restSelect<{
      user_id:
        string;

      status:
        string;

      role:
        string;
    }>({
      table:
        "organisation_members",

      query:
        new URLSearchParams({
          select:
            "user_id,status,role",

          organisation_id:
            `eq.${organisationId}`,

          user_id:
            `eq.${userId}`,

          status:
            "eq.active",

          limit:
            "1",
        }).toString(),

      token,

      supabaseUrl,

      supabaseKey,
    });

  return (
    rows.length ===
    1
  );
}

/* -------------------------------------------------------------------------- */
/* REQUEST AUTHENTICATION                                                     */
/* -------------------------------------------------------------------------- */

async function authenticateRequest(
  request:
    Request,

  environment:
    ProviderEnvironment,
):
  Promise<
    | {
        ok:
          true;

        token:
          string;

        user:
          SupabaseUser;
      }
    | {
        ok:
          false;

        response:
          Response;
      }
  > {
  const token =
    getBearerToken(
      request,
    );

  if (!token) {
    return {
      ok:
        false,

      response:
        new Response(
          "Unauthorized",
          {
            status:
              401,
          },
        ),
    };
  }

  const user =
    await verifySupabaseUser({
      token,

      supabaseUrl:
        environment.supabaseUrl,

      supabaseKey:
        environment.supabaseKey,
    });

  if (!user) {
    return {
      ok:
        false,

      response:
        new Response(
          "Your Cossa AI session could not be verified. Sign out and sign in again.",
          {
            status:
              401,
          },
        ),
    };
  }

  const isOrganisationMember =
    await verifyOrganisationMembership({
      token,

      userId:
        user.id,

      organisationId:
        environment.organisationId,

      supabaseUrl:
        environment.supabaseUrl,

      supabaseKey:
        environment.supabaseKey,
    });

  if (
    !isOrganisationMember
  ) {
    return {
      ok:
        false,

      response:
        new Response(
          "You are not authorised to use this Cossa AI workspace.",
          {
            status:
              403,
          },
        ),
    };
  }

  return {
    ok:
      true,

    token,

    user,
  };
}

/* -------------------------------------------------------------------------- */
/* PAYLOAD VALIDATION                                                         */
/* -------------------------------------------------------------------------- */

function validateMessages(
  value:
    unknown,
):
  | {
      valid:
        true;

      messages:
        ChatMessage[];
    }
  | {
      valid:
        false;

      error:
        string;
    } {
  if (
    !Array.isArray(
      value,
    ) ||
    value.length ===
      0
  ) {
    return {
      valid:
        false,

      error:
        "At least one chat message is required.",
    };
  }

  if (
    value.length >
    MAX_MESSAGES
  ) {
    return {
      valid:
        false,

      error:
        `A maximum of ${MAX_MESSAGES} messages is allowed per request.`,
    };
  }

  const messages:
    ChatMessage[] =
    [];

  let totalLength =
    0;

  for (
    const item of
      value
  ) {
    if (
      typeof item !==
        "object" ||
      item ===
        null ||
      !(
        "role" in
        item
      ) ||
      !(
        "content" in
        item
      )
    ) {
      return {
        valid:
          false,

        error:
          "Invalid chat message format.",
      };
    }

    const candidate =
      item as {
        role?:
          unknown;

        content?:
          unknown;
      };

    const role =
      candidate.role;

    const content =
      typeof candidate.content ===
      "string"
        ? candidate.content.trim()
        : "";

    if (
      role !==
        "system" &&
      role !==
        "user" &&
      role !==
        "assistant"
    ) {
      return {
        valid:
          false,

        error:
          "Unsupported chat message role.",
      };
    }

    if (
      !content
    ) {
      return {
        valid:
          false,

        error:
          "Chat messages cannot be empty.",
      };
    }

    if (
      content.length >
      MAX_MESSAGE_LENGTH
    ) {
      return {
        valid:
          false,

        error:
          `Individual messages cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      };
    }

    totalLength +=
      content.length;

    if (
      totalLength >
      MAX_TOTAL_MESSAGE_LENGTH
    ) {
      return {
        valid:
          false,

        error:
          "The conversation is too large. Start a new chat.",
      };
    }

    messages.push({
      role,

      content,
    });
  }

  return {
    valid:
      true,

    messages,
  };
}

function cleanCustomSystem(
  value:
    unknown,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (
    !cleaned
  ) {
    return undefined;
  }

  return cleaned.slice(
    0,
    MAX_CUSTOM_SYSTEM_LENGTH,
  );
}

function isChatProviderPreference(
  value:
    unknown,
): value is ChatProviderPreference {
  return (
    value ===
      "auto" ||
    value ===
      "groq" ||
    value ===
      "gemini" ||
    value ===
      "openai"
  );
}

/* -------------------------------------------------------------------------- */
/* TEXT / TOKEN BUDGET HELPERS                                                */
/* -------------------------------------------------------------------------- */

function truncateText(
  value:
    string,

  maxLength:
    number,
): string {
  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return `${value.slice(
    0,
    Math.max(
      0,
      maxLength - 80,
    ),
  )}\n\n[Context truncated by Cossa AI input budget.]`;
}

function estimateTokens(
  value:
    string,
): number {
  return Math.ceil(
    value.length /
      4,
  );
}

function estimateMessagesTokens(
  messages:
    ChatMessage[],
): number {
  return messages.reduce(
    (
      total,
      message,
    ) =>
      total +
      estimateTokens(
        message.content,
      ) +
      6,

    0,
  );
}

/**
 * Final server-side safety net.
 *
 * System instructions are preserved first.
 * Recent conversation is then retained from newest backwards.
 *
 * The newest user message must always survive.
 */
function budgetProviderMessages(
  messages:
    ChatMessage[],
): ChatMessage[] {
  if (
    messages.length ===
    0
  ) {
    return [];
  }

  const systemMessages =
    messages.filter(
      (
        message,
      ) =>
        message.role ===
        "system",
    );

  const conversation =
    messages.filter(
      (
        message,
      ) =>
        message.role !==
        "system",
    );

  const boundedSystem =
    systemMessages.map(
      (
        message,
      ) => ({
        ...message,

        content:
          truncateText(
            message.content,
            MAX_SYSTEM_PROMPT_CHARACTERS,
          ),
      }),
    );

  const systemLength =
    boundedSystem.reduce(
      (
        total,
        message,
      ) =>
        total +
        message.content.length,

      0,
    );

  const remainingBudget =
    Math.max(
      2_000,
      MAX_PROVIDER_INPUT_CHARACTERS -
        systemLength,
    );

  const selected:
    ChatMessage[] =
    [];

  let used =
    0;

  for (
    const message of [
      ...conversation,
    ].reverse()
  ) {
    const remaining =
      remainingBudget -
      used;

    if (
      remaining <=
      0
    ) {
      break;
    }

    const content =
      message.content.length >
      remaining
        ? message.content.slice(
            -remaining,
          )
        : message.content;

    selected.unshift({
      role:
        message.role,

      content,
    });

    used +=
      content.length;
  }

  return [
    ...boundedSystem,
    ...selected,
  ];
}

/* -------------------------------------------------------------------------- */
/* CHAT HISTORY                                                               */
/* -------------------------------------------------------------------------- */

function selectRecentHistory(
  messages:
    ChatMessage[],
): ChatMessage[] {
  const conversationMessages =
    messages.filter(
      (
        message,
      ) =>
        message.role ===
          "user" ||
        message.role ===
          "assistant",
    );

  const recent:
    ChatMessage[] =
    [];

  let length =
    0;

  for (
    const message of [
      ...conversationMessages,
    ].reverse()
  ) {
    if (
      recent.length >=
      MAX_RECENT_HISTORY_MESSAGES
    ) {
      break;
    }

    const remaining =
      MAX_RECENT_HISTORY_LENGTH -
      length;

    if (
      remaining <=
      0
    ) {
      break;
    }

    const content =
      message.content.length >
      remaining
        ? message.content.slice(
            -remaining,
          )
        : message.content;

    recent.unshift({
      role:
        message.role,

      content,
    });

    length +=
      content.length;
  }

  return recent;
}

/* -------------------------------------------------------------------------- */
/* KNOWLEDGE                                                                  */
/* -------------------------------------------------------------------------- */

const KNOWLEDGE_STOP_WORDS =
  new Set([
    "about",
    "after",
    "again",
    "also",
    "and",
    "are",
    "can",
    "cossa",
    "could",
    "for",
    "from",
    "give",
    "have",
    "help",
    "into",
    "need",
    "please",
    "tell",
    "that",
    "the",
    "their",
    "this",
    "today",
    "want",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "you",
    "your",
  ]);

function extractSearchTerms(
  message:
    string,
): Set<string> {
  return new Set(
    (
      message
        .toLowerCase()
        .match(
          /[a-z0-9]{3,}/g,
        ) ??
      []
    ).filter(
      (
        term,
      ) =>
        !KNOWLEDGE_STOP_WORDS.has(
          term,
        ),
    ),
  );
}

function selectRelevantKnowledge(
  knowledge:
    KnowledgeDocument[],

  latestUserMessage:
    string,
): KnowledgeDocument[] {
  const queryTerms =
    extractSearchTerms(
      latestUserMessage,
    );

  const lowerMessage =
    latestUserMessage.toLowerCase();

  const asksIdentity =
    /\b(who are you|who is the ceo|company overview|about cossa|what is cossa)\b/i.test(
      latestUserMessage,
    );

  const asksApproval =
    /\b(approval|approve|permission|spend|budget|contract|sign|publish|advert|payment|supplier order)\b/i.test(
      latestUserMessage,
    );

  const asksBriefing =
    /\b(briefing|today'?s feedback|todays feedback|ceo feedback|company status|what needs attention|what is happening)\b/i.test(
      latestUserMessage,
    );

  const coreKnowledgeTitles =
    [
      "constitution",
      "approval authority",
      "mission",
      "vision",
      "company overview",
      "verified company overview",
    ];

  return knowledge
    .map(
      (
        document,
      ) => {
        const title =
          document.title.toLowerCase();

        const searchable =
          `${document.title} ${document.body}`.toLowerCase();

        const relevance =
          [
            ...queryTerms,
          ].reduce(
            (
              score,
              term,
            ) =>
              score +
              (
                searchable.includes(
                  term,
                )
                  ? 2
                  : 0
              ),

            0,
          );

        const isCore =
          coreKnowledgeTitles.some(
            (
              coreTitle,
            ) =>
              title.includes(
                coreTitle,
              ),
          );

        const approvalBoost =
          asksApproval &&
          (
            title.includes(
              "approval",
            ) ||
            searchable.includes(
              "approval authority",
            )
          )
            ? 8
            : 0;

        const identityBoost =
          asksIdentity &&
          (
            title.includes(
              "company overview",
            ) ||
            title.includes(
              "mission",
            ) ||
            title.includes(
              "vision",
            )
          )
            ? 8
            : 0;

        const briefingBoost =
          asksBriefing &&
          isCore
            ? 3
            : 0;

        const directPhraseBoost =
          lowerMessage
            .split(
              /\s+/,
            )
            .some(
              (
                term,
              ) =>
                term.length >=
                  5 &&
                title.includes(
                  term,
                ),
            )
            ? 2
            : 0;

        return {
          document,

          score:
            relevance +
            approvalBoost +
            identityBoost +
            briefingBoost +
            directPhraseBoost +
            (
              isCore
                ? 1
                : 0
            ),
        };
      },
    )
    .filter(
      (
        entry,
      ) =>
        entry.score >
          0 ||
        queryTerms.size ===
          0,
    )
    .sort(
      (
        a,
        b,
      ) =>
        b.score -
          a.score ||
        Date.parse(
          b.document.updated_at,
        ) -
          Date.parse(
            a.document.updated_at,
          ),
    )
    .slice(
      0,
      MAX_SELECTED_KNOWLEDGE_DOCUMENTS,
    )
    .map(
      (
        entry,
      ) =>
        entry.document,
    );
}

function formatKnowledgeContext(
  knowledge:
    KnowledgeDocument[],
): string {
  if (
    knowledge.length ===
    0
  ) {
    return "No verified company knowledge was retrieved for this request.";
  }

  const chunks:
    string[] =
    [];

  let used =
    0;

  for (
    const document of
      knowledge
  ) {
    const remaining =
      MAX_KNOWLEDGE_CONTEXT_LENGTH -
      used;

    if (
      remaining <=
      0
    ) {
      break;
    }

    const metadata =
      [
        `DOCUMENT: ${document.title}`,

        document.category
          ? `CATEGORY: ${document.category}`
          : null,

        document.source
          ? `SOURCE: ${document.source}`
          : null,
      ]
        .filter(
          Boolean,
        )
        .join(
          "\n",
        );

    const availableBody =
      Math.max(
        250,
        remaining -
          metadata.length -
          40,
      );

    const chunk =
      [
        metadata,

        truncateText(
          document.body,
          availableBody,
        ),
      ].join(
        "\n",
      );

    chunks.push(
      chunk,
    );

    used +=
      chunk.length +
      10;
  }

  return chunks.join(
    "\n\n---\n\n",
  );
}

/* -------------------------------------------------------------------------- */
/* CONTEXT DETECTION                                                          */
/* -------------------------------------------------------------------------- */

function isCeoBriefingRequest(
  message:
    string,
): boolean {
  return /\b(ceo briefing|owner briefing|today'?s briefing|todays briefing|today'?s feedback|todays feedback|company briefing|company status|what needs attention|what is working|what is blocked|what needs my attention|executive briefing)\b/i.test(
    message,
  );
}

function needsOperationalData(
  message:
    string,
): boolean {
  return (
    isCeoBriefingRequest(
      message,
    ) ||
    /\b(lead|leads|enquiry|enquiries|quote request|quote requests|customer|customers|pipeline|opportunity|opportunities|quotation|quotations|quote|quotes|project|projects|appointment|appointments|follow[- ]?up|crm|sales|revenue|website request|website requests|store|product|products|order|orders|inventory|catalogue|catalog|supplier|suppliers)\b/i.test(
      message,
    )
  );
}

function needsLeadContactData(
  message:
    string,
): boolean {
  return /\b(phone|email|contact|call|whatsapp|outreach|follow[- ]?up|lead details|customer details|contact details)\b/i.test(
    message,
  );
}

function needsWorkforceData(
  message:
    string,
): boolean {
  return (
    isCeoBriefingRequest(
      message,
    ) ||
    /\b(ai[- ]?ceo|workforce|worker|workers|employee|employees|handoff|handoffs|mission|missions|approval|approvals|owner briefing|briefing|working|idle|automatic|automation|task|tasks)\b/i.test(
      message,
    )
  );
}

function needsExternalNewsData(
  message:
    string,
): boolean {
  return /\b(news|latest news|current news|market news|industry news|trend|trends|trending|current developments|current events|industry developments|market developments|business news|technology news|construction news|retail news|ecommerce news|e-commerce news)\b/i.test(
    message,
  );
}

function detectContextNeeds(
  message:
    string,
): ContextNeeds {
  return {
    operational:
      needsOperationalData(
        message,
      ),

    workforce:
      needsWorkforceData(
        message,
      ),

    externalNews:
      needsExternalNewsData(
        message,
      ),

    leadContacts:
      needsLeadContactData(
        message,
      ),

    briefing:
      isCeoBriefingRequest(
        message,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* RECORD COMPACTION                                                          */
/* -------------------------------------------------------------------------- */

function compactRecord(
  record:
    Record<
      string,
      unknown
    >,
): Record<
  string,
  unknown
> {
  return Object.fromEntries(
    Object.entries(
      record,
    ).filter(
      (
        [
          ,
          value,
        ],
      ) =>
        value !==
          null &&
        value !==
          undefined &&
        value !==
          "",
    ),
  );
}

function formatRecordSection(
  title:
    string,

  records:
    Record<
      string,
      unknown
    >[],

  maxRecords:
    number,
): string {
  const selected =
    records
      .slice(
        0,
        maxRecords,
      )
      .map(
        compactRecord,
      );

  return [
    `${title} COUNT: ${records.length}`,

    selected.length >
      0
      ? selected
          .map(
            (
              record,
              index,
            ) =>
              `${index + 1}. ${JSON.stringify(
                record,
              )}`,
          )
          .join(
            "\n",
          )
      : "No records returned.",
  ].join(
    "\n",
  );
}

/* -------------------------------------------------------------------------- */
/* LIVE OPERATIONAL CONTEXT                                                   */
/* -------------------------------------------------------------------------- */

async function loadOperationalContext({
  latestUserMessage,
  token,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  latestUserMessage:
    string;

  token:
    string;

  organisationId:
    string;

  supabaseUrl:
    string;

  supabaseKey:
    string;
}): Promise<string> {
  const needs =
    detectContextNeeds(
      latestUserMessage,
    );

  if (
    !needs.operational
  ) {
    return "Operational CRM records were not required for this request.";
  }

  const includeContactFields =
    needs.leadContacts;

  const leadSelect =
    includeContactFields
      ? "id,name,full_name,phone,email,service,location,source,status,stage,score,notes,estimated_value,created_at,updated_at"
      : "id,name,full_name,service,location,source,status,stage,score,estimated_value,created_at,updated_at";

  const [
    leads,
    quoteRequests,
    contactMessages,
    opportunities,
    quotations,
    customers,
    projects,
    appointments,
  ] =
    await Promise.all([
      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "leads",

        query:
          new URLSearchParams({
            select:
              leadSelect,

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.leads,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "quote_requests",

        query:
          new URLSearchParams({
            select:
              "id,full_name,name,service,location,project_details,message,budget,timeline,created_at",

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.quoteRequests,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "contact_messages",

        query:
          new URLSearchParams({
            select:
              includeContactFields
                ? "id,name,email,phone,subject,message,status,created_at"
                : "id,name,subject,message,status,created_at",

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.contactMessages,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "opportunities",

        query:
          new URLSearchParams({
            select:
              "id,organization_name,opportunity_type,location,estimated_value,status,probability,expected_close,notes,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.opportunities,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "quotations",

        query:
          new URLSearchParams({
            select:
              "id,quote_number,title,amount,status,valid_until,service,description,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.quotations,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "customers",

        query:
          new URLSearchParams({
            select:
              includeContactFields
                ? "id,name,email,phone,company,customer_type,status,created_at,updated_at"
                : "id,name,company,customer_type,status,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.customers,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "projects",

        query:
          new URLSearchParams({
            select:
              "id,name,project_name,service,location,budget,status,priority,progress,start_date,end_date,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.projects,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "appointments",

        query:
          new URLSearchParams({
            select:
              "id,title,service,location,status,scheduled_at,appointment_date,ends_at,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.appointments,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),
    ]);

  const sections =
    [
      `LIVE OPERATIONAL DATA CHECKED AT: ${new Date().toISOString()}`,

      "Use only these records as live operational evidence.",

      formatRecordSection(
        "LEADS",
        leads,
        MAX_CONTEXT_RECORDS.leads,
      ),

      formatRecordSection(
        "QUOTE REQUESTS",
        quoteRequests,
        MAX_CONTEXT_RECORDS.quoteRequests,
      ),

      formatRecordSection(
        "CONTACT MESSAGES",
        contactMessages,
        MAX_CONTEXT_RECORDS.contactMessages,
      ),

      formatRecordSection(
        "OPPORTUNITIES",
        opportunities,
        MAX_CONTEXT_RECORDS.opportunities,
      ),

      formatRecordSection(
        "QUOTATIONS",
        quotations,
        MAX_CONTEXT_RECORDS.quotations,
      ),

      formatRecordSection(
        "CUSTOMERS",
        customers,
        MAX_CONTEXT_RECORDS.customers,
      ),

      formatRecordSection(
        "PROJECTS",
        projects,
        MAX_CONTEXT_RECORDS.projects,
      ),

      formatRecordSection(
        "APPOINTMENTS",
        appointments,
        MAX_CONTEXT_RECORDS.appointments,
      ),
    ];

  return truncateText(
    sections.join(
      "\n\n",
    ),
    MAX_OPERATIONAL_CONTEXT_LENGTH,
  );
}

/* -------------------------------------------------------------------------- */
/* LIVE WORKFORCE CONTEXT                                                     */
/* -------------------------------------------------------------------------- */

async function loadWorkforceContext({
  latestUserMessage,
  token,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  latestUserMessage:
    string;

  token:
    string;

  organisationId:
    string;

  supabaseUrl:
    string;

  supabaseKey:
    string;
}): Promise<string> {
  if (
    !needsWorkforceData(
      latestUserMessage,
    )
  ) {
    return "Workforce records were not required for this request.";
  }

  const [
    employees,
    missions,
    runs,
    handoffs,
    approvals,
  ] =
    await Promise.all([
      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "ai_employees",

        query:
          new URLSearchParams({
            select:
              "id,employee_key,name,title,department,mission,status,requires_approval_by_default,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "updated_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.employees,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "missions",

        query:
          new URLSearchParams({
            select:
              "id,title,objective,status,priority,risk_level,assigned_employee_id,created_at,updated_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.missions,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "mission_runs",

        query:
          new URLSearchParams({
            select:
              "id,mission_id,employee_id,status,model_provider,model_name,created_at,started_at,completed_at,error_code,error_message",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.runs,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "employee_handoffs",

        query:
          new URLSearchParams({
            select:
              "id,mission_id,from_employee_id,to_employee_id,reason,status,created_at,accepted_at,completed_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "created_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.handoffs,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      restSelect<
        Record<
          string,
          unknown
        >
      >({
        table:
          "approvals",

        query:
          new URLSearchParams({
            select:
              "id,mission_id,requested_by_employee_id,action_type,risk_level,justification,status,requested_at,decided_at",

            organisation_id:
              `eq.${organisationId}`,

            order:
              "requested_at.desc",

            limit:
              String(
                MAX_CONTEXT_RECORDS.approvals,
              ),
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),
    ]);

  const sections =
    [
      `LIVE AI WORKFORCE DATA CHECKED AT: ${new Date().toISOString()}`,

      "Interpret status literally. Active does not mean currently working. Pending does not mean completed.",

      formatRecordSection(
        "EMPLOYEES",
        employees,
        MAX_CONTEXT_RECORDS.employees,
      ),

      formatRecordSection(
        "MISSIONS",
        missions,
        MAX_CONTEXT_RECORDS.missions,
      ),

      formatRecordSection(
        "MISSION RUNS",
        runs,
        MAX_CONTEXT_RECORDS.runs,
      ),

      formatRecordSection(
        "HANDOFFS",
        handoffs,
        MAX_CONTEXT_RECORDS.handoffs,
      ),

      formatRecordSection(
        "APPROVALS",
        approvals,
        MAX_CONTEXT_RECORDS.approvals,
      ),
    ];

  return truncateText(
    sections.join(
      "\n\n",
    ),
    MAX_WORKFORCE_CONTEXT_LENGTH,
  );
}

/* -------------------------------------------------------------------------- */
/* EXTERNAL NEWS INTELLIGENCE                                                 */
/* -------------------------------------------------------------------------- */

const NEWS_SEARCH_STOP_WORDS =
  new Set([
    "about",
    "after",
    "again",
    "against",
    "also",
    "and",
    "are",
    "been",
    "before",
    "being",
    "business",
    "can",
    "cossa",
    "could",
    "does",
    "for",
    "from",
    "growth",
    "have",
    "into",
    "latest",
    "need",
    "news",
    "our",
    "please",
    "should",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "today",
    "want",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "you",
    "your",
  ]);

function createNewsSearchQuery(
  message:
    string,
): string | null {
  const terms =
    message
      .toLowerCase()
      .match(
        /[a-z0-9]{3,}/g,
      ) ??
    [];

  const selected =
    Array.from(
      new Set(
        terms.filter(
          (
            term,
          ) =>
            !NEWS_SEARCH_STOP_WORDS.has(
              term,
            ),
        ),
      ),
    ).slice(
      0,
      7,
    );

  if (
    selected.length ===
    0
  ) {
    return null;
  }

  return selected.join(
    " ",
  );
}

async function loadExternalNewsContext({
  latestUserMessage,
  newsApiKey,
}: {
  latestUserMessage:
    string;

  newsApiKey:
    string | undefined;
}): Promise<string> {
  if (
    !needsExternalNewsData(
      latestUserMessage,
    )
  ) {
    return "External news intelligence was not required for this request.";
  }

  if (
    !newsApiKey
  ) {
    return "External news intelligence was requested, but NEWS_API_KEY is not configured in the protected server environment.";
  }

  const searchQuery =
    createNewsSearchQuery(
      latestUserMessage,
    );

  if (
    !searchQuery
  ) {
    return "External news intelligence was requested, but a useful search query could not be derived.";
  }

  const params =
    new URLSearchParams({
      q:
        searchQuery,

      language:
        "en",

      sortBy:
        "publishedAt",

      pageSize:
        "5",
    });

  try {
    const response =
      await fetch(
        `https://newsapi.org/v2/everything?${params.toString()}`,
        {
          headers: {
            "X-Api-Key":
              newsApiKey,
          },
        },
      );

    if (
      !response.ok
    ) {
      const errorText =
        await response
          .text()
          .catch(
            () => "",
          );

      console.error(
        "NewsAPI request failed:",
        response.status,
        errorText,
      );

      return "External news intelligence could not be retrieved for this request.";
    }

    const payload =
      (
        await response.json()
      ) as NewsApiResponse;

    const articles =
      payload.articles ??
      [];

    if (
      articles.length ===
      0
    ) {
      return `External news search returned no articles for query: ${searchQuery}`;
    }

    const context =
      [
        `EXTERNAL NEWS CHECKED AT: ${new Date().toISOString()}`,

        `SEARCH QUERY: ${searchQuery}`,

        "External news is supplementary intelligence only. It does not prove Cossa company facts, supplier legitimacy, customer intent or commercial opportunity.",

        ...articles.map(
          (
            article,
            index,
          ) =>
            [
              `${index + 1}. ${article.title ?? "Untitled"}`,

              `Source: ${article.source?.name ?? "Unknown"}`,

              `Published: ${article.publishedAt ?? "Unknown"}`,

              article.description
                ? `Summary: ${article.description}`
                : null,

              article.url
                ? `URL: ${article.url}`
                : null,
            ]
              .filter(
                Boolean,
              )
              .join(
                "\n",
              ),
        ),
      ].join(
        "\n\n",
      );

    return truncateText(
      context,
      MAX_EXTERNAL_NEWS_CONTEXT_LENGTH,
    );
  } catch (
    error
  ) {
    console.error(
      "NewsAPI connection failed:",
      error,
    );

    return "External news intelligence could not be retrieved because the news provider connection failed.";
  }
}

/* -------------------------------------------------------------------------- */
/* SYSTEM BRAIN                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The previous prompt contained nearly 100 repeated operational rules.
 *
 * Most were good rules, but sending every rule on every request materially
 * inflated Groq input tokens.
 *
 * This version preserves the same operating doctrine in a shorter hierarchy.
 */
function buildSystemPrompt({
  verifiedContext,
  operationalContext,
  workforceContext,
  externalNewsContext,
  customSystem,
  latestUserMessage,
}: {
  verifiedContext:
    string;

  operationalContext:
    string;

  workforceContext:
    string;

  externalNewsContext:
    string;

  customSystem?:
    string;

  latestUserMessage:
    string;
}): string {
  const needs =
    detectContextNeeds(
      latestUserMessage,
    );

  const domainRules:
    string[] =
    [];

  if (
    needs.operational
  ) {
    domainRules.push(`
LIVE OPERATIONS
- CRM, lead, quotation, opportunity, project, appointment and customer claims must come from supplied live records.
- If a requested record is absent, say it was not found.
- Use exact recorded counts where supplied.
- Never claim contact, payment, booking, order, delivery, quotation or campaign execution without a verified system record.
- Protect private phone/email information unless the authenticated owner specifically requests it.
`);
  }

  if (
    needs.workforce
  ) {
    domainRules.push(`
WORKFORCE
- Active means available to receive work, not currently working.
- Pending handoff means assigned, not completed.
- Accepted means claimed, not necessarily completed.
- Running mission run proves work in progress.
- Completed work requires completed run or completed handoff evidence.
- Failed runs remain failed.
- Employees without a current assignment/run/handoff should be described as active but unassigned or idle.
- AI CEO may reason, coordinate and recommend, but cannot self-approve owner-controlled actions.
`);
  }

  if (
    /\b(marketing|social|content|seo|facebook|instagram|advert|campaign|post|flyer|business card|creative)\b/i.test(
      latestUserMessage,
    )
  ) {
    domainRules.push(`
MARKETING
- Strategy, research, copy, content calendars, creative briefs and SEO recommendations are low-risk internal work.
- Never invent testimonials, case studies, followers, traffic, engagement, sales or campaign performance.
- Paid spend, bid changes and campaign launches require owner approval.
- Publishing may only be claimed when a verified authorised integration confirms publication.
`);
  }

  if (
    /\b(store|product|supplier|inventory|catalog|catalogue|dropship|dropshipping)\b/i.test(
      latestUserMessage,
    )
  ) {
    domainRules.push(`
STORE AND SUPPLIERS
- Never invent inventory, stock, supplier availability, purchase cost or delivery time.
- Supplier candidates require real evidence before being called verified.
- News is not supplier verification.
- Supplier orders, binding terms and payments require owner approval.
`);
  }

  if (
    /\b(tender|procurement|rfq|broker|deal)\b/i.test(
      latestUserMessage,
    )
  ) {
    domainRules.push(`
PROCUREMENT
- Never fabricate tenders, deadlines, eligibility, buyers, brokers or deals.
- Potential fit is analysis, not proof.
- Tender submission, signed commitments and legal declarations require owner approval.
`);
  }

  if (
    needs.externalNews
  ) {
    domainRules.push(`
EXTERNAL INTELLIGENCE
- Label external news as external intelligence.
- Do not convert news signals into verified company, supplier, customer or commercial facts.
- Never claim broader web research happened unless an authorised research workflow actually performed it.
`);
  }

  if (
    needs.briefing
  ) {
    domainRules.push(`
CEO BRIEFING FORMAT
Prioritise:
1. What is working now.
2. What is blocked or failed.
3. Revenue/customer opportunities supported by evidence.
4. Work completed versus still assigned/in progress.
5. High-priority actions that can continue without owner approval.
6. Owner decisions genuinely required.
7. Missing evidence.

Do not turn ordinary internal drafting/research into owner approval requests.
`);
  }

  const prompt =
    `
You are Cossa AI, the internal executive reasoning and controlled workforce intelligence layer for Cossa Nexus Holdings.

You support authorised Cossa work across strategy, sales, CRM, marketing, operations, procurement, commerce, technology, customer development, workforce coordination and executive decision support.

NON-NEGOTIABLE OPERATING RULES

1. Work from evidence. Never fabricate facts, records, suppliers, customers, opportunities, results, integrations or employee activity.
2. Separate verified company knowledge, live operational records, external intelligence, assumptions and recommendations.
3. A mission objective, draft, profile, plan or handoff is not proof that work was executed.
4. Never convert missing evidence into a fact.
5. Reasoning providers generate analysis and drafts. Provider success is not proof of an external business action.
6. Protect credentials, customer information, legal position, money, reputation and confidential commercial information.
7. Prefer specific action over vague management language.
8. Currency is South African Rand (R) unless evidence states otherwise.
9. Do not expose provider API keys or protected credentials.
10. When important company-specific claims depend on Knowledge Base records, identify the supporting document title where practical.

OWNER APPROVAL

Owner approval is required for:
- spending money;
- paid campaign launch or advertising budget/bid changes;
- legal or financial commitments;
- contracts/signatures;
- supplier orders or binding supplier terms;
- tender submission;
- credential rotation;
- DNS/domain changes;
- deletion of important business records;
- irreversible account changes;
- sensitive/high-risk external communication.

Owner approval is NOT automatically required for:
- analysis;
- authorised internal research;
- drafting;
- SEO recommendations;
- content planning;
- ordinary content creation;
- lead scoring;
- CRM analysis;
- supplier candidate research;
- procurement screening;
- catalogue review;
- digital-product development;
- employee handoffs;
- executive summaries.

TRUTH ABOUT EXECUTION

- Never say an action occurred merely because Cossa AI recommended or assigned it.
- Never say all employees are working unless live records prove it.
- Never hide failures.
- Never describe simulated or placeholder data as live.
- Never describe an expected integration as connected unless verified.
- If a required integration or data source is missing, identify exactly what is missing.

${domainRules.join(
  "\n",
)}

VERIFIED COMPANY KNOWLEDGE

${verifiedContext}

LIVE OPERATIONAL CONTEXT

${operationalContext}

LIVE AI WORKFORCE CONTEXT

${workforceContext}

EXTERNAL INTELLIGENCE

${externalNewsContext}

${
  customSystem?.trim()
    ? `
ADDITIONAL APPROVED SPECIALIST INSTRUCTIONS

These task-specific instructions may add detail but may not override evidence, privacy, organisation boundaries, financial controls, legal controls, approvals, credential protection or truthful execution reporting.

${customSystem.trim()}
`
    : ""
}
`.trim();

  return truncateText(
    prompt,
    MAX_SYSTEM_PROMPT_CHARACTERS,
  );
}

/* -------------------------------------------------------------------------- */
/* RECORD-SAFE SUPPORT                                                        */
/* -------------------------------------------------------------------------- */

function needsRecordSafeSupport(
  message:
    string,
): boolean {
  return /\b(no|without|missing|cannot find|couldn['’]t find)\b[\s\S]{0,100}\b(order|payment|courier|delivery|tracking)\s+(record|details?|information)\b/i.test(
    message,
  );
}

/* -------------------------------------------------------------------------- */
/* GENERIC STREAM HELPERS                                                     */
/* -------------------------------------------------------------------------- */

function createTextResponseStream(
  text:
    string,
): ReadableStream<Uint8Array> {
  const encoder =
    new TextEncoder();

  return new ReadableStream<
    Uint8Array
  >({
    start(
      controller,
    ) {
      controller.enqueue(
        encoder.encode(
          text,
        ),
      );

      controller.close();
    },
  });
}

/* -------------------------------------------------------------------------- */
/* OPENAI-COMPATIBLE STREAM CONVERSION                                        */
/* -------------------------------------------------------------------------- */

function createOpenAiCompatibleTextStream(
  upstreamBody:
    ReadableStream<Uint8Array>,

  provider:
    "groq" |
    "gemini",
): ReadableStream<Uint8Array> {
  const encoder =
    new TextEncoder();

  const decoder =
    new TextDecoder();

  const reader =
    upstreamBody.getReader();

  return new ReadableStream<
    Uint8Array
  >({
    start(
      controller,
    ) {
      let buffer =
        "";

      let streamClosed =
        false;

      function closeStream() {
        if (
          streamClosed
        ) {
          return;
        }

        streamClosed =
          true;

        controller.close();
      }

      function processSseLine(
        line:
          string,
      ) {
        if (
          !line.startsWith(
            "data:",
          )
        ) {
          return;
        }

        const data =
          line
            .slice(
              5,
            )
            .trim();

        if (
          !data
        ) {
          return;
        }

        if (
          data ===
          "[DONE]"
        ) {
          closeStream();

          return;
        }

        try {
          const parsed =
            JSON.parse(
              data,
            ) as OpenAiCompatibleCompletion;

          const token =
            parsed
              .choices?.[0]
              ?.delta
              ?.content;

          if (
            typeof token ===
              "string" &&
            token &&
            !streamClosed
          ) {
            controller.enqueue(
              encoder.encode(
                token,
              ),
            );
          }
        } catch (
          error
        ) {
          console.warn(
            `Ignored malformed ${provider} streaming chunk.`,
            error,
          );
        }
      }

      async function pump() {
        try {
          while (
            !streamClosed
          ) {
            const {
              value,
              done,
            } =
              await reader.read();

            if (
              done
            ) {
              buffer +=
                decoder.decode();

              if (
                buffer.trim()
              ) {
                for (
                  const rawLine of
                    buffer.split(
                      /\r?\n/,
                    )
                ) {
                  const line =
                    rawLine.trim();

                  if (
                    line
                  ) {
                    processSseLine(
                      line,
                    );
                  }

                  if (
                    streamClosed
                  ) {
                    return;
                  }
                }
              }

              closeStream();

              return;
            }

            buffer +=
              decoder.decode(
                value,
                {
                  stream:
                    true,
                },
              );

            let lineBreakIndex =
              buffer.indexOf(
                "\n",
              );

            while (
              lineBreakIndex !==
              -1
            ) {
              const line =
                buffer
                  .slice(
                    0,
                    lineBreakIndex,
                  )
                  .replace(
                    /\r$/,
                    "",
                  )
                  .trim();

              buffer =
                buffer.slice(
                  lineBreakIndex +
                    1,
                );

              if (
                line
              ) {
                processSseLine(
                  line,
                );
              }

              if (
                streamClosed
              ) {
                return;
              }

              lineBreakIndex =
                buffer.indexOf(
                  "\n",
                );
            }
          }
        } catch (
          error
        ) {
          if (
            !streamClosed
          ) {
            controller.error(
              error,
            );
          }
        }
      }

      void pump();
    },

    cancel() {
      void reader.cancel();
    },
  });
}

/* -------------------------------------------------------------------------- */
/* FIRST OUTPUT GATE                                                          */
/* -------------------------------------------------------------------------- */

async function primeTextStream(
  stream:
    ReadableStream<Uint8Array>,
): Promise<PrimedStreamResult> {
  const reader =
    stream.getReader();

  const decoder =
    new TextDecoder();

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
        reader.releaseLock();

        return {
          ok:
            false,

          error:
            "The provider opened a response stream but returned no usable assistant output.",
        };
      }

      if (
        !value ||
        value.byteLength ===
          0
      ) {
        continue;
      }

      const preview =
        decoder.decode(
          value,
          {
            stream:
              true,
          },
        );

      if (
        !preview.trim()
      ) {
        continue;
      }

      const firstChunk =
        value;

      let completed =
        false;

      const reconstructedStream =
        new ReadableStream<
          Uint8Array
        >({
          start(
            controller,
          ) {
            controller.enqueue(
              firstChunk,
            );

            async function pump() {
              try {
                while (
                  !completed
                ) {
                  const {
                    value:
                      nextValue,

                    done:
                      nextDone,
                  } =
                    await reader.read();

                  if (
                    nextDone
                  ) {
                    completed =
                      true;

                    controller.close();

                    return;
                  }

                  if (
                    nextValue &&
                    nextValue.byteLength >
                      0
                  ) {
                    controller.enqueue(
                      nextValue,
                    );
                  }
                }
              } catch (
                error
              ) {
                completed =
                  true;

                controller.error(
                  error,
                );
              } finally {
                try {
                  reader.releaseLock();
                } catch {
                  // Reader may already be released.
                }
              }
            }

            void pump();
          },

          async cancel(
            reason,
          ) {
            completed =
              true;

            try {
              await reader.cancel(
                reason,
              );
            } finally {
              try {
                reader.releaseLock();
              } catch {
                // Reader may already be released.
              }
            }
          },
        });

      return {
        ok:
          true,

        stream:
          reconstructedStream,
      };
    }
  } catch (
    error
  ) {
    try {
      reader.releaseLock();
    } catch {
      // Reader may already have failed.
    }

    return {
      ok:
        false,

      error:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* OPENAI RESPONSE EXTRACTION                                                 */
/* -------------------------------------------------------------------------- */

function extractOpenAiResponseText(
  response:
    unknown,
): string {
  if (
    !response ||
    typeof response !==
      "object"
  ) {
    return "";
  }

  const payload =
    response as OpenAiResponsePayload;

  if (
    typeof payload.output_text ===
      "string"
  ) {
    return payload.output_text.trim();
  }

  return (
    payload.output ??
    []
  )
    .flatMap(
      (
        item,
      ) =>
        item.content ??
        [],
    )
    .filter(
      (
        item,
      ) =>
        item.type ===
          "output_text" &&
        typeof item.text ===
          "string",
    )
    .map(
      (
        item,
      ) =>
        item.text as string,
    )
    .join(
      "",
    )
    .trim();
}

/* -------------------------------------------------------------------------- */
/* PROVIDER ERRORS                                                            */
/* -------------------------------------------------------------------------- */

function parseProviderError(
  errorText:
    string,
): ProviderErrorBody | null {
  if (
    !errorText.trim()
  ) {
    return null;
  }

  try {
    return JSON.parse(
      errorText,
    ) as ProviderErrorBody;
  } catch {
    return null;
  }
}

function providerDisplayName(
  provider:
    ChatProvider,
): string {
  switch (
    provider
  ) {
    case "groq":
      return "Groq";

    case "gemini":
      return "Gemini";

    case "openai":
      return "OpenAI";

    default:
      return provider;
  }
}

function isProviderCapacityError(
  status:
    number,

  errorText:
    string,
): boolean {
  const lower =
    errorText.toLowerCase();

  return (
    status ===
      413 &&
    (
      lower.includes(
        "tokens per minute",
      ) ||
      lower.includes(
        "request too large for model",
      ) ||
      lower.includes(
        "rate_limit_exceeded",
      ) ||
      lower.includes(
        "token",
      )
    )
  );
}

function safeProviderFailure(
  provider:
    ChatProvider,

  status:
    number,

  errorText:
    string,
): string {
  const body =
    parseProviderError(
      errorText,
    );

  const code =
    body?.error?.code
      ?.toLowerCase() ??
    "";

  const type =
    body?.error?.type
      ?.toLowerCase() ??
    "";

  const name =
    providerDisplayName(
      provider,
    );

  if (
    isProviderCapacityError(
      status,
      errorText,
    )
  ) {
    return `${name} could not accept the current reasoning context within its token-capacity limit.`;
  }

  if (
    provider ===
      "openai" &&
    (
      code ===
        "credit_balance_exhausted" ||
      code ===
        "insufficient_quota" ||
      type ===
        "insufficient_quota"
    )
  ) {
    return "Strategic OpenAI reasoning currently has no available API credit.";
  }

  if (
    status ===
    429
  ) {
    return `${name} is temporarily rate-limiting Cossa AI.`;
  }

  if (
    status ===
      401 ||
    status ===
      403
  ) {
    return `${name} could not authorise the protected Cossa AI provider request.`;
  }

  if (
    status ===
      408 ||
    status ===
      504
  ) {
    return `${name} timed out while processing the Cossa AI request.`;
  }

  if (
    status ===
    404
  ) {
    return `${name} could not access the configured reasoning model.`;
  }

  if (
    status >=
    500
  ) {
    return `${name} is temporarily unavailable.`;
  }

  return `${name} could not complete the Cossa AI request.`;
}

function providerFailureIsRetryable(
  status:
    number,

  errorText:
    string,
): boolean {
  /**
   * Important distinction:
   *
   * Groq may use HTTP 413 for token-capacity/rate-limit failures.
   *
   * That is provider-specific and another provider may still complete the
   * request.
   *
   * Therefore this kind of 413 is retryable.
   */
  if (
    isProviderCapacityError(
      status,
      errorText,
    )
  ) {
    return true;
  }

  return (
    status ===
      401 ||
    status ===
      402 ||
    status ===
      403 ||
    status ===
      408 ||
    status ===
      409 ||
    status ===
      429 ||
    status >=
      500
  );
}

/* -------------------------------------------------------------------------- */
/* PROVIDER CONFIGURATION                                                     */
/* -------------------------------------------------------------------------- */

function providerConfigured(
  provider:
    ChatProvider,

  environment:
    ProviderEnvironment,
): boolean {
  switch (
    provider
  ) {
    case "groq":
      return Boolean(
        environment.groqApiKey,
      );

    case "gemini":
      return Boolean(
        environment.geminiApiKey,
      );

    case "openai":
      return Boolean(
        environment.openAiApiKey &&
        environment.openAiModel,
      );

    default:
      return false;
  }
}

function providerModel(
  provider:
    ChatProvider,

  environment:
    ProviderEnvironment,
): string | null {
  switch (
    provider
  ) {
    case "groq":
      return environment.groqModel;

    case "gemini":
      return environment.geminiModel;

    case "openai":
      return environment.openAiModel;

    default:
      return null;
  }
}

function buildProviderOrder(
  preferred:
    ChatProviderPreference,

  environment:
    ProviderEnvironment,
): ChatProvider[] {
  const requestedOrder:
    ChatProvider[] =
    preferred ===
    "auto"
      ? [
          ...DEFAULT_PROVIDER_ORDER,
        ]
      : [
          preferred,

          ...DEFAULT_PROVIDER_ORDER.filter(
            (
              provider,
            ) =>
              provider !==
              preferred,
          ),
        ];

  return requestedOrder.filter(
    (
      provider,
      index,
      providers,
    ) =>
      providers.indexOf(
        provider,
      ) ===
        index &&
      providerConfigured(
        provider,
        environment,
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* PROVIDER ROUTE                                                             */
/* -------------------------------------------------------------------------- */

function providerAttemptRoute(
  attempts:
    ProviderAttemptRecord[],
): string {
  if (
    attempts.length ===
    0
  ) {
    return "none";
  }

  return attempts
    .map(
      (
        attempt,
      ) =>
        attempt.provider,
    )
    .join(
      ">",
    );
}

/* -------------------------------------------------------------------------- */
/* RESPONSE HEADERS                                                           */
/* -------------------------------------------------------------------------- */

function chatResponseHeaders({
  requestedProvider,
  actualProvider,
  model,
  attempts,
  requestId,
  estimatedInputTokens,
}: {
  requestedProvider:
    ChatProviderPreference;

  actualProvider:
    ChatProvider;

  model:
    string;

  attempts:
    ProviderAttemptRecord[];

  requestId:
    string;

  estimatedInputTokens:
    number;
}): HeadersInit {
  const providerRoute =
    providerAttemptRoute(
      attempts,
    );

  const fallbackUsed =
    attempts.length >
      1 ||
    (
      requestedProvider !==
        "auto" &&
      requestedProvider !==
        actualProvider
    );

  return {
    "Content-Type":
      "text/plain; charset=utf-8",

    "Cache-Control":
      "no-cache, no-transform",

    "X-Accel-Buffering":
      "no",

    "X-Content-Type-Options":
      "nosniff",

    "X-Cossa-AI-Request-ID":
      requestId,

    "X-Cossa-AI-Requested-Provider":
      requestedProvider,

    "X-Cossa-AI-Provider":
      actualProvider,

    "X-Cossa-AI-Model":
      model,

    "X-Cossa-AI-Fallback":
      fallbackUsed
        ? "true"
        : "false",

    "X-Cossa-AI-Attempts":
      String(
        attempts.length,
      ),

    "X-Cossa-AI-Provider-Route":
      providerRoute,

    "X-Cossa-AI-Estimated-Input-Tokens":
      String(
        estimatedInputTokens,
      ),

    "Access-Control-Expose-Headers":
      [
        "X-Cossa-AI-Request-ID",
        "X-Cossa-AI-Requested-Provider",
        "X-Cossa-AI-Provider",
        "X-Cossa-AI-Model",
        "X-Cossa-AI-Fallback",
        "X-Cossa-AI-Attempts",
        "X-Cossa-AI-Provider-Route",
        "X-Cossa-AI-Estimated-Input-Tokens",
      ].join(
        ", ",
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* GROQ PROVIDER                                                              */
/* -------------------------------------------------------------------------- */

async function executeGroq({
  providerMessages,
  environment,
  signal,
}: {
  providerMessages:
    ChatMessage[];

  environment:
    ProviderEnvironment;

  signal:
    AbortSignal;
}): Promise<ProviderResult> {
  const provider:
    ChatProvider =
    "groq";

  const model =
    environment.groqModel;

  if (
    !environment.groqApiKey
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "Groq is not configured.",

      internalMessage:
        "GROQ_API_KEY is not configured.",

      retryable:
        true,
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${environment.groqApiKey}`,
          },

          body:
            JSON.stringify({
              model,

              stream:
                true,

              temperature:
                0.2,

              max_tokens:
                MAX_GROQ_COMPLETION_TOKENS,

              messages:
                providerMessages,
            }),

          signal,
        },
      );
  } catch (
    error
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "Groq could not be reached.",

      internalMessage:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),

      retryable:
        true,
    };
  }

  if (
    !response.ok ||
    !response.body
  ) {
    const errorText =
      await response
        .text()
        .catch(
          () => "",
        );

    return {
      ok:
        false,

      provider,

      model,

      status:
        response.status ||
        502,

      safeMessage:
        safeProviderFailure(
          provider,
          response.status,
          errorText,
        ),

      internalMessage:
        errorText,

      retryable:
        providerFailureIsRetryable(
          response.status,
          errorText,
        ),
    };
  }

  const convertedStream =
    createOpenAiCompatibleTextStream(
      response.body,
      "groq",
    );

  const primed =
    await primeTextStream(
      convertedStream,
    );

  if (
    !primed.ok
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        502,

      safeMessage:
        "Groq returned no usable Cossa AI response.",

      internalMessage:
        primed.error,

      retryable:
        true,
    };
  }

  return {
    ok:
      true,

    provider,

    model,

    stream:
      primed.stream,
  };
}

/* -------------------------------------------------------------------------- */
/* GEMINI PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

async function executeGemini({
  providerMessages,
  environment,
  signal,
}: {
  providerMessages:
    ChatMessage[];

  environment:
    ProviderEnvironment;

  signal:
    AbortSignal;
}): Promise<ProviderResult> {
  const provider:
    ChatProvider =
    "gemini";

  const model =
    environment.geminiModel;

  if (
    !environment.geminiApiKey
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "Gemini is not configured.",

      internalMessage:
        "GEMINI_API_KEY is not configured.",

      retryable:
        true,
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${environment.geminiApiKey}`,
          },

          body:
            JSON.stringify({
              model,

              messages:
                providerMessages,

              stream:
                true,

              temperature:
                0.2,

              max_tokens:
                MAX_GEMINI_COMPLETION_TOKENS,
            }),

          signal,
        },
      );
  } catch (
    error
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "Gemini could not be reached.",

      internalMessage:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),

      retryable:
        true,
    };
  }

  if (
    !response.ok ||
    !response.body
  ) {
    const errorText =
      await response
        .text()
        .catch(
          () => "",
        );

    return {
      ok:
        false,

      provider,

      model,

      status:
        response.status ||
        502,

      safeMessage:
        safeProviderFailure(
          provider,
          response.status,
          errorText,
        ),

      internalMessage:
        errorText,

      retryable:
        providerFailureIsRetryable(
          response.status,
          errorText,
        ),
    };
  }

  const convertedStream =
    createOpenAiCompatibleTextStream(
      response.body,
      "gemini",
    );

  const primed =
    await primeTextStream(
      convertedStream,
    );

  if (
    !primed.ok
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        502,

      safeMessage:
        "Gemini returned no usable Cossa AI response.",

      internalMessage:
        primed.error,

      retryable:
        true,
    };
  }

  return {
    ok:
      true,

    provider,

    model,

    stream:
      primed.stream,
  };
}

/* -------------------------------------------------------------------------- */
/* OPENAI PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

async function executeOpenAi({
  providerMessages,
  environment,
  signal,
}: {
  providerMessages:
    ChatMessage[];

  environment:
    ProviderEnvironment;

  signal:
    AbortSignal;
}): Promise<ProviderResult> {
  const provider:
    ChatProvider =
    "openai";

  const model =
    environment.openAiModel;

  if (
    !environment.openAiApiKey
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "OpenAI is not configured.",

      internalMessage:
        "OPENAI_API_KEY is not configured.",

      retryable:
        true,
    };
  }

  if (
    !model
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "Strategic OpenAI reasoning is disabled because no approved OpenAI model is configured.",

      internalMessage:
        "OPENAI_MODEL is not configured.",

      retryable:
        true,
    };
  }

  const instructions =
    providerMessages
      .filter(
        (
          message,
        ) =>
          message.role ===
          "system",
      )
      .map(
        (
          message,
        ) =>
          message.content,
      )
      .join(
        "\n\n",
      );

  const input =
    providerMessages
      .filter(
        (
          message,
        ) =>
          message.role !==
          "system",
      )
      .map(
        (
          message,
        ) => ({
          role:
            message.role,

          content:
            message.content,
        }),
      );

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${environment.openAiApiKey}`,
          },

          body:
            JSON.stringify({
              model,

              instructions,

              input,

              max_output_tokens:
                MAX_OPENAI_COMPLETION_TOKENS,

              store:
                false,
            }),

          signal,
        },
      );
  } catch (
    error
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        503,

      safeMessage:
        "OpenAI could not be reached.",

      internalMessage:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),

      retryable:
        true,
    };
  }

  if (
    !response.ok
  ) {
    const errorText =
      await response
        .text()
        .catch(
          () => "",
        );

    return {
      ok:
        false,

      provider,

      model,

      status:
        response.status ||
        502,

      safeMessage:
        safeProviderFailure(
          provider,
          response.status,
          errorText,
        ),

      internalMessage:
        errorText,

      retryable:
        providerFailureIsRetryable(
          response.status,
          errorText,
        ),
    };
  }

  let payload:
    unknown;

  try {
    payload =
      await response.json();
  } catch (
    error
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        502,

      safeMessage:
        "OpenAI returned an unreadable response.",

      internalMessage:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),

      retryable:
        true,
    };
  }

  const responseText =
    extractOpenAiResponseText(
      payload,
    );

  if (
    !responseText
  ) {
    return {
      ok:
        false,

      provider,

      model,

      status:
        502,

      safeMessage:
        "OpenAI returned an empty Cossa AI response.",

      internalMessage:
        "OpenAI Responses API returned no usable output text.",

      retryable:
        true,
    };
  }

  return {
    ok:
      true,

    provider,

    model,

    stream:
      createTextResponseStream(
        responseText,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* PROVIDER EXECUTION                                                         */
/* -------------------------------------------------------------------------- */

async function executeProvider({
  provider,
  providerMessages,
  environment,
  signal,
}: {
  provider:
    ChatProvider;

  providerMessages:
    ChatMessage[];

  environment:
    ProviderEnvironment;

  signal:
    AbortSignal;
}): Promise<ProviderResult> {
  switch (
    provider
  ) {
    case "groq":
      return executeGroq({
        providerMessages,

        environment,

        signal,
      });

    case "gemini":
      return executeGemini({
        providerMessages,

        environment,

        signal,
      });

    case "openai":
      return executeOpenAi({
        providerMessages,

        environment,

        signal,
      });

    default: {
      const exhaustiveCheck:
        never =
        provider;

      throw new Error(
        `Unsupported provider: ${String(
          exhaustiveCheck,
        )}`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* PROVIDER GATEWAY                                                           */
/* -------------------------------------------------------------------------- */

async function executeProviderGateway({
  requestedProvider,
  providerMessages,
  environment,
  signal,
}: {
  requestedProvider:
    ChatProviderPreference;

  providerMessages:
    ChatMessage[];

  environment:
    ProviderEnvironment;

  signal:
    AbortSignal;
}): Promise<{
  result:
    ProviderSuccess |
    null;

  attempts:
    ProviderAttemptRecord[];
}> {
  const providers =
    buildProviderOrder(
      requestedProvider,
      environment,
    );

  const attempts:
    ProviderAttemptRecord[] =
    [];

  if (
    providers.length ===
    0
  ) {
    return {
      result:
        null,

      attempts,
    };
  }

  for (
    const provider of
      providers
  ) {
    if (
      signal.aborted
    ) {
      throw new DOMException(
        "The Cossa AI request was cancelled.",
        "AbortError",
      );
    }

    const model =
      providerModel(
        provider,
        environment,
      );

    const result =
      await executeProvider({
        provider,

        providerMessages,

        environment,

        signal,
      });

    if (
      result.ok
    ) {
      attempts.push({
        provider,

        model:
          result.model,

        status:
          "success",

        httpStatus:
          200,
      });

      return {
        result,

        attempts,
      };
    }

    attempts.push({
      provider,

      model:
        result.model,

      status:
        "failed",

      httpStatus:
        result.status,

      message:
        result.safeMessage,
    });

    console.error(
      `Cossa AI provider ${provider} failed.`,
      {
        provider,

        model:
          result.model,

        status:
          result.status,

        retryable:
          result.retryable,

        detail:
          result.internalMessage,
      },
    );

    if (
      !result.retryable
    ) {
      break;
    }
  }

  return {
    result:
      null,

    attempts,
  };
}

/* -------------------------------------------------------------------------- */
/* PROVIDER FAILURE RESPONSE                                                  */
/* -------------------------------------------------------------------------- */

function createGatewayFailureResponse({
  attempts,
  requestId,
  requestedProvider,
}: {
  attempts:
    ProviderAttemptRecord[];

  requestId:
    string;

  requestedProvider:
    ChatProviderPreference;
}): Response {
  const providerRoute =
    providerAttemptRoute(
      attempts,
    );

  if (
    attempts.length ===
    0
  ) {
    return new Response(
      "No Cossa AI reasoning provider is currently configured.",
      {
        status:
          503,

        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",

          "X-Cossa-AI-Request-ID":
            requestId,

          "X-Cossa-AI-Requested-Provider":
            requestedProvider,

          "X-Cossa-AI-Provider":
            "none",

          "X-Cossa-AI-Fallback":
            "false",

          "X-Cossa-AI-Attempts":
            "0",

          "X-Cossa-AI-Provider-Route":
            "none",
        },
      },
    );
  }

  const messages =
    attempts
      .filter(
        (
          attempt,
        ) =>
          attempt.status ===
            "failed" &&
          attempt.message,
      )
      .map(
        (
          attempt,
        ) =>
          attempt.message as string,
      );

  const hasRateLimit =
    attempts.some(
      (
        attempt,
      ) =>
        attempt.httpStatus ===
          429 ||
        attempt.httpStatus ===
          413,
    );

  const uniqueMessages =
    [
      ...new Set(
        messages,
      ),
    ];

  const message =
    [
      "Cossa AI could not complete this reasoning request using the currently available providers.",

      ...uniqueMessages,

      "No external Cossa action should be treated as completed from this failed reasoning request.",
    ].join(
      " ",
    );

  return new Response(
    message,
    {
      status:
        hasRateLimit
          ? 429
          : 503,

      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",

        "Cache-Control":
          "no-store",

        "X-Content-Type-Options":
          "nosniff",

        "X-Cossa-AI-Request-ID":
          requestId,

        "X-Cossa-AI-Requested-Provider":
          requestedProvider,

        "X-Cossa-AI-Provider":
          "none",

        "X-Cossa-AI-Fallback":
          attempts.length >
          1
            ? "true"
            : "false",

        "X-Cossa-AI-Attempts":
          String(
            attempts.length,
          ),

        "X-Cossa-AI-Provider-Route":
          providerRoute,

        "Access-Control-Expose-Headers":
          [
            "X-Cossa-AI-Request-ID",
            "X-Cossa-AI-Requested-Provider",
            "X-Cossa-AI-Provider",
            "X-Cossa-AI-Fallback",
            "X-Cossa-AI-Attempts",
            "X-Cossa-AI-Provider-Route",
          ].join(
            ", ",
          ),
      },
    },
  );
}

/* -------------------------------------------------------------------------- */
/* PROVIDER CONFIGURATION STATUS                                              */
/* -------------------------------------------------------------------------- */

function providerConfigurationPayload(
  environment:
    ProviderEnvironment,
) {
  return {
    status:
      "configured",

    checked_at:
      new Date().toISOString(),

    providers: {
      groq: {
        configured:
          Boolean(
            environment.groqApiKey,
          ),

        model:
          environment.groqModel,
      },

      gemini: {
        configured:
          Boolean(
            environment.geminiApiKey,
          ),

        model:
          environment.geminiModel,
      },

      openai: {
        configured:
          Boolean(
            environment.openAiApiKey &&
            environment.openAiModel,
          ),

        key_configured:
          Boolean(
            environment.openAiApiKey,
          ),

        model_configured:
          Boolean(
            environment.openAiModel,
          ),

        model:
          environment.openAiModel,
      },
    },

    default_provider_order: [
      ...DEFAULT_PROVIDER_ORDER,
    ],

    external_news: {
      configured:
        Boolean(
          environment.newsApiKey,
      ),
    },

    context_budget: {
      max_provider_input_characters:
        MAX_PROVIDER_INPUT_CHARACTERS,

      max_recent_history_messages:
        MAX_RECENT_HISTORY_MESSAGES,

      max_recent_history_characters:
        MAX_RECENT_HISTORY_LENGTH,

      max_knowledge_characters:
        MAX_KNOWLEDGE_CONTEXT_LENGTH,

      max_operational_characters:
        MAX_OPERATIONAL_CONTEXT_LENGTH,

      max_workforce_characters:
        MAX_WORKFORCE_CONTEXT_LENGTH,

      max_news_characters:
        MAX_EXTERNAL_NEWS_CONTEXT_LENGTH,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* API ROUTE                                                                  */
/* -------------------------------------------------------------------------- */

export const Route =
  createFileRoute(
    "/api/chat",
  )({
    server: {
      handlers: {
        /* ------------------------------------------------------------------ */
        /* GET                                                                */
        /* ------------------------------------------------------------------ */

        GET: async ({
          request,
        }) => {
          const requestId =
            createRequestId();

          const environment =
            getEnvironment();

          if (
            !environment
          ) {
            return Response.json(
              {
                status:
                  "not_configured",

                message:
                  "Cossa AI server configuration is incomplete.",

                request_id:
                  requestId,
              },
              {
                status:
                  503,

                headers: {
                  "Cache-Control":
                    "no-store",

                  "X-Content-Type-Options":
                    "nosniff",

                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          const auth =
            await authenticateRequest(
              request,
              environment,
            );

          if (
            !auth.ok
          ) {
            return auth.response;
          }

          return Response.json(
            {
              ...providerConfigurationPayload(
                environment,
              ),

              request_id:
                requestId,
            },
            {
              headers: {
                "Cache-Control":
                  "no-store",

                "X-Content-Type-Options":
                  "nosniff",

                "X-Cossa-AI-Request-ID":
                  requestId,

                "Access-Control-Expose-Headers":
                  "X-Cossa-AI-Request-ID",
              },
            },
          );
        },

        /* ------------------------------------------------------------------ */
        /* POST                                                               */
        /* ------------------------------------------------------------------ */

        POST: async ({
          request,
        }) => {
          const requestId =
            createRequestId();

          const environment =
            getEnvironment();

          if (
            !environment
          ) {
            return new Response(
              "Cossa AI is not fully configured.",
              {
                status:
                  503,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          /* ---------------------------------------------------------------- */
          /* AUTH                                                             */
          /* ---------------------------------------------------------------- */

          const auth =
            await authenticateRequest(
              request,
              environment,
            );

          if (
            !auth.ok
          ) {
            return auth.response;
          }

          const {
            token,
          } =
            auth;

          /* ---------------------------------------------------------------- */
          /* BODY                                                             */
          /* ---------------------------------------------------------------- */

          let payload:
            ChatPayload;

          try {
            payload =
              (
                await request.json()
              ) as ChatPayload;
          } catch {
            return new Response(
              "Invalid JSON body.",
              {
                status:
                  400,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          const validation =
            validateMessages(
              payload.messages,
            );

          if (
            !validation.valid
          ) {
            return new Response(
              validation.error,
              {
                status:
                  400,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          const messages =
            validation.messages;

          const customSystem =
            cleanCustomSystem(
              payload.system,
            );

          const requestedProvider:
            ChatProviderPreference =
            payload.provider ??
            "auto";

          if (
            !isChatProviderPreference(
              requestedProvider,
            )
          ) {
            return new Response(
              "Unsupported Cossa AI provider preference.",
              {
                status:
                  400,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          const latestUserMessage =
            [
              ...messages,
            ]
              .reverse()
              .find(
                (
                  message,
                ) =>
                  message.role ===
                  "user",
              )
              ?.content ??
            "";

          if (
            !latestUserMessage
          ) {
            return new Response(
              "At least one user message is required.",
              {
                status:
                  400,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,
                },
              },
            );
          }

          const contextNeeds =
            detectContextNeeds(
              latestUserMessage,
            );

          /* ---------------------------------------------------------------- */
          /* VERIFIED KNOWLEDGE                                               */
          /* ---------------------------------------------------------------- */

          const knowledge =
            await restSelect<KnowledgeDocument>({
              table:
                "ai_knowledge_documents",

              query:
                new URLSearchParams({
                  select:
                    "title,body,category,tags,source,source_url,updated_at",

                  organisation_id:
                    `eq.${environment.organisationId}`,

                  verification_status:
                    "eq.verified",

                  order:
                    "updated_at.desc",

                  limit:
                    "80",
                }).toString(),

              token,

              supabaseUrl:
                environment.supabaseUrl,

              supabaseKey:
                environment.supabaseKey,
            });

          const selectedKnowledge =
            selectRelevantKnowledge(
              knowledge,
              latestUserMessage,
            );

          const verifiedContext =
            formatKnowledgeContext(
              selectedKnowledge,
            );

          /* ---------------------------------------------------------------- */
          /* LIVE / EXTERNAL CONTEXT                                          */
          /* ---------------------------------------------------------------- */

          const [
            operationalContext,
            workforceContext,
            externalNewsContext,
          ] =
            await Promise.all([
              contextNeeds.operational
                ? loadOperationalContext({
                    latestUserMessage,

                    token,

                    organisationId:
                      environment.organisationId,

                    supabaseUrl:
                      environment.supabaseUrl,

                    supabaseKey:
                      environment.supabaseKey,
                  })
                : Promise.resolve(
                    "Operational CRM records were not required for this request.",
                  ),

              contextNeeds.workforce
                ? loadWorkforceContext({
                    latestUserMessage,

                    token,

                    organisationId:
                      environment.organisationId,

                    supabaseUrl:
                      environment.supabaseUrl,

                    supabaseKey:
                      environment.supabaseKey,
                  })
                : Promise.resolve(
                    "Workforce records were not required for this request.",
                  ),

              contextNeeds.externalNews
                ? loadExternalNewsContext({
                    latestUserMessage,

                    newsApiKey:
                      environment.newsApiKey,
                  })
                : Promise.resolve(
                    "External news intelligence was not required for this request.",
                  ),
            ]);

          /* ---------------------------------------------------------------- */
          /* SYSTEM PROMPT                                                    */
          /* ---------------------------------------------------------------- */

          const systemPreamble:
            ChatMessage =
            {
              role:
                "system",

              content:
                buildSystemPrompt({
                  verifiedContext,

                  operationalContext,

                  workforceContext,

                  externalNewsContext,

                  customSystem,

                  latestUserMessage,
                }),
            };

          const safetyGuard:
            ChatMessage |
            null =
            needsRecordSafeSupport(
              latestUserMessage,
            )
              ? {
                  role:
                    "system",

                  content:
                    "No verified order, payment, courier, delivery or tracking record is available in the supplied context. Do not promise investigation, follow-up, delivery date or future action as if it already exists. State which order reference or payment evidence is required.",
                }
              : null;

          const unbudgetedProviderMessages:
            ChatMessage[] =
            [
              systemPreamble,

              ...(
                safetyGuard
                  ? [
                      safetyGuard,
                    ]
                  : []
              ),

              ...selectRecentHistory(
                messages,
              ),
            ];

          const providerMessages =
            budgetProviderMessages(
              unbudgetedProviderMessages,
            );

          const estimatedInputTokens =
            estimateMessagesTokens(
              providerMessages,
            );

          const totalInputCharacters =
            providerMessages.reduce(
              (
                total,
                message,
              ) =>
                total +
                message.content.length,

              0,
            );

          console.info(
            "Cossa AI request context prepared.",
            {
              requestId,

              requestedProvider,

              contextNeeds,

              knowledgeDocumentsSelected:
                selectedKnowledge.length,

              providerMessages:
                providerMessages.length,

              totalInputCharacters,

              estimatedInputTokens,
            },
          );

          /* ---------------------------------------------------------------- */
          /* PROVIDER GATEWAY                                                 */
          /* ---------------------------------------------------------------- */

          let gatewayResult:
            Awaited<
              ReturnType<
                typeof executeProviderGateway
              >
            >;

          try {
            gatewayResult =
              await executeProviderGateway({
                requestedProvider,

                providerMessages,

                environment,

                signal:
                  request.signal,
              });
          } catch (
            error
          ) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return new Response(
                "Cossa AI request was cancelled.",
                {
                  status:
                    499,

                  headers: {
                    "X-Cossa-AI-Request-ID":
                      requestId,
                  },
                },
              );
            }

            console.error(
              "Cossa AI provider gateway failed unexpectedly.",
              {
                requestId,

                error,
              },
            );

            return new Response(
              "Cossa AI provider routing failed unexpectedly. No external Cossa action was completed.",
              {
                status:
                  503,

                headers: {
                  "X-Cossa-AI-Request-ID":
                    requestId,

                  "X-Cossa-AI-Provider":
                    "none",
                },
              },
            );
          }

          const {
            result,
            attempts,
          } =
            gatewayResult;

          if (
            !result
          ) {
            console.error(
              "All available Cossa AI providers failed.",
              {
                requestId,

                requestedProvider,

                providerRoute:
                  providerAttemptRoute(
                    attempts,
                  ),

                totalInputCharacters,

                estimatedInputTokens,

                attempts:
                  attempts.map(
                    (
                      attempt,
                    ) => ({
                      provider:
                        attempt.provider,

                      model:
                        attempt.model,

                      status:
                        attempt.status,

                      httpStatus:
                        attempt.httpStatus,
                    }),
                  ),
              },
            );

            return createGatewayFailureResponse({
              attempts,

              requestId,

              requestedProvider,
            });
          }

          const fallbackUsed =
            attempts.length >
              1 ||
            (
              requestedProvider !==
                "auto" &&
              requestedProvider !==
                result.provider
            );

          const providerRoute =
            providerAttemptRoute(
              attempts,
            );

          console.info(
            "Cossa AI provider execution selected.",
            {
              requestId,

              requestedProvider,

              actualProvider:
                result.provider,

              model:
                result.model,

              fallbackUsed,

              providerRoute,

              totalInputCharacters,

              estimatedInputTokens,

              attempts:
                attempts.map(
                  (
                    attempt,
                  ) => ({
                    provider:
                      attempt.provider,

                    model:
                      attempt.model,

                    status:
                      attempt.status,

                    httpStatus:
                      attempt.httpStatus,
                  }),
                ),
            },
          );

          /* ---------------------------------------------------------------- */
          /* SUCCESS                                                          */
          /* ---------------------------------------------------------------- */

          return new Response(
            result.stream,
            {
              headers:
                chatResponseHeaders({
                  requestedProvider,

                  actualProvider:
                    result.provider,

                  model:
                    result.model,

                  attempts,

                  requestId,

                  estimatedInputTokens,
                }),
            },
          );
        },
      },
    },
  });
