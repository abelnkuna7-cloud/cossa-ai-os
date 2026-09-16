export const DIGITAL_PRODUCT_SUBTYPES = [
  "ebook_storybook", "guide_manual", "online_course", "video_course", "software", "saas_access", "template", "document_pack", "workbook", "printable", "audio_audiobook", "digital_media", "prompt_pack", "toolkit_bundle", "other",
] as const;
export type DigitalProductSubtype = (typeof DIGITAL_PRODUCT_SUBTYPES)[number];
export const DIGITAL_PRODUCT_SUBTYPE_LABELS: Record<DigitalProductSubtype, string> = {
  ebook_storybook: "eBook / Storybook", guide_manual: "Guide / Manual", online_course: "Online Course", video_course: "Video Course", software: "Software", saas_access: "SaaS / Digital Access", template: "Template", document_pack: "Document Pack", workbook: "Workbook", printable: "Printable", audio_audiobook: "Audio / Audiobook", digital_media: "Digital Art / Media", prompt_pack: "AI Prompt Pack", toolkit_bundle: "Toolkit / Bundle", other: "Other Digital Product",
};
export type DigitalProductProfile = {
  subtype: DigitalProductSubtype; creator?: string; publisher?: string; language?: string; audience?: string; age_range?: string; genre?: string; page_count?: number; edition?: string; isbn?: string; skill_level?: string; duration_minutes?: number; module_count?: number; lesson_count?: number; prerequisites?: string[]; learning_outcomes?: string[]; themes?: string[]; supported_platforms?: string[]; system_requirements?: string[]; licence_type?: string; licence_duration_days?: number; version?: string; support_terms?: string; included_items?: string[]; evidence_notes?: string[];
};
export function digitalSubtypeRequirements(subtype: DigitalProductSubtype) {
  const common = ["subtype", "language", "audience"];
  switch (subtype) {
    case "ebook_storybook": return [...common, "creator", "publisher", "genre", "page_count"];
    case "online_course": case "video_course": return [...common, "creator", "skill_level", "learning_outcomes"];
    case "software": return ["subtype", "version", "supported_platforms", "system_requirements", "licence_type"];
    case "saas_access": return ["subtype", "licence_type", "support_terms"];
    default: return common;
  }
}
export function evaluateDigitalProductProfile(profile: Partial<DigitalProductProfile> | null | undefined) {
  if (!profile?.subtype) return { score: 0, missing: ["digital product subtype"], complete: false };
  const required = digitalSubtypeRequirements(profile.subtype);
  const missing = required.filter((key) => {
    const value = profile[key as keyof DigitalProductProfile];
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  return { score: Math.round(((required.length - missing.length) / required.length) * 100), missing, complete: missing.length === 0 };
}
export function inferDigitalSubtype(input: { name?: string | null; category?: string | null; description?: string | null; fileNames?: string[] }) {
  const haystack = [input.name, input.category, input.description, ...(input.fileNames ?? [])].filter(Boolean).join(" ").toLowerCase();
  const tests: Array<[DigitalProductSubtype, RegExp]> = [
    ["ebook_storybook", /\b(ebook|e-book|storybook|story book|children'?s book|pdf book)\b/], ["video_course", /\b(video course|video training|masterclass)\b/], ["online_course", /\b(course|training programme|training program|lessons?|modules?)\b/], ["software", /\b(software|desktop app|installer|windows app|mac app)\b/], ["saas_access", /\b(saas|subscription|web app|digital access)\b/], ["prompt_pack", /\b(prompt pack|ai prompts?)\b/], ["workbook", /\b(workbook|activity book)\b/], ["template", /\b(template|canva template|spreadsheet template)\b/], ["document_pack", /\b(document pack|documents bundle|contract pack)\b/], ["printable", /\b(printable|print-at-home)\b/], ["audio_audiobook", /\b(audiobook|audio book|mp3|audio course)\b/], ["digital_media", /\b(digital art|wallpaper|graphics pack|media pack)\b/], ["guide_manual", /\b(guide|manual|handbook)\b/], ["toolkit_bundle", /\b(toolkit|bundle|resource pack)\b/],
  ];
  return tests.find(([, pattern]) => pattern.test(haystack))?.[0] ?? "other";
}
export const PRODUCT_INTELLIGENCE_DIGITAL_CAPABILITIES = ["classify digital product subtype from supplied evidence", "assess subtype-specific product metadata completeness", "inspect customer package structure without inventing file contents", "prepare evidence-labelled ebook, course, software and digital-product metadata", "prepare SEO and merchandising recommendations from verified product facts", "identify missing cover, preview, primary file, guide, workbook or supporting assets", "prepare pricing research inputs without inventing competitor prices", "calculate digital-product readiness and explain blockers"];
export const STORE_OPERATIONS_DIGITAL_CAPABILITIES = ["coordinate subtype-aware digital catalogue readiness", "route metadata gaps to Product Intelligence", "route copy gaps to Content and SEO specialists", "route image and preview gaps to Creative Media", "hold publication when required digital evidence or customer files are missing", "distinguish unsaved form values from persisted publication blockers"];
