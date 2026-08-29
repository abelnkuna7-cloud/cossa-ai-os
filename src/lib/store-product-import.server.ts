import { lookup } from "node:dns/promises";

export type ProductImportStatus = "imported" | "partial" | "blocked" | "failed";
export type ImportedStockStatus = "available" | "unavailable" | "preorder" | "unknown";
export type ImportConfidence = "high" | "medium" | "low" | "unconfirmed";

export type ImportedVariant = {
  name: string;
  supplierVariantId: string | null;
  supplierSku: string | null;
  colour: string | null;
  size: string | null;
  supplierPrice: number | null;
  availability: ImportedStockStatus;
};

export type ImportTrace = {
  field: string;
  sourceLabel: string;
  confidence: ImportConfidence;
};

export type ImportedProductCandidate = {
  adapterKey: string;
  sourceUrl: string;
  title: string | null;
  shortDescription: string | null;
  description: string | null;
  supplierCategory: string | null;
  brand: string | null;
  features: string[];
  specifications: string[];
  variants: ImportedVariant[];
  imageUrls: string[];
  supplierProductRef: string | null;
  supplierCost: number | null;
  supplierCostConfidence: ImportConfidence;
  supplierCostSourceLabel: string | null;
  supplierRrp: number | null;
  supplierRrpSourceLabel: string | null;
  supplierSalePrice: number | null;
  supplierSalePriceSourceLabel: string | null;
  currency: string | null;
  stockStatus: ImportedStockStatus;
  stockAvailabilityText: string | null;
  importTrace: ImportTrace[];
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
    parse: parseDmcWholesaleProductPage,
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
    .filter(isLikelyProductImage)
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

type MetaEntry = { key: string; content: string; tag: string; index: number };

function metaEntries(html: string): MetaEntry[] {
  const result: MetaEntry[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const values = attributes(match[0]);
    const key = (values.property ?? values.name ?? values.itemprop ?? "").toLowerCase();
    const content = trim(values.content);
    if (key && content) result.push({ key, content, tag: match[0], index: match.index ?? 0 });
  }
  return result;
}

function parseJsonObjectAt(html: string, markerEnd: number): Record<string, unknown> | null {
  const start = html.indexOf("{", markerEnd);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return object(JSON.parse(html.slice(start, index + 1)));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function embeddedShopifyProduct(html: string): Record<string, unknown> | null {
  const markers = [
    /Samita\.Wholesale\.product\s*=/gi,
    /window\.__primy\.mainProduct\s*=/gi,
    /window\.__PRODUCT__\s*=/gi,
    /ShopifyAnalytics\.meta\.product\s*=/gi,
  ];
  for (const marker of markers) {
    for (const match of html.matchAll(marker)) {
      const product = parseJsonObjectAt(html, (match.index ?? 0) + match[0].length);
      if (product?.title || product?.variants || product?.handle) return product;
    }
  }
  return null;
}

function cleanProductDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return clip(cleanText(value) ?? "", 4_000) || null;
}

function shopifyPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value >= 1_000 && Number.isInteger(value) ? value / 100 : value;
}

function isLikelyProductImage(value: string): boolean {
  return !/(?:logo|icon|payment|banner|navigation|nav-|chat|placeholder|collection|recommend)/i.test(
    value,
  );
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

type PriceKind = "cost" | "rrp" | "sale" | "regular" | "unclassified";
type PriceSignal = {
  amount: number;
  currency: string | null;
  kind: PriceKind;
  sourceLabel: string;
  confidence: ImportConfidence;
};

function addPriceSignal(signals: PriceSignal[], signal: PriceSignal | null): void {
  if (
    !signal ||
    signals.some((item) => item.amount === signal.amount && item.sourceLabel === signal.sourceLabel)
  )
    return;
  signals.push(signal);
}

function priceSignalsFromVisibleText(html: string): PriceSignal[] {
  const text = cleanText(html) ?? "";
  const signals: PriceSignal[] = [];
  const labels: Array<{ kind: PriceKind; label: string; pattern: string }> = [
    {
      kind: "cost",
      label: "Visible supplier cost label",
      pattern:
        "your\\s+price|wholesale(?:\\s+price)?|dealer\\s+price|reseller\\s+price|trade\\s+price|\\bcost\\b|our\\s+price",
    },
    {
      kind: "rrp",
      label: "Visible suggested retail/RRP label",
      pattern:
        "suggested\\s+retail(?:\\s+price)?|recommended\\s+retail(?:\\s+price)?|\\brrp\\b|\\bmsrp\\b",
    },
    {
      kind: "sale",
      label: "Visible sale-price label",
      pattern: "\\bsale\\s+price|\\bselling\\s+price",
    },
    {
      kind: "regular",
      label: "Visible regular/compare-at price label",
      pattern: "regular\\s+price|compare[-\\s]?at\\s+price",
    },
  ];
  for (const entry of labels) {
    const expression = new RegExp(
      `(?:${entry.pattern})[^\\d]{0,80}(?:R|ZAR|\\$|USD|€|£)?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`,
      "gi",
    );
    for (const match of text.matchAll(expression)) {
      const amount = numberValue(match[1]);
      if (amount == null) continue;
      addPriceSignal(signals, {
        amount,
        currency: /(?:R|ZAR)/i.test(match[0]) ? "ZAR" : null,
        kind: entry.kind,
        sourceLabel: entry.label,
        confidence: "high",
      });
    }
  }
  return signals;
}

function addUnique(values: string[], value: string | null): void {
  const item = trim(value);
  if (item && !values.some((existing) => existing.toLowerCase() === item.toLowerCase()))
    values.push(item);
}

function enrichedSpecifications(description: string | null, initial: string[]): string[] {
  const specifications = [...initial];
  const text = description ?? "";
  const size = text.match(
    /(?:size|dimensions?)\s*(?:is|:)?\s*(?:l\s*)?(\d+(?:\.\d+)?)\s*(?:x|×)\s*(?:w\s*)?(\d+(?:\.\d+)?)\s*(?:x|×)\s*(?:h\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|in|inch(?:es)?)/i,
  );
  if (size) addUnique(specifications, `Size: ${size[1]} × ${size[2]} × ${size[3]} ${size[4]}`);
  if (/three\s+layer|3\s*layer/i.test(text)) addUnique(specifications, "Design: 3-layer");
  if (/double\s+zipper/i.test(text)) addUnique(specifications, "Closure: Double zipper");
  const material = text.match(
    /(?:made of|material(?:\s*:)?\s*)([^.]{0,100}?cationic[^.]{0,100}?water(?:-|\s)?proof[^.]*)/i,
  );
  const materialValue = trim(material?.[1]);
  if (materialValue)
    addUnique(
      specifications,
      `Material: ${materialValue[0].toUpperCase()}${materialValue.slice(1)}`,
    );
  return specifications.slice(0, 24);
}

function extractedFeatures(description: string | null): string[] {
  const features: string[] = [];
  const text = description ?? "";
  if (/three\s+layer|3\s*layer/i.test(text)) addUnique(features, "3-layer design");
  if (/double\s+zipper/i.test(text)) addUnique(features, "Double zipper");
  if (/mesh\s+pockets?/i.test(text)) addUnique(features, "Mesh pockets");
  if (/elastic(?:ated)?\s+straps?/i.test(text)) addUnique(features, "Elastic straps");
  if (/adjustable[^.]{0,50}dividers?/i.test(text)) addUnique(features, "Adjustable dividers");
  if (/travel[^.]{0,60}(?:electronics?|cables?)[^.]{0,60}(?:organis|organiz)/i.test(text))
    addUnique(features, "Travel electronics organisation");
  return features;
}

function importedVariants(product: Record<string, unknown> | null): ImportedVariant[] {
  if (!product) return [];
  const optionNames = arrayOf(product.options).map((option) => trim(option)?.toLowerCase() ?? "");
  return arrayOf(product.variants)
    .map(object)
    .flatMap((variant) => {
      const name = trim(variant?.title) ?? trim(variant?.name);
      if (!name || /^default title$/i.test(name)) return [];
      const options = [variant?.option1, variant?.option2, variant?.option3].map(trim);
      const colourIndex = optionNames.findIndex((option) => /colou?r/.test(option));
      const sizeIndex = optionNames.findIndex((option) => /size/.test(option));
      return [
        {
          name,
          supplierVariantId: variant?.id == null ? null : String(variant.id),
          supplierSku: trim(variant?.sku),
          colour: colourIndex >= 0 ? options[colourIndex] : null,
          size: sizeIndex >= 0 ? options[sizeIndex] : null,
          supplierPrice: shopifyPrice(variant?.price),
          availability:
            variant?.available === true
              ? "available"
              : variant?.available === false
                ? "unavailable"
                : ("unknown" as ImportedStockStatus),
        },
      ];
    })
    .slice(0, 40);
}

function parseProductPage(
  input: { html: string; sourceUrl: string; adapterKey?: string },
  useDmcPriceRule = false,
): ImportedProductCandidate {
  const sourceUrl = new URL(input.sourceUrl).toString();
  const meta = metaData(input.html);
  const allMeta = metaEntries(input.html);
  const product = parseJsonLd(input.html)[0] ?? null;
  const shopify = embeddedShopifyProduct(input.html);
  const offers = product ? offerValues(product) : [];
  const offer = offers[0] ?? null;
  const pageImages = [
    ...(product ? schemaImageValues(product) : []),
    ...arrayOf(shopify?.images),
    shopify?.featured_image,
    meta["og:image"],
    meta["twitter:image"],
    ...linkImages(input.html),
  ];
  const title =
    trim(shopify?.title) ??
    trim(product?.name) ??
    trim(meta["og:title"]) ??
    trim(meta["twitter:title"]) ??
    titleFromHtml(input.html);
  const description =
    cleanProductDescription(shopify?.description) ??
    cleanProductDescription(product?.description) ??
    cleanProductDescription(meta["og:description"] ?? meta.description) ??
    descriptionFromHtml(input.html);
  const shortDescription =
    clip(
      cleanProductDescription(meta["og:description"] ?? meta.description) ?? description ?? "",
      360,
    ) || null;
  const reference =
    trim(
      arrayOf(shopify?.variants)
        .map(object)
        .find((variant) => trim(variant?.sku))?.sku,
    ) ??
    trim(product?.sku) ??
    trim(product?.productID) ??
    trim(product?.mpn) ??
    trim(meta["product:retailer_item_id"]);
  const supplierCategory =
    trim(shopify?.product_type) ?? trim(shopify?.type) ?? trim(product?.category);
  const brand =
    trim(shopify?.vendor) ?? trim(valueAtPath(product, "brand", "name")) ?? trim(product?.brand);
  const schemaAvailability = availabilityFrom(offer?.availability ?? meta["product:availability"]);
  const availability =
    schemaAvailability.status !== "unknown"
      ? schemaAvailability
      : shopify?.available === true
        ? { status: "available" as const, text: "Available" }
        : shopify?.available === false
          ? { status: "unavailable" as const, text: "Unavailable" }
          : schemaAvailability;
  const specs = enrichedSpecifications(description, genericSpecifications(product));
  const features = extractedFeatures(description);
  const variants = importedVariants(shopify);
  const imageUrls = uniqueUrls(pageImages, sourceUrl);
  const signals = priceSignalsFromVisibleText(input.html);
  const structuredPrice =
    numberValue(offer?.price) ??
    numberValue(offer?.lowPrice) ??
    numberValue(valueAtPath(product, "price"));
  addPriceSignal(
    signals,
    structuredPrice == null
      ? null
      : {
          amount: structuredPrice,
          currency: trim(offer?.priceCurrency)?.toUpperCase() ?? null,
          kind: "unclassified",
          sourceLabel: "Structured product price",
          confidence: "medium",
        },
  );
  for (const entry of allMeta.filter((item) => item.key === "product:price:amount")) {
    const amount = numberValue(entry.content);
    addPriceSignal(
      signals,
      amount == null
        ? null
        : {
            amount,
            currency: trim(meta["product:price:currency"])?.toUpperCase() ?? null,
            kind: "unclassified",
            sourceLabel: "Product price metadata",
            confidence: "medium",
          },
    );
  }
  const platformPrice = shopifyPrice(shopify?.price);
  addPriceSignal(
    signals,
    platformPrice == null
      ? null
      : {
          amount: platformPrice,
          currency: "ZAR",
          kind: "unclassified",
          sourceLabel: "Shopify product price",
          confidence: "medium",
        },
  );
  let supplierCost = signals.find((signal) => signal.kind === "cost") ?? null;
  let supplierRrp = signals.find((signal) => signal.kind === "rrp") ?? null;
  let supplierSalePrice =
    signals.find((signal) => signal.kind === "sale" || signal.kind === "regular") ??
    (supplierCost || supplierRrp
      ? null
      : signals.find((signal) => signal.kind === "unclassified")) ??
    null;
  if (useDmcPriceRule) {
    const dedicatedTag = input.html.match(
      /Dedicated\s+product\s+price\s+tags[\s\S]{0,800}?<meta\b[^>]*(?:property|name)\s*=\s*(["'])product:price:amount\1[^>]*>/i,
    )?.[0];
    const dedicatedAmount = dedicatedTag ? numberValue(attributes(dedicatedTag).content) : null;
    if (dedicatedAmount != null) {
      supplierCost = {
        amount: dedicatedAmount,
        currency: "ZAR",
        kind: "cost",
        sourceLabel: "DMC Wholesale dedicated product price tag",
        confidence: "high",
      };
    }
    const publicPrice = signals.find(
      (signal) => signal.kind === "unclassified" && signal.amount !== supplierCost?.amount,
    );
    if (publicPrice) {
      supplierRrp = {
        ...publicPrice,
        kind: "rrp",
        sourceLabel: "DMC Wholesale public product price (RRP context)",
        confidence: "high",
      };
      supplierSalePrice = null;
    }
  }
  const currency =
    supplierCost?.currency ??
    supplierRrp?.currency ??
    supplierSalePrice?.currency ??
    trim(offer?.priceCurrency)?.toUpperCase() ??
    trim(meta["product:price:currency"])?.toUpperCase() ??
    null;
  const required = [
    !title ? "product title" : null,
    !shortDescription && !description && specs.length === 0
      ? "description or specifications"
      : null,
    imageUrls.length === 0 ? "product images" : null,
    !reference ? "supplier SKU/product ID" : null,
    "supplier cost confirmation",
    availability.status === "unknown" ? "stock / availability" : null,
    "current supplier stock before approval",
  ].filter((value): value is string => Boolean(value));
  const presentCount = [
    title,
    shortDescription || description || specs.length,
    imageUrls.length,
    reference,
  ].filter(Boolean).length;
  const importTrace: ImportTrace[] = [];
  const addTrace = (field: string, sourceLabel: string, confidence: ImportConfidence) =>
    importTrace.push({ field, sourceLabel, confidence });
  if (title)
    addTrace("title", shopify ? "Supplier platform product data" : "Product metadata", "high");
  if (shortDescription) addTrace("short description", "Supplier product metadata", "medium");
  if (description)
    addTrace(
      "full description",
      shopify ? "Supplier platform description" : "Supplier page content",
      "medium",
    );
  if (supplierCategory) addTrace("supplier category", "Supplier platform taxonomy", "medium");
  if (brand) addTrace("brand", "Supplier structured data", "medium");
  if (reference) addTrace("supplier SKU/product ID", "Supplier structured data", "high");
  if (features.length) addTrace("features", "Supplier product description", "medium");
  if (specs.length) addTrace("specifications", "Supplier product description", "medium");
  if (variants.length) addTrace("variants", "Supplier platform product data", "high");
  if (imageUrls.length)
    addTrace("product images", shopify ? "Supplier product gallery" : "Product metadata", "medium");
  if (supplierCost) addTrace("supplier cost", supplierCost.sourceLabel, supplierCost.confidence);
  if (supplierRrp) addTrace("supplier RRP", supplierRrp.sourceLabel, supplierRrp.confidence);
  if (supplierSalePrice)
    addTrace("supplier sale price", supplierSalePrice.sourceLabel, supplierSalePrice.confidence);
  if (availability.status !== "unknown")
    addTrace("stock/availability", "Supplier product availability", "medium");

  return {
    adapterKey: input.adapterKey ?? "generic-web-page",
    sourceUrl,
    title,
    shortDescription,
    description,
    supplierCategory,
    brand,
    features,
    specifications: specs,
    variants,
    imageUrls,
    supplierProductRef: reference,
    supplierCost: supplierCost?.amount ?? null,
    supplierCostConfidence: supplierCost?.confidence ?? "unconfirmed",
    supplierCostSourceLabel: supplierCost?.sourceLabel ?? null,
    supplierRrp: supplierRrp?.amount ?? null,
    supplierRrpSourceLabel: supplierRrp?.sourceLabel ?? null,
    supplierSalePrice: supplierSalePrice?.amount ?? null,
    supplierSalePriceSourceLabel: supplierSalePrice?.sourceLabel ?? null,
    currency,
    stockStatus: availability.status,
    stockAvailabilityText: availability.text,
    importTrace,
    importStatus: presentCount >= 4 ? "imported" : "partial",
    fieldsRequiringConfirmation: required,
    warnings: [
      "Supplier cost requires manual confirmation.",
      ...(supplierCost
        ? [`Imported supplier cost source: ${supplierCost.sourceLabel}.`]
        : ["No confidently labelled supplier cost was found. Enter the real cost manually."]),
      ...(supplierRrp ? [`Supplier RRP is separate: ${supplierRrp.sourceLabel}.`] : []),
    ],
  };
}

export function parseGenericProductPage(input: {
  html: string;
  sourceUrl: string;
  adapterKey?: string;
}): ImportedProductCandidate {
  return parseProductPage(input);
}

export function parseDmcWholesaleProductPage(input: {
  html: string;
  sourceUrl: string;
  adapterKey?: string;
}): ImportedProductCandidate {
  return parseProductPage(input, true);
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
