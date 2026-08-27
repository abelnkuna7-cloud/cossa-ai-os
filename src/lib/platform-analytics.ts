import { supabase } from "@/integrations/supabase/client";

export interface PlatformAnalyticsChannel {
  name: string;
  sessions: number;
  active_users: number;
  key_events: number;
}

export interface PlatformAnalyticsSource {
  id: string;
  name: string;
  site_url: string;
  property_id: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  active_users: number;
  new_users: number;
  sessions: number;
  page_views: number;
  engaged_sessions: number;
  key_events: number;
  channels: PlatformAnalyticsChannel[];
}

export interface PlatformAnalyticsReport {
  sources: PlatformAnalyticsSource[];
  fetched_at: string;
  reporting_scope: string;
}

export type PlatformAnalyticsErrorCode = "configuration-pending" | "forbidden" | "request-failed";

export class PlatformAnalyticsError extends Error {
  constructor(
    public readonly code: PlatformAnalyticsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PlatformAnalyticsError";
  }
}

function readPlatformAnalyticsError(
  payload: { error?: string } | null,
  status: number,
): PlatformAnalyticsError {
  const serverError = payload?.error || "";

  if (status === 503) {
    return new PlatformAnalyticsError(
      "configuration-pending",
      "Secure NexDocs reporting is waiting for its protected server settings.",
    );
  }

  if (status === 403) {
    return new PlatformAnalyticsError(
      "forbidden",
      "Only Cossa owners and administrators can view platform traffic.",
    );
  }

  return new PlatformAnalyticsError(
    "request-failed",
    serverError ||
      "Platform traffic could not be loaded. No website settings or Google data were changed.",
  );
}

export async function getPlatformAnalyticsReport(): Promise<PlatformAnalyticsReport> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch("/api/platform-analytics", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | PlatformAnalyticsReport
    | { error?: string }
    | null;

  if (!response.ok) {
    throw readPlatformAnalyticsError(
      payload && "error" in payload ? payload : null,
      response.status,
    );
  }

  return payload as PlatformAnalyticsReport;
}
