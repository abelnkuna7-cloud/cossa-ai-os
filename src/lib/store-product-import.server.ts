import { lookup } from "node:dns/promises";

export type ProductImportStatus = "imported" | "partial" | "blocked" | "failed";
export type ImportedStockStatus = "available" | "unavailable" | "preorder" | "unknown";

export type ImportedProductCandidate = {
  adapterKey: string;
  sourceUrl: string;
  title: string | null;
  description: string | null;
  specifications: string[];
  imageUrls: string[];
  supplierProductRef: string | null;
  pagePrice: number | null;
  currency: string | null;
  stockStatus: ImportedStockStatus;
  stockAvailabilityText: string | null;
  importStatus: ProductImportStatus;
  fieldsRequiringConfirmation: string[];
  warnings: string[];
};

export class ProductImportError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

type ProductSourceAdapter = {
  key: string;
  matches: (supplierCode: string | null) => boolean;
  parse: (input: {
    html: string;
    sourceUrl: string;
    adapterKey: string;
  }) => ImportedProductCandidate;
};

const MAX_DOCUMENT_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 12_000;

// Adapters deliberately share the truthful generic parser until a supplier
// provides a documented integration or stable product-page format. Adding a
// supplier later means adding an adapter, never changing the product model.
const PRODUCT_SOURCE_ADAPTERS: readonly ProductSourceAdapter[] = [
  {
    key: "dmc-wholesale",
    matches: (supplierCode) => supplierCode === "dmc-wholesale",
    parse: parseGenericProductPage,
  },
  {
    key: "generic-web-page",
    matches: () => true,
    parse: parseGenericProductPage,
  },
];

function trim(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.replace(/\s+/g, " ").trim();
  return result || null;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return trim(text);
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (!key || key === "meta" || key === "link") continue;
    result[key] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function absoluteHttpUrl(value: unknown, sourceUrl: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value, sourceUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function uniqueUrls(values: unknown[], sourceUrl: string): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => absoluteHttpUrl(value, sourceUrl))
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 8);
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function valueAtPath(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    const currentObject = object(current);
    if (!currentObject) return undefined;
    current = currentObject[key];
  }
  return current;
}

function hasProductType(value: unknown): boolean {
  return arrayOf(value).some((item) => String(item).toLowerCase() === "product");
}

function collectProductNodes(
  value: unknown,
  found: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProductNodes(item, found));
    return found;
  }
  const row = object(value);
  if (!row) return found;
  if (hasProductType(row["@type"])) found.push(row);
  if (row["@graph"]) collectProductNodes(row["@graph"], found);
  return found;
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    try {
      collectProductNodes(JSON.parse(script[2]), candidates);
    } catch {
      // A malformed JSON-LD block is common on supplier sites. Other supported
      // signals remain available, and the result stays visibly incomplete.
    }
  }
  return candidates;
}

function schemaImageValues(product: Record<string, unknown>): unknown[] {
  return arrayOf(product.image).flatMap((value) => {
    if (typeof value === "string") return [value];
    const row = object(value);
    return row ? [row.url, row.contentUrl] : [];
  });
}

function offerValues(product: Record<string, unknown>): Record<string, unknown>[] {
  return arrayOf(product.offers)
    .map(object)
    .filter((value): value is Record<string, unknown> => Boolean(value));
}

function availabilityFrom(value: unknown): {
  status: ImportedStockStatus;
  text: string | null;
} {
  const text = trim(typeof value === "string" ? value.replace(/^.*[/#]/, "") : null);
  const normalized = (text ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized.includes("instock") || normalized === "available") {
    return { status: "available", text };
  }
  if (
    normalized.includes("outofstock") ||
    normalized.includes("soldout") ||
    normalized === "unavailable"
  ) {
    return { status: "unavailable", text };
  }
  if (normalized.includes("preorder") || normalized.includes("preorder")) {
    return { status: "preorder", text };
  }
  return { status: "unknown", text };
}

function titleFromHtml(html: string): string | null {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanText(title);
}

function descriptionFromHtml(html: string): string | null {
  const paragraph = html.match(/<p\b[^>]*>([\s\S]{30,1600}?)<\/p>/i)?.[1];
  return clip(cleanText(paragraph) ?? "", 2_000) || null;
}

function metaData(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const values = attributes(match[0]);
    const key = (values.property ?? values.name ?? values.itemprop ?? "").toLowerCase();
    const content = trim(values.content);
    if (key && content && !result[key]) result[key] = content;
  }
  return result;
}

function linkImages(html: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const row = attributes(match[0]);
    if (row.rel?.toLowerCase().split(/\s+/).includes("image_src") && row.href)
      values.push(row.href);
  }
  return values;
}

function genericSpecifications(product: Record<string, unknown> | null): string[] {
  if (!product) return [];
  return arrayOf(product.additionalProperty)
    .map(object)
    .flatMap((item) => {
      const name = trim(item?.name);
      const value = trim(item?.value);
      return name && value ? [clip(`${name}: ${value}`, 300)] : [];
    })
    .slice(0, 24);
}

export function parseGenericProductPage(input: {
  html: string;
  sourceUrl: string;
  adapterKey?: string;
}): ImportedProductCandidate {
  const sourceUrl = new URL(input.sourceUrl).toString();
  const meta = metaData(input.html);
  const product = parseJsonLd(input.html)[0] ?? null;
  const offers = product ? offerValues(product) : [];
  const offer = offers[0] ?? null;
  const pageImages = [
    ...(product ? schemaImageValues(product) : []),
    meta["og:image"],
    meta["twitter:image"],
    ...linkImages(input.html),
  ];
  const title =
    trim(product?.name) ??
    trim(meta["og:title"]) ??
    trim(meta["twitter:title"]) ??
    titleFromHtml(input.html);
  const description =
    cleanText(trim(product?.description) ?? meta["og:description"] ?? meta.description) ??
    descriptionFromHtml(input.html);
  const reference =
    trim(product?.sku) ??
    trim(product?.productID) ??
    trim(product?.mpn) ??
    trim(meta["product:retailer_item_id"]);
  const pagePrice =
    numberValue(offer?.price) ??
    numberValue(offer?.lowPrice) ??
    numberValue(valueAtPath(product, "price"));
  const currency =
    trim(offer?.priceCurrency)?.toUpperCase() ??
    trim(meta["product:price:currency"])?.toUpperCase() ??
    null;
  const availability = availabilityFrom(offer?.availability ?? meta["product:availability"]);
  const specs = genericSpecifications(product);
  const imageUrls = uniqueUrls(pageImages, sourceUrl);
  const required = [
    !title ? "product title" : null,
    !description && specs.length === 0 ? "description or specifications" : null,
    imageUrls.length === 0 ? "product images" : null,
    !reference ? "supplier SKU/product ID" : null,
    pagePrice == null
      ? "supplier cost"
      : "confirm that the visible page price is your supplier cost",
    availability.status === "unknown" ? "stock / availability" : null,
    "current supplier stock before approval",
  ].filter((value): value is string => Boolean(value));
  const presentCount = [
    title,
    description || specs.length,
    imageUrls.length,
    reference,
    pagePrice,
  ].filter(Boolean).length;

  return {
    adapterKey: input.adapterKey ?? "generic-web-page",
    sourceUrl,
    title,
    description,
    specifications: specs,
    imageUrls,
    supplierProductRef: reference,
    pagePrice,
    currency,
    stockStatus: availability.status,
    stockAvailabilityText: availability.text,
    importStatus: presentCount >= 4 ? "imported" : "partial",
    fieldsRequiringConfirmation: required,
    warnings:
      pagePrice == null
        ? [
            "No supplier price was found on the accessible page. Enter and confirm your real cost manually.",
          ]
        : [
            "A visible page price was found. Confirm that it is your supplier cost before approving this product.",
          ],
  };
}

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
    throw new ProductImportError(
      "unsafe_source_url",
      "This product URL is not publicly reachable.",
    );
  }

  const records = await lookup(hostname, { all: true, verbatim: true }).catch(() => {
    throw new ProductImportError(
      "source_unreachable",
      "The supplier URL could not be reached.",
      422,
    );
  });
  if (!records.length || records.some((record) => blockedAddress(record.address))) {
    throw new ProductImportError(
      "unsafe_source_url",
      "This product URL is not publicly reachable.",
    );
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
    throw new ProductImportError(
      "source_too_large",
      "The supplier page is too large to import safely.",
      422,
    );
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new ProductImportError(
        "source_too_large",
        "The supplier page is too large to import safely.",
        422,
      );
    }
    chunks.push(value);
  }
  const document = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    document.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(document);
}

async function fetchSupplierPage(inputUrl: URL): Promise<{ html: string; sourceUrl: string }> {
  let current = inputUrl;
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
          "User-Agent": "CossaStoreProductIntake/1.0 (+https://cossanexusholdings.co.za)",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "The supplier page took too long to respond."
          : "The supplier page could not be fetched. Enter the product details manually.";
      throw new ProductImportError("source_fetch_failed", message, 422);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location)
        throw new ProductImportError(
          "source_redirect_failed",
          "The supplier page redirected without a destination.",
          422,
        );
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) {
      throw new ProductImportError(
        "source_fetch_failed",
        `The supplier page returned ${response.status}. Enter the product details manually.`,
        422,
      );
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new ProductImportError(
        "unsupported_source",
        "This URL did not return a product web page. Enter the product details manually.",
        422,
      );
    }
    return { html: await readLimitedText(response), sourceUrl: current.toString() };
  }
  throw new ProductImportError(
    "source_redirect_failed",
    "The supplier page redirected too many times.",
    422,
  );
}

export async function importSupplierProduct(input: {
  sourceUrl: unknown;
  supplierCode?: unknown;
}): Promise<ImportedProductCandidate> {
  const suppliedUrl = trim(input.sourceUrl);
  if (!suppliedUrl)
    throw new ProductImportError("missing_source_url", "Paste a supplier product URL first.");

  let url: URL;
  try {
    url = new URL(suppliedUrl);
  } catch {
    throw new ProductImportError(
      "invalid_source_url",
      "Enter a complete http or https supplier product URL.",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProductImportError(
      "invalid_source_url",
      "Only http and https supplier product URLs can be imported.",
    );
  }

  const supplierCode = trim(input.supplierCode);
  const adapter =
    PRODUCT_SOURCE_ADAPTERS.find((candidate) => candidate.matches(supplierCode)) ??
    PRODUCT_SOURCE_ADAPTERS[PRODUCT_SOURCE_ADAPTERS.length - 1];
  const page = await fetchSupplierPage(url);
  return adapter.parse({ html: page.html, sourceUrl: page.sourceUrl, adapterKey: adapter.key });
}
