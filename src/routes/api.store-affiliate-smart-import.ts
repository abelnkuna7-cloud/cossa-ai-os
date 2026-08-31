import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { repairTemuTitlePriceAndImages } from "@/lib/store-affiliate-temu-fields.server";
import { ProductImportError } from "@/lib/store-product-import.server";
import { smartImportAffiliateProduct } from "@/lib/store-affiliate-smart-import.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isTemuUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "temu.com" || host === "share.temu.com" || host.endsWith(".temu.com");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/store-affiliate-smart-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          const imported = await smartImportAffiliateProduct(payload.sourceUrl);

          // Do not change any product data here. Temu repair is now limited strictly to images.
          if (isTemuUrl(payload.sourceUrl) && imported.imageUrls.length < 3) {
            const repair = await repairTemuTitlePriceAndImages(payload.sourceUrl);
            if (repair?.imageUrls.length) {
              return agentRuntimeJson({
                ...imported,
                imageUrls: repair.imageUrls,
                mediaWarnings: [
                  ...(imported.mediaWarnings || []),
                  "Temu image repair validated and replaced product images only.",
                ],
              });
            }
          }

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
