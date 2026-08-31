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
    // Affiliate links are normally share.temu.com. Keep the check broad enough
    // for Temu's regional/share hosts while still excluding unrelated domains.
    return host === "temu.com" || host.endsWith(".temu.com");
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
                // Never preserve the generic page/UI image set when the Temu-specific
                // repair ran. An empty repaired gallery is safer than payment/social icons.
                imageUrls: repair.imageUrls,
                mediaWarnings: [
                  ...(imported.mediaWarnings || []),
                  ...(repair.imageUrls.length
                    ? ["Temu gallery repair replaced page/UI graphics with validated product images."]
                    : ["Temu gallery repair rejected page/UI graphics; no verified product gallery image was exposed." ]),
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
