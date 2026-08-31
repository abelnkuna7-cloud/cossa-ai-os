import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
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

          // Restore the proven Smart Affiliate Import engine that was already successfully
          // importing marketplace products. It performs its own cheap direct read first and
          // invokes Firecrawl only when the merchant page is blocked or incomplete.
          //
          // Do not run the separate media refiner here: that path caused a second rendered-page
          // read and introduced the later regression. The UI already provides manual image
          // removal as the final human review gate before a Cossa Store draft is saved.
          const imported = await smartImportAffiliateProduct(payload.sourceUrl);
          return agentRuntimeJson(imported);
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
