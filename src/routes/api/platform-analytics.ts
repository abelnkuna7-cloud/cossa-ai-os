import { createFileRoute } from "@tanstack/react-router";

import { getPlatformAnalyticsResponse } from "@/lib/platform-analytics.server";

export const Route = createFileRoute("/api/platform-analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => getPlatformAnalyticsResponse(request),
    },
  },
});
