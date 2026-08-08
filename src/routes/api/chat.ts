import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12_000;
const MAX_TOTAL_MESSAGE_LENGTH = 60_000;
const MAX_GROQ_HISTORY_MESSAGES = 12;
const MAX_GROQ_HISTORY_LENGTH = 16_000;
const MAX_KNOWLEDGE_CONTEXT_LENGTH = 8_000;
const MAX_OPERATIONAL_CONTEXT_LENGTH = 8_000;
const MAX_GROQ_COMPLETION_TOKENS = 700;

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

/*
 * The browser can retain a long conversation, but sending its full transcript
 * and every data extract to Groq on each turn burns credits without improving
 * the answer to the latest request. Keep a useful recent window instead.
 */
function selectGroqHistory(
  messages: ChatMessage[],
): ChatMessage[] {
  const recent: ChatMessage[] = [];
  let length = 0;

  for (const message of [...messages].reverse()) {
    if (
      recent.length >=
      MAX_GROQ_HISTORY_MESSAGES
    ) {
      break;
    }

    const remaining =
      MAX_GROQ_HISTORY_LENGTH -
      length;

    if (remaining <= 0) {
      break;
    }

    const content =
      message.content.length > remaining
        ? message.content.slice(
            -remaining,
          )
        : message.content;

    recent.unshift({
      ...message,
      content,
    });
    length += content.length;
  }

  return recent;
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

    restSelect<Record<string, unknown>>({
      table: "appointments",
      query: new URLSearchParams({
        select:
          "id,title,service,location,status,scheduled_at,appointment_date,ends_at,created_at,updated_at",
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

function buildSystemPrompt({
  verifiedContext,
  operationalContext,
  customSystem,
}: {
  verifiedContext: string;
  operationalContext: string;
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

VERIFIED COMPANY KNOWLEDGE

${verifiedContext}

LIVE OPERATIONAL CONTEXT

${operationalContext}
${
  customSystem?.trim()
    ? `\nADDITIONAL APPROVED INSTRUCTIONS\n\n${customSystem.trim()}`
    : ""
}
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

          const token =
            parsed.choices?.[0]?.delta?.content;

          if (token && !streamClosed) {
            controller.enqueue(encoder.encode(token));
          }
        } catch {
          console.warn(
            "Ignored malformed Groq streaming chunk.",
          );
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
              const line = buffer
                .slice(0, lineBreakIndex)
                .trim();

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

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const environment = getEnvironment();

        if (!environment) {
          return new Response(
            "Cossa AI is not fully configured.",
            { status: 503 },
          );
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

        const isOrganisationMember =
          await verifyOrganisationMembership({
            token,
            userId: user.id,
            organisationId: environment.organisationId,
            supabaseUrl: environment.supabaseUrl,
            supabaseKey: environment.supabaseKey,
          });

        if (!isOrganisationMember) {
          return new Response(
            "You are not authorised to use this Cossa AI workspace.",
            { status: 403 },
          );
        }

        let payload: ChatPayload;

        try {
          payload =
            (await request.json()) as ChatPayload;
        } catch {
          return new Response("Invalid JSON body.", {
            status: 400,
          });
        }

        const validation = validateMessages(
          payload.messages,
        );

        if (!validation.valid) {
          return new Response(validation.error, {
            status: 400,
          });
        }

        const messages = validation.messages;

        const latestUserMessage =
          [...messages]
            .reverse()
            .find(
              (message) =>
                message.role === "user",
            )?.content ?? "";

        const knowledge =
          await restSelect<KnowledgeDocument>({
            table: "ai_knowledge_documents",
            query: new URLSearchParams({
              select:
                "title,body,source,source_url,updated_at",
              organisation_id:
                `eq.${environment.organisationId}`,
              verification_status: "eq.verified",
              order: "updated_at.desc",
              limit: "100",
            }).toString(),
            token,
            supabaseUrl: environment.supabaseUrl,
            supabaseKey: environment.supabaseKey,
          });

        const selectedKnowledge =
          selectRelevantKnowledge(
            knowledge,
            latestUserMessage,
          );

        const verifiedContext =
          formatKnowledgeContext(selectedKnowledge);

        const operationalContext =
          await loadOperationalContext({
            latestUserMessage,
            token,
            supabaseUrl: environment.supabaseUrl,
            supabaseKey: environment.supabaseKey,
          });

        const systemPreamble: ChatMessage = {
          role: "system",
          content: buildSystemPrompt({
            verifiedContext,
            operationalContext,
            customSystem: payload.system,
          }),
        };

        const safetyGuard: ChatMessage | null =
          needsRecordSafeSupport(latestUserMessage)
            ? {
                role: "system",
                content:
                  "No verified order, payment, courier, delivery or tracking record is available. Do not promise an investigation, follow-up, response, delivery date or future action. Ask for the order reference and payment proof before preparing a human review request.",
              }
            : null;

        const groqMessages: ChatMessage[] = [
          systemPreamble,
          ...(safetyGuard ? [safetyGuard] : []),
          ...selectGroqHistory(
            messages,
          ),
        ];

        const upstream = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                `Bearer ${environment.groqApiKey}`,
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              stream: true,
              temperature: 0.2,
              max_tokens:
                MAX_GROQ_COMPLETION_TOKENS,
              messages: groqMessages,
            }),
            signal: request.signal,
          },
        );

        if (!upstream.ok || !upstream.body) {
          const errorText =
            await upstream.text().catch(() => "");

          console.error(
            "Groq request failed:",
            upstream.status,
            errorText,
          );

          const responseStatus =
            upstream.status === 402 ||
            upstream.status === 429
              ? upstream.status
              : 502;

          return new Response(
            errorText || "Cossa AI gateway error.",
            {
              status: responseStatus,
            },
          );
        }

        const responseStream =
          createPlainTextStream(upstream.body);

        return new Response(responseStream, {
          headers: {
            "Content-Type":
              "text/plain; charset=utf-8",
            "Cache-Control":
              "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
