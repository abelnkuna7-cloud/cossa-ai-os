import { lookup } from "node:dns/promises";

import {
  importSupplierProduct,
  parseGenericProductPage,
  ProductImportError,
  type ImportedProductCandidate,
} from "./store-product-import.server";

const MAX_DOCUMENT_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const MEDIA_TIMEOUT_MS = 9_000;
const MAX_REDIRECTS = 4;
const MAX_IMAGES = 40;
const MAX_VIDEOS = 12;
const MEDIA_CONCURRENCY = 6;
const FIRECRAWL_TIMEOUT_MS = 35_000;

type SmartAffiliateCandidate = ImportedProductCandidate & {
  imageUrls: string[];
  videoUrls: string[];
  mediaWarnings: string[];
  retrievalMethod: "direct" | "rendered";
};

type LoadedPage = {
  html: string;
  url: string;
  method: "direct" | "rendered";
};

function blockedAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }
  const v4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4)
    return (
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  const [first, second] = v4.slice(1).map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

async function assertSafeExternalUrl(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new ProductImportError("unsafe_source_url", "This product URL is not publicly reachable.");
  }
  const records = await lookup(hostname, { all: true, verbatim: true }).catch(() => {
    throw new ProductImportError("source_unreachable", "The affiliate URL could not be reached.", 422);
  });
  if (!records.length || records.some((record) => blockedAddress(record.address))) {
    throw new ProductImportError("unsafe_source_url", "This product URL is not publicly reachable.");
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
    throw new ProductImportError(
      "source_too_large",
      "The affiliate product page is too large to analyse safely.",
      422,
    );
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new ProductImportError(
        "source_too_large",
        "The affiliate product page is too large to analyse safely.",
        422,
      );
    }
    chunks.push(value);
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(output);
}

async function fetchDirectPage(input: string): Promise<LoadedPage> {
  let current = new URL(input);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertSafeExternalUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-ZA,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (compatible; CossaStoreAffiliateImport/4.0; +https://cossanexusholdings.co.za)",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "The affiliate page took too long to respond."
          : "The affiliate page could not be fetched directly.";
      throw new ProductImportError("source_fetch_failed", message, 422);
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ProductImportError(
          "source_redirect_failed",
          "Affiliate page redirect had no destination.",
          422,
        );
      }
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) {
      throw new ProductImportError(
        "source_fetch_failed",
        `Affiliate page returned ${response.status}.`,
        422,
      );
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new ProductImportError(
        "unsupported_source",
        "This affiliate URL did not return a product web page.",
        422,
      );
    }
    const html = await readLimitedText(response);
    if (!html.trim()) {
      throw new ProductImportError("empty_source", "The merchant returned an empty product page.", 422);
    }
    return { html, url: current.toString(), method: "direct" };
  }
  throw new ProductImportError(
    "source_redirect_failed",
    "Affiliate page redirected too many times.",
    422,
  );
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function fetchRenderedPage(input: string): Promise<LoadedPage> {
  const url = new URL(input);
  await assertSafeExternalUrl(url);

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new ProductImportError(
      "rendered_import_not_configured",
      "This merchant blocks normal server reading. Configure FIRECRAWL_API_KEY in the GROWTH server environment so Smart Affiliate Import can read protected or JavaScript-rendered product pages.",
      422,
    );
  }

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
        url: url.toString(),
        formats: ["html"],
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

    const data = objectValue(payload.data) ?? payload;
    const html = stringValue(data.html) ?? stringValue(data.rawHtml);
    const metadata = objectValue(data.metadata);
    const finalUrl =
      stringValue(metadata?.sourceURL) ??
      stringValue(metadata?.sourceUrl) ??
      stringValue(metadata?.url) ??
      url.toString();

    if (!html) {
      throw new ProductImportError(
        "rendered_import_empty",
        "The rendered-page importer could not retrieve product HTML from this merchant.",
        422,
      );
    }
    return { html, url: finalUrl, method: "rendered" };
  } catch (error) {
    if (error instanceof ProductImportError) throw error;
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Rendered product-page reading timed out."
        : "Rendered product-page reading failed.";
    throw new ProductImportError("rendered_import_failed", message, 422);
  } finally {
    clearTimeout(timeout);
  }
}

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\x2F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\u002D/gi, "-")
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

function canonicalMediaKey(input: string): string {
  try {
    const url = new URL(input);
    const disposable = [
      "width",
      "height",
      "w",
      "h",
      "resize",
      "quality",
      "q",
      "format",
      "thumbnail",
      "thumb",
    ];
    for (const key of disposable) url.searchParams.delete(key);
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return input;
  }
}

function unique(values: string[], sourceUrl: string, max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const url = absolute(value, sourceUrl);
    if (!url) continue;
    const key = canonicalMediaKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
    if (result.length >= max) break;
  }
  return result;
}

function imageCandidates(html: string): string[] {
  const values: string[] = [];

  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = match[0];
    for (const attr of [
      "src",
      "data-src",
      "data-original",
      "data-lazy-src",
      "data-zoom-image",
      "data-image",
      "data-src-large",
      "data-large",
      "data-origin-src",
    ]) {
      const found = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      if (found) values.push(found);
    }
    const srcset = tag.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const entries = srcset
        .split(",")
        .map((item) => item.trim().split(/\s+/)[0])
        .filter(Boolean);
      values.push(...entries.reverse());
    }
  }

  for (const match of html.matchAll(
    /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]*>/gi,
  )) {
    const content = match[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) values.push(content);
  }

  for (const match of html.matchAll(
    /["'](?:image|imageUrl|imageURL|image_url|galleryImage|galleryUrl|galleryURL|largeImage|largeImageUrl|thumbUrl|thumbnailUrl|originImage|originImageUrl|originalImage|originalImageUrl|mainImage|mainImageUrl|goodsImage|goodsImageUrl|skuImage|skuImageUrl|detailImage|detailImageUrl)["']\s*:\s*["']([^"']+)["']/gi,
  )) {
    if (match[1]) values.push(match[1]);
  }

  // Modern marketplaces often keep the complete gallery inside hydrated JSON/script state.
  // Capture quoted absolute CDN/image URLs even when the property names are minified or unknown.
  for (const match of html.matchAll(
    /["']((?:https?:)?(?:\\?\/\\?\/)[^"'\s<>]+?(?:\.avif|\.webp|\.png|\.jpe?g)(?:\?[^"'\s<>]*)?)["']/gi,
  )) {
    if (match[1]) values.push(match[1]);
  }

  return values.filter(
    (value) =>
      !/(?:logo|icon|payment|sprite|avatar|banner|placeholder|tracking|pixel|favicon|captcha)/i.test(
        value,
      ),
  );
}

function videoCandidates(html: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/<(?:video|source)\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/(?:src|data-src)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src && /(?:\.mp4|\.webm|\.m3u8|video)/i.test(src)) values.push(src);
  }
  for (const match of html.matchAll(
    /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["'][^>]*>/gi,
  )) {
    const content = match[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) values.push(content);
  }
  for (const match of html.matchAll(
    /["'](?:videoUrl|videoURL|video_url|videoSrc|video_src|playUrl|playURL|play_url|videoPlayUrl|videoPlayURL)["']\s*:\s*["']([^"']+)["']/gi,
  )) {
    if (match[1]) values.push(match[1]);
  }
  for (const match of html.matchAll(
    /["']((?:https?:)?(?:\\?\/\\?\/)[^"'\s<>]+?(?:\.mp4|\.webm|\.m3u8)(?:\?[^"'\s<>]*)?)["']/gi,
  )) {
    if (match[1]) values.push(match[1]);
  }
  return values;
}

function productLikelyImages(values: string[]): string[] {
  const productish = values.filter((value) =>
    /(?:product|goods|item|sku|gallery|detail|image|img|cdn|media|pic)/i.test(value),
  );
  return productish.length >= 2 ? productish : values;
}

function mediaHeaders(pageUrl: string): HeadersInit {
  return {
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
    Referer: pageUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  };
}

async function isUsableImage(imageUrl: string, pageUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
    await assertSafeExternalUrl(parsed);
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEDIA_TIMEOUT_MS);
  try {
    const response = await fetch(parsed, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        ...mediaHeaders(pageUrl),
        Range: "bytes=0-2047",
      },
    });
    if (!response.ok && response.status !== 206) return false;
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.startsWith("image/")) return true;
    // A few CDNs return octet-stream for images. Accept only when the final URL clearly looks like image media.
    if (
      (contentType.includes("octet-stream") || !contentType) &&
      /\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(response.url || imageUrl)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateImages(values: string[], pageUrl: string): Promise<string[]> {
  const candidates = unique(values, pageUrl, MAX_IMAGES);
  const valid = new Array<boolean>(candidates.length).fill(false);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= candidates.length) return;
      valid[index] = await isUsableImage(candidates[index], pageUrl);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MEDIA_CONCURRENCY, candidates.length) }, () => worker()),
  );
  return candidates.filter((_, index) => valid[index]).slice(0, MAX_IMAGES);
}

function candidateQuality(candidate: ImportedProductCandidate): number {
  return [
    candidate.title,
    candidate.brand,
    candidate.supplierProductRef,
    candidate.supplierSalePrice ?? candidate.supplierRrp ?? candidate.supplierCost,
    candidate.imageUrls.length > 0,
    candidate.description || candidate.shortDescription,
  ].filter(Boolean).length;
}

async function buildFromPage(page: LoadedPage): Promise<SmartAffiliateCandidate> {
  const basic = parseGenericProductPage({
    html: page.html,
    sourceUrl: page.url,
    adapterKey: page.method === "rendered" ? "rendered-web-page" : "generic-web-page",
  });
  const discoveredImages = unique(
    productLikelyImages(imageCandidates(page.html)),
    page.url,
    MAX_IMAGES,
  );
  const rawImages = unique([...basic.imageUrls, ...discoveredImages], page.url, MAX_IMAGES);
  const imageUrls = await validateImages(rawImages, page.url);
  const videoUrls = unique(videoCandidates(page.html), page.url, MAX_VIDEOS);
  const mediaWarnings: string[] = [];
  const rejectedImageCount = Math.max(0, rawImages.length - imageUrls.length);

  if (rejectedImageCount > 0) {
    mediaWarnings.push(
      `${rejectedImageCount} broken, blocked or non-image media URL(s) were rejected before the draft was created.`,
    );
  }
  if (!videoUrls.length) {
    mediaWarnings.push("No directly accessible product video was exposed by this page.");
  }
  if (!imageUrls.length) {
    mediaWarnings.push("No usable product images were exposed by this page.");
  }
  if (page.method === "rendered") {
    mediaWarnings.push("This merchant required the rendered-page fallback to read its product page.");
  }
  return {
    ...basic,
    sourceUrl: page.url,
    imageUrls,
    videoUrls,
    mediaWarnings,
    retrievalMethod: page.method,
  };
}

function mergeCandidates(
  primary: SmartAffiliateCandidate,
  secondary: SmartAffiliateCandidate,
): SmartAffiliateCandidate {
  return {
    ...primary,
    title: primary.title ?? secondary.title,
    shortDescription: primary.shortDescription ?? secondary.shortDescription,
    description: primary.description ?? secondary.description,
    supplierCategory: primary.supplierCategory ?? secondary.supplierCategory,
    brand: primary.brand ?? secondary.brand,
    supplierProductRef: primary.supplierProductRef ?? secondary.supplierProductRef,
    supplierCost: primary.supplierCost ?? secondary.supplierCost,
    supplierCostConfidence:
      primary.supplierCost != null ? primary.supplierCostConfidence : secondary.supplierCostConfidence,
    supplierCostSourceLabel: primary.supplierCostSourceLabel ?? secondary.supplierCostSourceLabel,
    supplierRrp: primary.supplierRrp ?? secondary.supplierRrp,
    supplierRrpSourceLabel: primary.supplierRrpSourceLabel ?? secondary.supplierRrpSourceLabel,
    supplierSalePrice: primary.supplierSalePrice ?? secondary.supplierSalePrice,
    supplierSalePriceSourceLabel:
      primary.supplierSalePriceSourceLabel ?? secondary.supplierSalePriceSourceLabel,
    currency: primary.currency ?? secondary.currency,
    variants: primary.variants.length ? primary.variants : secondary.variants,
    imageUrls: unique([...primary.imageUrls, ...secondary.imageUrls], primary.sourceUrl, MAX_IMAGES),
    videoUrls: unique([...primary.videoUrls, ...secondary.videoUrls], primary.sourceUrl, MAX_VIDEOS),
    mediaWarnings: [...new Set([...primary.mediaWarnings, ...secondary.mediaWarnings])],
    warnings: [...primary.warnings, ...secondary.warnings],
    retrievalMethod:
      primary.retrievalMethod === "rendered" || secondary.retrievalMethod === "rendered"
        ? "rendered"
        : "direct",
  };
}

export async function smartImportAffiliateProduct(
  sourceUrl: unknown,
): Promise<SmartAffiliateCandidate> {
  if (typeof sourceUrl !== "string" || !sourceUrl.trim()) {
    throw new ProductImportError("missing_source_url", "Paste an affiliate product URL first.");
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl.trim());
  } catch {
    throw new ProductImportError(
      "invalid_source_url",
      "Paste a complete http or https affiliate product URL.",
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ProductImportError(
      "invalid_source_url",
      "Only http and https affiliate product URLs can be imported.",
    );
  }
  await assertSafeExternalUrl(parsed);

  let directError: unknown = null;
  let directResult: SmartAffiliateCandidate | null = null;

  try {
    const directCandidate = await importSupplierProduct({ sourceUrl: parsed.toString() });
    const directPage = await fetchDirectPage(directCandidate.sourceUrl || parsed.toString());
    const direct = await buildFromPage(directPage);
    const mergedBase: SmartAffiliateCandidate = {
      ...direct,
      title: direct.title ?? directCandidate.title,
      shortDescription: direct.shortDescription ?? directCandidate.shortDescription,
      description: direct.description ?? directCandidate.description,
      supplierCategory: direct.supplierCategory ?? directCandidate.supplierCategory,
      brand: direct.brand ?? directCandidate.brand,
      supplierProductRef: direct.supplierProductRef ?? directCandidate.supplierProductRef,
      supplierCost: direct.supplierCost ?? directCandidate.supplierCost,
      supplierCostConfidence:
        direct.supplierCost != null
          ? direct.supplierCostConfidence
          : directCandidate.supplierCostConfidence,
      supplierCostSourceLabel:
        direct.supplierCostSourceLabel ?? directCandidate.supplierCostSourceLabel,
      supplierRrp: direct.supplierRrp ?? directCandidate.supplierRrp,
      supplierRrpSourceLabel: direct.supplierRrpSourceLabel ?? directCandidate.supplierRrpSourceLabel,
      supplierSalePrice: direct.supplierSalePrice ?? directCandidate.supplierSalePrice,
      supplierSalePriceSourceLabel:
        direct.supplierSalePriceSourceLabel ?? directCandidate.supplierSalePriceSourceLabel,
      currency: direct.currency ?? directCandidate.currency,
      variants: direct.variants.length ? direct.variants : directCandidate.variants,
      warnings: [...directCandidate.warnings, ...direct.warnings],
    };

    const combinedRawImages = unique(
      [...directCandidate.imageUrls, ...mergedBase.imageUrls],
      mergedBase.sourceUrl,
      MAX_IMAGES,
    );
    directResult = {
      ...mergedBase,
      imageUrls: await validateImages(combinedRawImages, mergedBase.sourceUrl),
    };

    // A normal reader can have enough text fields while still exposing only one or two gallery images.
    // In that case keep the valid direct result, but also try the rendered reader for gallery enrichment.
    if (candidateQuality(directResult) >= 4 && directResult.imageUrls.length >= 4) {
      return directResult;
    }
    directError = new ProductImportError(
      "direct_import_incomplete",
      "The normal reader found the product but did not expose enough complete product/gallery data.",
      422,
    );
  } catch (error) {
    directError = error;
  }

  try {
    const renderedPage = await fetchRenderedPage(parsed.toString());
    const rendered = await buildFromPage(renderedPage);
    const enriched = directResult ? mergeCandidates(rendered, directResult) : rendered;
    if (candidateQuality(enriched) < 2) {
      throw new ProductImportError(
        "rendered_import_incomplete",
        "The merchant page was reached, but it still did not expose enough product information to import safely.",
        422,
      );
    }
    return enriched;
  } catch (renderedError) {
    // Do not throw away a usable direct import just because rendered enrichment is unavailable.
    if (directResult && candidateQuality(directResult) >= 4 && directResult.imageUrls.length > 0) {
      directResult.mediaWarnings = [
        ...directResult.mediaWarnings,
        "The complete rendered gallery could not be loaded. Only validated directly exposed media is shown.",
      ];
      return directResult;
    }
    if (renderedError instanceof ProductImportError) throw renderedError;
    if (directError instanceof ProductImportError) throw directError;
    throw new ProductImportError(
      "affiliate_import_failed",
      "GROWTH could not read this affiliate product page.",
      422,
    );
  }
}
