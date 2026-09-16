import {
  PRODUCT_INTELLIGENCE_DIGITAL_CAPABILITIES,
  STORE_OPERATIONS_DIGITAL_CAPABILITIES,
} from "./digital-product-intelligence.ts";

export const DIGITAL_PRODUCT_WORKFORCE_UPGRADES = {
  "product-intelligence-analyst": {
    capabilities: PRODUCT_INTELLIGENCE_DIGITAL_CAPABILITIES,
    instructions: [
      "Treat digital as a parent product type and reason about its subtype before recommending catalogue metadata.",
      "Use supplied product data and file names as evidence; clearly label inference and missing evidence.",
      "For ebooks and storybooks assess creator, publisher, language, audience or age range, genre, page count, edition and ISBN only when supplied or verified.",
      "For courses assess instructor, level, modules, lessons, duration, prerequisites, learning outcomes, assessments and supporting resources only when evidenced.",
      "For software and SaaS assess version, platform, requirements, licence, access, setup, documentation and support only when evidenced.",
      "Never invent product facts to increase readiness. Unknown is a valid state and must become a blocker or recommendation.",
    ],
  },
  "store-operations-manager": {
    capabilities: STORE_OPERATIONS_DIGITAL_CAPABILITIES,
    instructions: [
      "Coordinate digital product readiness using subtype-specific requirements while preserving the existing Product Manager workflow.",
      "Send factual metadata gaps to Product Intelligence, copy gaps to Content/SEO and image or preview gaps to Creative Media.",
      "Do not publish merely because an AI readiness score is high. Existing publication controls and owner approval remain authoritative.",
      "When a value exists only in the current unsaved form, report it as entered but unsaved rather than missing from the product.",
    ],
  },
} as const;

type ComposableWorkforceProfile = {
  employee_key: string;
  capabilities: readonly unknown[];
  system_instructions: string;
};

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function composeDigitalProductWorkforceProfile<T extends ComposableWorkforceProfile>(
  profile: T,
): T {
  const upgrade =
    DIGITAL_PRODUCT_WORKFORCE_UPGRADES[
      profile.employee_key as keyof typeof DIGITAL_PRODUCT_WORKFORCE_UPGRADES
    ];
  if (!upgrade) return profile;

  const missingInstructions = upgrade.instructions.filter(
    (instruction) => !profile.system_instructions.includes(instruction),
  );

  return {
    ...profile,
    capabilities: uniqueValues([...profile.capabilities, ...upgrade.capabilities]),
    system_instructions: [profile.system_instructions, ...missingInstructions].join(" "),
  } as T;
}

export function composeDigitalProductWorkforceProfiles<T extends ComposableWorkforceProfile>(
  profiles: readonly T[],
): T[] {
  return profiles.map(composeDigitalProductWorkforceProfile);
}
