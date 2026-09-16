export const DIGITAL_PRODUCT_SUBTYPES = [
  "ebook_storybook",
  "ebook_general",
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
  "digital_art_media",
  "prompt_pack",
  "toolkit_bundle",
  "other",
] as const;

export type DigitalProductSubtype = (typeof DIGITAL_PRODUCT_SUBTYPES)[number];

export type DigitalFieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  evidenceRequired?: boolean;
  placeholder?: string;
};

export type DigitalProductProfile = {
  label: string;
  description: string;
  fields: DigitalFieldDefinition[];
  recommendedAssets: string[];
};

const commonLicenceFields: DigitalFieldDefinition[] = [
  { key: "creator", label: "Author / creator / instructor", evidenceRequired: true },
  { key: "publisher", label: "Publisher / brand" },
  { key: "language", label: "Language" },
  { key: "licence_type", label: "Customer licence / usage rights", evidenceRequired: true },
];

export const DIGITAL_PRODUCT_PROFILES: Record<DigitalProductSubtype, DigitalProductProfile> = {
  ebook_storybook: {
    label: "eBook / Storybook",
    description: "Books, children's stories and illustrated digital reading products.",
    fields: [
      ...commonLicenceFields,
      { key: "subtitle", label: "Subtitle" },
      { key: "genre", label: "Genre", required: true },
      { key: "age_range", label: "Age range / target reader", required: true },
      { key: "page_count", label: "Page count", evidenceRequired: true },
      { key: "edition", label: "Edition" },
      { key: "isbn", label: "ISBN (if officially assigned)", evidenceRequired: true },
      { key: "themes", label: "Themes / topics" },
      { key: "learning_outcomes", label: "Learning outcomes / educational value" },
      { key: "print_permission", label: "Printing permission", evidenceRequired: true },
    ],
    recommendedAssets: ["cover", "store gallery / sample pages", "main PDF or EPUB", "START HERE guide", "activity/workbook when included"],
  },
  ebook_general: {
    label: "eBook",
    description: "General nonfiction, business, educational and reference eBooks.",
    fields: [...commonLicenceFields, { key: "subtitle", label: "Subtitle" }, { key: "genre", label: "Genre / subject" }, { key: "page_count", label: "Page count", evidenceRequired: true }, { key: "edition", label: "Edition" }, { key: "isbn", label: "ISBN (if officially assigned)", evidenceRequired: true }],
    recommendedAssets: ["cover", "preview/sample pages", "main PDF or EPUB", "START HERE guide"],
  },
  guide_manual: {
    label: "Guide / Manual",
    description: "Practical guides, manuals and how-to digital publications.",
    fields: [...commonLicenceFields, { key: "topic", label: "Topic", required: true }, { key: "audience", label: "Intended audience", required: true }, { key: "page_count", label: "Page count", evidenceRequired: true }, { key: "version", label: "Version / edition" }],
    recommendedAssets: ["cover", "main guide", "quick-start file", "supporting resources"],
  },
  online_course: {
    label: "Online Course",
    description: "Structured learning programmes with lessons, resources and assessments.",
    fields: [...commonLicenceFields, { key: "level", label: "Skill level", required: true }, { key: "modules", label: "Number of modules", evidenceRequired: true }, { key: "lessons", label: "Number of lessons", evidenceRequired: true }, { key: "duration", label: "Estimated duration", evidenceRequired: true }, { key: "prerequisites", label: "Prerequisites" }, { key: "learning_outcomes", label: "Learning outcomes", required: true }, { key: "certificate", label: "Certificate availability", evidenceRequired: true }],
    recommendedAssets: ["course cover", "curriculum", "lesson resources", "assessments", "START HERE guide"],
  },
  video_course: {
    label: "Video Course / Training",
    description: "Video-first training programmes and recorded classes.",
    fields: [...commonLicenceFields, { key: "level", label: "Skill level" }, { key: "video_count", label: "Number of videos", evidenceRequired: true }, { key: "duration", label: "Total duration", evidenceRequired: true }, { key: "captions", label: "Captions / subtitles", evidenceRequired: true }, { key: "learning_outcomes", label: "Learning outcomes", required: true }],
    recommendedAssets: ["course cover", "video modules", "captions where available", "supporting PDFs", "START HERE guide"],
  },
  software: {
    label: "Software",
    description: "Downloadable applications, utilities and software packages.",
    fields: [...commonLicenceFields, { key: "version", label: "Version", required: true, evidenceRequired: true }, { key: "platforms", label: "Supported platforms / OS", required: true, evidenceRequired: true }, { key: "system_requirements", label: "System requirements", evidenceRequired: true }, { key: "licence_duration", label: "Licence duration", evidenceRequired: true }, { key: "updates", label: "Update policy", evidenceRequired: true }, { key: "support", label: "Support information" }],
    recommendedAssets: ["product image", "installer/download", "setup guide", "release notes", "licence information"],
  },
  saas_access: { label: "SaaS / Digital Access", description: "Hosted software or account-based digital access.", fields: [...commonLicenceFields, { key: "access_period", label: "Access period", evidenceRequired: true }, { key: "requirements", label: "Access requirements" }, { key: "support", label: "Support information" }], recommendedAssets: ["product image", "access instructions", "START HERE guide", "terms/licence"] },
  template: { label: "Template", description: "Editable templates for business, design or productivity use.", fields: [...commonLicenceFields, { key: "file_formats", label: "File formats", required: true, evidenceRequired: true }, { key: "software_required", label: "Software required", evidenceRequired: true }, { key: "editable", label: "Editable status", evidenceRequired: true }], recommendedAssets: ["preview images", "template files", "instructions", "licence"] },
  document_pack: { label: "Document Pack", description: "Bundles of documents, forms and business resources.", fields: [...commonLicenceFields, { key: "included_files", label: "Included documents", required: true, evidenceRequired: true }, { key: "file_formats", label: "File formats", evidenceRequired: true }, { key: "editable", label: "Editable status", evidenceRequired: true }], recommendedAssets: ["cover", "document files", "contents list", "START HERE guide", "licence"] },
  workbook: { label: "Workbook", description: "Interactive exercises, worksheets and learning workbooks.", fields: [...commonLicenceFields, { key: "audience", label: "Intended audience" }, { key: "page_count", label: "Page count", evidenceRequired: true }, { key: "print_permission", label: "Printing permission", evidenceRequired: true }], recommendedAssets: ["cover", "workbook PDF", "sample pages", "instructions"] },
  printable: { label: "Printable", description: "Customer-printable worksheets, planners, cards or activities.", fields: [...commonLicenceFields, { key: "page_size", label: "Page / print size", evidenceRequired: true }, { key: "file_formats", label: "File formats", evidenceRequired: true }, { key: "print_permission", label: "Printing permission", evidenceRequired: true }], recommendedAssets: ["preview images", "print files", "printing guide", "licence"] },
  audio_audiobook: { label: "Audio / Audiobook", description: "Audiobooks, audio lessons and downloadable audio media.", fields: [...commonLicenceFields, { key: "duration", label: "Duration", evidenceRequired: true }, { key: "audio_format", label: "Audio format", evidenceRequired: true }, { key: "chapters_tracks", label: "Chapters / tracks", evidenceRequired: true }], recommendedAssets: ["cover", "audio files", "track/chapter list", "START HERE guide"] },
  digital_art_media: { label: "Digital Art / Media", description: "Downloadable graphics, media packs and digital creative assets.", fields: [...commonLicenceFields, { key: "file_formats", label: "File formats", evidenceRequired: true }, { key: "dimensions", label: "Dimensions / resolution", evidenceRequired: true }, { key: "usage_rights", label: "Usage rights", required: true, evidenceRequired: true }], recommendedAssets: ["preview images", "source/download files", "licence"] },
  prompt_pack: { label: "AI Prompt Pack", description: "Curated prompt libraries and AI workflow resources.", fields: [...commonLicenceFields, { key: "prompt_count", label: "Number of prompts", evidenceRequired: true }, { key: "supported_tools", label: "Supported AI tools / models" }, { key: "use_cases", label: "Use cases", required: true }], recommendedAssets: ["cover", "prompt files", "usage guide", "examples", "licence"] },
  toolkit_bundle: { label: "Toolkit / Bundle", description: "Mixed digital-resource bundles containing multiple deliverable types.", fields: [...commonLicenceFields, { key: "included_files", label: "Bundle contents", required: true, evidenceRequired: true }, { key: "file_formats", label: "File formats", evidenceRequired: true }, { key: "audience", label: "Intended audience" }], recommendedAssets: ["bundle cover", "all included files", "contents manifest", "START HERE guide", "licence"] },
  other: { label: "Other Digital Product", description: "Digital products that do not yet match a specialised profile.", fields: [...commonLicenceFields, { key: "format", label: "Product format", required: true }, { key: "audience", label: "Intended audience" }], recommendedAssets: ["product image", "customer deliverable", "START HERE guide", "licence"] },
};

export function digitalProfile(subtype: DigitalProductSubtype) {
  return DIGITAL_PRODUCT_PROFILES[subtype] ?? DIGITAL_PRODUCT_PROFILES.other;
}

export function calculateMetadataCompleteness(subtype: DigitalProductSubtype, metadata: Record<string, unknown>) {
  const required = digitalProfile(subtype).fields.filter((field) => field.required);
  if (required.length === 0) return 100;
  const complete = required.filter((field) => {
    const value = metadata[field.key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  }).length;
  return Math.round((complete / required.length) * 100);
}