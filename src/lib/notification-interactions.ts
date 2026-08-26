import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as { from: (table: string) => any };

export type NotificationAction = "opened" | "resolved" | "dismissed" | "snoozed" | "escalated";

export interface NotificationInteraction {
  id: string;
  notification_key: string;
  entity_type: string;
  entity_id: string;
  action: NotificationAction;
  action_reason: string | null;
  snoozed_until: string | null;
  occurred_at: string;
}

export async function listNotificationInteractions(): Promise<NotificationInteraction[]> {
  const { data, error } = await db
    .from("notification_interactions")
    .select("id,notification_key,entity_type,entity_id,action,action_reason,snoozed_until,occurred_at")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Notification action history is unavailable: ${error.message}`);
  return (data ?? []) as NotificationInteraction[];
}

export async function recordNotificationInteraction(input: {
  notificationKey: string;
  entityType: string;
  entityId: string;
  action: NotificationAction;
  reason?: string | null;
  snoozedUntil?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<NotificationInteraction> {
  const { data, error } = await db
    .from("notification_interactions")
    .insert({
      organisation_id: COSSA_ORGANISATION_ID,
      notification_key: input.notificationKey,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      action_reason: input.reason?.trim() || null,
      snoozed_until: input.action === "snoozed" ? input.snoozedUntil ?? null : null,
      metadata: input.metadata ?? {},
    })
    .select("id,notification_key,entity_type,entity_id,action,action_reason,snoozed_until,occurred_at")
    .single();
  if (error) throw new Error(`Notification action could not be recorded: ${error.message}`);
  return data as NotificationInteraction;
}
