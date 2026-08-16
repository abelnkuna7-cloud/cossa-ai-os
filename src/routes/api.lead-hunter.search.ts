import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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

/* -------------------------------------------------------------------------- */
/*                                CONFIGURATION                               */
/* -------------------------------------------------------------------------- */

const DEFAULT_COSSA_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const NEWS_API_URL = "https://newsapi.org/v2/everything";
const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

const MAX_REQUEST_RESULTS = 50;
const MAX_SEARCH_QUERIES = 12;
const MAX_RESULTS_PER_QUERY = 10;

const MAX_SOURCE_PAGES_TO_INSPECT = 40;
const MAX_SOURCE_CONTENT_LENGTH = 30_000;
const MAX_HTML_RESPONSE_BYTES = 1_500_000;

const MAX_REDIRECTS = 5;
const MAX_CONTACT_PAGES_PER_SOURCE = 1;

const SEARCH_TIMEOUT_MS = 25_000;
const PAGE_TIMEOUT_MS = 12_000;
const GROQ_TIMEOUT_MS = 22_000;

const SOURCE_INSPECTION_CONCURRENCY = 6;
const GROQ_CONCURRENCY = 3;
const MAX_GROQ_INTERPRETATIONS = 14;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 5;

const MAX_CACHED_SEARCH_PLANS = 60;
const MAX_CACHED_SEARCH_AGE_MS = 168 * 60 * 60 * 1_000;

const SEARCH_DEPTH_QUERY_BUDGETS = {
  economy: 3,
  standard: 5,
  deep: 8,
} as const;

/* -------------------------------------------------------------------------- */
/*                                VALID VALUES                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                SOURCE RULES                                */
/* -------------------------------------------------------------------------- */

const PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "youtube.com",
];

const SEARCH_QUERY_DOMAIN_EXCLUSIONS = PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE.map(
  (domain) => `-site:${domain}`,
).join(" ");

const COSSA_FIRST_PARTY_DOMAINS = ["cossanexusholdings.co.za"];

const COSSA_FIRST_PARTY_NAME_PATTERN =
  /\b(?:cossa nexus(?: holdings| construction)?|cossa facility services|cossa tech|cossa ai growth|cossa store|nexdocs)\b/i;

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

const OFFICIAL_PUBLIC_ENTITY_DOMAINS = [
  "sabs.co.za",
  "sanral.co.za",
  "eskom.co.za",
  "transnet.net",
  "prasa.com",
];

const PUBLIC_HIGHER_EDUCATION_DOMAINS = [
  "cput.ac.za",
  "cut.ac.za",
  "dut.ac.za",
  "mandela.ac.za",
  "mut.ac.za",
  "nwu.ac.za",
  "ru.ac.za",
  "smu.ac.za",
  "spu.ac.za",
  "sun.ac.za",
  "tut.ac.za",
  "uct.ac.za",
  "ufh.ac.za",
  "ufs.ac.za",
  "uj.ac.za",
  "ukzn.ac.za",
  "ul.ac.za",
  "ump.ac.za",
  "unisa.ac.za",
  "univen.ac.za",
  "unizulu.ac.za",
  "up.ac.za",
  "uwc.ac.za",
  "vut.ac.za",
  "wits.ac.za",
  "wsu.ac.za",
];

const PUBLIC_SCHOOL_PATTERN =
  /\b(?:public school|section\s+21\s+public\s+school|(?:gauteng|provincial)\s+department\s+of\s+education|department\s+of\s+basic\s+education|school\s+governing\s+body|\bsgb\b)\b/i;

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
  /\b(directory|business listings?|find the best|top \d+|compare quotes?|submit a request|get \d+ quotes?|service providers? near me|browse companies|popular listings?|(?:list|database) of (?:[\w&-]+\s+){0,6}(?:companies|businesses|providers|suppliers)|(?:companies|businesses|providers|suppliers) by (?:city|industry|location|province)|top (?:[\w&-]+\s+){0,4}(?:companies|businesses|providers|suppliers))\b/i;

const INFORMATIONAL_PAGE_PATTERN =
  /\b(career guide|careers?|qualification|registered qualifications?|learnership|course|training programme|employment opportunities|recommended subjects|blog|useful information|industry overview|what is|how to become|guide to|tips for choosing|industry trends?|market overview)\b/i;

const RECRUITMENT_OR_JOB_SOURCE_PATTERN =
  /\b(?:recruitment (?:agency|company|firm|services?)|specialist recruitment|staffing (?:agency|company|services?|solutions)|employment agency|job (?:board|portal|vacancies|listings?)|submit your cv|find talent|find a job|career placement)\b/i;

const RECRUITMENT_HOST_PATTERNS = [
  "werkie",
  "bebee",
  "careers24",
  "careerjunction",
  "jobmail",
  "pnet",
  "indeed",
  "glassdoor",
  "talent.com",
  "adzuna",
  "jobrapido",
  "jobisjob",
  "jobleads",
  "executiveplacements",
];

const VACANCY_LISTING_PATTERN =
  /\b(?:vacanc(?:y|ies)|position available|job description|job title|apply (?:now|for (?:this|the) job)|salary(?:\s+range)?|our client is (?:a|an)|employment type|minimum requirements?)\b/i;

const REGULATORY_OR_FORUM_PAGE_PATTERN =
  /\b(?:SANS\s*10400|national building regulations?|building regulations?|planning permission|regulatory (?:guidance|requirement|advice)|compliance (?:guide|advice)|frequently asked questions?|\bFAQ\b|questions? (?:and|&) answers?|\bQ\s*&\s*A\b|discussion forum|community forum|ask (?:an?|the) (?:architect|expert|builder))\b/i;

const EVENT_OR_TRADE_SHOW_PATTERN =
  /\b(?:expo|exhibition|trade\s*show|exhibitor|conference|event\s+schedule|event\s+calendar)\b/i;

/* -------------------------------------------------------------------------- */
/*                             PROCUREMENT PATTERNS                           */
/* -------------------------------------------------------------------------- */

const PROCUREMENT_PATTERN =
  /\b(?:request for quotation|request for proposal|invitation to bid|invitation to tender|request for bid|request for tender|\bRFQ\b|\bRFP\b|\bRFB\b|\bRFT\b|tender number|tender no\.?|bid number|bid no\.?|closing date|compulsory briefing|non-compulsory briefing|submission deadline|procurement notice|bid invitation|quotation invitation)\b/i;

const SUPPLIER_REGISTRATION_PATTERN =
  /\b(?:supplier registration|supplier database|vendor registration|register as a supplier|supplier invitation|expression of interest|call for suppliers|supplier panel|vendor database|panel of suppliers|approved supplier list)\b/i;

const PARTNERSHIP_PATTERN =
  /\b(?:subcontractors? required|subcontractors? wanted|subcontractor registration|subcontracting opportunit(?:y|ies)|seeking subcontractors?|looking for subcontractors?|appoint(?:ment|ing) of subcontractors?|partner(?:ship)? opportunit(?:y|ies)|strategic partner(?:ship)?|seeking partners?|service-provider panel|panel of service providers|contractor panel|supplier panel|expression of interest from contractors?|call for contractors?)\b/i;

const EXPANSION_PATTERN =
  /\b(?:new branch|opening soon|new development|expansion|new premises|new office|new warehouse|new facility|relocation|property development|construction underway|development approved|capital project|infrastructure programme|new site|new store|new location|facility expansion|new campus|new clinic|new plant)\b/i;

const STRONG_BUYER_NEED_PATTERN =
  /\b(?:seeking (?:a |an )?(?:contractor|supplier|service provider|company)|requires? (?:a |an )?(?:contractor|supplier|service provider)|appoint(?:ment|ing) of (?:a |an )?(?:contractor|supplier|service provider)|looking for (?:a |an )?(?:contractor|supplier|service provider)|invites? (?:quotations?|proposals?|bids?|tenders?|service providers?|contractors?|suppliers?)|procure(?:ment|ing) of|requesting quotations?|requesting proposals?|contract for|service provider for|maintenance contract|cleaning contract|upgrade project|renovation project|refurbishment project|building works|minor works|repair works|panel of service providers|framework agreement|scope of works?|works required|services required|appointment of service provider)\b/i;

const PROCUREMENT_AGGREGATOR_PATTERN =
  /\b(?:tender(?:s|ing)? (?:notice|notices|bulletin|listing|list|portal|opportunities)|procurement (?:notice|notices|listing|list|opportunities)|latest (?:tenders?|rfqs?|bids?)|all (?:tenders?|rfqs?|bids?)|weekly tender)\b/i;

/*
 * Supports:
 * RFQ 123/2026
 * RFQ: SCM-04/2026
 * Tender No. ABC/01/2026
 * Bid Number: BID-123-2026
 */
const PROCUREMENT_REFERENCE_PATTERN =
  /\b(?:tender|bid|rfq|rfp|rft|rfb|quotation)\s*(?:number|no\.?|reference|ref\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._-]{1,30}(?:\/[A-Z0-9._-]{1,30})+|[A-Z]{2,}[/-]\d[\w./-]{2,}|[A-Z0-9]{2,}-\d[\w./-]{2,})\b/i;

/*
 * Corrected date regex.
 *
 * IMPORTANT:
 * Regex literals use \s and \d directly, not \\s and \\d.
 */
const PROCUREMENT_DEADLINE_PATTERN =
  /\b(?:closing date|closing(?:\s+time)?|submission deadline|deadline|due date|bids?\s+close|quotations?\s+close|tender\s+closes?)\b[^\n.]{0,140}?\b(?:\d{1,2}[\s/-](?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,/-]+\d{2,4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i;

/* -------------------------------------------------------------------------- */
/*                               SELLER FILTERS                               */
/* -------------------------------------------------------------------------- */

const SERVICE_OFFERING_PATTERN =
  /\b(?:we offer|we provide|our services|call us today|get a free quote|request a free quote|professional services|specialists in|experts in|affordable services|same day service|book our service|our expertise|we specialise|we specialize|we undertake|we deliver|contact us for|our team provides|trusted contractors?|professional contractors?|leading builders?|building services|construction services|renovation services|maintenance services)\b/i;

const CUSTOMER_ACQUISITION_PROVIDER_PATTERN =
  /\b(?:lead[- ]generation|appointment[- ]setting|digital marketing|marketing|advertising|seo|web design|branding|crm|automation|business growth)\s+(?:agency|company|consultancy|consultant|services?)\b|\b(?:we help businesses (?:get|win|find) customers|customer acquisition agency|sales outsourcing)\b/i;

const PUBLIC_BUYER_ROLE_PATTERN =
  /\b(?:procurement manager|supply chain manager|facilities manager|facility manager|property manager|estate manager|operations manager|school principal|administrator|marketing manager|it manager|project manager|business owner|managing director|bid manager|contracts manager|procurement officer|scm manager)\b/i;

const GOVERNMENT_BUYER_PATTERN =
  /\b(?:government|municipality|municipal|department of|provincial|national department|public entity|state[- ]owned|state owned|supply chain management|\bSCM\b|treasury|metropolitan municipality|local municipality|district municipality|SANRAL|merSETA|State Theatre|Eskom|Transnet|PRASA)\b/i;

/* -------------------------------------------------------------------------- */
/*                             DIGITAL AUDIT RULES                            */
/* -------------------------------------------------------------------------- */

const WEBSITE_WEAKNESS_PATTERN =
  /\b(?:outdated website|website redesign|broken website|not mobile friendly|non-mobile|poor mobile experience|missing contact form|no contact form|missing whatsapp|no whatsapp|poor seo|weak seo|website error|under construction website|inactive website)\b/i;

const BRANDING_WEAKNESS_PATTERN =
  /\b(?:outdated logo|weak branding|inconsistent branding|missing logo|poor logo|low quality logo|brand inconsistency|branding redesign|old logo|no brand identity)\b/i;

const MARKETING_WEAKNESS_PATTERN =
  /\b(?:inactive marketing|inactive social media|no recent posts|weak online presence|poor online presence|poor review response|inactive facebook|inactive instagram|weak google business profile|unclaimed google business profile)\b/i;

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

type SearchProvider = "Tavily" | "SerpAPI" | "NewsAPI";

type Environment = {
  tavilyApiKey: string | null;
  serpApiKey: string | null;
  newsApiKey: string | null;
  groqApiKey: string | null;
  groqModel: string;

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
  priority: number;
};

type CandidateCorroboration = {
  provider: SearchProvider;
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  providerScore: number;
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
  corroborations: CandidateCorroboration[];
};

type SearchExecution = {
  provider: SearchProvider;
  candidates: SearchCandidate[];
  warning?: string;
};

type CachedSearchExecution = {
  cachedAt: number;
  results: SearchExecution[];
};

type PersistedSearchCacheRow = {
  cached_at?: unknown;
  expires_at?: unknown;
  search_results?: unknown;
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

  contentType: string | null;
  blockedReason: string | null;

  digitalGapSignals: string[];

  hasViewportMeta: boolean | null;
  hasContactForm: boolean | null;
  hasWhatsAppLink: boolean | null;
  hasMetaDescription: boolean | null;
  hasMeaningfulTitle: boolean | null;
  isHttps: boolean;
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

type CandidateSector = "private" | "government" | "nonprofit";

type ProcurementValidation = {
  hasSelectedService: boolean;
  matchedServices: LeadHunterServiceCategory[];

  hasReference: boolean;
  reference: string | null;

  closingDate: Date | null;
  closingDateText: string | null;

  isExpired: boolean;
  isAmbiguous: boolean;

  isFormalProcurement: boolean;
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

type GroqVerdict =
  | "accept"
  | "reject"
  | "uncertain"
  | "not_interpreted";

type GroqInterpretation = {
  verdict: GroqVerdict;
  confidence: number;
  reason: string | null;
  matchedServices: LeadHunterServiceCategory[];
  signalType: ProspectSignalType | null;
};

type SafeFetchResult = {
  response: Response;
  finalUrl: string;
};

/* -------------------------------------------------------------------------- */
/*                                   CACHE                                    */
/* -------------------------------------------------------------------------- */

const providerSearchCache = new Map<string, CachedSearchExecution>();
const rateLimits = new Map<string, RateLimitEntry>();

/* -------------------------------------------------------------------------- */
/*                                SERVICE MAP                                 */
/* -------------------------------------------------------------------------- */

const SERVICE_LABELS: Record<LeadHunterServiceCategory, string> = {
  construction: "construction services",
  renovation: "renovation services",
  property_maintenance: "property maintenance",
  painting: "painting services",
  tiling: "tiling services",
  ceilings: "ceiling installation and repair",
  roofing: "roofing services",
  plumbing: "plumbing services",

  facility_management: "facility management",
  commercial_cleaning: "commercial cleaning",
  deep_cleaning: "deep cleaning",
  hygiene: "hygiene and sanitation",
  landscaping: "landscaping",
  waste_management: "waste management",

  website_design: "website design",
  logo_design: "logo design",
  branding: "branding services",
  seo: "SEO services",
  digital_marketing: "digital marketing",
  social_media_management: "social media management",
  google_business_profile: "Google Business Profile services",
  lead_generation: "lead generation",
  crm: "CRM implementation",
  ai_automation: "AI and business automation",

  business_documents: "business documents",
  quotations: "quotation systems",
  proposals: "proposal development",
  contracts: "contract document systems",

  ecommerce: "e-commerce services",

  general: "business services",
};

const PHYSICAL_SERVICE_CATEGORIES = new Set<LeadHunterServiceCategory>([
  "construction",
  "renovation",
  "property_maintenance",
  "painting",
  "tiling",
  "ceilings",
  "roofing",
  "plumbing",
  "facility_management",
  "commercial_cleaning",
  "deep_cleaning",
  "hygiene",
  "landscaping",
  "waste_management",
]);

const DIGITAL_AUDIT_SERVICE_CATEGORIES = new Set<LeadHunterServiceCategory>([
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
]);

/* -------------------------------------------------------------------------- */
/*                               LOCATION MAP                                 */
/* -------------------------------------------------------------------------- */

const KNOWN_SOUTH_AFRICAN_CITY_PROVINCES: Record<string, string> = {
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

/* -------------------------------------------------------------------------- */
/*                              GENERIC HELPERS                               */
/* -------------------------------------------------------------------------- */

function cleanText(value: unknown): string | null {
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
    .replace(/&#x27;/gi, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function lowerText(value: unknown): string {
  return cleanText(value)?.toLowerCase() ?? "";
}

function clampScore(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normaliseProviderScore(value: unknown, fallback = 0.5): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(1, parsed))
    : fallback;
}

function cleanArray(value: unknown, maximumItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(cleanText)
        .filter((item): item is string => Boolean(item)),
    ),
  ].slice(0, maximumItems);
}

function serviceLabel(service: LeadHunterServiceCategory): string {
  return SERVICE_LABELS[service] ?? "business services";
}

function isPhysicalService(service: LeadHunterServiceCategory): boolean {
  return PHYSICAL_SERVICE_CATEGORIES.has(service);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const output = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;

      if (current >= items.length) {
        return;
      }

      nextIndex += 1;
      output[current] = await mapper(items[current], current);
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(Math.max(1, concurrency), items.length),
      },
      () => worker(),
    ),
  );

  return output;
}

/* -------------------------------------------------------------------------- */
/*                              ENVIRONMENT                                   */
/* -------------------------------------------------------------------------- */

function getEnvironment(): Environment | null {
  const tavilyApiKey = cleanText(process.env.TAVILY_API_KEY);

  const serpApiKey =
    cleanText(process.env.SERPAPI_API_KEY) ||
    cleanText(process.env.SERP_API_KEY) ||
    cleanText(process.env.SERPAPI_KEY);

  const newsApiKey =
    cleanText(process.env.NEWS_API_KEY) ||
    cleanText(process.env.NEWSAPI_KEY);

  const groqApiKey =
    cleanText(process.env.GROQ_API_KEY) ||
    cleanText(process.env.GROQ_KEY);

  const groqModel =
    cleanText(process.env.GROQ_MODEL) || DEFAULT_GROQ_MODEL;

  const supabaseUrl =
    cleanText(process.env.VITE_SUPABASE_URL) ||
    cleanText(process.env.SUPABASE_URL);

  const supabaseKey =
    cleanText(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    cleanText(process.env.VITE_SUPABASE_ANON_KEY) ||
    cleanText(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    cleanText(process.env.SUPABASE_ANON_KEY);

  const organisationId =
    cleanText(process.env.COSSA_ORGANISATION_ID) ||
    cleanText(process.env.VITE_COSSA_ORGANISATION_ID) ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!tavilyApiKey && !serpApiKey && !newsApiKey) {
    return null;
  }

  return {
    tavilyApiKey,
    serpApiKey,
    newsApiKey,
    groqApiKey,
    groqModel,

    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseKey,
    organisationId,
  };
}

/* -------------------------------------------------------------------------- */
/*                             AUTHENTICATION                                 */
/* -------------------------------------------------------------------------- */

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

async function verifySupabaseUser(
  token: string,
  environment: Environment,
): Promise<SupabaseUser | null> {
  try {
    const response = await fetch(
      `${environment.supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: environment.supabaseKey,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SupabaseUser;
  } catch {
    return null;
  }
}

async function verifyOrganisationMembership(
  token: string,
  userId: string,
  environment: Environment,
): Promise<boolean> {
  const query = new URLSearchParams({
    select: "user_id,status,role",
    organisation_id: `eq.${environment.organisationId}`,
    user_id: `eq.${userId}`,
    status: "eq.active",
    limit: "1",
  });

  try {
    const response = await fetch(
      `${environment.supabaseUrl}/rest/v1/organisation_members?${query}`,
      {
        headers: {
          apikey: environment.supabaseKey,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        "Membership query failed:",
        response.status,
        await response.text().catch(() => ""),
      );

      return false;
    }

    const rows = (await response.json()) as unknown[];

    return rows.length === 1;
  } catch (error) {
    console.error(
      "Membership query failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                               RATE LIMIT                                   */
/* -------------------------------------------------------------------------- */

function enforceRateLimit(userId: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current = rateLimits.get(userId);

  if (!current || current.resetAt <= now) {
    rateLimits.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
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

/* -------------------------------------------------------------------------- */
/*                            REQUEST INTERPRETATION                          */
/* -------------------------------------------------------------------------- */

function opportunitySignalFromInstruction(
  instruction: string | null,
): boolean | null {
  if (!instruction) {
    return null;
  }

  const value = instruction
    .match(
      /\brequire\s+opportunity\s+(?:signal|evidence)\s*:\s*(yes|no|true|false|on|off)\b/i,
    )?.[1]
    ?.toLowerCase();

  if (["yes", "true", "on"].includes(value ?? "")) {
    return true;
  }

  if (["no", "false", "off"].includes(value ?? "")) {
    return false;
  }

  return null;
}

function buyerTargetsFromInstruction(
  instruction: string | null,
): string[] {
  if (!instruction) {
    return [];
  }

  const clause = instruction.match(
    /\b(?:find|target|return)\s+(?:(?:private|public|government|nonprofit)\s+)?([^.\n!]{3,180}?)(?=\s+(?:that|who)\s+(?:could|can|may|need|needs|want|wants|have|has)\b|\s+needing\b)/i,
  )?.[1];

  if (!clause) {
    return [];
  }

  const genericTarget =
    /^(?:real|verified|qualified)?\s*(?:customer|buyer|lead|prospect|organisation|organization|company|business)(?:s|es)?$/i;

  return [
    ...new Set(
      clause
        .split(/[,;]|\s+(?:and|&)\s+/i)
        .map((item) => cleanText(item))
        .filter(
          (item): item is string =>
            typeof item === "string" &&
            !genericTarget.test(item),
        ),
    ),
  ].slice(0, 6);
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
  if (typeof value !== "object" || value === null) {
    return {
      valid: false,
      error: "Invalid Lead Hunter request.",
    };
  }

  const candidate = value as Partial<LeadHunterSearchRequest>;

  const services = Array.isArray(candidate.services)
    ? [
        ...new Set(
          candidate.services.filter(
            (service): service is LeadHunterServiceCategory =>
              typeof service === "string" &&
              service !== "general" &&
              Object.hasOwn(SERVICE_LABELS, service),
          ),
        ),
      ].slice(0, 30)
    : [];

  const companies = Array.isArray(candidate.companies)
    ? [
        ...new Set(
          candidate.companies.filter(
            (company): company is LeadHunterCompany =>
              typeof company === "string" &&
              VALID_COMPANIES.has(company as LeadHunterCompany),
          ),
        ),
      ].slice(0, 10)
    : [];

  if (services.length === 0) {
    return {
      valid: false,
      error: "Choose at least one service.",
    };
  }

  if (companies.length === 0) {
    return {
      valid: false,
      error: "Choose at least one Cossa company.",
    };
  }

  const locations = cleanArray(candidate.locations, 25);
  const countries = cleanArray(candidate.countries, 15);
  const provinces = cleanArray(candidate.provinces, 12);
  const cities = cleanArray(candidate.cities, 25);
  const suburbs = cleanArray(candidate.suburbs, 30);
  const industries = cleanArray(candidate.industries, 20);
  const organisationTypes = cleanArray(
    candidate.organisation_types,
    20,
  );

  const misplacedCossaCompany = organisationTypes.find(
    (organisationType) =>
      COSSA_FIRST_PARTY_NAME_PATTERN.test(organisationType),
  );

  if (misplacedCossaCompany) {
    return {
      valid: false,
      error: `"${misplacedCossaCompany}" is one of Cossa's sellers, not a buyer organisation type. Choose the Cossa company in the Company selector and use buyer types such as Property manager, Warehouse or Retail centre here.`,
    };
  }

  const tenderKeywords = cleanArray(candidate.tender_keywords, 25);
  const prospectKeywords = cleanArray(
    candidate.prospect_keywords,
    35,
  );

  const rawCount = Number(candidate.result_count ?? 15);

  const resultCount = Number.isFinite(rawCount)
    ? Math.min(
        MAX_REQUEST_RESULTS,
        Math.max(1, Math.round(rawCount)),
      )
    : 15;

  const requestedQueryLimit = Number(
    candidate.max_search_queries ?? 5,
  );

  const maxSearchQueries = Math.max(
    1,
    Math.min(
      MAX_SEARCH_QUERIES,
      Number.isFinite(requestedQueryLimit)
        ? Math.round(requestedQueryLimit)
        : 5,
    ),
  );

  const searchInstruction = cleanText(
    candidate.search_instruction,
  );

  const notes = cleanText(candidate.notes);

  const missionOpportunitySignal =
    opportunitySignalFromInstruction(searchInstruction);

  const missionBuyerTargets =
    buyerTargetsFromInstruction(searchInstruction);

  const sector =
    typeof candidate.sector === "string" &&
    VALID_SECTORS.has(
      candidate.sector as LeadHunterSearchRequest["sector"],
    )
      ? candidate.sector
      : "mixed";

  const includePrivateSector =
    candidate.include_private_sector === true;

  const includeGovernmentSector =
    candidate.include_government_sector === true;

  const includeNonprofits =
    candidate.include_nonprofits === true;

  if (
    !includePrivateSector &&
    !includeGovernmentSector &&
    !includeNonprofits
  ) {
    return {
      valid: false,
      error:
        "Enable at least one buyer sector: private, government or nonprofit.",
    };
  }

  const searchScope =
    candidate.search_scope ?? "south_africa";

  const deliveryModel =
    candidate.delivery_model ?? "auto";

  const searchDepth =
    candidate.search_depth === "standard" ||
    candidate.search_depth === "deep"
      ? candidate.search_depth
      : "economy";

  const depthQueryBudget =
    SEARCH_DEPTH_QUERY_BUDGETS[searchDepth];

  const effectiveQueryBudget = Math.min(
    maxSearchQueries,
    depthQueryBudget,
  );

  if (services.length > effectiveQueryBudget) {
    return {
      valid: false,
      error: `${
        searchDepth === "economy" ? "Economy" : "This"
      } search depth can cover at most ${effectiveQueryBudget} selected service${
        effectiveQueryBudget === 1 ? "" : "s"
      } per hunt. Run focused service batches or choose a deeper search depth.`,
    };
  }

  const revenueMode =
    candidate.revenue_mode ?? "quick_revenue";

  const objectives = Array.isArray(candidate.objectives)
    ? [...new Set(candidate.objectives)]
    : [];

  const radiusRaw = candidate.radius_km;

  const parsedRadius =
    radiusRaw === null || radiusRaw === undefined
      ? null
      : Number(radiusRaw);

  const radiusKm =
    parsedRadius === null || !Number.isFinite(parsedRadius)
      ? null
      : Math.max(
          1,
          Math.min(500, Math.round(parsedRadius)),
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
          : [...cities, ...provinces, ...countries].length > 0
            ? [...cities, ...provinces, ...countries]
            : ["Gauteng"],

      industries,

      organisation_types:
        missionBuyerTargets.length > 0
          ? missionBuyerTargets
          : organisationTypes,

      result_count: resultCount,

      minimum_score: clampScore(
        candidate.minimum_score ?? 60,
      ),

      minimum_evidence_sources: Math.max(
        1,
        Math.min(
          5,
          Math.round(
            Number(
              candidate.minimum_evidence_sources ?? 1,
            ),
          ),
        ),
      ),

      include_small_projects:
        candidate.include_small_projects !== false,

      include_large_projects:
        candidate.include_large_projects !== false,

      include_private_sector: includePrivateSector,
      include_government_sector: includeGovernmentSector,
      include_nonprofits: includeNonprofits,

      require_public_phone_or_email:
        candidate.require_public_phone_or_email === true,

      require_website:
        candidate.require_website === true,

      require_opportunity_signal:
        missionOpportunitySignal ??
        candidate.require_opportunity_signal === true,

      tender_keywords: tenderKeywords,
      prospect_keywords: prospectKeywords,

      verified_sources_only:
        candidate.verified_sources_only !== false,

      exclude_existing_crm_leads:
        candidate.exclude_existing_crm_leads !== false,

      notes,
      search_instruction: searchInstruction,

      search_scope: searchScope,
      delivery_model: deliveryModel,
      search_depth: searchDepth,
      revenue_mode: revenueMode,

      objectives,

      countries,
      provinces,
      cities,
      suburbs,

      radius_km: radiusKm,

      search_everything:
        candidate.search_everything === true,

      easy_wins_only:
        candidate.easy_wins_only !== false,

      revenue_first:
        candidate.revenue_first !== false,

      max_search_queries: effectiveQueryBudget,

      use_cached_results:
        candidate.use_cached_results !== false,

      cache_max_age_hours: Math.max(
        1,
        Math.min(
          168,
          Math.round(
            Number(candidate.cache_max_age_hours ?? 24),
          ),
        ),
      ),

      /*
       * Competitors are always blocked from normal customer results.
       * They may still qualify only through an explicit independent
       * subcontracting / procurement / supplier opportunity.
       */
      exclude_competitors: true,

      exclude_directories:
        candidate.exclude_directories !== false,

      exclude_expired_procurement:
        candidate.exclude_expired_procurement !== false,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         BUYER TARGET INTELLIGENCE                          */
/* -------------------------------------------------------------------------- */

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
    Record<LeadHunterServiceCategory, string[]>
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

    general: common,
  };

  return map[service] ?? common;
}

function buyerTargetSearchExpression(
  target: string,
): string {
  const normalised = target
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/\bproperty managers?\b/i.test(normalised)) {
    return '("property manager" OR "property management")';
  }

  if (
    /\bproperty management compan(?:y|ies)\b/i.test(
      normalised,
    )
  ) {
    return '("property management company" OR "property management companies")';
  }

  if (/\bwarehouse operators?\b/i.test(normalised)) {
    return '(warehouse OR "warehouse operator" OR logistics)';
  }

  if (
    /\bretail[\s-]*(?:centre|center) managers?\b/i.test(
      normalised,
    )
  ) {
    return '("retail centre" OR "retail center" OR "shopping centre" OR "shopping center")';
  }

  return `"${normalised || "business"}"`;
}

function safeSearchKeyword(value: string): string | null {
  const cleaned = value
    .replace(/[^\p{L}\p{N}\s&/.'+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 100) {
    return null;
  }

  return cleaned;
}

function createSearchKeywordExpression(
  values: string[],
  maximum = 4,
): string {
  const cleaned = values
    .map(safeSearchKeyword)
    .filter((value): value is string => Boolean(value))
    .slice(0, maximum);

  if (cleaned.length === 0) {
    return "";
  }

  return ` (${cleaned
    .map((value) => `"${value}"`)
    .join(" OR ")})`;
}

function searchPlanPriority(
  request: LeadHunterSearchRequest,
  purpose: SearchPurpose,
): number {
  const revenueFirst =
    request.revenue_first !== false ||
    request.revenue_mode === "quick_revenue";

  const requireSignal =
    request.require_opportunity_signal === true;

  const objectives = (request.objectives ?? [])
    .map((value) => String(value).toLowerCase())
    .join(" ");

  let score = 0;

  switch (purpose) {
    case "active_procurement":
      score = 100;
      break;

    case "growth_signal":
      score = revenueFirst ? 88 : 72;
      break;

    case "supplier_registration":
      score = 82;
      break;

    case "website_gap":
      score = 74;
      break;

    case "buyer_discovery":
      score = requireSignal ? 45 : 70;
      break;
  }

  if (
    requireSignal &&
    [
      "active_procurement",
      "growth_signal",
      "supplier_registration",
      "website_gap",
    ].includes(purpose)
  ) {
    score += 20;
  }

  if (
    /\b(?:tender|procurement|government|rfq|bid)\b/.test(
      objectives,
    ) &&
    purpose === "active_procurement"
  ) {
    score += 15;
  }

  if (
    /\b(?:revenue|sales|customer|lead|quick)\b/.test(
      objectives,
    ) &&
    ["growth_signal", "buyer_discovery"].includes(purpose)
  ) {
    score += 8;
  }

  return score;
}

function createSearchQueries(
  request: LeadHunterSearchRequest,
): SearchPlan[] {
  const plans: SearchPlan[] = [];

  const combinedLocations = [
    ...(request.cities ?? []),
    ...(request.suburbs ?? []),
    ...(request.provinces ?? []),
    ...request.locations,
  ];

  const locationTerms = [
    ...new Set(
      combinedLocations
        .map(cleanText)
        .filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 5);

  const locationQuery =
    locationTerms.length > 0
      ? `(${locationTerms
          .map(
            (location) =>
              `"${location.replace(/"/g, "")}"`,
          )
          .join(" OR ")})`
      : '"South Africa"';

  const requestedTargets = [
    ...request.organisation_types,
    ...request.industries,
  ].filter(Boolean);

  const procurementExtra =
    createSearchKeywordExpression(
      request.tender_keywords ?? [],
      5,
    );

  const prospectExtra =
    createSearchKeywordExpression(
      request.prospect_keywords ?? [],
      5,
    );

  const shouldPrivate =
    request.include_private_sector === true &&
    (request.sector === "mixed" ||
      request.sector === "private");

  const shouldGovernment =
    request.include_government_sector === true &&
    (request.sector === "mixed" ||
      request.sector === "government");

  const shouldNonprofit =
    request.include_nonprofits === true &&
    (request.sector === "mixed" ||
      request.sector === "nonprofit");

  for (const [
    serviceIndex,
    service,
  ] of request.services.entries()) {
    const defaults = buyerTargetsForService(service);

    const targets =
      requestedTargets.length > 0
        ? [...new Set(requestedTargets)].slice(0, 8)
        : defaults.slice(0, 8);

    const target1 =
      targets[
        serviceIndex % Math.max(targets.length, 1)
      ] ?? "business";

    const target2 =
      targets[
        (serviceIndex + 1) %
          Math.max(targets.length, 1)
      ] ?? target1;

    const target1Query =
      buyerTargetSearchExpression(target1);

    const target2Query =
      buyerTargetSearchExpression(target2);

    const label = serviceLabel(service);

    if (shouldPrivate) {
      plans.push({
        query: `${target1Query} ${locationQuery} official website contact ${prospectExtra} ${SEARCH_QUERY_DOMAIN_EXCLUSIONS}`,
        purpose: "buyer_discovery",
        targetDescription: target1,
        service,
        priority: searchPlanPriority(
          request,
          "buyer_discovery",
        ),
      });

      plans.push({
        query: `${target2Query} ${locationQuery} official organisation contact ${prospectExtra} ${SEARCH_QUERY_DOMAIN_EXCLUSIONS}`,
        purpose: "buyer_discovery",
        targetDescription: target2,
        service,
        priority:
          searchPlanPriority(
            request,
            "buyer_discovery",
          ) - 2,
      });

      plans.push({
        query: `${locationQuery} ${target1Query} ("new branch" OR expansion OR development OR refurbishment OR upgrade OR investment OR "new premises" OR "new facility" OR relocation) "${label}" ${prospectExtra}`,
        purpose: "growth_signal",
        targetDescription: target1,
        service,
        priority: searchPlanPriority(
          request,
          "growth_signal",
        ),
      });

      if (
        DIGITAL_AUDIT_SERVICE_CATEGORIES.has(service)
      ) {
        plans.push({
          /*
           * Do not search for "bad website", "poor SEO", etc.
           * That wording encourages weak third-party claims.
           *
           * Find the official site and perform our own deterministic audit.
           */
          query: `${target1Query} ${locationQuery} official website contact ${prospectExtra} ${SEARCH_QUERY_DOMAIN_EXCLUSIONS}`,
          purpose: "website_gap",
          targetDescription: target1,
          service,
          priority: searchPlanPriority(
            request,
            "website_gap",
          ),
        });
      }
    }

    if (shouldNonprofit) {
      plans.push({
        query: `(church OR nonprofit OR NGO OR "community centre" OR foundation) ${locationQuery} official website contact "${label}" ${prospectExtra}`,
        purpose: "buyer_discovery",
        targetDescription:
          "churches and nonprofit organisations",
        service,
        priority:
          searchPlanPriority(
            request,
            "buyer_discovery",
          ) - 1,
      });

      plans.push({
        query: `(church OR nonprofit OR NGO OR foundation) ${locationQuery} ("request for quotation" OR "service provider" OR refurbishment OR renovation OR upgrade OR maintenance) "${label}"`,
        purpose: "growth_signal",
        targetDescription:
          "churches and nonprofit organisations",
        service,
        priority: searchPlanPriority(
          request,
          "growth_signal",
        ),
      });
    }

    if (shouldGovernment) {
      plans.push({
        query: `site:etenders.gov.za "${label}" ("closing date" OR "tender number" OR "bid number" OR RFQ OR RFP)${procurementExtra}`,
        purpose: "active_procurement",
        targetDescription:
          "South African government procurement",
        service,
        priority: searchPlanPriority(
          request,
          "active_procurement",
        ),
      });

      plans.push({
        query: `(site:gov.za OR site:gauteng.gov.za OR site:tshwane.gov.za OR site:joburg.org.za OR site:ekurhuleni.gov.za OR site:sanral.co.za OR site:eskom.co.za OR site:transnet.net) "${label}" (RFQ OR RFP OR tender OR bid OR "request for quotation")${procurementExtra}`,
        purpose: "active_procurement",
        targetDescription:
          "Government and public-entity procurement",
        service,
        priority:
          searchPlanPriority(
            request,
            "active_procurement",
          ) - 1,
      });

      plans.push({
        query: `${locationQuery} (government OR municipality OR department OR "public entity") "${label}" ("supplier registration" OR "supplier database" OR "vendor registration" OR "supplier panel")${procurementExtra}`,
        purpose: "supplier_registration",
        targetDescription:
          "Government supplier registration",
        service,
        priority: searchPlanPriority(
          request,
          "supplier_registration",
        ),
      });
    }
  }

  const unique = new Map<string, SearchPlan>();

  for (const plan of plans) {
    const query = plan.query
      .replace(/\s+/g, " ")
      .trim();

    const key = [
      plan.service,
      plan.purpose,
      plan.targetDescription.toLowerCase(),
      query.toLowerCase(),
    ].join("|");

    if (!query || unique.has(key)) {
      continue;
    }

    unique.set(key, {
      ...plan,
      query,
    });
  }

  const availablePlans = [...unique.values()].sort(
    (a, b) => b.priority - a.priority,
  );

  const requestedLimit = Math.max(
    1,
    Math.min(
      MAX_SEARCH_QUERIES,
      Math.round(
        Number(request.max_search_queries ?? 5),
      ),
    ),
  );

  const selectedPlans: SearchPlan[] = [];
  const selectedServices =
    new Set<LeadHunterServiceCategory>();

  /*
   * First guarantee one query per selected service.
   */
  for (const service of request.services) {
    const bestForService = availablePlans.find(
      (plan) =>
        plan.service === service &&
        !selectedPlans.includes(plan),
    );

    if (bestForService) {
      selectedPlans.push(bestForService);
      selectedServices.add(service);
    }

    if (selectedPlans.length >= requestedLimit) {
      return selectedPlans;
    }
  }

  /*
   * Then spend remaining budget on highest-priority complementary plans.
   */
  for (const plan of availablePlans) {
    if (
      selectedPlans.length >= requestedLimit ||
      selectedPlans.includes(plan)
    ) {
      continue;
    }

    selectedPlans.push(plan);
  }

  return selectedPlans;
}

/* -------------------------------------------------------------------------- */
/*                             URL / SSRF SECURITY                            */
/* -------------------------------------------------------------------------- */

function normaliseUrl(value: unknown): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(text)
        ? text
        : `https://${text}`,
    );

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password) {
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
      "mc_cid",
      "mc_eid",
    ].forEach((key) => url.searchParams.delete(key));

    if (
      [...url.searchParams.keys()].length === 0
    ) {
      url.search = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function canonicalUrlKey(value: string): string {
  const normalised = normaliseUrl(value);

  if (!normalised) {
    return value
      .toLowerCase()
      .replace(/\/+$/, "");
  }

  const url = new URL(normalised);

  url.hostname = url.hostname
    .replace(/^www\./i, "")
    .toLowerCase();

  url.pathname = url.pathname
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  if (!url.pathname) {
    url.pathname = "/";
  }

  return url.toString().toLowerCase();
}

function getHostname(value: string): string {
  try {
    return new URL(value).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host === "metadata.google.internal"
  );
}

function ipv4ToNumber(address: string): number | null {
  const parts = address
    .split(".")
    .map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  ) >>> 0;
}

function ipv4InCidr(
  address: string,
  network: string,
  prefix: number,
): boolean {
  const addressNumber = ipv4ToNumber(address);
  const networkNumber = ipv4ToNumber(network);

  if (
    addressNumber === null ||
    networkNumber === null
  ) {
    return false;
  }

  if (prefix === 0) {
    return true;
  }

  const mask =
    prefix === 32
      ? 0xffffffff
      : (0xffffffff << (32 - prefix)) >>> 0;

  return (
    (addressNumber & mask) ===
    (networkNumber & mask)
  );
}

function isPrivateIpv4(address: string): boolean {
  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];

  return ranges.some(([network, prefix]) =>
    ipv4InCidr(address, network, prefix),
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase();

  if (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb") ||
    value.startsWith("ff") ||
    value.startsWith("2001:db8:")
  ) {
    return true;
  }

  const mapped = value.match(
    /::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/,
  );

  if (mapped?.[1]) {
    return isPrivateIpv4(mapped[1]);
  }

  return false;
}

function isPrivateIpAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

async function assertPublicHttpUrl(
  value: string,
): Promise<URL> {
  const normalised = normaliseUrl(value);

  if (!normalised) {
    throw new Error("Invalid URL");
  }

  const url = new URL(normalised);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Unsupported URL protocol");
  }

  if (url.username || url.password) {
    throw new Error("Credential-bearing URLs are blocked");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Private or local hostname blocked");
  }

  const literalIpVersion = isIP(url.hostname);

  if (literalIpVersion) {
    if (isPrivateIpAddress(url.hostname)) {
      throw new Error("Private or reserved IP blocked");
    }

    return url;
  }

  const addresses = await lookup(url.hostname, {
    all: true,
    verbatim: true,
  });

  if (addresses.length === 0) {
    throw new Error("Hostname did not resolve");
  }

  if (
    addresses.some((entry) =>
      isPrivateIpAddress(entry.address),
    )
  ) {
    throw new Error(
      "Hostname resolves to private or reserved IP",
    );
  }

  return url;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  const externalSignal = init.signal;

  const abortListener = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener(
        "abort",
        abortListener,
        {
          once: true,
        },
      );
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);

    externalSignal?.removeEventListener(
      "abort",
      abortListener,
    );
  }
}

async function safeFetchWithRedirects(
  initialUrl: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<SafeFetchResult> {
  let currentUrl = (
    await assertPublicHttpUrl(initialUrl)
  ).toString();

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetchWithTimeout(
      currentUrl,
      {
        ...init,
        redirect: "manual",
      },
      timeoutMs,
    );

    if (
      response.status < 300 ||
      response.status >= 400
    ) {
      return {
        response,
        finalUrl: currentUrl,
      };
    }

    if (redirectCount === MAX_REDIRECTS) {
      throw new Error("Too many redirects");
    }

    const location =
      response.headers.get("location");

    if (!location) {
      throw new Error(
        "Redirect response had no Location header",
      );
    }

    const nextUrl = new URL(
      location,
      currentUrl,
    ).toString();

    currentUrl = (
      await assertPublicHttpUrl(nextUrl)
    ).toString();
  }

  throw new Error("Redirect resolution failed");
}

async function readTextBodyLimited(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const contentLength = Number(
    response.headers.get("content-length"),
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > maximumBytes
  ) {
    throw new Error(
      "Source response exceeded inspection size limit",
    );
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let output = "";

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    totalBytes += result.value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel().catch(() => undefined);

      throw new Error(
        "Source response exceeded inspection size limit",
      );
    }

    output += decoder.decode(result.value, {
      stream: true,
    });
  }

  output += decoder.decode();

  return output;
}

/* -------------------------------------------------------------------------- */
/*                            SEARCH PROVIDERS                                */
/* -------------------------------------------------------------------------- */

function createCandidate(
  provider: SearchProvider,
  plan: SearchPlan,
  input: {
    title: string;
    url: string;
    snippet: string;
    publishedAt: string | null;
    providerScore: number;
  },
): SearchCandidate {
  return {
    provider,
    query: plan.query,
    purpose: plan.purpose,
    targetDescription: plan.targetDescription,
    searchedService: plan.service,

    title: input.title,
    url: input.url,
    snippet: input.snippet,
    publishedAt: input.publishedAt,
    providerScore: input.providerScore,

    corroborations: [
      {
        provider,
        title: input.title,
        url: input.url,
        snippet: input.snippet,
        publishedAt: input.publishedAt,
        providerScore: input.providerScore,
      },
    ],
  };
}

async function serpApiSearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<SearchCandidate[]> {
  const params = new URLSearchParams({
    engine: "google",
    q: plan.query,
    api_key: apiKey,

    google_domain: "google.co.za",
    gl: "za",
    hl: "en",

    num: String(MAX_RESULTS_PER_QUERY),
    safe: "active",

    /*
     * SerpAPI may reuse its own cache.
     * Do not force no_cache because cached requests can reduce cost.
     */
  });

  if (
    [
      "growth_signal",
      "active_procurement",
      "supplier_registration",
    ].includes(plan.purpose)
  ) {
    params.set("tbs", "qdr:m");
  }

  const response = await fetchWithTimeout(
    `${SERPAPI_SEARCH_URL}?${params}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () => `SerpAPI ${response.status}`,
        ),
    );
  }

  const payload = (await response.json()) as {
    error?: string;

    organic_results?: Array<{
      position?: number;
      title?: string;
      link?: string;
      snippet?: string;
      date?: string;
    }>;
  };

  if (payload.error) {
    throw new Error(payload.error);
  }

  return (payload.organic_results ?? [])
    .slice(0, MAX_RESULTS_PER_QUERY)
    .map(
      (
        result,
        index,
      ): SearchCandidate | null => {
        const title = cleanText(result.title);
        const url = normaliseUrl(result.link);
        const snippet = cleanText(result.snippet);

        if (!title || !url || !snippet) {
          return null;
        }

        const position = Number(
          result.position ?? index + 1,
        );

        return createCandidate(
          "SerpAPI",
          plan,
          {
            title,
            url,
            snippet,

            publishedAt: cleanText(
              result.date,
            ),

            providerScore: Math.max(
              0.35,
              Math.min(
                0.95,
                1 -
                  Math.max(
                    0,
                    position - 1,
                  ) *
                    0.06,
              ),
            ),
          },
        );
      },
    )
    .filter(
      (item): item is SearchCandidate =>
        Boolean(item),
    );
}

async function tavilySearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<SearchCandidate[]> {
  const payload: Record<string, unknown> = {
    query: plan.query,

    topic:
      plan.purpose === "growth_signal"
        ? "news"
        : "general",

    /*
     * Explicit basic depth prevents accidental upgrade to
     * a higher-credit search depth.
     */
    search_depth: "basic",

    max_results: MAX_RESULTS_PER_QUERY,

    include_answer: false,
    include_images: false,
    include_raw_content: false,

    exclude_domains:
      PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE,
  };

  if (plan.purpose === "growth_signal") {
    payload.time_range = "month";
  } else {
    payload.country = "south africa";
  }

  const response = await fetchWithTimeout(
    TAVILY_SEARCH_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify(payload),
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () => `Tavily ${response.status}`,
        ),
    );
  }

  const body = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      published_date?: string;
    }>;
  };

  return (body.results ?? [])
    .map(
      (
        result,
      ): SearchCandidate | null => {
        const title = cleanText(result.title);
        const url = normaliseUrl(result.url);
        const snippet = cleanText(
          result.content,
        );

        if (!title || !url || !snippet) {
          return null;
        }

        return createCandidate(
          "Tavily",
          plan,
          {
            title,
            url,
            snippet,
            publishedAt: cleanText(
              result.published_date,
            ),
            providerScore:
              normaliseProviderScore(
                result.score,
                0.6,
              ),
          },
        );
      },
    )
    .filter(
      (item): item is SearchCandidate =>
        Boolean(item),
    );
}

async function newsApiSearch(
  plan: SearchPlan,
  apiKey: string,
): Promise<SearchCandidate[]> {
  if (
    ![
      "growth_signal",
      "active_procurement",
      "supplier_registration",
    ].includes(plan.purpose)
  ) {
    return [];
  }

  const from = new Date(
    Date.now() - 45 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  const cleanedQuery = plan.query
    .replace(/\bsite:[^\s)]+/gi, " ")
    .replace(/-site:[^\s)]+/gi, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const q = `${cleanedQuery} AND ("South Africa" OR Gauteng OR Pretoria OR Johannesburg)`.slice(
    0,
    500,
  );

  const params = new URLSearchParams({
    q,

    searchIn: "title,description,content",
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(MAX_RESULTS_PER_QUERY),
    page: "1",
    from,
  });

  const response = await fetchWithTimeout(
    `${NEWS_API_URL}?${params}`,
    {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () => `NewsAPI ${response.status}`,
        ),
    );
  }

  const payload = (await response.json()) as {
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

  if (payload.status === "error") {
    throw new Error(
      payload.message || "NewsAPI error",
    );
  }

  return (payload.articles ?? [])
    .map(
      (
        article,
        index,
      ): SearchCandidate | null => {
        const title = cleanText(article.title);

        const url = normaliseUrl(article.url);

        const snippet =
          cleanText(article.description) ||
          cleanText(article.content);

        if (!title || !url || !snippet) {
          return null;
        }

        return createCandidate(
          "NewsAPI",
          plan,
          {
            title,
            url,
            snippet,

            publishedAt: cleanText(
              article.publishedAt,
            ),

            providerScore: Math.max(
              0.45,
              0.8 - index * 0.035,
            ),
          },
        );
      },
    )
    .filter(
      (item): item is SearchCandidate =>
        Boolean(item),
    );
}

async function executePlan(
  plan: SearchPlan,
  environment: Environment,
): Promise<SearchExecution[]> {
  const results: SearchExecution[] = [];

  const wrap = async (
    provider: SearchProvider,
    promise: Promise<SearchCandidate[]>,
  ): Promise<SearchExecution> => {
    try {
      return {
        provider,
        candidates: await promise,
      };
    } catch (error) {
      return {
        provider,
        candidates: [],

        warning: `${provider} failed for "${plan.query}": ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`,
      };
    }
  };

  /*
   * Provider chain:
   *
   * 1. SerpAPI — direct Google discovery.
   * 2. Tavily — semantic expansion/enrichment.
   * 3. NewsAPI — fresh corroboration for time-sensitive signals.
   *
   * We stop early when enough strong discovery results already exist,
   * preserving credits.
   */

  let discovered = 0;

  if (environment.serpApiKey) {
    const serp = await wrap(
      "SerpAPI",
      serpApiSearch(
        plan,
        environment.serpApiKey,
      ),
    );

    results.push(serp);
    discovered += serp.candidates.length;
  }

  if (
    environment.tavilyApiKey &&
    discovered < 5
  ) {
    const tavily = await wrap(
      "Tavily",
      tavilySearch(
        plan,
        environment.tavilyApiKey,
      ),
    );

    results.push(tavily);
    discovered += tavily.candidates.length;
  }

  if (
    environment.newsApiKey &&
    [
      "growth_signal",
      "active_procurement",
      "supplier_registration",
    ].includes(plan.purpose) &&
    discovered < 8
  ) {
    const news = await wrap(
      "NewsAPI",
      newsApiSearch(
        plan,
        environment.newsApiKey,
      ),
    );

    results.push(news);
  }

  /*
   * If SerpAPI is not configured, Tavily becomes primary.
   * If Tavily is also missing, NewsAPI can still serve relevant
   * time-sensitive plan types.
   */
  if (
    results.length === 0 &&
    environment.tavilyApiKey
  ) {
    results.push(
      await wrap(
        "Tavily",
        tavilySearch(
          plan,
          environment.tavilyApiKey,
        ),
      ),
    );
  }

  if (
    results.length === 0 &&
    environment.newsApiKey
  ) {
    results.push(
      await wrap(
        "NewsAPI",
        newsApiSearch(
          plan,
          environment.newsApiKey,
        ),
      ),
    );
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/*                               SEARCH CACHE                                 */
/* -------------------------------------------------------------------------- */

function searchPlanCacheKey(
  plan: SearchPlan,
  environment: Environment,
): string {
  return [
    "v4",
    plan.service,
    plan.purpose,
    plan.targetDescription.toLowerCase(),
    plan.query.toLowerCase(),

    environment.serpApiKey ? "serpapi" : "",
    environment.tavilyApiKey ? "tavily" : "",
    environment.newsApiKey ? "newsapi" : "",
  ].join("|");
}

function cacheMaxAgeMs(
  request: LeadHunterSearchRequest,
): number {
  return (
    Math.min(
      168,
      Math.max(
        1,
        request.cache_max_age_hours ?? 24,
      ),
    ) *
    60 *
    60 *
    1_000
  );
}

function parsePersistedSearchResults(
  value: unknown,
  plan: SearchPlan,
): SearchExecution[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const results = value.flatMap(
    (rawResult): SearchExecution[] => {
      if (
        typeof rawResult !== "object" ||
        rawResult === null
      ) {
        return [];
      }

      const result = rawResult as {
        provider?: unknown;
        candidates?: unknown;
      };

      const provider = result.provider;

      if (
        (provider !== "Tavily" &&
          provider !== "SerpAPI" &&
          provider !== "NewsAPI") ||
        !Array.isArray(result.candidates)
      ) {
        return [];
      }

      const candidates = result.candidates.flatMap(
        (
          rawCandidate,
        ): SearchCandidate[] => {
          if (
            typeof rawCandidate !== "object" ||
            rawCandidate === null
          ) {
            return [];
          }

          const candidate =
            rawCandidate as {
              title?: unknown;
              url?: unknown;
              snippet?: unknown;
              publishedAt?: unknown;
              providerScore?: unknown;
            };

          const title = cleanText(
            candidate.title,
          );

          const url = normaliseUrl(
            candidate.url,
          );

          if (
            !title ||
            !url ||
            !getHostname(url) ||
            title.length > 500 ||
            url.length > 2_048
          ) {
            return [];
          }

          const snippet =
            cleanText(candidate.snippet)?.slice(
              0,
              4_000,
            ) || "";

          const publishedAt = cleanText(
            candidate.publishedAt,
          );

          const providerScore =
            typeof candidate.providerScore ===
              "number" &&
            Number.isFinite(
              candidate.providerScore,
            )
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    candidate.providerScore,
                  ),
                )
              : 0.5;

          return [
            createCandidate(provider, plan, {
              title,
              url,
              snippet,
              publishedAt,
              providerScore,
            }),
          ];
        },
      );

      return candidates.length > 0
        ? [
            {
              provider,
              candidates,
            },
          ]
        : [];
    },
  );

  return results.length > 0 ? results : null;
}

async function readPersistentSearchCache(
  plan: SearchPlan,
  environment: Environment,
  token: string,
  maxAgeMs: number,
  now: number,
): Promise<CachedSearchExecution | null> {
  const query = new URLSearchParams({
    select:
      "cached_at,expires_at,search_results",

    organisation_id: `eq.${environment.organisationId}`,

    cache_key: `eq.${searchPlanCacheKey(
      plan,
      environment,
    )}`,

    expires_at: `gt.${new Date(
      now,
    ).toISOString()}`,

    limit: "1",
  });

  try {
    const response = await fetch(
      `${environment.supabaseUrl}/rest/v1/lead_hunter_search_cache?${query}`,
      {
        headers: {
          apikey: environment.supabaseKey,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn(
        "Lead Hunter persistent cache read skipped:",
        response.status,
      );

      return null;
    }

    const rows =
      (await response.json()) as unknown;

    if (
      !Array.isArray(rows) ||
      rows.length !== 1 ||
      typeof rows[0] !== "object" ||
      rows[0] === null
    ) {
      return null;
    }

    const row =
      rows[0] as PersistedSearchCacheRow;

    const cachedAt = Date.parse(
      cleanText(row.cached_at) || "",
    );

    const expiresAt = Date.parse(
      cleanText(row.expires_at) || "",
    );

    if (
      !Number.isFinite(cachedAt) ||
      !Number.isFinite(expiresAt) ||
      cachedAt > now ||
      expiresAt <= now ||
      now - cachedAt > maxAgeMs
    ) {
      return null;
    }

    const results =
      parsePersistedSearchResults(
        row.search_results,
        plan,
      );

    return results
      ? {
          cachedAt,
          results,
        }
      : null;
  } catch (error) {
    console.warn(
      "Lead Hunter persistent cache read failed:",
      error instanceof Error
        ? error.message
        : "unknown error",
    );

    return null;
  }
}

async function writePersistentSearchCache(
  plan: SearchPlan,
  environment: Environment,
  token: string,
  cachedAt: number,
  maxAgeMs: number,
  results: SearchExecution[],
): Promise<void> {
  try {
    const response = await fetch(
      `${environment.supabaseUrl}/rest/v1/lead_hunter_search_cache?on_conflict=organisation_id,cache_key`,
      {
        method: "POST",

        headers: {
          apikey: environment.supabaseKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },

        body: JSON.stringify({
          organisation_id:
            environment.organisationId,

          cache_key: searchPlanCacheKey(
            plan,
            environment,
          ),

          cached_at: new Date(
            cachedAt,
          ).toISOString(),

          expires_at: new Date(
            cachedAt + maxAgeMs,
          ).toISOString(),

          search_results: results,
        }),
      },
    );

    if (!response.ok) {
      console.warn(
        "Lead Hunter persistent cache write skipped:",
        response.status,
      );
    }
  } catch (error) {
    console.warn(
      "Lead Hunter persistent cache write failed:",
      error instanceof Error
        ? error.message
        : "unknown error",
    );
  }
}

function pruneProviderSearchCache(
  now: number,
): void {
  for (const [
    key,
    entry,
  ] of providerSearchCache) {
    if (
      now - entry.cachedAt >
      MAX_CACHED_SEARCH_AGE_MS
    ) {
      providerSearchCache.delete(key);
    }
  }

  if (
    providerSearchCache.size <=
    MAX_CACHED_SEARCH_PLANS
  ) {
    return;
  }

  const oldestKeys = [
    ...providerSearchCache.entries(),
  ]
    .sort(
      (first, second) =>
        first[1].cachedAt -
        second[1].cachedAt,
    )
    .slice(
      0,
      providerSearchCache.size -
        MAX_CACHED_SEARCH_PLANS,
    )
    .map(([key]) => key);

  for (const key of oldestKeys) {
    providerSearchCache.delete(key);
  }
}

async function executePlanWithCache(
  plan: SearchPlan,
  environment: Environment,
  request: LeadHunterSearchRequest,
  token: string,
): Promise<{
  results: SearchExecution[];
  reusedCache: boolean;
}> {
  const now = Date.now();

  const cacheKey = searchPlanCacheKey(
    plan,
    environment,
  );

  const maxAgeMs = cacheMaxAgeMs(request);

  const memoryCached =
    request.use_cached_results
      ? providerSearchCache.get(cacheKey)
      : undefined;

  if (
    memoryCached &&
    now - memoryCached.cachedAt <=
      maxAgeMs
  ) {
    return {
      results: memoryCached.results,
      reusedCache: true,
    };
  }

  if (request.use_cached_results) {
    const persisted =
      await readPersistentSearchCache(
        plan,
        environment,
        token,
        maxAgeMs,
        now,
      );

    if (persisted) {
      providerSearchCache.set(
        cacheKey,
        persisted,
      );

      pruneProviderSearchCache(now);

      return {
        results: persisted.results,
        reusedCache: true,
      };
    }
  }

  const results = await executePlan(
    plan,
    environment,
  );

  if (request.use_cached_results) {
    const successfulResults =
      results.filter(
        (result) =>
          result.candidates.length > 0,
      );

    if (successfulResults.length > 0) {
      const cacheEntry = {
        cachedAt: now,
        results: successfulResults,
      };

      providerSearchCache.set(
        cacheKey,
        cacheEntry,
      );

      pruneProviderSearchCache(now);

      await writePersistentSearchCache(
        plan,
        environment,
        token,
        now,
        maxAgeMs,
        successfulResults,
      );
    }
  }

  return {
    results,
    reusedCache: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                           CANDIDATE DEDUPLICATION                          */
/* -------------------------------------------------------------------------- */

function deduplicateCandidates(
  candidates: SearchCandidate[],
): SearchCandidate[] {
  const map = new Map<
    string,
    SearchCandidate
  >();

  const providerPriority = (
    provider: SearchProvider,
  ) =>
    provider === "SerpAPI"
      ? 3
      : provider === "Tavily"
        ? 2
        : 1;

  for (const candidate of candidates) {
    const key = canonicalUrlKey(
      candidate.url,
    );

    const existing = map.get(key);

    if (!existing) {
      map.set(key, candidate);
      continue;
    }

    const corroborations = [
      ...existing.corroborations,
      ...candidate.corroborations,
    ];

    const uniqueCorroborations =
      new Map<
        string,
        CandidateCorroboration
      >();

    for (const corroboration of corroborations) {
      const corroborationKey = [
        corroboration.provider,
        canonicalUrlKey(corroboration.url),
      ].join("|");

      const current =
        uniqueCorroborations.get(
          corroborationKey,
        );

      if (
        !current ||
        corroboration.providerScore >
          current.providerScore
      ) {
        uniqueCorroborations.set(
          corroborationKey,
          corroboration,
        );
      }
    }

    const candidateRank =
      candidate.providerScore * 100 +
      providerPriority(candidate.provider);

    const existingRank =
      existing.providerScore * 100 +
      providerPriority(existing.provider);

    const winner =
      candidateRank > existingRank
        ? candidate
        : existing;

    map.set(key, {
      ...winner,
      corroborations: [
        ...uniqueCorroborations.values(),
      ],
    });
  }

  return [...map.values()].sort(
    (first, second) =>
      second.providerScore -
      first.providerScore,
  );
}

/* -------------------------------------------------------------------------- */
/*                            PAGE INSPECTION                                 */
/* -------------------------------------------------------------------------- */

function htmlToText(html: string): string {
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
        .replace(/<br\s*\/?>/gi, " ")
        .replace(
          /<\/(?:p|div|section|article|li|h[1-6])>/gi,
          " ",
        )
        .replace(/<[^>]+>/g, " "),
    )?.slice(
      0,
      MAX_SOURCE_CONTENT_LENGTH,
    ) ?? ""
  );
}

function extractEmails(text: string): string[] {
  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    ) ?? [];

  return [
    ...new Set(
      matches
        .map((value) =>
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
            !value.includes(
              "cloudflare.com",
            ) &&
            !value.endsWith(".png") &&
            !value.endsWith(".jpg") &&
            !value.endsWith(".jpeg"),
        ),
    ),
  ].slice(0, 8);
}

function extractPhones(text: string): string[] {
  const matches =
    text.match(
      /(?:\+27|0)\s?\d{2}[\s().-]?\d{3}[\s.-]?\d{4}/g,
    ) ?? [];

  return [
    ...new Set(
      matches
        .map((value) =>
          value.replace(/[^\d+]/g, ""),
        )
        .filter(
          (value) =>
            /^\+27\d{9}$/.test(value) ||
            /^0\d{9}$/.test(value),
        ),
    ),
  ].slice(0, 8);
}

function findContactPageUrl(
  html: string,
  baseUrl: string,
): string | null {
  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = cleanText(match[1]);

    const label = lowerText(
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
      // Ignore malformed links.
    }
  }

  return null;
}

function inspectDigitalSignals(
  html: string,
  finalUrl: string,
): {
  signals: string[];
  hasViewportMeta: boolean;
  hasContactForm: boolean;
  hasWhatsAppLink: boolean;
  hasMetaDescription: boolean;
  hasMeaningfulTitle: boolean;
  isHttps: boolean;
} {
  const signals: string[] = [];

  const hasViewportMeta =
    /<meta\b[^>]*name=["']viewport["'][^>]*>/i.test(
      html,
    );

  const hasContactForm =
    /<form\b[\s\S]{0,5000}?(?:contact|enquir|message|email|phone|name)[\s\S]{0,5000}?<\/form>/i.test(
      html,
    );

  const hasWhatsAppLink =
    /(?:wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/)/i.test(
      html,
    );

  const metaDescriptionMatch =
    html.match(
      /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ||
    html.match(
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i,
    );

  const hasMetaDescription =
    Boolean(
      cleanText(
        metaDescriptionMatch?.[1],
      ),
    );

  const title = cleanText(
    html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    )?.[1]?.replace(
      /<[^>]+>/g,
      " ",
    ),
  );

  const hasMeaningfulTitle =
    Boolean(title && title.length >= 8);

  const isHttps =
    finalUrl.startsWith("https://");

  /*
   * Only objectively observable signals are emitted.
   * No invented "poor SEO", "slow website", or "bad branding".
   */
  if (!hasViewportMeta) {
    signals.push(
      "No viewport meta tag was detected on the inspected HTML page.",
    );
  }

  if (!hasContactForm) {
    signals.push(
      "No obvious contact or enquiry form was detected on the inspected HTML page.",
    );
  }

  if (!hasWhatsAppLink) {
    signals.push(
      "No WhatsApp contact link was detected on the inspected HTML page.",
    );
  }

  if (!hasMetaDescription) {
    signals.push(
      "No HTML meta description was detected on the inspected page.",
    );
  }

  if (!hasMeaningfulTitle) {
    signals.push(
      "The inspected page did not expose a meaningful HTML title.",
    );
  }

  if (!isHttps) {
    signals.push(
      "The inspected page is not served over HTTPS.",
    );
  }

  return {
    signals,
    hasViewportMeta,
    hasContactForm,
    hasWhatsAppLink,
    hasMetaDescription,
    hasMeaningfulTitle,
    isHttps,
  };
}

async function inspectSourcePage(
  sourceUrl: string,
): Promise<PageInspection> {
  const inspectedAt =
    new Date().toISOString();

  try {
    await assertPublicHttpUrl(sourceUrl);

    const {
      response,
      finalUrl,
    } = await safeFetchWithRedirects(
      sourceUrl,
      {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.2",

          "User-Agent":
            "CossaLeadHunter/5.0 (+https://growth.cossanexusholdings.co.za)",
        },
      },
      PAGE_TIMEOUT_MS,
    );

    const contentType = (
      response.headers.get("content-type") ??
      ""
    ).toLowerCase();

    if (!response.ok) {
      throw new Error(
        `Source returned ${response.status}`,
      );
    }

    /*
     * PDF tender notices are recognised as valid public documents,
     * but we do not fabricate text extraction without an actual PDF parser.
     * Qualification can still use the indexed search snippet plus
     * official URL/reference/date evidence.
     */
    if (
      contentType.includes(
        "application/pdf",
      )
    ) {
      return {
        url: sourceUrl,
        finalUrl,
        title:
          cleanText(
            decodeURIComponent(
              new URL(finalUrl).pathname
                .split("/")
                .pop() || "",
            )
              .replace(/\.pdf$/i, "")
              .replace(/[-_]+/g, " "),
          ) || null,

        text: "",

        emails: [],
        phones: [],
        contactPageUrl: null,

        inspectedAt,
        fetchSucceeded: true,

        contentType:
          "application/pdf",

        blockedReason: null,

        digitalGapSignals: [],

        hasViewportMeta: null,
        hasContactForm: null,
        hasWhatsAppLink: null,
        hasMetaDescription: null,
        hasMeaningfulTitle: null,

        isHttps:
          finalUrl.startsWith("https://"),
      };
    }

    if (
      !contentType.includes("text/html") &&
      !contentType.includes(
        "application/xhtml+xml",
      )
    ) {
      throw new Error(
        `Unsupported source content type: ${
          contentType || "unknown"
        }`,
      );
    }

    const html =
      await readTextBodyLimited(
        response,
        MAX_HTML_RESPONSE_BYTES,
      );

    const text = htmlToText(html);

    const contactPageUrl =
      findContactPageUrl(
        html,
        finalUrl,
      );

    let emails = extractEmails(text);
    let phones = extractPhones(text);

    const digital =
      inspectDigitalSignals(
        html,
        finalUrl,
      );

    if (
      contactPageUrl &&
      getHostname(contactPageUrl) ===
        getHostname(finalUrl)
    ) {
      try {
        await assertPublicHttpUrl(
          contactPageUrl,
        );

        const contactFetch =
          await safeFetchWithRedirects(
            contactPageUrl,
            {
              headers: {
                Accept:
                  "text/html,application/xhtml+xml",

                "User-Agent":
                  "CossaLeadHunter/5.0 (+https://growth.cossanexusholdings.co.za)",
              },
            },
            PAGE_TIMEOUT_MS,
          );

        const contactContentType = (
          contactFetch.response.headers.get(
            "content-type",
          ) ?? ""
        ).toLowerCase();

        if (
          contactFetch.response.ok &&
          contactContentType.includes(
            "text/html",
          )
        ) {
          const contactHtml =
            await readTextBodyLimited(
              contactFetch.response,
              MAX_HTML_RESPONSE_BYTES,
            );

          const contactText =
            htmlToText(contactHtml);

          emails = [
            ...new Set([
              ...emails,
              ...extractEmails(
                contactText,
              ),
            ]),
          ].slice(0, 8);

          phones = [
            ...new Set([
              ...phones,
              ...extractPhones(
                contactText,
              ),
            ]),
          ].slice(0, 8);
        }
      } catch {
        /*
         * Contact-page failure does not invalidate
         * the primary source.
         */
      }
    }

    return {
      url: sourceUrl,
      finalUrl,

      title: cleanText(
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

      emails,
      phones,

      contactPageUrl:
        contactPageUrl &&
        getHostname(contactPageUrl) ===
          getHostname(finalUrl)
          ? contactPageUrl
          : null,

      inspectedAt,
      fetchSucceeded: true,

      contentType:
        contentType || "text/html",

      blockedReason: null,

      digitalGapSignals:
        digital.signals,

      hasViewportMeta:
        digital.hasViewportMeta,

      hasContactForm:
        digital.hasContactForm,

      hasWhatsAppLink:
        digital.hasWhatsAppLink,

      hasMetaDescription:
        digital.hasMetaDescription,

      hasMeaningfulTitle:
        digital.hasMeaningfulTitle,

      isHttps: digital.isHttps,
    };
  } catch (error) {
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

      contentType: null,

      blockedReason:
        error instanceof Error
          ? error.message
          : "Source inspection failed",

      digitalGapSignals: [],

      hasViewportMeta: null,
      hasContactForm: null,
      hasWhatsAppLink: null,
      hasMetaDescription: null,
      hasMeaningfulTitle: null,

      isHttps:
        sourceUrl.startsWith("https://"),
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                       SOURCE / SECTOR CLASSIFICATION                       */
/* -------------------------------------------------------------------------- */

function isGovernmentSource(
  url: string,
): boolean {
  const host = getHostname(url);

  return (
    host.endsWith(".gov.za") ||
    HIGH_TRUST_GOVERNMENT_DOMAINS.some(
      (domain) =>
        host === domain ||
        host.endsWith(`.${domain}`),
    )
  );
}

function isOfficialPublicEntitySource(
  url: string,
): boolean {
  const host = getHostname(url);

  return OFFICIAL_PUBLIC_ENTITY_DOMAINS.some(
    (domain) =>
      host === domain ||
      host.endsWith(`.${domain}`),
  );
}

function isOfficialPublicHigherEducationSource(
  url: string,
): boolean {
  const host = getHostname(url);

  return PUBLIC_HIGHER_EDUCATION_DOMAINS.some(
    (domain) =>
      host === domain ||
      host.endsWith(`.${domain}`),
  );
}

function isOfficialPublicSectorSource(
  url: string,
): boolean {
  return (
    isGovernmentSource(url) ||
    isOfficialPublicEntitySource(url) ||
    isOfficialPublicHigherEducationSource(
      url,
    )
  );
}

function effectiveSourceUrl(
  candidate: SearchCandidate,
  inspection: PageInspection,
): string {
  return (
    inspection.finalUrl ||
    candidate.url
  );
}

function isCossaFirstPartyCandidate(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const urls = [
    candidate.url,
    inspection.url,
    inspection.finalUrl,
  ];

  if (
    urls.some((url) => {
      const host = getHostname(url);

      return COSSA_FIRST_PARTY_DOMAINS.some(
        (domain) =>
          host === domain ||
          host.endsWith(`.${domain}`),
      );
    })
  ) {
    return true;
  }

  if (
    inspection.emails.some((email) =>
      email.endsWith(
        "@cossanexusholdings.co.za",
      ),
    )
  ) {
    return true;
  }

  return COSSA_FIRST_PARTY_NAME_PATTERN.test(
    `${candidate.title} ${
      inspection.title ?? ""
    }`,
  );
}

function isDirectorySource(
  url: string,
  content: string,
): boolean {
  const host = getHostname(url);

  return (
    DIRECTORY_HOST_PATTERNS.some(
      (pattern) =>
        host.includes(pattern),
    ) ||
    DIRECTORY_TEXT_PATTERN.test(content)
  );
}

function isInformationalPage(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const pageIdentity = `${candidate.title} ${candidate.snippet} ${
    inspection.title ?? ""
  } ${candidate.url}`;

  return (
    INFORMATIONAL_PAGE_PATTERN.test(
      pageIdentity,
    ) ||
    RECRUITMENT_OR_JOB_SOURCE_PATTERN.test(
      pageIdentity,
    ) ||
    REGULATORY_OR_FORUM_PAGE_PATTERN.test(
      pageIdentity,
    )
  );
}

function isRegulatoryOrForumPage(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const pageIdentity = `${candidate.title} ${candidate.snippet} ${
    inspection.title ?? ""
  } ${candidate.url}`;

  return REGULATORY_OR_FORUM_PAGE_PATTERN.test(
    pageIdentity,
  );
}

function isRecruitmentOrJobSource(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const pageIdentity = `${candidate.title} ${candidate.snippet} ${
    inspection.title ?? ""
  } ${candidate.url}`;

  const host = getHostname(
    effectiveSourceUrl(
      candidate,
      inspection,
    ),
  );

  return (
    RECRUITMENT_HOST_PATTERNS.some(
      (pattern) =>
        host.includes(pattern),
    ) ||
    RECRUITMENT_OR_JOB_SOURCE_PATTERN.test(
      pageIdentity,
    ) ||
    VACANCY_LISTING_PATTERN.test(
      pageIdentity,
    )
  );
}

function isEventOrTradeShowSource(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const identity = lowerText(
    `${candidate.title} ${
      inspection.title ?? ""
    } ${candidate.url}`,
  );

  return EVENT_OR_TRADE_SHOW_PATTERN.test(
    identity,
  );
}

function inferSectorFromSource(
  candidate: SearchCandidate,
  inspection: PageInspection,
): CandidateSector {
  const sourceUrl =
    effectiveSourceUrl(
      candidate,
      inspection,
    );

  const searchable = `${candidate.title} ${
    candidate.snippet
  } ${sourceUrl} ${
    inspection.title ?? ""
  } ${inspection.text.slice(0, 8_000)}`;

  const organisationIdentity = `${candidate.title} ${
    inspection.title ?? ""
  } ${sourceUrl}`;

  if (
    isOfficialPublicSectorSource(
      sourceUrl,
    ) ||
    inspection.emails.some((email) =>
      email.endsWith(".gov.za"),
    ) ||
    (PROCUREMENT_PATTERN.test(
      searchable,
    ) &&
      GOVERNMENT_BUYER_PATTERN.test(
        searchable,
      ))
  ) {
    return "government";
  }

  if (
    PUBLIC_SCHOOL_PATTERN.test(
      searchable,
    )
  ) {
    return "government";
  }

  if (
    /\b(?:church|ministry|nonprofit|non-profit|ngo|charity|foundation|community centre|community center)\b/i.test(
      organisationIdentity,
    ) ||
    /\b(?:registered (?:as )?(?:a )?(?:nonprofit|non-profit|npo|ngo)|charitable organisation|public benefit organisation|\bpbo\b)\b/i.test(
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

  if (sector === "private") {
    return (
      request.include_private_sector ===
      true
    );
  }

  if (sector === "government") {
    return (
      request.include_government_sector ===
      true
    );
  }

  return request.include_nonprofits === true;
}

/* -------------------------------------------------------------------------- */
/*                            COMPETITOR FILTERS                              */
/* -------------------------------------------------------------------------- */

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

  return map[service] ?? [];
}

function detectCompetitorServices(
  request: LeadHunterSearchRequest,
  content: string,
): LeadHunterServiceCategory[] {
  const matches: LeadHunterServiceCategory[] =
    [];

  for (const service of request.services) {
    const patterns =
      competitorPatternsForService(
        service,
      );

    if (
      patterns.some((pattern) =>
        pattern.test(content),
      )
    ) {
      matches.push(service);
    }
  }

  return [...new Set(matches)];
}

/* -------------------------------------------------------------------------- */
/*                          SERVICE REQUIREMENT RULES                         */
/* -------------------------------------------------------------------------- */

function serviceRequirementPatterns(
  service: LeadHunterServiceCategory,
): RegExp[] {
  const patterns: Partial<
    Record<
      LeadHunterServiceCategory,
      RegExp[]
    >
  > = {
    construction: [
      /\b(?:construction works?|building works?|civil works?|infrastructure works?|main contractor|contractor panel|general building works?)\b/i,
    ],

    renovation: [
      /\b(?:renovation|refurbishment|building upgrade|alterations?)\b/i,
    ],

    property_maintenance: [
      /\b(?:property maintenance|maintenance contract|planned maintenance|minor works?|repair works?)\b/i,
    ],

    painting: [
      /\b(?:painting works?|repainting|painting contract)\b/i,
    ],

    tiling: [
      /\b(?:tiling works?|floor tiling|wall tiling)\b/i,
    ],

    ceilings: [
      /\b(?:ceiling (?:installation|repair|repairs|works)|suspended ceilings?)\b/i,
    ],

    roofing: [
      /\b(?:roof(?:ing)? (?:works?|repair|repairs|replacement)|roof replacement)\b/i,
    ],

    plumbing: [
      /\b(?:plumbing (?:works?|repair|repairs|contract)|water reticulation)\b/i,
    ],

    facility_management: [
      /\b(?:facilit(?:y|ies) management|facility services?)\b/i,
    ],

    commercial_cleaning: [
      /\b(?:commercial cleaning|cleaning contract|cleaning services required|janitorial)\b/i,
    ],

    deep_cleaning: [
      /\b(?:deep cleaning|post[- ]construction cleaning|industrial cleaning)\b/i,
    ],

    hygiene: [
      /\b(?:hygiene|sanitation|washroom services?|sanitary services?)\b/i,
    ],

    landscaping: [
      /\b(?:landscaping|landscape maintenance|garden services?)\b/i,
    ],

    waste_management: [
      /\b(?:waste management|waste collection|refuse removal|waste disposal)\b/i,
    ],

    website_design: [
      /\b(?:website (?:design|development|redesign|upgrade)|web(?:site)? development|web design|web portal)\b/i,
    ],

    logo_design: [
      /\b(?:logo (?:design|redesign|development|upgrade)|new logo)\b/i,
    ],

    branding: [
      /\b(?:branding|brand identity|brand strategy|brand redesign)\b/i,
    ],

    seo: [
      /\b(?:SEO|search engine optimi[sz]ation)\b/i,
    ],

    digital_marketing: [
      /\b(?:digital marketing|marketing services? required|marketing campaign)\b/i,
    ],

    social_media_management: [
      /\b(?:social media (?:management|services?|campaign))\b/i,
    ],

    google_business_profile: [
      /\b(?:google business profile|google business listing|google profile)\b/i,
    ],

    lead_generation: [
      /\b(?:lead generation|appointment setting|sales leads?)\b/i,
    ],

    crm: [
      /\b(?:CRM|customer relationship management|salesforce automation)\b/i,
    ],

    ai_automation: [
      /\b(?:AI automation|artificial intelligence (?:solution|solutions)|workflow automation|business process automation)\b/i,
    ],

    business_documents: [
      /\b(?:document management|business documents?|document system)\b/i,
    ],

    quotations: [
      /\b(?:quotation system|quote system|quotations? (?:software|process|system))\b/i,
    ],

    proposals: [
      /\b(?:proposal (?:writing|development|system)|bid proposal)\b/i,
    ],

    contracts: [
      /\b(?:contract (?:management|drafting|document|system)|service level agreement)\b/i,
    ],

    ecommerce: [
      /\b(?:e-?commerce|online store|web shop|shopping cart)\b/i,
    ],
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
      ).some((pattern) =>
        pattern.test(content),
      ),
  );
}

/* -------------------------------------------------------------------------- */
/*                         GEOGRAPHIC VERIFICATION                            */
/* -------------------------------------------------------------------------- */

function requiresSouthAfricanPresence(
  request: LeadHunterSearchRequest,
  service: LeadHunterServiceCategory,
): boolean {
  if (
    request.delivery_model === "digital"
  ) {
    return false;
  }

  if (
    request.delivery_model ===
    "physical"
  ) {
    return true;
  }

  /*
   * auto mode follows the selected service.
   */
  if (isPhysicalService(service)) {
    return true;
  }

  if (
    request.search_scope ===
      "south_africa" &&
    request.countries?.some(
      (value) =>
        value.toLowerCase() ===
        "south africa",
    )
  ) {
    return true;
  }

  return false;
}

function hasVerifiedSouthAfricanPresence(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  if (
    !requiresSouthAfricanPresence(
      request,
      candidate.searchedService,
    )
  ) {
    return true;
  }

  const host = getHostname(
    effectiveSourceUrl(
      candidate,
      inspection,
    ),
  );

  if (
    host.endsWith(".co.za") ||
    host.endsWith(".org.za") ||
    host.endsWith(".ac.za") ||
    host.endsWith(".gov.za")
  ) {
    return true;
  }

  if (
    inspection.phones.some((phone) =>
      /^\+?27\d{9,10}$/.test(
        phone.replace(
          /[^\d+]/g,
          "",
        ),
      ),
    )
  ) {
    return true;
  }

  const localities = [
    ...(request.cities ?? []),
    ...(request.suburbs ?? []),
    ...(request.provinces ?? []),
    ...request.locations,
  ].filter(
    (value) =>
      value.toLowerCase() !==
      "south africa",
  );

  const localIdentity = lowerText(
    `${candidate.title} ${
      inspection.title ?? ""
    } ${candidate.url} ${
      inspection.finalUrl
    } ${inspection.text.slice(
      0,
      3_000,
    )}`,
  );

  return localities.some((locality) =>
    localIdentity.includes(
      locality.toLowerCase(),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/*                       BUYER IDENTITY VERIFICATION                          */
/* -------------------------------------------------------------------------- */

function organisationIdentitySupportsBuyerTarget(
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  const identity = lowerText(
    `${
      inspection.title ??
      candidate.title
    } ${getHostname(
      effectiveSourceUrl(
        candidate,
        inspection,
      ),
    )}`,
  );

  const target = lowerText(
    candidate.targetDescription,
  );

  const targetRules: Array<{
    target: RegExp;
    identity: RegExp;
  }> = [
    {
      target: /\b(?:property|facilit)/i,

      identity:
        /\b(?:property|properties|estate|body corporate|homeowners? association|facilit(?:y|ies)|shopping cent(?:re|er)|office park)\b/i,
    },

    {
      target:
        /\b(?:school|education|training)/i,

      identity:
        /\b(?:school|college|university|academy|training cent(?:re|er))\b/i,
    },

    {
      target:
        /\b(?:warehouse|logistics|distribution)/i,

      identity:
        /\b(?:warehouse|logistics|distribution cent(?:re|er)|freight|manufactur(?:er|ing)|factory)\b/i,
    },

    {
      target:
        /\b(?:church|nonprofit|non-profit|ngo)/i,

      identity:
        /\b(?:church|ministr(?:y|ies)|nonprofit|non-profit|ngo|charity|foundation)\b/i,
    },

    {
      target:
        /\b(?:retail|shopping)/i,

      identity:
        /\b(?:retail|shopping cent(?:re|er)|mall|store|supermarket)\b/i,
    },

    {
      target:
        /\b(?:restaurant|hospitality|hotel)/i,

      identity:
        /\b(?:restaurant|hotel|lodge|guest house|hospitality|resort)\b/i,
    },

    {
      target:
        /\b(?:healthcare|clinic|hospital)/i,

      identity:
        /\b(?:clinic|hospital|medical|healthcare|health centre|health center)\b/i,
    },
  ];

  const rule = targetRules.find(
    (candidateRule) =>
      candidateRule.target.test(
        target,
      ),
  );

  if (rule) {
    return rule.identity.test(identity);
  }

  return /\b(?:property|properties|estate|body corporate|homeowners? association|facilit(?:y|ies)|shopping cent(?:re|er)|retail|office park|warehouse|factory|manufactur(?:er|ing)|logistics|distribution cent(?:re|er)|school|college|university|clinic|hospital|hotel|restaurant|franchise|church|nonprofit|non-profit|ngo|business|consulting|services)\b/i.test(
    identity,
  );
}

function hasVerifiedResearchBuyerProfile(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): boolean {
  if (
    candidate.purpose !==
      "buyer_discovery" ||
    request.require_opportunity_signal ||
    candidate.searchedService ===
      "general" ||
    !request.services.includes(
      candidate.searchedService,
    ) ||
    !inspection.fetchSucceeded ||
    (!inspection.contactPageUrl &&
      inspection.phones.length === 0 &&
      inspection.emails.length === 0)
  ) {
    return false;
  }

  return organisationIdentitySupportsBuyerTarget(
    candidate,
    inspection,
  );
}

/* -------------------------------------------------------------------------- */
/*                         PROCUREMENT VALIDATION                             */
/* -------------------------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function validUtcDate(
  year: number,
  month: number,
  day: number,
): Date | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const parsed = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      23,
      59,
      59,
    ),
  );

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !==
      month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseProcurementDate(
  value: string,
): Date | null {
  const cleaned =
    value.replace(/\s+/g, " ");

  /*
   * 12 August 2026
   * 12-Aug-2026
   */
  const dayMonthName =
    cleaned.match(
      /\b(\d{1,2})[\s/-]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,/-]+(\d{2,4})\b/i,
    );

  if (dayMonthName) {
    const day = Number(
      dayMonthName[1],
    );

    const month =
      MONTHS[
        dayMonthName[2].toLowerCase()
      ];

    let year = Number(
      dayMonthName[3],
    );

    if (year < 100) {
      year += 2000;
    }

    return validUtcDate(
      year,
      month,
      day,
    );
  }

  /*
   * August 12, 2026
   */
  const monthNameDay =
    cleaned.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    );

  if (monthNameDay) {
    const month =
      MONTHS[
        monthNameDay[1].toLowerCase()
      ];

    const day = Number(
      monthNameDay[2],
    );

    const year = Number(
      monthNameDay[3],
    );

    return validUtcDate(
      year,
      month,
      day,
    );
  }

  /*
   * ISO:
   * 2026-08-16
   */
  const iso = cleaned.match(
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/,
  );

  if (iso) {
    return validUtcDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
    );
  }

  /*
   * South African date convention:
   * 16/08/2026 => DD/MM/YYYY
   */
  const numeric = cleaned.match(
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
  );

  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);

    let year = Number(numeric[3]);

    if (year < 100) {
      year += 2000;
    }

    return validUtcDate(
      year,
      month,
      day,
    );
  }

  return null;
}

function extractProcurementReference(
  content: string,
): string | null {
  const match = content.match(
    PROCUREMENT_REFERENCE_PATTERN,
  );

  return cleanText(match?.[1]) ?? null;
}

function validateProcurement(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  content: string,
): ProcurementValidation {
  const matchedServices =
    matchingRequestedServices(
      request,
      content,
    );

  const deadlineMatch =
    content.match(
      PROCUREMENT_DEADLINE_PATTERN,
    );

  const closingDateText =
    cleanText(deadlineMatch?.[0]);

  const closingDate =
    closingDateText
      ? parseProcurementDate(
          closingDateText,
        )
      : null;

  const referenceMatches = [
    ...content.matchAll(
      new RegExp(
        PROCUREMENT_REFERENCE_PATTERN.source,
        "gi",
      ),
    ),
  ];

  const reference =
    extractProcurementReference(
      `${content} ${candidate.url}`,
    );

  const procurementMentions =
    content.match(
      /\b(?:RFQ|RFP|RFT|RFB|tender|bid|quotation)\b/gi,
    )?.length ?? 0;

  const publicBuyers = [
    "sanral",
    "merseta",
    "state theatre",
    "eskom",
    "transnet",
    "prasa",
  ].filter((name) =>
    lowerText(content).includes(name),
  );

  const title = `${candidate.title} ${
    inspection.title ?? ""
  }`;

  const isFormalProcurement =
    PROCUREMENT_PATTERN.test(content);

  return {
    hasSelectedService:
      matchedServices.length > 0,

    matchedServices,

    hasReference: Boolean(reference),
    reference,

    closingDate,
    closingDateText,

    isExpired: Boolean(
      closingDate &&
        closingDate.getTime() <
          Date.now(),
    ),

    isAmbiguous:
      (PROCUREMENT_AGGREGATOR_PATTERN.test(
        title,
      ) &&
        procurementMentions > 2) ||
      referenceMatches.length > 2 ||
      (publicBuyers.length > 1 &&
        procurementMentions > 3),

    isFormalProcurement,
  };
}

/* -------------------------------------------------------------------------- */
/*                             BUYER ROLE                                     */
/* -------------------------------------------------------------------------- */

function inferBuyerRole(
  service: LeadHunterServiceCategory,
  content: string,
): string | null {
  const match = content.match(
    PUBLIC_BUYER_ROLE_PATTERN,
  );

  if (match?.[0]) {
    return match[0].replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
  }

  const roles: Partial<
    Record<LeadHunterServiceCategory, string>
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

  return roles[service] ?? null;
}

/* -------------------------------------------------------------------------- */
/*                               SOURCE TRUST                                 */
/* -------------------------------------------------------------------------- */

function sourceTrustScore(
  candidate: SearchCandidate,
  inspection: PageInspection,
): number {
  const sourceUrl =
    effectiveSourceUrl(
      candidate,
      inspection,
    );

  if (
    isGovernmentSource(sourceUrl)
  ) {
    return inspection.fetchSucceeded
      ? 96
      : 82;
  }

  if (
    isOfficialPublicEntitySource(
      sourceUrl,
    ) ||
    isOfficialPublicHigherEducationSource(
      sourceUrl,
    )
  ) {
    return inspection.fetchSucceeded
      ? 92
      : 78;
  }

  const combined = `${candidate.title} ${
    candidate.snippet
  } ${inspection.text.slice(
    0,
    5_000,
  )}`;

  if (
    isDirectorySource(
      sourceUrl,
      combined,
    )
  ) {
    return 20;
  }

  if (
    isInformationalPage(
      candidate,
      inspection,
    ) &&
    !PROCUREMENT_PATTERN.test(
      combined,
    )
  ) {
    return 32;
  }

  if (
    inspection.fetchSucceeded &&
    (inspection.contactPageUrl ||
      inspection.emails.length > 0 ||
      inspection.phones.length > 0)
  ) {
    return 84;
  }

  if (inspection.fetchSucceeded) {
    return 70;
  }

  if (
    inspection.blockedReason
  ) {
    return 15;
  }

  if (
    candidate.provider === "SerpAPI"
  ) {
    return 58;
  }

  if (
    candidate.provider === "Tavily"
  ) {
    return 56;
  }

  return 48;
}

/* -------------------------------------------------------------------------- */
/*                          DETERMINISTIC ASSESSMENT                          */
/* -------------------------------------------------------------------------- */

function assessCandidate(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): CandidateAssessment {
  const combined = `${candidate.title} ${
    candidate.snippet
  } ${
    inspection.title ?? ""
  } ${inspection.text.slice(
    0,
    14_000,
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

  if (inspection.blockedReason) {
    return {
      disposition: "irrelevant",
      buyerFit: 0,
      sourceTrust: 0,

      reasons: [
        `The source could not be safely inspected: ${inspection.blockedReason}.`,
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    isCossaFirstPartyCandidate(
      candidate,
      inspection,
    )
  ) {
    return {
      disposition: "irrelevant",
      buyerFit: 0,
      sourceTrust: 0,

      reasons: [
        "The result belongs to Cossa Nexus Holdings or one of its own brands and cannot be a customer prospect.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  const sector =
    inferSectorFromSource(
      candidate,
      inspection,
    );

  if (!sectorAllowed(request, sector)) {
    return {
      disposition: "sector_mismatch",
      buyerFit: 0,
      sourceTrust,

      reasons: [
        `The result belongs to the ${sector} sector, which is disabled for this hunt.`,
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    request.exclude_directories !==
      false &&
    isDirectorySource(
      effectiveSourceUrl(
        candidate,
        inspection,
      ),
      combined,
    )
  ) {
    return {
      disposition: "directory",
      buyerFit: 5,
      sourceTrust: 20,

      reasons: [
        "The page appears to be a directory or aggregator rather than one buyer organisation.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

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
      competitorForServices:
        competitors,
    };
  }

  if (
    isEventOrTradeShowSource(
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
        "The source is an event, exhibition or trade-show page rather than the official page of a customer organisation.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    isRecruitmentOrJobSource(
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
        "The source is a recruitment, staffing or job-listing business rather than a customer organisation for this hunt.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    !hasVerifiedSouthAfricanPresence(
      request,
      candidate,
      inspection,
    )
  ) {
    return {
      disposition: "irrelevant",
      buyerFit: 0,
      sourceTrust,

      reasons: [
        "The source does not verify that this physical-service prospect operates in the requested South African area.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    sector === "private" &&
    request.organisation_types
      .length > 0 &&
    !organisationIdentitySupportsBuyerTarget(
      candidate,
      inspection,
    )
  ) {
    return {
      disposition: "irrelevant",
      buyerFit: 0,
      sourceTrust,

      reasons: [
        "The official page identity does not support one of the requested buyer types.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  const procurement =
    validateProcurement(
      request,
      candidate,
      inspection,
      combined,
    );

  const formalProcurement =
    procurement.isFormalProcurement;

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
    EXPANSION_PATTERN.test(combined);

  const sellerLanguage =
    SERVICE_OFFERING_PATTERN.test(
      combined,
    );

  const customerAcquisitionProvider =
    CUSTOMER_ACQUISITION_PROVIDER_PATTERN.test(
      combined,
    );

  const offersSameService =
    competitors.length > 0;

  const informational =
    isInformationalPage(
      candidate,
      inspection,
    ) &&
    !formalProcurement &&
    !supplierRegistration &&
    !partnershipSignal;

  /*
   * IMPORTANT ORDER:
   *
   * Supplier registration is checked BEFORE the generic
   * "government without formal tender" rejection.
   *
   * A supplier-registration opportunity is not necessarily a tender.
   */
  if (supplierRegistration) {
    if (
      procurement.matchedServices
        .length === 0
    ) {
      return {
        disposition:
          "service_mismatch",

        buyerFit: 0,
        sourceTrust,

        reasons: [
          "The supplier-registration page does not identify a category matching any selected service.",
        ],

        probableBuyerRole: null,

        competitorForServices:
          competitors,
      };
    }

    if (
      sector === "government" &&
      !isOfficialPublicSectorSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
      )
    ) {
      return {
        disposition: "irrelevant",
        buyerFit: 0,
        sourceTrust,

        reasons: [
          "A government supplier-registration opportunity must be verified on an official government or public-entity source.",
        ],

        probableBuyerRole: null,
        competitorForServices:
          competitors,
      };
    }

    return {
      disposition:
        "supplier_opportunity",

      buyerFit: 85,
      sourceTrust,

      reasons: [
        "The source contains an explicit supplier-registration or vendor-database opportunity relevant to a selected service.",
      ],

      probableBuyerRole:
        "Procurement or Supply Chain Management",

      competitorForServices:
        competitors,
    };
  }

  /*
   * Explicit partnership/subcontracting routes are also evaluated before
   * generic competitor rejection.
   */
  if (partnershipSignal) {
    if (
      procurement.matchedServices
        .length === 0
    ) {
      return {
        disposition:
          "service_mismatch",

        buyerFit: 0,
        sourceTrust,

        reasons: [
          "The partnership or subcontracting page does not evidence a requirement for any selected service.",
        ],

        probableBuyerRole: null,

        competitorForServices:
          competitors,
      };
    }

    return {
      disposition: "partner",

      buyerFit: 70,
      sourceTrust,

      reasons: [
        "The source contains explicit subcontracting, supplier-panel or partnership language relevant to a selected service.",
      ],

      probableBuyerRole:
        "Operations, Contracts or Subcontracting Manager",

      competitorForServices:
        competitors,
    };
  }

  /*
   * Formal procurement.
   */
  if (formalProcurement) {
    if (
      sector === "government" &&
      !isOfficialPublicSectorSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
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
        competitorForServices:
          competitors,
      };
    }

    if (procurement.isAmbiguous) {
      return {
        disposition:
          "ambiguous_procurement",

        buyerFit: 0,
        sourceTrust,

        reasons: [
          "The page appears to aggregate multiple procurement notices or buyers rather than identify one actionable opportunity.",
        ],

        probableBuyerRole: null,
        competitorForServices:
          competitors,
      };
    }

    if (
      !procurement.hasSelectedService
    ) {
      return {
        disposition:
          "service_mismatch",

        buyerFit: 0,
        sourceTrust,

        reasons: [
          "The procurement notice does not evidence a requirement for any selected service.",
        ],

        probableBuyerRole: null,
        competitorForServices:
          competitors,
      };
    }

    if (!procurement.hasReference) {
      return {
        disposition: "irrelevant",
        buyerFit: 10,
        sourceTrust,

        reasons: [
          "The procurement page has no tender, bid, RFQ or RFP reference that can tie the requirement to one verifiable notice.",
        ],

        probableBuyerRole: null,
        competitorForServices:
          competitors,
      };
    }

    if (
      request.exclude_expired_procurement !==
        false &&
      procurement.isExpired
    ) {
      return {
        disposition:
          "expired_procurement",

        buyerFit: 0,
        sourceTrust,

        reasons: [
          "The procurement notice has an expired closing date and is not a current opportunity.",
        ],

        probableBuyerRole: null,
        competitorForServices:
          competitors,
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
        competitorForServices:
          competitors,
      };
    }

    return {
      disposition:
        "active_opportunity",

      buyerFit: 96,
      sourceTrust,

      reasons: [
        `A current procurement notice matches the selected service${
          procurement.matchedServices
            .length > 1
            ? "s"
            : ""
        }: ${procurement.matchedServices
          .map(serviceLabel)
          .join(", ")}.`,
        `Procurement reference verified: ${procurement.reference}.`,
        `Closing date verified: ${procurement.closingDate.toISOString().slice(0, 10)}.`,
      ],

      probableBuyerRole:
        "Procurement or Supply Chain Management",

      competitorForServices:
        competitors,
    };
  }

  /*
   * Government organisations are not ordinary cold-outreach prospects.
   * Without a formal procurement/supplier/partnership route, reject.
   */
  if (
    sector === "government"
  ) {
    return {
      disposition: informational
        ? "informational"
        : "irrelevant",

      buyerFit: 0,
      sourceTrust,

      reasons: [
        "The government source does not contain a verified current procurement, supplier-registration or subcontracting opportunity for a selected service.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  /*
   * Hard competitor rule.
   */
  if (
    request.exclude_competitors !==
      false &&
    offersSameService &&
    sellerLanguage
  ) {
    return {
      disposition: "competitor",

      buyerFit: 5,
      sourceTrust,

      reasons: [
        "The organisation publicly sells the same selected service the selected Cossa business is trying to offer.",
        "No separate procurement, subcontracting, supplier-panel or partnership requirement was proven.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (
    request.exclude_competitors !==
      false &&
    customerAcquisitionProvider
  ) {
    return {
      disposition: "competitor",

      buyerFit: 5,
      sourceTrust,

      reasons: [
        "The organisation appears to sell lead-generation, marketing or customer-acquisition services rather than buy them.",
        "No independent procurement or partnership requirement was proven.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  if (informational) {
    return {
      disposition: "informational",

      buyerFit: 5,

      sourceTrust: Math.min(
        sourceTrust,
        35,
      ),

      reasons: [
        "The page is primarily informational or market-content material and does not prove that the organisation is buying a selected service.",
      ],

      probableBuyerRole: null,
      competitorForServices:
        competitors,
    };
  }

  /*
   * Explicit private/nonprofit buying requirement.
   */
  if (
    strongBuyerNeed &&
    procurement.matchedServices
      .length > 0 &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit: 89,
      sourceTrust,

      reasons: [
        "A specific public buying, appointment, works or service requirement was detected.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /*
   * Expansion opportunity.
   *
   * Expansion alone is not enough.
   * There must also be a selected-service link.
   */
  if (
    expansion &&
    procurement.matchedServices
      .length > 0 &&
    !offersSameService &&
    !sellerLanguage
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit: 76,
      sourceTrust,

      reasons: [
        "A public expansion, new-premises or development signal was detected for a non-competing organisation and is relevant to a selected service.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /*
   * Deterministic digital audit.
   *
   * We do NOT depend on third-party claims such as "poor website".
   * We inspect actual HTML and only use observable deficiencies.
   */
  if (
    candidate.purpose ===
      "website_gap" &&
    DIGITAL_AUDIT_SERVICE_CATEGORIES.has(
      candidate.searchedService,
    ) &&
    !offersSameService &&
    inspection.fetchSucceeded &&
    inspection.digitalGapSignals
      .length > 0
  ) {
    const meaningfulGapCount =
      inspection.digitalGapSignals.length;

    if (meaningfulGapCount >= 2) {
      return {
        disposition:
          "active_opportunity",

        buyerFit: Math.min(
          82,
          68 +
            meaningfulGapCount * 3,
        ),

        sourceTrust,

        reasons: [
          `The organisation's inspected public website exposed ${meaningfulGapCount} objective digital improvement signals.`,
          ...inspection.digitalGapSignals.slice(
            0,
            4,
          ),
        ],

        probableBuyerRole,

        competitorForServices:
          competitors,
      };
    }
  }

  /*
   * Explicit third-party wording may support a digital gap only when
   * the inspected source itself also supports it.
   */
  if (
    candidate.purpose ===
      "website_gap" &&
    !offersSameService &&
    (WEBSITE_WEAKNESS_PATTERN.test(
      combined,
    ) ||
      BRANDING_WEAKNESS_PATTERN.test(
        combined,
      ) ||
      MARKETING_WEAKNESS_PATTERN.test(
        combined,
      )) &&
    inspection.digitalGapSignals
      .length > 0
  ) {
    return {
      disposition:
        "active_opportunity",

      buyerFit: 74,
      sourceTrust,

      reasons: [
        "A digital improvement signal was detected and at least one observable website weakness was independently confirmed on the inspected site.",
        ...inspection.digitalGapSignals.slice(
          0,
          3,
        ),
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  /*
   * Research buyer.
   */
  if (
    candidate.purpose ===
      "buyer_discovery" &&
    hasVerifiedResearchBuyerProfile(
      request,
      candidate,
      inspection,
    ) &&
    !offersSameService &&
    !sellerLanguage
  ) {
    return {
      disposition: "buyer",

      buyerFit: 62,
      sourceTrust,

      reasons: [
        `The official organisation site matches a buyer category for the selected ${serviceLabel(
          candidate.searchedService,
        )} service.`,
        "This is a verified research prospect with a public contact route; no active buying request has been proven.",
      ],

      probableBuyerRole,

      competitorForServices:
        competitors,
    };
  }

  if (
    request.exclude_competitors !==
      false &&
    offersSameService
  ) {
    return {
      disposition: "competitor",

      buyerFit: 8,
      sourceTrust,

      reasons: [
        "The organisation appears to operate in the same service market as the selected Cossa business.",
        "No independent buying, procurement or subcontracting requirement was verified.",
      ],

      probableBuyerRole: null,

      competitorForServices:
        competitors,
    };
  }

  return {
    disposition: "irrelevant",

    buyerFit: 15,
    sourceTrust,

    reasons: [
      "The source did not prove that this organisation is a suitable buyer, active opportunity or explicit partner.",
    ],

    probableBuyerRole,

    competitorForServices:
      competitors,
  };
}

/* -------------------------------------------------------------------------- */
/*                             GROQ INTERPRETATION                            */
/* -------------------------------------------------------------------------- */

function safeGroqSignalType(
  value: unknown,
): ProspectSignalType | null {
  if (typeof value !== "string") {
    return null;
  }

  const allowed: ProspectSignalType[] = [
    "general_fit",
    "request_for_quote",
    "request_for_proposal",
    "active_tender",
    "supplier_registration",
    "cleaning_need",
    "technology_need",
    "maintenance_need",
    "website_problem",
    "branding_problem",
    "inactive_marketing",
    "business_expansion",
    "new_branch",
  ];

  return allowed.includes(
    value as ProspectSignalType,
  )
    ? (value as ProspectSignalType)
    : null;
}

function parseGroqInterpretation(
  value: unknown,
  request: LeadHunterSearchRequest,
): GroqInterpretation {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {
      verdict: "not_interpreted",
      confidence: 0,
      reason: null,
      matchedServices: [],
      signalType: null,
    };
  }

  const candidate = value as {
    verdict?: unknown;
    confidence?: unknown;
    reason?: unknown;
    matched_services?: unknown;
    signal_type?: unknown;
  };

  const verdict: GroqVerdict =
    candidate.verdict === "accept" ||
    candidate.verdict === "reject" ||
    candidate.verdict === "uncertain"
      ? candidate.verdict
      : "not_interpreted";

  const matchedServices =
    Array.isArray(
      candidate.matched_services,
    )
      ? candidate.matched_services.filter(
          (
            service,
          ): service is LeadHunterServiceCategory =>
            typeof service ===
              "string" &&
            request.services.includes(
              service as LeadHunterServiceCategory,
            ),
        )
      : [];

  return {
    verdict,

    confidence: clampScore(
      candidate.confidence,
    ),

    reason:
      cleanText(candidate.reason)?.slice(
        0,
        500,
      ) ?? null,

    matchedServices: [
      ...new Set(matchedServices),
    ],

    signalType:
      safeGroqSignalType(
        candidate.signal_type,
      ),
  };
}

async function interpretCandidateWithGroq(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  deterministicAssessment: CandidateAssessment,
  environment: Environment,
): Promise<GroqInterpretation> {
  if (!environment.groqApiKey) {
    return {
      verdict: "not_interpreted",
      confidence: 0,
      reason: null,
      matchedServices: [],
      signalType: null,
    };
  }

  /*
   * GROQ receives only evidence already collected by the Hunter.
   *
   * It is forbidden from:
   * - discovering new facts,
   * - inventing a buyer,
   * - inventing contacts,
   * - inventing tender numbers,
   * - inventing closing dates,
   * - inventing values,
   * - inventing named decision-makers.
   */
  const evidencePacket = {
    requested_services:
      request.services,

    search_purpose:
      candidate.purpose,

    target_description:
      candidate.targetDescription,

    source: {
      url: candidate.url,
      final_url:
        inspection.finalUrl,
      title:
        inspection.title ||
        candidate.title,
      search_snippet:
        candidate.snippet,
      page_text:
        inspection.text.slice(
          0,
          10_000,
        ),

      digital_gap_signals:
        inspection.digitalGapSignals,
    },

    deterministic_assessment: {
      disposition:
        deterministicAssessment.disposition,

      reasons:
        deterministicAssessment.reasons,

      source_trust:
        deterministicAssessment.sourceTrust,
    },
  };

  const response = await fetchWithTimeout(
    GROQ_CHAT_COMPLETIONS_URL,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${environment.groqApiKey}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          environment.groqModel,

        temperature: 0,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",

            content: [
              "You are the evidence interpretation layer for Cossa Lead Hunter.",
              "You are NOT a search engine and may use ONLY the evidence supplied in the user message.",
              "ZERO FABRICATION RULES:",
              "Never invent an organisation, phone number, email address, decision-maker name, tender number, RFQ number, closing date, project value, requirement, location, service need, expansion, website problem, supplier opportunity or partnership.",
              "Never infer that an organisation is buying merely because it belongs to a buyer category.",
              "If the evidence is insufficient, return uncertain or reject.",
              "A competitor must not be accepted as a buyer unless separate explicit procurement, subcontracting, supplier-panel or partnership evidence is present.",
              "For government procurement, accept only evidence supporting a current official procurement notice for one of the requested services.",
              "Do not upgrade rejected deterministic evidence into an opportunity.",
              "Return JSON only.",
              'Schema: {"verdict":"accept"|"reject"|"uncertain","confidence":0-100,"reason":"short evidence-grounded explanation","matched_services":["requested service enum values only"],"signal_type":"general_fit"|"request_for_quote"|"request_for_proposal"|"active_tender"|"supplier_registration"|"cleaning_need"|"technology_need"|"maintenance_need"|"website_problem"|"branding_problem"|"inactive_marketing"|"business_expansion"|"new_branch"|null}',
            ].join("\n"),
          },

          {
            role: "user",
            content:
              JSON.stringify(
                evidencePacket,
              ),
          },
        ],
      }),
    },
    GROQ_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      await response
        .text()
        .catch(
          () =>
            `Groq ${response.status}`,
        ),
    );
  }

  const payload =
    (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

  const content =
    payload.choices?.[0]?.message
      ?.content;

  if (!content) {
    throw new Error(
      "Groq returned no interpretation",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      "Groq returned invalid JSON",
    );
  }

  return parseGroqInterpretation(
    parsed,
    request,
  );
}

function applyGroqGuardrail(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  deterministic: CandidateAssessment,
  interpretation: GroqInterpretation,
): CandidateAssessment {
  /*
   * GROQ may downgrade.
   * It may NEVER upgrade a deterministic rejection.
   */
  if (
    isRejectedDisposition(
      deterministic.disposition,
    )
  ) {
    return deterministic;
  }

  if (
    interpretation.verdict ===
      "not_interpreted"
  ) {
    return deterministic;
  }

  if (
    interpretation.verdict ===
      "reject" &&
    interpretation.confidence >= 65
  ) {
    return {
      ...deterministic,

      disposition: "irrelevant",
      buyerFit: Math.min(
        deterministic.buyerFit,
        20,
      ),

      reasons: [
        ...deterministic.reasons,
        interpretation.reason
          ? `GROQ evidence review rejected the opportunity interpretation: ${interpretation.reason}`
          : "GROQ evidence review rejected the opportunity interpretation because the supplied evidence did not support it.",
      ],
    };
  }

  /*
   * A high-confidence uncertain verdict on a weak third-party
   * active opportunity is downgraded.
   */
  if (
    interpretation.verdict ===
      "uncertain" &&
    interpretation.confidence >= 70 &&
    deterministic.disposition ===
      "active_opportunity" &&
    !isOfficialPublicSectorSource(
      effectiveSourceUrl(
        candidate,
        inspection,
      ),
    )
  ) {
    if (
      !request.require_opportunity_signal &&
      candidate.purpose ===
        "buyer_discovery" &&
      hasVerifiedResearchBuyerProfile(
        request,
        candidate,
        inspection,
      )
    ) {
      return {
        ...deterministic,

        disposition: "buyer",
        buyerFit: 58,

        reasons: [
          ...deterministic.reasons,
          interpretation.reason
            ? `GROQ could not verify an active requirement: ${interpretation.reason}`
            : "GROQ could not verify an active requirement from the supplied evidence.",
        ],
      };
    }

    return {
      ...deterministic,

      disposition: "irrelevant",
      buyerFit: 20,

      reasons: [
        ...deterministic.reasons,
        interpretation.reason
          ? `GROQ could not verify the claimed active opportunity: ${interpretation.reason}`
          : "GROQ could not verify the claimed active opportunity from the supplied evidence.",
      ],
    };
  }

  /*
   * Accept only confirms an already accepted deterministic result.
   */
  if (
    interpretation.verdict ===
      "accept" &&
    interpretation.reason
  ) {
    return {
      ...deterministic,

      reasons: [
        ...deterministic.reasons,
        `GROQ evidence review: ${interpretation.reason}`,
      ],
    };
  }

  return deterministic;
}

/* -------------------------------------------------------------------------- */
/*                                SIGNALS                                     */
/* -------------------------------------------------------------------------- */

function inferSignal(
  candidate: SearchCandidate,
  inspection: PageInspection,
  assessment: CandidateAssessment,
  groq: GroqInterpretation,
): ProspectSignal {
  const text = `${candidate.title} ${
    candidate.snippet
  } ${inspection.text.slice(
    0,
    8_000,
  )}`;

  let type: ProspectSignalType =
    "general_fit";

  let title =
    "Potential buyer-fit signal";

  let confidence = 40;

  if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(?:request for quotation|\bRFQ\b)\b/i.test(
      text,
    )
  ) {
    type = "request_for_quote";
    title =
      "Request for quotation";

    confidence =
      isGovernmentSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
      )
        ? 95
        : 86;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(?:request for proposal|\bRFP\b)\b/i.test(
      text,
    )
  ) {
    type =
      "request_for_proposal";

    title =
      "Request for proposal";

    confidence =
      isGovernmentSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
      )
        ? 95
        : 86;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    PROCUREMENT_PATTERN.test(text)
  ) {
    type = "active_tender";

    title =
      "Tender or formal procurement notice";

    confidence =
      isGovernmentSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
      )
        ? 96
        : 83;
  } else if (
    assessment.disposition ===
    "supplier_opportunity"
  ) {
    type =
      "supplier_registration";

    title =
      "Supplier-registration opportunity";

    confidence =
      isOfficialPublicSectorSource(
        effectiveSourceUrl(
          candidate,
          inspection,
        ),
      )
        ? 93
        : 84;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(?:cleaning contract|cleaning services required|appointment of.*cleaning|janitorial services required)\b/i.test(
      text,
    )
  ) {
    type = "cleaning_need";
    title =
      "Cleaning-service requirement";
    confidence = 83;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(?:website redesign required|website development tender|digital platform required|digital transformation|website upgrade required)\b/i.test(
      text,
    )
  ) {
    type = "technology_need";
    title =
      "Technology or website requirement";
    confidence = 82;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    /\b(?:maintenance contract|repair works|minor works|refurbishment|renovation project|upgrade project|building works)\b/i.test(
      text,
    )
  ) {
    type = "maintenance_need";
    title =
      "Maintenance, renovation or works requirement";
    confidence = 82;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    candidate.purpose ===
      "website_gap" &&
    inspection.digitalGapSignals
      .length > 0
  ) {
    type = "website_problem";
    title =
      "Observed website improvement opportunity";

    confidence = Math.min(
      82,
      64 +
        inspection.digitalGapSignals
          .length *
          4,
    );
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    BRANDING_WEAKNESS_PATTERN.test(
      text,
    )
  ) {
    type = "branding_problem";
    title =
      "Public branding improvement signal";
    confidence = 68;
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
      "Public marketing improvement signal";
    confidence = 68;
  } else if (
    assessment.disposition ===
      "active_opportunity" &&
    EXPANSION_PATTERN.test(text)
  ) {
    type =
      "business_expansion";

    title =
      "Business expansion or development";

    confidence =
      candidate.provider ===
      "NewsAPI"
        ? 79
        : 74;
  } else if (
    assessment.disposition ===
      "buyer"
  ) {
    type = "general_fit";
    title =
      "Potential buyer-category fit";
    confidence = 48;
  }

  /*
   * GROQ can refine the label only when its suggested signal
   * is consistent with an already accepted deterministic disposition.
   * It cannot create a tender/requirement that deterministic checks did not prove.
   */
  if (
    groq.verdict === "accept" &&
    groq.confidence >= 70 &&
    groq.signalType
  ) {
    const activeSignalTypes =
      new Set<ProspectSignalType>([
        "request_for_quote",
        "request_for_proposal",
        "active_tender",
        "supplier_registration",
        "cleaning_need",
        "technology_need",
        "maintenance_need",
        "website_problem",
        "branding_problem",
        "inactive_marketing",
        "business_expansion",
        "new_branch",
      ]);

    if (
      assessment.disposition ===
        "active_opportunity" &&
      activeSignalTypes.has(
        groq.signalType,
      )
    ) {
      type = groq.signalType;
    }
  }

  const explanation =
    assessment.disposition ===
      "active_opportunity" &&
    candidate.purpose ===
      "website_gap" &&
    inspection.digitalGapSignals
      .length > 0
      ? inspection.digitalGapSignals
          .slice(0, 4)
          .join(" ")
      : candidate.snippet.slice(
          0,
          700,
        );

  return {
    type,
    title,
    explanation,

    evidence_url:
      effectiveSourceUrl(
        candidate,
        inspection,
      ),

    detected_at:
      new Date().toISOString(),

    confidence,
  };
}

/* -------------------------------------------------------------------------- */
/*                             SERVICE ROUTING                                */
/* -------------------------------------------------------------------------- */

function chooseService(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  groq: GroqInterpretation,
): LeadHunterServiceCategory {
  const text = `${candidate.title} ${
    candidate.snippet
  } ${inspection.text.slice(
    0,
    8_000,
  )}`;

  const matchingServices =
    matchingRequestedServices(
      request,
      text,
    );

  if (matchingServices.length > 0) {
    return matchingServices[0];
  }

  if (
    groq.verdict === "accept" &&
    groq.matchedServices.length > 0
  ) {
    return groq.matchedServices[0];
  }

  if (
    request.services.includes(
      candidate.searchedService,
    )
  ) {
    return candidate.searchedService;
  }

  return (
    request.services[0] ??
    "general"
  );
}

function recommendedCompany(
  service: LeadHunterServiceCategory,
  allowed: LeadHunterCompany[],
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

    website_design: "cossa_tech",
    logo_design: "cossa_tech",
    branding: "cossa_tech",
    seo: "cossa_tech",
    crm: "cossa_tech",
    ai_automation: "cossa_tech",

    ecommerce: "cossa_store",

    google_business_profile:
      "cossa_tech",

    digital_marketing:
      "cossa_ai_growth",

    social_media_management:
      "cossa_ai_growth",

    lead_generation:
      "cossa_ai_growth",

    business_documents: "nexdocs",
    quotations: "nexdocs",
    proposals: "nexdocs",
    contracts: "nexdocs",

    general:
      "cossa_nexus_holdings",
  };

  const preferred =
    map[service] ??
    "cossa_nexus_holdings";

  return allowed.includes(preferred)
    ? preferred
    : (allowed[0] ??
        "cossa_nexus_holdings");
}

/* -------------------------------------------------------------------------- */
/*                               LOCATION                                     */
/* -------------------------------------------------------------------------- */

function inferLocation(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
): {
  city: string | null;
  province: string | null;
} {
  const searchable = lowerText(
    `${candidate.title} ${
      candidate.snippet
    } ${inspection.text.slice(
      0,
      6_000,
    )}`,
  );

  const requestedCities = [
    ...(request.cities ?? []),
    ...request.locations,
  ];

  let city: string | null = null;

  for (const item of requestedCities) {
    const key = item
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    if (
      KNOWN_SOUTH_AFRICAN_CITY_PROVINCES[
        key
      ] &&
      searchable.includes(
        item.toLowerCase(),
      )
    ) {
      city = item;
      break;
    }
  }

  if (!city) {
    for (const [
      key,
      province,
    ] of Object.entries(
      KNOWN_SOUTH_AFRICAN_CITY_PROVINCES,
    )) {
      if (searchable.includes(key)) {
        city =
          key === "capetown"
            ? "Cape Town"
            : key ===
                "portelizabeth"
              ? "Port Elizabeth"
              : key === "eastlondon"
                ? "East London"
                : key ===
                    "kemptonpark"
                  ? "Kempton Park"
                  : key ===
                      "vanderbijlpark"
                    ? "Vanderbijlpark"
                    : key
                        .charAt(0)
                        .toUpperCase() +
                      key.slice(1);

        return {
          city,
          province,
        };
      }
    }
  }

  if (city) {
    const key = city
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    const mappedProvince =
      KNOWN_SOUTH_AFRICAN_CITY_PROVINCES[
        key
      ];

    if (mappedProvince) {
      return {
        city,
        province: mappedProvince,
      };
    }
  }

  const requestedProvince = [
    ...(request.provinces ?? []),
    ...request.locations,
  ].find(
    (value) =>
      SOUTH_AFRICAN_PROVINCES.some(
        (province) =>
          province.toLowerCase() ===
          value.toLowerCase(),
      ) &&
      searchable.includes(
        value.toLowerCase(),
      ),
  );

  if (requestedProvince) {
    return {
      city: null,

      province:
        SOUTH_AFRICAN_PROVINCES.find(
          (province) =>
            province.toLowerCase() ===
            requestedProvince.toLowerCase(),
        ) ?? null,
    };
  }

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
      city: /\bpretoria\b/i.test(
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

      province: "Gauteng",
    };
  }

  return {
    city: null,
    province: null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 SCORING                                    */
/* -------------------------------------------------------------------------- */

function calculateScores(
  candidate: SearchCandidate,
  inspection: PageInspection,
  signal: ProspectSignal,
  assessment: CandidateAssessment,
): ScoreBreakdown {
  const hasPhone =
    inspection.phones.length > 0;

  const hasEmail =
    inspection.emails.length > 0;

  const hasContactPage =
    Boolean(
      inspection.contactPageUrl,
    );

  const rejected =
    isRejectedDisposition(
      assessment.disposition,
    );

  const providerAgreementBoost =
    Math.min(
      8,
      Math.max(
        0,
        candidate.corroborations
          .length - 1,
      ) * 2,
    );

  const fitScore = rejected
    ? clampScore(
        assessment.buyerFit,
      )
    : clampScore(
        assessment.buyerFit * 0.7 +
          candidate.providerScore *
            20 +
          assessment.sourceTrust *
            0.08 +
          providerAgreementBoost,
      );

  let intentBase = 5;

  if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    intentBase = [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
      ? 94
      : 77;
  } else if (
    assessment.disposition ===
    "supplier_opportunity"
  ) {
    intentBase = 74;
  } else if (
    assessment.disposition ===
    "buyer"
  ) {
    intentBase = 30;
  } else if (
    assessment.disposition ===
    "partner"
  ) {
    intentBase = 62;
  }

  const intentScore = clampScore(
    intentBase +
      signal.confidence * 0.08,
  );

  const evidenceScore = clampScore(
    assessment.sourceTrust * 0.66 +
      (inspection.fetchSucceeded
        ? 16
        : 0) +
      (hasPhone ||
      hasEmail ||
      hasContactPage
        ? 10
        : 0) +
      providerAgreementBoost,
  );

  let timingScore = 25;

  if (
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
  ) {
    timingScore = 94;
  } else if (
    signal.type ===
    "supplier_registration"
  ) {
    timingScore = 74;
  } else if (
    [
      "business_expansion",
      "new_branch",
    ].includes(signal.type)
  ) {
    timingScore = 72;
  } else if (
    assessment.disposition ===
      "active_opportunity"
  ) {
    timingScore = 68;
  } else if (
    assessment.disposition ===
    "partner"
  ) {
    timingScore = 58;
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
        (hasContactPage
          ? 20
          : 0) +
        (assessment.probableBuyerRole
          ? 5
          : 0),
    );

  let totalScore = clampScore(
    fitScore * 0.28 +
      intentScore * 0.27 +
      evidenceScore * 0.21 +
      timingScore * 0.14 +
      contactabilityScore * 0.1,
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
      74,
    );
  }

  if (rejected) {
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

function calculateSalesPriorityFromScores(
  scores: ScoreBreakdown,
): LeadHunterProspect["sales_priority"] {
  if (
    scores.totalScore >= 80 &&
    scores.contactabilityScore >= 60 &&
    (scores.intentScore >= 70 ||
      scores.timingScore >= 75)
  ) {
    return "hot";
  }

  if (
    scores.totalScore >= 65 &&
    scores.contactabilityScore >= 40
  ) {
    return "warm";
  }

  if (scores.totalScore >= 50) {
    return "cold";
  }

  return "research";
}

/* -------------------------------------------------------------------------- */
/*                            CLASSIFICATION                                  */
/* -------------------------------------------------------------------------- */

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

  return score >= 62
    ? "qualified_prospect"
    : "prospect";
}

function inferOpportunitySize(
  signal: ProspectSignal,
  sector: CandidateSector,
  text: string,
): OpportunitySize {
  if (
    /\b(?:framework agreement|framework contract|multi-year|national|province-wide|major works|large-scale|multi-site)\b/i.test(
      text,
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
    /\b(?:minor works|small works|quotation|rfq|repair|once-off)\b/i.test(
      text,
    )
  ) {
    return "small";
  }

  return "unknown";
}

/* -------------------------------------------------------------------------- */
/*                                  EVIDENCE                                  */
/* -------------------------------------------------------------------------- */

function evidenceTypeForCandidate(
  candidate: SearchCandidate,
  inspection: PageInspection,
  signal: ProspectSignal,
): EvidenceType {
  const sourceUrl =
    effectiveSourceUrl(
      candidate,
      inspection,
    );

  if (
    isOfficialPublicSectorSource(
      sourceUrl,
    )
  ) {
    return [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
      ? "tender_notice"
      : "government_portal";
  }

  if (
    candidate.provider === "NewsAPI"
  ) {
    return "news_report";
  }

  if (
    candidate.purpose ===
    "website_gap"
  ) {
    return "website_audit";
  }

  if (/contact/i.test(sourceUrl)) {
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
    getHostname(candidate.url);

  const cleaned = cleanText(
    source
      .replace(
        /\s+[|–—]\s+.*$/,
        "",
      )
      .replace(
        /\b(?:home|contact us|about us|tenders?|rfq|rfp|official website)\b/gi,
        " ",
      ),
  );

  return (
    cleaned ||
    getHostname(candidate.url)
  );
}

function independentEvidenceSourceCount(
  evidence: ProspectEvidence[],
): number {
  const hosts = new Set<string>();

  for (const item of evidence) {
    const host = getHostname(
      item.url,
    );

    if (host) {
      hosts.add(host);
    }
  }

  return hosts.size;
}

function hasOfficialEvidence(
  prospect: LeadHunterProspect,
): boolean {
  return prospect.evidence.some(
    (evidence) =>
      [
        "official_website",
        "government_portal",
        "tender_notice",
        "website_audit",
      ].includes(evidence.type),
  );
}

/* -------------------------------------------------------------------------- */
/*                               PROSPECT                                     */
/* -------------------------------------------------------------------------- */

function normalisePhoneKey(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(
    /\D/g,
    "",
  );

  if (digits.length < 9) {
    return null;
  }

  return digits.slice(-9);
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
      /\b(?:pty|ltd|limited|cc|inc|company|holdings|group|south africa)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]/g, "");
}

function createProspect(
  request: LeadHunterSearchRequest,
  candidate: SearchCandidate,
  inspection: PageInspection,
  assessment: CandidateAssessment,
  groq: GroqInterpretation,
): LeadHunterProspect {
  const signal = inferSignal(
    candidate,
    inspection,
    assessment,
    groq,
  );

  const service = chooseService(
    request,
    candidate,
    inspection,
    groq,
  );

  const scores = calculateScores(
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

  const location = inferLocation(
    request,
    candidate,
    inspection,
  );

  const rejected =
    isRejectedDisposition(
      assessment.disposition,
    );

  const hasContact = Boolean(
    inspection.phones.length ||
      inspection.emails.length,
  );

  const primaryUrl =
    effectiveSourceUrl(
      candidate,
      inspection,
    );

  const evidence: ProspectEvidence[] = [
    {
      type: evidenceTypeForCandidate(
        candidate,
        inspection,
        signal,
      ),

      title: candidate.title,

      url: primaryUrl,

      publisher:
        getHostname(primaryUrl) ||
        null,

      published_at:
        candidate.publishedAt,

      checked_at:
        inspection.inspectedAt,

      excerpt:
        candidate.purpose ===
          "website_gap" &&
        inspection.digitalGapSignals
          .length > 0
          ? inspection.digitalGapSignals
              .slice(0, 4)
              .join(" ")
              .slice(0, 900)
          : candidate.snippet.slice(
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

  /*
   * Search-provider corroboration is evidence only if it represents
   * a different URL/domain. Multiple providers pointing to the same page
   * are not treated as independent sources.
   */
  for (const corroboration of candidate.corroborations) {
    const url = normaliseUrl(
      corroboration.url,
    );

    if (!url) {
      continue;
    }

    if (
      canonicalUrlKey(url) ===
      canonicalUrlKey(primaryUrl)
    ) {
      continue;
    }

    if (
      evidence.some(
        (item) =>
          canonicalUrlKey(
            item.url,
          ) ===
          canonicalUrlKey(url),
      )
    ) {
      continue;
    }

    evidence.push({
      type:
        corroboration.provider ===
        "NewsAPI"
          ? "news_report"
          : "official_website",

      title:
        corroboration.title,

      url,

      publisher:
        getHostname(url) || null,

      published_at:
        corroboration.publishedAt,

      checked_at:
        inspection.inspectedAt,

      excerpt:
        corroboration.snippet.slice(
          0,
          900,
        ),

      supports: [
        "source corroboration",
        corroboration.provider,
      ],
    });
  }

  if (
    inspection.contactPageUrl &&
    canonicalUrlKey(
      inspection.contactPageUrl,
    ) !== canonicalUrlKey(primaryUrl)
  ) {
    evidence.push({
      type: "contact_page",

      title: `${organisationName} public contact page`,

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
        "Public contact route discovered and inspected on the organisation website.",

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

  const independentSources =
    independentEvidenceSourceCount(
      evidence,
    );

  const sourceUrlIsOfficialPublic =
    isOfficialPublicSectorSource(
      primaryUrl,
    );

  const researchBuyerVerified =
    assessment.disposition ===
      "buyer" &&
    inspection.fetchSucceeded &&
    Boolean(
      inspection.contactPageUrl ||
        hasContact,
    );

  const verificationStatus =
    rejected
      ? "rejected"
      : sourceUrlIsOfficialPublic &&
          [
            "tender",
            "supplier_opportunity",
          ].includes(classification)
        ? "verified"
        : independentSources >= 2
          ? "verified"
          : researchBuyerVerified
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
    sector === "government"
      ? "Use the official procurement or Supply Chain Management contact in the bid documentation. Confirm the tender or RFQ reference, closing date, submission method and eligibility before acting."
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
      ? `${organisationName} has specific public evidence that may indicate a current requirement for ${serviceLabel(
          service,
        )}. Open and verify the evidence before outreach, quotation preparation or bidding.`
      : assessment.disposition ===
          "buyer"
        ? `${organisationName} is a verified research prospect in a buyer category that can purchase ${serviceLabel(
            service,
          )}. No active buying request has been proven, so research a specific need before outreach.`
        : assessment.disposition ===
            "partner"
          ? `${organisationName} has explicit public subcontracting, supplier-panel or partnership evidence relevant to ${serviceLabel(
              service,
            )}.`
          : assessment.reasons.join(
              " ",
            );

  const nextAction = rejected
    ? `Do not save this result as a customer lead. Reason: ${assessment.reasons.join(
        " ",
      )}`
    : sector === "government"
      ? "Open the official notice. Confirm the reference number, closing date, briefing requirements, CIDB grading where applicable, CSD requirements, submission method and bid/no-bid decision."
      : assessment.disposition ===
          "partner"
        ? "Open the evidence source and verify the subcontractor, supplier-panel or partnership requirement. Confirm eligibility before preparing any approach."
        : activeOpportunity
          ? `Open the supporting evidence and verify the requirement. Then contact the ${
              assessment.probableBuyerRole ??
              "relevant decision-maker"
            } using a personalised, evidence-based approach after human approval.`
          : `Verify the organisation and public contact route. Research one specific business pain point before preparing outreach to the ${
              assessment.probableBuyerRole ??
              "relevant decision-maker"
            }.`;

  const outreachAngle =
    rejected ||
    sector === "government"
      ? null
      : assessment.disposition ===
          "partner"
        ? "Reference the verified subcontracting, supplier-panel or partnership route and explain the specific selected-business capability relevant to it."
        : activeOpportunity
          ? candidate.purpose ===
              "website_gap"
            ? `Reference only observable website findings such as: ${inspection.digitalGapSignals
                .slice(0, 2)
                .join(
                  " ",
                )} Offer a practical review without claiming the organisation requested contact.`
            : "Reference only the specific public requirement or development evidence. Offer a low-friction next step such as a short discovery call or site assessment without claiming that the organisation requested contact from Cossa."
          : "Introduce the selected Cossa business briefly, explain one relevant outcome for organisations of this type, and offer a low-friction next step such as a site assessment, website review or short needs discussion.";

  const revenuePotentialScore =
    clampScore(
      scores.totalScore * 0.55 +
        scores.intentScore * 0.25 +
        scores.timingScore * 0.2,
    );

  const easeToCloseScore =
    clampScore(
      scores.contactabilityScore *
        0.45 +
        scores.intentScore * 0.3 +
        scores.fitScore * 0.25,
    );

  const recurringRevenueScore = [
    "facility_management",
    "commercial_cleaning",
    "hygiene",
    "landscaping",
    "seo",
    "digital_marketing",
    "social_media_management",
    "lead_generation",
    "crm",
    "ai_automation",
  ].includes(service)
    ? 75
    : 35;

  const salesPriority: LeadHunterProspect["sales_priority"] =
    rejected ||
    (classification ===
      "prospect" &&
      signal.type === "general_fit")
      ? "research"
      : calculateSalesPriorityFromScores(
          scores,
        );

  const whyContact = rejected
    ? []
    : [
        activeOpportunity
          ? "Specific public evidence indicates a possible current requirement."
          : "The organisation matches the selected buyer profile; confirm a specific need before outreach.",

        ...(hasContact
          ? [
              "A public contact route was found on the inspected source.",
            ]
          : []),

        ...(independentSources >= 2
          ? [
              `${independentSources} independent source domains support the organisation record.`,
            ]
          : []),
      ];

  return {
    id: crypto.randomUUID(),

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

    website: primaryUrl,

    public_phone: rejected
      ? null
      : (inspection.phones[0] ??
        null),

    public_email: rejected
      ? null
      : (inspection.emails[0] ??
        null),

    identity_keys: rejected
      ? []
      : [
          ...new Set([
            ...inspection.phones
              .map(
                normalisePhoneKey,
              )
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              )
              .map(
                (value) =>
                  `phone:${value}`,
              ),

            ...inspection.emails
              .map(
                normaliseEmailKey,
              )
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              )
              .map(
                (value) =>
                  `email:${value}`,
              ),
          ]),
        ],

    contact_page_url: rejected
      ? null
      : inspection.contactPageUrl,

    contact_name: null,

    contact_title:
      assessment.probableBuyerRole,

    decision_maker_route:
      decisionMakerRoute,

    address: null,
    suburb: null,

    city: location.city,
    province: location.province,
    country: "South Africa",

    recommended_company:
      recommendedCompany(
        service,
        request.companies,
      ),

    recommended_service: service,

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

    fit_score: scores.fitScore,
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
      revenuePotentialScore,

    ease_to_close_score:
      easeToCloseScore,

    recurring_revenue_score:
      recurringRevenueScore,

    geographic_fit_score:
      location.province ||
      location.city
        ? 80
        : 55,

    sales_priority:
      salesPriority,

    why_contact: whyContact,

    signals: [signal],

    evidence,

    primary_source_url:
      primaryUrl,

    date_verified:
      inspection.inspectedAt,

    next_action: nextAction,

    outreach_angle:
      outreachAngle,

    duplicate_status:
      "not_checked",

    duplicate_lead_id: null,

    rejection_reasons: rejected
      ? assessment.reasons
      : [],

    raw_provider_name:
      candidate.provider,

    raw_provider_result_id:
      null,
  };
}

/* -------------------------------------------------------------------------- */
/*                        ENTITY-LEVEL DEDUPLICATION                          */
/* -------------------------------------------------------------------------- */

function prospectIdentityKeys(
  prospect: LeadHunterProspect,
): string[] {
  const keys: string[] = [];

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

  if (phone) {
    keys.push(`phone:${phone}`);
  }

  if (email) {
    keys.push(`email:${email}`);
  }

  for (const identityKey of
    prospect.identity_keys ?? []) {
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
    organisation &&
    organisation.length >= 5
  ) {
    keys.push(
      `organisation:${organisation}`,
    );
  }

  return [...new Set(keys)];
}

function commercialRank(
  prospect: LeadHunterProspect,
): number {
  const active = [
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
    (prospect.verification_status ===
    "verified"
      ? 8
      : 0) +
    (prospect.public_phone
      ? 3
      : 0) +
    (prospect.public_email
      ? 3
      : 0)
  );
}

function mergeEvidence(
  first: ProspectEvidence[],
  second: ProspectEvidence[],
): ProspectEvidence[] {
  const map =
    new Map<
      string,
      ProspectEvidence
    >();

  for (const evidence of [
    ...first,
    ...second,
  ]) {
    const key =
      canonicalUrlKey(
        evidence.url,
      );

    if (!map.has(key)) {
      map.set(key, evidence);
    }
  }

  return [...map.values()];
}

function mergeRelatedProspects(
  prospects: LeadHunterProspect[],
): LeadHunterProspect[] {
  const sorted = [...prospects].sort(
    (a, b) =>
      commercialRank(b) -
      commercialRank(a),
  );

  const groups: Array<{
    prospect: LeadHunterProspect;
    keys: Set<string>;
  }> = [];

  for (const prospect of sorted) {
    if (
      prospect.classification ===
        "rejected" ||
      prospect.verification_status ===
        "rejected"
    ) {
      groups.push({
        prospect,
        keys: new Set(
          prospectIdentityKeys(
            prospect,
          ),
        ),
      });

      continue;
    }

    const keys = new Set(
      prospectIdentityKeys(
        prospect,
      ),
    );

    const existing =
      groups.find((group) =>
        [...keys].some((key) =>
          group.keys.has(key),
        ),
      );

    if (!existing) {
      groups.push({
        prospect,
        keys,
      });

      continue;
    }

    const primary =
      commercialRank(prospect) >
      commercialRank(
        existing.prospect,
      )
        ? prospect
        : existing.prospect;

    const secondary =
      primary === prospect
        ? existing.prospect
        : prospect;

    primary.evidence =
      mergeEvidence(
        primary.evidence,
        secondary.evidence,
      );

    primary.signals = [
      ...new Map(
        [
          ...primary.signals,
          ...secondary.signals,
        ].map((signal) => [
          `${signal.type}|${signal.evidence_url}`,
          signal,
        ]),
      ).values(),
    ];

    primary.identity_keys = [
      ...new Set([
        ...(primary.identity_keys ??
          []),
        ...(secondary.identity_keys ??
          []),
      ]),
    ];

    if (
      !primary.public_phone &&
      secondary.public_phone
    ) {
      primary.public_phone =
        secondary.public_phone;
    }

    if (
      !primary.public_email &&
      secondary.public_email
    ) {
      primary.public_email =
        secondary.public_email;
    }

    if (
      !primary.contact_page_url &&
      secondary.contact_page_url
    ) {
      primary.contact_page_url =
        secondary.contact_page_url;
    }

    const sourceCount =
      independentEvidenceSourceCount(
        primary.evidence,
      );

    if (
      sourceCount >= 2 &&
      primary.verification_status !==
        "rejected"
    ) {
      primary.verification_status =
        "verified";

      primary.why_contact = [
        ...new Set([
          ...primary.why_contact,
          `${sourceCount} independent source domains support the merged organisation record.`,
        ]),
      ];
    }

    existing.prospect = primary;

    for (const key of keys) {
      existing.keys.add(key);
    }

    for (const key of prospectIdentityKeys(
      primary,
    )) {
      existing.keys.add(key);
    }
  }

  return groups.map(
    (group) => group.prospect,
  );
}

/* -------------------------------------------------------------------------- */
/*                      CROSS-SOURCE OPPORTUNITY CONTROL                      */
/* -------------------------------------------------------------------------- */

function enforceCrossVerification(
  prospect: LeadHunterProspect,
  request: LeadHunterSearchRequest,
): LeadHunterProspect {
  if (
    prospect.classification ===
      "rejected" ||
    prospect.verification_status ===
      "rejected"
  ) {
    return prospect;
  }

  const independentSources =
    independentEvidenceSourceCount(
      prospect.evidence,
    );

  const officialEvidence =
    hasOfficialEvidence(prospect);

  const isActive = [
    "active_opportunity",
    "tender",
    "supplier_opportunity",
  ].includes(
    prospect.classification,
  );

  if (!isActive) {
    return prospect;
  }

  /*
   * An official current government tender/RFQ can stand on one
   * authoritative source.
   */
  if (
    prospect.sector ===
      "government" &&
    prospect.evidence.some(
      (item) =>
        item.type ===
        "tender_notice",
    )
  ) {
    return prospect;
  }

  /*
   * A private/nonprofit active opportunity should not be based
   * exclusively on one third-party news/article source.
   */
  if (
    independentSources < 2 &&
    !officialEvidence
  ) {
    if (
      request.require_opportunity_signal
    ) {
      return {
        ...prospect,

        classification:
          "rejected",

        verification_status:
          "rejected",

        total_score: Math.min(
          prospect.total_score,
          25,
        ),

        sales_priority:
          "research",

        rejection_reasons: [
          ...prospect.rejection_reasons,
          "The claimed active opportunity was supported only by a single non-official source and could not be independently verified.",
        ],

        public_phone: null,
        public_email: null,

        outreach_angle: null,

        next_action:
          "Do not contact this organisation as an active opportunity until the requirement is independently verified.",
      };
    }

    return {
      ...prospect,

      classification:
        "prospect",

      verification_status:
        "partially_verified",

      sales_priority:
        "research",

      total_score: Math.min(
        prospect.total_score,
        68,
      ),

      opportunity_summary:
        "The organisation may be relevant, but the active opportunity signal was supported only by a single non-official source and requires independent verification.",

      next_action:
        "Research the organisation and verify the alleged requirement on an official or second independent source before outreach.",
    };
  }

  return prospect;
}

/* -------------------------------------------------------------------------- */
/*                              FILTERING                                     */
/* -------------------------------------------------------------------------- */

function filterProspects(
  prospects: LeadHunterProspect[],
  request: LeadHunterSearchRequest,
): {
  prospects: LeadHunterProspect[];
  duplicateEntityCount: number;
} {
  const accepted: LeadHunterProspect[] =
    [];

  for (const prospect of prospects) {
    if (
      prospect.verification_status ===
        "rejected" ||
      prospect.classification ===
        "rejected"
    ) {
      continue;
    }

    if (
      prospect.sector ===
        "mixed" ||
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

    /*
     * Evidence source minimum means independent domains,
     * not multiple pages from the same organisation website.
     */
    const independentSources =
      independentEvidenceSourceCount(
        prospect.evidence,
      );

    const authoritativeSingleSource =
      prospect.sector ===
        "government" &&
      prospect.evidence.some(
        (evidence) =>
          evidence.type ===
          "tender_notice",
      );

    if (
      independentSources <
        request.minimum_evidence_sources &&
      !authoritativeSingleSource
    ) {
      continue;
    }

    if (
      request.verified_sources_only &&
      prospect.evidence_score < 55
    ) {
      continue;
    }

    accepted.push(prospect);
  }

  accepted.sort(
    (first, second) =>
      commercialRank(second) -
      commercialRank(first),
  );

  const selected: LeadHunterProspect[] =
    [];

  const occupiedKeys =
    new Set<string>();

  let duplicateEntityCount = 0;

  for (const prospect of accepted) {
    const keys =
      prospectIdentityKeys(
        prospect,
      );

    const duplicatesExisting =
      keys.some((key) =>
        occupiedKeys.has(key),
      );

    if (duplicatesExisting) {
      duplicateEntityCount += 1;
      continue;
    }

    selected.push(prospect);

    for (const key of keys) {
      occupiedKeys.add(key);
    }

    if (
      selected.length >=
      request.result_count
    ) {
      break;
    }
  }

  return {
    prospects: selected,
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
    (prospect) =>
      prospect.rejection_reasons.some(
        (reason) =>
          reason
            .toLowerCase()
            .includes(lowered),
      ),
  ).length;
}

/* -------------------------------------------------------------------------- */
/*                                API ROUTE                                   */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute(
  "/api/lead-hunter/search",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const environment =
          getEnvironment();

        if (!environment) {
          return new Response(
            "Lead Hunter is not configured. Add Supabase variables and at least one public search provider key: SERPAPI_API_KEY, TAVILY_API_KEY or NEWS_API_KEY. GROQ_API_KEY is optional but recommended for the evidence-interpretation layer.",
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
          await verifySupabaseUser(
            token,
            environment,
          );

        if (!user) {
          return new Response(
            "Your session could not be verified. Sign out and sign in again.",
            {
              status: 401,
            },
          );
        }

        const authorised =
          await verifyOrganisationMembership(
            token,
            user.id,
            environment,
          );

        if (!authorised) {
          return new Response(
            "You are not authorised to use the Cossa Lead Hunter.",
            {
              status: 403,
            },
          );
        }

        const limit =
          enforceRateLimit(user.id);

        if (!limit.allowed) {
          return new Response(
            `Lead Hunter rate limit reached. Try again in ${limit.retryAfterSeconds} seconds.`,
            {
              status: 429,

              headers: {
                "Retry-After": String(
                  limit.retryAfterSeconds,
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
          validateRequest(rawPayload);

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

        const plans =
          createSearchQueries(
            searchRequest,
          );

        if (plans.length === 0) {
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

        const candidates: SearchCandidate[] =
          [];

        const successfulProviders =
          new Set<SearchProvider>();

        /*
         * Search plan calls are parallelised.
         * Each individual plan still follows:
         *
         * SerpAPI -> Tavily -> NewsAPI
         */
        const executions =
          await Promise.all(
            plans.map((plan) =>
              executePlanWithCache(
                plan,
                environment,
                searchRequest,
                token,
              ),
            ),
          );

        const reusedPlanCount =
          executions.filter(
            (execution) =>
              execution.reusedCache,
          ).length;

        if (reusedPlanCount > 0) {
          warnings.push(
            `Reused ${reusedPlanCount}/${plans.length} recent public-source searches; those plans did not consume fresh provider searches. Source inspection, expiry checks, sector checks, competitor checks and buyer qualification were run again.`,
          );
        }

        for (const execution of executions) {
          for (const result of
            execution.results) {
            if (result.warning) {
              warnings.push(
                result.warning,
              );
            }

            if (
              result.candidates
                .length > 0
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
          const empty: LeadHunterSearchResponse =
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
                ...warnings.slice(
                  0,
                  10,
                ),

                "No public search results matched this hunt. Broaden the location, buyer type, service or search-depth settings.",

                "Zero-fabrication protection remained active: Lead Hunter returned no prospects rather than manufacturing organisations or opportunities.",
              ],

              providers_used: [
                ...successfulProviders,

                "Cossa deterministic buyer-intelligence qualification",

                ...(environment.groqApiKey
                  ? [
                      `GROQ evidence interpretation (${environment.groqModel})`,
                    ]
                  : []),
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

        /*
         * Inspect actual public sources with bounded concurrency.
         */
        const inspections =
          await mapWithConcurrency(
            uniqueCandidates,
            SOURCE_INSPECTION_CONCURRENCY,
            async (candidate) =>
              inspectSourcePage(
                candidate.url,
              ),
          );

        /*
         * Deterministic qualification happens BEFORE GROQ.
         *
         * GROQ is not allowed to rescue rejected evidence.
         */
        const deterministicAssessments =
          uniqueCandidates.map(
            (candidate, index) =>
              assessCandidate(
                searchRequest,
                candidate,
                inspections[index],
              ),
          );

        const groqInterpretations: GroqInterpretation[] =
          uniqueCandidates.map(
            () => ({
              verdict:
                "not_interpreted",

              confidence: 0,
              reason: null,
              matchedServices: [],
              signalType: null,
            }),
          );

        let groqUsedCount = 0;

        if (environment.groqApiKey) {
          const interpretationIndexes =
            deterministicAssessments
              .map(
                (
                  assessment,
                  index,
                ) => ({
                  assessment,
                  index,
                }),
              )
              .filter(
                ({
                  assessment,
                }) =>
                  !isRejectedDisposition(
                    assessment.disposition,
                  ),
              )
              .sort(
                (first, second) =>
                  second.assessment
                    .buyerFit -
                  first.assessment
                    .buyerFit,
              )
              .slice(
                0,
                MAX_GROQ_INTERPRETATIONS,
              );

          const interpretationResults =
            await mapWithConcurrency(
              interpretationIndexes,
              GROQ_CONCURRENCY,
              async ({
                index,
              }) => {
                try {
                  const result =
                    await interpretCandidateWithGroq(
                      searchRequest,
                      uniqueCandidates[
                        index
                      ],
                      inspections[
                        index
                      ],
                      deterministicAssessments[
                        index
                      ],
                      environment,
                    );

                  return {
                    index,
                    result,
                    warning: null,
                  };
                } catch (error) {
                  return {
                    index,

                    result: {
                      verdict:
                        "not_interpreted" as const,

                      confidence: 0,
                      reason: null,

                      matchedServices: [],

                      signalType: null,
                    },

                    warning: `GROQ interpretation skipped for ${uniqueCandidates[index].url}: ${
                      error instanceof Error
                        ? error.message
                        : "Unknown error"
                    }`,
                  };
                }
              },
            );

          for (const item of
            interpretationResults) {
            groqInterpretations[
              item.index
            ] = item.result;

            if (
              item.result.verdict !==
              "not_interpreted"
            ) {
              groqUsedCount += 1;
            }

            if (item.warning) {
              warnings.push(
                item.warning,
              );
            }
          }
        }

        const finalAssessments =
          deterministicAssessments.map(
            (assessment, index) =>
              applyGroqGuardrail(
                searchRequest,
                uniqueCandidates[
                  index
                ],
                inspections[index],
                assessment,
                groqInterpretations[
                  index
                ],
              ),
          );

        const rawProspects =
          uniqueCandidates.map(
            (candidate, index) =>
              createProspect(
                searchRequest,
                candidate,
                inspections[index],
                finalAssessments[
                  index
                ],
                groqInterpretations[
                  index
                ],
              ),
          );

        /*
         * Merge different pages / provider results that resolve to the
         * same organisation through phone, email, domain or organisation key.
         *
         * This also allows independent news/official-site evidence to
         * reinforce one organisation instead of showing duplicates.
         */
        const mergedProspects =
          mergeRelatedProspects(
            rawProspects,
          );

        const crossVerifiedProspects =
          mergedProspects.map(
            (prospect) =>
              enforceCrossVerification(
                prospect,
                searchRequest,
              ),
          );

        const filtered =
          filterProspects(
            crossVerifiedProspects,
            searchRequest,
          );

        const acceptedProspects =
          filtered.prospects;

        const rejectedCompetitors =
          countRejectedByReason(
            crossVerifiedProspects,
            "same selected service",
          ) +
          countRejectedByReason(
            crossVerifiedProspects,
            "same service market",
          );

        const rejectedDirectories =
          countRejectedByReason(
            crossVerifiedProspects,
            "directory or aggregator",
          );

        const rejectedInformational =
          countRejectedByReason(
            crossVerifiedProspects,
            "informational",
          ) +
          countRejectedByReason(
            crossVerifiedProspects,
            "forum discussion",
          );

        const rejectedSectorMismatch =
          countRejectedByReason(
            crossVerifiedProspects,
            "sector, which is disabled",
          );

        const rejectedUnsupported =
          countRejectedByReason(
            crossVerifiedProspects,
            "did not prove",
          ) +
          countRejectedByReason(
            crossVerifiedProspects,
            "could not be independently verified",
          );

        const rejectedUnsafeSources =
          countRejectedByReason(
            crossVerifiedProspects,
            "could not be safely inspected",
          );

        const rejectedExpired =
          countRejectedByReason(
            crossVerifiedProspects,
            "expired closing date",
          );

        const rejectedTotal =
          crossVerifiedProspects.length -
          acceptedProspects.length;

        const successfulInspections =
          inspections.filter(
            (inspection) =>
              inspection.fetchSucceeded,
          ).length;

        const blockedInspections =
          inspections.filter(
            (inspection) =>
              Boolean(
                inspection.blockedReason,
              ),
          ).length;

        const qualityNotice =
          [
            `Quality control rejected ${rejectedCompetitors} apparent competitors`,

            `${rejectedDirectories} directories or aggregators`,

            `${rejectedInformational} informational/recruitment/forum pages`,

            `${rejectedSectorMismatch} sector-mismatched results`,

            `${rejectedExpired} expired procurement notices`,

            `${rejectedUnsafeSources} unsafe or uninspectable sources`,

            `${filtered.duplicateEntityCount} duplicate organisation records`,

            `${rejectedUnsupported} unsupported or insufficiently verified results`,
          ].join(", ") + ".";

        const responsePayload: LeadHunterSearchResponse =
          {
            hunt_id:
              crypto.randomUUID(),

            status: "completed",

            searched_at:
              searchedAt,

            completed_at:
              new Date().toISOString(),

            request: searchRequest,

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
                12,
              ),

              qualityNotice,

              `Source inspection: ${successfulInspections}/${uniqueCandidates.length} candidate pages were successfully inspected; ${blockedInspections} were blocked or unavailable.`,

              `Search query budget: ${plans.length}/${searchRequest.max_search_queries ?? plans.length} plans used.`,

              ...(environment.groqApiKey
                ? [
                    `GROQ evidence interpretation reviewed ${groqUsedCount} deterministic candidate assessments. GROQ was permitted to confirm or downgrade evidence, never fabricate or independently create an opportunity.`,
                  ]
                : [
                    "GROQ_API_KEY is not configured. Deterministic source verification remains active, but the optional GROQ evidence-interpretation layer was skipped.",
                  ]),

              ...(acceptedProspects.length ===
              0
                ? [
                    "Search results were found, but none met the buyer-fit, evidence, sector, source-verification and score requirements. Lead Hunter deliberately returns zero rather than fabricate or weaken qualification rules.",
                  ]
                : []),

              "A qualified prospect is not automatically an active buyer. Active opportunities require supported procurement, explicit service need, objective digital-gap evidence or verified expansion evidence.",

              "Government opportunities require authoritative procurement, supplier-registration or subcontracting evidence. Ordinary government webpages are not treated as sales leads.",

              "Companies that sell the same selected service are rejected unless a separate procurement, subcontracting, supplier-panel or partnership route is explicitly evidenced.",

              "Evidence-source minimums are calculated from independent source domains. Multiple pages from one website do not count as independent verification.",

              "Lead Hunter does not fabricate names, phone numbers, email addresses, tender references, closing dates, project values, service requirements or decision-maker identities.",

              "Public contact details must be used only for lawful, relevant and respectful business outreach.",

              "Human verification is required before outreach, quotation preparation, tender submission or contractual commitment.",
            ],

            providers_used: [
              ...successfulProviders,

              "Cossa deterministic buyer-intelligence qualification",

              "Public-source SSRF and redirect safety verification",

              "Independent-source and entity deduplication",

              ...(groqUsedCount > 0
                ? [
                    `GROQ evidence interpretation (${environment.groqModel})`,
                  ]
                : []),

              ...(searchRequest.include_government_sector
                ? [
                    "Official South African government, eTender, municipality and public-entity verification",
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

              "X-Content-Type-Options":
                "nosniff",
            },
          },
        );
      },
    },
  },
});
