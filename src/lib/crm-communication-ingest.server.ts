import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const MAX_SUMMARY_CHARS = 500;
const MAX_SUBJECT_CHARS = 240;
const MAX_NOTES_CHARS = 1000;
const MAX_URL_CHARS = 2048;

function requiredEnv(name: "CRM_COMMUNICATION_INGEST_SECRET" | "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function storageClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

function optionalText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, maxChars) : null;
}

function requiredText(value: unknown, field: string, maxChars = 120): string {
  const clean = optionalText(value, maxChars);
  if (!clean) throw new Error(`${field} is required.`);
  return clean;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function safeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function timingSafeSecretMatch(actual: string | null): boolean {
  if (!actual) return false;
  const expected = requiredEnv("CRM_COMMUNICATION_INGEST_SECRET");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function verifyCommunicationIngestRequest(headers: Headers): boolean {
  return timingSafeSecretMatch(headers.get("x-cossa-ingest-secret"));
}

export type CompactCommunicationIngest = {
  important?: boolean;
  channel?: unknown;
  provider?: unknown;
  direction?: unknown;
  category?: unknown;
  status?: unknown;
  priority?: unknown;
  requires_action?: unknown;
  contact_name?: unknown;
  contact_email?: unknown;
  contact_phone?: unknown;
  company_name?: unknown;
  subject?: unknown;
  highlight?: unknown;
  external_message_id?: unknown;
  external_thread_id?: unknown;
  external_url?: unknown;
  next_review_at?: unknown;
  occurred_at?: unknown;
  notes?: unknown;
  lead_id?: unknown;
  opportunity_id?: unknown;
  customer_id?: unknown;
  company_id?: unknown;
};

export async function ingestCompactCommunication(payload: CompactCommunicationIngest) {
  if (!booleanValue(payload.important)) {
    return { accepted: false, reason: "not-important" as const };
  }

  const provider = requiredText(payload.provider, "Provider", 80).toLowerCase();
  const externalMessageId = requiredText(payload.external_message_id, "External message ID", 250);
  const externalUrl = requiredText(payload.external_url, "External source URL", MAX_URL_CHARS);

  const direction = requiredText(payload.direction ?? "inbound", "Direction", 20);
  if (!["inbound", "outbound", "internal"].includes(direction)) {
    throw new Error("Unsupported direction.");
  }

  const priority = requiredText(payload.priority ?? "normal", "Priority", 20);
  if (!["urgent", "high", "normal", "low"].includes(priority)) {
    throw new Error("Unsupported priority.");
  }

  const row = {
    organisation_id: COSSA_ORGANISATION_ID,
    lead_id: optionalText(payload.lead_id, 64),
    opportunity_id: optionalText(payload.opportunity_id, 64),
    customer_id: optionalText(payload.customer_id, 64),
    company_id: optionalText(payload.company_id, 64),
    channel: requiredText(payload.channel, "Channel", 50),
    provider,
    direction,
    category: requiredText(payload.category ?? "other", "Category", 80),
    status: requiredText(payload.status ?? "open", "Status", 40),
    priority,
    requires_action: booleanValue(payload.requires_action),
    contact_name: optionalText(payload.contact_name, 160),
    contact_email: optionalText(payload.contact_email, 254),
    contact_phone: optionalText(payload.contact_phone, 64),
    company_name: optionalText(payload.company_name, 180),
    subject: optionalText(payload.subject, MAX_SUBJECT_CHARS),
    summary: optionalText(payload.highlight, MAX_SUMMARY_CHARS),
    external_message_id: externalMessageId,
    external_thread_id: optionalText(payload.external_thread_id, 250),
    external_url: externalUrl,
    next_review_at: safeIsoDate(payload.next_review_at),
    occurred_at: safeIsoDate(payload.occurred_at) ?? new Date().toISOString(),
    notes: optionalText(payload.notes, MAX_NOTES_CHARS),
    metadata: {
      storage_policy: "highlight_only",
      source_of_truth: provider,
      full_content_stored: false,
    },
    updated_at: new Date().toISOString(),
  };

  const supabase = storageClient();
  const { data, error } = await supabase
    .from("crm_communications")
    .upsert(row, {
      onConflict: "organisation_id,provider,external_message_id",
      ignoreDuplicates: false,
    })
    .select("id,external_message_id,provider,requires_action,next_review_at")
    .single();

  if (error) throw new Error(`Communication ingest failed: ${error.message}`);

  return { accepted: true, record: data };
}
