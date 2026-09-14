import { streamChatWithMetadata, type AiExecutionMetadata } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { contentAssistantCalendarStatus, creativeHandoffResult, sanitiseMarketingOutput } from "@/lib/operational-truth";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";
import { getMarketingDestinationLinks, resolveMarketingDestination } from "@/lib/marketing-links";
import { socialBusinessKnowledge, socialObjectiveGuidance, type SocialBusinessKey, type SocialObjective } from "@/lib/social-business-intelligence";

const db = supabase as unknown as { from: (table: string) => any };

export function sanitiseMarketingText(value: unknown): string {
  return sanitiseMarketingOutput(value);
}

export function rewriteContentCommand(input: { instruction: string; mode: "shorter" | "stronger" | "platform"; platform?: string }): string {
  const platform = input.platform?.trim() || "the selected platform";
  if (input.mode === "shorter") return `Rewrite this shorter for ${platform}:\n${input.instruction}`;
  if (input.mode === "stronger") return `Rewrite this with a clearer, stronger customer benefit for ${platform}:\n${input.instruction}`;
  return `Adapt this for ${platform}; keep it customer-ready and natural:\n${input.instruction}`;
}

export async function generateContentDraft(input: { instruction: string; platform: string; onToken?: (text: string) => void }): Promise<{ content: string; metadata: AiExecutionMetadata }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Describe the content you want to create.");
  const result = await streamChatWithMetadata(
    [{ role: "user", content: instruction }],
    input.onToken ?? (() => undefined),
    {
      provider: "auto",
      system: [
        "You are the Cossa Content Assistant.",
        `Write only polished customer-ready copy for ${input.platform || "the requested channel"}.`,
        "Use concise, natural South African business English.",
        "Do not use markdown, headings, bullets, labels, code fences, internal notes, model metadata or reasoning.",
        "Do not claim a post was published, an image was generated, or an external action was completed.",
      ].join(" "),
    },
  );
  const content = sanitiseMarketingText(result.content);
  if (!content) throw new Error("The content provider returned no usable customer-facing copy.");
  return { content, metadata: result.metadata };
}

export type SocialContentPack = {
  title: string;
  hook: string;
  caption: string;
  content: string;
  hashtags: string;
  cta: string;
  best_time: string;
  visual_idea: string;
  destination_key: string;
  link: string;
  business_key: string;
  objective: string;
};

const PACK_KEYS = ["title", "hook", "caption", "content", "hashtags", "cta", "best_time", "visual_idea", "destination_key", "business_key", "objective"] as const;

type RawSocialPack = Record<(typeof PACK_KEYS)[number], unknown>;

function parseLabelledPack(raw: string): Partial<RawSocialPack> {
  const result: Partial<RawSocialPack> = {};
  const aliases: Record<string, (typeof PACK_KEYS)[number]> = {
    TITLE: "title",
    HOOK: "hook",
    CAPTION: "caption",
    CONTENT: "content",
    HASHTAGS: "hashtags",
    CTA: "cta",
    BEST_TIME: "best_time",
    BESTTIME: "best_time",
    VISUAL_IDEA: "visual_idea",
    VISUALIDEA: "visual_idea",
    DESTINATION_KEY: "destination_key",
    DESTINATIONKEY: "destination_key",
    BUSINESS_KEY: "business_key",
    BUSINESSKEY: "business_key",
    OBJECTIVE: "objective",
  };

  const marker = /^\s*(TITLE|HOOK|CAPTION|CONTENT|HASHTAGS|CTA|BEST_TIME|BESTTIME|VISUAL_IDEA|VISUALIDEA|DESTINATION_KEY|DESTINATIONKEY|BUSINESS_KEY|BUSINESSKEY|OBJECTIVE)\s*:\s*/gim;
  const matches = [...raw.matchAll(marker)];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const key = aliases[String(current[1]).toUpperCase()];
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? raw.length;
    if (key) result[key] = raw.slice(start, end).trim();
  }
  return result;
}

function parseSocialPack(rawResponse: string): RawSocialPack {
  const cleaned = rawResponse
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const candidates = [cleaned];
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      return Object.fromEntries(PACK_KEYS.map((key) => [key, parsed[key] ?? ""])) as RawSocialPack;
    } catch {
      try {
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(withoutTrailingCommas) as Record<string, unknown>;
        return Object.fromEntries(PACK_KEYS.map((key) => [key, parsed[key] ?? ""])) as RawSocialPack;
      } catch {
        // Try labelled output below.
      }
    }
  }

  const labelled = parseLabelledPack(cleaned);
  if (labelled.caption || labelled.content || labelled.hook) {
    return Object.fromEntries(PACK_KEYS.map((key) => [key, labelled[key] ?? ""])) as RawSocialPack;
  }

  throw new Error("The Social Media Specialist received a response it could not format. Please try again.");
}

export async function generateSocialContentPack(input: { instruction: string; platform: string; business?: SocialBusinessKey; objective?: SocialObjective }): Promise<{ pack: SocialContentPack; metadata: AiExecutionMetadata }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Tell the Social Media Assistant what you want, for example: NexDocs pain-point post.");

  const business = input.business ?? "auto";
  const objective = input.objective ?? "auto";
  const approvedLinks = await getMarketingDestinationLinks();
  const linkDirectory = Object.entries(approvedLinks).map(([key, url]) => `${key}: ${url}`).join("; ");

  const result = await streamChatWithMetadata(
    [{ role: "user", content: instruction }],
    () => undefined,
    {
      provider: "auto",
      system: [
        "You are Cossa Social Media Manager, Social Media Specialist, Content Strategist, Content Creator and Content Writer. Do the strategic and writing work; do not make the operator construct the post for you.",
        `Platform: ${input.platform}. Selected business: ${business}. Selected objective: ${objective}.`,
        `VERIFIED COSSA BUSINESS KNOWLEDGE:\n${socialBusinessKnowledge(business)}`,
        `CONTENT OBJECTIVE RULE: ${socialObjectiveGuidance(objective)}`,
        "If business is auto, infer the single relevant Cossa business from the user's brief and verified knowledge. If objective is auto, infer the single strongest objective. Do not mix sales, awareness, education and engagement indiscriminately.",
        "Truth rule: use only facts in VERIFIED COSSA BUSINESS KNOWLEDGE, the operator brief, and approved links. Never invent capabilities, prices, discounts, stock, statistics, guarantees, testimonials, customers, integrations, results, locations or promotions. If a requested factual claim is unsupported, omit it rather than imagine it.",
        "Position each business according to its actual business model. Do not write SaaS like construction, ecommerce like consulting, the parent group like a subsidiary, or awareness copy like a hard-sale advertisement.",
        `Only approved destination links: ${linkDirectory || "default destination unavailable"}. Choose the destination_key matching the identified business. Never invent or alter a URL; the application attaches it after generation.`,
        "Return a structured content pack. Preferred format is valid JSON with these keys: title, hook, caption, content, hashtags, cta, best_time, visual_idea, destination_key, business_key, objective. If your provider cannot emit valid JSON, return the same fields as labelled lines in this exact style: TITLE:, HOOK:, CAPTION:, CONTENT:, HASHTAGS:, CTA:, BEST_TIME:, VISUAL_IDEA:, DESTINATION_KEY:, BUSINESS_KEY:, OBJECTIVE:.",
        "Write natural South African business English. The hook must fit the selected objective and audience. Hashtags must be relevant, not spammy. CTA intensity must match the objective: awareness/education can use a softer next step; sales/lead generation should use a clear commercial action.",
        "Do not say link below or link in bio unless appropriate; prefer a direct CTA matching the approved destination. best_time is a recommendation, not live analytics, unless evidence is supplied. Do not claim publishing, reach, engagement, trends or external actions without evidence.",
      ].join("\n\n"),
    },
  );

  const parsed = parseSocialPack(result.content);
  const text = (key: keyof RawSocialPack) => sanitiseMarketingText(parsed[key] ?? "");
  const destination = resolveMarketingDestination(approvedLinks, text("destination_key"));
  const pack: SocialContentPack = {
    title: text("title"),
    hook: text("hook"),
    caption: text("caption"),
    content: text("content"),
    hashtags: text("hashtags"),
    cta: text("cta"),
    best_time: text("best_time"),
    visual_idea: text("visual_idea"),
    destination_key: destination.key,
    link: destination.url,
    business_key: text("business_key") || business,
    objective: text("objective") || objective,
  };

  if (!pack.content && !pack.caption) throw new Error("The Social Media Specialist returned no usable post content.");
  return { pack, metadata: result.metadata };
}

export async function createCreativeMediaHandoff(input: { content: string; platform: string; instruction: string }): Promise<{ requestId: string }> {
  const content = sanitiseMarketingText(input.content);
  if (!content) throw new Error("Generate or enter customer-ready copy before sending a creative brief.");
  const state = creativeHandoffResult();
  const { data, error } = await db.from("creative_asset_requests").insert({
    organisation_id: COSSA_ORGANISATION_ID,
    title: `Content calendar visual brief — ${input.platform}`.slice(0, 180),
    request_text: input.instruction.trim().slice(0, 6000),
    asset_type: "social_graphic",
    platform: input.platform.trim().toLowerCase(),
    channels: [input.platform.trim().toLowerCase()],
    requirements: { source: "content_calendar", external_publication_authorised: false, generated_asset_confirmed: false },
    creative_brief: { copy: content, instruction: input.instruction.trim(), action: "brief_only" },
    copy_draft: content,
    lifecycle_status: state.lifecycleStatus,
    blocker_code: "creative_generation_not_started",
    blocker_message: "Creative brief recorded. No visual has been generated or published.",
    metadata: { source: "content_calendar_command" },
  }).select("id").single();
  if (error) throw new Error(`Creative brief could not be recorded: ${error.message}`);
  if (!data?.id) throw new Error("Creative brief did not return a saved request ID.");
  return { requestId: String(data.id) };
}

export const contentAssistantDraftStatus = contentAssistantCalendarStatus;
