import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (table: string) => any };
const PREFIX = "marketing.link.";

export type MarketingDestinationLinks = Record<string, string>;

export async function getMarketingDestinationLinks(): Promise<MarketingDestinationLinks> {
  const { data, error } = await db
    .from("app_settings")
    .select("key,value")
    .like("key", `${PREFIX}%`);

  if (error) {
    throw new Error(`Marketing destination links could not be loaded: ${error.message}`);
  }

  return Object.fromEntries(
    (data ?? [])
      .map((row: { key?: unknown; value?: unknown }) => [
        String(row.key ?? "").replace(PREFIX, "").trim(),
        String(row.value ?? "").trim(),
      ])
      .filter(([key, value]: [string, string]) => Boolean(key && value)),
  );
}

export function resolveMarketingDestination(
  links: MarketingDestinationLinks,
  requestedKey: string,
): { key: string; url: string } {
  const normalised = requestedKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const key = links[normalised] ? normalised : links.default ? "default" : Object.keys(links)[0] ?? "";
  return { key, url: key ? links[key] ?? "" : "" };
}
