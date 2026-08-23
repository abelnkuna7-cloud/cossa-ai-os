export interface Env {
  ALERT_SHARED_SECRET: string;
  CALLMEBOT_API_KEY: string;
  CALLMEBOT_OWNER_PHONE: string;
  COSSA_ORGANISATION_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALERT_DEDUP?: KVNamespace;
}

type SupabaseWebhook = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

type AlertEvent = {
  eventType: string;
  entityType: string;
  entityId: string;
  source: string;
  occurredAt: string;
  requestId: string | null;
  message: string;
  idempotencyKey: string;
};

const EVENT_LABELS: Record<string, string> = {
  quote_requests: "NEW QUOTE REQUEST",
  quotes: "NEW QUOTE REQUEST",
  inspection_bookings: "NEW INSPECTION BOOKING",
  appointments: "NEW APPOINTMENT",
  contact_messages: "NEW CONTACT MESSAGE",
  leads: "NEW LEAD",
  chatbot_conversations: "QUALIFIED CHAT LEAD",
};

const MAX_MESSAGE_LENGTH = 1_400;

function constantTimeEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function stringValue(value: unknown, fallback = "Not provided") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function truncate(value: string, max = 280) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildMessage(table: string, record: Record<string, unknown>) {
  const title = EVENT_LABELS[table] ?? "NEW COSSA REQUEST";
  const name = stringValue(record.name ?? record.full_name ?? record.visitor_name ?? record.customer_name);
  const phone = stringValue(record.phone ?? record.visitor_phone ?? record.customer_phone, "No phone supplied");
  const email = stringValue(record.email, "No email supplied");
  const service = stringValue(record.service ?? record.service_interest ?? record.subject, "General enquiry");
  const location = optionalValue(record.location ?? record.site_address ?? record.address);
  const detail = optionalValue(record.project_details ?? record.message ?? record.notes ?? record.content);

  return [
    `*COSSA NEXUS — ${title}*`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Service: ${service}`,
    ...(location ? [`Location: ${location}`] : []),
    ...(detail ? [`Details: ${truncate(detail)}`] : []),
    `Record ID: ${stringValue(record.id, "Pending")}`,
    "Action: Contact the lead promptly and update Cossa AI.",
  ].join("\n");
}

function toAlertEvent(payload: SupabaseWebhook): AlertEvent | null {
  const table = payload.table;
  const record = payload.record;
  if (payload.type !== "INSERT" || !table || !record || !EVENT_LABELS[table]) return null;

  // A chat record only becomes an owner alert after qualification. Regular chat
  // messages continue to be retained in the CRM without creating alert noise.
  if (table === "chatbot_conversations" && record.qualified !== true) return null;

  const entityId = optionalValue(record.id);
  if (!entityId) return null;
  const occurredAt = optionalValue(record.created_at) ?? new Date().toISOString();

  return {
    eventType: table === "chatbot_conversations" ? "qualified_chat_lead" : table,
    entityType: table,
    entityId,
    source: "supabase_database_webhook",
    occurredAt,
    requestId: null,
    message: buildMessage(table, record),
    idempotencyKey: `supabase:${table}:${entityId}:insert`,
  };
}

async function writeDelivery(
  env: Env,
  event: AlertEvent,
  status: "sent" | "failed" | "skipped",
  providerStatus: number | null,
  providerResponse: string | null,
) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/notification_deliveries?on_conflict=organisation_id,channel,idempotency_key`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      organisation_id: env.COSSA_ORGANISATION_ID,
      event_type: event.eventType,
      entity_type: event.entityType,
      entity_id: event.entityId,
      source: event.source,
      request_id: event.requestId,
      channel: "callmebot_whatsapp",
      status,
      idempotency_key: event.idempotencyKey,
      provider_status: providerStatus,
      provider_response: providerResponse ? truncate(providerResponse, 800) : null,
      occurred_at: event.occurredAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase delivery audit failed with ${response.status}`);
  }
}

const DAILY_DIGEST_EVENT_TYPE = "daily_attention_digest";
const DAILY_DIGEST_TIME_ZONE = "Africa/Johannesburg";
const DAILY_DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

function supabaseHeaders(env: Env, extras: Record<string, string> = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extras,
  };
}

function localDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_DIGEST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${readPart("year")}-${readPart("month")}-${readPart("day")}`;
}

function localDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: DAILY_DIGEST_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

async function fetchExactCount(
  env: Env,
  table: string,
  params: Record<string, string>,
) {
  const endpoint = new URL(
    `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}`,
  );

  endpoint.search = new URLSearchParams({
    select: "id",
    ...params,
  }).toString();

  const response = await fetch(endpoint, {
    headers: supabaseHeaders(env, {
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });

  if (!response.ok) {
    throw new Error(`Daily digest query failed for ${table} with ${response.status}`);
  }

  const contentRange = response.headers.get("content-range") ?? "";
  const count = Number(contentRange.split("/").at(-1));

  if (!Number.isFinite(count)) {
    throw new Error(`Daily digest count was unavailable for ${table}`);
  }

  return count;
}

async function alreadyDeliveredDailyDigest(env: Env, idempotencyKey: string) {
  const endpoint = new URL(
    `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/notification_deliveries`,
  );

  endpoint.search = new URLSearchParams({
    select: "status",
    organisation_id: `eq.${env.COSSA_ORGANISATION_ID}`,
    channel: "eq.callmebot_whatsapp",
    idempotency_key: `eq.${idempotencyKey}`,
    limit: "1",
  }).toString();

  const response = await fetch(endpoint, {
    headers: supabaseHeaders(env),
  });

  if (!response.ok) {
    throw new Error(`Daily digest delivery check failed with ${response.status}`);
  }

  const rows = await response.json<{ status?: unknown }[]>();
  return rows[0]?.status === "sent" || rows[0]?.status === "skipped";
}

async function buildDailyAttentionEvent(
  env: Env,
  scheduledTime: number,
): Promise<AlertEvent | null> {
  const now = new Date(scheduledTime || Date.now());
  const since = new Date(now.getTime() - DAILY_DIGEST_WINDOW_MS).toISOString();
  const dateKey = localDateKey(now);
  const idempotencyKey = `daily-attention:${dateKey}`;

  if (await alreadyDeliveredDailyDigest(env, idempotencyKey)) {
    return null;
  }

  const organisation = `eq.${env.COSSA_ORGANISATION_ID}`;
  const createdSince = `gte.${since}`;

  const [newLeads, awaitingApproval, failedRuns, failedNotifications] =
    await Promise.all([
      fetchExactCount(env, "leads", {
        organisation_id: organisation,
        created_at: createdSince,
      }),
      fetchExactCount(env, "missions", {
        organisation_id: organisation,
        status: "eq.awaiting_approval",
      }),
      fetchExactCount(env, "mission_runs", {
        organisation_id: organisation,
        status: "eq.failed",
        completed_at: createdSince,
      }),
      fetchExactCount(env, "notification_deliveries", {
        organisation_id: organisation,
        status: "eq.failed",
        created_at: createdSince,
      }),
    ]);

  const attention = [
    newLeads ? `${newLeads} new lead${newLeads === 1 ? "" : "s"} in the last 24 hours` : null,
    awaitingApproval ? `${awaitingApproval} mission${awaitingApproval === 1 ? "" : "s"} awaiting owner approval` : null,
    failedRuns ? `${failedRuns} workforce run failure${failedRuns === 1 ? "" : "s"} in the last 24 hours` : null,
    failedNotifications ? `${failedNotifications} notification delivery failure${failedNotifications === 1 ? "" : "s"} in the last 24 hours` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    eventType: DAILY_DIGEST_EVENT_TYPE,
    entityType: "daily_attention_digest",
    entityId: dateKey,
    source: "cloudflare_scheduled",
    occurredAt: now.toISOString(),
    requestId: null,
    idempotencyKey,
    message: [
      "*COSSA NEXUS — DAILY ATTENTION BRIEFING*",
      `Date: ${localDateLabel(now)} (SAST)`,
      "",
      ...(attention.length
        ? attention.map((item) => `• ${item}`)
        : ["• No new operational attention items were recorded in the last 24 hours."]),
      "",
      "Social media: No authorised social analytics or publishing connection is available, so this briefing cannot claim platform checks. Review the Growth social queue before manual posting.",
      "Action: Open GROWTH to review recorded leads, approvals, failures and scheduled content.",
    ].join("\n"),
  };
}

async function runDailyAttentionDigest(env: Env, scheduledTime: number) {
  const event = await buildDailyAttentionEvent(env, scheduledTime);
  if (!event) {
    console.log("Daily attention briefing already delivered.");
    return;
  }

  await notifyOwner(env, event);
  console.log("Daily attention briefing delivered.", {
    date: event.entityId,
    eventType: event.eventType,
  });
}

async function notifyOwner(env: Env, event: AlertEvent) {
  const endpoint = new URL("https://api.callmebot.com/whatsapp.php");
  endpoint.searchParams.set("phone", env.CALLMEBOT_OWNER_PHONE);
  endpoint.searchParams.set("text", event.message.slice(0, MAX_MESSAGE_LENGTH));
  endpoint.searchParams.set("apikey", env.CALLMEBOT_API_KEY);

  const response = await fetch(endpoint, { method: "GET" });
  const providerResponse = await response.text();
  const status = response.ok ? "sent" : "failed";

  await writeDelivery(env, event, status, response.status, providerResponse);
  if (!response.ok) throw new Error(`CallMeBot rejected the alert with ${response.status}`);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ status: "ok" });
    if (request.method !== "POST" || url.pathname !== "/v1/supabase-alert") return json({ error: "Not found" }, 404);

    const suppliedSecret = request.headers.get("x-cossa-alert-secret") ?? "";
    if (!constantTimeEquals(suppliedSecret, env.ALERT_SHARED_SECRET)) return json({ error: "Unauthorized" }, 401);

    let webhook: SupabaseWebhook;
    try {
      webhook = await request.json<SupabaseWebhook>();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const event = toAlertEvent(webhook);
    if (!event) return json({ status: "ignored" }, 202);

    if (env.ALERT_DEDUP) {
      const seen = await env.ALERT_DEDUP.get(event.idempotencyKey);
      if (seen) return json({ status: "duplicate", eventId: event.entityId }, 200);
    }

    try {
      await notifyOwner(env, event);
      if (env.ALERT_DEDUP) await env.ALERT_DEDUP.put(event.idempotencyKey, "sent", { expirationTtl: 60 * 60 * 24 * 30 });
      return json({ status: "sent", eventId: event.entityId }, 202);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Alert delivery failed";
      try {
        await writeDelivery(env, event, "failed", null, message);
      } catch {
        // The original provider failure remains the actionable result.
      }
      return json({ error: "Alert delivery failed" }, 502);
    }
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
  ): Promise<void> {
    try {
      await runDailyAttentionDigest(
        env,
        Number.isFinite(controller.scheduledTime)
          ? controller.scheduledTime
          : Date.now(),
      );
    } catch (error) {
      console.error("Daily attention briefing failed.", error);
      throw error;
    }
  },
};