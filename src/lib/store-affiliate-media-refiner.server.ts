import { createHash } from "node:crypto";

type AffiliateCandidateLike = {
  sourceUrl: string;
  title: string | null;
  imageUrls: string[];
  videoUrls: string[];
  mediaWarnings: string[];
};

type RankedImage = {
  url: string;
  score: number;
  order: number;
};

const MAX_PRODUCT_IMAGES = 24;
const FETCH_TIMEOUT_MS = 10_000;
const FIRECRAWL_TIMEOUT_MS = 35_000;
const UI_TERMS =
  /(?:logo|icon|avatar|profile|account|wallet|payment|coupon|gift|bonus|spin|shipping|delivery|truck|review|rating|heart|wishlist|security|shield|app(?:store)?|download|google[-_ ]?play|apple|storefront|message|chat|support|captcha|sprite|pixel|tracking|favicon|badge|social|facebook|whatsapp|instagram|tiktok|header|footer|nav(?:igation)?|menu)/i;
const PRODUCT_TERMS =
  /(?:product|goods|item|sku|gallery|detail|main[-_ ]?image|image[-_ ]?list|media[-_ ]?list|product[-_ ]?image|goods[-_ ]?image|sku[-_ ]?image|zoom|carousel|picture)/i;

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\x2F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\u003A/gi, ":");
}

function absolute(value: string, sourceUrl: string): string | null {
  try {
    const cleaned = decode(value).trim().replace(/^['\"]|['\"]$/g, "");
    const url = new URL(cleaned, sourceUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function canonicalKey(input: string): string {
  try {
    const url = new URL(input);
    for (const key of ["width", "height", "w", "h", "resize", "quality", "q", "format", "thumb", "thumbnail"]) {
      url.searchParams.delete(key);
    }
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return input;
  }
}

function titleTokens(title: string | null): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !/(?:with|from|this|that|your|more|shop|sale|free|temu)/i.test(token))
    .slice(0, 12);
}

function contextScore(context: string, title: string | null): number {
  let score = 0;
  if (PRODUCT_TERMS.test(context)) score += 5;
  if (UI_TERMS.test(context)) score -= 10;
  const lower = context.toLowerCase();
  const tokens = titleTokens(title);
  const matches = tokens.filter((token) => lower.includes(token)).length;
  score += Math.min(matches, 4) * 2;
  return score;
}

function productRegion(html: string, title: string | null): string {
  if (!title) return html;
  const lower = html.toLowerCase();
  const probes = [title, title.split(/\s+/).slice(0, 8).join(" "), title.split(/\s+/).slice(0, 4).join(" ")]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 12);
  for (const probe of probes) {
    const index = lower.indexOf(probe);
    if (index >= 0) {
      const start = Math.max(0, index - 90_000);
      const end = Math.min(html.length, index + 180_000);
      return html.slice(start, end);
    }
  }
  return html;
}

function pushRanked(
  map: Map<string, RankedImage>,
  raw: string,
  sourceUrl: string,
  score: number,
  order: number,
) {
  const url = absolute(raw, sourceUrl);
  if (!url || UI_TERMS.test(url)) return;
  const key = canonicalKey(url);
  const previous = map.get(key);
  if (!previous || score > previous.score) map.set(key, { url, score, order });
}

function rankedImageCandidates(
  html: string,
  sourceUrl: string,
  title: string | null,
  existing: string[],
): string[] {
  const region = productRegion(html, title);
  const map = new Map<string, RankedImage>();
  let order = 0;

  for (const url of existing) pushRanked(map, url, sourceUrl, 50, order++);

  for (const match of region.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const context = region.slice(Math.max(0, (match.index ?? 0) - 500), Math.min(region.length, (match.index ?? 0) + tag.length + 500));
    const width = Number(tag.match(/\bwidth\s*=\s*["']?(\d{1,4})/i)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight\s*=\s*["']?(\d{1,4})/i)?.[1] ?? 0);
    if (width && height && (width < 180 || height < 180)) continue;
    if (UI_TERMS.test(tag) || UI_TERMS.test(context)) continue;
    const score = 8 + contextScore(context, title);
    for (const attr of ["src", "data-src", "data-original", "data-lazy-src", "data-zoom-image", "data-image", "data-src-large", "data-large", "data-origin-src"]) {
      const found = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      if (found) pushRanked(map, found, sourceUrl, score, order++);
    }
    const srcset = tag.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const entries = srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0]).filter(Boolean).reverse();
      for (const entry of entries) pushRanked(map, entry, sourceUrl, score + 1, order++);
    }
  }

  const structured = /["'](?:gallery(?:Image|Url|URL|Images|Urls)|image(?:Url|URL|_url|List|Urls)|largeImage(?:Url)?|originImage(?:Url)?|originalImage(?:Url)?|mainImage(?:Url)?|goodsImage(?:Url)?|skuImage(?:Url)?|detailImage(?:Url)?|productImage(?:Url)?)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) {
    const index = match.index ?? 0;
    const context = region.slice(Math.max(0, index - 350), Math.min(region.length, index + match[0].length + 350));
    const score = 15 + contextScore(context, title);
    if (score > 5) pushRanked(map, match[1], sourceUrl, score, order++);
  }

  const broad = /["']((?:https?:)?(?:\\?\/\\?\/)[^"'\s<>]+?(?:\.avif|\.webp|\.png|\.jpe?g)(?:\?[^"'\s<>]*)?)["']/gi;
  for (const match of region.matchAll(broad)) {
    const index = match.index ?? 0;
    const context = region.slice(Math.max(0, index - 450), Math.min(region.length, index + match[0].length + 450));
    const score = contextScore(context, title);
    if (score >= 4) pushRanked(map, match[1], sourceUrl, score, order++);
  }

  const anchors = existing.map((url) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      return { host: parsed.hostname, prefix: parts.slice(0, 2).join("/") };
    } catch {
      return null;
    }
  }).filter(Boolean) as Array<{ host: string; prefix: string }>;

  const ranked = [...map.values()].map((item) => {
    try {
      const parsed = new URL(item.url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const prefix = parts.slice(0, 2).join("/");
      const sameHost = anchors.some((anchor) => anchor.host === parsed.hostname);
      const samePrefix = anchors.some((anchor) => anchor.host === parsed.hostname && anchor.prefix && anchor.prefix === prefix);
      return { ...item, score: item.score + (sameHost ? 3 : 0) + (samePrefix ? 5 : 0) };
    } catch {
      return item;
    }
  });

  return ranked
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 40)
    .map((item) => item.url);
}

async function renderedHtml(sourceUrl: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl, formats: ["html"], onlyMainContent: false, waitFor: 3500 }),
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const data = payload && typeof payload.data === "object" && payload.data ? (payload.data as Record<string, unknown>) : payload;
    const html = data && (typeof data.html === "string" ? data.html : typeof data.rawHtml === "string" ? data.rawHtml : null);
    return html && html.trim() ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type ValidatedImage = { url: string; fingerprint: string };

async function validateImage(url: string, pageUrl: string): Promise<ValidatedImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: pageUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Range: "bytes=0-65535",
      },
    });
    if (!response.ok && response.status !== 206) return null;
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    if (contentType.includes("svg")) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1200) return null;
    const fingerprint = createHash("sha256").update(bytes).digest("hex");
    return { url, fingerprint };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanImages(urls: string[], pageUrl: string): Promise<string[]> {
  const seenUrl = new Set<string>();
  const candidates = urls.filter((url) => {
    const key = canonicalKey(url);
    if (seenUrl.has(key)) return false;
    seenUrl.add(key);
    return !UI_TERMS.test(url);
  });

  const results: Array<ValidatedImage | null> = new Array(candidates.length).fill(null);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= candidates.length) return;
      results[index] = await validateImage(candidates[index], pageUrl);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, candidates.length) }, () => worker()));

  const seenFingerprints = new Set<string>();
  const clean: string[] = [];
  for (const result of results) {
    if (!result || seenFingerprints.has(result.fingerprint)) continue;
    seenFingerprints.add(result.fingerprint);
    clean.push(result.url);
    if (clean.length >= MAX_PRODUCT_IMAGES) break;
  }
  return clean;
}

export async function refineAffiliateProductMedia<T extends AffiliateCandidateLike>(candidate: T): Promise<T> {
  const html = await renderedHtml(candidate.sourceUrl);
  if (!html) return candidate;

  const ranked = rankedImageCandidates(html, candidate.sourceUrl, candidate.title, candidate.imageUrls);
  const clean = await cleanImages(ranked, candidate.sourceUrl);
  if (!clean.length) return candidate;

  const removed = Math.max(0, candidate.imageUrls.length - clean.length);
  const mediaWarnings = [
    ...candidate.mediaWarnings,
    ...(removed > 0
      ? [`Smart media filtering removed ${removed} duplicate or non-product image(s) from the merchant page.`]
      : []),
  ];

  return {
    ...candidate,
    imageUrls: clean,
    mediaWarnings: [...new Set(mediaWarnings)],
  };
}
