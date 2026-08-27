import { supabase } from "@/integrations/supabase/client";

export type WebsiteAvailability = "healthy" | "degraded" | "unavailable";

export interface CossaWebsiteHealthCheck {
  id: string;
  name: string;
  website: string;
  final_url: string | null;
  availability: WebsiteAvailability;
  http_status: number | null;
  response_time_ms: number | null;
  page_title: string | null;
  title_detected: boolean;
  noindex_detected: boolean;
  issues: string[];
}

export interface CossaWebsiteHealthReport {
  checks: CossaWebsiteHealthCheck[];
  checked_at: string;
  monitoring_scope: string;
}

export async function checkCossaWebsites(): Promise<CossaWebsiteHealthReport> {
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

  const payload = (await response.json().catch(() => null)) as
    | CossaWebsiteHealthReport
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Website check failed (${response.status})`,
    );
  }

  return payload as CossaWebsiteHealthReport;
}

/**
 * Keeps the AI Workforce website stage compatible with the previous one-site
 * evidence format while using the same controlled, read-only endpoint.
 */
export interface OfficialWebsiteHealthReport extends CossaWebsiteHealthCheck {
  checked_at: string;
  monitoring_scope: string;
}

export async function checkOfficialWebsite(): Promise<OfficialWebsiteHealthReport> {
  const report = await checkCossaWebsites();
  const main = report.checks.find((check) => check.id === "main") ?? report.checks[0];

  if (!main) {
    throw new Error("The website health check returned no Cossa sites.");
  }

  return {
    ...main,
    checked_at: report.checked_at,
    monitoring_scope: report.monitoring_scope,
  };
}
