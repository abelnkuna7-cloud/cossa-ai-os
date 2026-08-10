import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

const GROQ_MODEL = "llama-3.3-70b-versatile";
// OpenAI's current model family provides a strong quality/cost balance through
// the Terra tier. It is opt-in in the UI; Groq remains the default economy route.
const OPENAI_MODEL = "gpt-5.6-terra";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12_000;
const MAX_TOTAL_MESSAGE_LENGTH = 60_000;
const MAX_GROQ_HISTORY_MESSAGES = 12;
const MAX_GROQ_HISTORY_LENGTH = 16_000;
const MAX_KNOWLEDGE_CONTEXT_LENGTH = 8_000;
const MAX_SELECTED_KNOWLEDGE_DOCUMENTS = 12;
const MAX_OPERATIONAL_CONTEXT_LENGTH = 8_000;
const MAX_WORKFORCE_CONTEXT_LENGTH = 4_500;
const MAX_GROQ_COMPLETION_TOKENS = 700;
const MAX_OPENAI_COMPLETION_TOKENS = 900;

type ChatRole = "system" | "user" | "assistant";
type ChatProvider = "groq" | "openai";

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

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getEnvironment() {
  const groqApiKey = process.env.GROQ_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const organisationId =
    process.env.COSSA_ORGANISATION_ID ||
    process.env.VITE_COSSA_ORGANISATION_ID ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if ((!groqApiKey && !openAiApiKey) || !supabaseUrl || !supabaseKey) {
    return null;
  }

  return {
    groqApiKey,
    openAiApiKey,
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
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    console.error(`Supabase query failed for ${table}:`, response.status, errorText);

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
): { valid: true; messages: ChatMessage[] } | { valid: false; error: string } {
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
    if (typeof item !== "object" || item === null || !("role" in item) || !("content" in item)) {
      return {
        valid: false,
        error: "Invalid chat message format.",
      };
    }

    const role = item.role;
    const content = typeof item.content === "string" ? item.content.trim() : "";

    if (role !== "system" && role !== "user" && role !== "assistant") {
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

/*
 * The browser can retain a long conversation, but sending its full transcript
 * and every data extract to Groq on each turn burns credits without improving
 * the answer to the latest request. Keep a useful recent window instead.
 */
function selectGroqHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent: ChatMessage[] = [];
  let length = 0;

  for (const message of [...messages].reverse()) {
    if (recent.length >= MAX_GROQ_HISTORY_MESSAGES) {
      break;
    }

    const remaining = MAX_GROQ_HISTORY_LENGTH - length;

    if (remaining <= 0) {
      break;
    }

    const content =
      message.content.length > remaining ? message.content.slice(-remaining) : message.content;

    recent.unshift({
      ...message,
      content,
    });
    length += content.length;
  }

  return recent;
}

function extractSearchTerms(message: string): Set<string> {
  return new Set(message.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
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

  const companyWideCategories = [
    "company facts",
    "company",
    "legal & compliance",
    "services",
    "brand",
    "policies",
  ];

  return knowledge
    .map((document) => {
      const searchable = `${document.title} ${document.body}`.toLowerCase();

      const relevance = [...queryTerms].reduce(
        (score, term) =>
          score +
          (searchable.includes(term) || (term.length >= 6 && searchable.includes(term.slice(0, 5)))
            ? 1
            : 0),
        0,
      );

      const isCore = coreKnowledgeTitles.some((title) =>
        document.title.toLowerCase().includes(title),
      );

      const tags = new Set(document.tags.map((tag) => tag.toLowerCase().trim()));
      const isCompanyWide =
        tags.has("company-wide") ||
        tags.has("always-include") ||
        companyWideCategories.includes(document.category?.toLowerCase().trim() ?? "");

      return {
        document,
        relevance,
        isCore,
        isCompanyWide,
      };
    })
    .sort(
      (a, b) =>
        Number(b.isCompanyWide) - Number(a.isCompanyWide) ||
        Number(b.isCore) - Number(a.isCore) ||
        b.relevance - a.relevance ||
        Date.parse(b.document.updated_at) - Date.parse(a.document.updated_at),
    )
    .slice(0, MAX_SELECTED_KNOWLEDGE_DOCUMENTS)
    .map(({ document }) => document);
}

function formatKnowledgeContext(knowledge: KnowledgeDocument[]): string {
  if (knowledge.length === 0) {
    return "No verified company knowledge was retrieved.";
  }

  return knowledge
    .map((document) =>
      [
        `DOCUMENT: ${document.title}`,
        document.tags.length > 0 ? `TAGS: ${document.tags.join(", ")}` : null,
        document.source ? `SOURCE: ${document.source}` : null,
        document.source_url ? `SOURCE URL: ${document.source_url}` : null,
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

function needsWorkforceData(message: string): boolean {
  return /\b(ai[- ]?ceo|workforce|worker|workers|handoff|handoffs|mission|missions|approval|approvals|owner briefing|briefing)\b/i.test(
    message,
  );
}

async function loadOperationalContext({
  latestUserMessage,
  token,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  latestUserMessage: string;
  token: string;
  organisationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<string> {
  if (!needsOperationalData(latestUserMessage)) {
    return "Operational CRM records were not required for this request.";
  }

  const includeContactFields = needsLeadContactData(latestUserMessage);

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
        organisation_id: `eq.${organisationId}`,
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
          ? "id,name,email,phone,subject,message,status,created_at"
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
        organisation_id: `eq.${organisationId}`,
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
        organisation_id: `eq.${organisationId}`,
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
        organisation_id: `eq.${organisationId}`,
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
        organisation_id: `eq.${organisationId}`,
        order: "created_at.desc",
        limit: "25",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),

    restSelect<Record<string, unknown>>({
      table: "appointments",
      query: new URLSearchParams({
        select:
          "id,title,service,location,status,scheduled_at,appointment_date,ends_at,created_at,updated_at",
        organisation_id: `eq.${organisationId}`,
        order: "created_at.desc",
        limit: "25",
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
    JSON.stringify(leads, null, 2),
    "",
    `QUOTE REQUESTS (${quoteRequests.length})`,
    JSON.stringify(quoteRequests, null, 2),
    "",
    `CONTACT MESSAGES (${contactMessages.length})`,
    JSON.stringify(contactMessages, null, 2),
    "",
    `OPPORTUNITIES (${opportunities.length})`,
    JSON.stringify(opportunities, null, 2),
    "",
    `QUOTATIONS (${quotations.length})`,
    JSON.stringify(quotations, null, 2),
    "",
    `CUSTOMERS (${customers.length})`,
    JSON.stringify(customers, null, 2),
    "",
    `PROJECTS (${projects.length})`,
    JSON.stringify(projects, null, 2),
    "",
    `APPOINTMENTS (${appointments.length})`,
    JSON.stringify(appointments, null, 2),
  ]
    .join("\n")
    .slice(0, MAX_OPERATIONAL_CONTEXT_LENGTH);
}

/**
 * Loads only the workforce records required for an explicit workforce or AI
 * CEO question. This adds database context, not another Groq call, so it does
 * not consume additional model credits.
 */
async function loadWorkforceContext({
  latestUserMessage,
  token,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  latestUserMessage: string;
  token: string;
  organisationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<string> {
  if (!needsWorkforceData(latestUserMessage)) {
    return "Workforce records were not required for this request.";
  }

  const [employees, missions, runs, handoffs, approvals] = await Promise.all([
    restSelect<Record<string, unknown>>({
      table: "ai_employees",
      query: new URLSearchParams({
        select: "employee_key,name,title,department,mission,status,updated_at",
        organisation_id: `eq.${organisationId}`,
        order: "updated_at.desc",
        limit: "20",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),
    restSelect<Record<string, unknown>>({
      table: "missions",
      query: new URLSearchParams({
        select: "id,title,objective,status,priority,risk_level,created_at,updated_at",
        organisation_id: `eq.${organisationId}`,
        order: "created_at.desc",
        limit: "20",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),
    restSelect<Record<string, unknown>>({
      table: "mission_runs",
      query: new URLSearchParams({
        select:
          "mission_id,status,model_provider,model_name,created_at,started_at,completed_at,error_code",
        organisation_id: `eq.${organisationId}`,
        order: "created_at.desc",
        limit: "30",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),
    restSelect<Record<string, unknown>>({
      table: "employee_handoffs",
      query: new URLSearchParams({
        select:
          "mission_id,from_employee_id,to_employee_id,reason,status,created_at,accepted_at,completed_at",
        organisation_id: `eq.${organisationId}`,
        order: "created_at.desc",
        limit: "50",
      }).toString(),
      token,
      supabaseUrl,
      supabaseKey,
    }),
    restSelect<Record<string, unknown>>({
      table: "approvals",
      query: new URLSearchParams({
        select: "mission_id,action_type,risk_level,justification,status,requested_at,decided_at",
        organisation_id: `eq.${organisationId}`,
        order: "requested_at.desc",
        limit: "20",
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
    JSON.stringify(employees, null, 2),
    "",
    `MISSIONS (${missions.length})`,
    JSON.stringify(missions, null, 2),
    "",
    `MISSION RUNS (${runs.length})`,
    JSON.stringify(runs, null, 2),
    "",
    `HANDOFFS (${handoffs.length})`,
    JSON.stringify(handoffs, null, 2),
    "",
    `APPROVALS (${approvals.length})`,
    JSON.stringify(approvals, null, 2),
  ]
    .join("\n")
    .slice(0, MAX_WORKFORCE_CONTEXT_LENGTH);
}

function buildSystemPrompt({
  verifiedContext,
  operationalContext,
  workforceContext,
  customSystem,
}: {
  verifiedContext: string;
  operationalContext: string;
  workforceContext: string;
  customSystem?: string;
}): string {
  return `
You are Cossa AI, the internal AI business operating partner of Cossa Nexus Holdings.

Your responsibilities include business strategy, sales, marketing, operations, CRM analysis and practical execution support.

OPERATING RULES

1. Use verified company knowledge for company-specific facts.
2. Use live operational records for CRM, lead, customer, quotation, opportunity, project and appointment facts.
3. Clearly distinguish:
   - verified company knowledge;
   - live database records;
   - recommendations or analysis.
4. Never invent leads, revenue, customers, quotations, opportunities, website traffic, completed work or employee actions.
5. When a requested record is not present, say that it was not found.
6. Never claim an email, call, WhatsApp message, quotation, booking or campaign was sent unless a verified system record confirms it.
7. High-risk, financial, legal, external communication and irreversible actions require human approval.
8. Currency is South African Rand (R).
9. Be practical, direct and action-oriented.
10. Do not claim to have searched the live internet unless an authorised web-search tool actually supplied results.
11. When asked to find real-world prospects, explain that verified public prospect research requires the Lead Hunter search workflow. Do not fabricate businesses, phone numbers, emails, websites or locations.
12. Cite the relevant knowledge-document title for company-specific claims.
13. For live CRM information, mention the applicable record category and record date where useful.
14. Protect private contact information. Only show phone numbers and email addresses when the authenticated user explicitly requests contact or outreach details.
15. When live operational context contains a clear count, answer directly with the exact count. Do not claim that CRM access is unavailable.
16. Do not ask the user to manually check the CRM when the requested records are already present in the live operational context.
17. For workforce questions, use the live workforce context. A pending handoff is not accepted, completed work or an external action.
18. Do not claim an AI worker performed work unless a mission run or completed handoff proves it. Do not claim social accounts, advertising accounts or website tools are connected unless the Integration Center records an authorised connection.
19. An AI CEO briefing must state verified facts, missing information, approval decisions required and which external actions remain disabled. The Cossa owner makes the final decision.
20. In an owner briefing, a statement belongs under "Verified facts" only when it is explicitly present in a supplied knowledge document or live record. A mission objective is an owner instruction, not proof of a target customer, service capability, positioning, customer interest or business result.
21. Do not infer customer segments, Cossa services, market positioning, website weaknesses, campaign performance or customer needs from CRM counts, job titles, a mission objective or general knowledge. Put those items under "Missing evidence" or "Proposed work" instead.
22. Never propose, draft or imply a customer success story, testimonial, case study, customer name or performance result unless the supplied verified context specifically supports it and the owner has authorised its use. Do not use testimonials as filler content.
23. Every proposed content item must be framed as a draft idea, not a proven claim. If it refers to a Cossa service or result, state the source title that verifies it; otherwise ask the owner to provide or approve the source.
24. A document tagged "owner-target", "planned" or "requires-review" records an owner-approved intention. Describe it as a future target or plan, never as an achieved result, guaranteed outcome or public announcement. For legal, financial, listing or regulatory targets, say formal professional advice and required approvals remain necessary.

VERIFIED COMPANY KNOWLEDGE

${verifiedContext}

LIVE OPERATIONAL CONTEXT

${operationalContext}

LIVE AI WORKFORCE CONTEXT

${workforceContext}
${customSystem?.trim() ? `\nADDITIONAL APPROVED INSTRUCTIONS\n\n${customSystem.trim()}` : ""}
`.trim();
}

function needsRecordSafeSupport(message: string): boolean {
  return /\b(no|without|missing|cannot find|couldn['’]t find)\b[\s\S]{0,100}\b(order|payment|courier|delivery|tracking)\s+(record|details?|information)\b/i.test(
    message,
  );
}

function createPlainTextStream(
  upstreamBody: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstreamBody.getReader();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let buffer = "";
      let streamClosed = false;

      function closeStream() {
        if (streamClosed) {
          return;
        }

        streamClosed = true;
        controller.close();
      }

      function processSseLine(line: string) {
        if (!line.startsWith("data:")) {
          return;
        }

        const data = line.slice(5).trim();

        if (!data) {
          return;
        }

        if (data === "[DONE]") {
          closeStream();
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
              };
            }>;
          };

          const token = parsed.choices?.[0]?.delta?.content;

          if (token && !streamClosed) {
            controller.enqueue(encoder.encode(token));
          }
        } catch {
          console.warn("Ignored malformed Groq streaming chunk.");
        }
      }

      async function pump() {
        try {
          while (!streamClosed) {
            const { value, done } = await reader.read();

            if (done) {
              buffer += decoder.decode();

              if (buffer.trim()) {
                processSseLine(buffer.trim());
              }

              closeStream();
              return;
            }

            buffer += decoder.decode(value, {
              stream: true,
            });

            let lineBreakIndex = buffer.indexOf("\n");

            while (lineBreakIndex !== -1) {
              const line = buffer.slice(0, lineBreakIndex).trim();

              buffer = buffer.slice(lineBreakIndex + 1);

              if (line) {
                processSseLine(line);
              }

              if (streamClosed) {
                return;
              }

              lineBreakIndex = buffer.indexOf("\n");
            }
          }
        } catch (error) {
          if (!streamClosed) {
            controller.error(error);
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

function createTextResponseStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function extractOpenAiResponseText(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const payload = response as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: unknown;
        text?: unknown;
      }>;
    }>;
  };

  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("")
    .trim();
}

function chatResponseHeaders(provider: ChatProvider): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
    "X-Cossa-AI-Provider": provider,
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const environment = getEnvironment();

        if (!environment) {
          return new Response("Cossa AI is not fully configured.", { status: 503 });
        }

        const token = getBearerToken(request);

        if (!token) {
          return new Response("Unauthorized", {
            status: 401,
          });
        }

        const user = await verifySupabaseUser({
          token,
          supabaseUrl: environment.supabaseUrl,
          supabaseKey: environment.supabaseKey,
        });

        if (!user) {
          return new Response(
            "Your Cossa AI session could not be verified. Sign out and sign in again.",
            { status: 401 },
          );
        }

        const isOrganisationMember = await verifyOrganisationMembership({
          token,
          userId: user.id,
          organisationId: environment.organisationId,
          supabaseUrl: environment.supabaseUrl,
          supabaseKey: environment.supabaseKey,
        });

        if (!isOrganisationMember) {
          return new Response("You are not authorised to use this Cossa AI workspace.", {
            status: 403,
          });
        }

        let payload: ChatPayload;

        try {
          payload = (await request.json()) as ChatPayload;
        } catch {
          return new Response("Invalid JSON body.", {
            status: 400,
          });
        }

        const validation = validateMessages(payload.messages);

        if (!validation.valid) {
          return new Response(validation.error, {
            status: 400,
          });
        }

        const messages = validation.messages;

        const provider: ChatProvider = payload.provider ?? "groq";

        if (provider !== "groq" && provider !== "openai") {
          return new Response("Unsupported Cossa AI provider.", { status: 400 });
        }

        if (provider === "groq" && !environment.groqApiKey) {
          return new Response(
            "The Economy (Groq) route is not configured. Choose Strategic reasoning or ask an owner to configure Groq.",
            { status: 503 },
          );
        }

        if (provider === "openai" && !environment.openAiApiKey) {
          return new Response(
            "The Strategic reasoning route is not configured. Add OPENAI_API_KEY to the server environment and redeploy.",
            { status: 503 },
          );
        }

        const latestUserMessage =
          [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

        const knowledge = await restSelect<KnowledgeDocument>({
          table: "ai_knowledge_documents",
          query: new URLSearchParams({
            select: "title,body,category,tags,source,source_url,updated_at",
            organisation_id: `eq.${environment.organisationId}`,
            verification_status: "eq.verified",
            order: "updated_at.desc",
            limit: "100",
          }).toString(),
          token,
          supabaseUrl: environment.supabaseUrl,
          supabaseKey: environment.supabaseKey,
        });

        const selectedKnowledge = selectRelevantKnowledge(knowledge, latestUserMessage);

        const verifiedContext = formatKnowledgeContext(selectedKnowledge);

        const [operationalContext, workforceContext] = await Promise.all([
          loadOperationalContext({
            latestUserMessage,
            token,
            organisationId: environment.organisationId,
            supabaseUrl: environment.supabaseUrl,
            supabaseKey: environment.supabaseKey,
          }),
          loadWorkforceContext({
            latestUserMessage,
            token,
            organisationId: environment.organisationId,
            supabaseUrl: environment.supabaseUrl,
            supabaseKey: environment.supabaseKey,
          }),
        ]);

        const systemPreamble: ChatMessage = {
          role: "system",
          content: buildSystemPrompt({
            verifiedContext,
            operationalContext,
            workforceContext,
            customSystem: payload.system,
          }),
        };

        const safetyGuard: ChatMessage | null = needsRecordSafeSupport(latestUserMessage)
          ? {
              role: "system",
              content:
                "No verified order, payment, courier, delivery or tracking record is available. Do not promise an investigation, follow-up, response, delivery date or future action. Ask for the order reference and payment proof before preparing a human review request.",
            }
          : null;

        const providerMessages: ChatMessage[] = [
          systemPreamble,
          ...(safetyGuard ? [safetyGuard] : []),
          ...selectGroqHistory(messages),
        ];

        if (provider === "openai") {
          /*
           * The OpenAI route is deliberately selected by the owner in the UI;
           * it is never a hidden fallback for Groq. This keeps usage and spend
           * visible while giving complex planning work a higher-reasoning option.
           */
          const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${environment.openAiApiKey}`,
            },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              instructions: providerMessages
                .filter((message) => message.role === "system")
                .map((message) => message.content)
                .join("\n\n"),
              input: providerMessages
                .filter((message) => message.role !== "system")
                .map((message) => ({ role: message.role, content: message.content })),
              reasoning: { effort: "medium" },
              text: { verbosity: "medium" },
              max_output_tokens: MAX_OPENAI_COMPLETION_TOKENS,
              store: false,
            }),
            signal: request.signal,
          });

          if (!openAiResponse.ok) {
            const errorText = await openAiResponse.text().catch(() => "");

            console.error("OpenAI request failed:", openAiResponse.status, errorText);

            const responseStatus =
              openAiResponse.status === 402 || openAiResponse.status === 429
                ? openAiResponse.status
                : 502;

            return new Response(errorText || "Cossa AI provider error.", {
              status: responseStatus,
            });
          }

          const responseText = extractOpenAiResponseText(await openAiResponse.json());

          if (!responseText) {
            return new Response("Cossa AI returned an empty OpenAI response.", { status: 502 });
          }

          return new Response(createTextResponseStream(responseText), {
            headers: chatResponseHeaders(provider),
          });
        }

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${environment.groqApiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            stream: true,
            temperature: 0.2,
            max_tokens: MAX_GROQ_COMPLETION_TOKENS,
            messages: providerMessages,
          }),
          signal: request.signal,
        });

        if (!groqResponse.ok || !groqResponse.body) {
          const errorText = await groqResponse.text().catch(() => "");

          console.error("Groq request failed:", groqResponse.status, errorText);

          const responseStatus =
            groqResponse.status === 402 || groqResponse.status === 429 ? groqResponse.status : 502;

          return new Response(errorText || "Cossa AI gateway error.", {
            status: responseStatus,
          });
        }

        return new Response(createPlainTextStream(groqResponse.body), {
          headers: chatResponseHeaders(provider),
        });
      },
    },
  },
});
