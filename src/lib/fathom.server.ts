import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const FATHOM_API_BASE = "https://api.fathom.ai/external/v1";

function requiredEnv(name: "FATHOM_API_KEY" | "FATHOM_WEBHOOK_SECRET" | "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function createFathomStorageClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

export async function checkFathomConnection() {
  const response = await fetch(`${FATHOM_API_BASE}/meetings?limit=1`, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": requiredEnv("FATHOM_API_KEY"),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fathom API ${response.status}: ${body.slice(0, 250)}`);
  }

  const payload = (await response.json()) as {
    items?: unknown[];
    next_cursor?: string | null;
  };

  return {
    ok: true,
    provider: "fathom",
    apiReachable: true,
    authenticated: true,
    sampleMeetingCount: payload.items?.length ?? 0,
    hasMore: Boolean(payload.next_cursor),
  };
}

export function verifyFathomWebhook(headers: Headers, rawBody: string, toleranceSeconds = 300) {
  const webhookId = headers.get("webhook-id") ?? "";
  const webhookTimestamp = headers.get("webhook-timestamp") ?? "";
  const webhookSignature = headers.get("webhook-signature") ?? "";
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const timestamp = Number.parseInt(webhookTimestamp, 10);
  if (!Number.isFinite(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const webhookSecret = requiredEnv("FATHOM_WEBHOOK_SECRET");
  if (!webhookSecret.startsWith("whsec_")) return false;

  const secretBytes = Buffer.from(webhookSecret.slice("whsec_".length), "base64");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return webhookSignature
    .split(" ")
    .map((signature) => signature.trim())
    .filter(Boolean)
    .map((signature) => {
      const commaIndex = signature.indexOf(",");
      return commaIndex >= 0 ? signature.slice(commaIndex + 1) : signature;
    })
    .some((signature) => {
      const expectedBuffer = Buffer.from(expected);
      const actualBuffer = Buffer.from(signature);
      return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function storeFathomMeeting(payload: Record<string, unknown>, webhookId: string) {
  const recordingId = String(payload.recording_id ?? webhookId);
  const title = stringValue(payload.meeting_title) ?? stringValue(payload.title) ?? "Fathom meeting";
  const recordingUrl = stringValue(payload.share_url) ?? stringValue(payload.url);
  const startedAt = stringValue(payload.recording_start_time) ?? stringValue(payload.scheduled_start_time);
  const endedAt = stringValue(payload.recording_end_time) ?? stringValue(payload.scheduled_end_time);

  const supabase = createFathomStorageClient();
  const { error } = await supabase.from("meeting_intelligence").upsert(
    {
      provider: "fathom",
      provider_meeting_id: recordingId,
      event_type: "new_meeting_content_ready",
      title,
      started_at: startedAt,
      ended_at: endedAt,
      recording_url: recordingUrl,
      attendees: payload.calendar_invitees ?? [],
      transcript: payload.transcript ?? null,
      summary: payload.default_summary ?? null,
      action_items: payload.action_items ?? [],
      raw_payload: payload,
      last_webhook_id: webhookId,
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_meeting_id" },
  );

  if (error) throw new Error(`Fathom storage failed: ${error.message}`);
  return { recordingId, title };
}
