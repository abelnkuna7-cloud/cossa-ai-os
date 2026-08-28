import { streamChatWithMetadata, type AiExecutionMetadata } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import {
  contentAssistantCalendarStatus,
  creativeHandoffResult,
  sanitiseMarketingOutput,
} from "@/lib/operational-truth";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

/**
 * Cleans presentation-only artifacts returned by a language model. It never
 * touches audit data, provider diagnostics, technical evidence or stored run
 * metadata; callers must opt in for customer-facing marketing copy.
 */
export function sanitiseMarketingText(value: unknown): string {
  return sanitiseMarketingOutput(value);
}

export function rewriteContentCommand(input: {
  instruction: string;
  mode: "shorter" | "stronger" | "platform";
  platform?: string;
}): string {
  const platform = input.platform?.trim() || "the selected platform";
  if (input.mode === "shorter")
    return `Rewrite this shorter for ${platform}:\n${input.instruction}`;
  if (input.mode === "stronger")
    return `Rewrite this with a clearer, stronger customer benefit for ${platform}:\n${input.instruction}`;
  return `Adapt this for ${platform}; keep it customer-ready and natural:\n${input.instruction}`;
}

export async function generateContentDraft(input: {
  instruction: string;
  platform: string;
  onToken?: (text: string) => void;
}): Promise<{ content: string; metadata: AiExecutionMetadata }> {
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

export async function createCreativeMediaHandoff(input: {
  content: string;
  platform: string;
  instruction: string;
}): Promise<{ requestId: string }> {
  const content = sanitiseMarketingText(input.content);
  if (!content)
    throw new Error("Generate or enter customer-ready copy before sending a creative brief.");
  const state = creativeHandoffResult();
  const { data, error } = await db
    .from("creative_asset_requests")
    .insert({
      organisation_id: COSSA_ORGANISATION_ID,
      title: `Content calendar visual brief — ${input.platform}`.slice(0, 180),
      request_text: input.instruction.trim().slice(0, 6000),
      asset_type: "social_graphic",
      platform: input.platform.trim().toLowerCase(),
      channels: [input.platform.trim().toLowerCase()],
      requirements: {
        source: "content_calendar",
        external_publication_authorised: false,
        generated_asset_confirmed: false,
      },
      creative_brief: {
        copy: content,
        instruction: input.instruction.trim(),
        action: "brief_only",
      },
      copy_draft: content,
      lifecycle_status: state.lifecycleStatus,
      blocker_code: "creative_generation_not_started",
      blocker_message: "Creative brief recorded. No visual has been generated or published.",
      metadata: { source: "content_calendar_command" },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Creative brief could not be recorded: ${error.message}`);
  if (!data?.id) throw new Error("Creative brief did not return a saved request ID.");
  return { requestId: String(data.id) };
}

export const contentAssistantDraftStatus = contentAssistantCalendarStatus;
