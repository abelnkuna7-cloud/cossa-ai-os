import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import {
  runStorePublicationAction,
  type StorePublicationAction,
} from "@/lib/store-inventory-publication.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function action(value: unknown): StorePublicationAction | null {
  return value === "preview" || value === "publish" || value === "unpublish" ? value : null;
}

export const Route = createFileRoute("/api/store-inventory-publication")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = record(await request.json().catch(() => null));
          const requestedAction = action(payload.action);
          if (!requestedAction) {
            return agentRuntimeJson(
              { error: "Choose preview, publish or unpublish.", code: "invalid_action" },
              400,
            );
          }
          const actor = await requireRuntimeMember(
            request,
            requestedAction === "preview" ? ["owner", "admin", "manager"] : ["owner"],
          );
          return agentRuntimeJson(
            await runStorePublicationAction({
              action: requestedAction,
              intakeId: payload.intakeId,
              actor,
            }),
          );
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
