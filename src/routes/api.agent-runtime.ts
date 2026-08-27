import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  decideOrchestrationApproval,
  orchestrationDashboard,
  queueLeadHunterProof,
  requireRuntimeMember,
  setLeadHunterSchedule,
} from "@/lib/agent-runtime.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const Route = createFileRoute("/api/agent-runtime")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request);
          return agentRuntimeJson(await orchestrationDashboard(actor));
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          const action = typeof payload.action === "string" ? payload.action : "";

          if (action === "queue_lead_hunter_proof") {
            return agentRuntimeJson(await queueLeadHunterProof(payload.input, actor), 202);
          }
          if (action === "review_outreach_drafts") {
            const approvalId = typeof payload.approvalId === "string" ? payload.approvalId : "";
            const decision =
              payload.decision === "approved" || payload.decision === "rejected"
                ? payload.decision
                : null;
            if (!decision) return agentRuntimeJson({ error: "Choose approve or reject." }, 400);
            await decideOrchestrationApproval(approvalId, decision, actor);
            return agentRuntimeJson({ ok: true, external_sending_enabled: false });
          }
          if (action === "set_lead_hunter_schedule") {
            await setLeadHunterSchedule(payload.input, payload.active === true, actor);
            return agentRuntimeJson({ ok: true, external_sending_enabled: false });
          }

          return agentRuntimeJson({ error: "Unsupported agent runtime action." }, 400);
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
