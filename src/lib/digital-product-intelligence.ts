export const DIGITAL_PRODUCT_SUBTYPES = [
  "ebook_storybook",
  "guide_manual",
  "online_course",
  "video_course",
  "software",
  "saas_access",
  "template",
  "document_pack",
  "workbook",
  "printable",
  "audio_audiobook",
  "digital_media",
  "prompt_pack",
  "toolkit_bundle",
  "other",
] as const;

export type DigitalProductSubtype = (typeof DIGITAL_PRODUCT_SUBTYPES)[number];

export const DIGITAL_PRODUCT_SUBTYPE_LABELS: Record<DigitalProductSubtype, string> = {
  ebook_storybook: "eBook / Storybook",
  guide_manual: "Guide / Manual",
  online_course: "Online Course",
  video_course: "Video Course",
  software: "Software",
  saas_access: "SaaS / Digital Access",
  template: "Template",
  document_pack: "Document Pack",
  workbook: "Workbook",
  printable: "Printable",
  audio_audiobook: "Audio / Audiobook",
  digital_media: "Digital Art / Media",
  prompt_pack: "AI Prompt Pack",
  toolkit_bundle: "Toolkit / Bundle",
  other: "Other Digital Product",
};

export type DigitalProductProfile = {
  subtype: DigitalProductSubtype;
  creator?: string;
  publisher?: string;
  language?: string;
  audience?: string;
  age_range?: string;
  genre?: string;
  page_count?: number;
  edition?: string;
  isbn?: string;
  skill_level?: string;
  duration_minutes?: number;
  module_count?: number;
  lesson_count?: number;
  prerequisites?: string[];
  learning_outcomes?: string[];
  themes?: string[];
  supported_platforms?: string[];
  system_requirements?: string[];
  licence_type?: string;
  licence_duration_days?: number;
  version?: string;
  support_terms?: string;
  included_items?: string[];
  evidence_notes?: string[];
};

export type DigitalProductIntelligenceRow = {
  id: string;
  product_id: string;
  organisation_id: string;
  digital_subtype: string;
  metadata: unknown;
  audience: unknown;
  learning: unknown;
  licensing: unknown;
  detected_assets: unknown;
  intelligence_notes: unknown;
  readiness_score: number;
  readiness_issues: unknown;
  readiness_warnings: unknown;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DigitalProductIntelligencePayload = {
  digital_subtype: DigitalProductSubtype;
  metadata: Record<string, unknown>;
  audience: Record<string, unknown>;
  learning: Record<string, unknown>;
  licensing: Record<string, unknown>;
  detected_assets: string[];
  intelligence_notes: string[];
  readiness_score: number;
  readiness_issues: string[];
  readiness_warnings: string[];
  last_assessed_at: string;
};

type DigitalProductEvidenceInput = {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  fileNames?: string[];
};

type DigitalProductInference = {
  subtype: DigitalProductSubtype;
  evidenceSources: string[];
};

const DIGITAL_SUBTYPE_RULES: ReadonlyArray<[DigitalProductSubtype, RegExp]> = [
  ["ebook_storybook", /\b(ebook|e-book|storybook|story book|children'?s book|pdf book)\b/],
  ["video_course", /\b(video course|video training|masterclass)\b/],
  ["online_course", /\b(course|training programme|training program|lessons?|modules?)\b/],
  ["software", /\b(software|desktop app|installer|windows app|mac app)\b/],
  ["saas_access", /\b(saas|subscription|web app|digital access)\b/],
  ["prompt_pack", /\b(prompt pack|ai prompts?)\b/],
  ["workbook", /\b(workbook|activity book)\b/],
  ["template", /\b(template|canva template|spreadsheet template)\b/],
  ["document_pack", /\b(document pack|documents bundle|contract pack)\b/],
  ["printable", /\b(printable|print-at-home)\b/],
  ["audio_audiobook", /\b(audiobook|audio book|mp3|audio course)\b/],
  ["digital_media", /\b(digital art|wallpaper|graphics pack|media pack)\b/],
  ["guide_manual", /\b(guide|manual|handbook)\b/],
  ["toolkit_bundle", /\b(toolkit|bundle|resource pack)\b/],
];

const DIGITAL_FIELD_LABELS: Partial<Record<keyof DigitalProductProfile, string>> = {
  subtype: "digital subtype",
  creator: "creator / author / instructor",
  publisher: "publisher",
  language: "language",
  audience: "audience",
  age_range: "age range",
  genre: "genre",
  page_count: "page count",
  skill_level: "skill level",
  learning_outcomes: "learning outcomes",
  version: "version",
  supported_platforms: "supported platforms",
  system_requirements: "system requirements",
  licence_type: "licence type",
  support_terms: "support terms",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function compactRecord(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (value == null || value === "") return false;
      return !Array.isArray(value) || value.length > 0;
    }),
  );
}

export function isDigitalProductSubtype(value: unknown): value is DigitalProductSubtype {
  return DIGITAL_PRODUCT_SUBTYPES.includes(value as DigitalProductSubtype);
}

export function createEmptyDigitalProductProfile(): DigitalProductProfile {
  return { subtype: "other" };
}

export function digitalSubtypeRequirements(
  subtype: DigitalProductSubtype,
): Array<keyof DigitalProductProfile> {
  const common: Array<keyof DigitalProductProfile> = ["subtype", "language", "audience"];
  switch (subtype) {
    case "ebook_storybook":
      return [...common, "creator", "publisher", "genre", "page_count"];
    case "online_course":
    case "video_course":
      return [...common, "creator", "skill_level", "learning_outcomes"];
    case "software":
      return ["subtype", "version", "supported_platforms", "system_requirements", "licence_type"];
    case "saas_access":
      return ["subtype", "licence_type", "support_terms"];
    default:
      return common;
  }
}

export function digitalProductFieldLabel(field: keyof DigitalProductProfile): string {
  return DIGITAL_FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

export function evaluateDigitalProductProfile(
  profile: Partial<DigitalProductProfile> | null | undefined,
): { score: number; missing: Array<keyof DigitalProductProfile>; complete: boolean } {
  if (!profile?.subtype) {
    return { score: 0, missing: ["subtype"], complete: false };
  }

  const required = digitalSubtypeRequirements(profile.subtype);
  const missing = required.filter((key) => {
    const value = profile[key];
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  return {
    score: Math.round(((required.length - missing.length) / required.length) * 100),
    missing,
    complete: missing.length === 0,
  };
}

export function inferDigitalSubtypeWithEvidence(
  input: DigitalProductEvidenceInput,
): DigitalProductInference {
  const sources = [
    { label: "product name", value: input.name ?? "" },
    { label: "category", value: input.category ?? "" },
    { label: "description", value: input.description ?? "" },
    { label: "file names", value: (input.fileNames ?? []).join(" ") },
  ].map((source) => ({ ...source, value: source.value.toLowerCase() }));

  for (const [subtype, pattern] of DIGITAL_SUBTYPE_RULES) {
    const matchedSources = sources
      .filter((source) => pattern.test(source.value))
      .map((source) => source.label);
    if (matchedSources.length > 0) return { subtype, evidenceSources: matchedSources };
  }

  return { subtype: "other", evidenceSources: [] };
}

export function inferDigitalSubtype(input: DigitalProductEvidenceInput): DigitalProductSubtype {
  return inferDigitalSubtypeWithEvidence(input).subtype;
}

export function digitalProfileFromIntelligenceRow(
  row: DigitalProductIntelligenceRow | null | undefined,
): DigitalProductProfile {
  if (!row) return createEmptyDigitalProductProfile();

  const metadata = asRecord(row.metadata);
  const audience = asRecord(row.audience);
  const learning = asRecord(row.learning);
  const licensing = asRecord(row.licensing);

  const profile = {
    subtype: isDigitalProductSubtype(row.digital_subtype) ? row.digital_subtype : "other",
    creator: optionalString(metadata.creator),
    publisher: optionalString(metadata.publisher),
    language: optionalString(metadata.language),
    genre: optionalString(metadata.genre),
    page_count: optionalPositiveNumber(metadata.page_count),
    edition: optionalString(metadata.edition),
    isbn: optionalString(metadata.isbn),
    version: optionalString(metadata.version),
    themes: optionalStringArray(metadata.themes),
    included_items: optionalStringArray(metadata.included_items),
    audience: optionalString(audience.audience),
    age_range: optionalString(audience.age_range),
    skill_level: optionalString(audience.skill_level),
    duration_minutes: optionalPositiveNumber(learning.duration_minutes),
    module_count: optionalPositiveNumber(learning.module_count),
    lesson_count: optionalPositiveNumber(learning.lesson_count),
    prerequisites: optionalStringArray(learning.prerequisites),
    learning_outcomes: optionalStringArray(learning.learning_outcomes),
    supported_platforms: optionalStringArray(licensing.supported_platforms),
    system_requirements: optionalStringArray(licensing.system_requirements),
    licence_type: optionalString(licensing.licence_type),
    licence_duration_days: optionalPositiveNumber(licensing.licence_duration_days),
    support_terms: optionalString(licensing.support_terms),
    evidence_notes: optionalStringArray(row.intelligence_notes),
  };

  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined),
  ) as DigitalProductProfile;
}

export function digitalProfileToIntelligencePayload(
  profile: DigitalProductProfile,
  fileNames: string[],
  assessedAt = new Date().toISOString(),
): DigitalProductIntelligencePayload {
  const readiness = evaluateDigitalProductProfile(profile);
  return {
    digital_subtype: profile.subtype,
    metadata: compactRecord({
      creator: profile.creator,
      publisher: profile.publisher,
      language: profile.language,
      genre: profile.genre,
      page_count: profile.page_count,
      edition: profile.edition,
      isbn: profile.isbn,
      version: profile.version,
      themes: profile.themes,
      included_items: profile.included_items,
    }),
    audience: compactRecord({
      audience: profile.audience,
      age_range: profile.age_range,
      skill_level: profile.skill_level,
    }),
    learning: compactRecord({
      duration_minutes: profile.duration_minutes,
      module_count: profile.module_count,
      lesson_count: profile.lesson_count,
      prerequisites: profile.prerequisites,
      learning_outcomes: profile.learning_outcomes,
    }),
    licensing: compactRecord({
      supported_platforms: profile.supported_platforms,
      system_requirements: profile.system_requirements,
      licence_type: profile.licence_type,
      licence_duration_days: profile.licence_duration_days,
      support_terms: profile.support_terms,
    }),
    detected_assets: fileNames.map((item) => item.trim()).filter(Boolean),
    intelligence_notes: profile.evidence_notes ?? [],
    readiness_score: readiness.score,
    readiness_issues: readiness.missing.map(digitalProductFieldLabel),
    readiness_warnings:
      profile.subtype === "other"
        ? ["Select a more specific subtype when product evidence supports it."]
        : [],
    last_assessed_at: assessedAt,
  };
}

export const PRODUCT_INTELLIGENCE_DIGITAL_CAPABILITIES = [
  "classify digital product subtype from supplied evidence",
  "assess subtype-specific product metadata completeness",
  "inspect customer package structure without inventing file contents",
  "prepare evidence-labelled ebook, course, software and digital-product metadata",
  "prepare SEO and merchandising recommendations from verified product facts",
  "identify missing cover, preview, primary file, guide, workbook or supporting assets",
  "prepare pricing research inputs without inventing competitor prices",
  "calculate digital-product readiness and explain blockers",
];

export const STORE_OPERATIONS_DIGITAL_CAPABILITIES = [
  "coordinate subtype-aware digital catalogue readiness",
  "route metadata gaps to Product Intelligence",
  "route copy gaps to Content and SEO specialists",
  "route image and preview gaps to Creative Media",
  "hold publication when required digital evidence or customer files are missing",
  "distinguish unsaved form values from persisted publication blockers",
];
