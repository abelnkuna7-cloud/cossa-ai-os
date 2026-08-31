import { resolveAffiliateProductUrl } from "./store-affiliate-rendered-fallback.server";

const FIRECRAWL_TIMEOUT_MS = 35_000;
const MAX_IMAGES = 16;

type TemuFieldRepair = {
  title: string | null;
  price: number | null;
  imageUrls: string[];
};

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\x2F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\\//g, "/")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\n|\\r|\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function usefulTitle(value: string | null): value is string {
  if (!value || value.length < 8) return false;
  return !/^(?:temu|shop|home|product|item|sale|deals?)$/i.test(value.trim());
}

function meta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name|itemprop)\\s*=\\s*["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const value = clean(html.match(pattern)?.[1]);
    if (value) return value;
  }
  return null;
}

function quoted(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`["']${escaped}["']\\s*:\\s*["']((?:\\\\.|[^"']){2,1600})["']`, "i"));
    const value = clean(match?.[1]);
    if (value) return value;
  }
  return null;
}

function numberFrom(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function currentTemuPrice(html: string): number | null {
  const visiblePatterns = [
    /after applying promos to\s*(?:ZAR\s*)?R\s*([0-9][0-9 ,.]*?(?:\.[0-9]{1,2})?)(?=\s|<|$)/i,
    /(?:current\s+(?:advertised\s+)?price|current\s+price|now)\s*[:\-]?\s*(?:ZAR\s*)?R\s*([0-9][0-9 ,.]*?(?:\.[0-9]{1,2})?)(?=\s|<|$)/i,
  ];
  for (const pattern of visiblePatterns) {
    const value = numberFrom(html.match(pattern)?.[1]);
    if (value) return value;
  }

  const productMeta = numberFrom(meta(html, "product:price:amount")) ?? numberFrom(meta(html, "og:price:amount"));
  if (productMeta) return productMeta;

  for (const key of ["salePrice", "sale_price", "currentPrice", "localPrice", "priceAmount"]) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`["']${escaped}["']\\s*:\\s*(?:["'])?([0-9]+(?:\\.[0-9]{1,2})?)(?:["'])?`, "i"));
    const value = numberFrom(match?.[1]);
    if (value) return value;
  }
  return null;
}

function absolute(raw: string, base: string): string | null {
  try {
    const cleaned = raw
      .replace(/\\u0026/gi, "&")
      .replace(/\\u002F/gi, "/")
      .replace(/\\x2F/gi, "/")
      .replace(/\\\//g, "/");
    const url = new URL(cleaned, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function productImages(html: string, base: string, title: string | null): string[] {
  let region = html;
  if (title) {
    const probe = title.slice(0, Math.min(title.length, 80)).toLowerCase();
    const index = html.toLowerCase().indexOf(probe);
    if (index >= 0) region = html.slice(Math.max(0, index - 60_000), Math.min(html.length, index + 150_000));
  }

  const values: string[] = [];
  for (const key of ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]) {
    const value = meta(html, key);
    if (value) values.push(value);
  }

  const structured = /["'](?:imageUrl|imageURL|image_url|galleryImage|galleryUrl|galleryURL|mainImage|mainImageUrl|productImage|productImageUrl|goodsImage|goodsImageUrl|skuImage|skuImageUrl|detailImage|detailImageUrl|originImage|originImageUrl|originalImage|originalImageUrl|largeImage|largeImageUrl|thumbUrl|thumbnailUrl)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) if (match[1]) values.push(match[1]);

  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const url = absolute(raw, base);
    if (!url) continue;
    if (/(?:logo|icon|avatar|profile|account|wallet|payment|coupon|gift|bonus|spin|shipping|delivery|truck|review|rating|heart|wishlist|security|shield|appstore|google[-_ ]?play|apple|instagram|facebook|whatsapp|tiktok|captcha|sprite|favicon|badge|social|promo|reward)/i.test(url)) continue;
    const key = url.replace(/[?&](?:width|height|w|h|quality|q|format|resize)=[^&]*/gi, "");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(url);
    if (output.length >= MAX_IMAGES) break;
  }
  return output;
}

export async function repairTemuTitlePriceAndImages(sourceUrl: string): Promise<TemuFieldRepair | null> {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }
  if (parsed.hostname.toLowerCase() !== "share.temu.com" && !parsed.hostname.toLowerCase().endsWith(".temu.com") && parsed.hostname.toLowerCase() !== "temu.com") return null;

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return null;

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
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) return null;
    const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : payload;
    const html = typeof data.html === "string" ? data.html : typeof data.rawHtml === "string" ? data.rawHtml : "";
    if (!html.trim()) return null;
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};
    const finalUrl = typeof metadata.sourceURL === "string"
      ? metadata.sourceURL
      : typeof metadata.sourceUrl === "string"
        ? metadata.sourceUrl
        : resolvedUrl;

    const candidates = [
      quoted(html, ["goodsName", "goodsTitle", "productName", "productTitle"]),
      meta(html, "og:title"),
      meta(html, "twitter:title"),
      clean(html.match(/<h1\b[^>]*>([\s\S]{8,1200}?)<\/h1>/i)?.[1]),
    ].filter((value): value is string => usefulTitle(value));
    const title = candidates.sort((a, b) => b.length - a.length)[0] ?? null;

    return {
      title,
      price: currentTemuPrice(html),
      imageUrls: productImages(html, finalUrl, title),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
