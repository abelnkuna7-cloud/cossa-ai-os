import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type ShowcaseClassification =
  | "capability_sample"
  | "live_cossa_system"
  | "verified_client_work";
export type ShowcasePublicationStatus = "draft" | "internal" | "published" | "archived";
export type ShowcaseApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  business_name: string;
  capability: string;
  industry: string | null;
  classification: ShowcaseClassification;
  asset_type: string;
  platform_channels: string[];
  tags: string[];
  campaign: string | null;
  thumbnail_url: string | null;
  source_asset_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  cta_label: string | null;
  destination_url: string | null;
  publication_status: ShowcasePublicationStatus;
  approval_status: ShowcaseApprovalStatus;
  approval_note: string | null;
  client_authorisation_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShowcaseItemInput {
  title: string;
  description: string;
  business_name: string;
  capability: string;
  industry?: string | null;
  classification: ShowcaseClassification;
  asset_type: string;
  platform_channels?: string[];
  tags?: string[];
  campaign?: string | null;
  thumbnail_url?: string | null;
  source_asset_url?: string | null;
  demo_url?: string | null;
  video_url?: string | null;
  cta_label?: string | null;
  destination_url?: string | null;
  publication_status: ShowcasePublicationStatus;
  approval_status: ShowcaseApprovalStatus;
  approval_note?: string | null;
  client_authorisation_reference?: string | null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function optional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normaliseInput(input: ShowcaseItemInput): Record<string, unknown> {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    business_name: input.business_name.trim(),
    capability: input.capability.trim(),
    industry: optional(input.industry),
    platform_channels: input.platform_channels ?? [],
    tags: input.tags ?? [],
    campaign: optional(input.campaign),
    thumbnail_url: optional(input.thumbnail_url),
    source_asset_url: optional(input.source_asset_url),
    demo_url: optional(input.demo_url),
    video_url: optional(input.video_url),
    cta_label: optional(input.cta_label),
    destination_url: optional(input.destination_url),
    approval_note: optional(input.approval_note),
    client_authorisation_reference: optional(input.client_authorisation_reference),
  };
}

export async function listShowcaseItems(): Promise<ShowcaseItem[]> {
  const { data, error } = await db
    .from("showcase_items")
    .select("*")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load the Showcase Library: ${error.message}`);

  return (data ?? []).map((item: ShowcaseItem) => ({
    ...item,
    platform_channels: stringArray(item.platform_channels),
    tags: stringArray(item.tags),
  }));
}

export async function createShowcaseItem(input: ShowcaseItemInput): Promise<void> {
  const { error } = await db
    .from("showcase_items")
    .insert({ organisation_id: COSSA_ORGANISATION_ID, ...normaliseInput(input) });

  if (error) throw new Error(`Unable to create the showcase record: ${error.message}`);
}

export async function updateShowcaseItem(id: string, input: ShowcaseItemInput): Promise<void> {
  const { error } = await db
    .from("showcase_items")
    .update(normaliseInput(input))
    .eq("id", id)
    .eq("organisation_id", COSSA_ORGANISATION_ID);

  if (error) throw new Error(`Unable to update the showcase record: ${error.message}`);
}
