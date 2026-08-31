import type { ImportedProductCandidate } from "./store-product-import.server";

type AffiliateCandidate = ImportedProductCandidate & {
  videoUrls?: string[];
  mediaWarnings?: string[];
  retrievalMethod?: "direct" | "rendered";
};

const TEMU_FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;

function isTemuUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "temu.com" || host.endsWith(".temu.com");
  } catch {
    return false;
  }
}

function cleanText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function productRefFromUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    return (
      url.searchParams.get("goods_id") ??
      url.searchParams.get("goodsId") ??
      url.searchParams.get("product_id") ??
      url.searchParams.get("productId") ??
      url.pathname.match(/-g-(\d{6,})/i)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

function productRefFromHtml(html: string, sourceUrl: string): string | null {
  return (
    productRefFromUrl(sourceUrl) ??
    html.match(/["'](?:goodsId|goods_id|productId|product_id)["']\s*:\s*["']?(\d{6,})/i)?.[1] ??
    html.match(/(?:goods_id|goodsId|product_id|productId)=(\d{6,})/i)?.[1] ??
    null
  );
}

function parseBreadcrumbCategory(html: string, title: string | null): string | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[2]);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== "object" || Array.isArray(current)) continue;
        const row = current as Record<string, unknown>;
        const type = String(row["@type"] ?? "").toLowerCase();
        if (type === "breadcrumblist" && Array.isArray(row.itemListElement)) {
          const names = row.itemListElement
            .map((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item)) return null;
              const entry = item as Record<string, unknown>;
              if (typeof entry.name === "string") return cleanText(entry.name);
              const nested = entry.item;
              if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                const nestedName = (nested as Record<string, unknown>).name;
                return typeof nestedName === "string" ? cleanText(nestedName) : null;
              }
              return null;
            })
            .filter((name): name is string => Boolean(name));
          const useful = names.filter(
            (name) =>
              !/^home$/i.test(name) &&
              (!title || name.toLowerCase() !== title.toLowerCase()) &&
              name.length < 100,
          );
          if (useful.length) return useful[useful.length - 1];
        }
        for (const value of Object.values(row)) {
          if (value && typeof value === "object") queue.push(value);
        }
      }
    } catch {
      // Ignore malformed merchant JSON-LD and keep the existing field unconfirmed.
    }
  }
  return null;
}

function factualDescription(value: string | null): string | null {
  if (!value) return null;
  let text = cleanText(value)
    .replace(/^(?:shop|find|buy)\s+/i, "")
    .replace(/\s+(?:on|at)\s+Temu\b[\s\S]*$/i, "")
    .replace(/\s+Free shipping\b[\s\S]*$/i, "")
    .replace(/\s+more great prices\b[\s\S]*$/i, "")
    .replace(/\s+ready to shop online\b[\s\S]*$/i, "")
    .trim();
  if (!text || /^(?:temu|shop|home)$/i.test(text)) return null;
  return text;
}

async function fetchTemuHtml(sourceUrl: string): Promise<string | null> {
  if (!isTemuUrl(sourceUrl)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEMU_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-ZA,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
    const length = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(length) && length > MAX_HTML_BYTES) return null;
    const html = await response.text();
    return html.length <= MAX_HTML_BYTES ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function removeConfirmation(values: string[], needle: string): string[] {
  return values.filter((value) => !value.toLowerCase().includes(needle.toLowerCase()));
}

export async function sanitizeAffiliateCandidate(
  candidate: AffiliateCandidate,
  originalSourceUrl: unknown,
): Promise<AffiliateCandidate> {
  const originalUrl = typeof originalSourceUrl === "string" ? originalSourceUrl.trim() : "";
  const temu = isTemuUrl(originalUrl) || isTemuUrl(candidate.sourceUrl);
  if (!temu) return candidate;

  const mediaWarnings = [...(candidate.mediaWarnings ?? [])];
  let brand = candidate.brand;
  if (brand && /^temu$/i.test(brand.trim())) {
    brand = null;
    mediaWarnings.push(
      "Temu is the marketplace/merchant, not automatically the product brand. Brand was cleared because no independent product brand was confirmed.",
    );
  }

  let description = factualDescription(candidate.description);
  let shortDescription = factualDescription(candidate.shortDescription);
  if (description && (!shortDescription || shortDescription.length < 40)) {
    shortDescription = description.slice(0, 320);
  }

  const html = await fetchTemuHtml(candidate.sourceUrl);
  let supplierCategory = candidate.supplierCategory;
  let supplierProductRef = candidate.supplierProductRef;
  let supplierRrp = candidate.supplierRrp;
  let supplierRrpSourceLabel = candidate.supplierRrpSourceLabel;
  let supplierSalePrice = candidate.supplierSalePrice;
  let supplierSalePriceSourceLabel = candidate.supplierSalePriceSourceLabel;
  let fieldsRequiringConfirmation = [...candidate.fieldsRequiringConfirmation];

  if (html) {
    const visible = cleanText(html);
    supplierCategory = parseBreadcrumbCategory(html, candidate.title) ?? supplierCategory;
    supplierProductRef = supplierProductRef ?? productRefFromHtml(html, candidate.sourceUrl);

    const rrp = money(visible.match(/\bRRP\s*R\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1]);
    const beforePromo = money(
      visible.match(/\bafter applying promos\s+to\s+R\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1],
    );
    const estimatedPromo = money(
      visible.match(/\bEstimated\s+R\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1],
    );

    if (rrp != null) {
      supplierRrp = rrp;
      supplierRrpSourceLabel = "Temu visible RRP";
    }
    if (beforePromo != null) {
      supplierSalePrice = beforePromo;
      supplierSalePriceSourceLabel = "Temu visible current price before conditional promos";
    }
    if (estimatedPromo != null && estimatedPromo !== supplierSalePrice) {
      mediaWarnings.push(
        `Temu also displayed an estimated R${estimatedPromo.toFixed(2)} after conditional promotions. It was not used as the standard advertised price because the promotion may depend on customer eligibility or timing.`,
      );
    }

    if (supplierProductRef) {
      fieldsRequiringConfirmation = removeConfirmation(fieldsRequiringConfirmation, "supplier SKU/product ID");
    }
  }

  if (!description && candidate.title) description = candidate.title;
  if (!shortDescription && description) shortDescription = description.slice(0, 320);

  return {
    ...candidate,
    brand,
    supplierCategory,
    supplierProductRef,
    supplierRrp,
    supplierRrpSourceLabel,
    supplierSalePrice,
    supplierSalePriceSourceLabel,
    shortDescription,
    description,
    fieldsRequiringConfirmation,
    mediaWarnings: [...new Set(mediaWarnings)],
  };
}
