import { createFileRoute } from "@tanstack/react-router";
import { completeGrowthAnalyticsOAuthResponse } from "@/lib/growth-analytics.server";

export const Route = createFileRoute("/api/growth-analytics/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => completeGrowthAnalyticsOAuthResponse(request),
    },
  },
});
