import { createFileRoute } from "@tanstack/react-router";

import type {
  EvidenceType,
  LeadHunterCompany,
  LeadHunterProspect,
  LeadHunterSearchRequest,
  LeadHunterSearchResponse,
  LeadHunterServiceCategory,
  OpportunitySize,
  ProspectClassification,
  ProspectEvidence,
  ProspectSignal,
  ProspectSignalType,
} from "@/lib/lead-hunter-data";

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const TAVILY_SEARCH_URL =
  "https://api.tavily.com/search";

const SERPAPI_SEARCH_URL =
  "https://serpapi.com/search.json";

const NEWS_API_URL =
  "https://newsapi.org/v2/everything";

const MAX_REQUEST_RESULTS = 50;
const MAX_SEARCH_QUERIES = 12;
const MAX_RESULTS_PER_QUERY = 10;
const MAX_SOURCE_PAGES_TO_INSPECT = 40;
const MAX_SOURCE_CONTENT_LENGTH = 30_000;

/* The API enforces the same credit ceilings as the UI. */
const SEARCH_DEPTH_QUERY_BUDGETS = {
  economy: 3,
  standard: 5,
  deep: 8,
} as const;

const VALID_SECTORS = new Set([
  "private",
  "government",
  "nonprofit",
  "mixed",
] as const);

const VALID_COMPANIES = new Set<LeadHunterCompany>([
  "cossa_nexus_construction",
  "cossa_facility_services",
  "cossa_tech",
  "cossa_ai_growth",
  "nexdocs",
  "cossa_store",
  "cossa_nexus_holdings",
]);

const SEARCH_TIMEOUT_MS = 25_000;
const PAGE_TIMEOUT_MS = 12_000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 5;

const PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "youtube.com",
];

const HIGH_TRUST_GOVERNMENT_DOMAINS = [
  "etenders.gov.za",
  "gov.za",
  "treasury.gov.za",
  "gauteng.gov.za",
  "tshwane.gov.za",
  "joburg.org.za",
  "capetown.gov.za",
  "ekurhuleni.gov.za",
  "durban.gov.za",
  "sita.co.za",
];

/*
 * These are public entities rather than government-domain websites. They are
 * valid public-sector buyers, but their ordinary informational pages must not
 * inherit the trust given to an official tender portal.
 */
const OFFICIAL_PUBLIC_ENTITY_DOMAINS = [
  "sabs.co.za",
  "sanral.co.za",
  "eskom.co.za",
  "transnet.net",
  "prasa.com",
];

const DIRECTORY_HOST_PATTERNS = [
  "yellowpages",
  "brabys",
  "snupit",
  "procompare",
  "hotfrog",
  "cylex",
  "yep.co.za",
  "sayellow",
  "businesslist",
  "africanadvice",
  "rsa-online",
  "rateitall",
  "bark.com",
];

const DIRECTORY_TEXT_PATTERN =
  /\b(directory|business listings?|find the best|top \d+|compare quotes?|submit a request|get \d+ quotes?|service providers? near me|browse companies|popular listings?)\b/i;

const INFORMATIONAL_PAGE_PATTERN =
  /\b(career guide|careers?|qualification|registered qualifications?|learnership|course|training programme|employment opportunities|recommended subjects|blog|useful information|industry overview|what is|how to become|guide to|tips for choosing|industry trends?|market overview)\b/i;

/*
 * Regulations, advice and community discussions sometimes mention works,
 * contractors or quotations. They describe a topic; they are not a buyer
 * asking to purchase a selected service.
 */
const REGULATORY_OR_FORUM_PAGE_PATTERN =
  /\b(?:SANS\s*10400|national building regulations?|building regulations?|planning permission|regulatory (?:guidance|requirement|advice)|compliance (?:guide|advice)|frequently asked questions?|\bFAQ\b|questions? (?:and|&) answers?|\bQ\s*&\s*A\b|discussion forum|community forum|ask (?:an?|the) (?:architect|expert|builder))\b/i;

const PROCUREMENT_PATTERN =
  /\b(request for quotation|request for proposal|invitation to bid|invitation to tender|request for bid|request for tender|\bRFQ\b|\bRFP\b|\bRFB\b|\bRFT\b|tender number|bid number|closing date|compulsory briefing|non-compulsory briefing|submission deadline|procurement notice|bid invitation|quotation invitation)\b/i;

const SUPPLIER_REGISTRATION_PATTERN =
  /\b(supplier registration|supplier database|vendor registration|register as a supplier|supplier invitation|expression of interest|call for suppliers|supplier panel|vendor database|panel of suppliers)\b/i;

const PARTNERSHIP_PATTERN =
  /\b(subcontractors? required|subcontractors? wanted|subcontractor registration|subcontracting opportunit(?:y|ies)|seeking subcontractors?|looking for subcontractors?|appoint(?:ment|ing) of subcontractors?|partner(?:ship)? opportunit(?:y|ies)|strategic partner(?:ship)?|seeking partners?|service-provider panel|panel of service providers|contractor panel|supplier panel|expression of interest from contractors?|call for contractors?)\b/i;

const EXPANSION_PATTERN =
  /\b(new branch|opening soon|new development|expansion|new premises|new office|new warehouse|new facility|relocation|property development|construction underway|development approved|capital project|infrastructure programme|new site|new store|new location|facility expansion)\b/i;

/**
 * Deliberately stronger than a generic "required".
 * These phrases indicate that the organisation is actually trying
 * to buy, appoint or source a service.
 */
const STRONG_BUYER_NEED_PATTERN =
  /\b(seeking (?:a |an )?(?:contractor|supplier|service provider|company)|requires? (?:a |an )?(?:contractor|supplier|service provider)|appoint(?:ment|ing) of (?:a |an )?(?:contractor|supplier|service provider)|looking for (?:a |an )?(?:contractor|supplier|service provider)|invites? (?:quotations?|proposals?|bids?|tenders?|service providers?|contractors?|suppliers?)|procure(?:ment|ing) of|requesting quotations?|requesting proposals?|contract for|service provider for|maintenance contract|cleaning contract|upgrade project|renovation project|refurbishment project|building works|minor works|repair works|panel of service providers|framework agreement|scope of works?|works required|services required)\b/i;

const SERVICE_OFFERING_PATTERN =
  /\b(we offer|we provide|our services|call us today|get a free quote|request a free quote|professional services|specialists in|experts in|affordable services|same day service|book our service|our expertise|we specialise|we specialize|we undertake|we deliver|contact us for|our team provides|trusted contractors?|professional contractors?|leading builders?|building services|construction services|renovation services|maintenance services)\b/i;

/**
 * These businesses sell customer-acquisition services themselves. They are
 * not customer prospects for a Lead Hunter mission, even when the selected
 * service is different. Formal supplier or partnership evidence is
 * handled before this rule.
 */
const CUSTOMER_ACQUISITION_PROVIDER_PATTERN =
  /\b(?:lead[- ]generation|appointment[- ]setting|digital marketing|marketing|advertising|seo|web design|branding|crm|automation|business growth)\s+(?:agency|company|consultancy|consultant|services?)\b|\b(?:we help businesses (?:get|win|find) customers|customer acquisition agency|sales outsourcing)\b/i;

const PUBLIC_BUYER_ROLE_PATTERN =
  /\b(procurement manager|supply chain manager|facilities manager|facility manager|property manager|estate manager|operations manager|school principal|administrator|marketing manager|it manager|project manager|business owner|managing director|bid manager|contracts manager|procurement officer|scm manager)\b/i;

const DIGITAL_AUDIT_MISSION_PATTERN =
  /\b(website|web design|redesign|logo|branding|seo|google business|google profile|online presence|social media|digital marketing|crm|automation|ecommerce|e-commerce)\b/i;

const WEBSITE_WEAKNESS_PATTERN =
  /\b(outdated website|website redesign|broken website|not mobile friendly|non-mobile|poor mobile experience|missing contact form|no contact form|missing whatsapp|no whatsapp|poor seo|weak seo|slow website|website error|under construction website|inactive website)\b/i;

const BRANDING_WEAKNESS_PATTERN =
  /\b(outdated logo|weak branding|inconsistent branding|missing logo|poor logo|low quality logo|brand inconsistency|branding redesign|old logo|no brand identity)\b/i;

const MARKETING_WEAKNESS_PATTERN =
  /\b(inactive marketing|inactive social media|no recent posts|weak online presence|poor online presence|poor review response|inactive facebook|inactive instagram|weak google business profile|unclaimed google business profile)\b/i;

const GOVERNMENT_BUYER_PATTERN =
  /\b(government|municipality|municipal|department of|provincial|national department|public entity|state[- ]owned|state owned|supply chain management|SCM|treasury|metropolitan municipality|local municipality|district municipality|SANRAL|merSETA|State Theatre|Eskom|Transnet|PRASA)\b/i;

const PROCUREMENT_AGGREGATOR_PATTERN =
  /\b(tender(?:s|ing)? (?:notice|notices|bulletin|listing|list|portal|opportunities)|procurement (?:notice|notices|listing|list|opportunities)|latest (?:tenders?|rfqs?|bids?)|all (?:tenders?|rfqs?|bids?)|weekly tender)\b/i;

const PROCUREMENT_REFERENCE_PATTERN =
  /\b(?:tender|bid|rfq|rfp|rft|quotation)\s*(?:number|no\.?|reference|#)?\s*[:#-]?\s*[A-Z0-9]{1,12}(?:[/-][A-Z0-9]{1,16})+\b/i;

const PROCUREMENT_DEADLINE_PATTERN =
  /\b(?:closing date|closing(?:\s+time)?|submission deadline|deadline|due date|bids? close|quotations? close)\b[^\n.]{0,100}?\b(?:\d{1,2}[\s/-](?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,/-]+\d{2,4}|(?:\d{4}[/-]\d{1,2}[/-]\d{1,2})|(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}))\b/i;

type SearchProvider =
  | "Tavily"
  | "SerpAPI"
  | "NewsAPI";

type Environment = {
  tavilyApiKey: string | null;
  serpApiKey: string | null;
  newsApiKey: string | null;
  supabaseUrl: string;
  supabaseKey: string;
  organisationId: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

type SearchPurpose =
  | "buyer_discovery"
  | "active_procurement"
  | "supplier_registration"
  | "growth_signal"
  | "website_gap";

type SearchPlan = {
  query: string;
  purpose: SearchPurpose;
  targetDescription: string;
  service: LeadHunterServiceCategory;
};

type SearchCandidate = {
  provider: SearchProvider;
  query: string;
  purpose: SearchPurpose;
  targetDescription: string;
  searchedService: LeadHunterServiceCategory;
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  providerScore: number;
};

type PageInspection = {
  url: string;
  finalUrl: string;
  title: string | null;
  text: string;
  emails: string[];
  phones: string[];
  contactPageUrl: string | null;
  inspectedAt: string;
  fetchSucceeded: boolean;
};

type CandidateDisposition =
  | "buyer"
  | "active_opportunity"
  | "supplier_opportunity"
  | "partner"
  | "competitor"
  | "directory"
  | "informational"
  | "irrelevant"
  | "sector_mismatch"
  | "service_mismatch"
  | "expired_procurement"
  | "ambiguous_procurement";

type CandidateSector =
  | "private"
  | "government"
  | "nonprofit";

type ProcurementValidation = {
  hasSelectedService: boolean;
  matchedServices: LeadHunterServiceCategory[];
  hasReference: boolean;
  closingDate: Date | null;
  isExpired: boolean;
  isAmbiguous: boolean;
};

type CandidateAssessment = {
  disposition: CandidateDisposition;
  buyerFit: number;
  sourceTrust: number;
  reasons: string[];
  probableBuyerRole: string | null;
  competitorForServices: LeadHunterServiceCategory[];
};

type ScoreBreakdown = {
  fitScore: number;
  intentScore: number;
  evidenceScore: number;
  timingScore: number;
  contactabilityScore: number;
  totalScore: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits =
  new Map<string, RateLimitEntry>();

const SERVICE_LABELS: Record<
  LeadHunterServiceCategory,
  string
> = {
  construction:
    "construction services",

  renovation:
    "renovation services",

  property_maintenance:
    "property maintenance",

  painting:
    "painting services",

  tiling:
    "tiling services",

  ceilings:
    "ceiling installation and repair",

  roofing:
    "roofing services",

  plumbing:
    "plumbing services",

  facility_management:
    "facility management",

  commercial_cleaning:
    "commercial cleaning",

  deep_cleaning:
    "deep cleaning",

  hygiene:
    "hygiene and sanitation",

  landscaping:
    "landscaping",

  waste_management:
    "waste management",

  website_design:
    "website design",

  logo_design:
    "logo design",

  branding:
    "branding services",

  seo:
    "SEO services",

  digital_marketing:
    "digital marketing",

  social_media_management:
    "social media management",

  google_business_profile:
    "Google Business Profile services",

  lead_generation:
    "lead generation",

  crm:
    "CRM implementation",

  ai_automation:
    "AI and business automation",

  business_documents:
    "business documents",

  quotations:
    "quotation systems",

  proposals:
    "proposal development",

  contracts:
    "contract document systems",

  ecommerce:
    "e-commerce services",

  general:
    "business services",
};

const KNOWN_SOUTH_AFRICAN_CITY_PROVINCES: Record<
  string,
  string
> = {
  pretoria: "Gauteng",
  tshwane: "Gauteng",
  centurion: "Gauteng",
  midrand: "Gauteng",
  johannesburg: "Gauteng",
  sandton: "Gauteng",
  randburg: "Gauteng",
  roodepoort: "Gauteng",
  soweto: "Gauteng",
  germiston: "Gauteng",
  alberton: "Gauteng",
  boksburg: "Gauteng",
  benoni: "Gauteng",
  kemptonpark: "Gauteng",
  vereeniging: "Gauteng",
  vanderbijlpark: "Gauteng",
  rosslyn: "Gauteng",
  silverton: "Gauteng",

  polokwane: "Limpopo",
  thohoyandou: "Limpopo",
  tzaneen: "Limpopo",

  mbombela: "Mpumalanga",
  nelspruit: "Mpumalanga",
  witbank: "Mpumalanga",
  emalahleni: "Mpumalanga",

  rustenburg: "North West",
  mahikeng: "North West",
  mafikeng: "North West",
  klerksdorp: "North West",

  bloemfontein: "Free State",

  durban: "KwaZulu-Natal",
  pietermaritzburg: "KwaZulu-Natal",

  capetown: "Western Cape",
  stellenbosch: "Western Cape",
  george: "Western Cape",

  gqeberha: "Eastern Cape",
  portelizabeth: "Eastern Cape",
  eastlondon: "Eastern Cape",

  kimberley: "Northern Cape",
};

const SOUTH_AFRICAN_PROVINCES = [
  "Gauteng",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Western Cape",
  "Northern Cape",
];

function cleanText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#8211;/gi, "–")
    .replace(/&#8212;/gi, "—")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function lowerText(
  value: unknown,
): string {
  return cleanText(value)?.toLowerCase() ?? "";
}

function clampScore(
  value: unknown,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(parsed),
    ),
  );
}

function normaliseProviderScore(
  value: unknown,
  fallback = 0.5,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.max(
        0,
        Math.min(
          1,
          parsed,
        ),
      )
    : fallback;
}

function cleanArray(
  value: unknown,
  maximumItems: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(cleanText)
        .filter(
          (
            item,
          ): item is string =>
            Boolean(item),
        ),
    ),
  ].slice(
    0,
    maximumItems,
  );
}

function getEnvironment():
  Environment | null {
  const tavilyApiKey =
    cleanText(
      process.env.TAVILY_API_KEY,
    );

  const serpApiKey =
    cleanText(
      process.env.SERPAPI_API_KEY,
    ) ||
    cleanText(
      process.env.SERP_API_KEY,
    ) ||
    cleanText(
      process.env.SERPAPI_KEY,
    );

  const newsApiKey =
    cleanText(
      process.env.NEWS_API_KEY,
    ) ||
    cleanText(
      process.env.NEWSAPI_KEY,
    );

  const supabaseUrl =
    cleanText(
      process.env.VITE_SUPABASE_URL,
    ) ||
    cleanText(
      process.env.SUPABASE_URL,
    );

  const supabaseKey =
    cleanText(
      process.env
        .VITE_SUPABASE_PUBLISHABLE_KEY,
    ) ||
    cleanText(
      process.env
        .VITE_SUPABASE_ANON_KEY,
    ) ||
    cleanText(
      process.env
        .SUPABASE_PUBLISHABLE_KEY,
    ) ||
    cleanText(
      process.env
        .SUPABASE_ANON_KEY,
    );

  const organisationId =
    cleanText(
      process.env
        .COSSA_ORGANISATION_ID,
    ) ||
    cleanText(
      process.env
        .VITE_COSSA_ORGANISATION_ID,
    ) ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    return null;
  }

  if (
    !tavilyApiKey &&
    !serpApiKey &&
    !newsApiKey
  ) {
    return null;
  }

  return {
    tavilyApiKey,
    serpApiKey,
    newsApiKey,

    supabaseUrl:
      supabaseUrl.replace(
        /\/+$/,
        "",
      ),

    supabaseKey,
    organisationId,
  };
}

function getBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  return (
    authorization
      .slice(7)
      .trim() || null
  );
}

async function verifySupabaseUser(
  token: string,
  environment: Environment,
): Promise<SupabaseUser | null> {
  const response =
    await fetch(
      `${environment.supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey:
            environment.supabaseKey,

          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  if (!response.ok) {
    return null;
  }

  return (
    (await response.json()) as SupabaseUser
  );
}

async function verifyOrganisationMembership(
  token: string,
  userId: string,
  environment: Environment,
): Promise<boolean> {
  const query =
    new URLSearchParams({
      select:
        "user_id,status,role",

      organisation_id:
        `eq.${environment.organisationId}`,

      user_id:
        `eq.${userId}`,

      status:
        "eq.active",

      limit:
        "1",
    });

  const response =
    await fetch(
      `${environment.supabaseUrl}/rest/v1/organisation_members?${query}`,
      {
        headers: {
          apikey:
            environment.supabaseKey,

          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json",
        },
      },
    );

  if (!response.ok) {
    console.error(
      "Membership query failed:",
      response.status,
      await response
        .text()
        .catch(
          () => "",
        ),
    );

    return false;
  }

  const rows =
    (await response.json()) as unknown[];

  return rows.length === 1;
}

function enforceRateLimit(
  userId: string,
): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now =
    Date.now();

  const current =
    rateLimits.get(
      userId,
    );

  if (
    !current ||
    current.resetAt <= now
  ) {
    rateLimits.set(
      userId,
      {
        count: 1,

        resetAt:
          now +
          RATE_LIMIT_WINDOW_MS,
      },
    );

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (
    current.count >=
    RATE_LIMIT_REQUESTS
  ) {
    return {
      allowed: false,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            (
              current.resetAt -
              now
            ) /
              1000,
          ),
        ),
    };
  }

  current.count += 1;

  rateLimits.set(
    userId,
    current,
  );

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

function validateRequest(
  value: unknown,
):
  | {
      valid: true;
      request: LeadHunterSearchRequest;
    }
  | {
      valid: false;
      error: string;
    } {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {
      valid: false,
      error:
        "Invalid Lead Hunter request.",
    };
  }

  const candidate =
    value as Partial<LeadHunterSearchRequest>;

  const services =
    Array.isArray(
      candidate.services,
    )
      ? [
          ...new Set(
            candidate.services.filter(
              (
                service,
              ): service is LeadHunterServiceCategory =>
                typeof service ===
                  "string" &&
                service !== "general" &&
                Object.hasOwn(
                  SERVICE_LABELS,
                  service,
                ),
            ),
          ),
        ].slice(
          0,
          30,
        )
      : [];

  const companies =
    Array.isArray(
      candidate.companies,
    )
      ? [
          ...new Set(
            candidate.companies.filter(
              (
                company,
              ): company is LeadHunterCompany =>
                typeof company ===
                  "string" &&
                VALID_COMPANIES.has(
                  company as LeadHunterCompany,
                ),
            ),
          ),
        ].slice(
          0,
          10,
        )
      : [];

  if (
    services.length === 0
  ) {
    return {
      valid: false,
      error:
        "Choose at least one service.",
    };
  }

  if (
    companies.length === 0
  ) {
    return {
      valid: false,
      error:
        "Choose at least one Cossa company.",
    };
  }

  const locations =
    cleanArray(
      candidate.locations,
      25,
    );

  const countries =
    cleanArray(
      candidate.countries,
      15,
    );

  const provinces =
    cleanArray(
      candidate.provinces,
      12,
    );

  const cities =
    cleanArray(
      candidate.cities,
      25,
    );

  const suburbs =
    cleanArray(
      candidate.suburbs,
      30,
    );

  const industries =
    cleanArray(
      candidate.industries,
      20,
    );

  const organisationTypes =
    cleanArray(
      candidate.organisation_types,
      20,
    );

  const tenderKeywords =
    cleanArray(
      candidate.tender_keywords,
      25,
    );

  const prospectKeywords =
    cleanArray(
      candidate.prospect_keywords,
      35,
    );

  const rawCount =
    Number(
      candidate.result_count ??
        15,
    );

  const resultCount =
    Number.isFinite(
      rawCount,
    )
      ? Math.min(
          MAX_REQUEST_RESULTS,
          Math.max(
            1,
            Math.round(
              rawCount,
            ),
          ),
        )
      : 15;

  const requestedQueryLimit =
    Number(
      candidate.max_search_queries ??
        5,
    );

  const maxSearchQueries =
    Math.max(
      1,
      Math.min(
        MAX_SEARCH_QUERIES,
        Number.isFinite(
          requestedQueryLimit,
        )
          ? Math.round(
              requestedQueryLimit,
            )
          : 5,
      ),
    );

  const searchInstruction =
    cleanText(
      candidate.search_instruction,
    );

  const notes =
    cleanText(
      candidate.notes,
    );

  /**
   * IMPORTANT:
   * Preserve explicit UI sector controls.
   * Do not infer government permission from the mission.
   */
  const sector =
    typeof candidate.sector ===
      "string" &&
    VALID_SECTORS.has(
      candidate.sector as LeadHunterSearchRequest["sector"],
    )
      ? candidate.sector
      : "mixed";

  const includePrivateSector =
    candidate.include_private_sector ===
    true;

  const includeGovernmentSector =
    candidate.include_government_sector ===
    true;

  const includeNonprofits =
    candidate.include_nonprofits ===
    true;

  const searchScope =
    candidate.search_scope ??
    "south_africa";

  const deliveryModel =
    candidate.delivery_model ??
    "auto";

  const searchDepth =
    candidate.search_depth ===
      "standard" ||
    candidate.search_depth ===
      "deep"
      ? candidate.search_depth
      : "economy";

  const depthQueryBudget =
    SEARCH_DEPTH_QUERY_BUDGETS[
      searchDepth
    ];

  const revenueMode =
    candidate.revenue_mode ??
    "quick_revenue";

  const objectives =
    Array.isArray(
      candidate.objectives,
    )
      ? [
          ...new Set(
            candidate.objectives,
          ),
        ]
      : [];

  const radiusRaw =
    candidate.radius_km;

  const radiusKm =
    radiusRaw === null ||
    radiusRaw === undefined
      ? null
      : Math.max(
          1,
          Math.min(
            500,
            Math.round(
              Number(radiusRaw),
            ),
          ),
        );

  return {
    valid: true,

    request: {
      sector,
      companies,
      services,

      locations:
        locations.length > 0
          ? locations
          : [
              ...cities,
              ...provinces,
              ...countries,
            ].length > 0
            ? [
                ...cities,
                ...provinces,
                ...countries,
              ]
            : [
                "Gauteng",
              ],

      industries,
      organisation_types:
        organisationTypes,

      result_count:
        resultCount,

      minimum_score:
        clampScore(
          candidate.minimum_score ??
            60,
        ),

      minimum_evidence_sources:
        Math.max(
          1,
          Math.min(
            5,
            Math.round(
              Number(
                candidate.minimum_evidence_sources ??
                  1,
              ),
            ),
          ),
        ),

      include_small_projects:
        candidate.include_small_projects !==
        false,

      include_large_projects:
        candidate.include_large_projects !==
        false,

      include_private_sector:
        includePrivateSector,

      include_government_sector:
        includeGovernmentSector,

      include_nonprofits:
        includeNonprofits,

      require_public_phone_or_email:
        candidate.require_public_phone_or_email ===
        true,

      require_website:
        candidate.require_website ===
        true,

      require_opportunity_signal:
        candidate.require_opportunity_signal ===
        true,

      tender_keywords:
        tenderKeywords,

      prospect_keywords:
        prospectKeywords,

      verified_sources_only:
        candidate.verified_sources_only !==
        false,

      exclude_existing_crm_leads:
        candidate.exclude_existing_crm_leads !==
        false,

      notes,

      search_instruction:
        searchInstruction,

      search_scope:
        searchScope,

      delivery_model:
        deliveryModel,

      search_depth:
        searchDepth,

      revenue_mode:
        revenueMode,

      objectives,

      countries,

      provinces,

      cities,

      suburbs,

      radius_km:
        Number.isFinite(
          Number(radiusKm),
        )
          ? radiusKm
          : null,

      search_everything:
        candidate.search_everything ===
        true,

      easy_wins_only:
        candidate.easy_wins_only !==
        false,

      revenue_first:
        candidate.revenue_first !==
        false,

      max_search_queries:
        Math.min(
          maxSearchQueries,
          depthQueryBudget,
        ),

      use_cached_results:
        candidate.use_cached_results !==
        false,

      cache_max_age_hours:
        Math.max(
          1,
          Math.min(
            168,
            Math.round(
              Number(
                candidate.cache_max_age_hours ??
                  24,
              ),
            ),
          ),
        ),

      exclude_competitors:
        true,

      exclude_directories:
        candidate.exclude_directories !==
        false,

      exclude_expired_procurement:
        candidate.exclude_expired_procurement !==
        false,
    },
  };
}

function serviceLabel(
  service: LeadHunterServiceCategory,
): string {
  return (
    SERVICE_LABELS[
      service
    ] ??
    "business services"
  );
}

function buyerTargetsForService(
  service: LeadHunterServiceCategory,
): string[] {
  const common = [
    "small businesses",
    "property companies",
    "schools",
    "office parks",
    "warehouses",
    "retail businesses",
  ];

  const map: Partial<
    Record<
      LeadHunterServiceCategory,
      string[]
    >
  > = {
    construction: [
      "property developers",
      "schools",
      "commercial property owners",
      "churches",
      "retail property owners",
      "industrial property owners",
    ],

    renovation: [
      "property management companies",
      "office parks",
      "schools",
      "churches",
      "hotels",
      "retail stores",
    ],

    property_maintenance: [
      "property management companies",
      "body corporate managing agents",
      "estate management companies",
      "office parks",
      "shopping centres",
      "warehouses",
    ],

    painting: [
      "property managers",
      "schools",
      "office parks",
      "shopping centres",
      "churches",
      "warehouses",
    ],

    tiling: [
      "property managers",
      "retail stores",
      "restaurants",
      "schools",
      "churches",
      "commercial property owners",
    ],

    ceilings: [
      "property managers",
      "office parks",
      "schools",
      "retail property owners",
      "churches",
      "commercial landlords",
    ],

    roofing: [
      "property management companies",
      "schools",
      "warehouses",
      "factories",
      "churches",
      "commercial property owners",
    ],

    plumbing: [
      "property managers",
      "estate managers",
      "schools",
      "office parks",
      "shopping centres",
      "warehouses",
    ],

    facility_management: [
      "office parks",
      "shopping centres",
      "property management companies",
      "industrial parks",
      "schools",
      "healthcare facilities",
    ],

    commercial_cleaning: [
      "property management companies",
      "office parks",
      "shopping centres",
      "warehouses",
      "schools",
      "healthcare facilities",
    ],

    deep_cleaning: [
      "offices",
      "schools",
      "churches",
      "restaurants",
      "property managers",
      "retail stores",
    ],

    hygiene: [
      "schools",
      "healthcare facilities",
      "office parks",
      "shopping centres",
      "warehouses",
      "restaurants",
    ],

    landscaping: [
      "estate managers",
      "office parks",
      "schools",
      "shopping centres",
      "property managers",
      "hospitality venues",
    ],

    waste_management: [
      "shopping centres",
      "office parks",
      "warehouses",
      "factories",
      "schools",
      "property management companies",
    ],

    website_design: [
      "small businesses",
      "property companies",
      "construction companies",
      "schools",
      "churches",
      "professional services firms",
    ],

    logo_design: [
      "small businesses",
      "restaurants",
      "retail businesses",
      "contractors",
      "professional services firms",
      "nonprofit organisations",
    ],

    branding: [
      "small businesses",
      "restaurants",
      "retail businesses",
      "contractors",
      "professional services firms",
      "nonprofit organisations",
    ],

    seo: [
      "local businesses",
      "professional services firms",
      "property companies",
      "retail businesses",
      "hospitality businesses",
      "contractors",
    ],

    digital_marketing: [
      "local businesses",
      "retail businesses",
      "property companies",
      "hospitality businesses",
      "professional services firms",
      "training providers",
    ],

    social_media_management: [
      "local businesses",
      "retail businesses",
      "restaurants",
      "hospitality businesses",
      "professional services firms",
      "training providers",
    ],

    google_business_profile: [
      "local businesses",
      "contractors",
      "restaurants",
      "retail businesses",
      "professional services firms",
      "property businesses",
    ],

    lead_generation: [
      "service businesses",
      "property companies",
      "construction companies",
      "professional services firms",
      "technology companies",
      "training providers",
    ],

    crm: [
      "growing service businesses",
      "property management companies",
      "sales teams",
      "training providers",
      "logistics companies",
      "professional services firms",
    ],

    ai_automation: [
      "growing SMEs",
      "property management companies",
      "logistics companies",
      "professional services firms",
      "retail businesses",
      "training providers",
    ],

    business_documents: [
      "construction companies",
      "facility service companies",
      "consulting firms",
      "contractors",
      "small businesses",
      "professional services firms",
    ],

    quotations: [
      "contractors",
      "construction companies",
      "service businesses",
      "maintenance companies",
      "cleaning companies",
      "professional services firms",
    ],

    proposals: [
      "consulting firms",
      "contractors",
      "construction companies",
      "service businesses",
      "training providers",
      "professional services firms",
    ],

    contracts: [
      "small businesses",
      "contractors",
      "construction companies",
      "service businesses",
      "consulting firms",
      "property companies",
    ],

    ecommerce: [
      "retail businesses",
      "product businesses",
      "fashion businesses",
      "food businesses",
      "manufacturers",
      "wholesalers",
    ],

    general:
      common,
  };

  return (
    map[service] ??
    common
  );
}

function createSearchQueries(
  request: LeadHunterSearchRequest,
): SearchPlan[] {
  const plans:
    SearchPlan[] = [];

  const mission =
    cleanText(
      request.search_instruction,
    ) ?? "";

  const combinedLocations = [
    ...(request.cities ?? []),
    ...(request.suburbs ?? []),
    ...(request.provinces ?? []),
    ...request.locations,
  ];

  const location =
    [
      ...new Set(
        combinedLocations,
      ),
    ]
      .filter(Boolean)
      .slice(0, 4)
      .join(" ") ||
    "South Africa";

  const requestedTargets = [
    ...request.organisation_types,
    ...request.industries,
  ].filter(Boolean);

  const extraTerms = [
    ...request.tender_keywords,
    ...request.prospect_keywords,
  ]
    .filter(Boolean)
    .slice(0, 4);

  const extra =
    extraTerms.length > 0
      ? ` (${extraTerms
          .map(
            (value) =>
              `"${value}"`,
          )
          .join(" OR ")})`
      : "";

  /**
   * Sector permissions come from explicit controls only.
   */
  const shouldPrivate =
    request.include_private_sector === true &&
    (request.sector === "mixed" || request.sector === "private");

  const shouldGovernment =
    request.include_government_sector === true &&
    (request.sector === "mixed" || request.sector === "government");

  const shouldNonprofit =
    request.include_nonprofits === true &&
    (request.sector === "mixed" || request.sector === "nonprofit");

  if (mission) {
    const missionPurpose:
      SearchPurpose =
      PROCUREMENT_PATTERN.test(
        mission,
      ) ||
      /\b(tender|rfq|rfp|bid|procurement)\b/i.test(
        mission,
      )
        ? "active_procurement"
        : DIGITAL_AUDIT_MISSION_PATTERN.test(
              mission,
            )
          ? "website_gap"
          : "buyer_discovery";

    plans.push({
      query:
        `${mission} ${location}`,

      purpose:
        missionPurpose,

      targetDescription:
        request.organisation_types[0] ??
        request.industries[0] ??
        "custom mission target",

      service:
        request.services[0] ??
        "general",
    });
  }

  for (
    const service of request.services.slice(
      0,
      6,
    )
  ) {
    const defaults =
      buyerTargetsForService(
        service,
      );

    const targets =
      requestedTargets.length > 0
        ? [
            ...new Set(
              requestedTargets,
            ),
          ].slice(0, 6)
        : defaults.slice(
            0,
            6,
          );

    const target1 =
      targets[0] ??
      "business";

    const target2 =
      targets[1] ??
      target1;

    const label =
      serviceLabel(
        service,
      );

    if (shouldPrivate) {
      plans.push({
        query:
          `"${target1}" "${location}" "${label}" official website contact${extra}`,

        purpose:
          "buyer_discovery",

        targetDescription:
          target1,

        service,
      });

      plans.push({
        query:
          `"${target2}" "${location}" "${label}" official organisation contact${extra}`,

        purpose:
          "buyer_discovery",

        targetDescription:
          target2,

        service,
      });

      plans.push({
        query:
          `"${location}" "${target1}" ("new branch" OR expansion OR development OR refurbishment OR upgrade OR investment OR "new premises") "${label}"`,

        purpose:
          "growth_signal",

        targetDescription:
          target1,

        service,
      });

      if (
        [
          "website_design",
          "logo_design",
          "branding",
          "seo",
          "digital_marketing",
          "social_media_management",
          "google_business_profile",
          "lead_generation",
          "crm",
          "ai_automation",
          "ecommerce",
        ].includes(
          service,
        )
      ) {
        plans.push({
          query:
            `"${target1}" "${location}" official website contact business`,

          purpose:
            "website_gap",

          targetDescription:
            target1,

          service,
        });
      }
    }

    if (shouldNonprofit) {
      plans.push({
        query:
          `(church OR nonprofit OR NGO OR "community centre") "${location}" official website contact "${label}"`,

        purpose:
          "buyer_discovery",

        targetDescription:
          "churches and nonprofit organisations",

        service,
      });
    }

    if (shouldGovernment) {
      plans.push({
        query:
          `site:etenders.gov.za "${label}" ("closing date" OR "tender number" OR "bid number" OR RFQ)${extra}`,

        purpose:
          "active_procurement",

        targetDescription:
          "South African government procurement",

        service,
      });

      plans.push({
        query:
          `(site:gov.za OR site:gauteng.gov.za OR site:tshwane.gov.za) "${label}" (RFQ OR RFP OR tender OR bid)${extra}`,

        purpose:
          "active_procurement",

        targetDescription:
          "Government and municipal procurement",

        service,
      });

      plans.push({
        query:
          `"${location}" (government OR municipality OR department) "${label}" ("supplier registration" OR "supplier database" OR "vendor registration")`,

        purpose:
          "supplier_registration",

        targetDescription:
          "Government supplier registration",

        service,
      });
    }
  }

  const unique =
    new Map<
      string,
      SearchPlan
    >();

  for (
    const plan of plans
  ) {
    const query =
      plan.query
        .replace(
          /\s+/g,
          " ",
        )
        .trim();

    const key =
      `${plan.purpose}:${query.toLowerCase()}`;

    if (
      query &&
      !unique.has(key)
    ) {
      unique.set(
        key,
        {
          ...plan,
          query,
        },
      );
    }
  }

  const requestedLimit =
    Math.max(
      1,
      Math.min(
        MAX_SEARCH_QUERIES,
        Math.round(
          Number(
            request.max_search_queries ??
              5,
          ),
        ),
      ),
    );

  return [
    ...unique.values(),
  ].slice(
    0,
    requestedLimit,
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    );

  const externalSignal =
    init.signal;

  if (externalSignal) {
    externalSignal.addEventListener(
      "abort",
      () =>
        controller.abort(),
      {
        once: true,
      },
    );
  }

  try {
    return await fetch(
      input,
      {
        ...init,
        signal:
          controller.signal,
      },
    );
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function normaliseUrl(
  value: unknown,
): string | null {
  const text =
    cleanText(value);

  if (!text) {
    return null;
  }

  try {
    const url =
      new URL(
        /^https?:\/\//i.test(
          text,
        )
          ? text
          : `https://${text}`,
      );

    if (
      ![
        "http:",
        "https:",
      ].includes(
        url.protocol,
      )
    ) {
      return null;
    }

    url.hash = "";

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ].forEach(
      (key) =>
        url.searchParams.delete(
          key,
        ),
    );

    return url.toString();
  } catch {
    return null;
  }
}

async function tavilySearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<
  SearchCandidate[]
> {
  const payload: Record<
    string,
    unknown
  > = {
    query:
      plan.query,

    topic:
      plan.purpose ===
      "growth_signal"
        ? "news"
        : "general",

    search_depth:
      "basic",

    max_results:
      MAX_RESULTS_PER_QUERY,

    include_answer:
      false,

    include_images:
      false,

    include_raw_content:
      false,

    exclude_domains:
      PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE,
  };

  if (
    plan.purpose ===
    "growth_signal"
  ) {
    payload.time_range =
      "month";
  } else {
    payload.country =
      "south africa";
  }

  const response =
    await fetchWithTimeout(
      TAVILY_SEARCH_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          JSON.stringify(
            payload,
          ),
      },
      SEARCH_TIMEOUT_MS,
    );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () =>
            `Tavily ${response.status}`,
        ),
    );
  }

  const body =
    (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
        published_date?: string;
      }>;
    };

  return (
    body.results ?? []
  )
    .map(
      (
        result,
      ) => {
        const title =
          cleanText(
            result.title,
          );

        const url =
          normaliseUrl(
            result.url,
          );

        const snippet =
          cleanText(
            result.content,
          );

        if (
          !title ||
          !url ||
          !snippet
        ) {
          return null;
        }

        return {
          provider:
            "Tavily" as const,

          query:
            plan.query,

          purpose:
            plan.purpose,

          targetDescription:
            plan.targetDescription,

          searchedService:
            plan.service,

          title,
          url,
          snippet,

          publishedAt:
            cleanText(
              result.published_date,
            ),

          providerScore:
            normaliseProviderScore(
              result.score,
              0.6,
            ),
        };
      },
    )
    .filter(
      (
        item,
      ): item is SearchCandidate =>
        Boolean(item),
    );
}

async function serpApiSearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<
  SearchCandidate[]
> {
  const params =
    new URLSearchParams({
      engine:
        "google",

      q:
        plan.query,

      api_key:
        apiKey,

      google_domain:
        "google.co.za",

      gl:
        "za",

      hl:
        "en",

      num:
        String(
          MAX_RESULTS_PER_QUERY,
        ),

      safe:
        "active",
    });

  if (
    [
      "growth_signal",
      "active_procurement",
    ].includes(
      plan.purpose,
    )
  ) {
    params.set(
      "tbs",
      "qdr:m",
    );
  }

  const response =
    await fetchWithTimeout(
      `${SERPAPI_SEARCH_URL}?${params}`,
      {
        headers: {
          Accept:
            "application/json",
        },
      },
      SEARCH_TIMEOUT_MS,
    );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () =>
            `SerpAPI ${response.status}`,
        ),
    );
  }

  const payload =
    (await response.json()) as {
      error?: string;

      organic_results?: Array<{
        position?: number;
        title?: string;
        link?: string;
        snippet?: string;
        date?: string;
      }>;
    };

  if (
    payload.error
  ) {
    throw new Error(
      payload.error,
    );
  }

  return (
    payload.organic_results ??
    []
  )
    .slice(
      0,
      MAX_RESULTS_PER_QUERY,
    )
    .map(
      (
        result,
        index,
      ) => {
        const title =
          cleanText(
            result.title,
          );

        const url =
          normaliseUrl(
            result.link,
          );

        const snippet =
          cleanText(
            result.snippet,
          );

        if (
          !title ||
          !url ||
          !snippet
        ) {
          return null;
        }

        const position =
          Number(
            result.position ??
              index +
                1,
          );

        return {
          provider:
            "SerpAPI" as const,

          query:
            plan.query,

          purpose:
            plan.purpose,

          targetDescription:
            plan.targetDescription,

          searchedService:
            plan.service,

          title,
          url,
          snippet,

          publishedAt:
            cleanText(
              result.date,
            ),

          providerScore:
            Math.max(
              0.35,
              Math.min(
                0.95,
                1 -
                  Math.max(
                    0,
                    position -
                      1,
                  ) *
                    0.06,
              ),
            ),
        };
      },
    )
    .filter(
      (
        item,
      ): item is SearchCandidate =>
        Boolean(item),
    );
}

async function newsApiSearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<
  SearchCandidate[]
> {
  if (
    ![
      "growth_signal",
      "active_procurement",
      "supplier_registration",
    ].includes(
      plan.purpose,
    )
  ) {
    return [];
  }

  const from =
    new Date(
      Date.now() -
        45 *
          86_400_000,
    )
      .toISOString()
      .slice(
        0,
        10,
      );

  const cleanedQuery =
    plan.query
      .replace(
        /\bsite:[^\s)]+/gi,
        " ",
      )
      .replace(
        /[()]/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const q =
    `${cleanedQuery} AND ("South Africa" OR Gauteng OR Pretoria OR Johannesburg)`
      .slice(
        0,
        500,
      );

  const params =
    new URLSearchParams({
      q,

      searchIn:
        "title,description,content",

      language:
        "en",

      sortBy:
        "publishedAt",

      pageSize:
        String(
          MAX_RESULTS_PER_QUERY,
        ),

      page:
        "1",

      from,
    });

  const response =
    await fetchWithTimeout(
      `${NEWS_API_URL}?${params}`,
      {
        headers: {
          Accept:
            "application/json",

          "X-Api-Key":
            apiKey,
        },
      },
      SEARCH_TIMEOUT_MS,
    );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () =>
            `NewsAPI ${response.status}`,
        ),
    );
  }

  const payload =
    (await response.json()) as {
      status?: string;
      message?: string;

      articles?: Array<{
        title?: string | null;
        description?: string | null;
        content?: string | null;
        url?: string | null;
        publishedAt?: string | null;
      }>;
    };

  if (
    payload.status ===
    "error"
  ) {
    throw new Error(
      payload.message ||
        "NewsAPI error",
    );
  }

  return (
    payload.articles ?? []
  )
    .map(
      (
        article,
        index,
      ) => {
        const title =
          cleanText(
            article.title,
          );

        const url =
          normaliseUrl(
            article.url,
          );

        const snippet =
          cleanText(
            article.description,
          ) ||
          cleanText(
            article.content,
          );

        if (
          !title ||
          !url ||
          !snippet
        ) {
          return null;
        }

        return {
          provider:
            "NewsAPI" as const,

          query:
            plan.query,

          purpose:
            plan.purpose,

          targetDescription:
            plan.targetDescription,

          searchedService:
            plan.service,

          title,
          url,
          snippet,

          publishedAt:
            cleanText(
              article.publishedAt,
            ),

          providerScore:
            Math.max(
              0.45,
              0.8 -
                index *
                  0.035,
            ),
        };
      },
    )
    .filter(
      (
        item,
      ): item is SearchCandidate =>
        Boolean(item),
    );
}

async function executePlan(
  plan: SearchPlan,
  environment: Environment,
) {
  const results: Array<{
    provider: SearchProvider;
    candidates: SearchCandidate[];
    warning?: string;
  }> = [];

  const wrap = (
    provider: SearchProvider,
    promise:
      Promise<
        SearchCandidate[]
      >,
  ) =>
    promise
      .then(
        (
          candidates,
        ) => ({
          provider,
          candidates,
        }),
      )
      .catch(
        (
          error: unknown,
        ) => ({
          provider,
          candidates: [],

          warning:
            `${provider} failed for "${plan.query}": ${
              error instanceof
              Error
                ? error.message
                : "Unknown error"
            }`,
        }),
      );

  /*
   * One plan represents one query budget unit. Do not spend the same unit at
   * every provider by default. Fresh-news growth searches use the free-tier
   * friendly NewsAPI first; Tavily basic is the primary discovery source; and
   * SerpAPI remains an explicit fallback when the earlier source is thin.
   */
  if (
    plan.purpose === "growth_signal" &&
    environment.newsApiKey
  ) {
    const news = await wrap(
      "NewsAPI",
      newsApiSearch(
        plan,
        environment.newsApiKey,
      ),
    );

    results.push(news);

    if (news.candidates.length >= 3) {
      return results;
    }
  }

  if (environment.tavilyApiKey) {
    const tavily = await wrap(
      "Tavily",
      tavilySearch(
        plan,
        environment.tavilyApiKey,
      ),
    );

    results.push(tavily);

    if (tavily.candidates.length >= 3) {
      return results;
    }
  }

  if (environment.serpApiKey) {
    results.push(
      await wrap(
        "SerpAPI",
        serpApiSearch(
          plan,
          environment.serpApiKey,
        ),
      ),
    );
  }

  return results;
}

function getHostname(
  value: string,
): string {
  try {
    return new URL(
      value,
    )
      .hostname
      .replace(
        /^www\./,
        "",
      )
      .toLowerCase();
  } catch {
    return "";
  }
}

function normalisePhoneKey(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const digits =
    value.replace(
      /\D/g,
      "",
    );

  if (
    digits.length < 9
  ) {
    return null;
  }

  return digits.slice(
    -9,
  );
}

function normaliseEmailKey(
  value: string | null,
): string | null {
  const email =
    cleanText(value)?.toLowerCase();

  if (
    !email ||
    !email.includes("@")
  ) {
    return null;
  }

  return email;
}

function normaliseOrganisationKey(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /\b(pty|ltd|limited|cc|inc|company|holdings|group|south africa)\b/g,
      " ",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function deduplicateCandidates(
  candidates: SearchCandidate[],
): SearchCandidate[] {
  const map =
    new Map<
      string,
      SearchCandidate
    >();

  const providerPriority =
    (
      provider:
        SearchProvider,
    ) =>
      provider ===
      "Tavily"
        ? 3
        : provider ===
            "SerpAPI"
          ? 2
          : 1;

  for (
    const candidate of candidates
  ) {
    const key =
      candidate.url
        .replace(
          /\/+$/,
          "",
        )
        .toLowerCase();

    const existing =
      map.get(
        key,
      );

    const candidateRank =
      candidate.providerScore *
        100 +
      providerPriority(
        candidate.provider,
      );

    const existingRank =
      existing
        ? existing.providerScore *
            100 +
          providerPriority(
            existing.provider,
          )
        : -1;

    if (
      !existing ||
      candidateRank >
        existingRank
    ) {
      map.set(
        key,
        candidate,
      );
    }
  }

  return [
    ...map.values(),
  ].sort(
    (
      first,
      second,
    ) =>
      second.providerScore -
      first.providerScore,
  );
}

function htmlToText(
  html: string,
): string {
  return (
    cleanText(
      html
        .replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          " ",
        )
        .replace(
          /<style\b[^>]*>[\s\S]*?<\/style>/gi,
          " ",
        )
        .replace(
          /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
          " ",
        )
        .replace(
          /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
          " ",
        )
        .replace(
          /<[^>]+>/g,
          " ",
        ),
    )?.slice(
      0,
      MAX_SOURCE_CONTENT_LENGTH,
    ) ?? ""
  );
}

function extractEmails(
  text: string,
): string[] {
  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    ) ?? [];

  return [
    ...new Set(
      matches
        .map(
          (value) =>
            value.toLowerCase(),
        )
        .filter(
          (value) =>
            !value.includes(
              "example.com",
            ) &&
            !value.includes(
              "sentry.io",
            ) &&
            !value.includes(
              "wixpress.com",
            ) &&
            !value.endsWith(
              ".png",
            ) &&
            !value.endsWith(
              ".jpg",
            ),
        ),
    ),
  ].slice(
    0,
    8,
  );
}

function extractPhones(
  text: string,
): string[] {
  const matches =
    text.match(
      /(?:\+27|0)\s?\d{2}[\s().-]?\d{3}[\s.-]?\d{4}/g,
    ) ?? [];

  return [
    ...new Set(
      matches
        .map(
          (value) =>
            value.replace(
              /[^\d+]/g,
              "",
            ),
        )
        .filter(
          (value) =>
            /^\+27\d{9}$/.test(
              value,
            ) ||
            /^0\d{9}$/.test(
              value,
            ),
        ),
    ),
  ].slice(
    0,
    8,
  );
}

function findContactPageUrl(
  html: string,
  baseUrl: string,
): string | null {
  for (
    const match of html.matchAll(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )
  ) {
    const href =
      cleanText(
        match[1],
      );

    const label =
      lowerText(
        match[2]?.replace(
          /<[^>]+>/g,
          " ",
        ),
      );

    if (
      !href ||
      !/(contact|enquir|procurement|supplier|tender|vendor|scm)/i.test(
        `${href} ${label}`,
      )
    ) {
      continue;
    }

    try {
      const url =
        new URL(
          href,
          baseUrl,
        );

      if (
        [
          "http:",
          "https:",
        ].includes(
          url.protocol,
        )
      ) {
        return url.toString();
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return null;
}

async function inspectSourcePage(
  sourceUrl: string,
): Promise<PageInspection> {
  const inspectedAt =
    new Date().toISOString();

  try {
    const response =
      await fetchWithTimeout(
        sourceUrl,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",

            "User-Agent":
              "CossaLeadHunter/4.0 (+https://growth.cossanexusholdings.co.za)",
          },

          redirect:
            "follow",
        },
        PAGE_TIMEOUT_MS,
      );

    const contentType =
      (
        response.headers.get(
          "content-type",
        ) ?? ""
      ).toLowerCase();

    if (
      !response.ok ||
      !contentType.includes(
        "text/html",
      )
    ) {
      throw new Error(
        "Page unavailable",
      );
    }

    const html =
      await response.text();

    const text =
      htmlToText(
        html,
      );

    const finalUrl =
      response.url ||
      sourceUrl;

    const contactPageUrl =
      findContactPageUrl(
        html,
        finalUrl,
      );

    let emails =
      extractEmails(
        text,
      );

    let phones =
      extractPhones(
        text,
      );

    /*
     * Related domains often expose their shared phone or email only on the
     * contact page. Fetch a same-domain contact page so entity deduplication
     * uses that public identity, without following third-party links.
     */
    if (
      contactPageUrl &&
      getHostname(contactPageUrl) ===
        getHostname(finalUrl)
    ) {
      try {
        const contactResponse =
          await fetchWithTimeout(
            contactPageUrl,
            {
              headers: {
                Accept:
                  "text/html,application/xhtml+xml",
                "User-Agent":
                  "CossaLeadHunter/4.0 (+https://growth.cossanexusholdings.co.za)",
              },
              redirect: "follow",
            },
            PAGE_TIMEOUT_MS,
          );

        if (
          contactResponse.ok &&
          (contactResponse.headers.get("content-type") ?? "").toLowerCase().includes("text/html")
        ) {
          const contactText =
            htmlToText(
              await contactResponse.text(),
            );

          emails = [
            ...new Set([
              ...emails,
              ...extractEmails(contactText),
            ]),
          ].slice(0, 8);

          phones = [
            ...new Set([
              ...phones,
              ...extractPhones(contactText),
            ]),
          ].slice(0, 8);
        }
      } catch {
        // The primary page remains valid evidence when its contact page fails.
      }
    }

    return {
      url:
        sourceUrl,

      finalUrl,

      title:
        cleanText(
          html
            .match(
              /<title[^>]*>([\s\S]*?)<\/title>/i,
            )?.[1]
            ?.replace(
              /<[^>]+>/g,
              " ",
            ),
        ),

      text,

      emails:
        emails,

      phones:
        phones,

      contactPageUrl:
        contactPageUrl,

      inspectedAt,

      fetchSucceeded:
        true,
    };
  } catch {
    return {
      url:
        sourceUrl,

      finalUrl:
        sourceUrl,

      title:
        null,

      text:
        "",

      emails:
        [],

      phones:
        [],

      contactPageUrl:
        null,

      inspectedAt,

      fetchSucceeded:
        false,
    };
  }
}

function isGovernmentSource(
  url: string,
): boolean {
  const host =
    getHostname(
      url,
    );

  return (
    host.endsWith(
      ".gov.za",
    ) ||
    HIGH_TRUST_GOVERNMENT_DOMAINS.some(
      (
        domain,
      ) =>
        host === domain ||
        host.endsWith(
          `.${domain}`,
        ),
    )
  );
}

function isDirectorySource(
  url: string,
  content: string,
): boolean {
  const host =
    getHostname(
      url,
    );

  return (
    DIRECTORY_HOST_PATTERNS.some(
      (
        pattern,
      ) =>
        host.includes(
          pattern,
        ),
    ) ||
    DIRECTORY_TEXT_PATTERN.test(
      content,
    )
  );
}

function competitorPatternsForService(
  service: LeadHunterServiceCategory,
): RegExp[] {
  const map: Partial<
    Record<
      LeadHunterServiceCategory,
      RegExp[]
    >
  > = {
    construction: [
      /\bconstruction company\b/i,
      /\bbuilding contractor\b/i,
      /\bbuilders? in\b/i,
      /\bbuilding company\b/i,
      /\bconstruction services\b/i,
      /\bwe build\b/i,
    ],

    renovation: [
      /\brenovation company\b/i,
      /\brenovation contractor\b/i,
      /\brenovation services\b/i,
      /\bhome improvement company\b/i,
    ],

    property_maintenance: [
      /\bproperty maintenance company\b/i,
      /\bmaintenance contractor\b/i,
      /\bproperty maintenance services\b/i,
      /\bhandyman services\b/i,
    ],

    painting: [
      /\bpainting contractor\b/i,
      /\bpainters? in\b/i,
      /\bpainting services\b/i,
    ],

    tiling: [
      /\btiling contractor\b/i,
      /\btiling services\b/i,
      /\bprofessional tilers?\b/i,
    ],

    ceilings: [
      /\bceiling installer\b/i,
      /\bceiling contractor\b/i,
      /\bceiling services\b/i,
    ],

    roofing: [
      /\broofing contractor\b/i,
      /\broofing company\b/i,
      /\broof repair services\b/i,
    ],

    plumbing: [
      /\bplumbing company\b/i,
      /\bprofessional plumbers?\b/i,
      /\bplumbing services\b/i,
    ],

    facility_management: [
      /\bfacilities management company\b/i,
      /\bfacility management services\b/i,
    ],

    commercial_cleaning: [
      /\bcleaning company\b/i,
      /\bcommercial cleaning services\b/i,
      /\bprofessional cleaners?\b/i,
      /\bjanitorial services\b/i,
    ],

    deep_cleaning: [
      /\bdeep cleaning services\b/i,
      /\bcleaning company\b/i,
      /\bprofessional cleaners?\b/i,
    ],

    hygiene: [
      /\bhygiene services\b/i,
      /\bsanitation services\b/i,
      /\bcleaning company\b/i,
    ],

    landscaping: [
      /\blandscaping company\b/i,
      /\bgarden services\b/i,
      /\blandscape contractor\b/i,
    ],

    waste_management: [
      /\bwaste management company\b/i,
      /\bwaste collection services\b/i,
    ],

    website_design: [
      /\bweb design company\b/i,
      /\bwebsite design agency\b/i,
      /\bweb development agency\b/i,
      /\bweb designer\b/i,
    ],

    logo_design: [
      /\blogo design company\b/i,
      /\bgraphic design agency\b/i,
      /\blogo designer\b/i,
      /\bbranding agency\b/i,
    ],

    branding: [
      /\bbranding agency\b/i,
      /\bbrand design agency\b/i,
      /\bgraphic design agency\b/i,
      /\bbranding company\b/i,
    ],

    seo: [
      /\bseo agency\b/i,
      /\bseo company\b/i,
      /\bsearch marketing agency\b/i,
    ],

    digital_marketing: [
      /\bdigital marketing agency\b/i,
      /\bmarketing agency\b/i,
      /\bsocial media agency\b/i,
    ],

    social_media_management: [
      /\bsocial media agency\b/i,
      /\bsocial media management services\b/i,
      /\bdigital marketing agency\b/i,
    ],

    google_business_profile: [
      /\bgoogle business profile management\b/i,
      /\blocal seo agency\b/i,
      /\bdigital marketing agency\b/i,
    ],

    lead_generation: [
      /\blead generation agency\b/i,
      /\bappointment setting company\b/i,
    ],

    crm: [
      /\bcrm consultancy\b/i,
      /\bcrm implementation partner\b/i,
      /\bcrm software company\b/i,
    ],

    ai_automation: [
      /\bai automation agency\b/i,
      /\bautomation consultancy\b/i,
      /\bai solutions provider\b/i,
    ],

    business_documents: [
      /\bdocument drafting services\b/i,
      /\bbusiness plan writer\b/i,
      /\btender writing services\b/i,
    ],

    quotations: [
      /\bquotation software\b/i,
      /\binvoicing software\b/i,
    ],

    proposals: [
      /\bproposal writing services\b/i,
      /\btender writing company\b/i,
    ],

    contracts: [
      /\blegal document services\b/i,
      /\bcontract drafting services\b/i,
    ],

    ecommerce: [
      /\becommerce agency\b/i,
      /\bshopify agency\b/i,
      /\bonline store developers?\b/i,
    ],
  };

  return (
    map[service] ??
    []
  );
}

function inferBuyerRole(
  service: LeadHunterServiceCategory,
  content: string,
): string | null {
  const match =
    content.match(
      PUBLIC_BUYER_ROLE_PATTERN,
    );

  if (
    match?.[0]
  ) {
    return match[0].replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
  }

  const roles: Partial<
    Record<
      LeadHunterServiceCategory,
      string
    >
  > = {
    construction:
      "Property Owner, Project Manager or Procurement Manager",

    renovation:
      "Property Manager, Facilities Manager or Property Owner",

    property_maintenance:
      "Property Manager or Facilities Manager",

    painting:
      "Facilities Manager or Property Manager",

    tiling:
      "Property Manager or Project Manager",

    ceilings:
      "Facilities Manager or Property Manager",

    roofing:
      "Facilities Manager or Property Manager",

    plumbing:
      "Facilities Manager or Property Manager",

    facility_management:
      "Operations Manager or Facilities Director",

    commercial_cleaning:
      "Facilities Manager, Operations Manager or Property Manager",

    deep_cleaning:
      "Facilities Manager or Office Manager",

    hygiene:
      "Facilities Manager or Operations Manager",

    landscaping:
      "Estate Manager, Property Manager or Facilities Manager",

    waste_management:
      "Facilities Manager or Operations Manager",

    website_design:
      "Business Owner, Marketing Manager or IT Manager",

    logo_design:
      "Business Owner or Marketing Manager",

    branding:
      "Business Owner or Marketing Manager",

    seo:
      "Business Owner or Marketing Manager",

    digital_marketing:
      "Business Owner or Marketing Manager",

    social_media_management:
      "Business Owner or Marketing Manager",

    google_business_profile:
      "Business Owner or Marketing Manager",

    lead_generation:
      "Sales Director, Business Owner or Marketing Manager",

    crm:
      "Sales Director, Operations Manager or Business Owner",

    ai_automation:
      "Operations Manager, IT Manager or Business Owner",

    business_documents:
      "Business Owner, Operations Manager or Project Manager",

    quotations:
      "Business Owner, Finance Manager or Sales Manager",

    proposals:
      "Business Owner, Sales Manager or Bid Manager",

    contracts:
      "Business Owner, Operations Manager or Legal/Compliance Manager",

    ecommerce:
      "Business Owner, E-commerce Manager or Marketing Manager",

    general:
      "Business Owner or Operations Manager",
  };

  return (
    roles[service] ??
    null
  );
}

function inferSectorFromSource(
  candidate: SearchCandidate,
  inspection: PageInspection,
): CandidateSector {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${candidate.url} ${inspection.title ?? ""} ${inspection.text.slice(0, 8_000)}`;

  if (
    isOfficialPublicSectorSource(
      candidate.url,
    ) ||
    inspection.emails.some((email) =>
      email.endsWith(".gov.za"),
    ) ||
    (
      PROCUREMENT_PATTERN.test(searchable) &&
      GOVERNMENT_BUYER_PATTERN.test(searchable)
    )
  ) {
    return "government";
  }

  if (
    /\b(church|ministry|nonprofit|non-profit|ngo|charity|foundation|community centre|community center)\b/i.test(
      searchable,
    )
  ) {
    return "nonprofit";
  }

  return "private";
}

function sectorAllowed(
  request: LeadHunterSearchRequest,
  sector: CandidateSector,
): boolean {
  if (
    request.sector === "private" &&
    sector !== "private"
  ) {
    return false;
  }

  if (
    request.sector === "government" &&
    sector !== "government"
  ) {
    return false;
  }

  if (
    request.sector === "nonprofit" &&
    sector !== "nonprofit"
  ) {
    return false;
  }

  if (
    sector ===
    "private"
  ) {
    return (
      request.include_private_sector ===
      true
    );
  }

  if (
    sector ===
    "government"
  ) {
    return (
      request.include_government_sector ===
      true
    );
  }

  return (
    request.include_nonprofits ===
    true
  );
}

function detectCompetitorServices(
  request: LeadHunterSearchRequest,
  content: string,
): LeadHunterServiceCategory[] {
  const matches:
    LeadHunterServiceCategory[] = [];

  for (
    const service of request.services
  ) {
    const patterns =
      competitorPatternsForService(
        service,
      );

    if (
      patterns.some(
        (
          pattern,
        ) =>
          pattern.test(
            content,
          ),
      )
    ) {
      matches.push(
        service,
      );
    }
  }

  return [
    ...new Set(
      matches,
    ),
  ];
}

function serviceRequirementPatterns(
  service: LeadHunterServiceCategory,
): RegExp[] {
  const patterns: Partial<
    Record<
      LeadHunterServiceCategory,
      RegExp[]
    >
  > = {
    construction: [/\b(construction works?|building works?|civil works?|infrastructure works?|main contractor|contractor panel)\b/i],
    renovation: [/\b(renovation|refurbishment|building upgrade|alterations?)\b/i],
    property_maintenance: [/\b(property maintenance|maintenance contract|planned maintenance|minor works?|repair works?)\b/i],
    painting: [/\b(painting works?|repainting|painting contract)\b/i],
    tiling: [/\b(tiling works?|floor tiling|wall tiling)\b/i],
    ceilings: [/\b(ceiling (?:installation|repair|repairs|works)|suspended ceilings?)\b/i],
    roofing: [/\b(roof(?:ing)? (?:works?|repair|repairs|replacement)|roof replacement)\b/i],
    plumbing: [/\b(plumbing (?:works?|repair|repairs|contract)|water reticulation)\b/i],
    facility_management: [/\b(facilit(?:y|ies) management|facility services?)\b/i],
    commercial_cleaning: [/\b(commercial cleaning|cleaning contract|cleaning services required|janitorial)\b/i],
    deep_cleaning: [/\b(deep cleaning|post[- ]construction cleaning|industrial cleaning)\b/i],
    hygiene: [/\b(hygiene|sanitation|washroom services?|sanitary services?)\b/i],
    landscaping: [/\b(landscaping|landscape maintenance|garden services?)\b/i],
    waste_management: [/\b(waste management|waste collection|refuse removal|waste disposal)\b/i],
    website_design: [/\b(website (?:design|development|redesign|upgrade)|web(?:site)? development|web design|web portal)\b/i],
    logo_design: [/\b(logo (?:design|redesign|development|upgrade)|new logo)\b/i],
    branding: [/\b(branding|brand identity|brand strategy|brand redesign)\b/i],
    seo: [/\b(SEO|search engine optimi[sz]ation)\b/i],
    digital_marketing: [/\b(digital marketing|marketing services? required|marketing campaign)\b/i],
    social_media_management: [/\b(social media (?:management|services?|campaign))\b/i],
    google_business_profile: [/\b(google business profile|google business listing|google profile)\b/i],
    lead_generation: [/\b(lead generation|appointment setting|sales leads?)\b/i],
    crm: [/\b(CRM|customer relationship management|salesforce automation)\b/i],
    ai_automation: [/\b(AI automation|artificial intelligence (?:solution|solutions)|workflow automation|business process automation)\b/i],
    business_documents: [/\b(document management|business documents?|document system)\b/i],
    quotations: [/\b(quotation system|quote system|quotations? (?:software|process|system))\b/i],
    proposals: [/\b(proposal (?:writing|development|system)|bid proposal)\b/i],
    contracts: [/\b(contract (?:management|drafting|document|system)|service level agreement)\b/i],
    ecommerce: [/\b(e-?commerce|online store|web shop|shopping cart)\b/i],
  };

  return patterns[service] ?? [];
}

function matchingRequestedServices(
  request: LeadHunterSearchRequest,
  content: string,
): LeadHunterServiceCategory[] {
  return request.services.filter(
    (service) =>
      serviceRequirementPatterns(
        service,
      ).some(
        (pattern) =>
          pattern.test(
            content,
          ),
      ),
  );
}

function isOfficialPublicEntitySource(
  url: string,
): boolean {
  const host =
    getHostname(
      url,
    );

  return OFFICIAL_PUBLIC_ENTITY_DOMAINS.some(
    (
      domain,
    ) =>
      host === domain ||
      host.endsWith(
        `.${domain}`,
      ),
  );
}

function isOfficialPublicSectorSource(
  url: string,
): boolean {
  return (
    isGovernmentSource(
      url,
    ) ||
    isOfficialPublicEntitySource(
      url,
    )
  );
}

function hasVerifiedResearchBuyerProfile(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  content: string,
): boolean {
  if (
    candidate.purpose !== "buyer_discovery" ||
    request.require_opportunity_signal ||
    candidate.searchedService === "general" ||
    !request.services.includes(candidate.searchedService) ||
    !inspection.fetchSucceeded ||
    (!inspection.contactPageUrl &&
      inspection.phones.length === 0 &&
      inspection.emails.length === 0)
  ) {
    return false;
  }

  const searchable = lowerText(content);
  const buyerCategoryPattern =
    /\b(?:property (?:manager|management|owner|developer)|body corporate|homeowners? association|estate (?:manager|management)|facilit(?:y|ies) management|shopping cent(?:re|er)|retail (?:store|centre|center)|office park|warehouse|factory|manufactur(?:er|ing)|logistics|distribution cent(?:re|er)|school|college|university|clinic|hospital|hotel|restaurant|franchise|church|nonprofit|non-profit|ngo)\b/i;

  if (buyerCategoryPattern.test(searchable)) {
    return true;
  }

  const genericTargetWords = new Set([
    "business",
    "company",
    "companies",
    "organisation",
    "organization",
    "services",
    "service",
    "custom",
    "target",
    "industry",
  ]);
  const targets = [
    candidate.targetDescription,
    ...request.organisation_types,
    ...request.industries,
  ];

  return targets.some((target) => {
    const normalised = lowerText(target).trim();
    const words = normalised
      .split(/[^a-z0-9]+/)
      .filter(
        (word) => word.length >= 4 && !genericTargetWords.has(word),
      );

    if (words.length === 0) {
      return false;
    }

    if (words.length === 1) {
      return searchable.includes(words[0]);
    }

    return (
      searchable.includes(normalised) ||
      words.filter((word) => searchable.includes(word)).length >= 2
    );
  });
}

function parseProcurementDate(
  value: string,
): Date | null {
  const written = value.match(
    /\b(\d{1,2})[\s-](jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,/-]+(\d{2,4})\b/i,
  );

  const numeric = value.match(
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b|\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
  );

  let day: number;
  let month: number;
  let year: number;

  if (written) {
    day = Number(written[1]);
    month = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ].findIndex((item) =>
      written[2].toLowerCase().startsWith(item),
    ) + 1;
    year = Number(written[3]);
  } else if (numeric?.[1]) {
    year = Number(numeric[1]);
    month = Number(numeric[2]);
    day = Number(numeric[3]);
  } else if (numeric) {
    day = Number(numeric[4]);
    month = Number(numeric[5]);
    year = Number(numeric[6]);
  } else {
    return null;
  }

  if (year < 100) {
    year += 2000;
  }

  const parsed = new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59),
  );

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null;
}

function validateProcurement(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  content: string,
): ProcurementValidation {
  const matchedServices = matchingRequestedServices(
    request,
    content,
  );
  const deadlineMatch = content.match(
    PROCUREMENT_DEADLINE_PATTERN,
  );
  const closingDate = deadlineMatch
    ? parseProcurementDate(deadlineMatch[0])
    : null;
  const referenceMatches = [
    ...content.matchAll(
      new RegExp(
        PROCUREMENT_REFERENCE_PATTERN.source,
        "gi",
      ),
    ),
  ];
  const procurementMentions = content.match(
    /\b(?:RFQ|RFP|RFT|tender|bid|quotation)\b/gi,
  )?.length ?? 0;
  const publicBuyers = [
    "sanral", "merseta", "state theatre", "eskom", "transnet", "prasa",
  ].filter((name) =>
    lowerText(content).includes(name),
  );
  const title = `${candidate.title} ${inspection.title ?? ""}`;

  return {
    hasSelectedService:
      matchedServices.length > 0,
    matchedServices,
    hasReference:
      PROCUREMENT_REFERENCE_PATTERN.test(
        `${content} ${candidate.url}`,
      ),
    closingDate,
    isExpired:
      Boolean(closingDate && closingDate.getTime() < Date.now()),
    isAmbiguous:
      (PROCUREMENT_AGGREGATOR_PATTERN.test(title) &&
        procurementMentions > 2) ||
      referenceMatches.length > 1 ||
      (publicBuyers.length > 1 && procurementMentions > 3),
  };
}

function isRejectedDisposition(
  disposition: CandidateDisposition,
): boolean {
  return [
    "competitor",
    "directory",
    "informational",
    "irrelevant",
    "sector_mismatch",
    "service_mismatch",
    "expired_procurement",
    "ambiguous_procurement",
  ].includes(disposition);
}

function isInformationalPage(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  /*
   * Do not scan an entire organisation site for words such as "careers".
   * Normal site navigation and footers otherwise turn genuine buyer homepages
   * into false informational-page rejections.
   */
  const pageIdentity = `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${candidate.url}`;

  return (
    INFORMATIONAL_PAGE_PATTERN.test(pageIdentity) ||
    REGULATORY_OR_FORUM_PAGE_PATTERN.test(pageIdentity)
  );
}

function isRegulatoryOrForumPage(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const pageIdentity =
    `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${candidate.url}`;

  return REGULATORY_OR_FORUM_PAGE_PATTERN.test(
    pageIdentity,
  );
}

function sourceTrustScore(
  candidate: SearchCandidate,
  inspection: PageInspection,
): number {
  if (
    isGovernmentSource(
      candidate.url,
    )
  ) {
    return 95;
  }

  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      5000,
    )}`;

  if (
    isDirectorySource(
      candidate.url,
      combined,
    )
  ) {
    return 20;
  }

  if (
    isInformationalPage(candidate, inspection) &&
    !PROCUREMENT_PATTERN.test(combined)
  ) {
    return 32;
  }

  if (
    inspection.fetchSucceeded &&
    (
      inspection.contactPageUrl ||
      inspection.emails.length >
        0 ||
      inspection.phones.length >
        0
    )
  ) {
    return 82;
  }

  if (
    inspection.fetchSucceeded
  ) {
    return 68;
  }

  if (
    candidate.provider ===
    "Tavily"
  ) {
    return 58;
  }

  if (
    candidate.provider ===
    "SerpAPI"
  ) {
    return 54;
  }

  return 50;
}

function assessCandidate(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): CandidateAssessment {
  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${inspection.text.slice(
      0,
      12_000,
    )}`;

  const sourceTrust =
    sourceTrustScore(
      candidate,
      inspection,
    );

  const probableBuyerRole =
    inferBuyerRole(
      candidate.searchedService,
      combined,
    );

  const competitors =
    detectCompetitorServices(
      request,
      combined,
    );

  const sector =
    inferSectorFromSource(
      candidate,
      inspection,
    );

  if (
    !sectorAllowed(
      request,
      sector,
    )
  ) {
    return {
      disposition:
        "sector_mismatch",

      buyerFit:
        0,

      sourceTrust,

      reasons: [
        `The result belongs to the ${sector} sector, which is disabled for this hunt.`,
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  if (
    request.exclude_directories !==
      false &&
    isDirectorySource(
      candidate.url,
      combined,
    )
  ) {
    return {
      disposition:
        "directory",

      buyerFit:
        5,

      sourceTrust:
        20,

      reasons: [
        "The page appears to be a directory or aggregator rather than one buyer organisation.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  const formalProcurement =
    PROCUREMENT_PATTERN.test(
      combined,
    );

  const procurement =
    validateProcurement(
      request,
      candidate,
      inspection,
      combined,
    );

  const supplierRegistration =
    SUPPLIER_REGISTRATION_PATTERN.test(
      combined,
    );

  const partnershipSignal =
    PARTNERSHIP_PATTERN.test(
      combined,
    );

  const strongBuyerNeed =
    STRONG_BUYER_NEED_PATTERN.test(
      combined,
    );

  const expansion =
    EXPANSION_PATTERN.test(
      combined,
    );

  const sellerLanguage =
    SERVICE_OFFERING_PATTERN.test(
      combined,
    );

  const customerAcquisitionProvider =
    CUSTOMER_ACQUISITION_PROVIDER_PATTERN.test(
      combined,
    );

  const offersSameService =
    competitors.length >
    0;

  const informational =
    isInformationalPage(
      candidate,
      inspection,
    ) &&
    !formalProcurement &&
    !supplierRegistration &&
    !partnershipSignal;

  /*
   * A regulatory article or forum answer is never a customer opportunity,
   * even if its wording happens to include procurement-related terms.
   */
  if (
    isRegulatoryOrForumPage(
      candidate,
      inspection,
    )
  ) {
    return {
      disposition: "informational",
      buyerFit: 0,
      sourceTrust: Math.min(
        sourceTrust,
        35,
      ),
      reasons: [
        "The page is regulatory guidance, a FAQ or a forum discussion rather than a buyer notice.",
      ],
      probableBuyerRole: null,
      competitorForServices: competitors,
    };
  }

  /*
   * Government-only hunts are procurement hunts. A public entity's normal
   * website, news, policy and supplier-registration pages are useful context,
   * but are not a current tender a Cossa company can pursue.
   */
  if (
    request.sector === "government" &&
    !formalProcurement
  ) {
    return {
      disposition: informational
        ? "informational"
        : "irrelevant",
      buyerFit: 0,
      sourceTrust,
      reasons: [
        "Government procurement hunts accept only official current tender, bid, RFQ or RFP notices with a reference, selected-service evidence and a closing date.",
      ],
      probableBuyerRole: null,
      competitorForServices: competitors,
    };
  }

  /*
   * A result is never a tender merely because it contains "RFQ" or appeared
   * in a procurement search. It must be a single, current notice for one of
   * the selected services. This blocks unrelated advertising RFQs and tender
   * aggregation pages from being treated as construction opportunities.
   */
  if (formalProcurement) {
    if (
      request.sector === "government" &&
      !isOfficialPublicSectorSource(
        candidate.url,
      )
    ) {
      return {
        disposition: "irrelevant",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "A government procurement lead must be published on an official government or public-entity source.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    if (procurement.isAmbiguous) {
      return {
        disposition: "ambiguous_procurement",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "The page appears to aggregate multiple procurement notices or buyers rather than identifying one actionable opportunity.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    if (!procurement.hasSelectedService) {
      return {
        disposition: "service_mismatch",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "The procurement notice does not evidence a requirement for any selected service.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    if (!procurement.hasReference) {
      return {
        disposition: "irrelevant",
        buyerFit: 10,
        sourceTrust,
        reasons: [
          "The procurement page has no tender, bid or RFQ reference that can tie the service requirement to one verifiable notice.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    if (
      request.exclude_expired_procurement !== false &&
      procurement.isExpired
    ) {
      return {
        disposition: "expired_procurement",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "The procurement notice has an expired closing date and is not a current opportunity.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    if (!procurement.closingDate) {
      return {
        disposition: "irrelevant",
        buyerFit: 10,
        sourceTrust,
        reasons: [
          "The procurement notice has no verifiable closing date, so its current validity cannot be established.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    return {
      disposition:
        "active_opportunity",

      buyerFit:
        95,

      sourceTrust,

      reasons: [
        `A current procurement notice matches the selected service${procurement.matchedServices.length > 1 ? "s" : ""}: ${procurement.matchedServices.map(serviceLabel).join(", ")}.`,
      ],

      probableBuyerRole:
        "Procurement or Supply Chain Management",

      competitorForServices:
        competitors,
    };
  }

  if (
    supplierRegistration
  ) {
    if (
      procurement.matchedServices.length === 0
    ) {
      return {
        disposition: "service_mismatch",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "The supplier-registration page does not identify a category matching any selected service.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    return {
      disposition:
        "supplier_opportunity",

      buyerFit:
        85,

      sourceTrust,

      reasons: [
        "The source contains an explicit supplier-registration or vendor-database opportunity.",
      ],

      probableBuyerRole:
        "Procurement or Supply Chain Management",

      competitorForServices:
        competitors,
    };
  }

  /**
   * Partnership must be explicit. Being another construction company
   * is not enough.
   */
  if (
    partnershipSignal
  ) {
    if (
      procurement.matchedServices.length === 0
    ) {
      return {
        disposition: "service_mismatch",
        buyerFit: 0,
        sourceTrust,
        reasons: [
          "The partnership or subcontracting page does not evidence a requirement for any selected service.",
        ],
        probableBuyerRole: null,
        competitorForServices: competitors,
      };
    }

    return {
      disposition:
        "partner",

      buyerFit:
        68,

      sourceTrust,

      reasons: [
        "The source contains explicit subcontracting, supplier-panel or partnership language.",
      ],

      probableBuyerRole:
        "Operations, Contracts or Subcontracting Manager",

      competitorForServices:
        competitors,
    };
  }

  /**
   * HARD SELLER RULE.
   *
   * If the site sells the same service the selected business wants to sell,
   * reject it unless explicit procurement/partnership evidence exists.
   */
  if (
    request.exclude_competitors !==
      false &&
    offersSameService &&
    sellerLanguage
  ) {
    return {
      disposition:
        "competitor",

      buyerFit:
        5,

      sourceTrust,

      reasons: [
        "The organisation publicly sells the same selected service the selected business is trying to offer.",
        "No separate procurement, subcontracting, supplier-panel or partnership requirement was proven.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  if (
    request.exclude_competitors !== false &&
    customerAcquisitionProvider
  ) {
    return {
      disposition: "competitor",
      buyerFit: 5,
      sourceTrust,
      reasons: [
        "The organisation appears to sell lead-generation, marketing or customer-acquisition services rather than buy them.",
        "No separate procurement, subcontracting, supplier-panel or partnership requirement was proven.",
      ],
      probableBuyerRole: null,
      competitorForServices: competitors,
    };
  }

  if (
    informational
  ) {
    return {
      disposition:
        "informational",

      buyerFit:
        5,

      sourceTrust:
        Math.min(
          sourceTrust,
          35,
        ),

      reasons: [
        "The page is primarily informational or market-content material and does not prove that the organisation is buying a selected service.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  /**
   * Strong buying language can create an active opportunity.
   */
  if (
    strongBuyerNeed &&
    procurement.matchedServices.length > 0 &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit:
        88,

      sourceTrust,

      reasons: [
        "A specific public buying, appointment, works or service requirement was detected.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /**
   * Expansion signal is useful, but only when the source is not simply
   * a seller advertising its own construction/marketing services.
   */
  if (
    expansion &&
    procurement.matchedServices.length > 0 &&
    !offersSameService &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit:
        74,

      sourceTrust,

      reasons: [
        "A public expansion, new-premises or development signal was detected for a non-competing organisation.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /**
   * Digital audit missions can use objective observable weaknesses.
   */
  if (
    candidate.purpose ===
      "website_gap" &&
    procurement.matchedServices.length > 0 &&
    !offersSameService
  ) {
    const hasDigitalGap =
      WEBSITE_WEAKNESS_PATTERN.test(
        combined,
      ) ||
      BRANDING_WEAKNESS_PATTERN.test(
        combined,
      ) ||
      MARKETING_WEAKNESS_PATTERN.test(
        combined,
      );

    if (
      hasDigitalGap
    ) {
      return {
        disposition:
          "active_opportunity",

        buyerFit:
          76,

        sourceTrust,

        reasons: [
          "A specific public digital, website, branding or marketing weakness was detected.",
        ],

        probableBuyerRole,

        competitorForServices:
          competitors,
      };
    }
  }

  /**
   * With opportunity evidence disabled, return only a verified research
   * prospect: an official, contactable buyer-category site for a selected
   * service. This is deliberately never presented as an active opportunity.
   */
  if (
    candidate.purpose ===
      "buyer_discovery" &&
    hasVerifiedResearchBuyerProfile(
      request,
      candidate,
      inspection,
      combined,
    ) &&
    !offersSameService &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "buyer",

      buyerFit:
        60,

      sourceTrust,

      reasons: [
        `The official organisation site matches a buyer category for the selected ${serviceLabel(candidate.searchedService)} service.`,
        "This is a verified research prospect with a public contact route; no active buying request has been proven.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /**
   * If competitor-like language appears even without the generic seller CTA,
   * reject conservatively.
   */
  if (
    request.exclude_competitors !==
      false &&
    offersSameService
  ) {
    return {
      disposition:
        "competitor",

      buyerFit:
        8,

      sourceTrust,

      reasons: [
        "The organisation appears to operate in the same service market as the selected business.",
        "No independent buying, procurement or subcontracting requirement was verified.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  return {
    disposition:
      "irrelevant",

    buyerFit:
      15,

    sourceTrust,

    reasons: [
      "The source did not prove that this organisation is a suitable buyer, active opportunity or explicit partner.",
    ],

    probableBuyerRole,

    competitorForServices:
      competitors,
  };
}

function inferSignal(
  candidate: SearchCandidate,
  inspection: PageInspection,
  assessment: CandidateAssessment,
): ProspectSignal {
  const text =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      8000,
    )}`;

  let type:
    ProspectSignalType =
    "general_fit";

  let title =
    "Potential buyer-fit signal";

  let confidence =
    40;

  if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(request for quotation|\bRFQ\b)\b/i.test(
      text,
    )
  ) {
    type =
      "request_for_quote";

    title =
      "Request for quotation";

    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 94
        : 86;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(request for proposal|\bRFP\b)\b/i.test(
      text,
    )
  ) {
    type =
      "request_for_proposal";

    title =
      "Request for proposal";

    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 94
        : 86;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    PROCUREMENT_PATTERN.test(
      text,
    )
  ) {
    type =
      "active_tender";

    title =
      "Tender or formal procurement notice";

    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 95
        : 82;
  } else if (
    assessment.disposition ===
      "supplier_opportunity"
  ) {
    type =
      "supplier_registration";

    title =
      "Supplier-registration opportunity";

    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 92
        : 84;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(cleaning contract|cleaning services required|appointment of.*cleaning|janitorial services required)\b/i.test(
      text,
    )
  ) {
    type =
      "cleaning_need";

    title =
      "Cleaning-service requirement";

    confidence =
      82;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(website redesign required|website development tender|digital platform required|digital transformation|website upgrade required)\b/i.test(
      text,
    )
  ) {
    type =
      "technology_need";

    title =
      "Technology or website requirement";

    confidence =
      80;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(maintenance contract|repair works|minor works|refurbishment|renovation project|upgrade project|building works)\b/i.test(
      text,
    )
  ) {
    type =
      "maintenance_need";

    title =
      "Maintenance, renovation or works requirement";

    confidence =
      80;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    WEBSITE_WEAKNESS_PATTERN.test(
      text,
    )
  ) {
    type =
      "website_problem";

    title =
      "Verified website or conversion weakness";

    confidence =
      72;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    BRANDING_WEAKNESS_PATTERN.test(
      text,
    )
  ) {
    type =
      "branding_problem";

    title =
      "Verified branding weakness";

    confidence =
      70;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    MARKETING_WEAKNESS_PATTERN.test(
      text,
    )
  ) {
    type =
      "inactive_marketing";

    title =
      "Verified marketing weakness";

    confidence =
      70;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    EXPANSION_PATTERN.test(
      text,
    )
  ) {
    type =
      "business_expansion";

    title =
      "Business expansion or development";

    confidence =
      candidate.provider ===
      "NewsAPI"
        ? 78
        : 72;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    type =
      "general_fit";

    title =
      "Potential buyer-category fit";

    confidence =
      48;
  }

  return {
    type,
    title,

    explanation:
      candidate.snippet.slice(
        0,
        700,
      ),

    evidence_url:
      candidate.url,

    detected_at:
      new Date().toISOString(),

    confidence,
  };
}

function chooseService(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): LeadHunterServiceCategory {
  const text =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      8000,
    )}`;

  const matchingServices =
    matchingRequestedServices(
      request,
      text,
    );

  if (
    matchingServices.length > 0
  ) {
    return matchingServices[0];
  }

  const patterns: Array<
    [
      LeadHunterServiceCategory,
      RegExp,
    ]
  > = [
    [
      "commercial_cleaning",
      /\b(cleaning contract|cleaning services required|janitorial)\b/i,
    ],

    [
      "facility_management",
      /\bfacilit(?:y|ies) management\b/i,
    ],

    [
      "property_maintenance",
      /\b(maintenance contract|repair works|property maintenance|minor works)\b/i,
    ],

    [
      "renovation",
      /\b(renovation project|refurbishment|building upgrade)\b/i,
    ],

    [
      "painting",
      /\b(painting works|repainting project)\b/i,
    ],

    [
      "tiling",
      /\b(tiling works|floor tiling|wall tiling)\b/i,
    ],

    [
      "ceilings",
      /\b(ceiling installation|ceiling repairs?|ceiling works)\b/i,
    ],

    [
      "roofing",
      /\b(roof replacement|roof repairs?|roofing works)\b/i,
    ],

    [
      "plumbing",
      /\b(plumbing works|plumbing repairs?|plumbing contract)\b/i,
    ],

    [
      "website_design",
      /\b(website development|website redesign|web portal development|outdated website)\b/i,
    ],

    [
      "logo_design",
      /\b(logo redesign|new logo|outdated logo|missing logo)\b/i,
    ],

    [
      "branding",
      /\b(branding redesign|brand identity|inconsistent branding|weak branding)\b/i,
    ],

    [
      "digital_marketing",
      /\b(digital marketing tender|marketing services required)\b/i,
    ],

    [
      "social_media_management",
      /\b(social media management|inactive social media|social media services)\b/i,
    ],

    [
      "google_business_profile",
      /\b(google business profile|google business listing|google profile)\b/i,
    ],

    [
      "seo",
      /\b(search engine optimisation|search engine optimization|\bSEO\b)\b/i,
    ],

    [
      "ai_automation",
      /\b(automation system|artificial intelligence solution|workflow automation)\b/i,
    ],

    [
      "business_documents",
      /\b(document management|proposal system|quotation system|contract management)\b/i,
    ],

    [
      "construction",
      /\b(construction works|building works|civil works|infrastructure project)\b/i,
    ],
  ];

  for (
    const [
      service,
      pattern,
    ] of patterns
  ) {
    if (
      request.services.includes(
        service,
      ) &&
      pattern.test(
        text,
      )
    ) {
      return service;
    }
  }

  return request.services.includes(
    candidate.searchedService,
  )
    ? candidate.searchedService
    : request.services[0] ??
        "general";
}

function recommendedCompany(
  service: LeadHunterServiceCategory,
  allowed:
    LeadHunterCompany[],
): LeadHunterCompany {
  const map: Partial<
    Record<
      LeadHunterServiceCategory,
      LeadHunterCompany
    >
  > = {
    construction:
      "cossa_nexus_construction",

    renovation:
      "cossa_nexus_construction",

    property_maintenance:
      "cossa_nexus_construction",

    painting:
      "cossa_nexus_construction",

    tiling:
      "cossa_nexus_construction",

    ceilings:
      "cossa_nexus_construction",

    roofing:
      "cossa_nexus_construction",

    plumbing:
      "cossa_nexus_construction",

    facility_management:
      "cossa_facility_services",

    commercial_cleaning:
      "cossa_facility_services",

    deep_cleaning:
      "cossa_facility_services",

    hygiene:
      "cossa_facility_services",

    landscaping:
      "cossa_facility_services",

    waste_management:
      "cossa_facility_services",

    website_design:
      "cossa_tech",

    logo_design:
      "cossa_tech",

    branding:
      "cossa_tech",

    seo:
      "cossa_tech",

    crm:
      "cossa_tech",

    ai_automation:
      "cossa_tech",

    ecommerce:
      "cossa_store",

    google_business_profile:
      "cossa_tech",

    digital_marketing:
      "cossa_ai_growth",

    social_media_management:
      "cossa_ai_growth",

    lead_generation:
      "cossa_ai_growth",

    business_documents:
      "nexdocs",

    quotations:
      "nexdocs",

    proposals:
      "nexdocs",

    contracts:
      "nexdocs",

    general:
      "cossa_nexus_holdings",
  };

  const preferred =
    map[service] ??
    "cossa_nexus_holdings";

  return allowed.includes(
    preferred,
  )
    ? preferred
    : allowed[0] ??
        "cossa_nexus_holdings";
}

function inferLocation(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): {
  city: string | null;
  province: string | null;
} {
  const searchable =
    lowerText(
      `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
        0,
        6000,
      )}`,
    );

  const requestedCities = [
    ...(request.cities ?? []),
    ...request.locations,
  ];

  let city:
    string | null =
    null;

  for (
    const item of requestedCities
  ) {
    const key =
      item
        .toLowerCase()
        .replace(
          /[^a-z]/g,
          "",
        );

    if (
      KNOWN_SOUTH_AFRICAN_CITY_PROVINCES[
        key
      ] &&
      searchable.includes(
        item.toLowerCase(),
      )
    ) {
      city =
        item;

      break;
    }
  }

  if (!city) {
    for (
      const [
        key,
        province,
      ] of Object.entries(
        KNOWN_SOUTH_AFRICAN_CITY_PROVINCES,
      )
    ) {
      const readable =
        key.replace(
          /([a-z])([A-Z])/g,
          "$1 $2",
        );

      if (
        searchable.includes(
          readable.toLowerCase(),
        ) ||
        searchable.includes(
          key,
        )
      ) {
        city =
          key ===
          "capetown"
            ? "Cape Town"
            : key ===
                "portelizabeth"
              ? "Port Elizabeth"
              : key ===
                  "eastlondon"
                ? "East London"
                : key ===
                    "kemptonpark"
                  ? "Kempton Park"
                  : key ===
                      "vanderbijlpark"
                    ? "Vanderbijlpark"
                    : key.charAt(
                          0,
                        ).toUpperCase() +
                      key.slice(
                        1,
                      );

        return {
          city,
          province,
        };
      }
    }
  }

  if (city) {
    const key =
      city
        .toLowerCase()
        .replace(
          /[^a-z]/g,
          "",
        );

    const mappedProvince =
      KNOWN_SOUTH_AFRICAN_CITY_PROVINCES[
        key
      ];

    if (
      mappedProvince
    ) {
      return {
        city,
        province:
          mappedProvince,
      };
    }
  }

  const requestedProvince =
    [
      ...(request.provinces ??
        []),
      ...request.locations,
    ].find(
      (
        value,
      ) =>
        SOUTH_AFRICAN_PROVINCES.some(
          (
            province,
          ) =>
            province.toLowerCase() ===
            value.toLowerCase(),
        ) &&
        searchable.includes(
          value.toLowerCase(),
        ),
    );

  if (
    requestedProvince
  ) {
    return {
      city:
        null,

      province:
        SOUTH_AFRICAN_PROVINCES.find(
          (
            province,
          ) =>
            province.toLowerCase() ===
            requestedProvince.toLowerCase(),
        ) ?? null,
    };
  }

  /**
   * Do not infer North West merely because the page says "Pretoria North".
   * Known city mapping outranks arbitrary province words.
   */
  if (
    /\bpretoria\b/i.test(
      searchable,
    ) ||
    /\bcenturion\b/i.test(
      searchable,
    ) ||
    /\bmidrand\b/i.test(
      searchable,
    ) ||
    /\bjohannesburg\b/i.test(
      searchable,
    )
  ) {
    return {
      city:
        /\bpretoria\b/i.test(
          searchable,
        )
          ? "Pretoria"
          : /\bcenturion\b/i.test(
                searchable,
              )
            ? "Centurion"
            : /\bmidrand\b/i.test(
                  searchable,
                )
              ? "Midrand"
              : "Johannesburg",

      province:
        "Gauteng",
    };
  }

  return {
    city:
      null,

    province:
      null,
  };
}

function calculateScores(
  candidate: SearchCandidate,
  inspection: PageInspection,
  signal: ProspectSignal,
  assessment: CandidateAssessment,
): ScoreBreakdown {
  const hasPhone =
    inspection.phones.length >
    0;

  const hasEmail =
    inspection.emails.length >
    0;

  const hasContactPage =
    Boolean(
      inspection.contactPageUrl,
    );

  const rejected =
    isRejectedDisposition(
      assessment.disposition,
    );

  const fitScore =
    rejected
      ? clampScore(
          assessment.buyerFit,
        )
      : clampScore(
          assessment.buyerFit *
            0.72 +
            candidate.providerScore *
              22 +
            assessment.sourceTrust *
              0.06,
        );

  let intentBase =
    5;

  if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    intentBase =
      [
        "active_tender",
        "request_for_quote",
        "request_for_proposal",
      ].includes(
        signal.type,
      )
        ? 92
        : 76;
  } else if (
    assessment.disposition ===
      "supplier_opportunity"
  ) {
    intentBase =
      72;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    intentBase =
      32;
  } else if (
    assessment.disposition ===
      "partner"
  ) {
    intentBase =
      60;
  }

  const intentScore =
    clampScore(
      intentBase +
        signal.confidence *
          0.08,
    );

  const evidenceScore =
    clampScore(
      assessment.sourceTrust *
        0.7 +
        (
          inspection.fetchSucceeded
            ? 15
            : 0
        ) +
        (
          hasPhone ||
          hasEmail ||
          hasContactPage
            ? 10
            : 0
        ),
    );

  let timingScore =
    25;

  if (
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(
      signal.type,
    )
  ) {
    timingScore =
      92;
  } else if (
    signal.type ===
    "supplier_registration"
  ) {
    timingScore =
      72;
  } else if (
    [
      "business_expansion",
      "new_branch",
    ].includes(
      signal.type,
    )
  ) {
    timingScore =
      70;
  } else if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    timingScore =
      65;
  } else if (
    assessment.disposition ===
      "partner"
  ) {
    timingScore =
      58;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    timingScore =
      35;
  }

  const contactabilityScore =
    clampScore(
      (
        hasPhone
          ? 40
          : 0
      ) +
        (
          hasEmail
            ? 35
            : 0
        ) +
        (
          hasContactPage
            ? 20
            : 0
        ) +
        (
          assessment.probableBuyerRole
            ? 5
            : 0
        ),
    );

  let totalScore =
    clampScore(
      fitScore *
        0.28 +
        intentScore *
          0.26 +
        evidenceScore *
          0.2 +
        timingScore *
          0.14 +
        contactabilityScore *
          0.12,
    );

  if (
    assessment.disposition ===
      "buyer"
  ) {
    totalScore =
      Math.min(
        totalScore,
        74,
      );
  }

  if (
    assessment.disposition ===
      "partner"
  ) {
    totalScore =
      Math.min(
        totalScore,
        72,
      );
  }

  if (rejected) {
    totalScore =
      Math.min(
        totalScore,
        25,
      );
  }

  return {
    fitScore,
    intentScore,
    evidenceScore,
    timingScore,
    contactabilityScore,
    totalScore,
  };
}

function classifyProspect(
  assessment: CandidateAssessment,
  signal: ProspectSignal,
  score: number,
): ProspectClassification {
  if (
    isRejectedDisposition(
      assessment.disposition,
    )
  ) {
    return "rejected";
  }

  if (
    assessment.disposition ===
      "partner"
  ) {
    return "partnership";
  }

  if (
    assessment.disposition ===
      "buyer"
  ) {
    return "prospect";
  }

  if (
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(
      signal.type,
    )
  ) {
    return "tender";
  }

  if (
    signal.type ===
      "supplier_registration"
  ) {
    return "supplier_opportunity";
  }

  if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    return "active_opportunity";
  }

  return score >=
    62
    ? "qualified_prospect"
    : "prospect";
}

function inferOpportunitySize(
  signal: ProspectSignal,
  sector:
    | "private"
    | "government"
    | "nonprofit",
  text: string,
): OpportunitySize {
  if (
    /\b(framework agreement|framework contract|multi-year|national|province-wide|major works|large-scale|multi-site)\b/i.test(
      text,
    )
  ) {
    return "strategic";
  }

  if (
    sector ===
      "government" &&
    [
      "active_tender",
      "request_for_proposal",
    ].includes(
      signal.type,
    )
  ) {
    return "large";
  }

  if (
    /\b(minor works|small works|quotation|rfq|repair|once-off)\b/i.test(
      text,
    )
  ) {
    return "small";
  }

  return "unknown";
}

function evidenceTypeForCandidate(
  candidate: SearchCandidate,
  signal: ProspectSignal,
): EvidenceType {
  if (
    isGovernmentSource(
      candidate.url,
    )
  ) {
    return [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(
      signal.type,
    )
      ? "tender_notice"
      : "government_portal";
  }

  if (
    candidate.provider ===
      "NewsAPI"
  ) {
    return "news_report";
  }

  if (
    candidate.purpose ===
      "website_gap"
  ) {
    return "website_audit";
  }

  if (
    /contact/i.test(
      candidate.url,
    )
  ) {
    return "contact_page";
  }

  return "official_website";
}

function inferOrganisationName(
  candidate: SearchCandidate,
  inspection: PageInspection,
): string {
  const source =
    inspection.title ||
    candidate.title ||
    getHostname(
      candidate.url,
    );

  const cleaned =
    cleanText(
      source
        .replace(
          /\s+[|–—]\s+.*$/,
          "",
        )
        .replace(
          /\b(home|contact us|about us|tenders?|rfq|rfp|official website)\b/gi,
          " ",
        ),
    );

  return (
    cleaned ||
    getHostname(
      candidate.url,
    )
  );
}

function createProspect(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): LeadHunterProspect {
  const assessment =
    assessCandidate(
      request,
      candidate,
      inspection,
    );

  const signal =
    inferSignal(
      candidate,
      inspection,
      assessment,
    );

  const service =
    chooseService(
      request,
      candidate,
      inspection,
    );

  const scores =
    calculateScores(
      candidate,
      inspection,
      signal,
      assessment,
    );

  const sector =
    inferSectorFromSource(
      candidate,
      inspection,
    );

  const organisationName =
    inferOrganisationName(
      candidate,
      inspection,
    );

  const location =
    inferLocation(
      request,
      candidate,
      inspection,
    );

  const rejected =
    isRejectedDisposition(
      assessment.disposition,
    );

  const hasContact =
    Boolean(
      inspection.phones.length ||
      inspection.emails.length,
    );

  const evidence:
    ProspectEvidence[] = [
    {
      type:
        evidenceTypeForCandidate(
          candidate,
          signal,
        ),

      title:
        candidate.title,

      url:
        candidate.url,

      publisher:
        getHostname(
          candidate.url,
        ) || null,

      published_at:
        candidate.publishedAt,

      checked_at:
        inspection.inspectedAt,

      excerpt:
        candidate.snippet.slice(
          0,
          900,
        ),

      supports: [
        "organisation discovery",
        assessment.disposition,
        signal.type,
        candidate.provider,
      ],
    },
  ];

  if (
    inspection.contactPageUrl &&
    inspection.contactPageUrl !==
      candidate.url
  ) {
    evidence.push({
      type:
        "contact_page",

      title:
        `${organisationName} public contact page`,

      url:
        inspection.contactPageUrl,

      publisher:
        getHostname(
          inspection.contactPageUrl,
        ) || null,

      published_at:
        null,

      checked_at:
        inspection.inspectedAt,

      excerpt:
        "Public contact route discovered on the organisation website.",

      supports: [
        "public contact route",
      ],
    });
  }

  const classification =
    classifyProspect(
      assessment,
      signal,
      scores.totalScore,
    );

  const verificationStatus =
    rejected
      ? "rejected"
      : (
          evidence.length >=
            2 &&
          hasContact &&
          scores.evidenceScore >=
            70
        )
        ? "verified"
        : "partially_verified";

  const opportunitySize =
    inferOpportunitySize(
      signal,
      sector,
      `${candidate.title} ${candidate.snippet}`,
    );

  const activeOpportunity =
    assessment.disposition ===
      "active_opportunity";

  const decisionMakerRoute =
    sector ===
      "government"
      ? "Use the official procurement or Supply Chain Management contact in the bid documentation. Confirm the tender number, closing date, submission method and eligibility before acting."
      : assessment.disposition ===
          "partner"
        ? "Use the verified public business contact and request the person responsible for subcontractors, suppliers, contracts or operations."
        : assessment.probableBuyerRole
          ? `Request the ${assessment.probableBuyerRole} through the organisation’s verified public contact channel.`
          : hasContact
            ? "Use the verified public business contact and request the person responsible for procurement, facilities, operations, property, marketing or technology."
            : "A public decision-maker route still requires verification.";

  const serviceFitReason =
    activeOpportunity
      ? `${organisationName} has a specific public signal that may indicate a current requirement for ${serviceLabel(
          service,
        )}. Open and verify the evidence before outreach or bidding.`
      : assessment.disposition ===
          "buyer"
        ? `${organisationName} is a verified research prospect in a buyer category that commonly purchases ${serviceLabel(
            service,
          )}. No active buying request has been proven, so keep it low priority until a specific need is researched.`
        : assessment.disposition ===
            "partner"
          ? `${organisationName} has explicit public subcontracting, supplier-panel or partnership evidence relevant to ${serviceLabel(
              service,
            )}.`
          : assessment.reasons.join(
              " ",
            );

  const nextAction =
    rejected
      ? `Do not save this result as a customer lead. Reason: ${assessment.reasons.join(
          " ",
        )}`
      : sector ===
          "government"
        ? "Open the official notice. Confirm it is active and relevant, then record the tender/RFQ number, closing date, briefing requirements, CIDB grading where applicable, CSD requirements, submission method and bid/no-bid decision."
        : assessment.disposition ===
            "partner"
          ? "Open the evidence source and verify the subcontractor, supplier-panel or partnership requirement. Confirm eligibility before preparing any approach."
          : activeOpportunity
            ? `Open the evidence source and verify the requirement. Then contact the ${assessment.probableBuyerRole ?? "relevant decision-maker"} using a personalised, evidence-based approach after human approval.`
            : `Verify the organisation and public contact route. Research one specific pain point before preparing outreach to the ${assessment.probableBuyerRole ?? "relevant decision-maker"}.`;

  const outreachAngle =
    rejected ||
    sector ===
      "government"
      ? null
      : assessment.disposition ===
          "partner"
        ? "Reference the verified subcontracting, supplier-panel or partnership route and explain the specific selected-business capability relevant to it."
        : activeOpportunity
          ? "Reference only the specific public requirement, development or verified weakness. Offer a short discovery call, site assessment or relevant review without claiming that the organisation requested contact from Cossa."
          : "Introduce the selected business briefly, explain one relevant business outcome for organisations of this type, and offer a low-friction next step such as a site assessment, website review or short needs discussion.";

  return {
    id:
      crypto.randomUUID(),

    organisation_name:
      organisationName,

    trading_name:
      null,

    sector,

    industry:
      request.industries[0] ??
      null,

    organisation_type:
      request.organisation_types[0] ??
      candidate.targetDescription ??
      null,

    website:
      inspection.finalUrl ||
      candidate.url,

    public_phone:
      rejected
        ? null
        : inspection.phones[0] ??
          null,

    public_email:
      rejected
        ? null
        : inspection.emails[0] ??
          null,

    identity_keys:
      rejected
        ? []
        : [
            ...new Set([
              ...inspection.phones
                .map(normalisePhoneKey)
                .filter(
                  (value): value is string =>
                    Boolean(value),
                )
                .map(
                  (value) =>
                    `phone:${value}`,
                ),
              ...inspection.emails
                .map(normaliseEmailKey)
                .filter(
                  (value): value is string =>
                    Boolean(value),
                )
                .map(
                  (value) =>
                    `email:${value}`,
                ),
            ]),
          ],

    contact_page_url:
      rejected
        ? null
        : inspection.contactPageUrl,

    contact_name:
      null,

    contact_title:
      assessment.probableBuyerRole,

    decision_maker_route:
      decisionMakerRoute,

    address:
      null,

    suburb:
      null,

    city:
      location.city,

    province:
      location.province,

    country:
      "South Africa",

    recommended_company:
      recommendedCompany(
        service,
        request.companies,
      ),

    recommended_service:
      service,

    service_fit_reason:
      serviceFitReason,

    opportunity_summary:
      rejected
        ? assessment.reasons.join(
            " ",
          )
        : signal.explanation,

    opportunity_size:
      opportunitySize,

    estimated_value:
      null,

    classification,

    verification_status:
      verificationStatus,

    fit_score:
      scores.fitScore,

    intent_score:
      scores.intentScore,

    evidence_score:
      scores.evidenceScore,

    timing_score:
      scores.timingScore,

    contactability_score:
      scores.contactabilityScore,

    total_score:
      scores.totalScore,

    signals: [
      signal,
    ],

    evidence,

    primary_source_url:
      candidate.url,

    date_verified:
      inspection.inspectedAt,

    next_action:
      nextAction,

    outreach_angle:
      outreachAngle,

    duplicate_status:
      "not_checked",

    duplicate_lead_id:
      null,

    rejection_reasons:
      rejected
        ? assessment.reasons
        : [],

    raw_provider_name:
      candidate.provider,

    raw_provider_result_id:
      null,
  };
}

function prospectIdentityKeys(
  prospect: LeadHunterProspect,
): string[] {
  const keys:
    string[] = [];

  const phone =
    normalisePhoneKey(
      prospect.public_phone,
    );

  const email =
    normaliseEmailKey(
      prospect.public_email,
    );

  const hostname =
    prospect.website
      ? getHostname(
          prospect.website,
        )
      : "";

  const organisation =
    normaliseOrganisationKey(
      prospect.organisation_name,
    );

  /**
   * Phone and email are stronger entity identifiers than domain.
   * This stops SEO satellite sites with the same contact data being
   * returned as ten different organisations.
   */
  if (phone) {
    keys.push(
      `phone:${phone}`,
    );
  }

  if (email) {
    keys.push(
      `email:${email}`,
    );
  }

  for (
    const identityKey of
    prospect.identity_keys ?? []
  ) {
    if (
      /^(phone|email):.+$/i.test(
        identityKey,
      )
    ) {
      keys.push(
        identityKey.toLowerCase(),
      );
    }
  }

  if (hostname) {
    keys.push(
      `domain:${hostname}`,
    );
  }

  if (
    organisation
  ) {
    keys.push(
      `organisation:${organisation}`,
    );
  }

  return keys;
}

function commercialRank(
  prospect: LeadHunterProspect,
): number {
  const active =
    [
      "active_opportunity",
      "tender",
      "supplier_opportunity",
    ].includes(
      prospect.classification,
    )
      ? 25
      : prospect.classification ===
          "partnership"
        ? 10
        : 0;

  return (
    prospect.total_score +
    active +
    (
      prospect.verification_status ===
      "verified"
        ? 8
        : 0
    ) +
    (
      prospect.public_phone
        ? 3
        : 0
    ) +
    (
      prospect.public_email
        ? 3
        : 0
    )
  );
}

function filterProspects(
  prospects: LeadHunterProspect[],
  request: LeadHunterSearchRequest,
): {
  prospects: LeadHunterProspect[];
  duplicateEntityCount: number;
} {
  const accepted:
    LeadHunterProspect[] = [];

  for (
    const prospect of prospects
  ) {
    if (
      prospect.verification_status ===
        "rejected" ||
      prospect.classification ===
        "rejected"
    ) {
      continue;
    }

    if (
      !sectorAllowed(
        request,
        prospect.sector,
      )
    ) {
      continue;
    }

    if (
      request.require_public_phone_or_email &&
      !prospect.public_phone &&
      !prospect.public_email
    ) {
      continue;
    }

    if (
      request.require_website &&
      !prospect.website
    ) {
      continue;
    }

    if (
      request.require_opportunity_signal &&
      prospect.signals.every(
        (
          signal,
        ) =>
          signal.type ===
          "general_fit",
      )
    ) {
      continue;
    }

    if (
      prospect.total_score <
      request.minimum_score
    ) {
      continue;
    }

    if (
      prospect.evidence.length <
      request.minimum_evidence_sources
    ) {
      continue;
    }

    if (
      request.verified_sources_only &&
      prospect.evidence_score <
        55
    ) {
      continue;
    }

    accepted.push(
      prospect,
    );
  }

  accepted.sort(
    (
      first,
      second,
    ) =>
      commercialRank(
        second,
      ) -
      commercialRank(
        first,
      ),
  );

  const selected:
    LeadHunterProspect[] = [];

  const occupiedKeys =
    new Set<string>();

  let duplicateEntityCount =
    0;

  for (
    const prospect of accepted
  ) {
    const keys =
      prospectIdentityKeys(
        prospect,
      );

    const duplicatesExisting =
      keys.some(
        (
          key,
        ) =>
          occupiedKeys.has(
            key,
          ),
      );

    if (
      duplicatesExisting
    ) {
      duplicateEntityCount +=
        1;

      continue;
    }

    selected.push(
      prospect,
    );

    for (
      const key of keys
    ) {
      occupiedKeys.add(
        key,
      );
    }

    if (
      selected.length >=
      request.result_count
    ) {
      break;
    }
  }

  return {
    prospects:
      selected,

    duplicateEntityCount,
  };
}

function countRejectedByReason(
  prospects: LeadHunterProspect[],
  phrase: string,
): number {
  const lowered =
    phrase.toLowerCase();

  return prospects.filter(
    (
      prospect,
    ) =>
      prospect.rejection_reasons.some(
        (
          reason,
        ) =>
          reason
            .toLowerCase()
            .includes(
              lowered,
            ),
      ),
  ).length;
}

export const Route =
  createFileRoute(
    "/api/lead-hunter/search",
  )({
    server: {
      handlers: {
        POST: async ({
          request,
        }) => {
          const environment =
            getEnvironment();

          if (
            !environment
          ) {
            return new Response(
              "Lead Hunter is not configured. Add Supabase variables and at least one search provider key: TAVILY_API_KEY, SERPAPI_API_KEY or NEWS_API_KEY.",
              {
                status:
                  503,
              },
            );
          }

          const token =
            getBearerToken(
              request,
            );

          if (!token) {
            return new Response(
              "Unauthorized",
              {
                status:
                  401,
              },
            );
          }

          const user =
            await verifySupabaseUser(
              token,
              environment,
            );

          if (!user) {
            return new Response(
              "Your session could not be verified. Sign out and sign in again.",
              {
                status:
                  401,
              },
            );
          }

          const authorised =
            await verifyOrganisationMembership(
              token,
              user.id,
              environment,
            );

          if (
            !authorised
          ) {
            return new Response(
              "You are not authorised to use the Cossa Lead Hunter.",
              {
                status:
                  403,
              },
            );
          }

          const limit =
            enforceRateLimit(
              user.id,
            );

          if (
            !limit.allowed
          ) {
            return new Response(
              `Lead Hunter rate limit reached. Try again in ${limit.retryAfterSeconds} seconds.`,
              {
                status:
                  429,

                headers: {
                  "Retry-After":
                    String(
                      limit.retryAfterSeconds,
                    ),
                },
              },
            );
          }

          let rawPayload:
            unknown;

          try {
            rawPayload =
              await request.json();
          } catch {
            return new Response(
              "Invalid JSON body.",
              {
                status:
                  400,
              },
            );
          }

          const validation =
            validateRequest(
              rawPayload,
            );

          if (
            !validation.valid
          ) {
            return new Response(
              validation.error,
              {
                status:
                  400,
              },
            );
          }

          const searchRequest =
            validation.request;

          const plans =
            createSearchQueries(
              searchRequest,
            );

          if (
            plans.length ===
            0
          ) {
            return new Response(
              "No valid search plans could be generated from this hunt.",
              {
                status:
                  400,
              },
            );
          }

          const searchedAt =
            new Date().toISOString();

          const warnings:
            string[] = [];

          const candidates:
            SearchCandidate[] = [];

          const successfulProviders =
            new Set<SearchProvider>();

          const executions =
            await Promise.all(
              plans.map(
                (
                  plan,
                ) =>
                  executePlan(
                    plan,
                    environment,
                  ),
              ),
            );

          for (
            const group of executions
          ) {
            for (
              const result of group
            ) {
              if (
                result.warning
              ) {
                warnings.push(
                  result.warning,
                );
              }

              if (
                result.candidates.length >
                0
              ) {
                successfulProviders.add(
                  result.provider,
                );

                candidates.push(
                  ...result.candidates,
                );
              }
            }
          }

          const uniqueCandidates =
            deduplicateCandidates(
              candidates,
            ).slice(
              0,
              MAX_SOURCE_PAGES_TO_INSPECT,
            );

          if (
            uniqueCandidates.length ===
            0
          ) {
            const empty:
              LeadHunterSearchResponse =
              {
                hunt_id:
                  crypto.randomUUID(),

                status:
                  "completed",

                searched_at:
                  searchedAt,

                completed_at:
                  new Date().toISOString(),

                request:
                  searchRequest,

                prospects:
                  [],

                source_count:
                  0,

                accepted_count:
                  0,

                rejected_count:
                  0,

                warnings: [
                  ...warnings.slice(
                    0,
                    10,
                  ),

                  "No public search results matched this hunt. Broaden the location, buyer type, service or minimum-score filters.",
                ],

                providers_used: [
                  ...successfulProviders,

                  "Cossa buyer-intelligence qualification",
                ],
              };

            return Response.json(
              empty,
              {
                headers: {
                  "Cache-Control":
                    "no-store",
                },
              },
            );
          }

          const inspections =
            await Promise.all(
              uniqueCandidates.map(
                (
                  candidate,
                ) =>
                  inspectSourcePage(
                    candidate.url,
                  ),
              ),
            );

          const rawProspects =
            uniqueCandidates.map(
              (
                candidate,
                index,
              ) =>
                createProspect(
                  searchRequest,
                  candidate,
                  inspections[
                    index
                  ],
                ),
            );

          const filtered =
            filterProspects(
              rawProspects,
              searchRequest,
            );

          const acceptedProspects =
            filtered.prospects;

          const rejectedCompetitors =
            countRejectedByReason(
              rawProspects,
              "same selected service",
            ) +
            countRejectedByReason(
              rawProspects,
              "same service market",
            );

          const rejectedDirectories =
            countRejectedByReason(
              rawProspects,
              "directory or aggregator",
            );

          const rejectedInformational =
            countRejectedByReason(
              rawProspects,
              "informational",
            );

          const rejectedSectorMismatch =
            countRejectedByReason(
              rawProspects,
              "sector, which is disabled",
            );

          const rejectedUnsupported =
            countRejectedByReason(
              rawProspects,
              "did not prove",
            );

          const rejectedTotal =
            rawProspects.length -
            acceptedProspects.length;

          const qualityNotice =
            [
              `Quality control rejected ${rejectedCompetitors} apparent competitors`,
              `${rejectedDirectories} directories or aggregators`,
              `${rejectedInformational} informational pages`,
              `${rejectedSectorMismatch} sector-mismatched results`,
              `${filtered.duplicateEntityCount} duplicate or related organisation records`,
              `${rejectedUnsupported} unsupported results`,
            ].join(
              ", ",
            ) + ".";

          const responsePayload:
            LeadHunterSearchResponse =
            {
              hunt_id:
                crypto.randomUUID(),

              status:
                "completed",

              searched_at:
                searchedAt,

              completed_at:
                new Date().toISOString(),

              request:
                searchRequest,

              prospects:
                acceptedProspects,

              source_count:
                uniqueCandidates.length,

              accepted_count:
                acceptedProspects.length,

              rejected_count:
                rejectedTotal,

              warnings: [
                ...warnings.slice(
                  0,
                  10,
                ),

                qualityNotice,

                `Search query budget: ${plans.length}/${searchRequest.max_search_queries ?? plans.length} queries used.`,

                ...(acceptedProspects.length ===
                0
                  ? [
                      "Search results were found, but none met the buyer-fit, evidence, sector, contactability and score requirements. This is preferable to returning misleading leads.",
                    ]
                  : []),

                "A qualified prospect is not automatically an active buyer. Active opportunities require specific supported procurement, service-need, verified digital-gap or expansion evidence.",

                "Companies that sell the same selected service are rejected unless a separate procurement, subcontracting, supplier-panel or partnership route is explicitly evidenced.",

                "Public contact details must be used only for lawful, relevant and respectful business outreach.",

                "Human verification is required before outreach, quotation preparation, tender submission or commitment.",
              ],

              providers_used: [
                ...successfulProviders,

                "Cossa buyer-intelligence qualification",

                ...(searchRequest.include_government_sector
                  ? [
                      "Official South African government and eTender sources discovered through search",
                    ]
                  : []),
              ],
            };

          return Response.json(
            responsePayload,
            {
              headers: {
                "Cache-Control":
                  "no-store",
              },
            },
          );
        },
      },
    },
  });
