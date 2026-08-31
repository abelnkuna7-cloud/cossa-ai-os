import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { smartImportAffiliateProduct } from "@/lib/store-affiliate-smart-import.server";
import {
  importSupplierProduct,
  ProductImportError,
  type ImportedProductCandidate,
} from "@/lib/store-product-import.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function directCandidateQuality(candidate: ImportedProductCandidate): number {
  return [
    candidate.title,
    candidate.brand,
    candidate.supplierProductRef,
    candidate.supplierSalePrice ?? candidate.supplierRrp ?? candidate.supplierCost,
    candidate.imageUrls?.length > 0,
    candidate.description || candidate.shortDescription,
  ].filter(Boolean).length;
}

async function importWithCostAwareFallback(sourceUrl: unknown) {
  if (typeof sourceUrl !== "string" || !sourceUrl.trim()) {
    throw new ProductImportError("missing_source_url", "Paste an affiliate product URL first.");
  }

  // Cheap path first. If the normal merchant reader can identify the product and gives us at
  // least one usable image, return it immediately. Firecrawl must not be spent just to chase a
  // larger gallery; the user can review/remove media before saving the draft.
  try {
    const direct = await importSupplierProduct({ sourceUrl: sourceUrl.trim() });
    if (directCandidateQuality(direct) >= 4 && direct.imageUrls.length > 0) {
      return {
        ...direct,
        imageUrls: direct.imageUrls.slice(0, 16),
        videoUrls: [],
        mediaWarnings: [
          "Normal merchant reading succeeded. Firecrawl was not used for this import.",
        ],
        retrievalMethod: "direct" as const,
      };
    }
  } catch {
    // The protected/rendered fallback below owns the final error reporting.
  }

  // Expensive path only when the direct reader cannot safely identify the product or exposes no
  // usable product image. smartImportAffiliateProduct invokes Firecrawl only at this stage.
  const rendered = await smartImportAffiliateProduct(sourceUrl);
  return {
    ...rendered,
    mediaWarnings: [
      ...(rendered.mediaWarnings || []),
      ...(rendered.retrievalMethod === "rendered"
        ? ["Firecrawl was used because normal merchant reading was incomplete or blocked."]
        : []),
    ],
  };
}

export const Route = createFileRoute("/api/store-affiliate-smart-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          return agentRuntimeJson(await importWithCostAwareFallback(payload.sourceUrl));
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
