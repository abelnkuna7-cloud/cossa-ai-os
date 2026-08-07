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
  | "sector_mismatch";

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
            candidate.services,
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
            candidate.companies,
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
    candidate.sector ??
    "mixed";

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
    candidate.search_depth ??
    "economy";

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
        maxSearchQueries,

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
        candidate.exclude_competitors !==
        false,

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
    request.include_private_sector ===
      true;

  const shouldGovernment =
    request.include_government_sector ===
      true;

  const shouldNonprofit =
    request.include_nonprofits ===
      true;

  if (mission) {
    const missionPurpose:
      SearchPurpose =
      shouldGovernment &&
      (
        request.sector ===
          "government" ||
        PROCUREMENT_PATTERN.test(
          mission,
        ) ||
        /\b(tender|rfq|rfp|bid|procurement)\b/i.test(
          mission,
        )
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
            ...new Set([
              ...requestedTargets,
              ...defaults,
            ]),
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
          `"${target1}" "${location}" official website contact${extra}`,

        purpose:
          "buyer_discovery",

        targetDescription:
          target1,

        service,
      });

      plans.push({
        query:
          `"${target2}" "${location}" official organisation contact${extra}`,

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
  const jobs: Array<
    Promise<{
      provider: SearchProvider;
      candidates: SearchCandidate[];
      warning?: string;
    }>
  > = [];

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

  if (
    environment.tavilyApiKey
  ) {
    jobs.push(
      wrap(
        "Tavily",
        tavilySearch(
          plan,
          environment.tavilyApiKey,
        ),
      ),
    );
  }

  if (
    environment.serpApiKey
  ) {
    jobs.push(
      wrap(
        "SerpAPI",
        serpApiSearch(
          plan,
          environment.serpApiKey,
        ),
      ),
    );
  }

  if (
    environment.newsApiKey
  ) {
    jobs.push(
      wrap(
        "NewsAPI",
        newsApiSearch(
          plan,
          environment.newsApiKey,
        ),
      ),
    );
  }

  return Promise.all(
    jobs,
  );
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
        extractEmails(
          text,
        ),

      phones:
        extractPhones(
          text,
        ),

      contactPageUrl:
        findContactPageUrl(
          html,
          finalUrl,
        ),

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
): "private" | "government" | "nonprofit" {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${candidate.url}`;

  if (
    isGovernmentSource(
      candidate.url,
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
  sector:
    | "private"
    | "government"
    | "nonprofit",
): boolean {
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
    INFORMATIONAL_PAGE_PATTERN.test(
      combined,
    ) &&
    !PROCUREMENT_PATTERN.test(
      combined,
    )
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

  const offersSameService =
    competitors.length >
    0;

  const informational =
    INFORMATIONAL_PAGE_PATTERN.test(
      combined,
    ) &&
    !formalProcurement &&
    !supplierRegistration &&
    !partnershipSignal;

  /**
   * Formal procurement wins because a supplier can also buy
   * subcontracting/services. But it must be actual procurement evidence.
   */
  if (
    formalProcurement &&
    (
      isGovernmentSource(
        candidate.url,
      ) ||
      candidate.purpose ===
        "active_procurement"
    )
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit:
        95,

      sourceTrust,

      reasons: [
        "The source contains formal procurement language tied to this organisation or procurement source.",
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
   * If the site sells the same service Cossa wants to sell,
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
        "The organisation publicly sells the same selected service Cossa is trying to offer.",
        "No separate procurement, subcontracting, supplier-panel or partnership requirement was proven.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
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
        "The page is primarily informational or market-content material and does not prove that the organisation is buying a Cossa service.",
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

  const target =
    candidate.targetDescription.toLowerCase();

  const targetWords =
    target
      .split(
        /\s+/,
      )
      .filter(
        (
          value,
        ) =>
          value.length >=
          5,
      );

  const combinedLower =
    lowerText(
      combined,
    );

  const targetMatch =
    combinedLower.includes(
      target,
    ) ||
    targetWords.some(
      (
        value,
      ) =>
        combinedLower.includes(
          value,
        ),
    );

  /**
   * Digital audit missions can use objective observable weaknesses.
   */
  if (
    candidate.purpose ===
      "website_gap" &&
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
   * A normal buyer-category match remains a prospect, not an
   * invented active opportunity.
   */
  if (
    candidate.purpose ===
      "buyer_discovery" &&
    targetMatch &&
    !offersSameService &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "buyer",

      buyerFit:
        65,

      sourceTrust,

      reasons: [
        `The organisation matches the selected buyer category: ${candidate.targetDescription}.`,
        "No active buying request was proven. Treat this as a prospecting lead rather than a confirmed opportunity.",
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
        "The organisation appears to operate in the same service market as Cossa.",
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
      "cossa_tech",

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
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
      "sector_mismatch",
    ].includes(
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
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
      "sector_mismatch",
    ].includes(
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
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
      "sector_mismatch",
    ].includes(
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
        ? `${organisationName} matches a buyer category that commonly purchases ${serviceLabel(
            service,
          )}. No active buying request has been proven, so treat this as a prospect rather than a confirmed opportunity.`
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
        ? "Reference the verified subcontracting, supplier-panel or partnership route and explain the specific Cossa capability relevant to it."
        : activeOpportunity
          ? "Reference only the specific public requirement, development or verified weakness. Offer a short discovery call, site assessment or relevant review without claiming that the organisation requested contact from Cossa."
          : "Introduce Cossa briefly, explain one relevant business outcome for organisations of this type, and offer a low-friction next step such as a site assessment, website review or short needs discussion.";

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

                "Companies that sell the same selected Cossa service are rejected unless a separate procurement, subcontracting, supplier-panel or partnership route is explicitly evidenced.",

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
