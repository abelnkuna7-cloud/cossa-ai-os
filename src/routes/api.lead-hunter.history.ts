import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { getLeadHunterHistoryDashboard } from "@/lib/lead-hunter-history-dashboard.server";

export const Route = createFileRoute("/api/lead-hunter/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request);
          return agentRuntimeJson(
            await getLeadHunterHistoryDashboard(actor.organisationId),
          );
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
