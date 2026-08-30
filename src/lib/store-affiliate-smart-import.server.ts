import { lookup } from "node:dns/promises";

import {
  importSupplierProduct,
  ProductImportError,
  type ImportedProductCandidate,
} from "./store-product-import.server";

const MAX_DOCUMENT_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;
const MAX_IMAGES = 40;
const MAX_VIDEOS = 12;

type SmartAffiliateCandidate = ImportedProductCandidate & {
  imageUrls: string[];
  videoUrls: string[];
  mediaWarnings: string[];
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
      throw new ProductImportError("source_too_large", "The affiliate product page is too large to analyse safely.", 422);
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

async function fetchPage(input: string): Promise<{ html: string; url: string }> {
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
          "User-Agent": "CossaStoreAffiliateImport/2.0 (+https://cossanexusholdings.co.za)",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new ProductImportError("source_redirect_failed", "Affiliate page redirect had no destination.", 422);
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new ProductImportError("source_fetch_failed", `Affiliate page returned ${response.status}.`, 422);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new ProductImportError("unsupported_source", "This affiliate URL did not return a product web page.", 422);
    }
    return { html: await readLimitedText(response), url: current.toString() };
  }
  throw new ProductImportError("source_redirect_failed", "Affiliate page redirected too many times.", 422);
}

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");
}

function absolute(value: string, sourceUrl: string): string | null {
  try {
    const url = new URL(decode(value), sourceUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function unique(values: string[], sourceUrl: string, max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const url = absolute(value, sourceUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
    if (result.length >= max) break;
  }
  return result;
}

function imageCandidates(html: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = match[0];
    for (const attr of ["src", "data-src", "data-original", "data-lazy-src", "data-zoom-image"]) {
      const found = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      if (found) values.push(found);
    }
    const srcset = tag.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const item of srcset.split(",")) {
        const candidate = item.trim().split(/\s+/)[0];
        if (candidate) values.push(candidate);
      }
    }
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*>/gi)) {
    const content = match[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) values.push(content);
  }
  for (const match of html.matchAll(/["'](?:image|imageUrl|image_url|galleryImage|largeImage)["']\s*:\s*["']([^"']+)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  return values.filter((value) => !/(?:logo|icon|payment|sprite|avatar|banner|placeholder)/i.test(value));
}

function videoCandidates(html: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/<(?:video|source)\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/(?:src|data-src)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src && /(?:\.mp4|\.webm|\.m3u8|video)/i.test(src)) values.push(src);
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["'][^>]*>/gi)) {
    const content = match[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) values.push(content);
  }
  for (const match of html.matchAll(/["'](?:videoUrl|video_url|videoSrc|video_src|playUrl|play_url)["']\s*:\s*["']([^"']+)["']/gi)) {
    if (match[1]) values.push(match[1]);
  }
  return values;
}

function productLikelyImages(values: string[]): string[] {
  const productish = values.filter((value) => /(?:product|goods|item|sku|gallery|detail|image|img|cdn)/i.test(value));
  return productish.length >= 2 ? productish : values;
}

export async function smartImportAffiliateProduct(sourceUrl: unknown): Promise<SmartAffiliateCandidate> {
  if (typeof sourceUrl !== "string" || !sourceUrl.trim()) {
    throw new ProductImportError("missing_source_url", "Paste an affiliate product URL first.");
  }
  const basic = await importSupplierProduct({ sourceUrl: sourceUrl.trim() });
  const page = await fetchPage(basic.sourceUrl || sourceUrl.trim());
  const discoveredImages = unique(productLikelyImages(imageCandidates(page.html)), page.url, MAX_IMAGES);
  const imageUrls = unique([...basic.imageUrls, ...discoveredImages], page.url, MAX_IMAGES);
  const videoUrls = unique(videoCandidates(page.html), page.url, MAX_VIDEOS);
  const mediaWarnings: string[] = [];
  if (!videoUrls.length) mediaWarnings.push("No directly accessible product video was exposed by this page.");
  if (imageUrls.length === basic.imageUrls.length && imageUrls.length > 0) {
    mediaWarnings.push("Only media exposed by the merchant page was available to the importer.");
  }
  return {
    ...basic,
    sourceUrl: page.url,
    imageUrls,
    videoUrls,
    mediaWarnings,
  };
}
