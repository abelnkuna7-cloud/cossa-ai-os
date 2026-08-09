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
    "No Facebook, Instagram, LinkedIn, TikTok, YouTube or other social-profile URL has been approved in the company profile yet.",
    "The owner supplied an initial R300 advertising test ceiling. It is a draft guardrail, not an approved spend. Founder and CEO Abel Nkuna must approve every campaign, budget and account connection before action.",
  ],
} as const;

export const COSSA_MARKETING_AI_CONTEXT = `
OWNER-APPROVED COSSA MARKETING CONTEXT
- Organisation: ${COSSA_MARKETING_PROFILE.organisationName}
- Official website: ${COSSA_MARKETING_PROFILE.website}
- Approved public contact: ${COSSA_MARKETING_PROFILE.contactEmail}, ${COSSA_MARKETING_PROFILE.phone}, WhatsApp ${COSSA_MARKETING_PROFILE.whatsappUrl}
- Priority business units named in the approved Mission, Vision and Values source: ${COSSA_MARKETING_PROFILE.priorityBusinessUnits.join(", ")}. Do not represent this list as a complete service catalogue.
- No owned Facebook, Instagram, LinkedIn, TikTok, YouTube or other social-profile URL is currently recorded in the approved company profile. Ask the owner for the exact public URLs before drafting profile-specific content, publishing plans or account analysis.
- The owner supplied a proposed R300 advertising test ceiling, but no advertising account, campaign or spend is approved. Founder and CEO Abel Nkuna must approve every campaign, budget and account connection.
- Never invent a service, social handle, platform connection, audience, website issue, customer result, testimonial, case study or performance metric.
`.trim();
