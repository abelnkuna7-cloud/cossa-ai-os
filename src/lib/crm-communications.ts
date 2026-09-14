import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

export type CrmCommunication = {
  id: string;
  organisation_id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  customer_id: string | null;
  company_id: string | null;
  channel: string;
  provider: string | null;
  direction: "inbound" | "outbound" | "internal";
  category: string;
  status: string;
  priority: "urgent" | "high" | "normal" | "low";
  requires_action: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  subject: string | null;
  summary: string | null;
  external_message_id: string | null;
  external_thread_id: string | null;
  external_url: string | null;
  next_review_at: string | null;
  occurred_at: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

function optionalText(value: unknown, maxChars?: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  return maxChars ? clean.slice(0, maxChars) : clean;
}

function requiredText(value: unknown, field: string): string {
  const clean = optionalText(value);
  if (!clean) throw new Error(`${field} is required.`);
  return clean;
}

function cleanPhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  return digits;
}

export function communicationEmailComposeUrl(email: string | null): string | null {
  const clean = optionalText(email);
  return clean ? `mailto:${encodeURIComponent(clean)}` : null;
}

export function communicationWhatsAppUrl(phone: string | null): string | null {
  const clean = optionalText(phone);
  if (!clean) return null;
  const digits = cleanPhoneForWhatsApp(clean);
  return digits ? `https://wa.me/${digits}` : null;
}

export const crmCommunications = {
  list: async (): Promise<CrmCommunication[]> => {
    const { data, error } = await db
      .from("crm_communications")
      .select("*")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .order("requires_action", { ascending: false })
      .order("next_review_at", { ascending: true, nullsFirst: false })
      .order("occurred_at", { ascending: false });

    if (error) throw new Error(`Unable to load CRM communications: ${error.message}`);
    return (data ?? []) as CrmCommunication[];
  },

  actionCount: async (): Promise<number> => {
    const { count, error } = await db
      .from("crm_communications")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("requires_action", true)
      .neq("status", "resolved");

    if (error) throw new Error(`Unable to count CRM communication actions: ${error.message}`);
    return count ?? 0;
  },

  create: async (payload: Partial<CrmCommunication>): Promise<CrmCommunication> => {
    const row = {
      organisation_id: COSSA_ORGANISATION_ID,
      lead_id: payload.lead_id ?? null,
      opportunity_id: payload.opportunity_id ?? null,
      customer_id: payload.customer_id ?? null,
      company_id: payload.company_id ?? null,
      channel: requiredText(payload.channel, "Channel"),
      provider: optionalText(payload.provider),
      direction: payload.direction ?? "inbound",
      category: requiredText(payload.category ?? "other", "Category"),
      status: requiredText(payload.status ?? "open", "Status"),
      priority: payload.priority ?? "normal",
      requires_action: payload.requires_action ?? false,
      contact_name: optionalText(payload.contact_name, 160),
      contact_email: optionalText(payload.contact_email, 254),
      contact_phone: optionalText(payload.contact_phone, 64),
      company_name: optionalText(payload.company_name, 180),
      subject: optionalText(payload.subject, 240),
      summary: optionalText(payload.summary, 500),
      external_message_id: optionalText(payload.external_message_id, 250),
      external_thread_id: optionalText(payload.external_thread_id, 250),
      external_url: optionalText(payload.external_url, 2048),
      next_review_at: payload.next_review_at ?? null,
      occurred_at: payload.occurred_at ?? new Date().toISOString(),
      notes: optionalText(payload.notes, 1000),
      metadata: payload.metadata ?? {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db.from("crm_communications").insert(row).select("*").single();
    if (error) throw new Error(`Unable to create CRM communication: ${error.message}`);
    return data as CrmCommunication;
  },

  update: async (id: string, patch: Partial<CrmCommunication>): Promise<void> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const textFieldLimits: Partial<Record<keyof CrmCommunication, number>> = {
      contact_name: 160,
      contact_email: 254,
      contact_phone: 64,
      company_name: 180,
      subject: 240,
      summary: 500,
      external_message_id: 250,
      external_thread_id: 250,
      external_url: 2048,
      notes: 1000,
    };
    const textFields: (keyof CrmCommunication)[] = [
      "channel",
      "provider",
      "category",
      "status",
      "contact_name",
      "contact_email",
      "contact_phone",
      "company_name",
      "subject",
      "summary",
      "external_message_id",
      "external_thread_id",
      "external_url",
      "notes",
    ];

    for (const key of textFields) {
      if (patch[key] !== undefined) row[key] = optionalText(patch[key], textFieldLimits[key]);
    }

    for (const key of ["lead_id", "opportunity_id", "customer_id", "company_id", "next_review_at"] as const) {
      if (patch[key] !== undefined) row[key] = patch[key] ?? null;
    }

    if (patch.direction !== undefined) row.direction = patch.direction;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.requires_action !== undefined) row.requires_action = patch.requires_action;
    if (patch.occurred_at !== undefined) row.occurred_at = patch.occurred_at;
    if (patch.metadata !== undefined) row.metadata = patch.metadata ?? {};

    const { error } = await db
      .from("crm_communications")
      .update(row)
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID);

    if (error) throw new Error(`Unable to update CRM communication: ${error.message}`);
  },
};
