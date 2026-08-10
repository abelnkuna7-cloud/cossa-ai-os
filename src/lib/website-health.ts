import { supabase } from "@/integrations/supabase/client";

export type WebsiteAvailability = "healthy" | "degraded" | "unavailable";

export interface OfficialWebsiteHealthReport {
  website: string;
  final_url: string | null;
  availability: WebsiteAvailability;
  http_status: number | null;
  response_time_ms: number | null;
  page_title: string | null;
  title_detected: boolean;
  noindex_detected: boolean;
  checked_at: string;
  issues: string[];
  monitoring_scope: string;
}

export async function checkOfficialWebsite(): Promise<OfficialWebsiteHealthReport> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch("/api/website-health", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const payload = await response.json().catch(() => null) as
    | OfficialWebsiteHealthReport
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Website check failed (${response.status})`,
    );
  }

  return payload as OfficialWebsiteHealthReport;
}
