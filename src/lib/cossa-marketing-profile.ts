/**
 * Owner-supplied operating facts for AI marketing work.
 *
 * This deliberately contains only facts confirmed by the owner or an approved
 * Cossa source. Social profile URLs, service definitions and performance
 * claims stay out until they have a verified source and approval.
 */
export const COSSA_MARKETING_PROFILE = {
  organisationName: "Cossa Nexus Holdings",
  website: "https://cossanexusholdings.co.za",
  contactEmail: "cossa@cossanexusholdings.co.za",
  phone: "067 801 1907",
  whatsappUrl: "https://wa.me/27678011907",
  priorityBusinessUnits: ["Construction", "Facility Services", "Cossa Store", "Cossa Tech"],
  sourceNotes: [
    "The priority business units are recorded in DOCUMENT: Cossa AI — Verified Mission, Vision and Values. They are not a complete approved service catalogue.",
    "The same source mentions South Africa and African SMEs. It does not define a complete service-coverage area.",
    "The owner supplied an initial R300 advertising test ceiling. It is a draft guardrail, not an approved spend. Founder and CEO Abel Nkuna must approve every campaign, budget and account connection before action.",
  ],
} as const;

export type CossaSocialProfile = {
  id: string;
  platform:
    | "Facebook"
    | "Instagram"
    | "X"
    | "TikTok"
    | "Pinterest"
    | "YouTube"
    | "WhatsApp"
    | "LinkedIn";
  label: string;
  handle: string;
  url: string | null;
  source: "Owner-listed URL" | "Owner-listed handle" | "Not created";
  connectionState: "Public profile listed" | "Click-to-chat only" | "Ready when created";
};

/**
 * Public identities supplied by the Cossa owner. A public URL confirms where a
 * profile is presented; it does not grant analytics, inbox or publishing access.
 */
export const COSSA_SOCIAL_PROFILES: readonly CossaSocialProfile[] = [
  {
    id: "facebook-hub",
    platform: "Facebook",
    label: "Cossa Nexus Holdings",
    handle: "@Cossanexusholdings",
    url: "https://www.facebook.com/Cossanexusholdings",
    source: "Owner-listed URL",
    connectionState: "Public profile listed",
  },
  {
    id: "facebook-construction",
    platform: "Facebook",
    label: "Cossa Nexus Construction",
    handle: "Cossa Nexus Construction",
    url: "https://www.facebook.com/cossaconstruction",
    source: "Owner-listed URL",
    connectionState: "Public profile listed",
  },
  {
    id: "facebook-store",
    platform: "Facebook",
    label: "Cossa Store",
    handle: "@Cossastore",
    url: "https://www.facebook.com/Cossastore",
    source: "Owner-listed URL",
    connectionState: "Public profile listed",
  },
  {
    id: "instagram-hub",
    platform: "Instagram",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus_holdings",
    url: "https://www.instagram.com/cossa_nexus_holdings/",
    source: "Owner-listed URL",
    connectionState: "Public profile listed",
  },
  {
    id: "instagram-store",
    platform: "Instagram",
    label: "Cossa Store",
    handle: "@cossa_nexus_store",
    url: "https://www.instagram.com/cossa_nexus_store/",
    source: "Owner-listed handle",
    connectionState: "Public profile listed",
  },
  {
    id: "x-hub",
    platform: "X",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus",
    url: "https://x.com/cossa_nexus",
    source: "Owner-listed handle",
    connectionState: "Public profile listed",
  },
  {
    id: "tiktok-hub",
    platform: "TikTok",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus_holdings",
    url: "https://www.tiktok.com/@cossa_nexus_holdings",
    source: "Owner-listed handle",
    connectionState: "Public profile listed",
  },
  {
    id: "pinterest-hub",
    platform: "Pinterest",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus_holdings",
    url: "https://www.pinterest.com/cossa_nexus_holdings/",
    source: "Owner-listed handle",
    connectionState: "Public profile listed",
  },
  {
    id: "youtube-hub",
    platform: "YouTube",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus_holdings",
    url: "https://www.youtube.com/@cossa_nexus_holdings",
    source: "Owner-listed handle",
    connectionState: "Public profile listed",
  },
  {
    id: "whatsapp-hub",
    platform: "WhatsApp",
    label: "Cossa Nexus Holdings",
    handle: "@cossa_nexus_holdings / 067 801 1907",
    url: COSSA_MARKETING_PROFILE.whatsappUrl,
    source: "Owner-listed handle",
    connectionState: "Click-to-chat only",
  },
  {
    id: "linkedin-hub",
    platform: "LinkedIn",
    label: "Cossa Nexus Holdings",
    handle: "No Company Page yet",
    url: null,
    source: "Not created",
    connectionState: "Ready when created",
  },
];

const socialProfileSummary = COSSA_SOCIAL_PROFILES.map((profile) =>
  profile.url
    ? `${profile.platform} (${profile.label}): ${profile.handle} - ${profile.url}`
    : `${profile.platform} (${profile.label}): ${profile.handle}`,
).join("\n- ");

export const COSSA_MARKETING_AI_CONTEXT = `
OWNER-APPROVED COSSA MARKETING CONTEXT
- Organisation: ${COSSA_MARKETING_PROFILE.organisationName}
- Official website: ${COSSA_MARKETING_PROFILE.website}
- Approved public contact: ${COSSA_MARKETING_PROFILE.contactEmail}, ${COSSA_MARKETING_PROFILE.phone}, WhatsApp ${COSSA_MARKETING_PROFILE.whatsappUrl}
- Priority business units named in the approved Mission, Vision and Values source: ${COSSA_MARKETING_PROFILE.priorityBusinessUnits.join(", ")}. Do not represent this list as a complete service catalogue.
- Owner-listed public profiles (identity only, not an analytics, inbox or publishing connection):
- ${socialProfileSummary}
- LinkedIn has no Company Page yet. It is ready for an owner-created Page and later least-privilege OAuth approval; do not claim it is connected or managed.
- The owner supplied a proposed R300 advertising test ceiling, but no advertising account, campaign or spend is approved. Founder and CEO Abel Nkuna must approve every campaign, budget and account connection.
- Never invent a service, social handle, platform connection, audience, website issue, customer result, testimonial, case study or performance metric.
`.trim();
