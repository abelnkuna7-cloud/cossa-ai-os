import { createFileRoute } from "@tanstack/react-router";
import { getGrowthAnalyticsReportResponse } from "@/lib/growth-analytics.server";

export const Route = createFileRoute("/api/growth-analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => getGrowthAnalyticsReportResponse(request),
    },
  },
});
