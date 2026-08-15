import { createFileRoute } from "@tanstack/react-router";

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const DEFAULT_GROQ_MODEL =
  "llama-3.3-70b-versatile";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12_000;
const MAX_TOTAL_MESSAGE_LENGTH = 60_000;

const MAX_RECENT_HISTORY_MESSAGES = 12;
const MAX_RECENT_HISTORY_LENGTH = 16_000;

const MAX_KNOWLEDGE_CONTEXT_LENGTH = 8_000;
const MAX_SELECTED_KNOWLEDGE_DOCUMENTS = 12;

const MAX_OPERATIONAL_CONTEXT_LENGTH = 8_000;
const MAX_WORKFORCE_CONTEXT_LENGTH = 6_000;
const MAX_EXTERNAL_NEWS_CONTEXT_LENGTH = 5_000;

const MAX_CUSTOM_SYSTEM_LENGTH = 8_000;

const MAX_GROQ_COMPLETION_TOKENS = 900;
const MAX_OPENAI_COMPLETION_TOKENS = 1_100;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ChatRole =
  | "system"
  | "user"
  | "assistant";

type ChatProvider =
  | "groq"
  | "openai";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatPayload {
  messages?: ChatMessage[];
  system?: string;
  provider?: ChatProvider;
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
  };
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

function resolveOpenAiModel(): string | null {
  const configured =
    process.env.OPENAI_MODEL?.trim();

  return configured || null;
}

function getEnvironment() {
  const groqApiKey =
    process.env.GROQ_API_KEY?.trim();

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
    (!groqApiKey &&
      !openAiApiKey) ||
    !supabaseUrl ||
    !supabaseKey
  ) {
    return null;
  }

  return {
    groqApiKey,
    openAiApiKey,
    newsApiKey,
    supabaseUrl:
      trimTrailingSlash(
        supabaseUrl,
      ),
    supabaseKey,
    organisationId,
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
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<SupabaseUser | null> {
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

  if (!response.ok) {
    return null;
  }

  return (
    await response.json()
  ) as SupabaseUser;
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
  const response =
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

  if (!response.ok) {
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

  return (
    await response.json()
  ) as T[];
}

async function verifyOrganisationMembership({
  token,
  userId,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  token: string;
  userId: string;
  organisationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<boolean> {
  const rows =
    await restSelect<{
      user_id: string;
      status: string;
      role: string;
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

  return rows.length === 1;
}

/* -------------------------------------------------------------------------- */
/* PAYLOAD VALIDATION                                                         */
/* -------------------------------------------------------------------------- */

function validateMessages(
  value: unknown,
):
  | {
      valid: true;
      messages: ChatMessage[];
    }
  | {
      valid: false;
      error: string;
    } {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    return {
      valid: false,
      error:
        "At least one chat message is required.",
    };
  }

  if (
    value.length >
    MAX_MESSAGES
  ) {
    return {
      valid: false,

      error:
        `A maximum of ${MAX_MESSAGES} messages is allowed per request.`,
    };
  }

  const messages:
    ChatMessage[] = [];

  let totalLength = 0;

  for (
    const item of value
  ) {
    if (
      typeof item !==
        "object" ||
      item === null ||
      !(
        "role" in item
      ) ||
      !(
        "content" in
        item
      )
    ) {
      return {
        valid: false,

        error:
          "Invalid chat message format.",
      };
    }

    const role =
      item.role;

    const content =
      typeof item.content ===
      "string"
        ? item.content.trim()
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
        valid: false,

        error:
          "Unsupported chat message role.",
      };
    }

    if (!content) {
      return {
        valid: false,

        error:
          "Chat messages cannot be empty.",
      };
    }

    if (
      content.length >
      MAX_MESSAGE_LENGTH
    ) {
      return {
        valid: false,

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
        valid: false,

        error:
          "The conversation is too large. Start a new chat.",
      };
    }

    messages.push({
      role:
        role as ChatRole,

      content,
    });
  }

  return {
    valid: true,
    messages,
  };
}

function cleanCustomSystem(
  value: unknown,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(
    0,
    MAX_CUSTOM_SYSTEM_LENGTH,
  );
}

/* -------------------------------------------------------------------------- */
/* CHAT HISTORY                                                               */
/* -------------------------------------------------------------------------- */

function selectRecentHistory(
  messages: ChatMessage[],
): ChatMessage[] {
  const recent:
    ChatMessage[] = [];

  let length = 0;

  for (
    const message of [
      ...messages,
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
      remaining <= 0
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
      ...message,
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
  message: string,
): Set<string> {
  return new Set(
    message
      .toLowerCase()
      .match(
        /[a-z0-9]{3,}/g,
      ) ?? [],
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
            document.tags.map(
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
          b.document
            .updated_at,
        ) -
          Date.parse(
            a.document
              .updated_at,
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

          document.tags.length >
          0
            ? `TAGS: ${document.tags.join(", ")}`
            : null,

          document.source
            ? `SOURCE: ${document.source}`
            : null,

          document.source_url
            ? `SOURCE URL: ${document.source_url}`
            : null,

          document.body,
        ]
          .filter(Boolean)
          .join("\n"),
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
  message: string,
): boolean {
  return /\b(lead|leads|enquiry|enquiries|quote request|quote requests|customer|customers|pipeline|opportunity|opportunities|quotation|quotations|quote|quotes|project|projects|appointment|appointments|follow[- ]?up|crm|sales|revenue|website request|website requests|store|product|products|order|orders|inventory|catalogue|catalog|supplier|suppliers)\b/i.test(
    message,
  );
}

function needsLeadContactData(
  message: string,
): boolean {
  return /\b(phone|email|contact|call|whatsapp|outreach|follow[- ]?up|lead details|customer details|contact details)\b/i.test(
    message,
  );
}

function needsWorkforceData(
  message: string,
): boolean {
  return /\b(ai[- ]?ceo|workforce|worker|workers|employee|employees|handoff|handoffs|mission|missions|approval|approvals|owner briefing|briefing|working|idle|automatic|automation|task|tasks)\b/i.test(
    message,
  );
}

function needsExternalNewsData(
  message: string,
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
    .join("\n")
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
    .join("\n")
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
  message: string,
): string | null {
  const terms =
    message
      .toLowerCase()
      .match(
        /[a-z0-9]{3,}/g,
      ) ?? [];

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

  if (!newsApiKey) {
    return "External news intelligence was requested, but NEWS_API_KEY is not configured in the protected server environment.";
  }

  const searchQuery =
    createNewsSearchQuery(
      latestUserMessage,
    );

  if (!searchQuery) {
    return "External news intelligence was requested, but a useful search query could not be derived.";
  }

  const params =
    new URLSearchParams({
      q: searchQuery,
      language: "en",
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

    if (!response.ok) {
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
      "IMPORTANT: These are external news signals, not verified Cossa company facts, supplier verification or proof of a commercial opportunity.",
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
              ? `URL: ${article.url}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
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

  customSystem?: string;
}): string {
  return `
You are Cossa AI, the internal AI business operating partner and reasoning layer for Cossa Nexus Holdings.

You support Cossa Nexus Holdings and its authorised business units, including business strategy, sales, marketing, CRM, operations, procurement intelligence, supplier research preparation, commerce, product intelligence, customer reactivation, workforce coordination and executive decision support.

You are also the shared reasoning resource used by authorised Cossa AI employees when they require company knowledge, operational context or higher-level analysis.

CORE OPERATING PRINCIPLES

1. Work from evidence.
2. Never fabricate facts, records, results, suppliers, customers, opportunities or employee activity.
3. Clearly separate verified facts, live operational data, external intelligence, assumptions and recommendations.
4. Prefer useful action over generic commentary.
5. Protect Cossa's reputation, money, customer information, legal position and commercial relationships.
6. Employees should continue internal low-risk work without unnecessary owner interruption.
7. Only genuinely high-risk, irreversible, financial, legal, credential, account-control or sensitive external actions require owner approval.
8. Never pretend that an action happened merely because an employee was instructed to do it.

COMPANY KNOWLEDGE RULES

9. Use verified company knowledge for company-specific facts.
10. Cite or identify the relevant knowledge-document title when making important company-specific claims.
11. A mission objective is an instruction, not evidence that a result, market position, customer need or capability has been proven.
12. A document tagged owner-target, planned or requires-review is a future intention, not an achieved result.
13. Do not invent Cossa services, prices, capabilities, certifications, customer outcomes or guarantees.
14. Do not publicly disclose internal revenue, margins, supplier costs, private workforce instructions, credentials or protected business information.

LIVE OPERATIONAL RULES

15. Use live operational records for CRM, lead, customer, quotation, opportunity, project and appointment facts.
16. When a requested live record is absent, state that it was not found.
17. When live operational context contains an exact count, answer with the exact recorded count.
18. Do not tell the owner to manually inspect CRM records already supplied in the live context.
19. Protect private phone numbers and email addresses unless the authenticated owner explicitly requests contact information.
20. Never claim that an email, WhatsApp message, call, quotation, booking, order or campaign was sent unless a verified system record confirms it.

WORKFORCE RULES

21. Use the live workforce context for employee, mission, run, handoff and approval questions.
22. "Active employee" means the employee is permitted to receive work. It does not prove that the employee is currently working.
23. A pending handoff is assigned work, not completed work.
24. A running mission or run proves work is in progress only while the relevant run remains recorded as running.
25. Completed work requires a completed mission run or completed handoff.
26. Failed runs must be reported as failed. Never silently describe them as successful.
27. Employees should hand useful internal work to the next appropriate employee rather than operating as isolated placeholders.
28. Cossa AI CEO should synthesize worker outputs, resolve ordinary internal reasoning questions and escalate only genuine owner decisions.
29. The AI CEO may recommend decisions but cannot approve itself.
30. Never claim that every employee is working unless live workforce records actually prove it.

SOCIAL MEDIA AND MARKETING RULES

31. Social strategy, research, draft creation, content calendars, creative briefs, SEO recommendations, performance analysis and internal scheduling may proceed as low-risk internal work.
32. Never invent customer testimonials, case studies, reviews, sales results, follower numbers, engagement numbers or campaign performance.
33. Social content must be accurate, professional and useful. Content may use education, awareness, product information, pain-point marketing, solution marketing, trust-building, offers, calls to action and business updates when supported by verified information.
34. Do not publish internal Cossa revenue, confidential financial performance or private workforce information.
35. Actual external publishing is allowed only when a verified authorised social integration supports publishing and the applicable workflow explicitly permits that action.
36. Paid advertising spend, campaign launch, budget changes and bid changes require owner approval.
37. Routine content should not require owner approval merely because it is a draft or internal schedule.

STORE AND COMMERCE RULES

38. Product intelligence work may analyse Cossa Store catalogue information, gaps, merchandising, pricing structure, content quality and sourcing needs when records are available.
39. Never invent inventory, supplier availability, delivery times, purchase prices or stock ownership.
40. Supplier discovery must use legitimate evidence and real supplier sources.
41. NewsAPI is not a supplier database and must never be treated as supplier verification.
42. A supplier should not be described as verified merely because its name appears in external content.
43. Supplier verification should eventually include real website or business-source evidence, product relevance, operating location, contact source, commercial suitability and verification date.
44. Do not place a real supplier order, accept binding supplier terms, pay money or make a commercial commitment without owner approval.
45. Digital-product planning and creation can proceed internally without waiting for supplier acquisition when the product itself does not require external supplier stock.

PROCUREMENT AND DEAL INTELLIGENCE RULES

46. Procurement intelligence may analyse supplied tender, RFQ and public procurement information.
47. Never fabricate a tender, deadline, eligibility requirement, supplier, buyer, broker or commercial deal.
48. Never claim Cossa is eligible, compliant, awarded or shortlisted unless verified evidence supports it.
49. Tender submission, signed commitments, pricing commitments and legal declarations require owner approval.
50. Broker and deal intelligence may research and analyse legitimate opportunities but may not fabricate relationships or confirmed deals.

CUSTOMER AND SALES RULES

51. Customer reactivation analysis may identify legitimate internal opportunities when authorised CRM and consent information are available.
52. Do not create duplicate leads merely to make pipeline numbers appear larger.
53. Customer communication must respect consent, opt-outs and applicable communication rules.
54. High-risk or sensitive customer communications require owner review.
55. Ordinary internal lead scoring, opportunity analysis, pipeline review and follow-up preparation should continue without unnecessary approval.

EXTERNAL INTELLIGENCE RULES

56. External news intelligence is supplementary evidence only.
57. Clearly label external news as external intelligence rather than verified Cossa knowledge.
58. Never claim to have searched the internet unless supplied external intelligence or another authorised search workflow actually performed the search.
59. Real-world supplier, prospect or procurement discovery requires an authorised research/search workflow capable of producing source evidence.
60. Never fabricate businesses, suppliers, brokers, contact information, websites, addresses or commercial relationships.

APPROVAL RULES

61. Owner approval is required for:
   - spending money;
   - changing advertising budgets or bids;
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

62. Owner approval is not automatically required for:
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

63. An AI CEO briefing must distinguish:
   - Verified facts;
   - Live operational facts;
   - External intelligence;
   - Missing evidence;
   - Work completed;
   - Work still in progress;
   - Recommendations;
   - Owner decisions required.

64. Do not place an item under Verified facts unless it is supported by verified knowledge or a supplied live record.
65. Missing evidence must remain missing evidence rather than being converted into an assumption.
66. The Cossa owner remains final authority for high-risk decisions.

OUTPUT QUALITY

67. Currency is South African Rand (R) unless a source specifically states another currency.
68. Be concise but sufficiently detailed for a CEO to act.
69. Prefer specific next actions, owners, dependencies and evidence requirements.
70. Avoid vague management language.
71. If a worker can safely continue internal work, say what it can continue doing instead of simply saying it must wait.
72. If something cannot be completed because a required integration is missing, identify the exact missing integration or data source.
73. Never describe a placeholder as a functioning integration.
74. Never describe simulated data as live data.
75. Never hide a failure.

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

The following instructions are task-specific. They may add detail but may not override the safety, evidence, privacy, approval or truthfulness rules above.

${customSystem.trim()}`
    : ""
}
`.trim();
}

/* -------------------------------------------------------------------------- */
/* RECORD-SAFE SUPPORT                                                        */
/* -------------------------------------------------------------------------- */

function needsRecordSafeSupport(
  message: string,
): boolean {
  return /\b(no|without|missing|cannot find|couldn['’]t find)\b[\s\S]{0,100}\b(order|payment|courier|delivery|tracking)\s+(record|details?|information)\b/i.test(
    message,
  );
}

/* -------------------------------------------------------------------------- */
/* GROQ STREAM CONVERSION                                                     */
/* -------------------------------------------------------------------------- */

function createPlainTextStream(
  upstreamBody:
    ReadableStream<Uint8Array>,
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
      let buffer = "";

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
        line: string,
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
            .slice(5)
            .trim();

        if (!data) {
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
            ) as {
              choices?: Array<{
                delta?: {
                  content?: string;
                };
              }>;
            };

          const token =
            parsed
              .choices?.[0]
              ?.delta
              ?.content;

          if (
            token &&
            !streamClosed
          ) {
            controller.enqueue(
              encoder.encode(
                token,
              ),
            );
          }
        } catch {
          console.warn(
            "Ignored malformed Groq streaming chunk.",
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

            if (done) {
              buffer +=
                decoder.decode();

              if (
                buffer.trim()
              ) {
                processSseLine(
                  buffer.trim(),
                );
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
                  .trim();

              buffer =
                buffer.slice(
                  lineBreakIndex +
                    1,
                );

              if (line) {
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

function createTextResponseStream(
  text: string,
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
/* OPENAI RESPONSE EXTRACTION                                                 */
/* -------------------------------------------------------------------------- */

function extractOpenAiResponseText(
  response: unknown,
): string {
  if (
    !response ||
    typeof response !==
      "object"
  ) {
    return "";
  }

  const payload =
    response as {
      output_text?: unknown;

      output?: Array<{
        content?: Array<{
          type?: unknown;
          text?: unknown;
        }>;
      }>;
    };

  if (
    typeof payload.output_text ===
    "string"
  ) {
    return payload.output_text.trim();
  }

  return (
    payload.output ?? []
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
    .join("")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* PROVIDER ERRORS                                                            */
/* -------------------------------------------------------------------------- */

function safeProviderFailure(
  provider:
    ChatProvider,

  status:
    number,

  errorText:
    string,
): string {
  let body:
    ProviderErrorBody | null =
    null;

  try {
    body =
      JSON.parse(
        errorText,
      ) as ProviderErrorBody;
  } catch {
    // Provider error details intentionally remain server-side.
  }

  const code =
    body?.error?.code
      ?.toLowerCase() ??
    "";

  const type =
    body?.error?.type
      ?.toLowerCase() ??
    "";

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
    return "Strategic OpenAI reasoning currently has no available API credit. No Cossa record was changed. Continue with Economy Groq or restore OpenAI API billing later.";
  }

  if (
    status === 429
  ) {
    return `${provider === "openai" ? "OpenAI" : "Groq"} is temporarily rate-limiting this request. No Cossa record was changed. Wait briefly and retry.`;
  }

  if (
    status === 401 ||
    status === 403
  ) {
    return `${provider === "openai" ? "OpenAI" : "Groq"} could not authorise this Cossa AI request. The protected server provider configuration needs review.`;
  }

  return `${provider === "openai" ? "OpenAI" : "Groq"} could not complete this Cossa AI request. No Cossa record was changed.`;
}

function chatResponseHeaders(
  provider:
    ChatProvider,
): HeadersInit {
  return {
    "Content-Type":
      "text/plain; charset=utf-8",

    "Cache-Control":
      "no-cache, no-transform",

    "X-Accel-Buffering":
      "no",

    "X-Content-Type-Options":
      "nosniff",

    "X-Cossa-AI-Provider":
      provider,
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
        POST: async ({
          request,
        }) => {
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
              },
            );
          }

          /* ---------------------------------------------------------------- */
          /* AUTH                                                             */
          /* ---------------------------------------------------------------- */

          const token =
            getBearerToken(
              request,
            );

          if (!token) {
            return new Response(
              "Unauthorized",
              {
                status:
                  401,
              },
            );
          }

          const user =
            await verifySupabaseUser(
              {
                token,

                supabaseUrl:
                  environment.supabaseUrl,

                supabaseKey:
                  environment.supabaseKey,
              },
            );

          if (!user) {
            return new Response(
              "Your Cossa AI session could not be verified. Sign out and sign in again.",
              {
                status:
                  401,
              },
            );
          }

          const isOrganisationMember =
            await verifyOrganisationMembership(
              {
                token,

                userId:
                  user.id,

                organisationId:
                  environment.organisationId,

                supabaseUrl:
                  environment.supabaseUrl,

                supabaseKey:
                  environment.supabaseKey,
              },
            );

          if (
            !isOrganisationMember
          ) {
            return new Response(
              "You are not authorised to use this Cossa AI workspace.",
              {
                status:
                  403,
              },
            );
          }

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
              },
            );
          }

          const messages =
            validation.messages;

          const customSystem =
            cleanCustomSystem(
              payload.system,
            );

          const provider:
            ChatProvider =
            payload.provider ??
            "groq";

          if (
            provider !==
              "groq" &&
            provider !==
              "openai"
          ) {
            return new Response(
              "Unsupported Cossa AI provider.",
              {
                status:
                  400,
              },
            );
          }

          /* ---------------------------------------------------------------- */
          /* PROVIDER CONFIG                                                  */
          /* ---------------------------------------------------------------- */

          if (
            provider ===
              "groq" &&
            !environment.groqApiKey
          ) {
            return new Response(
              "Economy Groq is not configured in the protected server environment.",
              {
                status:
                  503,
              },
            );
          }

          if (
            provider ===
              "openai" &&
            !environment.openAiApiKey
          ) {
            return new Response(
              "Strategic OpenAI reasoning is currently disabled. Economy Groq remains available when configured.",
              {
                status:
                  503,
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

          /* ---------------------------------------------------------------- */
          /* VERIFIED KNOWLEDGE                                               */
          /* ---------------------------------------------------------------- */

          const knowledge =
            await restSelect<KnowledgeDocument>(
              {
                table:
                  "ai_knowledge_documents",

                query:
                  new URLSearchParams(
                    {
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
                    },
                  ).toString(),

                token,

                supabaseUrl:
                  environment.supabaseUrl,

                supabaseKey:
                  environment.supabaseKey,
              },
            );

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
            await Promise.all(
              [
                loadOperationalContext(
                  {
                    latestUserMessage,

                    token,

                    organisationId:
                      environment.organisationId,

                    supabaseUrl:
                      environment.supabaseUrl,

                    supabaseKey:
                      environment.supabaseKey,
                  },
                ),

                loadWorkforceContext(
                  {
                    latestUserMessage,

                    token,

                    organisationId:
                      environment.organisationId,

                    supabaseUrl:
                      environment.supabaseUrl,

                    supabaseKey:
                      environment.supabaseKey,
                  },
                ),

                loadExternalNewsContext(
                  {
                    latestUserMessage,

                    newsApiKey:
                      environment.newsApiKey,
                  },
                ),
              ],
            );

          /* ---------------------------------------------------------------- */
          /* SYSTEM PROMPT                                                    */
          /* ---------------------------------------------------------------- */

          const systemPreamble:
            ChatMessage =
            {
              role:
                "system",

              content:
                buildSystemPrompt(
                  {
                    verifiedContext,

                    operationalContext,

                    workforceContext,

                    externalNewsContext,

                    customSystem,
                  },
                ),
            };

          const safetyGuard:
            ChatMessage | null =
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
          /* OPENAI                                                           */
          /* ---------------------------------------------------------------- */

          if (
            provider ===
            "openai"
          ) {
            const openAiModel =
              resolveOpenAiModel();

            if (
              !openAiModel
            ) {
              return new Response(
                "Strategic OpenAI reasoning is disabled because OPENAI_MODEL is not configured. Economy Groq remains the default Cossa AI reasoning route.",
                {
                  status:
                    503,
                },
              );
            }

            const openAiResponse =
              await fetch(
                "https://api.openai.com/v1/responses",
                {
                  method:
                    "POST",

                  headers:
                    {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${environment.openAiApiKey}`,
                    },

                  body:
                    JSON.stringify(
                      {
                        model:
                          openAiModel,

                        instructions:
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
                            ),

                        input:
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
                            ),

                        max_output_tokens:
                          MAX_OPENAI_COMPLETION_TOKENS,

                        store:
                          false,
                      },
                    ),

                  signal:
                    request.signal,
                },
              );

            if (
              !openAiResponse.ok
            ) {
              const errorText =
                await openAiResponse
                  .text()
                  .catch(
                    () => "",
                  );

              console.error(
                "OpenAI request failed:",
                openAiResponse.status,
                errorText,
              );

              const responseStatus =
                openAiResponse.status ===
                  402 ||
                openAiResponse.status ===
                  429
                  ? openAiResponse.status
                  : 502;

              return new Response(
                safeProviderFailure(
                  "openai",
                  openAiResponse.status,
                  errorText,
                ),
                {
                  status:
                    responseStatus,
                },
              );
            }

            const responsePayload =
              await openAiResponse.json();

            const responseText =
              extractOpenAiResponseText(
                responsePayload,
              );

            if (
              !responseText
            ) {
              return new Response(
                "Cossa AI returned an empty OpenAI response.",
                {
                  status:
                    502,
                },
              );
            }

            return new Response(
              createTextResponseStream(
                responseText,
              ),
              {
                headers:
                  chatResponseHeaders(
                    provider,
                  ),
              },
            );
          }

          /* ---------------------------------------------------------------- */
          /* GROQ                                                             */
          /* ---------------------------------------------------------------- */

          const groqResponse =
            await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method:
                  "POST",

                headers:
                  {
                    "Content-Type":
                      "application/json",

                    Authorization:
                      `Bearer ${environment.groqApiKey}`,
                  },

                body:
                  JSON.stringify(
                    {
                      model:
                        resolveGroqModel(),

                      stream:
                        true,

                      temperature:
                        0.2,

                      max_tokens:
                        MAX_GROQ_COMPLETION_TOKENS,

                      messages:
                        providerMessages,
                    },
                  ),

                signal:
                  request.signal,
              },
            );

          if (
            !groqResponse.ok ||
            !groqResponse.body
          ) {
            const errorText =
              await groqResponse
                .text()
                .catch(
                  () => "",
                );

            console.error(
              "Groq request failed:",
              groqResponse.status,
              errorText,
            );

            const responseStatus =
              groqResponse.status ===
                402 ||
              groqResponse.status ===
                429
                ? groqResponse.status
                : 502;

            return new Response(
              safeProviderFailure(
                "groq",
                groqResponse.status,
                errorText,
              ),
              {
                status:
                  responseStatus,
              },
            );
          }

          return new Response(
            createPlainTextStream(
              groqResponse.body,
            ),
            {
              headers:
                chatResponseHeaders(
                  provider,
                ),
            },
          );
        },
      },
    },
  });