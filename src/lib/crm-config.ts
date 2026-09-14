import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

export type CrmOption = {
  id: string;
  organisation_id: string;
  category: string;
  key: string;
  label: string;
  semantic_status: "prospect" | "qualified" | "engaged" | "won" | "lost" | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const db = supabase as unknown as {
  from: (table: string) => any;
};

function cleanText(value: unknown, field: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

export const crmOptions = {
  list: async (category?: string, includeInactive = true): Promise<CrmOption[]> => {
    let query = db
      .from("crm_option_values")
      .select("*")
      .eq("organisation_id", COSSA_ORGANISATION_ID);

    if (category) query = query.eq("category", category);
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) throw new Error(`Unable to load CRM settings: ${error.message}`);
    return (data ?? []) as CrmOption[];
  },

  create: async (payload: Partial<CrmOption>): Promise<CrmOption> => {
    const row = {
      organisation_id: COSSA_ORGANISATION_ID,
      category: cleanText(payload.category, "Category"),
      key: cleanText(payload.key, "Key").toLowerCase().replace(/[^a-z0-9_-]+/g, "_"),
      label: cleanText(payload.label, "Label"),
      semantic_status: payload.semantic_status || null,
      sort_order: Number.isFinite(Number(payload.sort_order)) ? Number(payload.sort_order) : 100,
      is_active: payload.is_active ?? true,
      metadata: payload.metadata ?? {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db.from("crm_option_values").insert(row).select("*").single();
    if (error) throw new Error(`Unable to create CRM option: ${error.message}`);
    return data as CrmOption;
  },

  update: async (id: string, patch: Partial<CrmOption>): Promise<void> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.category !== undefined) row.category = cleanText(patch.category, "Category");
    if (patch.key !== undefined) row.key = cleanText(patch.key, "Key").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    if (patch.label !== undefined) row.label = cleanText(patch.label, "Label");
    if (patch.semantic_status !== undefined) row.semantic_status = patch.semantic_status || null;
    if (patch.sort_order !== undefined) row.sort_order = Number(patch.sort_order) || 0;
    if (patch.is_active !== undefined) row.is_active = Boolean(patch.is_active);
    if (patch.metadata !== undefined) row.metadata = patch.metadata ?? {};

    const { error } = await db
      .from("crm_option_values")
      .update(row)
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID);
    if (error) throw new Error(`Unable to update CRM option: ${error.message}`);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await db
      .from("crm_option_values")
      .delete()
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID);
    if (error) throw new Error(`Unable to delete CRM option: ${error.message}`);
  },
};
