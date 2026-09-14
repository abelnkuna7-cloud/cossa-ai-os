import { streamChatWithMetadata, type AiExecutionMetadata } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { contentAssistantCalendarStatus, creativeHandoffResult, sanitiseMarketingOutput } from "@/lib/operational-truth";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";
import { getMarketingDestinationLinks, resolveMarketingDestination } from "@/lib/marketing-links";

const db = supabase as unknown as { from: (table: string) => any };

export function sanitiseMarketingText(value: unknown): string { return sanitiseMarketingOutput(value); }

export function rewriteContentCommand(input: { instruction: string; mode: "shorter" | "stronger" | "platform"; platform?: string; }): string {
  const platform = input.platform?.trim() || "the selected platform";
  if (input.mode === "shorter") return `Rewrite this shorter for ${platform}:\n${input.instruction}`;
  if (input.mode === "stronger") return `Rewrite this with a clearer, stronger customer benefit for ${platform}:\n${input.instruction}`;
  return `Adapt this for ${platform}; keep it customer-ready and natural:\n${input.instruction}`;
}

export async function generateContentDraft(input: { instruction: string; platform: string; onToken?: (text: string) => void; }): Promise<{ content: string; metadata: AiExecutionMetadata }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Describe the content you want to create.");
  const result = await streamChatWithMetadata([{ role: "user", content: instruction }], input.onToken ?? (() => undefined), { provider: "auto", system: ["You are the Cossa Content Assistant.", `Write only polished customer-ready copy for ${input.platform || "the requested channel"}.`, "Use concise, natural South African business English.", "Do not use markdown, headings, bullets, labels, code fences, internal notes, model metadata or reasoning.", "Do not claim a post was published, an image was generated, or an external action was completed."].join(" ") });
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
};

export async function generateSocialContentPack(input: { instruction: string; platform: string; }): Promise<{ pack: SocialContentPack; metadata: AiExecutionMetadata }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Tell the Social Media Assistant what you want, for example: NexDocs pain-point post.");

  const approvedLinks = await getMarketingDestinationLinks();
  const linkDirectory = Object.entries(approvedLinks)
    .map(([key, url]) => `${key}: ${url}`)
    .join("; ");

  const result = await streamChatWithMetadata([{ role: "user", content: instruction }], () => undefined, {
    provider: "auto",
    system: [
      "You are Cossa Social Media Manager, Social Media Specialist, Content Creator and Content Writer. The operator gives you a short business content brief; you do the marketing work instead of asking them to fill a post form.",
      `Create a complete ${input.platform} content pack in natural South African business English.`,
      `These are the only approved destination links you may choose from: ${linkDirectory || "default destination unavailable"}.`,
      "Choose the destination_key that best matches the business/product in the brief. Examples: NexDocs -> nexdocs; Cossa Store, online store, ecommerce or digital products -> cossa_store; GROWTH or the Growth platform -> growth; Cossa Tech -> cossa_tech; construction/renovation/tiling/building -> cossa_nexus_construction; Facility Services/cleaning -> cossa_facility_services; parent/group/company-wide content -> cossa_nexus_holdings. Use default when the subject is unclear.",
      "Never invent, shorten or substitute a URL. The application will attach the approved URL after generation.",
      "Return ONLY valid JSON with exactly these string keys: title, hook, caption, content, hashtags, cta, best_time, visual_idea, destination_key.",
      "The hook must stop scrolling. The caption/content must focus on customer pain, benefit and a clear action. Hashtags must be relevant rather than spammy.",
      "The CTA must make sense with a real clickable destination. Do not say 'link below' or 'link in bio' unless the selected platform actually requires it; prefer wording such as 'Explore NexDocs here', 'Shop Cossa Store here', 'Chat with us on WhatsApp', or another direct action that matches the destination.",
      "best_time must be a practical South Africa time recommendation and should be described as a recommendation, not live analytics, unless analytics evidence was provided.",
      "Do not claim publishing, reach, engagement, trends or external actions that were not verified.",
    ].join(" "),
  });
  const raw = result.content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch { throw new Error("The Social Media Assistant returned an invalid content pack. Please generate again."); }
  const text = (key: string) => sanitiseMarketingText(parsed[key] ?? "");
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
  };
  if (!pack.content && !pack.caption) throw new Error("The Social Media Assistant returned no usable post content.");
  return { pack, metadata: result.metadata };
}

export async function createCreativeMediaHandoff(input: { content: string; platform: string; instruction: string; }): Promise<{ requestId: string }> {
  const content = sanitiseMarketingText(input.content);
  if (!content) throw new Error("Generate or enter customer-ready copy before sending a creative brief.");
  const state = creativeHandoffResult();
  const { data, error } = await db.from("creative_asset_requests").insert({ organisation_id: COSSA_ORGANISATION_ID, title: `Content calendar visual brief — ${input.platform}`.slice(0, 180), request_text: input.instruction.trim().slice(0, 6000), asset_type: "social_graphic", platform: input.platform.trim().toLowerCase(), channels: [input.platform.trim().toLowerCase()], requirements: { source: "content_calendar", external_publication_authorised: false, generated_asset_confirmed: false }, creative_brief: { copy: content, instruction: input.instruction.trim(), action: "brief_only" }, copy_draft: content, lifecycle_status: state.lifecycleStatus, blocker_code: "creative_generation_not_started", blocker_message: "Creative brief recorded. No visual has been generated or published.", metadata: { source: "content_calendar_command" } }).select("id").single();
  if (error) throw new Error(`Creative brief could not be recorded: ${error.message}`);
  if (!data?.id) throw new Error("Creative brief did not return a saved request ID.");
  return { requestId: String(data.id) };
}

export const contentAssistantDraftStatus = contentAssistantCalendarStatus;
