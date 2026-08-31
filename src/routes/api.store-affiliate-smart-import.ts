import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import {
  renderAffiliateProductWithFirecrawl,
  resolveAffiliateProductUrl,
} from "@/lib/store-affiliate-rendered-fallback.server";
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
    candidate.title && !/^(?:temu|shop|home)$/i.test(candidate.title.trim()),
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

  const originalUrl = sourceUrl.trim();
  const resolvedUrl = await resolveAffiliateProductUrl(originalUrl);

  // Cheap path first. Resolve known affiliate short links before reading so the normal importer
  // sees the actual product page instead of a share/redirect landing page.
  try {
    const direct = await importSupplierProduct({ sourceUrl: resolvedUrl });
    if (directCandidateQuality(direct) >= 4 && direct.imageUrls.length > 0) {
      return {
        ...direct,
        sourceUrl: direct.sourceUrl || resolvedUrl,
        imageUrls: direct.imageUrls.slice(0, 16),
        videoUrls: [],
        mediaWarnings: [
          ...(resolvedUrl !== originalUrl
            ? ["Affiliate short link was resolved to the merchant product page before import."]
            : []),
          "Normal merchant reading succeeded. Firecrawl was not used for this import.",
        ],
        retrievalMethod: "direct" as const,
      };
    }
  } catch {
    // Firecrawl fallback below owns the final error when direct reading is blocked/incomplete.
  }

  // Expensive path: exactly one Firecrawl scrape, only when direct reading is not good enough.
  // The rendered importer deliberately ignores arbitrary page <img> assets and retains only
  // product/gallery signals, so logos/payment/shipping/social icons do not become product media.
  const rendered = await renderAffiliateProductWithFirecrawl(resolvedUrl);
  if (directCandidateQuality(rendered) < 3 || !rendered.title || !rendered.imageUrls.length) {
    throw new ProductImportError(
      "rendered_import_incomplete",
      "The merchant page was rendered, but Growth could not confirm enough real product data to create a safe affiliate draft.",
      422,
    );
  }

  return {
    ...rendered,
    mediaWarnings: [
      ...(resolvedUrl !== originalUrl
        ? ["Affiliate short link was resolved to the merchant product page before Firecrawl was used."]
        : []),
      ...(rendered.mediaWarnings || []),
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
