import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = asDynamicSupabaseClient(supabase);

export type NotificationEventCategory =
  | "revenue"
  | "sales"
  | "customer"
  | "approval"
  | "workforce"
  | "operations"
  | "supplier"
  | "store"
  | "compliance"
  | "security"
  | "system";

export type NotificationEventSeverity = "critical" | "high" | "normal" | "info";

export interface NotificationEvent {
  id: string;
  organisation_id: string;
  event_key: string;
  category: NotificationEventCategory;
  severity: NotificationEventSeverity;
  source_type: string;
  source_id: string | null;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  action_href: string | null;
  occurred_at: string;
  recorded_at: string;
  metadata: Record<string, unknown>;
}

export async function listNotificationEvents(limit = 250): Promise<NotificationEvent[]> {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  const { data, error } = await db
    .from<NotificationEvent>("notification_events")
    .select(
      "id,organisation_id,event_key,category,severity,source_type,source_id,title,summary,evidence,action_href,occurred_at,recorded_at,metadata",
    )
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`Notification event stream is unavailable: ${error.message}`);
  return (data ?? []) as NotificationEvent[];
}

export function notificationEventRank(event: Pick<NotificationEvent, "severity" | "occurred_at">) {
  const severityRank: Record<NotificationEventSeverity, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    info: 3,
  };

  return {
    severity: severityRank[event.severity],
    occurredAt: Date.parse(event.occurred_at) || 0,
  };
}

export function sortNotificationEvents(events: readonly NotificationEvent[]): NotificationEvent[] {
  return [...events].sort((left, right) => {
    const a = notificationEventRank(left);
    const b = notificationEventRank(right);
    if (a.severity !== b.severity) return a.severity - b.severity;
    return b.occurredAt - a.occurredAt;
  });
}
