import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { getLeadHunterHistoryDashboard } from "@/lib/lead-hunter-history-dashboard.server";

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/lead-hunter/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request);
          return agentRuntimeJson(
            await getLeadHunterHistoryDashboard(actor.organisationId, bearerToken(request)),
          );
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
