import { resolveAffiliateProductUrl } from "./store-affiliate-rendered-fallback.server";

const FIRECRAWL_TIMEOUT_MS = 35_000;
const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGES = 16;
const IMAGE_VALIDATION_CONCURRENCY = 5;

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
      .replace(/&amp;/gi, "&")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u002F/gi, "/")
      .replace(/\\x2F/gi, "/")
      .replace(/\\\//g, "/")
      .trim()
      .replace(/^['\"]|['\"]$/g, "");
    const url = new URL(cleaned, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function canonicalImageKey(input: string): string {
  try {
    const url = new URL(input);
    for (const key of ["width", "height", "w", "h", "quality", "q", "format", "resize", "thumbnail", "thumb"]) {
      url.searchParams.delete(key);
    }
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return input;
  }
}

function imageRegion(html: string, title: string | null): string {
  if (!title) return html;
  const probes = [title.slice(0, 80), title.slice(0, 45), title.split(/[,|]/)[0] ?? title]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 12);
  const lower = html.toLowerCase();
  for (const probe of probes) {
    const index = lower.indexOf(probe);
    if (index >= 0) return html.slice(Math.max(0, index - 80_000), Math.min(html.length, index + 220_000));
  }
  return html;
}

function imageCandidates(html: string, base: string, title: string | null): string[] {
  const region = imageRegion(html, title);
  const values: string[] = [];

  for (const key of ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]) {
    const value = meta(html, key);
    if (value) values.push(value);
  }

  const structured = /["'](?:imageUrl|imageURL|image_url|galleryImage|galleryUrl|galleryURL|mainImage|mainImageUrl|productImage|productImageUrl|goodsImage|goodsImageUrl|skuImage|skuImageUrl|detailImage|detailImageUrl|originImage|originImageUrl|originalImage|originalImageUrl|largeImage|largeImageUrl|thumbUrl|thumbnailUrl)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) if (match[1]) values.push(match[1]);

  for (const match of region.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    for (const attr of ["src", "data-src", "data-original", "data-lazy-src", "data-zoom-image", "data-image", "data-src-large", "data-large", "data-origin-src"]) {
      const found = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      if (found) values.push(found);
    }
    const srcset = tag.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const entries = srcset
        .split(",")
        .map((item) => item.trim().split(/\s+/)[0])
        .filter(Boolean)
        .reverse();
      values.push(...entries);
    }
  }

  for (const match of region.matchAll(/["']((?:https?:)?(?:\\?\/\\?\/)[^"'\s<>]+?(?:\.avif|\.webp|\.png|\.jpe?g)(?:\?[^"'\s<>]*)?)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }

  const resolved = values
    .map((value) => absolute(value, base))
    .filter((value): value is string => Boolean(value))
    .filter(
      (url) =>
        !/(?:logo|icon|avatar|profile|account|wallet|payment|coupon|gift|bonus|spin|shipping|delivery|truck|review|rating|heart|wishlist|security|shield|appstore|google[-_ ]?play|apple|instagram|facebook|whatsapp|tiktok|captcha|sprite|favicon|badge|social|promo|reward|footer|header|nav(?:igation)?)/i.test(
          url,
        ),
    );

  const anchor = resolved[0] ? new URL(resolved[0]) : null;
  const sameFamily = anchor
    ? resolved.filter((candidate) => {
        try {
          const url = new URL(candidate);
          if (url.hostname !== anchor.hostname) return false;
          const anchorParts = anchor.pathname.split("/").filter(Boolean);
          const candidateParts = url.pathname.split("/").filter(Boolean);
          return !anchorParts.length || !candidateParts.length || anchorParts[0] === candidateParts[0];
        } catch {
          return false;
        }
      })
    : resolved;

  const preferred = sameFamily.length >= 2 ? sameFamily : resolved;
  const seen = new Set<string>();
  const output: string[] = [];
  for (const url of preferred) {
    const key = canonicalImageKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(url);
    if (output.length >= MAX_IMAGES * 2) break;
  }
  return output;
}

async function isUsableImage(imageUrl: string, pageUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-ZA,en;q=0.9",
        Referer: pageUrl,
        Range: "bytes=0-4095",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });
    if (!response.ok && response.status !== 206) return false;
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.startsWith("image/")) return true;
    return (!contentType || contentType.includes("octet-stream")) && /\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(response.url || imageUrl);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function productImages(html: string, base: string, title: string | null): Promise<string[]> {
  const candidates = imageCandidates(html, base, title);
  if (!candidates.length) return [];

  const valid = new Array<boolean>(candidates.length).fill(false);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= candidates.length) return;
      valid[index] = await isUsableImage(candidates[index], base);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_VALIDATION_CONCURRENCY, candidates.length) }, () => worker()),
  );

  return candidates.filter((_, index) => valid[index]).slice(0, MAX_IMAGES);
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
      imageUrls: await productImages(html, finalUrl, title),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
