import { CANONICAL_STORE_DEPARTMENTS, canonicalDepartmentFor } from "./store-taxonomy.ts";

export const STORE_MERCHANDISING_TAGS = [
  "trending",
  "new_arrival",
  "best_seller",
  "sale",
] as const;

export type StoreMerchandisingTag = (typeof STORE_MERCHANDISING_TAGS)[number];

const canonicalDepartmentSlugs = new Set(
  CANONICAL_STORE_DEPARTMENTS.map((department) => department.slug),
);
const merchandisingTags = new Set<string>(STORE_MERCHANDISING_TAGS);

export function normaliseFeatureLines(value: unknown): string[] {
  const input = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|\s*[•●▪]\s*/)
      : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const line = raw
      .replace(/^\s*[-*•●▪]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!line) continue;
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line.slice(0, 500));
    if (result.length >= 24) break;
  }
  return result;
}

export function normaliseAdditionalDepartments(
  primaryDepartment: string | null | undefined,
  values: unknown,
): string[] {
  const primary = canonicalDepartmentFor(primaryDepartment)?.slug ?? null;
  const input = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const slug = canonicalDepartmentFor(raw)?.slug ?? raw.trim();
    if (!canonicalDepartmentSlugs.has(slug) || slug === primary || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}

export function normaliseMerchandisingTags(values: unknown): StoreMerchandisingTag[] {
  const input = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const result: StoreMerchandisingTag[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().toLocaleLowerCase().replace(/[\s-]+/g, "_");
    if (!merchandisingTags.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag as StoreMerchandisingTag);
  }
  return result;
}

function zar(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildCompetitivePricingNotes(input: {
  cossaPrice: number | null;
  marketPrice: number | null;
  marketPriceSourceUrl?: string | null;
  existingNotes?: string | null;
}): string {
  const existing = input.existingNotes?.trim();
  if (existing) return existing;
  if (
    input.cossaPrice == null ||
    input.marketPrice == null ||
    input.cossaPrice <= 0 ||
    input.marketPrice <= 0
  ) {
    return "";
  }
  const difference = input.cossaPrice - input.marketPrice;
  const percentage = Math.abs((difference / input.marketPrice) * 100);
  const position = difference === 0 ? "matches" : difference < 0 ? "below" : "above";
  const amount = Math.abs(difference);
  const source = input.marketPriceSourceUrl?.trim() ? " Competitor source recorded." : "";
  return `Cossa ${zar(input.cossaPrice)} ${position} the recorded market benchmark ${zar(input.marketPrice)}${difference === 0 ? "" : ` by ${zar(amount)} (${percentage.toFixed(1)}%)`}.${source}`;
}
