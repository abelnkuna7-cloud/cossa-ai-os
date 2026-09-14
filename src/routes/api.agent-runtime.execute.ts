import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeWorker,
  runAgentRuntimeTick,
} from "@/lib/agent-runtime.server";
import { runDirectEmployeeRuntimeTick } from "@/lib/direct-employee-runtime.server";

export const Route = createFileRoute("/api/agent-runtime/execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeWorker(request);
          const [runtime, directEmployee] = await Promise.all([
            runAgentRuntimeTick(),
            runDirectEmployeeRuntimeTick(),
          ]);
          return agentRuntimeJson({ ...runtime, directEmployee });
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
