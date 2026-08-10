import { createFileRoute } from "@tanstack/react-router";
import { startGrowthAnalyticsOAuthResponse } from "@/lib/growth-analytics.server";

export const Route = createFileRoute("/api/growth-analytics/oauth/start")({
  server: {
    handlers: {
      POST: async ({ request }) => startGrowthAnalyticsOAuthResponse(request),
    },
  },
});
