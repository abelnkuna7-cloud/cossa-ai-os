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
const ABSOLUTE_MAX_SEARCH_QUERIES = 10;
const MAX_RESULTS_PER_QUERY = 10;
const MAX_SOURCE_PAGES_TO_INSPECT = 40;
const MAX_SOURCE_CONTENT_LENGTH = 30_000;

const SEARCH_TIMEOUT_MS = 32_000;
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
  /\b(career guide|careers?|qualification|registered qualifications?|learnership|course|training programme|recommended subjects|blog|useful information|industry overview|what is|how to become|downloads?|resources?|annual report)\b/i;

const PROCUREMENT_PATTERN =
  /\b(request for quotation|request for proposal|invitation to bid|invitation to tender|request for bid|request for tender|\bRFQ\b|\bRFP\b|\bRFB\b|\bRFT\b|tender number|bid number|closing date|compulsory briefing|non-compulsory briefing|submission deadline|procurement notice)\b/i;

const SUPPLIER_REGISTRATION_PATTERN =
  /\b(supplier registration|supplier database|vendor registration|register as a supplier|supplier invitation|expression of interest|call for suppliers)\b/i;

const EXPANSION_PATTERN =
  /\b(new branch|opening soon|new development|expansion|new premises|new office|new warehouse|new facility|relocation|property development|construction underway|development approved|capital project|infrastructure programme)\b/i;

const BUYER_NEED_PATTERN =
  /\b(seeking|requires?|required|appoint(?:ment|ing)?|looking for|invites?|procure(?:ment|ing)?|requesting|contract for|service provider for|maintenance contract|cleaning contract|upgrade project|renovation project|refurbishment project|building works|minor works|repair works|panel of service providers|framework agreement)\b/i;

const SERVICE_OFFERING_PATTERN =
  /\b(we offer|we provide|our services|call us today|get a free quote|request a free quote|professional services|specialists in|experts in|affordable services|same day service|book our service)\b/i;

const PUBLIC_BUYER_ROLE_PATTERN =
  /\b(procurement manager|supply chain manager|facilities manager|facility manager|property manager|estate manager|operations manager|school principal|administrator|marketing manager|it manager|project manager|business owner|managing director|bid manager|contracts manager|sales director|finance manager)\b/i;

const NONPROFIT_PATTERN =
  /\b(church|ministry|nonprofit|non-profit|ngo|charity|foundation|community centre|community center)\b/i;

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
  | "irrelevant";

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
  return (
    cleanText(value)
      ?.toLowerCase() ?? ""
  );
}

function clampScore(
  value: unknown,
): number {
  const parsed =
    Number(value);

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
  const parsed =
    Number(value);

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

function cleanStringArray(
  input: unknown,
  maximumItems: number,
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return [
    ...new Set(
      input
        .map(cleanText)
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ),
  ].slice(
    0,
    maximumItems,
  );
}

function safeBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function getEnvironment():
  Environment | null {
  const tavilyApiKey =
    cleanText(
      process.env
        .TAVILY_API_KEY,
    );

  const serpApiKey =
    cleanText(
      process.env
        .SERPAPI_API_KEY,
    ) ||
    cleanText(
      process.env
        .SERP_API_KEY,
    ) ||
    cleanText(
      process.env
        .SERPAPI_KEY,
    );

  const newsApiKey =
    cleanText(
      process.env
        .NEWS_API_KEY,
    ) ||
    cleanText(
      process.env
        .NEWSAPI_KEY,
    );

  const supabaseUrl =
    cleanText(
      process.env
        .VITE_SUPABASE_URL,
    ) ||
    cleanText(
      process.env
        .SUPABASE_URL,
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
      `${environment.supabaseUrl}/rest/v1/organisation_members?${query.toString()}`,
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
        .catch(() => ""),
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
    typeof value !==
      "object" ||
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
    cleanStringArray(
      candidate.locations,
      25,
    );

  const countries =
    cleanStringArray(
      candidate.countries,
      15,
    );

  const provinces =
    cleanStringArray(
      candidate.provinces,
      12,
    );

  const cities =
    cleanStringArray(
      candidate.cities,
      25,
    );

  const suburbs =
    cleanStringArray(
      candidate.suburbs,
      30,
    );

  const resultCount =
    Number(
      candidate.result_count ??
        15,
    );

  const rawMaxQueries =
    Number(
      candidate.max_search_queries ??
        3,
    );

  const maxSearchQueries =
    Number.isFinite(
      rawMaxQueries,
    )
      ? Math.max(
          1,
          Math.min(
            ABSOLUTE_MAX_SEARCH_QUERIES,
            Math.round(
              rawMaxQueries,
            ),
          ),
        )
      : 3;

  const includePrivate =
    candidate.sector ===
    "private"
      ? true
      : candidate.sector ===
          "government"
        ? false
        : candidate.sector ===
            "nonprofit"
          ? false
          : safeBoolean(
              candidate.include_private_sector,
              true,
            );

  const includeGovernment =
    candidate.sector ===
    "government"
      ? true
      : candidate.sector ===
          "private"
        ? false
        : candidate.sector ===
            "nonprofit"
          ? false
          : safeBoolean(
              candidate.include_government_sector,
              false,
            );

  const includeNonprofits =
    candidate.sector ===
    "nonprofit"
      ? true
      : candidate.sector ===
          "private" ||
        candidate.sector ===
          "government"
        ? false
        : safeBoolean(
            candidate.include_nonprofits,
            false,
          );

  return {
    valid: true,

    request: {
      sector:
        candidate.sector ??
        "mixed",

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
            : ["Gauteng"],

      industries:
        cleanStringArray(
          candidate.industries,
          20,
        ),

      organisation_types:
        cleanStringArray(
          candidate.organisation_types,
          20,
        ),

      result_count:
        Number.isFinite(
          resultCount,
        )
          ? Math.min(
              MAX_REQUEST_RESULTS,
              Math.max(
                1,
                Math.round(
                  resultCount,
                ),
              ),
            )
          : 15,

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
        includePrivate,

      include_government_sector:
        includeGovernment,

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
        cleanStringArray(
          candidate.tender_keywords,
          25,
        ),

      prospect_keywords:
        cleanStringArray(
          candidate.prospect_keywords,
          35,
        ),

      verified_sources_only:
        candidate.verified_sources_only !==
        false,

      exclude_existing_crm_leads:
        candidate.exclude_existing_crm_leads !==
        false,

      notes:
        cleanText(
          candidate.notes,
        ),

      search_instruction:
        cleanText(
          candidate.search_instruction,
        ),

      search_scope:
        candidate.search_scope ??
        "south_africa",

      delivery_model:
        candidate.delivery_model ??
        "auto",

      search_depth:
        candidate.search_depth ??
        "economy",

      revenue_mode:
        candidate.revenue_mode ??
        "quick_revenue",

      objectives:
        Array.isArray(
          candidate.objectives,
        )
          ? [
              ...new Set(
                candidate.objectives,
              ),
            ]
          : [],

      countries:
        countries.length > 0
          ? countries
          : [
              "South Africa",
            ],

      provinces,
      cities,
      suburbs,

      radius_km:
        candidate.radius_km ===
          null ||
        candidate.radius_km ===
          undefined
          ? null
          : Math.max(
              1,
              Math.min(
                500,
                Math.round(
                  Number(
                    candidate.radius_km,
                  ),
                ),
              ),
            ),

      search_everything:
        safeBoolean(
          candidate.search_everything,
          false,
        ),

      easy_wins_only:
        safeBoolean(
          candidate.easy_wins_only,
          true,
        ),

      revenue_first:
        safeBoolean(
          candidate.revenue_first,
          true,
        ),

      max_search_queries:
        maxSearchQueries,

      use_cached_results:
        safeBoolean(
          candidate.use_cached_results,
          true,
        ),

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
        safeBoolean(
          candidate.exclude_competitors,
          true,
        ),

      exclude_directories:
        safeBoolean(
          candidate.exclude_directories,
          true,
        ),

      exclude_expired_procurement:
        safeBoolean(
          candidate.exclude_expired_procurement,
          true,
        ),
    },
  };
}

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
    "Google Business Profile management",

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

function serviceLabel(
  service: LeadHunterServiceCategory,
): string {
  return SERVICE_LABELS[
    service
  ];
}

const SERVICE_RELEVANCE_PATTERNS:
  Partial<
    Record<
      LeadHunterServiceCategory,
      RegExp
    >
  > = {
    construction:
      /\b(construction works?|building works?|building project|civil works?|general building|contractor for construction|infrastructure works?)\b/i,

    renovation:
      /\b(renovation|renovations|refurbishment|alterations?|building upgrade|office upgrade|facility upgrade|remodelling|remodeling)\b/i,

    property_maintenance:
      /\b(property maintenance|building maintenance|facilities maintenance|facility maintenance|maintenance works?|minor works?|repair works?|repairs and maintenance)\b/i,

    painting:
      /\b(painting works?|repainting|paint contractor|painting services?|painting maintenance)\b/i,

    tiling:
      /\b(tiling works?|tiling services?|tile installation|floor tiling|wall tiling)\b/i,

    ceilings:
      /\b(ceiling works?|ceiling installation|ceiling repairs?|suspended ceiling|drywall ceiling)\b/i,

    roofing:
      /\b(roofing works?|roof repairs?|roof replacement|roof maintenance|waterproofing)\b/i,

    plumbing:
      /\b(plumbing works?|plumbing services?|plumbing maintenance|pipe repairs?|water reticulation)\b/i,

    facility_management:
      /\b(facility management|facilities management|integrated facilities|facilities services)\b/i,

    commercial_cleaning:
      /\b(commercial cleaning|cleaning services?|janitorial|office cleaning|industrial cleaning|contract cleaning)\b/i,

    deep_cleaning:
      /\b(deep cleaning|specialised cleaning|specialized cleaning|once-off cleaning)\b/i,

    hygiene:
      /\b(hygiene services?|sanitation services?|washroom services?|hygiene consumables)\b/i,

    landscaping:
      /\b(landscaping|landscape maintenance|garden services?|grounds maintenance)\b/i,

    waste_management:
      /\b(waste management|waste collection|refuse removal|waste disposal)\b/i,

    website_design:
      /\b(website development|website design|website redesign|web development|web portal|website revamp)\b/i,

    logo_design:
      /\b(logo design|logo redesign|new logo|brand mark|visual identity)\b/i,

    branding:
      /\b(branding services?|brand identity|rebranding|corporate identity|visual identity)\b/i,

    seo:
      /\b(search engine optimisation|search engine optimization|\bSEO\b|organic search|search visibility)\b/i,

    digital_marketing:
      /\b(digital marketing|online marketing|digital campaign|marketing services?|performance marketing)\b/i,

    social_media_management:
      /\b(social media management|social media marketing|social media services?|community management)\b/i,

    google_business_profile:
      /\b(google business profile|google my business|business profile optimisation|business profile optimization)\b/i,

    lead_generation:
      /\b(lead generation|appointment setting|sales leads?|customer acquisition)\b/i,

    crm:
      /\b(CRM|customer relationship management|sales pipeline system|customer management system)\b/i,

    ai_automation:
      /\b(ai automation|artificial intelligence|workflow automation|business automation|process automation)\b/i,

    business_documents:
      /\b(business documents?|document management|document templates?|business proposal|quotation system|contract management)\b/i,

    quotations:
      /\b(quotation system|quotation software|quote management|estimating software)\b/i,

    proposals:
      /\b(proposal development|proposal management|proposal writing|bid proposal)\b/i,

    contracts:
      /\b(contract management|contract drafting|agreement management|legal documents?)\b/i,

    ecommerce:
      /\b(e-commerce|ecommerce|online store|shopify|woocommerce|web shop)\b/i,
  };

function hasRelevantServiceEvidence(
  service:
    LeadHunterServiceCategory,
  content: string,
): boolean {
  if (
    service === "general"
  ) {
    return true;
  }

  const pattern =
    SERVICE_RELEVANCE_PATTERNS[
      service
    ];

  if (!pattern) {
    return false;
  }

  return pattern.test(
    content,
  );
}

function matchesAnyRequestedService(
  request:
    LeadHunterSearchRequest,
  content: string,
): boolean {
  return request.services.some(
    (service) =>
      hasRelevantServiceEvidence(
        service,
        content,
      ),
  );
}

function buyerTargetsForService(
  service:
    LeadHunterServiceCategory,
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
      "contractors",
      "retail businesses",
      "professional services firms",
      "nonprofit organisations",
    ],

    branding: [
      "small businesses",
      "retail businesses",
      "restaurants",
      "contractors",
      "professional services firms",
      "training providers",
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
      "restaurants",
      "retail businesses",
      "professional services firms",
      "hospitality businesses",
      "training providers",
    ],

    google_business_profile: [
      "local businesses",
      "contractors",
      "restaurants",
      "retail businesses",
      "professional services firms",
      "hospitality businesses",
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

function primaryLocation(
  request:
    LeadHunterSearchRequest,
): string {
  return (
    request.suburbs?.[0] ||
    request.cities?.[0] ||
    request.locations[0] ||
    request.provinces?.[0] ||
    request.countries?.[0] ||
    "South Africa"
  );
}

function missionText(
  request:
    LeadHunterSearchRequest,
): string {
  return (
    cleanText(
      request.search_instruction,
    ) ||
    cleanText(
      request.notes,
    ) ||
    ""
  );
}

function createSearchQueries(
  request:
    LeadHunterSearchRequest,
): SearchPlan[] {
  const plans:
    SearchPlan[] = [];

  const location =
    primaryLocation(
      request,
    );

  const instruction =
    missionText(
      request,
    );

  const customTargets = [
    ...request.organisation_types,
    ...request.industries,
  ].filter(Boolean);

  const extraTerms = [
    ...request.prospect_keywords,
    ...request.tender_keywords,
  ]
    .slice(
      0,
      4,
    )
    .map(
      (term) =>
        `"${term}"`,
    );

  const extra =
    extraTerms.length > 0
      ? ` (${extraTerms.join(
          " OR ",
        )})`
      : "";

  if (instruction) {
    plans.push({
      query:
        `${instruction} ${location}`,

      purpose:
        request.sector ===
          "government" ||
        request.objectives?.some(
          (objective) =>
            [
              "find_active_tenders",
              "find_rfqs",
              "find_supplier_registrations",
            ].includes(
              objective,
            ),
        )
          ? "active_procurement"
          : "buyer_discovery",

      targetDescription:
        request.organisation_types[0] ||
        request.industries[0] ||
        "custom mission target",

      service:
        request.services[0] ??
        "general",
    });
  }

  for (
    const service of request.services
  ) {
    if (
      plans.length >=
      (
        request.max_search_queries ??
        3
      )
    ) {
      break;
    }

    const serviceText =
      serviceLabel(
        service,
      );

    const targets =
      customTargets.length >
      0
        ? [
            ...new Set([
              ...customTargets,
              ...buyerTargetsForService(
                service,
              ),
            ]),
          ]
        : buyerTargetsForService(
            service,
          );

    const targetOne =
      targets[0] ??
      "business";

    const targetTwo =
      targets[1] ??
      targetOne;

    if (
      request.include_private_sector
    ) {
      plans.push({
        query:
          `"${targetOne}" "${location}" official website contact "${serviceText}"${extra}`,

        purpose:
          "buyer_discovery",

        targetDescription:
          targetOne,

        service,
      });

      if (
        plans.length >=
        (
          request.max_search_queries ??
          3
        )
      ) {
        break;
      }

      plans.push({
        query:
          `"${targetTwo}" "${location}" official company contact "${serviceText}"${extra}`,

        purpose:
          "buyer_discovery",

        targetDescription:
          targetTwo,

        service,
      });

      if (
        plans.length >=
        (
          request.max_search_queries ??
          3
        )
      ) {
        break;
      }

      plans.push({
        query:
          `"${location}" "${targetOne}" ("new branch" OR expansion OR development OR refurbishment OR upgrade OR investment) "${serviceText}"`,

        purpose:
          "growth_signal",

        targetDescription:
          targetOne,

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
        ) &&
        plans.length <
          (
            request.max_search_queries ??
            3
          )
      ) {
        plans.push({
          query:
            `"${targetOne}" "${location}" official website contact "${serviceText}"`,

          purpose:
            "website_gap",

          targetDescription:
            targetOne,

          service,
        });
      }
    }

    if (
      request.include_nonprofits &&
      plans.length <
        (
          request.max_search_queries ??
          3
        )
    ) {
      plans.push({
        query:
          `(church OR nonprofit OR NGO OR "community centre") "${location}" "${serviceText}" official website contact`,

        purpose:
          "buyer_discovery",

        targetDescription:
          "churches and nonprofit organisations",

        service,
      });
    }

    if (
      request.include_government_sector
    ) {
      if (
        plans.length <
        (
          request.max_search_queries ??
          3
        )
      ) {
        plans.push({
          query:
            `site:etenders.gov.za "${serviceText}" ("closing date" OR "tender number" OR "bid number" OR RFQ)`,

          purpose:
            "active_procurement",

          targetDescription:
            "South African government procurement",

          service,
        });
      }

      if (
        plans.length <
        (
          request.max_search_queries ??
          3
        )
      ) {
        plans.push({
          query:
            `(site:gov.za OR site:gauteng.gov.za OR site:tshwane.gov.za) "${serviceText}" (RFQ OR RFP OR tender OR bid)`,

          purpose:
            "active_procurement",

          targetDescription:
            "Government and municipal procurement",

          service,
        });
      }

      if (
        plans.length <
        (
          request.max_search_queries ??
          3
        )
      ) {
        plans.push({
          query:
            `"${location}" (government OR municipality OR department) "${serviceText}" ("supplier registration" OR "supplier database" OR "vendor registration")`,

          purpose:
            "supplier_registration",

          targetDescription:
            "Government supplier registration",

          service,
        });
      }
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

    if (!query) {
      continue;
    }

    const key =
      `${plan.purpose}:${query.toLowerCase()}`;

    if (
      !unique.has(
        key,
      )
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

  return [
    ...unique.values(),
  ].slice(
    0,
    Math.min(
      request.max_search_queries ??
        3,
      ABSOLUTE_MAX_SEARCH_QUERIES,
    ),
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

  const abortFromExternal =
    () =>
      controller.abort();

  if (externalSignal) {
    if (
      externalSignal.aborted
    ) {
      controller.abort();
    } else {
      externalSignal.addEventListener(
        "abort",
        abortFromExternal,
        {
          once: true,
        },
      );
    }
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

    if (externalSignal) {
      externalSignal.removeEventListener(
        "abort",
        abortFromExternal,
      );
    }
  }
}

function normaliseUrl(
  value: unknown,
): string | null {
  const text =
    cleanText(
      value,
    );

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
  plan:
    SearchPlan,
  apiKey:
    string,
): Promise<SearchCandidate[]> {
  const body: Record<
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
    body.time_range =
      "month";
  } else {
    body.country =
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
            body,
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

  const payload =
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
    payload.results ??
    []
  )
    .map(
      (
        result,
      ):
        | SearchCandidate
        | null => {
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
            "Tavily",

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
        value,
      ): value is SearchCandidate =>
        Boolean(
          value,
        ),
    );
}

async function serpApiSearch(
  plan:
    SearchPlan,
  apiKey:
    string,
): Promise<SearchCandidate[]> {
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
      `${SERPAPI_SEARCH_URL}?${params.toString()}`,
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
      ):
        | SearchCandidate
        | null => {
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
              index + 1,
          );

        return {
          provider:
            "SerpAPI",

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
        value,
      ): value is SearchCandidate =>
        Boolean(
          value,
        ),
    );
}

function newsFriendlyQuery(
  plan:
    SearchPlan,
): string {
  return [
    plan.targetDescription,
    serviceLabel(
      plan.service,
    ),
    "South Africa",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(
      0,
      450,
    );
}

async function newsApiSearch(
  plan:
    SearchPlan,
  apiKey:
    string,
): Promise<SearchCandidate[]> {
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

  const params =
    new URLSearchParams({
      q:
        newsFriendlyQuery(
          plan,
        ),

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
      `${NEWS_API_URL}?${params.toString()}`,
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
        title?:
          | string
          | null;

        description?:
          | string
          | null;

        content?:
          | string
          | null;

        url?:
          | string
          | null;

        publishedAt?:
          | string
          | null;
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
    payload.articles ??
    []
  )
    .map(
      (
        article,
        index,
      ):
        | SearchCandidate
        | null => {
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
            "NewsAPI",

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
        value,
      ): value is SearchCandidate =>
        Boolean(
          value,
        ),
    );
}

async function executePlan(
  plan:
    SearchPlan,
  environment:
    Environment,
): Promise<
  Array<{
    provider:
      SearchProvider;

    candidates:
      SearchCandidate[];

    warning?:
      string;
  }>
> {
  const jobs:
    Array<
      Promise<{
        provider:
          SearchProvider;

        candidates:
          SearchCandidate[];

        warning?:
          string;
      }>
    > = [];

  const wrap = (
    provider:
      SearchProvider,

    promise:
      Promise<SearchCandidate[]>,
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
          error:
            unknown,
        ) => ({
          provider,
          candidates: [],

          warning:
            `${provider} failed for "${plan.query}": ${
              error instanceof Error
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
  value:
    string,
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

function deduplicateCandidates(
  candidates:
    SearchCandidate[],
): SearchCandidate[] {
  const byUrl =
    new Map<
      string,
      SearchCandidate
    >();

  const providerPriority = (
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
      byUrl.get(
        key,
      );

    if (
      !existing ||
      candidate.providerScore *
        100 +
        providerPriority(
          candidate.provider,
        ) >
        existing.providerScore *
          100 +
          providerPriority(
            existing.provider,
          )
    ) {
      byUrl.set(
        key,
        candidate,
      );
    }
  }

  return [
    ...byUrl.values(),
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
  html:
    string,
  baseUrl:
    string,
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
      !/(contact|enquir|procurement|supplier|tender|vendor)/i.test(
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
      // Ignore invalid links.
    }
  }

  return null;
}

async function inspectSourcePage(
  sourceUrl:
    string,
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

    if (
      !response.ok
    ) {
      throw new Error(
        "unavailable",
      );
    }

    const contentType =
      (
        response.headers.get(
          "content-type",
        ) ?? ""
      ).toLowerCase();

    if (
      !contentType.includes(
        "text/html",
      )
    ) {
      throw new Error(
        "not-html",
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
  url:
    string,
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
      (domain) =>
        host ===
          domain ||
        host.endsWith(
          `.${domain}`,
        ),
    )
  );
}

function isDirectorySource(
  url:
    string,
  content:
    string,
): boolean {
  const host =
    getHostname(
      url,
    );

  return (
    DIRECTORY_HOST_PATTERNS.some(
      (pattern) =>
        host.includes(
          pattern,
        ),
    ) ||
    DIRECTORY_TEXT_PATTERN.test(
      content,
    )
  );
}

function inferSector(
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
):
  | "private"
  | "government"
  | "nonprofit" {
  if (
    isGovernmentSource(
      candidate.url,
    ) ||
    isGovernmentSource(
      inspection.finalUrl,
    )
  ) {
    return "government";
  }

  const text =
    `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""}`;

  if (
    NONPROFIT_PATTERN.test(
      text,
    )
  ) {
    return "nonprofit";
  }

  return "private";
}

function sectorAllowed(
  sector:
    | "private"
    | "government"
    | "nonprofit",
  request:
    LeadHunterSearchRequest,
): boolean {
  if (
    sector ===
      "government" &&
    !request.include_government_sector
  ) {
    return false;
  }

  if (
    sector ===
      "private" &&
    !request.include_private_sector
  ) {
    return false;
  }

  if (
    sector ===
      "nonprofit" &&
    !request.include_nonprofits
  ) {
    return false;
  }

  return true;
}

function competitorPatternsForService(
  service:
    LeadHunterServiceCategory,
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
      /\bconstruction contractor\b/i,
      /\bgeneral contractor\b/i,
      /\bcivil contractor\b/i,
      /\bturnkey construction\b/i,
    ],

    renovation: [
      /\brenovation company\b/i,
      /\brenovation contractor\b/i,
      /\bhome improvement company\b/i,
    ],

    property_maintenance: [
      /\bproperty maintenance company\b/i,
      /\bmaintenance contractor\b/i,
      /\bhandyman services\b/i,
    ],

    painting: [
      /\bpainting contractor\b/i,
      /\bpainting company\b/i,
      /\bprofessional painters?\b/i,
    ],

    tiling: [
      /\btiling contractor\b/i,
      /\btiling company\b/i,
      /\bprofessional tilers?\b/i,
    ],

    ceilings: [
      /\bceiling installer\b/i,
      /\bceiling contractor\b/i,
    ],

    roofing: [
      /\broofing contractor\b/i,
      /\broofing company\b/i,
    ],

    plumbing: [
      /\bplumbing company\b/i,
      /\bprofessional plumbers?\b/i,
    ],

    facility_management: [
      /\bfacilities management company\b/i,
      /\bfacility management company\b/i,
    ],

    commercial_cleaning: [
      /\bcleaning company\b/i,
      /\bcommercial cleaning company\b/i,
      /\bprofessional cleaners?\b/i,
    ],

    deep_cleaning: [
      /\bdeep cleaning company\b/i,
      /\bcleaning company\b/i,
    ],

    hygiene: [
      /\bhygiene services company\b/i,
      /\bsanitation company\b/i,
    ],

    landscaping: [
      /\blandscaping company\b/i,
      /\blandscape contractor\b/i,
      /\bgarden services company\b/i,
    ],

    waste_management: [
      /\bwaste management company\b/i,
      /\bwaste collection company\b/i,
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
    ],

    branding: [
      /\bbranding agency\b/i,
      /\bbrand design agency\b/i,
      /\bcreative agency\b/i,
    ],

    seo: [
      /\bseo agency\b/i,
      /\bseo company\b/i,
      /\bsearch marketing agency\b/i,
    ],

    digital_marketing: [
      /\bdigital marketing agency\b/i,
      /\bmarketing agency\b/i,
    ],

    social_media_management: [
      /\bsocial media agency\b/i,
      /\bsocial media marketing agency\b/i,
    ],

    google_business_profile: [
      /\blocal seo agency\b/i,
      /\bgoogle business profile agency\b/i,
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
      /\bonline store developer\b/i,
    ],
  };

  return (
    map[service] ??
    []
  );
}

function detectCompetitorServices(
  request:
    LeadHunterSearchRequest,
  content:
    string,
): LeadHunterServiceCategory[] {
  return request.services.filter(
    (service) =>
      competitorPatternsForService(
        service,
      ).some(
        (pattern) =>
          pattern.test(
            content,
          ),
      ) &&
      (
        SERVICE_OFFERING_PATTERN.test(
          content,
        ) ||
        /\b(services|solutions|what we do|our expertise|our capabilities)\b/i.test(
          content,
        )
      ),
  );
}

function inferBuyerRole(
  service:
    LeadHunterServiceCategory,
  content:
    string,
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
      (letter) =>
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

function sourceTrustScore(
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
): number {
  if (
    isGovernmentSource(
      candidate.url,
    )
  ) {
    return 95;
  }

  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 5000)}`;

  if (
    isDirectorySource(
      candidate.url,
      combined,
    )
  ) {
    return 20;
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
  request:
    LeadHunterSearchRequest,
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
): CandidateAssessment {
  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${inspection.text.slice(0, 10_000)}`;

  const reasons:
    string[] = [];

  const sourceTrust =
    sourceTrustScore(
      candidate,
      inspection,
    );

  const competitors =
    detectCompetitorServices(
      request,
      combined,
    );

  const probableBuyerRole =
    inferBuyerRole(
      candidate.searchedService,
      combined,
    );

  const directory =
    isDirectorySource(
      candidate.url,
      combined,
    );

  if (
    directory &&
    request.exclude_directories !==
      false
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

  const procurement =
    PROCUREMENT_PATTERN.test(
      combined,
    );

  const supplierRegistration =
    SUPPLIER_REGISTRATION_PATTERN.test(
      combined,
    );

  const relevantService =
    matchesAnyRequestedService(
      request,
      combined,
    );

  const informational =
    INFORMATIONAL_PAGE_PATTERN.test(
      combined,
    ) &&
    !procurement &&
    candidate.purpose !==
      "growth_signal";

  if (
    informational
  ) {
    return {
      disposition:
        "informational",

      buyerFit:
        5,

      sourceTrust:
        30,

      reasons: [
        "The page appears informational, educational or resource-related and does not prove a purchasing opportunity.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  if (
    procurement &&
    !relevantService
  ) {
    return {
      disposition:
        "irrelevant",

      buyerFit:
        5,

      sourceTrust,

      reasons: [
        "A procurement notice was found, but the advertised requirement does not match any selected Cossa service.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  if (
    procurement &&
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
        "The source contains formal procurement language and the requirement matches at least one selected Cossa service.",
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
      !relevantService &&
      !request.search_everything
    ) {
      return {
        disposition:
          "irrelevant",

        buyerFit:
          20,

        sourceTrust,

        reasons: [
          "A supplier-registration signal was detected, but no selected service relevance was confirmed.",
        ],

        probableBuyerRole:
          "Procurement or Supply Chain Management",

        competitorForServices:
          competitors,
      };
    }

    return {
      disposition:
        "supplier_opportunity",

      buyerFit:
        85,

      sourceTrust,

      reasons: [
        "The source contains a supplier-registration or vendor-database signal.",
      ],

      probableBuyerRole:
        "Procurement or Supply Chain Management",

      competitorForServices:
        competitors,
    };
  }

  const explicitNeed =
    BUYER_NEED_PATTERN.test(
      combined,
    );

  const expansion =
    EXPANSION_PATTERN.test(
      combined,
    );

  const offersSame =
    competitors.length >
    0;

  if (
    offersSame &&
    request.exclude_competitors !==
      false &&
    !explicitNeed
  ) {
    return {
      disposition:
        "competitor",

      buyerFit:
        5,

      sourceTrust,

      reasons: [
        "The organisation appears to sell the same selected service Cossa is trying to offer.",
        "No separate buying, procurement or subcontracting requirement was verified.",
      ],

      probableBuyerRole:
        null,

      competitorForServices:
        competitors,
    };
  }

  if (
    offersSame &&
    explicitNeed
  ) {
    return {
      disposition:
        "partner",

      buyerFit:
        48,

      sourceTrust,

      reasons: [
        "The organisation sells related services but also shows a separate requirement that may support subcontracting or partnership.",
      ],

      probableBuyerRole:
        "Operations or Subcontracting Manager",

      competitorForServices:
        competitors,
    };
  }

  if (
    explicitNeed &&
    relevantService
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit:
        88,

      sourceTrust,

      reasons: [
        "A public buying, appointment, contract or service requirement matching a selected Cossa service was detected.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  if (
    expansion &&
    relevantService
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit:
        76,

      sourceTrust,

      reasons: [
        "A public expansion, investment or development signal relevant to the selected service was detected.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  const target =
    candidate.targetDescription.toLowerCase();

  const targetTokens =
    target
      .split(
        /\s+/,
      )
      .filter(
        (token) =>
          token.length >=
          5,
      );

  const targetMatch =
    lowerText(
      combined,
    ).includes(
      target,
    ) ||
    targetTokens.some(
      (token) =>
        lowerText(
          combined,
        ).includes(
          token,
        ),
    );

  if (
    candidate.purpose ===
      "buyer_discovery" &&
    targetMatch &&
    !offersSame
  ) {
    return {
      disposition:
        "buyer",

      buyerFit:
        relevantService
          ? 68
          : 62,

      sourceTrust,

      reasons: [
        `The organisation matches the selected buyer category: ${candidate.targetDescription}.`,
        "No active procurement event was proven, so this is a prospecting lead rather than a confirmed buyer request.",
      ],

      probableBuyerRole,

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
      "The source did not prove that this organisation is a suitable buyer or relevant active opportunity.",
    ],

    probableBuyerRole,

    competitorForServices:
      competitors,
  };
}

function inferSignal(
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
  assessment:
    CandidateAssessment,
): ProspectSignal {
  const text =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;

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
        : 84;
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
        : 84;
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
        : 80;
  } else if (
    assessment.disposition ===
    "supplier_opportunity"
  ) {
    type =
      "supplier_registration";

    title =
      "Supplier-registration opportunity";

    confidence =
      90;
  } else if (
    /\b(cleaning contract|cleaning services required|appointment of.*cleaning|janitorial)\b/i.test(
      text,
    )
  ) {
    type =
      "cleaning_need";

    title =
      "Cleaning-service requirement";

    confidence =
      80;
  } else if (
    /\b(website development|website redesign|web portal development|digital platform required)\b/i.test(
      text,
    )
  ) {
    type =
      "technology_need";

    title =
      "Technology or website requirement";

    confidence =
      78;
  } else if (
    /\b(maintenance contract|repair works|minor works|refurbishment|renovation project|upgrade project)\b/i.test(
      text,
    )
  ) {
    type =
      "maintenance_need";

    title =
      "Maintenance or upgrade requirement";

    confidence =
      77;
  } else if (
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
        ? 76
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
  request:
    LeadHunterSearchRequest,
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
): LeadHunterServiceCategory {
  const text =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;

  let best:
    LeadHunterServiceCategory =
      candidate.searchedService;

  let bestScore =
    -1;

  for (
    const service of request.services
  ) {
    let score =
      0;

    if (
      hasRelevantServiceEvidence(
        service,
        text,
      )
    ) {
      score +=
        5;
    }

    if (
      service ===
      candidate.searchedService
    ) {
      score +=
        2;
    }

    if (
      lowerText(
        text,
      ).includes(
        serviceLabel(
          service,
        ).toLowerCase(),
      )
    ) {
      score +=
        2;
    }

    if (
      score >
      bestScore
    ) {
      best =
        service;

      bestScore =
        score;
    }
  }

  return (
    request.services.includes(
      best,
    )
      ? best
      : request.services[0] ??
        "general"
  );
}

function recommendedCompany(
  service:
    LeadHunterServiceCategory,
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

function calculateScores(
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
  signal:
    ProspectSignal,
  assessment:
    CandidateAssessment,
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

  const intentBase =
    assessment.disposition ===
    "active_opportunity"
      ? [
          "active_tender",
          "request_for_quote",
          "request_for_proposal",
        ].includes(
          signal.type,
        )
        ? 92
        : 76
      : assessment.disposition ===
          "supplier_opportunity"
        ? 72
        : assessment.disposition ===
            "buyer"
          ? 32
          : assessment.disposition ===
              "partner"
            ? 38
            : 5;

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

  const timingScore =
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(
      signal.type,
    )
      ? 92
      : signal.type ===
          "supplier_registration"
        ? 72
        : [
            "business_expansion",
            "new_branch",
          ].includes(
            signal.type,
          )
          ? 70
          : assessment.disposition ===
              "active_opportunity"
            ? 65
            : assessment.disposition ===
                "buyer"
              ? 35
              : 25;

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
        58,
      );
  }

  if (
    rejected
  ) {
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
  assessment:
    CandidateAssessment,
  signal:
    ProspectSignal,
  score:
    number,
): ProspectClassification {
  if (
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
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

function inferOrganisationName(
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
): string {
  const source =
    inspection.title ||
    candidate.title ||
    getHostname(
      candidate.url,
    );

  return (
    cleanText(
      source
        .replace(
          /\s+[|–—-]\s+.*$/,
          "",
        )
        .replace(
          /\b(home|contact us|about us|tenders?|rfq|rfp|official website)\b/gi,
          " ",
        ),
    ) ||
    getHostname(
      candidate.url,
    )
  );
}

function inferLocation(
  request:
    LeadHunterSearchRequest,
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
): {
  city:
    string | null;
  province:
    string | null;
} {
  const searchable =
    lowerText(
      `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 5000)}`,
    );

  const cities = [
    ...(request.cities ??
      []),
    ...request.locations,
  ];

  const provinces = [
    ...(request.provinces ??
      []),

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

  const city =
    cities.find(
      (item) =>
        ![
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
        ].includes(
          item,
        ) &&
        searchable.includes(
          item.toLowerCase(),
        ),
    ) ??
    null;

  const province =
    provinces.find(
      (item) =>
        searchable.includes(
          item.toLowerCase(),
        ),
    ) ??
    null;

  return {
    city,
    province,
  };
}

function createProspect(
  request:
    LeadHunterSearchRequest,
  candidate:
    SearchCandidate,
  inspection:
    PageInspection,
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
    inferSector(
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
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
    ].includes(
      assessment.disposition,
    );

  const hasContact =
    Boolean(
      inspection.phones.length ||
      inspection.emails.length,
    );

  let evidenceType:
    EvidenceType =
      "official_website";

  if (
    isGovernmentSource(
      candidate.url,
    )
  ) {
    evidenceType =
      [
        "active_tender",
        "request_for_quote",
        "request_for_proposal",
      ].includes(
        signal.type,
      )
        ? "tender_notice"
        : "government_portal";
  } else if (
    candidate.provider ===
    "NewsAPI"
  ) {
    evidenceType =
      "news_report";
  } else if (
    /contact/i.test(
      candidate.url,
    )
  ) {
    evidenceType =
      "contact_page";
  }

  const evidence:
    ProspectEvidence[] = [
    {
      type:
        evidenceType,

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
        ) ||
        null,

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
      : evidence.length >=
            2 &&
          hasContact &&
          scores.evidenceScore >=
            70
        ? "verified"
        : "partially_verified";

  const opportunitySize:
    OpportunitySize =
      /\b(framework agreement|multi-year|national|province-wide|major works|large-scale|multi-site)\b/i.test(
        `${candidate.title} ${candidate.snippet}`,
      )
        ? "strategic"
        : sector ===
              "government" &&
            [
              "active_tender",
              "request_for_proposal",
            ].includes(
              signal.type,
            )
          ? "large"
          : /\b(minor works|small works|quotation|rfq|repair|once-off)\b/i.test(
                `${candidate.title} ${candidate.snippet}`,
              )
            ? "small"
            : "unknown";

  const activeOpportunity =
    assessment.disposition ===
    "active_opportunity";

  const buyerOnly =
    assessment.disposition ===
    "buyer";

  const decisionMakerRoute =
    sector ===
    "government"
      ? "Use the official procurement or Supply Chain Management contact in the bid documentation. Confirm the tender number, closing date, submission method and eligibility before acting."
      : assessment.probableBuyerRole
        ? `Request the ${assessment.probableBuyerRole} through the organisation’s verified public contact channel.`
        : hasContact
          ? "Use the verified public business contact and request the person responsible for procurement, facilities, operations, property, marketing, technology or ownership."
          : "A public decision-maker route still requires verification.";

  const serviceFitReason =
    activeOpportunity
      ? `${organisationName} has public evidence that may indicate a current requirement for ${serviceLabel(service)}. The source must still be opened and verified before outreach, quotation or bidding.`
      : buyerOnly
        ? `${organisationName} matches a buyer category that commonly purchases ${serviceLabel(service)}. No active buying request has been proven, so this remains a prospecting lead.`
        : assessment.reasons.join(
            " ",
          );

  const nextAction =
    rejected
      ? `Do not save this result as a customer lead. Reason: ${assessment.reasons.join(" ")}`
      : sector ===
        "government"
        ? "Open the official notice. Confirm the opportunity is still active and directly relevant to the selected Cossa service. Record the tender/RFQ number, closing date, briefing requirements, CIDB grading if applicable, CSD requirements, submission method and bid/no-bid decision."
        : activeOpportunity
          ? `Open the evidence source and verify the exact requirement. Then contact the ${assessment.probableBuyerRole ?? "relevant decision-maker"} through a verified public business channel after human approval.`
          : `Verify the organisation and contact route. Research one specific pain point before preparing personalised outreach to the ${assessment.probableBuyerRole ?? "relevant decision-maker"}.`;

  const outreachAngle =
    rejected ||
    sector ===
      "government"
      ? null
      : activeOpportunity
        ? "Reference only the specific public requirement or expansion signal actually found. Offer a short discovery call, site assessment or relevant review without claiming that the organisation requested contact from Cossa."
        : "Introduce Cossa briefly, connect one selected service to a verified business characteristic, and offer a low-friction next step such as a site assessment, website review or short needs discussion.";

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

    revenue_potential_score:
      clampScore(
        scores.totalScore *
          0.55 +
          scores.intentScore *
            0.25 +
          scores.timingScore *
            0.2,
      ),

    ease_to_close_score:
      clampScore(
        scores.contactabilityScore *
          0.45 +
          scores.intentScore *
            0.3 +
          scores.fitScore *
            0.25,
      ),

    recurring_revenue_score:
      [
        "facility_management",
        "commercial_cleaning",
        "hygiene",
        "landscaping",
        "seo",
        "digital_marketing",
        "social_media_management",
        "google_business_profile",
        "lead_generation",
        "crm",
        "ai_automation",
      ].includes(
        service,
      )
        ? 75
        : 35,

    geographic_fit_score:
      location.city ||
      location.province
        ? 85
        : 55,

    sales_priority:
      scores.totalScore >=
          80 &&
        scores.contactabilityScore >=
          60 &&
        (
          scores.intentScore >=
            70 ||
          scores.timingScore >=
            75
        )
        ? "hot"
        : scores.totalScore >=
              65 &&
            scores.contactabilityScore >=
              40
          ? "warm"
          : scores.totalScore >=
              50
            ? "cold"
            : "research",

    why_contact: [
      ...(
        hasContact
          ? [
              "Verified public contact route is available.",
            ]
          : []
      ),

      ...(
        [
          "active_tender",
          "request_for_quote",
          "request_for_proposal",
        ].includes(
          signal.type,
        )
          ? [
              "A public procurement signal matching a selected Cossa service was identified.",
            ]
          : []
      ),

      ...(
        signal.type ===
        "supplier_registration"
          ? [
              "A public supplier-registration route was identified.",
            ]
          : []
      ),

      ...(
        activeOpportunity &&
        ![
          "active_tender",
          "request_for_quote",
          "request_for_proposal",
          "supplier_registration",
        ].includes(
          signal.type,
        )
          ? [
              "A relevant public service-need or expansion signal was identified.",
            ]
          : []
      ),
    ],

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

function prospectKey(
  prospect:
    LeadHunterProspect,
): string {
  const host =
    prospect.website
      ? getHostname(
          prospect.website,
        )
      : "";

  return (
    host ||
    prospect.organisation_name
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        "",
      )
  );
}

function filterProspects(
  prospects:
    LeadHunterProspect[],
  request:
    LeadHunterSearchRequest,
): LeadHunterProspect[] {
  const unique =
    new Map<
      string,
      LeadHunterProspect
    >();

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

    // HARD SECTOR ENFORCEMENT.
    if (
      !sectorAllowed(
        prospect.sector as
          | "private"
          | "government"
          | "nonprofit",
        request,
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
        (signal) =>
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

    const key =
      prospectKey(
        prospect,
      );

    if (!key) {
      continue;
    }

    const existing =
      unique.get(
        key,
      );

    if (
      !existing ||
      prospect.total_score >
        existing.total_score
    ) {
      unique.set(
        key,
        prospect,
      );
    }
  }

  return [
    ...unique.values(),
  ]
    .sort(
      (
        first,
        second,
      ) => {
        const firstActive =
          [
            "active_opportunity",
            "tender",
            "supplier_opportunity",
          ].includes(
            first.classification,
          );

        const secondActive =
          [
            "active_opportunity",
            "tender",
            "supplier_opportunity",
          ].includes(
            second.classification,
          );

        if (
          firstActive !==
          secondActive
        ) {
          return (
            Number(
              secondActive,
            ) -
            Number(
              firstActive,
            )
          );
        }

        return (
          second.total_score -
          first.total_score
        );
      },
    )
    .slice(
      0,
      request.result_count,
    );
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

          const membership =
            await verifyOrganisationMembership(
              token,
              user.id,
              environment,
            );

          if (
            !membership
          ) {
            return new Response(
              "You are not authorised to use the Cossa Lead Hunter.",
              {
                status:
                  403,
              },
            );
          }

          const rateLimit =
            enforceRateLimit(
              user.id,
            );

          if (
            !rateLimit.allowed
          ) {
            return new Response(
              `Lead Hunter rate limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
              {
                status:
                  429,

                headers: {
                  "Retry-After":
                    String(
                      rateLimit.retryAfterSeconds,
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

          /*
           * Run plans sequentially.
           *
           * This deliberately avoids launching every query/provider at once.
           * It reduces provider aborts, rate spikes and wasted credits.
           */
          for (
            const plan of plans
          ) {
            const results =
              await executePlan(
                plan,
                environment,
              );

            for (
              const result of results
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
                    12,
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

          const acceptedProspects =
            filterProspects(
              rawProspects,
              searchRequest,
            );

          const rejectedCompetitors =
            rawProspects.filter(
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
                        "same selected service",
                      ),
                ),
            ).length;

          const rejectedDirectories =
            rawProspects.filter(
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
                        "directory",
                      ),
                ),
            ).length;

          const rejectedInformational =
            rawProspects.filter(
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
                        "informational",
                      ) ||
                    reason
                      .toLowerCase()
                      .includes(
                        "resource-related",
                      ),
                ),
            ).length;

          const rejectedIrrelevantProcurement =
            rawProspects.filter(
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
                        "procurement notice",
                      ) &&
                    reason
                      .toLowerCase()
                      .includes(
                        "does not match",
                      ),
                ),
            ).length;

          const rejectedSectorMismatch =
            rawProspects.filter(
              (
                prospect,
              ) =>
                prospect.verification_status !==
                  "rejected" &&
                !sectorAllowed(
                  prospect.sector as
                    | "private"
                    | "government"
                    | "nonprofit",
                  searchRequest,
                ),
            ).length;

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
                rawProspects.length -
                acceptedProspects.length,

              warnings: [
                ...warnings.slice(
                  0,
                  12,
                ),

                `Quality control rejected ${rejectedCompetitors} apparent competitors, ${rejectedDirectories} directories or aggregators, ${rejectedInformational} informational pages, ${rejectedIrrelevantProcurement} unrelated procurement results and ${rejectedSectorMismatch} sector-mismatched results.`,

                ...(acceptedProspects.length ===
                0
                  ? [
                      "Search results were found, but none met the selected sector, buyer-fit, service relevance, evidence, intent and score requirements.",
                    ]
                  : []),

                "A qualified prospect is not automatically an active buyer. Only records with supported procurement, expansion or service-requirement evidence should be treated as active opportunities.",

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
