export type LeadHunterCommandIntent = {
  targetCompany: string | null;
  targetService: string | null;
  targetLocation: string;
  confident: boolean;
  reason: string | null;
};

const LOCATION_NAMES = [
  "Pretoria",
  "Centurion",
  "Midrand",
  "Johannesburg",
  "Gauteng",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Western Cape",
  "Northern Cape",
  "South Africa",
] as const;

function includesAny(text: string, expressions: RegExp[]): boolean {
  return expressions.some((expression) => expression.test(text));
}

export function inferLeadHunterCommandIntent(command: string): LeadHunterCommandIntent {
  const text = command.trim().toLowerCase();
  const targetLocation =
    LOCATION_NAMES.find((location) => text.includes(location.toLowerCase())) ?? "South Africa";

  if (!text) {
    return {
      targetCompany: null,
      targetService: null,
      targetLocation,
      confident: false,
      reason: "Write a mission that names the service or opportunity Lead Hunter should find.",
    };
  }

  if (includesAny(text, [/\bclean(?:ing)?\b/, /\bhygiene\b/, /\bsanitation\b/])) {
    return {
      targetCompany: "cossa_facility_services",
      targetService: "commercial_cleaning",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bfacilit(?:y|ies)\b/, /\blandscap(?:e|ing)\b/, /\bwaste management\b/])) {
    return {
      targetCompany: "cossa_facility_services",
      targetService: "facility_management",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\brenovat(?:e|ion|ions)\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "renovation",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bpaint(?:ing)?\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "painting",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\btil(?:e|es|ing)\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "tiling",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\broof(?:ing)?\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "roofing",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bplumb(?:ing|er|ers)?\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "plumbing",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bproperty maintenance\b/, /\bbuilding maintenance\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "property_maintenance",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bconstruction\b/, /\bbuilding contractor(?:s)?\b/])) {
    return {
      targetCompany: "cossa_nexus_construction",
      targetService: "construction",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bwebsite(?:s)?\b/, /\bweb design\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "website_design",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bseo\b/, /\bsearch engine optimisation\b/, /\bsearch engine optimization\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "seo",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bbranding\b/, /\blogo(?:s)?\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "branding",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bcrm\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "crm",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bai automation\b/, /\bautomation\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "ai_automation",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bdigital marketing\b/, /\bsocial media management\b/, /\bgoogle business profile\b/])) {
    return {
      targetCompany: "cossa_tech",
      targetService: "digital_marketing",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bnexdocs\b/, /\bbusiness document(?:s)?\b/])) {
    return {
      targetCompany: "nexdocs",
      targetService: "business_documents",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bquotation(?:s)?\b/])) {
    return {
      targetCompany: "nexdocs",
      targetService: "quotations",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bproposal(?:s)?\b/])) {
    return {
      targetCompany: "nexdocs",
      targetService: "proposals",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\bcontract(?:s)?\b/])) {
    return {
      targetCompany: "nexdocs",
      targetService: "contracts",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  if (includesAny(text, [/\be-?commerce\b/, /\bcossa store\b/, /\bstore product(?:s)?\b/])) {
    return {
      targetCompany: "cossa_store",
      targetService: "ecommerce",
      targetLocation,
      confident: true,
      reason: null,
    };
  }

  return {
    targetCompany: null,
    targetService: null,
    targetLocation,
    confident: false,
    reason:
      "Lead Hunter cannot safely infer the selling service from this mission. Mention a service such as commercial cleaning, construction, website design, SEO, branding, NexDocs quotations, or e-commerce.",
  };
}
