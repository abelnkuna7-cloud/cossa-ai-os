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

type TemuExtract = {
  title: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  productRef: string | null;
  price: number | null;
  images: string[];
};

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\x2F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\u002D/gi, "-")
    .replace(/\\"/g, '"');
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
  const text = decode(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\n|\\r|\\t/g, " ")
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

function isTemuUrl(input: string): boolean {
  try {
    const host = new URL(input).hostname.toLowerCase();
    return host === "temu.com" || host.endsWith(".temu.com");
  } catch {
    return false;
  }
}

function looksLikeTemuProductUrl(input: string): boolean {
  if (!isTemuUrl(input)) return false;
  return /(?:-g-\d+|goods_id=|goodsId=|product_id=|productId=|\/goods(?:\/|\?|$)|\.html(?:\?|$))/i.test(input);
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
  return resolved.find(looksLikeTemuProductUrl) ?? null;
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
    if (looksLikeTemuProductUrl(finalUrl)) return finalUrl;

    const html = await response.text().catch(() => "");
    const embeddedProduct = temuProductUrlFromHtml(html, finalUrl);
    if (embeddedProduct) return embeddedProduct;

    const canonical = canonicalFromHtml(html, finalUrl);
    if (canonical && looksLikeTemuProductUrl(canonical)) return canonical;
    return finalUrl;
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

function quotedField(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`["']${escaped}["']\\s*:\\s*["']((?:\\\\.|[^"']){2,2000})["']`, "i"));
    const value = cleanText(match?.[1]);
    if (value) return value;
  }
  return null;
}

function numericField(html: string, keys: string[]): number | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`["']${escaped}["']\\s*:\\s*(?:["'])?([0-9]+(?:\\.[0-9]{1,2})?)(?:["'])?`, "i"));
    if (!match?.[1]) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function temuProductRegion(html: string): string {
  const markers = [
    /["']goodsName["']\s*:/i,
    /["']goodsId["']\s*:/i,
    /["']productName["']\s*:/i,
    /["']productId["']\s*:/i,
  ];
  for (const marker of markers) {
    const match = marker.exec(html);
    if (!match || match.index == null) continue;
    return html.slice(Math.max(0, match.index - 120_000), Math.min(html.length, match.index + 220_000));
  }
  return html.slice(0, Math.min(html.length, 300_000));
}

function temuImages(region: string, sourceUrl: string): string[] {
  const values: string[] = [];
  const structured = /["'](?:imageUrl|imageURL|image_url|thumbUrl|thumbnailUrl|originImageUrl|originalImageUrl|goodsImageUrl|skuImageUrl|mainImageUrl|detailImageUrl|largeImageUrl)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) {
    if (match[1]) values.push(match[1]);
  }
  for (const match of region.matchAll(/["']((?:https?:)?(?:\\?\/\\?\/)[^"'\s<>]+?\.(?:avif|webp|png|jpe?g)(?:\?[^"'\s<>]*)?)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values, sourceUrl, MAX_IMAGES);
}

function extractTemuProduct(html: string, sourceUrl: string): TemuExtract {
  const region = temuProductRegion(html);
  const title = quotedField(region, ["goodsName", "goodsTitle", "productName", "productTitle"])
    ?? metaContent(html, "og:title")
    ?? metaContent(html, "twitter:title");
  const description = quotedField(region, ["goodsDesc", "goodsDescription", "productDesc", "productDescription"])
    ?? metaContent(html, "og:description")
    ?? metaContent(html, "description")
    ?? metaContent(html, "twitter:description");
  const brand = quotedField(region, ["brandName", "brand_name"]);
  const category = quotedField(region, ["leafCategoryName", "categoryName", "catName", "category_name"]);
  const productRef = quotedField(region, ["goodsId", "goods_id", "productId", "product_id"])
    ?? region.match(/["'](?:goodsId|goods_id|productId|product_id)["']\s*:\s*(\d{6,})/i)?.[1]
    ?? productRefFromUrl(sourceUrl);
  const price = numericField(region, ["salePrice", "sale_price", "localPrice", "priceAmount", "currentPrice"])
    ?? fallbackPrice(region);
  const images = temuImages(region, sourceUrl);
  return { title, description, brand, category, productRef, price, images };
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
    const temu = isTemuUrl(finalUrl) || isTemuUrl(resolvedUrl) ? extractTemuProduct(html, finalUrl) : null;
    const titleMeta = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
    const descriptionMeta = metaContent(html, "og:description") ?? metaContent(html, "description") ?? metaContent(html, "twitter:description");
    const basicTitle = basic.title && !/^(?:temu|shop|home)$/i.test(basic.title.trim()) ? basic.title : null;
    const betterTitle = temu?.title ?? basicTitle ?? titleMeta;
    const description = temu?.description ?? basic.description ?? descriptionMeta;
    const shortDescription = basic.shortDescription ?? (description ? description.slice(0, 240) : null);
    const genericImages = strictImages(html, finalUrl, basic.imageUrls || []);
    const images = temu?.images.length ? temu.images : genericImages;
    const videos = strictVideos(html, finalUrl);
    const price = temu?.price ?? basic.supplierSalePrice ?? basic.supplierRrp ?? basic.supplierCost ?? fallbackPrice(html);
    const supplierRef = temu?.productRef ?? basic.supplierProductRef ?? productRefFromUrl(finalUrl) ?? productRefFromUrl(resolvedUrl);

    return {
      ...basic,
      sourceUrl: looksLikeTemuProductUrl(finalUrl) ? finalUrl : resolvedUrl,
      title: betterTitle ?? basic.title,
      shortDescription,
      description,
      brand: temu?.brand ?? basic.brand,
      supplierCategory: temu?.category ?? basic.supplierCategory,
      supplierProductRef: supplierRef,
      supplierSalePrice: basic.supplierSalePrice ?? (price != null ? price : null),
      supplierSalePriceSourceLabel: basic.supplierSalePriceSourceLabel ?? (price != null ? "Rendered merchant product price" : null),
      imageUrls: images,
      videoUrls: videos,
      mediaWarnings: [
        "Firecrawl fallback used once because normal merchant reading was incomplete or blocked.",
        ...(temu ? ["Temu-specific extraction was isolated to the rendered product-data region to avoid page icons and promotional assets."] : []),
        `Rendered media retained ${images.length} candidate product image(s).`,
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
