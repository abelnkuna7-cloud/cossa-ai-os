import {
  parseGenericProductPage,
  ProductImportError,
  type ImportedProductCandidate,
} from "./store-product-import.server";

const FIRECRAWL_TIMEOUT_MS = 35_000;
const RESOLVE_TIMEOUT_MS = 12_000;
const MAX_IMAGES = 12;
const MAX_VIDEOS = 6;

export type RenderedAffiliateCandidate = ImportedProductCandidate & {
  imageUrls: string[];
  videoUrls: string[];
  mediaWarnings: string[];
  retrievalMethod: "rendered";
};

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\x2F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\u003A/gi, ":");
}

function absolute(value: string, base: string): string | null {
  try {
    const url = new URL(decode(value), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return cleanText(value);
  }
  return null;
}

function canonicalFromHtml(html: string, base: string): string | null {
  const canonical = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*canonical[^"']*["']/i)?.[1]
    ?? metaContent(html, "og:url");
  return canonical ? absolute(canonical, base) : null;
}

function temuProductUrlFromHtml(html: string, base: string): string | null {
  const values: string[] = [];
  for (const match of html.matchAll(/["']((?:https?:)?(?:\\?\/\\?\/)(?:www\.)?temu\.com\/[^"'<>\\s]+)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  const resolved = values
    .map((value) => absolute(value, base))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !/share\.temu\.com/i.test(value));
  return resolved.find((value) => /(?:-g-\d+|goods_id=|product_id=|\.html(?:\?|$))/i.test(value)) ?? resolved[0] ?? null;
}

export async function resolveAffiliateProductUrl(input: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return input.trim();
  }
  if (!/^share\.temu\.com$/i.test(url.hostname)) return url.toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-ZA,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });
    const finalUrl = response.url || url.toString();
    if (!/^share\.temu\.com$/i.test(new URL(finalUrl).hostname)) return finalUrl;
    const html = await response.text().catch(() => "");
    return temuProductUrlFromHtml(html, finalUrl) ?? canonicalFromHtml(html, finalUrl) ?? finalUrl;
  } catch {
    return url.toString();
  } finally {
    clearTimeout(timeout);
  }
}

function unique(values: string[], sourceUrl: string, max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const url = absolute(raw, sourceUrl);
    if (!url) continue;
    if (/(?:logo|icon|avatar|profile|account|wallet|payment|coupon|gift|bonus|spin|shipping|delivery|truck|review|rating|heart|wishlist|security|shield|appstore|google[-_ ]?play|apple|instagram|facebook|whatsapp|tiktok|captcha|sprite|favicon|badge|social|promo|reward)/i.test(url)) continue;
    const key = url.replace(/[?&](?:width|height|w|h|quality|q|format|resize)=[^&]*/gi, "");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
    if (result.length >= max) break;
  }
  return result;
}

function strictImages(html: string, sourceUrl: string, basic: string[]): string[] {
  const values = [...basic];
  for (const key of ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]) {
    const value = metaContent(html, key);
    if (value) values.push(value);
  }
  const structured = /["'](?:gallery(?:Image|Url|URL)|mainImage(?:Url|URL)?|productImage(?:Url|URL)?|goodsImage(?:Url|URL)?|skuImage(?:Url|URL)?|detailImage(?:Url|URL)?|originImage(?:Url|URL)?|originalImage(?:Url|URL)?|largeImage(?:Url|URL)?)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(structured)) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values, sourceUrl, MAX_IMAGES);
}

function strictVideos(html: string, sourceUrl: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/["'](?:videoUrl|videoURL|video_url|videoSrc|playUrl|videoPlayUrl)["']\s*:\s*["']([^"']+)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  for (const match of html.matchAll(/<video\b[^>]*src\s*=\s*["']([^"']+)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values.filter((value) => /(?:\.mp4|\.webm|\.m3u8|video)/i.test(value)), sourceUrl, MAX_VIDEOS);
}

function productRefFromUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    return url.searchParams.get("goods_id")
      ?? url.searchParams.get("goodsId")
      ?? url.searchParams.get("product_id")
      ?? url.searchParams.get("productId")
      ?? url.pathname.match(/-g-(\d{6,})/i)?.[1]
      ?? null;
  } catch {
    return null;
  }
}

function fallbackPrice(html: string): number | null {
  const meta = metaContent(html, "product:price:amount") ?? metaContent(html, "og:price:amount");
  if (meta) {
    const parsed = Number(meta.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const patterns = [
    /["'](?:salePrice|sale_price|priceAmount|price)["']\s*:\s*(?:["'])?([0-9]+(?:\.[0-9]{1,2})?)(?:["'])?/i,
    /(?:R|ZAR)\s*([0-9]{1,6}(?:[.,][0-9]{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (!value) continue;
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export async function renderAffiliateProductWithFirecrawl(sourceUrl: string): Promise<RenderedAffiliateCandidate> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new ProductImportError(
      "rendered_import_not_configured",
      "This merchant requires rendered-page reading, but FIRECRAWL_API_KEY is not configured.",
      422,
    );
  }

  const resolvedUrl = await resolveAffiliateProductUrl(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: resolvedUrl,
        formats: ["html"],
        onlyMainContent: false,
        waitFor: 3500,
      }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) {
      throw new ProductImportError("rendered_import_failed", `Rendered-page importer returned ${response.status}.`, 422);
    }
    const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : payload;
    const html = typeof data.html === "string" ? data.html : typeof data.rawHtml === "string" ? data.rawHtml : "";
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};
    const finalUrl = typeof metadata.sourceURL === "string"
      ? metadata.sourceURL
      : typeof metadata.sourceUrl === "string"
        ? metadata.sourceUrl
        : typeof metadata.url === "string"
          ? metadata.url
          : resolvedUrl;
    if (!html.trim()) {
      throw new ProductImportError("rendered_import_empty", "The rendered-page importer returned no product HTML.", 422);
    }

    const basic = parseGenericProductPage({ html, sourceUrl: finalUrl, adapterKey: "rendered-web-page" });
    const titleMeta = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
    const descriptionMeta = metaContent(html, "og:description") ?? metaContent(html, "description") ?? metaContent(html, "twitter:description");
    const betterTitle = basic.title && !/^(?:temu|shop|home)$/i.test(basic.title.trim()) ? basic.title : titleMeta;
    const description = basic.description ?? descriptionMeta;
    const shortDescription = basic.shortDescription ?? (description ? description.slice(0, 240) : null);
    const images = strictImages(html, finalUrl, basic.imageUrls || []);
    const videos = strictVideos(html, finalUrl);
    const price = basic.supplierSalePrice ?? basic.supplierRrp ?? basic.supplierCost ?? fallbackPrice(html);
    const supplierRef = basic.supplierProductRef ?? productRefFromUrl(finalUrl);

    return {
      ...basic,
      sourceUrl: finalUrl,
      title: betterTitle ?? basic.title,
      shortDescription,
      description,
      supplierProductRef: supplierRef,
      supplierSalePrice: basic.supplierSalePrice ?? (price != null ? price : null),
      supplierSalePriceSourceLabel: basic.supplierSalePriceSourceLabel ?? (price != null ? "Rendered merchant product price" : null),
      imageUrls: images,
      videoUrls: videos,
      mediaWarnings: [
        `Firecrawl fallback used once because normal merchant reading was incomplete or blocked.`,
        `Rendered media was restricted to product/gallery signals; ${images.length} candidate product image(s) retained.`,
      ],
      retrievalMethod: "rendered",
    };
  } catch (error) {
    if (error instanceof ProductImportError) throw error;
    throw new ProductImportError("rendered_import_failed", "Rendered product-page reading failed.", 422);
  } finally {
    clearTimeout(timeout);
  }
}
