import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { refineAffiliateProductMedia } from "@/lib/store-affiliate-media-refiner.server";
import { smartImportAffiliateProduct } from "@/lib/store-affiliate-smart-import.server";
import { ProductImportError } from "@/lib/store-product-import.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const Route = createFileRoute("/api/store-affiliate-smart-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          const imported = await smartImportAffiliateProduct(payload.sourceUrl);
          const refined = await refineAffiliateProductMedia(imported);
          return agentRuntimeJson(refined);
        } catch (error) {
          if (error instanceof ProductImportError) {
            return agentRuntimeJson({ error: error.message, code: error.code }, error.httpStatus);
          }
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
