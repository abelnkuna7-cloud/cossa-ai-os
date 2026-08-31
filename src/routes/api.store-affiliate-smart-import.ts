import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { resolveAffiliateProductUrl } from "@/lib/store-affiliate-rendered-fallback.server";
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
          const sourceUrl = typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() : "";

          if (!sourceUrl) {
            throw new ProductImportError("missing_source_url", "Paste an affiliate product URL first.");
          }

          // Keep the proven Smart Affiliate Import engine as the single source of truth.
          // Only resolve marketplace short/share links first so the importer receives the actual
          // product page instead of a share landing page. Do not post-process or delete fields.
          // The browser UI keeps the original pasted URL as the affiliate tracking URL.
          const resolvedUrl = await resolveAffiliateProductUrl(sourceUrl);
          const imported = await smartImportAffiliateProduct(resolvedUrl);

          return agentRuntimeJson({
            ...imported,
            mediaWarnings: [
              ...(resolvedUrl !== sourceUrl
                ? ["Affiliate share link was resolved to the merchant product page before import."]
                : []),
              ...(imported.mediaWarnings || []),
            ],
          });
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
