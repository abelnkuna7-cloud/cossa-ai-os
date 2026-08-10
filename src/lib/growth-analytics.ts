import { supabase } from "@/integrations/supabase/client";

export interface GrowthAnalyticsChannel {
  name: string;
  sessions: number;
  active_users: number;
  key_events: number;
}

export interface GrowthAnalyticsReport {
  property_id: string;
  measurement_id: string;
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
  channels: GrowthAnalyticsChannel[];
  fetched_at: string;
  reporting_scope: string;
}

interface GrowthAnalyticsOAuthStart {
  authorization_url: string;
}

export type GrowthAnalyticsErrorCode =
  | "approval-required"
  | "configuration-pending"
  | "request-failed";

export class GrowthAnalyticsError extends Error {
  constructor(
    public readonly code: GrowthAnalyticsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GrowthAnalyticsError";
  }
}

function readAnalyticsError(
  payload: { error?: string } | null,
  status: number,
): GrowthAnalyticsError {
  const serverError = payload?.error || "";

  if (status === 503 && serverError.includes("awaiting protected client settings")) {
    return new GrowthAnalyticsError(
      "configuration-pending",
      "Secure Google Analytics setup is pending.",
    );
  }

  if (status === 409 && serverError.includes("needs owner approval")) {
    return new GrowthAnalyticsError(
      "approval-required",
      "Google Analytics is awaiting owner approval.",
    );
  }

  if (status === 403) {
    return new GrowthAnalyticsError(
      "request-failed",
      "Your Cossa role is not authorised to use Google Analytics reporting.",
    );
  }

  return new GrowthAnalyticsError(
    "request-failed",
    "Google Analytics could not complete the request. No settings or reporting data were changed.",
  );
}

async function getAuthenticatedGrowthAnalyticsResponse(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(path, {
    ...init,
    headers,
  });
}

export async function getGrowthAnalyticsReport(): Promise<GrowthAnalyticsReport> {
  const response = await getAuthenticatedGrowthAnalyticsResponse("/api/growth-analytics");

  const payload = (await response.json().catch(() => null)) as
    | GrowthAnalyticsReport
    | { error?: string }
    | null;

  if (!response.ok) {
    throw readAnalyticsError(payload && "error" in payload ? payload : null, response.status);
  }

  return payload as GrowthAnalyticsReport;
}

export async function startGrowthAnalyticsOAuth(): Promise<string> {
  const response = await getAuthenticatedGrowthAnalyticsResponse(
    "/api/growth-analytics/oauth/start",
    { method: "POST" },
  );
  const payload = (await response.json().catch(() => null)) as
    | GrowthAnalyticsOAuthStart
    | { error?: string }
    | null;

  if (!response.ok || !payload || !("authorization_url" in payload)) {
    throw readAnalyticsError(payload && "error" in payload ? payload : null, response.status);
  }

  return payload.authorization_url;
}
