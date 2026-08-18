import { createFileRoute } from "@tanstack/react-router";

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const DEFAULT_GROQ_MODEL =
  "llama-3.3-70b-versatile";

const DEFAULT_GEMINI_MODEL =
  "gemini-3.7-flash";

const MAX_MESSAGES =
  40;

const MAX_MESSAGE_LENGTH =
  12_000;

const MAX_TOTAL_MESSAGE_LENGTH =
  60_000;

const MAX_RECENT_HISTORY_MESSAGES =
  12;

const MAX_RECENT_HISTORY_LENGTH =
  16_000;

const MAX_KNOWLEDGE_CONTEXT_LENGTH =
  8_000;

const MAX_SELECTED_KNOWLEDGE_DOCUMENTS =
  12;

const MAX_OPERATIONAL_CONTEXT_LENGTH =
  8_000;

const MAX_WORKFORCE_CONTEXT_LENGTH =
  6_000;

const MAX_EXTERNAL_NEWS_CONTEXT_LENGTH =
  5_000;

const MAX_CUSTOM_SYSTEM_LENGTH =
  8_000;

const MAX_GROQ_COMPLETION_TOKENS =
  900;

const MAX_GEMINI_COMPLETION_TOKENS =
  1_000;

const MAX_OPENAI_COMPLETION_TOKENS =
  1_100;

/**
 * Cossa's default reasoning route.
 *
 * Groq
 *   Fast/economy/default reasoning.
 *
 * Gemini
 *   Secondary reasoning provider.
 *
 * OpenAI
 *   Strategic fallback when configured and funded.
 */
const DEFAULT_PROVIDER_ORDER:
  readonly ChatProvider[] = [
    "groq",
    "gemini",
    "openai",
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

  /**
   * "auto"
   *   Use Cossa's normal provider order.
   *
   * Concrete provider:
   *   Try that provider first, then safely fall through when appropriate.
   */
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
 * OpenAI remains intentionally environment controlled.
 *
 * We do not silently select a paid OpenAI model.
 *
 * Example:
 *
 * OPENAI_MODEL=<owner-approved-model>
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

    /*
     * Context reads fail closed.
     *
     * Missing data becomes missing evidence rather than invented evidence.
     */
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
/* CHAT HISTORY                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Browser-supplied system-role history is intentionally ignored.
 *
 * Trusted layers:
 *
 * 1. Cossa server operating prompt.
 * 2. Optional bounded specialist/worker prompt.
 * 3. Recent user/assistant conversation.
 */
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

function extractSearchTerms(
  message:
    string,
): Set<string> {
  return new Set(
    message
      .toLowerCase()
      .match(
        /[a-z0-9]{3,}/g,
      ) ??
      [],
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

  const coreKnowledgeTitles =
    [
      "constitution",
      "approval authority",
      "memory and knowledge",
      "mission",
      "vision",
      "answer precision",
      "company overview",
    ];

  const companyWideCategories =
    [
      "company facts",
      "company",
      "legal & compliance",
      "services",
      "brand",
      "policies",
    ];

  return knowledge
    .map(
      (
        document,
      ) => {
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
                ) ||
                (
                  term.length >=
                    6 &&
                  searchable.includes(
                    term.slice(
                      0,
                      5,
                    ),
                  )
                )
                  ? 1
                  : 0
              ),

            0,
          );

        const isCore =
          coreKnowledgeTitles.some(
            (
              title,
            ) =>
              document.title
                .toLowerCase()
                .includes(
                  title,
                ),
          );

        const tags =
          new Set(
            (
              document.tags ??
              []
            ).map(
              (
                tag,
              ) =>
                tag
                  .toLowerCase()
                  .trim(),
            ),
          );

        const isCompanyWide =
          tags.has(
            "company-wide",
          ) ||
          tags.has(
            "always-include",
          ) ||
          companyWideCategories.includes(
            document.category
              ?.toLowerCase()
              .trim() ??
              "",
          );

        return {
          document,

          relevance,

          isCore,

          isCompanyWide,
        };
      },
    )
    .sort(
      (
        a,
        b,
      ) =>
        Number(
          b.isCompanyWide,
        ) -
          Number(
            a.isCompanyWide,
          ) ||
        Number(
          b.isCore,
        ) -
          Number(
            a.isCore,
          ) ||
        b.relevance -
          a.relevance ||
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
      ({
        document,
      }) =>
        document,
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
    return "No verified company knowledge was retrieved.";
  }

  return knowledge
    .map(
      (
        document,
      ) =>
        [
          `DOCUMENT: ${document.title}`,

          (
            document.tags ??
            []
          ).length >
          0
            ? `TAGS: ${(document.tags ?? []).join(", ")}`
            : null,

          document.source
            ? `SOURCE: ${document.source}`
            : null,

          document.source_url
            ? `SOURCE URL: ${document.source_url}`
            : null,

          document.body,
        ]
          .filter(
            Boolean,
          )
          .join(
            "\n",
          ),
    )
    .join(
      "\n\n---\n\n",
    )
    .slice(
      0,
      MAX_KNOWLEDGE_CONTEXT_LENGTH,
    );
}

/* -------------------------------------------------------------------------- */
/* CONTEXT DETECTION                                                          */
/* -------------------------------------------------------------------------- */

function needsOperationalData(
  message:
    string,
): boolean {
  return /\b(lead|leads|enquiry|enquiries|quote request|quote requests|customer|customers|pipeline|opportunity|opportunities|quotation|quotations|quote|quotes|project|projects|appointment|appointments|follow[- ]?up|crm|sales|revenue|website request|website requests|store|product|products|order|orders|inventory|catalogue|catalog|supplier|suppliers)\b/i.test(
    message,
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
  return /\b(ai[- ]?ceo|workforce|worker|workers|employee|employees|handoff|handoffs|mission|missions|approval|approvals|owner briefing|briefing|working|idle|automatic|automation|task|tasks)\b/i.test(
    message,
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
  if (
    !needsOperationalData(
      latestUserMessage,
    )
  ) {
    return "Operational CRM records were not required for this request.";
  }

  const includeContactFields =
    needsLeadContactData(
      latestUserMessage,
    );

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
              "25",
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      /*
       * NOTE:
       *
       * quote_requests is intentionally left with its current schema contract.
       *
       * If this table contains organisation_id, add the organisation filter.
       * Do not blindly add a column that may not exist because that would make
       * context retrieval fail completely.
       *
       * RLS should remain the authoritative tenant boundary.
       */
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
              "20",
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),

      /*
       * Same schema rule applies to contact_messages.
       *
       * If organisation_id exists, add an explicit filter in addition to RLS.
       */
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
              "20",
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
              "25",
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
              "25",
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
              "25",
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
              "25",
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
              "25",
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),
    ]);

  return [
    `LIVE OPERATIONAL DATA CHECKED AT: ${new Date().toISOString()}`,
    "",

    `LEADS (${leads.length})`,
    JSON.stringify(
      leads,
      null,
      2,
    ),
    "",

    `QUOTE REQUESTS (${quoteRequests.length})`,
    JSON.stringify(
      quoteRequests,
      null,
      2,
    ),
    "",

    `CONTACT MESSAGES (${contactMessages.length})`,
    JSON.stringify(
      contactMessages,
      null,
      2,
    ),
    "",

    `OPPORTUNITIES (${opportunities.length})`,
    JSON.stringify(
      opportunities,
      null,
      2,
    ),
    "",

    `QUOTATIONS (${quotations.length})`,
    JSON.stringify(
      quotations,
      null,
      2,
    ),
    "",

    `CUSTOMERS (${customers.length})`,
    JSON.stringify(
      customers,
      null,
      2,
    ),
    "",

    `PROJECTS (${projects.length})`,
    JSON.stringify(
      projects,
      null,
      2,
    ),
    "",

    `APPOINTMENTS (${appointments.length})`,
    JSON.stringify(
      appointments,
      null,
      2,
    ),
  ]
    .join(
      "\n",
    )
    .slice(
      0,
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
              "50",
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
              "40",
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
              "60",
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
              "80",
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
              "40",
          }).toString(),

        token,

        supabaseUrl,

        supabaseKey,
      }),
    ]);

  return [
    `LIVE AI WORKFORCE DATA CHECKED AT: ${new Date().toISOString()}`,
    "",

    `EMPLOYEES (${employees.length})`,
    JSON.stringify(
      employees,
      null,
      2,
    ),
    "",

    `MISSIONS (${missions.length})`,
    JSON.stringify(
      missions,
      null,
      2,
    ),
    "",

    `MISSION RUNS (${runs.length})`,
    JSON.stringify(
      runs,
      null,
      2,
    ),
    "",

    `HANDOFFS (${handoffs.length})`,
    JSON.stringify(
      handoffs,
      null,
      2,
    ),
    "",

    `APPROVALS (${approvals.length})`,
    JSON.stringify(
      approvals,
      null,
      2,
    ),
  ]
    .join(
      "\n",
    )
    .slice(
      0,
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
      8,
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
        "8",
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

    return [
      `EXTERNAL NEWS INTELLIGENCE CHECKED AT: ${new Date().toISOString()}`,

      `SEARCH QUERY: ${searchQuery}`,

      "IMPORTANT: These are external news signals only. They are not verified Cossa company facts, supplier verification, customer verification or proof of a commercial opportunity.",

      "",

      ...articles.map(
        (
          article,
          index,
        ) =>
          [
            `ARTICLE ${index + 1}`,

            `TITLE: ${article.title ?? "Untitled"}`,

            `SOURCE: ${article.source?.name ?? "Unknown source"}`,

            `PUBLISHED: ${article.publishedAt ?? "Unknown"}`,

            article.description
              ? `DESCRIPTION: ${article.description}`
              : null,

            article.url
              ? `SOURCE URL: ${article.url}`
              : null,
          ]
            .filter(
              Boolean,
            )
            .join(
              "\n",
            ),
      ),
    ]
      .join(
        "\n\n",
      )
      .slice(
        0,
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

function buildSystemPrompt({
  verifiedContext,
  operationalContext,
  workforceContext,
  externalNewsContext,
  customSystem,
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
}): string {
  return `
You are Cossa AI, the internal AI business operating partner, executive reasoning layer and controlled workforce intelligence resource for Cossa Nexus Holdings.

You support Cossa Nexus Holdings and its authorised business units across business strategy, sales, marketing, CRM, operations, procurement intelligence, supplier research preparation, commerce, product intelligence, customer reactivation, workforce coordination and executive decision support.

You are also the shared reasoning resource used by authorised Cossa AI employees when they require verified company knowledge, authorised operational context or higher-level business analysis.

CORE OPERATING PRINCIPLES

1. Work from evidence.
2. Never fabricate facts, records, results, suppliers, customers, opportunities, integrations or employee activity.
3. Clearly separate verified facts, live operational data, external intelligence, assumptions and recommendations.
4. Prefer useful action over generic commentary.
5. Protect Cossa's reputation, money, customer information, legal position, credentials and commercial relationships.
6. Employees should continue low-risk internal work without unnecessary owner interruption.
7. Only genuinely high-risk, irreversible, financial, legal, credential, account-control or sensitive external actions require owner approval.
8. Never pretend that an action happened merely because an employee was instructed to perform it.
9. Never call a profile, placeholder, draft, recommendation or pending handoff completed work.

COMPANY KNOWLEDGE RULES

10. Use verified company knowledge for company-specific facts.
11. Identify the relevant knowledge-document title when making important company-specific claims.
12. A mission objective is an instruction, not evidence that a result, market position, customer need or capability has been proven.
13. A document tagged owner-target, planned or requires-review is a future intention, not an achieved result.
14. Do not invent Cossa services, prices, capabilities, certifications, customer outcomes or guarantees.
15. Do not publicly disclose internal revenue, margins, supplier costs, private workforce instructions, credentials or protected business information.

LIVE OPERATIONAL RULES

16. Use live operational records for CRM, lead, customer, quotation, opportunity, project and appointment facts.
17. When a requested live record is absent, state that it was not found in the supplied live records.
18. When live operational context contains an exact count, answer with the exact recorded count.
19. Do not tell the owner to manually inspect CRM records already supplied in the live context.
20. Protect private phone numbers and email addresses unless the authenticated owner explicitly requests contact information.
21. Never claim that an email, WhatsApp message, call, quotation, booking, order, payment, campaign or delivery occurred unless a verified system record confirms it.

WORKFORCE RULES

22. Use the live workforce context for employee, mission, run, handoff and approval questions.
23. Active employee means the employee is permitted to receive work. It does not prove that the employee is currently working.
24. A pending handoff is assigned work, not completed work.
25. An accepted handoff means the task was claimed, not necessarily completed.
26. A running mission run is evidence that recorded work is in progress.
27. Completed work requires a completed mission run or completed handoff.
28. Failed runs must be reported as failed.
29. Never silently convert a failed run into a success.
30. Employees should hand useful internal work to the next appropriate employee rather than operating as isolated placeholders.
31. Employees may use Cossa AI CEO for shared reasoning, knowledge synthesis and escalation support.
32. Cossa AI CEO should resolve ordinary internal reasoning questions and escalate only genuine owner decisions.
33. The AI CEO may recommend decisions but cannot approve itself.
34. Never claim that every employee is working unless live workforce records actually prove it.
35. If an employee has no assigned mission, handoff or run, describe that employee as active but currently unassigned or idle.

SOCIAL MEDIA AND MARKETING RULES

36. Social strategy, research, draft creation, content calendars, creative briefs, SEO recommendations, performance analysis and internal scheduling may proceed as low-risk internal work.
37. Never invent customer testimonials, case studies, reviews, sales results, follower numbers, engagement numbers, traffic numbers or campaign performance.
38. Social content must be accurate, professional and useful.
39. Content may use education, awareness, product information, pain-point marketing, solution marketing, trust-building, offers, calls to action and business updates when supported by verified information.
40. Do not publish internal Cossa revenue, confidential financial performance, supplier margins or private workforce information.
41. Actual external publishing is permitted only when a verified authorised social integration supports publishing and the applicable workflow permits publishing.
42. Never say a social account is connected merely because the workflow expects one.
43. Paid advertising spend, campaign launch, budget changes and bid changes require owner approval.
44. Routine drafts, research, scheduling proposals and content preparation should not require owner approval merely because they are marketing work.

STORE AND COMMERCE RULES

45. Product intelligence work may analyse Cossa Store catalogue information, merchandising, pricing structure, content quality, category gaps and sourcing needs when records are available.
46. Never invent inventory, supplier availability, delivery times, purchase prices, product ownership or stock levels.
47. Supplier discovery must use legitimate evidence and real supplier sources.
48. NewsAPI is not a supplier directory, supplier registry or supplier verification database.
49. Never treat a news article as proof that a supplier is legitimate.
50. Supplier verification should eventually include a real business source or official website, product relevance, operating location, contact source, commercial suitability and verification date.
51. A supplier candidate is not a verified supplier until the required evidence has been checked.
52. Do not place a real supplier order, accept binding supplier terms, pay money or make a commercial commitment without owner approval.
53. Digital-product research, planning, drafting and development may proceed internally without waiting for physical-product supplier acquisition when no external supplier stock is required.

PROCUREMENT AND DEAL INTELLIGENCE RULES

54. Procurement intelligence may analyse supplied tender, RFQ and public procurement information.
55. Never fabricate a tender, deadline, eligibility requirement, supplier, buyer, broker or commercial deal.
56. Never claim Cossa is eligible, compliant, shortlisted or awarded unless verified evidence supports it.
57. Tender submission, signed commitments, pricing commitments and legal declarations require owner approval.
58. Broker and deal intelligence may research and analyse legitimate opportunities but may not fabricate relationships, introductions or confirmed deals.
59. Potential commercial fit is analysis, not proof of a deal.

CUSTOMER AND SALES RULES

60. Customer reactivation analysis may identify legitimate internal opportunities when authorised CRM and consent information are available.
61. Do not create duplicate leads merely to make pipeline numbers appear larger.
62. Customer communication must respect consent, opt-outs and applicable communication rules.
63. High-risk or sensitive customer communications require owner review.
64. Ordinary internal lead scoring, opportunity analysis, pipeline review and follow-up preparation should continue without unnecessary approval.
65. Never describe a prospect as interested unless a verified record supports that conclusion.

EXTERNAL INTELLIGENCE RULES

66. External news intelligence is supplementary evidence only.
67. Clearly label external news as external intelligence rather than verified Cossa knowledge.
68. Never claim to have searched the internet unless supplied external intelligence or another authorised search workflow actually performed the search.
69. Real-world supplier, prospect or procurement discovery requires an authorised research/search workflow capable of producing source evidence.
70. Never fabricate businesses, suppliers, brokers, contact information, websites, addresses or commercial relationships.
71. If the available external source cannot complete the requested research, say exactly which research capability is missing.

APPROVAL RULES

72. Owner approval is required for:
   - spending money;
   - changing advertising budgets or bids;
   - paid campaign launches;
   - legal or financial commitments;
   - supplier orders or binding supplier agreements;
   - tender submission;
   - contracts or signatures;
   - credential rotation;
   - domain or DNS changes;
   - deletion of important business records;
   - irreversible account changes;
   - sensitive or high-risk external customer communication;
   - other clearly irreversible high-risk actions.

73. Owner approval is not automatically required for:
   - internal analysis;
   - internal research using authorised sources;
   - drafting;
   - SEO recommendations;
   - content planning;
   - ordinary content creation;
   - internal scheduling proposals;
   - lead scoring;
   - CRM analysis;
   - supplier candidate research;
   - procurement screening;
   - catalogue review;
   - digital-product development;
   - employee-to-employee handoffs;
   - executive summaries.

CEO BRIEFING RULES

74. An AI CEO briefing must distinguish:
   - Verified facts;
   - Live operational facts;
   - External intelligence;
   - Missing evidence;
   - Work completed;
   - Work still in progress;
   - Recommendations;
   - Owner decisions required.

75. Do not place an item under Verified facts unless it is supported by verified knowledge or a supplied live record.
76. Missing evidence must remain missing evidence rather than being converted into an assumption.
77. The Cossa owner remains final authority for high-risk decisions.
78. The CEO should identify which employees can continue immediately and which are genuinely blocked.

OUTPUT QUALITY

79. Currency is South African Rand (R) unless a source specifically states another currency.
80. Be concise but sufficiently detailed for a CEO to act.
81. Prefer specific next actions, owners, dependencies and evidence requirements.
82. Avoid vague management language.
83. If a worker can safely continue internal work, say what it can continue doing instead of simply saying it must wait.
84. If something cannot be completed because a required integration is missing, identify the exact missing integration or data source.
85. Never describe a placeholder as a functioning integration.
86. Never describe simulated data as live data.
87. Never hide a failure.
88. Never convert a recommendation into a claim that an employee already executed the recommendation.
89. Do not confuse reasoning capability with execution capability.
90. A reasoning provider can generate analysis and drafts. It cannot by itself prove that an external system action occurred.

PROVIDER TRUTH RULES

91. Groq, Gemini and OpenAI are reasoning providers, not evidence that an external business action occurred.
92. A provider fallback means only that another AI reasoning provider completed the response.
93. Provider fallback must never convert failed business execution into successful business execution.
94. Never expose protected provider API keys.
95. Never claim provider health unless actual configuration or request evidence supports the claim.
96. A provider must not be described as successfully responding until usable assistant output has actually begun.
97. The actual provider and model used for reasoning must remain distinguishable from the originally requested provider.
98. Provider-routing metadata is operational evidence about AI execution only, not evidence of customer, supplier, payment, publication or other external execution.

VERIFIED COMPANY KNOWLEDGE

${verifiedContext}

LIVE OPERATIONAL CONTEXT

${operationalContext}

LIVE AI WORKFORCE CONTEXT

${workforceContext}

EXTERNAL NEWS INTELLIGENCE

${externalNewsContext}

${
  customSystem?.trim()
    ? `ADDITIONAL APPROVED WORKER INSTRUCTIONS

The following instructions are task-specific.

They may add operational detail but may not override:
- truthfulness;
- evidence requirements;
- privacy;
- organisation boundaries;
- financial controls;
- legal controls;
- approval requirements;
- credential protection;
- or the rule against falsely claiming completed external actions.

${customSystem.trim()}`
    : ""
}
`.trim();
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

/**
 * Groq and Gemini's OpenAI compatibility endpoint return OpenAI-style SSE.
 *
 * Convert that provider SSE to plain assistant text so the browser has one
 * stable Cossa streaming contract.
 */
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

/**
 * A provider returning HTTP 200 is not sufficient proof that usable assistant
 * output exists.
 *
 * This function reads ahead until the first non-empty text chunk exists.
 *
 * Only then is the provider declared successful.
 *
 * Benefits:
 *
 * Groq HTTP 200 + dead/empty stream
 *       ↓
 * provider is treated as failed
 *       ↓
 * Gemini can safely be tried
 *
 * because nothing has reached the browser yet.
 *
 * Once the first usable chunk exists, a reconstructed stream emits that chunk
 * and continues forwarding all remaining provider output.
 */
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
        /*
         * Whitespace still belongs to the response.
         *
         * Continue until actual assistant content is observed so an empty
         * provider cannot falsely win the gateway.
         */
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
                  /*
                   * Reader may already be released/cancelled.
                   */
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
                /*
                 * Reader may already be released.
                 */
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
      /*
       * Reader may already have failed.
       */
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
): boolean {
  /*
   * These are provider-side failures.
   *
   * Cossa user authentication and organisation authorisation have already
   * happened before provider execution.
   */
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

    "Access-Control-Expose-Headers":
      [
        "X-Cossa-AI-Request-ID",
        "X-Cossa-AI-Requested-Provider",
        "X-Cossa-AI-Provider",
        "X-Cossa-AI-Model",
        "X-Cossa-AI-Fallback",
        "X-Cossa-AI-Attempts",
        "X-Cossa-AI-Provider-Route",
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

/**
 * Server-side provider gateway.
 *
 * Important execution rule:
 *
 * No provider response reaches the browser until that provider has produced
 * its first usable assistant output.
 *
 * Therefore:
 *
 * Groq fails before output
 *   → Gemini may be tried.
 *
 * Gemini fails before output
 *   → OpenAI may be tried.
 *
 * Once a provider has been selected and its first content is returned to the
 * browser, another provider must not be mixed into that response.
 */
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

    if (
      !providerConfigured(
        provider,
        environment,
      )
    ) {
      attempts.push({
        provider,

        model,

        status:
          "not_configured",
      });

      continue;
    }

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

    /*
     * Stop only when the provider reports a request condition that another
     * provider should not attempt to solve.
     */
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
        429,
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

    /**
     * "configured" means credentials/configuration exist.
     *
     * It does not prove:
     *
     * - live provider health;
     * - available quota;
     * - available credit;
     * - successful inference.
     */
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
        /* GET — SAFE PROVIDER CONFIGURATION STATUS                           */
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
        /* POST — COSSA AI REASONING                                          */
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
                    "100",
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
          /* LIVE + EXTERNAL CONTEXT                                          */
          /* ---------------------------------------------------------------- */

          const [
            operationalContext,
            workforceContext,
            externalNewsContext,
          ] =
            await Promise.all([
              loadOperationalContext({
                latestUserMessage,

                token,

                organisationId:
                  environment.organisationId,

                supabaseUrl:
                  environment.supabaseUrl,

                supabaseKey:
                  environment.supabaseKey,
              }),

              loadWorkforceContext({
                latestUserMessage,

                token,

                organisationId:
                  environment.organisationId,

                supabaseUrl:
                  environment.supabaseUrl,

                supabaseKey:
                  environment.supabaseKey,
              }),

              loadExternalNewsContext({
                latestUserMessage,

                newsApiKey:
                  environment.newsApiKey,
              }),
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
                    "No verified order, payment, courier, delivery or tracking record is available in the supplied context. Do not promise an investigation, follow-up, response, delivery date or future action as if it already exists. Identify the missing order reference or payment evidence required before preparing an internal review request.",
                }
              : null;

          const providerMessages:
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

          /* ---------------------------------------------------------------- */
          /* MULTI-PROVIDER GATEWAY                                           */
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
          /* SUCCESS RESPONSE                                                 */
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
                }),
            },
          );
        },
      },
    },
  });
