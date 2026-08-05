import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12_000;
const MAX_TOTAL_MESSAGE_LENGTH = 60_000;
const MAX_KNOWLEDGE_CONTEXT_LENGTH = 18_000;
const MAX_OPERATIONAL_CONTEXT_LENGTH = 16_000;

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatPayload {
  messages?: ChatMessage[];
  system?: string;
}

interface SupabaseUser {
  id: string;
  email?: string;
}

interface KnowledgeDocument {
  title: string;
  body: string;
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

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getEnvironment() {
  const groqApiKey = process.env.GROQ_API_KEY;

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const organisationId =
    process.env.COSSA_ORGANISATION_ID ||
    process.env.VITE_COSSA_ORGANISATION_ID ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (!groqApiKey || !supabaseUrl || !supabaseKey) {
    return null;
  }

  return {
    groqApiKey,
    supabaseUrl: trimTrailingSlash(supabaseUrl),
    supabaseKey,
    organisationId,
  };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

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
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SupabaseUser;
}

async function restSelect<T>({
  table,
  query,
  token,
  supabaseUrl,
  supabaseKey,
}: RestRequestOptions): Promise<T[]> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${query}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    console.error(
      `Supabase query failed for ${table}:`,
      response.status,
      errorText,
    );

    return [];
  }

  return (await response.json()) as T[];
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
  const rows = await restSelect<{
    user_id: string;
    status: string;
    role: string;
  }>({
    table: "organisation_members",
    query: new URLSearchParams({
      select: "user_id,status,role",
      organisation_id: `eq.${organisationId}`,
      user_id: `eq.${userId}`,
      status: "eq.active",
      limit: "1",
    }).toString(),
    token,
    supabaseUrl,
    supabaseKey,
  });

  return rows.length === 1;
}

function validateMessages(
  value: unknown,
):
  | { valid: true; messages: ChatMessage[] }
  | { valid: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      valid: false,
      error: "At least one chat message is required.",
    };
  }

  if (value.length > MAX_MESSAGES) {
    return {
      valid: false,
      error: `A maximum of ${MAX_MESSAGES} messages is allowed per request.`,
    };
  }

  const messages: ChatMessage[] = [];
  let totalLength = 0;

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("role" in item) ||
      !("content" in item)
    ) {
      return {
        valid: false,
        error: "Invalid chat message format.",
      };
    }

    const role = item.role;
    const content =
      typeof item.content === "string"
        ? item.content.trim()
        : "";

    if (
      role !== "system" &&
      role !== "user" &&
      role !== "assistant"
    ) {
      return {
        valid: false,
        error: "Unsupported chat message role.",
      };
    }

    if (!content) {
      return {
        valid: false,
        error: "Chat messages cannot be empty.",
      };
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Individual messages cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      };
    }

    totalLength += content.length;

    if (totalLength > MAX_TOTAL_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: "The conversation is too large. Start a new chat.",
      };
    }

    messages.push({
      role,
      content,
    });
  }

  return {
    valid: true,
    messages,
  };
}

function extractSearchTerms(message: string): Set<string> {
  return new Set(
    message.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [],
  );
}

function selectRelevantKnowledge(
  knowledge: KnowledgeDocument[],
  latestUserMessage: string,
): KnowledgeDocument[] {
  const queryTerms = extractSearchTerms(latestUserMessage);

  const coreKnowledgeTitles = [
    "constitution",
    "approval authority",
    "memory and knowledge",
    "mission",
    "vision",
    "answer precision",
    "company overview",
  ];

  return knowledge
    .map((document) => {
      const searchable =
        `${document.title} ${document.body}`.toLowerCase();

      const relevance = [...queryTerms].reduce(
        (score, term) =>
          score +
          (searchable.includes(term) ||
          (term.length >= 6 &&
            searchable.includes(term.slice(0, 5)))
            ? 1
            : 0),
        0,
      );

      const isCore = coreKnowledgeTitles.some((title) =>
        document.title.toLowerCase().includes(title),
      );

      return {
        document,
        relevance,
        isCore,
      };
    })
    .sort(
      (a, b) =>
        Number(b.isCore) - Number(a.isCore) ||
        b.relevance - a.relevance,
    )
    .map(({ document }) => document);
}

function formatKnowledgeContext(
  knowledge: KnowledgeDocument[],
): string {
  if (knowledge.length === 0) {
    return "No verified company knowledge was retrieved.";
  }

  return knowledge
    .map((document) =>
      [
        `DOCUMENT: ${document.title}`,
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
    .join("\n\n---\n\n")
    .slice(0, MAX_KNOWLEDGE_CONTEXT_LENGTH);
}

/**
 * Determines whether the current question needs live Supabase records.
 *
 * Important: JavaScript supports the "i" regex flag, but not the "x" flag.
 * Keep the expression on one logical line.
 */
function needsOperationalData(message: string): boolean {
  return /\b(lead|leads|enquiry|enquiries|quote request|quote requests|customer|customers|pipeline|opportunity|opportunities|quotation|quotations|quote|quotes|project|projects|appointment|appointments|follow[- ]?up|crm|sales|revenue|website request|website requests)\b/i.test(
    message,
  );
}

function needsLeadContactData(message: string): boolean {
  return /\b(phone|email|contact|call|whatsapp|outreach|follow[- ]?up|lead details|customer details|contact details)\b/i.test(
    message,
  );
}

async function loadOperationalContext({
  latestUserMessage,
  token,
  supabaseUrl,
  supabaseKey,
}: {
  latestUserMessage: string;
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<string> {
  if (!needsOperationalData(latestUserMessage)) {
    return "Operational CRM records were not required for this request.";
  }

  const includeContactFields =
    needsLeadContactData(latestUserMessage);

  const leadSelect = includeContactFields
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
  ] = await Promise.all([
    restSelect<Record<string, unknown>>({
      table: "leads",
      query: new URLSearchParams({
        select: leadSelect,
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "quote_requests",
      query: new URLSearchParams({
        select:
          "id,full_name,name,service,location,project_details,message,budget,timeline,created_at",
        order: "created_at.desc",
        limit: "20",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "contact_messages",
      query: new URLSearchParams({
        select: includeContactFields
          ? "id,name,email,call phone,subject,message,status,created_at"
          : "id,name,subject,message,status,created_at",
        order: "created_at.desc",
        limit: "20",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "opportunities",
      query: new URLSearchParams({
        select:
          "id,organization_name,opportunity_type,location,estimated_value,status,probability,expected_close,notes,created_at,updated_at",
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "quotations",
      query: new URLSearchParams({
        select:
          "id,quote_number,title,amount,status,valid_until,service,description,created_at,updated_at",
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "customers",
      query: new URLSearchParams({
        select: includeContactFields
          ? "id,name,email,phone,company,customer_type,status,created_at,updated_at"
          : "id,name,company,customer_type,status,created_at,updated_at",
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "projects",
      query: new URLSearchParams({
        select:
          "id,name,project_name,service,location,budget,status,priority,progress,start_date,end_date,created_at,updated_at",
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

   