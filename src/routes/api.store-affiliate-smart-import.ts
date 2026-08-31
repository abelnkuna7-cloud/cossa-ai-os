import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { sanitizeAffiliateCandidate } from "@/lib/store-affiliate-truth-sanitizer.server";
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

          // Keep the proven Smart Affiliate Import engine unchanged. It performs the merchant
          // read and uses Firecrawl only when that existing engine decides rendered fallback is
          // required. After import, apply a conservative merchant truth-sanitizer so marketplace
          // names, conditional promo prices and SEO marketing copy are not misrepresented as
          // product facts.
          const imported = await smartImportAffiliateProduct(payload.sourceUrl);
          const sanitized = await sanitizeAffiliateCandidate(imported, payload.sourceUrl);
          return agentRuntimeJson(sanitized);
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
