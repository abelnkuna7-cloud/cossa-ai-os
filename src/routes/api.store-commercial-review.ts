import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { loadStoreCommercialReviews } from "@/lib/store-commercial-review";

/**
 * Commercial cost and supplier-quote evidence is operational data. Keep the
 * read on the protected server and return it only to Cossa store leaders; do
 * not query raw provider variant payloads from the browser.
 */
export const Route = createFileRoute("/api/store-commercial-review")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { asDynamicSupabaseClient } =
            await import("@/integrations/supabase/dynamic-client");
          return agentRuntimeJson(
            await loadStoreCommercialReviews(
              asDynamicSupabaseClient(supabaseAdmin),
              actor.organisationId,
            ),
          );
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
