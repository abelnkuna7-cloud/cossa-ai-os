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

function titleNeedsRepair(title: string | null): boolean {
  if (!title) return true;
  return /^(?:temu|shop|home|product|item)$/i.test(title.trim()) || /&#\d+;|&[a-z]+;/i.test(title);
}

export const Route = createFileRoute("/api/store-affiliate-smart-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          const imported = await smartImportAffiliateProduct(payload.sourceUrl);

          // Preserve the working importer exactly as-is. Only when a Temu import still has
          // weak title/price/media do we repair those three fields and leave every other field untouched.
          if (
            isTemuUrl(payload.sourceUrl) &&
            (titleNeedsRepair(imported.title) || imported.supplierSalePrice == null || imported.imageUrls.length < 3)
          ) {
            const repair = await repairTemuTitlePriceAndImages(payload.sourceUrl);
            if (repair) {
              return agentRuntimeJson({
                ...imported,
                title: repair.title ?? imported.title,
                supplierSalePrice: repair.price ?? imported.supplierSalePrice,
                supplierSalePriceSourceLabel:
                  repair.price != null
                    ? "Rendered Temu current advertised price"
                    : imported.supplierSalePriceSourceLabel,
                imageUrls: repair.imageUrls.length ? repair.imageUrls : imported.imageUrls,
                mediaWarnings: [
                  ...(imported.mediaWarnings || []),
                  "Temu repair touched only product name, current advertised price and product images.",
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
