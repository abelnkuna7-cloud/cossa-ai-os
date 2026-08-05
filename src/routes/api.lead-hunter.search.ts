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
  /\b(career guide|careers?|qualification|registered qualifications?|learnership|course|training programme|employment opportunities|recommended subjects|blog|news article|useful information|industry overview|what is|how to become)\b/i;

const PROCUREMENT_PATTERN =
  /\b(request for quotation|request for proposal|invitation to bid|invitation to tender|request for bid|request for tender|\bRFQ\b|\bRFP\b|\bRFB\b|\bRFT\b|tender number|bid number|closing date|compulsory briefing|non-compulsory briefing|submission deadline|procurement notice)\b/i;

const SUPPLIER_REGISTRATION_PATTERN =
  /\b(supplier registration|supplier database|vendor registration|register as a supplier|supplier invitation|expression of interest|call for suppliers)\b/i;

const EXPANSION_PATTERN =
  /\b(new branch|opening soon|new development|expansion|new premises|new office|new warehouse|new facility|relocation|property development|construction underway)\b/i;

const BUYER_NEED_PATTERN =
  /\b(seeking|requires?|required|appoint(?:ment|ing)?|looking for|invites?|procure(?:ment|ing)?|requesting|contract for|service provider for|maintenance contract|cleaning contract|upgrade project|renovation project|refurbishment project|building works|minor works|repair works)\b/i;

const SERVICE_OFFERING_PATTERN =
  /\b(we offer|we provide|our services|call us today|get a free quote|request a free quote|professional services|specialists in|experts in|affordable services|same day service|book our service)\b/i;

const PUBLIC_BUYER_ROLE_PATTERN =
  /\b(procurement manager|supply chain manager|facilities manager|facility manager|property manager|estate manager|operations manager|school principal|administrator|marketing manager|it manager|project manager|business owner|managing director)\b/i;

type Environment = {
  tavilyApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  organisationId: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

type RestRequestOptions = {
  table: string;
  query: string;
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
};

type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
  raw_content?: string | null;
};

type TavilySearchResponse = {
  query?: string;
  results?: TavilySearchResult[];
  response_time?: number | string;
  request_id?: string;
  usage?: {
    credits?: number;
  };
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
  query: string;
  purpose: SearchPurpose;
  targetDescription: string;
  searchedService: LeadHunterServiceCategory;
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  tavilyScore: number;
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

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ScoreBreakdown = {
  fitScore: number;
  intentScore: number;
  evidenceScore: number;
  timingScore: number;
  contactabilityScore: number;
  totalScore: number;
};

const rateLimits =
  new Map<string, RateLimitEntry>();

function trimTrailingSlash(
  value: string,
): string {
  return value.replace(/\/+$/, "");
}

function decodeHtmlEntities(
  value: string,
): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#8211;/gi, "–")
    .replace(/&#8212;/gi, "—")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"');
}

function cleanText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = decodeHtmlEntities(value)
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
    Math.min(100, Math.round(parsed)),
  );
}

function getEnvironment():
  Environment | null {
  const tavilyApiKey =
    process.env.TAVILY_API_KEY;

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const organisationId =
    process.env.COSSA_ORGANISATION_ID ||
    process.env.VITE_COSSA_ORGANISATION_ID ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (
    !tavilyApiKey ||
    !supabaseUrl ||
    !supabaseKey
  ) {
    return null;
  }

  return {
    tavilyApiKey,
    supabaseUrl:
      trimTrailingSlash(supabaseUrl),
    supabaseKey,
    organisationId,
  };
}

function getBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

async function verifySupabaseUser({
  token,
  supabaseUrl,
  supabaseKey,
}: {
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<SupabaseUser | null> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
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

async function restSelect<T>({
  table,
  query,
  token,
  supabaseUrl,
  supabaseKey,
}: RestRequestOptions): Promise<T[]> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${query}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const text = await response
      .text()
      .catch(() => "");

    console.error(
      `Supabase query failed for ${table}:`,
      response.status,
      text,
    );

    return [];
  }

  return (await response.json()) as T[];
}

async function verifyOrganisationMembership({
  token,
  userId,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  token: string;
  userId: string;
  organisationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<boolean> {
  const rows = await restSelect<{
    user_id: string;
    status: string;
    role: string;
  }>({
    table: "organisation_members",
    query: new URLSearchParams({
      select: "user_id,status,role",
      organisation_id:
        `eq.${organisationId}`,
      user_id: `eq.${userId}`,
      status: "eq.active",
      limit: "1",
    }).toString(),
    token,
    supabaseUrl,
    supabaseKey,
  });

  return rows.length === 1;
}

function enforceRateLimit(
  userId: string,
): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current =
    rateLimits.get(userId);

  if (
    !current ||
    current.resetAt <= now
  ) {
    rateLimits.set(userId, {
      count: 1,
      resetAt:
        now + RATE_LIMIT_WINDOW_MS,
    });

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
            (current.resetAt - now) /
              1000,
          ),
        ),
    };
  }

  current.count += 1;
  rateLimits.set(userId, current);

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

  const resultCount = Math.min(
    MAX_REQUEST_RESULTS,
    Math.max(
      1,
      Math.round(
        Number(
          candidate.result_count ?? 15,
        ),
      ),
    ),
  );

  const locations =
    Array.isArray(candidate.locations)
      ? candidate.locations
          .map(cleanText)
          .filter(
            (item): item is string =>
              Boolean(item),
          )
          .slice(0, 12)
      : [];

  const industries =
    Array.isArray(candidate.industries)
      ? candidate.industries
          .map(cleanText)
          .filter(
            (item): item is string =>
              Boolean(item),
          )
          .slice(0, 12)
      : [];

  const organisationTypes =
    Array.isArray(
      candidate.organisation_types,
    )
      ? candidate.organisation_types
          .map(cleanText)
          .filter(
            (item): item is string =>
              Boolean(item),
          )
          .slice(0, 12)
      : [];

  const services =
    Array.isArray(candidate.services)
      ? candidate.services.slice(0, 20)
      : [];

  const companies =
    Array.isArray(candidate.companies)
      ? candidate.companies.slice(0, 10)
      : [];

  if (services.length === 0) {
    return {
      valid: false,
      error:
        "Choose at least one service.",
    };
  }

  if (companies.length === 0) {
    return {
      valid: false,
      error:
        "Choose at least one Cossa company.",
    };
  }

  return {
    valid: true,
    request: {
      sector:
        candidate.sector ?? "mixed",

      companies,
      services,

      locations:
        locations.length > 0
          ? locations
          : ["Gauteng"],

      industries,
      organisation_types:
        organisationTypes,

      result_count: resultCount,

      minimum_score: clampScore(
        candidate.minimum_score ?? 60,
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
        candidate.include_private_sector !==
        false,

      include_government_sector:
        candidate.include_government_sector ===
        true,

      include_nonprofits:
        candidate.include_nonprofits ===
        true,

      require_public_phone_or_email:
        candidate.require_public_phone_or_email ===
        true,

      require_website:
        candidate.require_website ===
        true,

      require_opportunity_signal:
        candidate.require_opportunity_signal !==
        false,

      tender_keywords:
        Array.isArray(
          candidate.tender_keywords,
        )
          ? candidate.tender_keywords
              .map(cleanText)
              .filter(
                (item): item is string =>
                  Boolean(item),
              )
              .slice(0, 20)
          : [],

      prospect_keywords:
        Array.isArray(
          candidate.prospect_keywords,
        )
          ? candidate.prospect_keywords
              .map(cleanText)
              .filter(
                (item): item is string =>
                  Boolean(item),
              )
              .slice(0, 25)
          : [],

      verified_sources_only:
        candidate.verified_sources_only !==
        false,

      exclude_existing_crm_leads:
        candidate.exclude_existing_crm_leads !==
        false,

      notes:
        cleanText(candidate.notes),
    },
  };
}

function serviceLabel(
  service: LeadHunterServiceCategory,
): string {
  const labels: Record<
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
    seo:
      "SEO services",
    digital_marketing:
      "digital marketing",
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

  return labels[service];
}

function buyerTargetsForService(
  service: LeadHunterServiceCategory,
): string[] {
  const targets: Partial<
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

    general: [
      "small businesses",
      "property companies",
      "schools",
      "office parks",
      "warehouses",
      "retail businesses",
    ],
  };

  return (
    targets[service] ?? targets.general ?? []
  );
}

function competitorPatternsForService(
  service: LeadHunterServiceCategory,
): RegExp[] {
  const commonAgencyPattern =
    /\b(agency|consultancy|specialists?|service provider|contractors?)\b/i;

  const patterns: Partial<
    Record<
      LeadHunterServiceCategory,
      RegExp[]
    >
  > = {
    construction: [
      /\bconstruction company\b/i,
      /\bbuilding contractor\b/i,
      /\bcivil contractor\b/i,
      /\bwe build\b/i,
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
      /\bcarpet cleaning\b/i,
      /\bwindow cleaning services\b/i,
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
      /\bwebsites? from r\d+/i,
      /\bweb designer\b/i,
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

  return [
    ...(patterns[service] ?? []),
    commonAgencyPattern,
  ];
}

function createSearchQueries(
  request: LeadHunterSearchRequest,
): SearchPlan[] {
  const plans: SearchPlan[] = [];

  const locations =
    request.locations.length > 0
      ? request.locations
      : ["South Africa"];

  const requestedTargets = [
    ...request.organisation_types,
    ...request.industries,
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  for (
    const service of request.services.slice(0, 6)
  ) {
    const defaultTargets =
      buyerTargetsForService(service);

    const targets =
      requestedTargets.length > 0
        ? [
            ...new Set([
              ...requestedTargets,
              ...defaultTargets,
            ]),
          ].slice(0, 6)
        : defaultTargets.slice(0, 6);

    if (
      request.include_private_sector
    ) {
      for (
        let index = 0;
        index <
        Math.min(
          2,
          targets.length,
          locations.length,
        );
        index += 1
      ) {
        const target =
          targets[index % targets.length];

        const location =
          locations[index % locations.length];

        plans.push({
          purpose: "buyer_discovery",
          service,
          targetDescription: target,
          query:
            `"${target}" "${location}" official website contact`,
        });
      }

      plans.push({
        purpose: "growth_signal",
        service,
        targetDescription:
          targets[0] ?? "business",
        query:
          `"${targets[0] ?? "business"}" "${locations[0]}" ("new branch" OR expansion OR development OR refurbishment OR upgrade)`,
      });

      if (
        [
          "website_design",
          "seo",
          "digital_marketing",
          "lead_generation",
          "crm",
          "ai_automation",
        ].includes(service)
      ) {
        plans.push({
          purpose: "website_gap",
          service,
          targetDescription:
            targets[0] ?? "small business",
          query:
            `"${targets[0] ?? "small business"}" "${locations[0]}" official website contact`,
        });
      }
    }

    if (
      request.include_nonprofits
    ) {
      plans.push({
        purpose: "buyer_discovery",
        service,
        targetDescription:
          "churches and nonprofit organisations",
        query:
          `church OR nonprofit OR community centre "${locations[0]}" official website contact`,
      });
    }

    if (
      request.include_government_sector
    ) {
      const serviceText =
        serviceLabel(service);

      plans.push({
        purpose: "active_procurement",
        service,
        targetDescription:
          "South African government procurement",
        query:
          `site:etenders.gov.za "${serviceText}" ("closing date" OR "tender number" OR "bid number")`,
      });

      plans.push({
        purpose: "active_procurement",
        service,
        targetDescription:
          "Government and municipal procurement",
        query:
          `site:gov.za "${serviceText}" (RFQ OR RFP OR tender OR "request for quotation")`,
      });

      plans.push({
        purpose: "supplier_registration",
        service,
        targetDescription:
          "Government supplier registration",
        query:
          `"${locations[0]}" government OR municipality "${serviceText}" ("supplier registration" OR "supplier database")`,
      });
    }
  }

  const unique =
    new Map<string, SearchPlan>();

  for (const plan of plans) {
    const query = plan.query
      .replace(/\s+/g, " ")
      .trim();

    if (!query) {
      continue;
    }

    const key = query.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, {
        ...plan,
        query,
      });
    }
  }

  return [...unique.values()].slice(
    0,
    MAX_SEARCH_QUERIES,
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  const externalSignal =
    init.signal;

  if (externalSignal) {
    externalSignal.addEventListener(
      "abort",
      () => controller.abort(),
      {
        once: true,
      },
    );
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function tavilySearch({
  plan,
  apiKey,
}: {
  plan: SearchPlan;
  apiKey: string;
}): Promise<SearchCandidate[]> {
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
        body: JSON.stringify({
          query: plan.query,
          topic: "general",
          search_depth: "basic",
          country: "south africa",
          max_results:
            MAX_RESULTS_PER_QUERY,
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          exclude_domains:
            PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE,
        }),
      },
      SEARCH_TIMEOUT_MS,
    );

  if (!response.ok) {
    const message = await response
      .text()
      .catch(() => "");

    throw new Error(
      message ||
        `Search provider failed (${response.status}).`,
    );
  }

  const payload =
    (await response.json()) as TavilySearchResponse;

  return (payload.results ?? [])
    .map((result) => {
      const title =
        cleanText(result.title);

      const url =
        normaliseUrl(result.url);

      const snippet =
        cleanText(result.content);

      if (
        !title ||
        !url ||
        !snippet
      ) {
        return null;
      }

      return {
        query: plan.query,
        purpose: plan.purpose,
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
        tavilyScore:
          Math.max(
            0,
            Math.min(
              1,
              Number(result.score ?? 0),
            ),
          ),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is SearchCandidate =>
        Boolean(candidate),
    );
}

function normaliseUrl(
  value: unknown,
): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(
      text.startsWith("http")
        ? text
        : `https://${text}`,
    );

    if (
      !["http:", "https:"].includes(
        url.protocol,
      )
    ) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function getHostname(
  value: string,
): string {
  try {
    return new URL(value)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function rootDomainKey(
  value: string,
): string {
  const hostname =
    getHostname(value);

  return hostname || value.toLowerCase();
}

function deduplicateCandidates(
  candidates: SearchCandidate[],
): SearchCandidate[] {
  const byPage =
    new Map<string, SearchCandidate>();

  for (const candidate of candidates) {
    const key =
      candidate.url
        .replace(/\/+$/, "")
        .toLowerCase();

    const existing =
      byPage.get(key);

    if (
      !existing ||
      candidate.tavilyScore >
        existing.tavilyScore
    ) {
      byPage.set(key, candidate);
    }
  }

  return [...byPage.values()].sort(
    (first, second) =>
      second.tavilyScore -
      first.tavilyScore,
  );
}

function htmlToText(
  html: string,
): string {
  return cleanText(
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
      .replace(/<[^>]+>/g, " "),
  )?.slice(
    0,
    MAX_SOURCE_CONTENT_LENGTH,
  ) ?? "";
}

function extractHtmlTitle(
  html: string,
): string | null {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  );

  return cleanText(
    match?.[1]?.replace(/<[^>]+>/g, " "),
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
        .map((email) =>
          email.toLowerCase(),
        )
        .filter(
          (email) =>
            !email.endsWith(
              "@example.com",
            ) &&
            !email.includes(
              "sentry.io",
            ) &&
            !email.includes(
              "wixpress.com",
            ),
        ),
    ),
  ].slice(0, 8);
}

function extractPhones(
  text: string,
): string[] {
  const matches =
    text.match(
      /(?:\+27|0)\s?\d{2}[\s()-]?\d{3}[\s-]?\d{4}/g,
    ) ?? [];

  return [
    ...new Set(
      matches.map((phone) =>
        phone
          .replace(/[^\d+]/g, "")
          .trim(),
      ),
    ),
  ].slice(0, 8);
}

function findContactPageUrl(
  html: string,
  baseUrl: string,
): string | null {
  const links = [
    ...html.matchAll(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];

  for (const link of links) {
    const href =
      cleanText(link[1]);

    const label = lowerText(
      link[2]?.replace(
        /<[^>]+>/g,
        " ",
      ),
    );

    if (
      !href ||
      !/(contact|enquir|procurement|supplier|tender)/i.test(
        `${href} ${label}`,
      )
    ) {
      continue;
    }

    try {
      const url = new URL(
        href,
        baseUrl,
      );

      if (
        ["http:", "https:"].includes(
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
  sourceUrl: string,
): Promise<PageInspection> {
  const inspectedAt =
    new Date().toISOString();

  try {
    const response =
      await fetchWithTimeout(
        sourceUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "User-Agent":
              "CossaLeadHunter/2.0 (+https://growth.cossanexusholdings.co.za)",
          },
          redirect: "follow",
        },
        PAGE_TIMEOUT_MS,
      );

    if (!response.ok) {
      return {
        url: sourceUrl,
        finalUrl:
          response.url || sourceUrl,
        title: null,
        text: "",
        emails: [],
        phones: [],
        contactPageUrl: null,
        inspectedAt,
        fetchSucceeded: false,
      };
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType.includes(
        "text/html",
      )
    ) {
      return {
        url: sourceUrl,
        finalUrl:
          response.url || sourceUrl,
        title: null,
        text: "",
        emails: [],
        phones: [],
        contactPageUrl: null,
        inspectedAt,
        fetchSucceeded: false,
      };
    }

    const html =
      await response.text();

    const text =
      htmlToText(html);

    return {
      url: sourceUrl,
      finalUrl:
        response.url || sourceUrl,
      title:
        extractHtmlTitle(html),
      text,
      emails:
        extractEmails(text),
      phones:
        extractPhones(text),
      contactPageUrl:
        findContactPageUrl(
          html,
          response.url || sourceUrl,
        ),
      inspectedAt,
      fetchSucceeded: true,
    };
  } catch {
    return {
      url: sourceUrl,
      finalUrl: sourceUrl,
      title: null,
      text: "",
      emails: [],
      phones: [],
      contactPageUrl: null,
      inspectedAt,
      fetchSucceeded: false,
    };
  }
}

function isGovernmentSource(
  url: string,
): boolean {
  const hostname =
    getHostname(url);

  return (
    hostname.endsWith(".gov.za") ||
    HIGH_TRUST_GOVERNMENT_DOMAINS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(
          `.${domain}`,
        ),
    )
  );
}

function isDirectorySource(
  url: string,
  content: string,
): boolean {
  const hostname =
    getHostname(url);

  return (
    DIRECTORY_HOST_PATTERNS.some(
      (pattern) =>
        hostname.includes(pattern),
    ) ||
    DIRECTORY_TEXT_PATTERN.test(
      content,
    )
  );
}

function inferOrganisationName(
  candidate: SearchCandidate,
  inspection: PageInspection,
): string {
  const source =
    inspection.title ||
    candidate.title ||
    getHostname(candidate.url);

  const cleaned = decodeHtmlEntities(source)
    .replace(
      /\s+[|–—-]\s+.*$/,
      "",
    )
    .replace(
      /\b(home|contact us|about us|tenders?|rfq|rfp|official website)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return (
    cleaned ||
    getHostname(candidate.url)
  );
}

function inferSector(
  candidate: SearchCandidate,
):
  | "private"
  | "government"
  | "nonprofit" {
  const hostname =
    getHostname(candidate.url);

  const combined =
    `${candidate.title} ${candidate.snippet} ${candidate.url}`.toLowerCase();

  if (
    hostname.endsWith(".gov.za") ||
    hostname.includes(
      "etenders.gov.za",
    ) ||
    hostname.includes(
      "treasury.gov.za",
    )
  ) {
    return "government";
  }

  if (
    /\b(church|ministry|nonprofit|non-profit|charity|ngo|community centre|foundation)\b/i.test(
      combined,
    )
  ) {
    return "nonprofit";
  }

  return "private";
}

function detectCompetitorServices(
  request: LeadHunterSearchRequest,
  content: string,
): LeadHunterServiceCategory[] {
  const matches:
    LeadHunterServiceCategory[] = [];

  for (const service of request.services) {
    const patterns =
      competitorPatternsForService(
        service,
      );

    if (
      patterns.some((pattern) =>
        pattern.test(content),
      ) &&
      SERVICE_OFFERING_PATTERN.test(
        content,
      )
    ) {
      matches.push(service);
    }
  }

  return [...new Set(matches)];
}

function inferBuyerRole(
  service: LeadHunterServiceCategory,
  content: string,
): string | null {
  const publicRoleMatch =
    content.match(
      PUBLIC_BUYER_ROLE_PATTERN,
    );

  if (publicRoleMatch?.[0]) {
    return publicRoleMatch[0]
      .replace(/\b\w/g, (letter) =>
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

    seo:
      "Business Owner or Marketing Manager",

    digital_marketing:
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

  return roles[service] ?? null;
}

function sourceTrustScore(
  candidate: SearchCandidate,
  inspection: PageInspection,
): number {
  const hostname =
    getHostname(candidate.url);

  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 5000)}`;

  if (
    isGovernmentSource(candidate.url)
  ) {
    return 95;
  }

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
    )
  ) {
    return 30;
  }

  if (
    inspection.fetchSucceeded &&
    hostname &&
    (
      inspection.contactPageUrl ||
      inspection.emails.length > 0 ||
      inspection.phones.length > 0
    )
  ) {
    return 80;
  }

  if (
    inspection.fetchSucceeded
  ) {
    return 65;
  }

  return 45;
}

function assessCandidate({
  request,
  candidate,
  inspection,
}: {
  request: LeadHunterSearchRequest;
  candidate: SearchCandidate;
  inspection: PageInspection;
}): CandidateAssessment {
  const combined =
    `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${inspection.text.slice(0, 10_000)}`;

  const reasons: string[] = [];

  const sourceTrust =
    sourceTrustScore(
      candidate,
      inspection,
    );

  const competitorForServices =
    detectCompetitorServices(
      request,
      combined,
    );

  const directory =
    isDirectorySource(
      candidate.url,
      combined,
    );

  const informational =
    INFORMATIONAL_PAGE_PATTERN.test(
      combined,
    ) &&
    !PROCUREMENT_PATTERN.test(combined);

  const activeProcurement =
    PROCUREMENT_PATTERN.test(
      combined,
    );

  const supplierRegistration =
    SUPPLIER_REGISTRATION_PATTERN.test(
      combined,
    );

  const explicitBuyerNeed =
    BUYER_NEED_PATTERN.test(
      combined,
    );

  const expansionSignal =
    EXPANSION_PATTERN.test(
      combined,
    );

  const offersSameService =
    competitorForServices.length > 0;

  const probableBuyerRole =
    inferBuyerRole(
      candidate.searchedService,
      combined,
    );

  if (directory) {
    reasons.push(
      "The page appears to be a directory or aggregator rather than one buyer organisation.",
    );

    return {
      disposition: "directory",
      buyerFit: 5,
      sourceTrust,
      reasons,
      probableBuyerRole: null,
      competitorForServices,
    };
  }

  if (informational) {
    reasons.push(
      "The page appears informational, educational or career-related and does not prove procurement demand.",
    );

    return {
      disposition: "informational",
      buyerFit: 5,
      sourceTrust,
      reasons,
      probableBuyerRole: null,
      competitorForServices,
    };
  }

  if (
    activeProcurement &&
    (
      isGovernmentSource(
        candidate.url,
      ) ||
      candidate.purpose ===
        "active_procurement"
    )
  ) {
    reasons.push(
      "The source contains formal procurement language.",
    );

    return {
      disposition:
        "active_opportunity",
      buyerFit: 95,
      sourceTrust,
      reasons,
      probableBuyerRole:
        "Procurement or Supply Chain Management",
      competitorForServices,
    };
  }

  if (supplierRegistration) {
    reasons.push(
      "The source contains a supplier-registration or vendor-database signal.",
    );

    return {
      disposition:
        "supplier_opportunity",
      buyerFit: 85,
      sourceTrust,
      reasons,
      probableBuyerRole:
        "Procurement or Supply Chain Management",
      competitorForServices,
    };
  }

  if (
    offersSameService &&
    !explicitBuyerNeed
  ) {
    reasons.push(
      "The organisation appears to sell the same service Cossa is trying to offer.",
    );

    reasons.push(
      "No separate buying or procurement signal was found.",
    );

    return {
      disposition: "competitor",
      buyerFit: 10,
      sourceTrust,
      reasons,
      probableBuyerRole: null,
      competitorForServices,
    };
  }

  if (
    explicitBuyerNeed ||
    expansionSignal
  ) {
    reasons.push(
      explicitBuyerNeed
        ? "A public buying, appointment, contract or service requirement was detected."
        : "A public expansion or development signal was detected.",
    );

    return {
      disposition:
        "active_opportunity",
      buyerFit:
        explicitBuyerNeed ? 85 : 72,
      sourceTrust,
      reasons,
      probableBuyerRole,
      competitorForServices,
    };
  }

  const targetMatch =
    lowerText(combined).includes(
      candidate.targetDescription.toLowerCase(),
    );

  if (
    candidate.purpose ===
      "buyer_discovery" &&
    targetMatch &&
    !offersSameService
  ) {
    reasons.push(
      `The organisation matches the selected buyer category: ${candidate.targetDescription}.`,
    );

    reasons.push(
      "No active procurement event was proven; treat this as a potential buyer, not a confirmed opportunity.",
    );

    return {
      disposition: "buyer",
      buyerFit: 65,
      sourceTrust,
      reasons,
      probableBuyerRole,
      competitorForServices,
    };
  }

  if (
    offersSameService &&
    explicitBuyerNeed
  ) {
    reasons.push(
      "The organisation may be both a supplier and a potential subcontracting or partnership route.",
    );

    return {
      disposition: "partner",
      buyerFit: 45,
      sourceTrust,
      reasons,
      probableBuyerRole:
        "Operations or Subcontracting Manager",
      competitorForServices,
    };
  }

  reasons.push(
    "The source did not prove that this organisation is a suitable buyer or active opportunity.",
  );

  return {
    disposition: "irrelevant",
    buyerFit: 15,
    sourceTrust,
    reasons,
    probableBuyerRole,
    competitorForServices,
  };
}

function inferSignal(
  candidate: SearchCandidate,
  inspection: PageInspection,
  assessment: CandidateAssessment,
): ProspectSignal {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;

  let type: ProspectSignalType =
    "general_fit";

  let title =
    "Potential buyer-fit signal";

  let confidence = 40;

  if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(request for quotation|\bRFQ\b)\b/i.test(
      searchable,
    )
  ) {
    type = "request_for_quote";
    title =
      "Request for quotation";
    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 94
        : 82;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(request for proposal|\bRFP\b)\b/i.test(
      searchable,
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
        : 82;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    PROCUREMENT_PATTERN.test(
      searchable,
    )
  ) {
    type = "active_tender";
    title =
      "Tender or formal procurement notice";
    confidence =
      isGovernmentSource(
        candidate.url,
      )
        ? 95
        : 78;
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
        : 78;
  } else if (
    EXPANSION_PATTERN.test(
      searchable,
    )
  ) {
    type =
      "business_expansion";
    title =
      "Business expansion or development";
    confidence = 72;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(maintenance contract|maintenance required|repair works|minor works|refurbishment|renovation project|upgrade project)\b/i.test(
      searchable,
    )
  ) {
    type =
      "maintenance_need";
    title =
      "Maintenance or upgrade requirement";
    confidence = 75;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(cleaning contract|cleaning services required|appointment of.*cleaning|procurement of.*cleaning)\b/i.test(
      searchable,
    )
  ) {
    type = "cleaning_need";
    title =
      "Cleaning-service requirement";
    confidence = 78;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(website redesign required|website development tender|digital platform required|online portal development)\b/i.test(
      searchable,
    )
  ) {
    type =
      "technology_need";
    title =
      "Technology or website requirement";
    confidence = 76;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    type = "general_fit";
    title =
      "Potential buyer-category fit";
    confidence = 48;
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

function chooseRecommendedService(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  assessment: CandidateAssessment,
): LeadHunterServiceCategory {
  if (
    request.services.includes(
      candidate.searchedService,
    )
  ) {
    return candidate.searchedService;
  }

  const searchable =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;

  const patterns: Array<{
    service: LeadHunterServiceCategory;
    pattern: RegExp;
  }> = [
    {
      service:
        "commercial_cleaning",
      pattern:
        /\b(cleaning contract|cleaning services required|appointment of.*cleaning|janitorial contract)\b/i,
    },
    {
      service:
        "facility_management",
      pattern:
        /\b(facility management|facilities management)\b/i,
    },
    {
      service:
        "property_maintenance",
      pattern:
        /\b(maintenance contract|repair works|property maintenance|minor works)\b/i,
    },
    {
      service: "renovation",
      pattern:
        /\b(renovation project|refurbishment|building upgrade)\b/i,
    },
    {
      service: "painting",
      pattern:
        /\b(painting works|repainting project)\b/i,
    },
    {
      service: "roofing",
      pattern:
        /\b(roof replacement|roof repairs?|roofing works)\b/i,
    },
    {
      service:
        "website_design",
      pattern:
        /\b(website development|website redesign|web portal development)\b/i,
    },
    {
      service:
        "digital_marketing",
      pattern:
        /\b(marketing services required|digital marketing tender|social media management contract)\b/i,
    },
    {
      service: "seo",
      pattern:
        /\b(search engine optimisation|search engine optimization|\bSEO\b)\b/i,
    },
    {
      service:
        "ai_automation",
      pattern:
        /\b(automation system|artificial intelligence solution|workflow automation)\b/i,
    },
    {
      service:
        "business_documents",
      pattern:
        /\b(document management|proposal system|quotation system|contract management)\b/i,
    },
    {
      service: "construction",
      pattern:
        /\b(construction works|building works|civil works)\b/i,
    },
  ];

  for (const item of patterns) {
    if (
      request.services.includes(
        item.service,
      ) &&
      item.pattern.test(searchable)
    ) {
      return item.service;
    }
  }

  if (
    assessment.competitorForServices.length >
    0
  ) {
    return (
      assessment.competitorForServices[0]
    );
  }

  return (
    request.services[0] ?? "general"
  );
}

function recommendedCompanyForService(
  service: LeadHunterServiceCategory,
  allowedCompanies: LeadHunterCompany[],
): LeadHunterCompany {
  const preferred: Record<
    string,
    LeadHunterCompany
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
    seo:
      "cossa_tech",
    crm:
      "cossa_tech",
    ai_automation:
      "cossa_tech",
    ecommerce:
      "cossa_tech",

    digital_marketing:
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

  const company =
    preferred[service] ??
    "cossa_nexus_holdings";

  if (
    allowedCompanies.includes(
      company,
    )
  ) {
    return company;
  }

  return (
    allowedCompanies[0] ??
    "cossa_nexus_holdings"
  );
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
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 5000)}`.toLowerCase();

  const matchedLocation =
    request.locations.find(
      (location) =>
        searchable.includes(
          location.toLowerCase(),
        ),
    ) ?? null;

  const provinces = [
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

  const province =
    provinces.find(
      (item) =>
        searchable.includes(
          item.toLowerCase(),
        ),
    ) ??
    (matchedLocation === "Gauteng"
      ? "Gauteng"
      : null);

  return {
    city:
      matchedLocation &&
      !provinces.includes(
        matchedLocation,
      )
        ? matchedLocation
        : null,
    province,
  };
}

function calculateScores({
  candidate,
  inspection,
  signal,
  assessment,
}: {
  candidate: SearchCandidate;
  inspection: PageInspection;
  signal: ProspectSignal;
  assessment: CandidateAssessment;
}): ScoreBreakdown {
  const hasPhone =
    inspection.phones.length > 0;

  const hasEmail =
    inspection.emails.length > 0;

  const hasContactPage =
    Boolean(
      inspection.contactPageUrl,
    );

  const rejectedDisposition = [
    "competitor",
    "directory",
    "informational",
    "irrelevant",
  ].includes(
    assessment.disposition,
  );

  const fitScore =
    rejectedDisposition
      ? clampScore(
          assessment.buyerFit,
        )
      : clampScore(
          assessment.buyerFit * 0.75 +
            candidate.tavilyScore *
              20 +
            assessment.sourceTrust *
              0.05,
        );

  let intentBase = 18;

  if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    intentBase = [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
      ? 92
      : 76;
  } else if (
    assessment.disposition ===
      "supplier_opportunity"
  ) {
    intentBase = 72;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    intentBase = 32;
  } else if (
    assessment.disposition ===
      "partner"
  ) {
    intentBase = 38;
  } else {
    intentBase = 5;
  }

  const intentScore =
    clampScore(
      intentBase +
        signal.confidence * 0.08,
    );

  const evidenceScore =
    clampScore(
      assessment.sourceTrust *
        0.7 +
        (inspection.fetchSucceeded
          ? 15
          : 0) +
        (
          hasPhone ||
          hasEmail ||
          hasContactPage
            ? 10
            : 0
        ),
    );

  let timingScore = 25;

  if (
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
  ) {
    timingScore = 92;
  } else if (
    signal.type ===
    "supplier_registration"
  ) {
    timingScore = 72;
  } else if (
    signal.type ===
      "business_expansion" ||
    signal.type ===
      "new_branch"
  ) {
    timingScore = 68;
  } else if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    timingScore = 65;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    timingScore = 35;
  }

  const contactabilityScore =
    clampScore(
      (hasPhone ? 40 : 0) +
        (hasEmail ? 35 : 0) +
        (hasContactPage ? 20 : 0) +
        (
          assessment.probableBuyerRole
            ? 5
            : 0
        ),
    );

  let totalScore = clampScore(
    fitScore * 0.28 +
      intentScore * 0.26 +
      evidenceScore * 0.2 +
      timingScore * 0.14 +
      contactabilityScore * 0.12,
  );

  if (
    assessment.disposition ===
      "buyer"
  ) {
    totalScore = Math.min(
      totalScore,
      74,
    );
  }

  if (
    assessment.disposition ===
      "partner"
  ) {
    totalScore = Math.min(
      totalScore,
      55,
    );
  }

  if (rejectedDisposition) {
    totalScore = Math.min(
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

function inferOpportunitySize(
  signal: ProspectSignal,
  sector:
    | "private"
    | "government"
    | "nonprofit",
  candidate: SearchCandidate,
): OpportunitySize {
  const searchable =
    `${candidate.title} ${candidate.snippet}`.toLowerCase();

  if (
    /\b(framework agreement|framework contract|multi-year|national|province-wide|major works|large-scale|multi-site)\b/i.test(
      searchable,
    )
  ) {
    return "strategic";
  }

  if (
    sector === "government" &&
    [
      "active_tender",
      "request_for_proposal",
    ].includes(signal.type)
  ) {
    return "large";
  }

  if (
    /\b(minor works|small works|quotation|rfq|repair|once-off)\b/i.test(
      searchable,
    )
  ) {
    return "small";
  }

  if (
    signal.type ===
    "supplier_registration"
  ) {
    return "unknown";
  }

  return "unknown";
}

function classifyProspect(
  assessment: CandidateAssessment,
  signal: ProspectSignal,
  totalScore: number,
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
    ].includes(signal.type)
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

  if (totalScore >= 62) {
    return "qualified_prospect";
  }

  return "prospect";
}

function evidenceTypeForCandidate(
  candidate: SearchCandidate,
  signal: ProspectSignal,
  assessment: CandidateAssessment,
): EvidenceType {
  if (
    isGovernmentSource(
      candidate.url,
    )
  ) {
    if (
      [
        "active_tender",
        "request_for_quote",
        "request_for_proposal",
      ].includes(signal.type)
    ) {
      return "tender_notice";
    }

    return "government_portal";
  }

  if (
    assessment.disposition ===
      "directory"
  ) {
    return "company_directory";
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

function createProspect({
  request,
  candidate,
  inspection,
}: {
  request: LeadHunterSearchRequest;
  candidate: SearchCandidate;
  inspection: PageInspection;
}): LeadHunterProspect {
  const assessment =
    assessCandidate({
      request,
      candidate,
      inspection,
    });

  const sector =
    inferSector(candidate);

  const signal =
    inferSignal(
      candidate,
      inspection,
      assessment,
    );

  const service =
    chooseRecommendedService(
      request,
      candidate,
      inspection,
      assessment,
    );

  const company =
    recommendedCompanyForService(
      service,
      request.companies,
    );

  const scores =
    calculateScores({
      candidate,
      inspection,
      signal,
      assessment,
    });

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

  const evidence:
    ProspectEvidence[] = [
    {
      type:
        evidenceTypeForCandidate(
          candidate,
          signal,
          assessment,
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
      ],
    },
  ];

  if (
    inspection.contactPageUrl &&
    inspection.contactPageUrl !==
      candidate.url
  ) {
    evidence.push({
      type: "contact_page",
      title:
        `${organisationName} public contact page`,
      url:
        inspection.contactPageUrl,
      publisher:
        getHostname(
          inspection.contactPageUrl,
        ) || null,
      published_at: null,
      checked_at:
        inspection.inspectedAt,
      excerpt:
        "Public contact route discovered on the organisation website.",
      supports: [
        "public contact route",
      ],
    });
  }

  const hasContact =
    inspection.phones.length > 0 ||
    inspection.emails.length > 0;

  const rejected =
    [
      "competitor",
      "directory",
      "informational",
      "irrelevant",
    ].includes(
      assessment.disposition,
    );

  const verificationStatus =
    rejected
      ? "rejected"
      : (
          evidence.length >= 2 &&
          hasContact &&
          scores.evidenceScore >= 70
        )
        ? "verified"
        : "partially_verified";

  const opportunitySize =
    inferOpportunitySize(
      signal,
      sector,
      candidate,
    );

  const classification =
    classifyProspect(
      assessment,
      signal,
      scores.totalScore,
    );

  const activeOpportunity =
    assessment.disposition ===
      "active_opportunity";

  const buyerOnly =
    assessment.disposition ===
      "buyer";

  const decisionMakerRoute =
    sector === "government"
      ? "Use the official procurement or Supply Chain Management contact in the bid documentation. Confirm the tender number, closing date, submission method and eligibility before acting."
      : assessment.probableBuyerRole
        ? `Request the ${assessment.probableBuyerRole} through the organisation’s verified public contact channel.`
        : hasContact
          ? "Use the verified public business contact and request the person responsible for procurement, facilities, operations, property, marketing or technology."
          : "A public decision-maker route still requires verification.";

  const serviceFitReason =
    activeOpportunity
      ? `${organisationName} has a public signal that may indicate a current requirement for ${serviceLabel(service)}. The source must still be opened and checked before outreach or bidding.`
      : buyerOnly
        ? `${organisationName} matches a buyer category that commonly purchases ${serviceLabel(service)}. No active buying request has been proven, so this is a prospecting lead rather than a confirmed opportunity.`
        : assessment.reasons.join(" ");

  const nextAction =
    rejected
      ? `Do not save this result as a customer lead. Reason: ${assessment.reasons.join(" ")}`
      : sector === "government"
        ? "Open the official notice. Confirm that it is still active, then record the tender or RFQ number, closing date, compulsory briefing, CIDB grading, CSD requirements, submission method and bid/no-bid decision."
        : activeOpportunity
          ? `Open the evidence source and verify the requirement. Then contact the ${assessment.probableBuyerRole ?? "relevant decision-maker"} using a personalised, evidence-based approach after human approval.`
          : `Verify the organisation and contact route. Research one specific pain point before preparing outreach to the ${assessment.probableBuyerRole ?? "relevant decision-maker"}.`;

  const outreachAngle =
    rejected ||
    sector === "government"
      ? null
      : activeOpportunity
        ? `Reference the specific public requirement or expansion signal. Offer a short discovery call or site assessment without claiming that the organisation requested contact from Cossa.`
        : `Introduce Cossa briefly, explain one relevant outcome for organisations of this type, and offer a low-friction next step such as a site assessment, website review or short needs discussion.`;

  return {
    id:
      crypto.randomUUID(),

    organisation_name:
      organisationName,

    trading_name: null,

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

    contact_name: null,

    contact_title:
      assessment.probableBuyerRole,

    decision_maker_route:
      decisionMakerRoute,

    address: null,
    suburb: null,
    city:
      location.city,
    province:
      location.province,
    country:
      "South Africa",

    recommended_company:
      company,

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

    estimated_value: null,

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

    signals: [signal],

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
      "Tavily",

    raw_provider_result_id:
      null,
  };
}

function prospectKey(
  prospect: LeadHunterProspect,
): string {
  const domain =
    prospect.website
      ? rootDomainKey(
          prospect.website,
        )
      : "";

  return (
    domain ||
    prospect.organisation_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  );
}

function filterProspects(
  prospects: LeadHunterProspect[],
  request: LeadHunterSearchRequest,
): LeadHunterProspect[] {
  const unique =
    new Map<
      string,
      LeadHunterProspect
    >();

  for (const prospect of prospects) {
    if (
      prospect.verification_status ===
        "rejected" ||
      prospect.classification ===
        "rejected"
    ) {
      continue;
    }

    const key =
      prospectKey(prospect);

    if (!key) {
      continue;
    }

    const hasContact =
      Boolean(
        prospect.public_phone ||
        prospect.public_email,
      );

    if (
      request.require_public_phone_or_email &&
      !hasContact
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

    const existing =
      unique.get(key);

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

  return [...unique.values()]
    .sort(
      (first, second) => {
        const firstActive =
          first.classification ===
            "active_opportunity" ||
          first.classification ===
            "tender" ||
          first.classification ===
            "supplier_opportunity";

        const secondActive =
          second.classification ===
            "active_opportunity" ||
          second.classification ===
            "tender" ||
          second.classification ===
            "supplier_opportunity";

        if (
          firstActive !== secondActive
        ) {
          return Number(secondActive) -
            Number(firstActive);
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

          if (!environment) {
            return new Response(
              "Lead Hunter is not configured. Add TAVILY_API_KEY and the Supabase environment variables in Vercel.",
              {
                status: 503,
              },
            );
          }

          const token =
            getBearerToken(request);

          if (!token) {
            return new Response(
              "Unauthorized",
              {
                status: 401,
              },
            );
          }

          const user =
            await verifySupabaseUser({
              token,
              supabaseUrl:
                environment.supabaseUrl,
              supabaseKey:
                environment.supabaseKey,
            });

          if (!user) {
            return new Response(
              "Your session could not be verified. Sign out and sign in again.",
              {
                status: 401,
              },
            );
          }

          const member =
            await verifyOrganisationMembership({
              token,
              userId: user.id,
              organisationId:
                environment.organisationId,
              supabaseUrl:
                environment.supabaseUrl,
              supabaseKey:
                environment.supabaseKey,
            });

          if (!member) {
            return new Response(
              "You are not authorised to use the Cossa Lead Hunter.",
              {
                status: 403,
              },
            );
          }

          const rateLimit =
            enforceRateLimit(
              user.id,
            );

          if (!rateLimit.allowed) {
            return new Response(
              `Lead Hunter rate limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
              {
                status: 429,
                headers: {
                  "Retry-After":
                    String(
                      rateLimit.retryAfterSeconds,
                    ),
                },
              },
            );
          }

          let rawPayload: unknown;

          try {
            rawPayload =
              await request.json();
          } catch {
            return new Response(
              "Invalid JSON body.",
              {
                status: 400,
              },
            );
          }

          const validation =
            validateRequest(
              rawPayload,
            );

          if (!validation.valid) {
            return new Response(
              validation.error,
              {
                status: 400,
              },
            );
          }

          const searchRequest =
            validation.request;

          const searchPlans =
            createSearchQueries(
              searchRequest,
            );

          if (
            searchPlans.length === 0
          ) {
            return new Response(
              "No valid search plans could be generated from this hunt.",
              {
                status: 400,
              },
            );
          }

          const searchedAt =
            new Date().toISOString();

          const warnings: string[] =
            [];

          const providerResults =
            await Promise.allSettled(
              searchPlans.map(
                (plan) =>
                  tavilySearch({
                    plan,
                    apiKey:
                      environment.tavilyApiKey,
                  }),
              ),
            );

          const candidates:
            SearchCandidate[] = [];

          for (
            let index = 0;
            index <
            providerResults.length;
            index += 1
          ) {
            const result =
              providerResults[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              candidates.push(
                ...result.value,
              );
            } else {
              warnings.push(
                `Search failed for: ${searchPlans[index]?.query ?? "unknown query"}`,
              );

              console.error(
                "Lead Hunter provider error:",
                result.reason,
              );
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
            const emptyResponse:
              LeadHunterSearchResponse =
              {
                hunt_id:
                  crypto.randomUUID(),
                status: "completed",
                searched_at:
                  searchedAt,
                completed_at:
                  new Date().toISOString(),
                request:
                  searchRequest,
                prospects: [],
                source_count: 0,
                accepted_count: 0,
                rejected_count: 0,
                warnings: [
                  ...warnings,
                  "No public search results matched this hunt. Broaden the location, buyer type or service filters.",
                ],
                providers_used: [
                  "Tavily",
                ],
              };

            return Response.json(
              emptyResponse,
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
                (candidate) =>
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
                createProspect({
                  request:
                    searchRequest,
                  candidate,
                  inspection:
                    inspections[index],
                }),
            );

          const acceptedProspects =
            filterProspects(
              rawProspects,
              searchRequest,
            );

          const rejectedCompetitors =
            rawProspects.filter(
              (prospect) =>
                prospect.rejection_reasons.some(
                  (reason) =>
                    reason
                      .toLowerCase()
                      .includes(
                        "same service",
                      ),
                ),
            ).length;

          const rejectedDirectories =
            rawProspects.filter(
              (prospect) =>
                prospect.rejection_reasons.some(
                  (reason) =>
                    reason
                      .toLowerCase()
                      .includes(
                        "directory",
                      ),
                ),
            ).length;

          const rejectedInformational =
            rawProspects.filter(
              (prospect) =>
                prospect.rejection_reasons.some(
                  (reason) =>
                    reason
                      .toLowerCase()
                      .includes(
                        "informational",
                      ),
                ),
            ).length;

          const responsePayload:
            LeadHunterSearchResponse =
            {
              hunt_id:
                crypto.randomUUID(),

              status: "completed",

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
                ...warnings,

                `Quality control rejected ${rejectedCompetitors} apparent competitors, ${rejectedDirectories} directories or aggregators, and ${rejectedInformational} informational pages.`,

                ...(acceptedProspects.length ===
                0
                  ? [
                      "Search results were found, but none met the buyer-fit, evidence, intent and score requirements.",
                    ]
                  : []),

                "A qualified prospect is not automatically an active buyer. Only records with supported procurement, expansion or service-requirement evidence should be treated as active opportunities.",

                "Public contact details must be used only for lawful, relevant and respectful business outreach.",

                "Human verification is required before outreach, quotation preparation, tender submission or commitment.",
              ],

              providers_used: [
                "Tavily",

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