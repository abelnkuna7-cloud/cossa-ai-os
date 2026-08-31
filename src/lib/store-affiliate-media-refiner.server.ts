import { createHash } from "node:crypto";

type AffiliateCandidateLike = {
  sourceUrl: string;
  title: string | null;
  imageUrls: string[];
  videoUrls: string[];
  mediaWarnings: string[];
};

type RankedImage = { url: string; score: number; order: number };
type MediaFamily = { host: string; prefix: string };
type ValidatedImage = { url: string; fingerprint: string };

const MAX_PRODUCT_IMAGES = 16;
const FETCH_TIMEOUT_MS = 10_000;
const FIRECRAWL_TIMEOUT_MS = 35_000;
const UI_TERMS =
  /(?:logo|icon|avatar|profile|account|wallet|payment|coupon|gift|bonus|spin|shipping|delivery|truck|review|rating|heart|wishlist|security|shield|app(?:store)?|download|google[-_ ]?play|apple|storefront|message|chat|support|captcha|sprite|pixel|tracking|favicon|badge|social|facebook|whatsapp|instagram|tiktok|header|footer|nav(?:igation)?|menu|reward|promo|promotion)/i;
const PRODUCT_TERMS =
  /(?:product|goods|item|sku|gallery|detail|main[-_ ]?image|image[-_ ]?list|media[-_ ]?list|product[-_ ]?image|goods[-_ ]?image|sku[-_ ]?image|zoom|carousel|picture|thumbnail[-_ ]?list)/i;

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

function familyOf(input: string): MediaFamily | null {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    return { host: url.hostname, prefix: parts.slice(0, 2).join("/") };
  } catch {
    return null;
  }
}

function sameFamily(url: string, anchor: MediaFamily | null): boolean {
  if (!anchor) return false;
  const current = familyOf(url);
  if (!current || current.host !== anchor.host) return false;
  if (!anchor.prefix || !current.prefix) return true;
  return current.prefix === anchor.prefix;
}

function titleTokens(title: string | null): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !/(?:with|from|this|that|your|more|shop|sale|free|temu|deal|price)/i.test(token))
    .slice(0, 10);
}

function contextScore(context: string, title: string | null): number {
  if (UI_TERMS.test(context)) return -20;
  let score = PRODUCT_TERMS.test(context) ? 7 : 0;
  const lower = context.toLowerCase();
  score += Math.min(4, titleTokens(title).filter((token) => lower.includes(token)).length) * 2;
  return score;
}

function productRegion(html: string, title: string | null): string {
  if (!title) return html;
  const lower = html.toLowerCase();
  const probes = [
    title,
    title.split(/\s+/).slice(0, 8).join(" "),
    title.split(/\s+/).slice(0, 4).join(" "),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 12);
  for (const probe of probes) {
    const index = lower.indexOf(probe);
    if (index >= 0) return html.slice(Math.max(0, index - 45_000), Math.min(html.length, index + 95_000));
  }
  return html;
}

function pushRanked(
  map: Map<string, RankedImage>,
  raw: string,
  sourceUrl: string,
  score: number,
  order: number,
  anchor: MediaFamily | null,
  requireFamily = false,
) {
  const url = absolute(raw, sourceUrl);
  if (!url || UI_TERMS.test(url)) return;
  if (requireFamily && anchor && !sameFamily(url, anchor)) return;
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

  const primary = existing.find((url) => !UI_TERMS.test(url)) ?? null;
  const anchor = primary ? familyOf(primary) : null;
  if (primary) pushRanked(map, primary, sourceUrl, 100, order++, anchor);

  // Existing URLs from the broad importer are no longer trusted automatically.
  // Keep only those that belong to the same CDN/path family as the primary product image.
  for (const url of existing.slice(1)) {
    if (sameFamily(url, anchor)) pushRanked(map, url, sourceUrl, 30, order++, anchor, true);
  }

  // Explicit product/gallery properties are high confidence.
  const structured = /["'](?:gallery(?:Image|Url|URL|Images|Urls)|image(?:List|Urls)|largeImage(?:Url)?|originImage(?:Url)?|originalImage(?:Url)?|mainImage(?:Url)?|goodsImage(?:Url)?|skuImage(?:Url)?|detailImage(?:Url)?|productImage(?:Url)?)["']\s*:\s*["']([^"']+)["']/gi;
  for (const match of region.matchAll(structured)) {
    const index = match.index ?? 0;
    const context = region.slice(Math.max(0, index - 300), Math.min(region.length, index + match[0].length + 300));
    const score = 22 + contextScore(context, title) + (sameFamily(absolute(match[1], sourceUrl) ?? "", anchor) ? 8 : 0);
    if (score >= 18) pushRanked(map, match[1], sourceUrl, score, order++, anchor);
  }

  // Rendered product galleries often expose their thumbnails as img tags. Only keep images
  // whose surrounding markup is product/gallery related, or which match the primary image family.
  for (const match of region.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const index = match.index ?? 0;
    const context = region.slice(Math.max(0, index - 500), Math.min(region.length, index + tag.length + 500));
    if (UI_TERMS.test(tag) || UI_TERMS.test(context)) continue;
    const width = Number(tag.match(/\bwidth\s*=\s*["']?(\d{1,4})/i)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight\s*=\s*["']?(\d{1,4})/i)?.[1] ?? 0);
    if (width && height && (width < 160 || height < 160)) continue;
    const baseScore = contextScore(context, title);

    const foundUrls: string[] = [];
    for (const attr of ["src", "data-src", "data-original", "data-lazy-src", "data-zoom-image", "data-image", "data-src-large", "data-large", "data-origin-src"]) {
      const found = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      if (found) foundUrls.push(found);
    }
    const srcset = tag.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) foundUrls.push(...srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0]).filter(Boolean).reverse());

    for (const raw of foundUrls) {
      const resolved = absolute(raw, sourceUrl);
      if (!resolved) continue;
      const familyMatch = sameFamily(resolved, anchor);
      if (!familyMatch && baseScore < 7) continue;
      pushRanked(map, resolved, sourceUrl, 10 + baseScore + (familyMatch ? 10 : 0), order++, anchor);
    }
  }

  return [...map.values()]
    .filter((item) => item.score >= 12)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 30)
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
    if (!contentType.startsWith("image/") || contentType.includes("svg")) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1800) return null;
    return { url, fingerprint: createHash("sha256").update(bytes).digest("hex") };
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
    if (seenUrl.has(key) || UI_TERMS.test(url)) return false;
    seenUrl.add(key);
    return true;
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
  if (!clean.length) {
    return {
      ...candidate,
      imageUrls: candidate.imageUrls.slice(0, 1),
      mediaWarnings: [
        ...new Set([
          ...candidate.mediaWarnings,
          "Smart media filtering could not confirm the full product gallery; only the primary validated product image was retained.",
        ]),
      ],
    };
  }

  return {
    ...candidate,
    imageUrls: clean,
    mediaWarnings: [
      ...new Set([
        ...candidate.mediaWarnings,
        `Smart media filtering retained ${clean.length} product-gallery image(s) and excluded unrelated merchant interface assets.`,
      ]),
    ],
  };
}
