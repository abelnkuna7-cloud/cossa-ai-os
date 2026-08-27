import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type DbError = { message?: string; details?: string; hint?: string } | null;

function errorMessage(operation: string, error: DbError): Error {
  const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  return new Error(`${operation}${detail ? `: ${detail}` : "."}`);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean || null;
}

function required(value: unknown, label: string): string {
  const clean = text(value);
  if (!clean) throw new Error(`${label} is required.`);
  return clean;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lower(value: unknown, fallback: string): string {
  return text(value)?.toLowerCase() ?? fallback;
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { data, error } = await db.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) throw errorMessage(`Unable to delete ${table} record`, error);
  if (!data) throw new Error(`Unable to delete ${table} record: row not found or access denied.`);
}

export interface GrowthSocialPost {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  hashtags: string | null;
  cta: string | null;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  post_url: string | null;
  posted_at: string | null;
  reach: number;
  engagement: number;
  leads_generated: number;
  created_at: string;
}

const SOCIAL_SELECT = [
  "id",
  "platform",
  "title",
  "content",
  "hashtags",
  "cta",
  "status",
  "scheduled_for",
  "published_at",
  "post_url",
  "posted_at",
  "reach",
  "engagement",
  "leads_generated",
  "created_at",
].join(",");

function socialRow(payload: Partial<GrowthSocialPost>, creating = false): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (creating || payload.platform !== undefined) row.platform = required(payload.platform, "Platform").toLowerCase();
  if (creating || payload.content !== undefined) row.content = required(payload.content, "Content");
  if (payload.title !== undefined) row.title = text(payload.title);
  if (payload.hashtags !== undefined) row.hashtags = text(payload.hashtags);
  if (payload.cta !== undefined) row.cta = text(payload.cta);
  if (payload.scheduled_for !== undefined) row.scheduled_for = text(payload.scheduled_for);
  if (payload.published_at !== undefined) row.published_at = text(payload.published_at);
  if (payload.posted_at !== undefined) row.posted_at = text(payload.posted_at);
  if (payload.post_url !== undefined) row.post_url = text(payload.post_url);
  if (payload.reach !== undefined) row.reach = Math.max(0, Math.round(numberValue(payload.reach)));
  if (payload.engagement !== undefined) row.engagement = Math.max(0, Math.round(numberValue(payload.engagement)));
  if (payload.leads_generated !== undefined) row.leads_generated = Math.max(0, Math.round(numberValue(payload.leads_generated)));

  const status = payload.status !== undefined ? lower(payload.status, "draft") : creating ? "draft" : null;
  if (status) {
    const allowed = ["draft", "scheduled", "published", "posted", "failed"];
    if (!allowed.includes(status)) throw new Error(`Unsupported social-post status: ${status}.`);

    if (status === "scheduled" && !text(payload.scheduled_for)) {
      throw new Error("A scheduled post requires a scheduled date/time.");
    }

    if (["published", "posted"].includes(status)) {
      const hasEvidence = Boolean(text(payload.post_url) || text(payload.published_at) || text(payload.posted_at));
      if (!hasEvidence) {
        throw new Error(
          "Publication evidence is required before a social post can be marked published. Add the real post URL or publication timestamp.",
        );
      }
    }

    row.status = status;
  }

  return row;
}

export const growthSocialPosts = {
  async list(): Promise<GrowthSocialPost[]> {
    const { data, error } = await db.from("social_posts").select(SOCIAL_SELECT).order("created_at", { ascending: false });
    if (error) throw errorMessage("Unable to load social posts", error);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      platform: lower(row.platform, "unknown"),
      title: text(row.title),
      content: text(row.content) ?? "",
      hashtags: text(row.hashtags),
      cta: text(row.cta),
      status: lower(row.status, row.posted_at || row.published_at ? "published" : "draft"),
      scheduled_for: text(row.scheduled_for),
      published_at: text(row.published_at),
      post_url: text(row.post_url),
      posted_at: text(row.posted_at),
      reach: numberValue(row.reach),
      engagement: numberValue(row.engagement),
      leads_generated: numberValue(row.leads_generated),
      created_at: String(row.created_at ?? ""),
    }));
  },

  async create(payload: Partial<GrowthSocialPost>): Promise<GrowthSocialPost> {
    const { data, error } = await db.from("social_posts").insert(socialRow(payload, true)).select(SOCIAL_SELECT).single();
    if (error) throw errorMessage("Unable to create social post", error);
    return (await this.list()).find((row) => row.id === data.id) ?? (data as GrowthSocialPost);
  },

  async update(id: string, payload: Partial<GrowthSocialPost>): Promise<void> {
    const existing = await db.from("social_posts").select(SOCIAL_SELECT).eq("id", id).maybeSingle();
    if (existing.error) throw errorMessage("Unable to load social post before update", existing.error);
    if (!existing.data) throw new Error("Social post not found or access denied.");

    const merged = { ...existing.data, ...payload } as Partial<GrowthSocialPost>;
    const { data, error } = await db.from("social_posts").update(socialRow(merged, false)).eq("id", id).select("id").maybeSingle();
    if (error) throw errorMessage("Unable to update social post", error);
    if (!data) throw new Error("Social post not found or access denied.");
  },

  remove: (id: string) => deleteRow("social_posts", id),
};

export interface GrowthContentItem {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  hashtags: string | null;
  status: string;
  ai_generated: boolean;
  ai_prompt: string | null;
  campaign: string | null;
  scheduled_for: string | null;
  posted_post_id: string | null;
  created_at: string;
}

const CONTENT_SELECT = [
  "id",
  "platform",
  "title",
  "content",
  "hashtags",
  "status",
  "ai_generated",
  "ai_prompt",
  "campaign",
  "scheduled_for",
  "posted_post_id",
  "created_at",
].join(",");

function contentRow(payload: Partial<GrowthContentItem>, creating = false): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (creating || payload.platform !== undefined) row.platform = required(payload.platform, "Platform").toLowerCase();
  if (creating || payload.content !== undefined) row.content = required(payload.content, "Content");
  if (payload.title !== undefined) row.title = text(payload.title);
  if (payload.hashtags !== undefined) row.hashtags = text(payload.hashtags);
  if (payload.campaign !== undefined) row.campaign = text(payload.campaign);
  if (payload.ai_prompt !== undefined) row.ai_prompt = text(payload.ai_prompt);
  if (payload.scheduled_for !== undefined) row.scheduled_for = text(payload.scheduled_for);

  const status = payload.status !== undefined ? lower(payload.status, "draft") : creating ? "draft" : null;
  if (status) {
    const allowed = ["draft", "scheduled", "posted", "failed"];
    if (!allowed.includes(status)) throw new Error(`Unsupported content status: ${status}.`);
    if (status === "scheduled" && !text(payload.scheduled_for)) {
      throw new Error("Scheduled content requires a scheduled date/time.");
    }
    if (status === "posted" && !text(payload.posted_post_id)) {
      throw new Error(
        "A content-calendar item can only be marked posted after it is linked to a real social_posts record.",
      );
    }
    row.status = status;
  }

  if (creating) row.ai_generated = false;
  return row;
}

export const growthContentCalendar = {
  async list(): Promise<GrowthContentItem[]> {
    const { data, error } = await db.from("content_calendar").select(CONTENT_SELECT).order("created_at", { ascending: false });
    if (error) throw errorMessage("Unable to load content calendar", error);
    return (data ?? []) as GrowthContentItem[];
  },

  async create(payload: Partial<GrowthContentItem>): Promise<GrowthContentItem> {
    const { data, error } = await db.from("content_calendar").insert(contentRow(payload, true)).select(CONTENT_SELECT).single();
    if (error) throw errorMessage("Unable to create content-calendar item", error);
    return data as GrowthContentItem;
  },

  async update(id: string, payload: Partial<GrowthContentItem>): Promise<void> {
    const existing = await db.from("content_calendar").select(CONTENT_SELECT).eq("id", id).maybeSingle();
    if (existing.error) throw errorMessage("Unable to load content-calendar item", existing.error);
    if (!existing.data) throw new Error("Content-calendar item not found or access denied.");
    const merged = { ...existing.data, ...payload } as Partial<GrowthContentItem>;
    const { data, error } = await db.from("content_calendar").update(contentRow(merged, false)).eq("id", id).select("id").maybeSingle();
    if (error) throw errorMessage("Unable to update content-calendar item", error);
    if (!data) throw new Error("Content-calendar item not found or access denied.");
  },

  remove: (id: string) => deleteRow("content_calendar", id),
};

export interface GrowthReferral {
  id: string;
  referrer_name: string;
  referrer_phone: string | null;
  referrer_email: string | null;
  referee_name: string;
  referee_phone: string | null;
  referee_email: string | null;
  service: string | null;
  notes: string | null;
  status: string;
  reward_paid: boolean;
  commission_percent: number;
  commission_amount: number;
  created_at: string;
}

const REFERRAL_SELECT = [
  "id",
  "referrer_name",
  "referrer_phone",
  "referrer_email",
  "referee_name",
  "referee_phone",
  "referee_email",
  "service",
  "notes",
  "status",
  "reward_paid",
  "commission_percent",
  "commission_amount",
  "created_at",
].join(",");

function referralRow(payload: Partial<GrowthReferral>, creating = false): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (creating || payload.referrer_name !== undefined) row.referrer_name = required(payload.referrer_name, "Referrer name");
  if (creating || payload.referee_name !== undefined) row.referee_name = required(payload.referee_name, "Referred client name");
  if (payload.referrer_phone !== undefined) row.referrer_phone = text(payload.referrer_phone);
  if (payload.referrer_email !== undefined) row.referrer_email = text(payload.referrer_email);
  if (payload.referee_phone !== undefined) row.referee_phone = text(payload.referee_phone);
  if (payload.referee_email !== undefined) row.referee_email = text(payload.referee_email);
  if (payload.service !== undefined) row.service = text(payload.service);
  if (payload.notes !== undefined) row.notes = text(payload.notes);
  if (payload.status !== undefined || creating) row.status = lower(payload.status, "pending");
  if (payload.commission_percent !== undefined || creating) row.commission_percent = Math.max(0, numberValue(payload.commission_percent, 10));
  if (payload.commission_amount !== undefined || creating) row.commission_amount = Math.max(0, numberValue(payload.commission_amount, 0));
  return row;
}

export const growthReferrals = {
  async list(): Promise<GrowthReferral[]> {
    const { data, error } = await db.from("referrals").select(REFERRAL_SELECT).order("created_at", { ascending: false });
    if (error) throw errorMessage("Unable to load referrals", error);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      id: String(row.id),
      referrer_name: String(row.referrer_name ?? ""),
      referee_name: String(row.referee_name ?? ""),
      referrer_phone: text(row.referrer_phone),
      referrer_email: text(row.referrer_email),
      referee_phone: text(row.referee_phone),
      referee_email: text(row.referee_email),
      service: text(row.service),
      notes: text(row.notes),
      status: lower(row.status, "pending"),
      reward_paid: row.reward_paid === true,
      commission_percent: numberValue(row.commission_percent),
      commission_amount: numberValue(row.commission_amount),
      created_at: String(row.created_at ?? ""),
    })) as GrowthReferral[];
  },

  async create(payload: Partial<GrowthReferral>): Promise<GrowthReferral> {
    const { data, error } = await db.from("referrals").insert(referralRow(payload, true)).select(REFERRAL_SELECT).single();
    if (error) throw errorMessage("Unable to create referral", error);
    return data as GrowthReferral;
  },

  async update(id: string, payload: Partial<GrowthReferral>): Promise<void> {
    const { data, error } = await db.from("referrals").update(referralRow(payload, false)).eq("id", id).select("id").maybeSingle();
    if (error) throw errorMessage("Unable to update referral", error);
    if (!data) throw new Error("Referral not found or access denied.");
  },

  remove: (id: string) => deleteRow("referrals", id),
};
