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
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  productRef: string | null;
  price: number | null;
  currency: string | null;
  images: string[];
  videos: string[];
};

type StructuredProductExtract = {
  productName?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  brand?: unknown;
  category?: unknown;
  merchantProductId?: unknown;
  currentPrice?: unknown;
  currency?: unknown;
  productImages?: unknown;
  productVideos?: unknown;
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

function cleanUnknownText(value: unknown): string | null {
  return typeof value === "string" ? cleanText(value) : null;
}

function cleanUnknownNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  const canonical =
    html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ??
    html.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*canonical[^"']*["']/i)?.[1] ??
    metaContent(html, "og:url");
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

function isUsefulProductTitle(value: string | null): value is string {
  if (!value) return false;
  const normalized = value.trim();
  if (normalized.length < 8) return false;
  return !/^(?:temu|shop|home|product|item|sale|deals?)$/i.test(normalized);
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

function unknownUrlArray(value: unknown, sourceUrl: string, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.filter((item): item is string => typeof item === "string"), sourceUrl, max);
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

function temuProductRegion(html: string, sourceUrl: string): string {
  const productRef = productRefFromUrl(sourceUrl);
  if (productRef) {
    const index = html.indexOf(productRef);
    if (index >= 0) {
      return html.slice(Math.max(0, index - 80_000), Math.min(html.length, index + 180_000));
    }
  }
  const markers = [
    /["']goodsName["']\s*:/i,
    /["']goodsId["']\s*:/i,
    /["']productName["']\s*:/i,
    /["']productId["']\s*:/i,
  ];
  for (const marker of markers) {
    const match = marker.exec(html);
    if (!match || match.index == null) continue;
    return html.slice(Math.max(0, match.index - 80_000), Math.min(html.length, match.index + 180_000));
  }
  return html.slice(0, Math.min(html.length, 260_000));
}

function temuImages(region: string, sourceUrl: string): string[] {
  const values: string[] = [];
  const structured = /["'](?:imageUrl|imageURL|image_url|thumbUrl|thumbnailUrl|originImageUrl|originalImageUrl|goodsImageUrl|skuImageUrl|mainImageUrl|detailImageUrl|largeImageUrl)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values, sourceUrl, MAX_IMAGES);
}

function extractTemuProduct(html: string, sourceUrl: string): TemuExtract {
  const region = temuProductRegion(html, sourceUrl);
  const rawTitle =
    quotedField(region, ["goodsName", "goodsTitle", "productName", "productTitle"]) ??
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title");
  const title = isUsefulProductTitle(rawTitle) ? rawTitle : null;
  const description =
    quotedField(region, ["goodsDesc", "goodsDescription", "productDesc", "productDescription"]) ??
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    metaContent(html, "twitter:description");
  const shortDescription = description ? description.slice(0, 240) : null;
  const brand = quotedField(region, ["brandName", "brand_name"]);
  const category = quotedField(region, ["leafCategoryName", "categoryName", "catName", "category_name"]);
  const productRef =
    quotedField(region, ["goodsId", "goods_id", "productId", "product_id"]) ??
    region.match(/["'](?:goodsId|goods_id|productId|product_id)["']\s*:\s*(\d{6,})/i)?.[1] ??
    productRefFromUrl(sourceUrl);
  const price =
    numericField(region, ["salePrice", "sale_price", "localPrice", "priceAmount", "currentPrice"]) ??
    null;
  const images = temuImages(region, sourceUrl);
  return {
    title,
    shortDescription,
    description,
    brand,
    category,
    productRef,
    price,
    currency: null,
    images,
    videos: [],
  };
}

function structuredExtract(data: Record<string, unknown>, sourceUrl: string): TemuExtract | null {
  const raw = data.json;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const json = raw as StructuredProductExtract;
  const rawTitle = cleanUnknownText(json.productName);
  const title = isUsefulProductTitle(rawTitle) ? rawTitle : null;
  const description = cleanUnknownText(json.description);
  const shortDescription = cleanUnknownText(json.shortDescription) ?? (description ? description.slice(0, 240) : null);
  return {
    title,
    shortDescription,
    description,
    brand: cleanUnknownText(json.brand),
    category: cleanUnknownText(json.category),
    productRef: cleanUnknownText(json.merchantProductId) ?? productRefFromUrl(sourceUrl),
    price: cleanUnknownNumber(json.currentPrice),
    currency: cleanUnknownText(json.currency),
    images: unknownUrlArray(json.productImages, sourceUrl, MAX_IMAGES),
    videos: unknownUrlArray(json.productVideos, sourceUrl, MAX_VIDEOS),
  };
}

const PRODUCT_JSON_SCHEMA = {
  type: "object",
  properties: {
    productName: {
      type: "string",
      description: "Exact name/title of the single product displayed on this product page. Never return the marketplace or website name.",
    },
    shortDescription: {
      type: "string",
      description: "A concise factual description of this exact product, not shipping, coupon or marketplace text.",
    },
    description: {
      type: "string",
      description: "The factual product description/specifications for this exact product. Exclude marketplace promotions, shipping banners, coupons and site navigation.",
    },
    brand: { type: "string", description: "Product brand/manufacturer only when actually shown." },
    category: { type: "string", description: "The product category/breadcrumb category actually shown for this product." },
    merchantProductId: { type: "string", description: "Merchant product ID, goods ID or SKU for this exact product, not an order, campaign or tracking ID." },
    currentPrice: { type: "number", description: "Current advertised selling price of this exact product in the page's active currency. Do not return discount percentage, coupon amount, shipping cost or instalment amount." },
    currency: { type: "string", description: "Currency code or symbol associated with the current product price, for example ZAR." },
    productImages: {
      type: "array",
      items: { type: "string" },
      description: "Only image URLs belonging to this exact product gallery. Exclude logos, icons, payment logos, shipping/returns icons, app-store graphics, social icons, coupons and recommendation products.",
    },
    productVideos: {
      type: "array",
      items: { type: "string" },
      description: "Only video URLs belonging to this exact product, if present.",
    },
  },
};

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
        formats: [
          "html",
          {
            type: "json",
            schema: PRODUCT_JSON_SCHEMA,
            prompt:
              "Extract only the single primary product represented by this URL. Return its exact product name, current advertised product price, currency, brand if shown, category, merchant product ID/SKU, product descriptions/specifications, genuine product-gallery image URLs and product video URLs. Ignore all marketplace UI, coupons, shipping/payment icons, app-store/social assets, ads, recommendations and unrelated products. If a field is not actually available, omit it rather than guessing.",
          },
        ],
        onlyMainContent: false,
        waitFor: 3500,
      }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) {
      throw new ProductImportError(
        "rendered_import_failed",
        `Rendered-page importer returned ${response.status}.`,
        422,
      );
    }
    const data =
      payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? (payload.data as Record<string, unknown>)
        : payload;
    const html = typeof data.html === "string" ? data.html : typeof data.rawHtml === "string" ? data.rawHtml : "";
    const metadata =
      data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
        ? (data.metadata as Record<string, unknown>)
        : {};
    const finalUrl =
      typeof metadata.sourceURL === "string"
        ? metadata.sourceURL
        : typeof metadata.sourceUrl === "string"
          ? metadata.sourceUrl
          : typeof metadata.url === "string"
            ? metadata.url
            : resolvedUrl;
    if (!html.trim()) {
      throw new ProductImportError(
        "rendered_import_empty",
        "The rendered-page importer returned no product HTML.",
        422,
      );
    }

    const basic = parseGenericProductPage({
      html,
      sourceUrl: finalUrl,
      adapterKey: "rendered-web-page",
    });
    const structured = structuredExtract(data, finalUrl);
    const temu = isTemuUrl(finalUrl) || isTemuUrl(resolvedUrl) ? extractTemuProduct(html, finalUrl) : null;
    const titleMeta = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
    const descriptionMeta =
      metaContent(html, "og:description") ??
      metaContent(html, "description") ??
      metaContent(html, "twitter:description");
    const basicTitle = isUsefulProductTitle(basic.title) ? basic.title : null;
    const metaTitle = isUsefulProductTitle(titleMeta) ? titleMeta : null;

    const betterTitle = structured?.title ?? temu?.title ?? basicTitle ?? metaTitle;
    const description = structured?.description ?? temu?.description ?? basic.description ?? descriptionMeta;
    const shortDescription =
      structured?.shortDescription ??
      temu?.shortDescription ??
      basic.shortDescription ??
      (description ? description.slice(0, 240) : null);

    const structuredImages = structured?.images ?? [];
    const temuImagesOnly = temu?.images ?? [];
    const genericImages = strictImages(html, finalUrl, basic.imageUrls || []);
    const images = structuredImages.length
      ? structuredImages
      : temuImagesOnly.length
        ? temuImagesOnly
        : genericImages;
    const videos = structured?.videos.length ? structured.videos : strictVideos(html, finalUrl);

    const price =
      structured?.price ??
      temu?.price ??
      basic.supplierSalePrice ??
      basic.supplierRrp ??
      basic.supplierCost ??
      fallbackPrice(html);
    const supplierRef =
      structured?.productRef ??
      temu?.productRef ??
      basic.supplierProductRef ??
      productRefFromUrl(finalUrl) ??
      productRefFromUrl(resolvedUrl);

    if (!betterTitle || !images.length) {
      throw new ProductImportError(
        "rendered_import_incomplete",
        "The merchant page was rendered, but Growth could not safely confirm the real product name and product gallery.",
        422,
      );
    }

    return {
      ...basic,
      sourceUrl: looksLikeTemuProductUrl(finalUrl) ? finalUrl : resolvedUrl,
      title: betterTitle,
      shortDescription,
      description,
      brand: structured?.brand ?? temu?.brand ?? basic.brand,
      supplierCategory: structured?.category ?? temu?.category ?? basic.supplierCategory,
      supplierProductRef: supplierRef,
      supplierSalePrice: price,
      supplierSalePriceSourceLabel: price != null ? "Structured rendered merchant product price" : null,
      currency: structured?.currency ?? temu?.currency ?? basic.currency,
      imageUrls: images,
      videoUrls: videos,
      mediaWarnings: [
        "Firecrawl fallback used once because normal merchant reading was incomplete or blocked.",
        "Structured product extraction was used to separate the actual product from marketplace UI and promotional assets.",
        ...(temu
          ? ["Temu-specific HTML extraction remained available only as a secondary fallback behind structured product extraction."]
          : []),
        `Rendered media retained ${images.length} candidate product image(s).`,
      ],
      retrievalMethod: "rendered",
    };
  } catch (error) {
    if (error instanceof ProductImportError) throw error;
    throw new ProductImportError(
      "rendered_import_failed",
      "Rendered product-page reading failed.",
      422,
    );
  } finally {
    clearTimeout(timeout);
  }
}
