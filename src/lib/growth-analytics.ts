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

export async function getGrowthAnalyticsReport(): Promise<GrowthAnalyticsReport> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch("/api/growth-analytics", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | GrowthAnalyticsReport
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Google Analytics reporting failed (${response.status})`,
    );
  }

  return payload as GrowthAnalyticsReport;
}
