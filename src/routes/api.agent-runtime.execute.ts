import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeWorker,
  runAgentRuntimeTick,
} from "@/lib/agent-runtime.server";

export const Route = createFileRoute("/api/agent-runtime/execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeWorker(request);
          return agentRuntimeJson(await runAgentRuntimeTick());
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
