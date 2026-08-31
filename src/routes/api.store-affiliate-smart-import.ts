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

          // Temu correction is intentionally restricted to three fields only:
          // the visible product title, the actual product brand, and genuine product-gallery images.
          // Price, descriptions, SKU, category, SEO, variants and every other imported field stay untouched.
          if (isTemuUrl(payload.sourceUrl)) {
            const repair = await repairTemuTitlePriceAndImages(payload.sourceUrl);
            if (repair) {
              return agentRuntimeJson({
                ...imported,
                title: repair.title ?? imported.title,
                brand: repair.brand ?? imported.brand,
                imageUrls: repair.imageUrls.length ? repair.imageUrls : imported.imageUrls,
                mediaWarnings: [
                  ...(imported.mediaWarnings || []),
                  ...(repair.imageUrls.length
                    ? ["Temu gallery repair replaced page/UI graphics with validated product images."]
                    : []),
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
