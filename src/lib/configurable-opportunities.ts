import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

export type ConfigurableOpportunity = {
  id: string;
  title: string;
  type: string;
  stage: string;
  storage_status: "prospect" | "qualified" | "engaged" | "won" | "lost";
  value: number;
  probability: number;
  expected_close: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const db = supabase as unknown as { from: (table: string) => any };
const STAGE_MARKER = /\[cossa_ui_stage:([a-z0-9_-]+)\]/i;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function required(value: unknown, field: string): string {
  const text = clean(value);
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampProbability(value: unknown): number {
  return Math.max(0, Math.min(100, Math.round(number(value, 20))));
}

function readStage(notes: unknown, status: unknown): string {
  const text = typeof notes === "string" ? notes : "";
  return text.match(STAGE_MARKER)?.[1] ?? String(status ?? "prospect");
}

function removeStageMarker(notes: unknown): string | null {
  if (typeof notes !== "string") return null;
  const text = notes.replace(STAGE_MARKER, "").replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

function addStageMarker(notes: unknown, stage: string): string {
  return [`[cossa_ui_stage:${required(stage, "Pipeline stage")}]`, removeStageMarker(notes)]
    .filter(Boolean)
    .join("\n\n");
}

function mapRow(row: any): ConfigurableOpportunity {
  return {
    id: row.id,
    title: row.organization_name ?? "Untitled opportunity",
    type: row.opportunity_type ?? "general",
    stage: readStage(row.notes, row.status),
    storage_status: row.status ?? "prospect",
    value: number(row.estimated_value, 0),
    probability: clampProbability(row.probability),
    expected_close: row.expected_close ?? null,
    contact_name: row.contact_name ?? null,
    contact_phone: row.contact_phone ?? null,
    contact_email: row.contact_email ?? null,
    location: row.location ?? null,
    notes: removeStageMarker(row.notes),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT = "id,organization_name,opportunity_type,contact_name,contact_phone,contact_email,location,estimated_value,status,notes,probability,expected_close,created_at,updated_at";

export const configurableOpportunities = {
  list: async (): Promise<ConfigurableOpportunity[]> => {
    const { data, error } = await db
      .from("opportunities")
      .select(SELECT)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load opportunities: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  create: async (payload: Partial<ConfigurableOpportunity>): Promise<ConfigurableOpportunity> => {
    const value = number(payload.value, 0);
    if (value < 0) throw new Error("Opportunity value cannot be negative.");

    const row = {
      organisation_id: COSSA_ORGANISATION_ID,
      organization_name: required(payload.title, "Opportunity title"),
      opportunity_type: required(payload.type, "Opportunity type"),
      estimated_value: value,
      status: payload.storage_status ?? "prospect",
      probability: clampProbability(payload.probability),
      expected_close: payload.expected_close || null,
      contact_name: clean(payload.contact_name),
      contact_phone: clean(payload.contact_phone),
      contact_email: clean(payload.contact_email),
      location: clean(payload.location),
      notes: addStageMarker(payload.notes, payload.stage ?? "prospect"),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db.from("opportunities").insert(row).select(SELECT).single();
    if (error) throw new Error(`Unable to create opportunity: ${error.message}`);
    return mapRow(data);
  },

  update: async (id: string, patch: Partial<ConfigurableOpportunity>): Promise<void> => {
    const { data: existing, error: readError } = await db
      .from("opportunities")
      .select(SELECT)
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .maybeSingle();
    if (readError) throw new Error(`Unable to load opportunity: ${readError.message}`);
    if (!existing) throw new Error("Opportunity not found.");

    const current = mapRow(existing);
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.organization_name = required(patch.title, "Opportunity title");
    if (patch.type !== undefined) row.opportunity_type = required(patch.type, "Opportunity type");
    if (patch.value !== undefined) {
      const value = number(patch.value, 0);
      if (value < 0) throw new Error("Opportunity value cannot be negative.");
      row.estimated_value = value;
    }
    if (patch.storage_status !== undefined) row.status = patch.storage_status;
    if (patch.probability !== undefined) row.probability = clampProbability(patch.probability);
    if (patch.expected_close !== undefined) row.expected_close = patch.expected_close || null;
    if (patch.contact_name !== undefined) row.contact_name = clean(patch.contact_name);
    if (patch.contact_phone !== undefined) row.contact_phone = clean(patch.contact_phone);
    if (patch.contact_email !== undefined) row.contact_email = clean(patch.contact_email);
    if (patch.location !== undefined) row.location = clean(patch.location);
    if (patch.notes !== undefined || patch.stage !== undefined) {
      row.notes = addStageMarker(
        patch.notes !== undefined ? patch.notes : current.notes,
        patch.stage !== undefined ? patch.stage : current.stage,
      );
    }

    const { error } = await db
      .from("opportunities")
      .update(row)
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID);
    if (error) throw new Error(`Unable to update opportunity: ${error.message}`);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await db
      .from("opportunities")
      .delete()
      .eq("id", id)
      .eq("organisation_id", COSSA_ORGANISATION_ID);
    if (error) throw new Error(`Unable to delete opportunity: ${error.message}`);
  },
};
