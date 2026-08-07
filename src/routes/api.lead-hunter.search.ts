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

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const NEWS_API_URL = "https://newsapi.org/v2/everything";

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
  /\b(career guide|careers?|qualification|registered qualifications?|learnership|course|training programme|employment opportunities|recommended subjects|blog|useful information|industry overview|what is|how to become)\b/i;

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
  /\b(procurement manager|supply chain manager|facilities manager|facility manager|property manager|estate manager|operations manager|school principal|administrator|marketing manager|it manager|project manager|business owner|managing director|bid manager|contracts manager)\b/i;

const GOVERNMENT_MISSION_PATTERN =
  /\b(government|municipality|municipal|department|public sector|tender|rfq|rfp|bid|procurement|etender|supplier database|vendor database)\b/i;

const DIGITAL_AUDIT_MISSION_PATTERN =
  /\b(website|web design|redesign|logo|branding|seo|google business|google profile|online presence|social media|digital marketing|crm|automation|ecommerce|e-commerce)\b/i;

type SearchProvider = "Tavily" | "SerpAPI" | "NewsAPI";

type Environment = {
  tavilyApiKey: string | null;
  serpApiKey: string | null;
  newsApiKey: string | null;
  supabaseUrl: string;
  supabaseKey: string;
  organisationId: string;
};

type SupabaseUser = { id: string; email?: string };

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

type RateLimitEntry = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimitEntry>();

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
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
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normaliseProviderScore(value: unknown, fallback = 0.5): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(1, parsed))
    : fallback;
}

function getEnvironment(): Environment | null {
  const tavilyApiKey = cleanText(process.env.TAVILY_API_KEY);
  const serpApiKey =
    cleanText(process.env.SERPAPI_API_KEY) ||
    cleanText(process.env.SERP_API_KEY) ||
    cleanText(process.env.SERPAPI_KEY);
  const newsApiKey =
    cleanText(process.env.NEWS_API_KEY) ||
    cleanText(process.env.NEWSAPI_KEY);
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

  if (!supabaseUrl || !supabaseKey) return null;
  if (!tavilyApiKey && !serpApiKey && !newsApiKey) return null;

  return {
    tavilyApiKey,
    serpApiKey,
    newsApiKey,
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseKey,
    organisationId,
  };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

async function verifySupabaseUser(
  token: string,
  environment: Environment,
): Promise<SupabaseUser | null> {
  const response = await fetch(`${environment.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: environment.supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });
  return response.ok ? ((await response.json()) as SupabaseUser) : null;
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
    console.error("Membership query failed:", response.status, await response.text().catch(() => ""));
    return false;
  }

  const rows = (await response.json()) as unknown[];
  return rows.length === 1;
}

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const current = rateLimits.get(userId);
  if (!current || current.resetAt <= now) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function validateRequest(value: unknown):
  | { valid: true; request: LeadHunterSearchRequest }
  | { valid: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { valid: false, error: "Invalid Lead Hunter request." };
  }

  const candidate = value as Partial<LeadHunterSearchRequest>;
  const services = Array.isArray(candidate.services)
    ? [...new Set(candidate.services)].slice(0, 20)
    : [];
  const companies = Array.isArray(candidate.companies)
    ? [...new Set(candidate.companies)].slice(0, 10)
    : [];

  if (!services.length) return { valid: false, error: "Choose at least one service." };
  if (!companies.length) return { valid: false, error: "Choose at least one Cossa company." };

  const cleanArray = (input: unknown, max: number) =>
    Array.isArray(input)
      ? input.map(cleanText).filter((v): v is string => Boolean(v)).slice(0, max)
      : [];

  const notes = cleanText(candidate.notes) ?? "";
  const missionGovernment = GOVERNMENT_MISSION_PATTERN.test(notes);
  const missionDigital = DIGITAL_AUDIT_MISSION_PATTERN.test(notes);
  const rawCount = Number(candidate.result_count ?? 15);

  return {
    valid: true,
    request: {
      sector: candidate.sector ?? "mixed",
      companies,
      services,
      locations: cleanArray(candidate.locations, 12).length
        ? cleanArray(candidate.locations, 12)
        : ["Gauteng"],
      industries: cleanArray(candidate.industries, 12),
      organisation_types: cleanArray(candidate.organisation_types, 12),
      result_count: Number.isFinite(rawCount)
        ? Math.min(MAX_REQUEST_RESULTS, Math.max(1, Math.round(rawCount)))
        : 15,
      minimum_score: clampScore(candidate.minimum_score ?? 60),
      minimum_evidence_sources: Math.max(
        1,
        Math.min(5, Math.round(Number(candidate.minimum_evidence_sources ?? 1))),
      ),
      include_small_projects: candidate.include_small_projects !== false,
      include_large_projects: candidate.include_large_projects !== false,
      include_private_sector:
        candidate.include_private_sector !== false ||
        candidate.sector === "private" ||
        missionDigital,
      include_government_sector:
        candidate.include_government_sector === true ||
        candidate.sector === "government" ||
        missionGovernment,
      include_nonprofits: candidate.include_nonprofits === true,
      require_public_phone_or_email: candidate.require_public_phone_or_email === true,
      require_website: candidate.require_website === true,
      require_opportunity_signal: candidate.require_opportunity_signal !== false,
      tender_keywords: cleanArray(candidate.tender_keywords, 20),
      prospect_keywords: cleanArray(candidate.prospect_keywords, 25),
      verified_sources_only: candidate.verified_sources_only !== false,
      exclude_existing_crm_leads: candidate.exclude_existing_crm_leads !== false,
      notes: notes || null,
    },
  };
}

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
  seo: "SEO services",
  digital_marketing: "digital marketing",
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

function serviceLabel(service: LeadHunterServiceCategory) {
  return SERVICE_LABELS[service];
}

function buyerTargetsForService(service: LeadHunterServiceCategory): string[] {
  const common = ["small businesses", "property companies", "schools", "office parks", "warehouses", "retail businesses"];
  const map: Partial<Record<LeadHunterServiceCategory, string[]>> = {
    construction: ["property developers", "schools", "commercial property owners", "churches", "retail property owners", "industrial property owners"],
    renovation: ["property management companies", "office parks", "schools", "churches", "hotels", "retail stores"],
    property_maintenance: ["property management companies", "body corporate managing agents", "estate management companies", "office parks", "shopping centres", "warehouses"],
    painting: ["property managers", "schools", "office parks", "shopping centres", "churches", "warehouses"],
    tiling: ["property managers", "retail stores", "restaurants", "schools", "churches", "commercial property owners"],
    ceilings: ["property managers", "office parks", "schools", "retail property owners", "churches", "commercial landlords"],
    roofing: ["property management companies", "schools", "warehouses", "factories", "churches", "commercial property owners"],
    plumbing: ["property managers", "estate managers", "schools", "office parks", "shopping centres", "warehouses"],
    facility_management: ["office parks", "shopping centres", "property management companies", "industrial parks", "schools", "healthcare facilities"],
    commercial_cleaning: ["property management companies", "office parks", "shopping centres", "warehouses", "schools", "healthcare facilities"],
    deep_cleaning: ["offices", "schools", "churches", "restaurants", "property managers", "retail stores"],
    hygiene: ["schools", "healthcare facilities", "office parks", "shopping centres", "warehouses", "restaurants"],
    landscaping: ["estate managers", "office parks", "schools", "shopping centres", "property managers", "hospitality venues"],
    waste_management: ["shopping centres", "office parks", "warehouses", "factories", "schools", "property management companies"],
    website_design: ["small businesses", "property companies", "construction companies", "schools", "churches", "professional services firms"],
    seo: ["local businesses", "professional services firms", "property companies", "retail businesses", "hospitality businesses", "contractors"],
    digital_marketing: ["local businesses", "retail businesses", "property companies", "hospitality businesses", "professional services firms", "training providers"],
    lead_generation: ["service businesses", "property companies", "construction companies", "professional services firms", "technology companies", "training providers"],
    crm: ["growing service businesses", "property management companies", "sales teams", "training providers", "logistics companies", "professional services firms"],
    ai_automation: ["growing SMEs", "property management companies", "logistics companies", "professional services firms", "retail businesses", "training providers"],
    business_documents: ["construction companies", "facility service companies", "consulting firms", "contractors", "small businesses", "professional services firms"],
    quotations: ["contractors", "construction companies", "service businesses", "maintenance companies", "cleaning companies", "professional services firms"],
    proposals: ["consulting firms", "contractors", "construction companies", "service businesses", "training providers", "professional services firms"],
    contracts: ["small businesses", "contractors", "construction companies", "service businesses", "consulting firms", "property companies"],
    ecommerce: ["retail businesses", "product businesses", "fashion businesses", "food businesses", "manufacturers", "wholesalers"],
    general: common,
  };
  return map[service] ?? common;
}

function createSearchQueries(request: LeadHunterSearchRequest): SearchPlan[] {
  const plans: SearchPlan[] = [];
  const location = request.locations[0] ?? "South Africa";
  const notes = cleanText(request.notes) ?? "";
  const targetsFromRequest = [...request.organisation_types, ...request.industries].filter(Boolean);
  const extraTerms = [...request.tender_keywords, ...request.prospect_keywords].slice(0, 5);
  const extra = extraTerms.length ? ` (${extraTerms.map((v) => `"${v}"`).join(" OR ")})` : "";
  const shouldGovernment =
    request.sector === "government" ||
    request.include_government_sector ||
    GOVERNMENT_MISSION_PATTERN.test(notes) ||
    (request.sector === "mixed" && !notes);
  const shouldPrivate =
    request.sector !== "government" &&
    (request.include_private_sector || DIGITAL_AUDIT_MISSION_PATTERN.test(notes));

  if (notes) {
    plans.push({
      query: `${notes} ${location}`,
      purpose: GOVERNMENT_MISSION_PATTERN.test(notes) ? "active_procurement" : "buyer_discovery",
      targetDescription: request.organisation_types[0] || request.industries[0] || "custom mission target",
      service: request.services[0] ?? "general",
    });
  }

  for (const service of request.services.slice(0, 6)) {
    const targets = targetsFromRequest.length
      ? [...new Set([...targetsFromRequest, ...buyerTargetsForService(service)])].slice(0, 6)
      : buyerTargetsForService(service).slice(0, 6);
    const target1 = targets[0] ?? "business";
    const target2 = targets[1] ?? target1;
    const label = serviceLabel(service);

    if (shouldPrivate) {
      plans.push(
        { query: `"${target1}" "${location}" official website contact${extra}`, purpose: "buyer_discovery", targetDescription: target1, service },
        { query: `"${target2}" "${location}" official company contact${extra}`, purpose: "buyer_discovery", targetDescription: target2, service },
        { query: `"${location}" "${target1}" ("new branch" OR expansion OR development OR refurbishment OR upgrade OR investment) "${label}"`, purpose: "growth_signal", targetDescription: target1, service },
      );

      if (["website_design", "seo", "digital_marketing", "lead_generation", "crm", "ai_automation", "ecommerce"].includes(service)) {
        plans.push({ query: `"${target1}" "${location}" official website contact (website OR online OR digital)`, purpose: "website_gap", targetDescription: target1, service });
      }
    }

    if (request.include_nonprofits) {
      plans.push({ query: `(church OR nonprofit OR NGO OR "community centre") "${location}" official website contact "${label}"`, purpose: "buyer_discovery", targetDescription: "churches and nonprofit organisations", service });
    }

    if (shouldGovernment) {
      plans.push(
        { query: `site:etenders.gov.za "${label}" ("closing date" OR "tender number" OR "bid number" OR RFQ)${extra}`, purpose: "active_procurement", targetDescription: "South African government procurement", service },
        { query: `(site:gov.za OR site:gauteng.gov.za OR site:tshwane.gov.za) "${label}" (RFQ OR RFP OR tender OR bid)${extra}`, purpose: "active_procurement", targetDescription: "Government and municipal procurement", service },
        { query: `"${location}" (government OR municipality OR department) "${label}" ("supplier registration" OR "supplier database" OR "vendor registration")`, purpose: "supplier_registration", targetDescription: "Government supplier registration", service },
      );
    }
  }

  const unique = new Map<string, SearchPlan>();
  for (const plan of plans) {
    const query = plan.query.replace(/\s+/g, " ").trim();
    const key = `${plan.purpose}:${query.toLowerCase()}`;
    if (query && !unique.has(key)) unique.set(key, { ...plan, query });
  }
  return [...unique.values()].slice(0, MAX_SEARCH_QUERIES);
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normaliseUrl(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return null;
  }
}

async function tavilySearch(plan: SearchPlan, apiKey: string): Promise<SearchCandidate[]> {
  const response = await fetchWithTimeout(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: plan.query,
      topic: plan.purpose === "growth_signal" ? "news" : "general",
      search_depth: "basic",
      country: plan.purpose === "growth_signal" ? undefined : "south africa",
      time_range: plan.purpose === "growth_signal" ? "month" : undefined,
      max_results: MAX_RESULTS_PER_QUERY,
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      exclude_domains: PRIVATE_SOURCE_DOMAINS_TO_EXCLUDE,
    }),
  }, SEARCH_TIMEOUT_MS);

  if (!response.ok) throw new Error(await response.text().catch(() => `Tavily ${response.status}`));
  const payload = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string; score?: number; published_date?: string }> };
  return (payload.results ?? []).map((r) => {
    const title = cleanText(r.title), url = normaliseUrl(r.url), snippet = cleanText(r.content);
    if (!title || !url || !snippet) return null;
    return { provider: "Tavily" as const, query: plan.query, purpose: plan.purpose, targetDescription: plan.targetDescription, searchedService: plan.service, title, url, snippet, publishedAt: cleanText(r.published_date), providerScore: normaliseProviderScore(r.score, 0.6) };
  }).filter((v): v is SearchCandidate => Boolean(v));
}

async function serpApiSearch(plan: SearchPlan, apiKey: string): Promise<SearchCandidate[]> {
  const params = new URLSearchParams({ engine: "google", q: plan.query, api_key: apiKey, google_domain: "google.co.za", gl: "za", hl: "en", num: String(MAX_RESULTS_PER_QUERY), safe: "active" });
  if (["growth_signal", "active_procurement"].includes(plan.purpose)) params.set("tbs", "qdr:m");
  const response = await fetchWithTimeout(`${SERPAPI_SEARCH_URL}?${params}`, { headers: { Accept: "application/json" } }, SEARCH_TIMEOUT_MS);
  if (!response.ok) throw new Error(await response.text().catch(() => `SerpAPI ${response.status}`));
  const payload = (await response.json()) as { error?: string; organic_results?: Array<{ position?: number; title?: string; link?: string; snippet?: string; date?: string }> };
  if (payload.error) throw new Error(payload.error);
  return (payload.organic_results ?? []).slice(0, MAX_RESULTS_PER_QUERY).map((r, i) => {
    const title = cleanText(r.title), url = normaliseUrl(r.link), snippet = cleanText(r.snippet);
    if (!title || !url || !snippet) return null;
    const pos = Number(r.position ?? i + 1);
    return { provider: "SerpAPI" as const, query: plan.query, purpose: plan.purpose, targetDescription: plan.targetDescription, searchedService: plan.service, title, url, snippet, publishedAt: cleanText(r.date), providerScore: Math.max(0.35, Math.min(0.95, 1 - Math.max(0, pos - 1) * 0.06)) };
  }).filter((v): v is SearchCandidate => Boolean(v));
}

async function newsApiSearch(plan: SearchPlan, apiKey: string): Promise<SearchCandidate[]> {
  if (!["growth_signal", "active_procurement", "supplier_registration"].includes(plan.purpose)) return [];
  const from = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const q = `${plan.query.replace(/\bsite:[^\s)]+/gi, " ").replace(/[()]/g, " ")} AND ("South Africa" OR Gauteng OR Pretoria OR Johannesburg)`.replace(/\s+/g, " ").slice(0, 500);
  const params = new URLSearchParams({ q, searchIn: "title,description,content", language: "en", sortBy: "publishedAt", pageSize: String(MAX_RESULTS_PER_QUERY), page: "1", from });
  const response = await fetchWithTimeout(`${NEWS_API_URL}?${params}`, { headers: { Accept: "application/json", "X-Api-Key": apiKey } }, SEARCH_TIMEOUT_MS);
  if (!response.ok) throw new Error(await response.text().catch(() => `NewsAPI ${response.status}`));
  const payload = (await response.json()) as { status?: string; message?: string; articles?: Array<{ title?: string | null; description?: string | null; content?: string | null; url?: string | null; publishedAt?: string | null }> };
  if (payload.status === "error") throw new Error(payload.message || "NewsAPI error");
  return (payload.articles ?? []).map((a, i) => {
    const title = cleanText(a.title), url = normaliseUrl(a.url), snippet = cleanText(a.description) || cleanText(a.content);
    if (!title || !url || !snippet) return null;
    return { provider: "NewsAPI" as const, query: plan.query, purpose: plan.purpose, targetDescription: plan.targetDescription, searchedService: plan.service, title, url, snippet, publishedAt: cleanText(a.publishedAt), providerScore: Math.max(0.45, 0.8 - i * 0.035) };
  }).filter((v): v is SearchCandidate => Boolean(v));
}

async function executePlan(plan: SearchPlan, environment: Environment) {
  const jobs: Array<Promise<{ provider: SearchProvider; candidates: SearchCandidate[]; warning?: string }>> = [];
  const wrap = (provider: SearchProvider, promise: Promise<SearchCandidate[]>) =>
    promise.then((candidates) => ({ provider, candidates })).catch((error: unknown) => ({ provider, candidates: [], warning: `${provider} failed for "${plan.query}": ${error instanceof Error ? error.message : "Unknown error"}` }));
  if (environment.tavilyApiKey) jobs.push(wrap("Tavily", tavilySearch(plan, environment.tavilyApiKey)));
  if (environment.serpApiKey) jobs.push(wrap("SerpAPI", serpApiSearch(plan, environment.serpApiKey)));
  if (environment.newsApiKey) jobs.push(wrap("NewsAPI", newsApiSearch(plan, environment.newsApiKey)));
  return Promise.all(jobs);
}

function getHostname(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

function deduplicateCandidates(candidates: SearchCandidate[]) {
  const map = new Map<string, SearchCandidate>();
  const priority = (p: SearchProvider) => p === "Tavily" ? 3 : p === "SerpAPI" ? 2 : 1;
  for (const candidate of candidates) {
    const key = candidate.url.replace(/\/+$/, "").toLowerCase();
    const existing = map.get(key);
    if (!existing || candidate.providerScore * 100 + priority(candidate.provider) > existing.providerScore * 100 + priority(existing.provider)) map.set(key, candidate);
  }
  return [...map.values()].sort((a, b) => b.providerScore - a.providerScore);
}

function htmlToText(html: string) {
  return cleanText(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " "))?.slice(0, MAX_SOURCE_CONTENT_LENGTH) ?? "";
}

function extractEmails(text: string) {
  return [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((v) => v.toLowerCase()).filter((v) => !v.includes("example.com") && !v.includes("sentry.io") && !v.includes("wixpress.com")))].slice(0, 8);
}

function extractPhones(text: string) {
  return [...new Set((text.match(/(?:\+27|0)\s?\d{2}[\s().-]?\d{3}[\s.-]?\d{4}/g) ?? []).map((v) => v.replace(/[^\d+]/g, "")).filter((v) => /^\+27\d{9}$/.test(v) || /^0\d{9}$/.test(v)))].slice(0, 8);
}

function findContactPageUrl(html: string, baseUrl: string) {
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = cleanText(match[1]);
    const label = lowerText(match[2]?.replace(/<[^>]+>/g, " "));
    if (!href || !/(contact|enquir|procurement|supplier|tender|vendor)/i.test(`${href} ${label}`)) continue;
    try { const url = new URL(href, baseUrl); if (["http:", "https:"].includes(url.protocol)) return url.toString(); } catch { /* ignore */ }
  }
  return null;
}

async function inspectSourcePage(sourceUrl: string): Promise<PageInspection> {
  const inspectedAt = new Date().toISOString();
  try {
    const response = await fetchWithTimeout(sourceUrl, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "CossaLeadHunter/3.0 (+https://growth.cossanexusholdings.co.za)" }, redirect: "follow" }, PAGE_TIMEOUT_MS);
    if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) throw new Error("unavailable");
    const html = await response.text();
    const text = htmlToText(html);
    const finalUrl = response.url || sourceUrl;
    return { url: sourceUrl, finalUrl, title: cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ")), text, emails: extractEmails(text), phones: extractPhones(text), contactPageUrl: findContactPageUrl(html, finalUrl), inspectedAt, fetchSucceeded: true };
  } catch {
    return { url: sourceUrl, finalUrl: sourceUrl, title: null, text: "", emails: [], phones: [], contactPageUrl: null, inspectedAt, fetchSucceeded: false };
  }
}

function isGovernmentSource(url: string) {
  const host = getHostname(url);
  return host.endsWith(".gov.za") || HIGH_TRUST_GOVERNMENT_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function isDirectorySource(url: string, content: string) {
  const host = getHostname(url);
  return DIRECTORY_HOST_PATTERNS.some((p) => host.includes(p)) || DIRECTORY_TEXT_PATTERN.test(content);
}

function competitorPatternsForService(service: LeadHunterServiceCategory): RegExp[] {
  const map: Partial<Record<LeadHunterServiceCategory, RegExp[]>> = {
    construction: [/\bconstruction company\b/i, /\bbuilding contractor\b/i],
    renovation: [/\brenovation company\b/i, /\brenovation contractor\b/i],
    property_maintenance: [/\bproperty maintenance company\b/i, /\bmaintenance contractor\b/i],
    painting: [/\bpainting contractor\b/i, /\bpainting services\b/i],
    tiling: [/\btiling contractor\b/i, /\btiling services\b/i],
    ceilings: [/\bceiling installer\b/i, /\bceiling contractor\b/i],
    roofing: [/\broofing contractor\b/i, /\broofing company\b/i],
    plumbing: [/\bplumbing company\b/i, /\bplumbing services\b/i],
    facility_management: [/\bfacilities management company\b/i],
    commercial_cleaning: [/\bcleaning company\b/i, /\bcommercial cleaning services\b/i],
    deep_cleaning: [/\bdeep cleaning services\b/i, /\bcleaning company\b/i],
    hygiene: [/\bhygiene services\b/i, /\bsanitation services\b/i],
    landscaping: [/\blandscaping company\b/i, /\bgarden services\b/i],
    waste_management: [/\bwaste management company\b/i],
    website_design: [/\bweb design company\b/i, /\bwebsite design agency\b/i],
    seo: [/\bseo agency\b/i, /\bseo company\b/i],
    digital_marketing: [/\bdigital marketing agency\b/i, /\bmarketing agency\b/i],
    lead_generation: [/\blead generation agency\b/i],
    crm: [/\bcrm consultancy\b/i, /\bcrm software company\b/i],
    ai_automation: [/\bai automation agency\b/i, /\bautomation consultancy\b/i],
    business_documents: [/\bdocument drafting services\b/i, /\btender writing services\b/i],
    quotations: [/\bquotation software\b/i, /\binvoicing software\b/i],
    proposals: [/\bproposal writing services\b/i, /\btender writing company\b/i],
    contracts: [/\blegal document services\b/i, /\bcontract drafting services\b/i],
    ecommerce: [/\becommerce agency\b/i, /\bshopify agency\b/i],
  };
  return map[service] ?? [];
}

function inferBuyerRole(service: LeadHunterServiceCategory, content: string) {
  const match = content.match(PUBLIC_BUYER_ROLE_PATTERN);
  if (match?.[0]) return match[0].replace(/\b\w/g, (l) => l.toUpperCase());
  const roles: Partial<Record<LeadHunterServiceCategory, string>> = {
    construction: "Property Owner, Project Manager or Procurement Manager",
    renovation: "Property Manager, Facilities Manager or Property Owner",
    property_maintenance: "Property Manager or Facilities Manager",
    painting: "Facilities Manager or Property Manager",
    tiling: "Property Manager or Project Manager",
    ceilings: "Facilities Manager or Property Manager",
    roofing: "Facilities Manager or Property Manager",
    plumbing: "Facilities Manager or Property Manager",
    facility_management: "Operations Manager or Facilities Director",
    commercial_cleaning: "Facilities Manager, Operations Manager or Property Manager",
    deep_cleaning: "Facilities Manager or Office Manager",
    hygiene: "Facilities Manager or Operations Manager",
    landscaping: "Estate Manager, Property Manager or Facilities Manager",
    waste_management: "Facilities Manager or Operations Manager",
    website_design: "Business Owner, Marketing Manager or IT Manager",
    seo: "Business Owner or Marketing Manager",
    digital_marketing: "Business Owner or Marketing Manager",
    lead_generation: "Sales Director, Business Owner or Marketing Manager",
    crm: "Sales Director, Operations Manager or Business Owner",
    ai_automation: "Operations Manager, IT Manager or Business Owner",
    business_documents: "Business Owner, Operations Manager or Project Manager",
    quotations: "Business Owner, Finance Manager or Sales Manager",
    proposals: "Business Owner, Sales Manager or Bid Manager",
    contracts: "Business Owner, Operations Manager or Legal/Compliance Manager",
    ecommerce: "Business Owner, E-commerce Manager or Marketing Manager",
    general: "Business Owner or Operations Manager",
  };
  return roles[service] ?? null;
}

function assessCandidate(request: LeadHunterSearchRequest, candidate: SearchCandidate, inspection: PageInspection): CandidateAssessment {
  const combined = `${candidate.title} ${candidate.snippet} ${inspection.title ?? ""} ${inspection.text.slice(0, 10000)}`;
  const reasons: string[] = [];
  const sourceTrust = isGovernmentSource(candidate.url) ? 95 : inspection.fetchSucceeded ? (inspection.contactPageUrl || inspection.emails.length || inspection.phones.length ? 82 : 68) : candidate.provider === "Tavily" ? 58 : candidate.provider === "SerpAPI" ? 54 : 50;
  const competitors = request.services.filter((s) => competitorPatternsForService(s).some((p) => p.test(combined)) && SERVICE_OFFERING_PATTERN.test(combined));
  const probableBuyerRole = inferBuyerRole(candidate.searchedService, combined);

  if (isDirectorySource(candidate.url, combined)) return { disposition: "directory", buyerFit: 5, sourceTrust: 20, reasons: ["The page appears to be a directory or aggregator rather than one buyer organisation."], probableBuyerRole: null, competitorForServices: competitors };
  if (INFORMATIONAL_PAGE_PATTERN.test(combined) && !PROCUREMENT_PATTERN.test(combined) && candidate.purpose !== "growth_signal") return { disposition: "informational", buyerFit: 5, sourceTrust: 30, reasons: ["The page appears informational or educational and does not prove procurement demand."], probableBuyerRole: null, competitorForServices: competitors };
  if (PROCUREMENT_PATTERN.test(combined) && (isGovernmentSource(candidate.url) || candidate.purpose === "active_procurement")) return { disposition: "active_opportunity", buyerFit: 95, sourceTrust, reasons: ["The source contains formal procurement language."], probableBuyerRole: "Procurement or Supply Chain Management", competitorForServices: competitors };
  if (SUPPLIER_REGISTRATION_PATTERN.test(combined)) return { disposition: "supplier_opportunity", buyerFit: 85, sourceTrust, reasons: ["The source contains a supplier-registration or vendor-database signal."], probableBuyerRole: "Procurement or Supply Chain Management", competitorForServices: competitors };
  const explicitNeed = BUYER_NEED_PATTERN.test(combined), expansion = EXPANSION_PATTERN.test(combined), offersSame = competitors.length > 0;
  if (offersSame && !explicitNeed && !expansion) return { disposition: "competitor", buyerFit: 10, sourceTrust, reasons: ["The organisation appears to sell the same service Cossa is trying to offer.", "No separate buying, expansion or procurement signal was found."], probableBuyerRole: null, competitorForServices: competitors };
  if (explicitNeed || expansion) return { disposition: "active_opportunity", buyerFit: explicitNeed ? 87 : 74, sourceTrust, reasons: [explicitNeed ? "A public buying, appointment, contract or service requirement was detected." : "A public expansion, investment or development signal was detected."], probableBuyerRole, competitorForServices: competitors };
  const target = candidate.targetDescription.toLowerCase();
  const targetMatch = lowerText(combined).includes(target) || target.split(/\s+/).filter((v) => v.length >= 5).some((v) => lowerText(combined).includes(v));
  if (candidate.purpose === "buyer_discovery" && targetMatch && !offersSame) return { disposition: "buyer", buyerFit: 65, sourceTrust, reasons: [`The organisation matches the selected buyer category: ${candidate.targetDescription}.`, "No active procurement event was proven; treat this as a potential buyer, not a confirmed opportunity."], probableBuyerRole, competitorForServices: competitors };
  return { disposition: "irrelevant", buyerFit: 15, sourceTrust, reasons: ["The source did not prove that this organisation is a suitable buyer or active opportunity."], probableBuyerRole, competitorForServices: competitors };
}

function inferSignal(candidate: SearchCandidate, inspection: PageInspection, assessment: CandidateAssessment): ProspectSignal {
  const text = `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;
  let type: ProspectSignalType = "general_fit", title = "Potential buyer-fit signal", confidence = 40;
  if (assessment.disposition === "active_opportunity" && /\b(request for quotation|\bRFQ\b)\b/i.test(text)) { type = "request_for_quote"; title = "Request for quotation"; confidence = isGovernmentSource(candidate.url) ? 94 : 84; }
  else if (assessment.disposition === "active_opportunity" && /\b(request for proposal|\bRFP\b)\b/i.test(text)) { type = "request_for_proposal"; title = "Request for proposal"; confidence = isGovernmentSource(candidate.url) ? 94 : 84; }
  else if (assessment.disposition === "active_opportunity" && PROCUREMENT_PATTERN.test(text)) { type = "active_tender"; title = "Tender or formal procurement notice"; confidence = isGovernmentSource(candidate.url) ? 95 : 80; }
  else if (assessment.disposition === "supplier_opportunity") { type = "supplier_registration"; title = "Supplier-registration opportunity"; confidence = 90; }
  else if (/\b(cleaning contract|cleaning services required|appointment of.*cleaning|janitorial)\b/i.test(text)) { type = "cleaning_need"; title = "Cleaning-service requirement"; confidence = 80; }
  else if (/\b(website redesign required|website development tender|digital platform required|digital transformation)\b/i.test(text)) { type = "technology_need"; title = "Technology or website requirement"; confidence = 78; }
  else if (/\b(maintenance contract|repair works|minor works|refurbishment|renovation project|upgrade project)\b/i.test(text)) { type = "maintenance_need"; title = "Maintenance or upgrade requirement"; confidence = 77; }
  else if (EXPANSION_PATTERN.test(text)) { type = "business_expansion"; title = "Business expansion or development"; confidence = candidate.provider === "NewsAPI" ? 76 : 72; }
  else if (assessment.disposition === "buyer") { confidence = 48; title = "Potential buyer-category fit"; }
  return { type, title, explanation: candidate.snippet.slice(0, 700), evidence_url: candidate.url, detected_at: new Date().toISOString(), confidence };
}

function chooseService(request: LeadHunterSearchRequest, candidate: SearchCandidate, inspection: PageInspection) {
  const text = `${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 8000)}`;
  const patterns: Array<[LeadHunterServiceCategory, RegExp]> = [
    ["commercial_cleaning", /\b(cleaning contract|cleaning services required|janitorial)\b/i],
    ["facility_management", /\bfacilit(?:y|ies) management\b/i],
    ["property_maintenance", /\b(maintenance contract|repair works|property maintenance|minor works)\b/i],
    ["renovation", /\b(renovation project|refurbishment|building upgrade)\b/i],
    ["painting", /\b(painting works|repainting project)\b/i],
    ["roofing", /\b(roof replacement|roof repairs?|roofing works)\b/i],
    ["website_design", /\b(website development|website redesign|web portal development)\b/i],
    ["digital_marketing", /\b(digital marketing tender|social media management contract)\b/i],
    ["seo", /\b(search engine optimisation|search engine optimization|SEO)\b/i],
    ["ai_automation", /\b(automation system|artificial intelligence solution|workflow automation)\b/i],
    ["business_documents", /\b(document management|proposal system|quotation system|contract management)\b/i],
    ["construction", /\b(construction works|building works|civil works|infrastructure project)\b/i],
  ];
  for (const [service, pattern] of patterns) if (request.services.includes(service) && pattern.test(text)) return service;
  return request.services.includes(candidate.searchedService) ? candidate.searchedService : request.services[0] ?? "general";
}

function recommendedCompany(service: LeadHunterServiceCategory, allowed: LeadHunterCompany[]) {
  const map: Partial<Record<LeadHunterServiceCategory, LeadHunterCompany>> = {
    construction: "cossa_nexus_construction", renovation: "cossa_nexus_construction", property_maintenance: "cossa_nexus_construction", painting: "cossa_nexus_construction", tiling: "cossa_nexus_construction", ceilings: "cossa_nexus_construction", roofing: "cossa_nexus_construction", plumbing: "cossa_nexus_construction",
    facility_management: "cossa_facility_services", commercial_cleaning: "cossa_facility_services", deep_cleaning: "cossa_facility_services", hygiene: "cossa_facility_services", landscaping: "cossa_facility_services", waste_management: "cossa_facility_services",
    website_design: "cossa_tech", seo: "cossa_tech", crm: "cossa_tech", ai_automation: "cossa_tech", ecommerce: "cossa_tech",
    digital_marketing: "cossa_ai_growth", lead_generation: "cossa_ai_growth",
    business_documents: "nexdocs", quotations: "nexdocs", proposals: "nexdocs", contracts: "nexdocs", general: "cossa_nexus_holdings",
  };
  const preferred = map[service] ?? "cossa_nexus_holdings";
  return allowed.includes(preferred) ? preferred : allowed[0] ?? "cossa_nexus_holdings";
}

function calculateScores(candidate: SearchCandidate, inspection: PageInspection, signal: ProspectSignal, assessment: CandidateAssessment): ScoreBreakdown {
  const hasPhone = inspection.phones.length > 0, hasEmail = inspection.emails.length > 0, hasContact = Boolean(inspection.contactPageUrl);
  const rejected = ["competitor", "directory", "informational", "irrelevant"].includes(assessment.disposition);
  const fitScore = rejected ? clampScore(assessment.buyerFit) : clampScore(assessment.buyerFit * 0.72 + candidate.providerScore * 22 + assessment.sourceTrust * 0.06);
  const intentBase = assessment.disposition === "active_opportunity" ? (["active_tender", "request_for_quote", "request_for_proposal"].includes(signal.type) ? 92 : 76) : assessment.disposition === "supplier_opportunity" ? 72 : assessment.disposition === "buyer" ? 32 : assessment.disposition === "partner" ? 38 : 5;
  const intentScore = clampScore(intentBase + signal.confidence * 0.08);
  const evidenceScore = clampScore(assessment.sourceTrust * 0.7 + (inspection.fetchSucceeded ? 15 : 0) + (hasPhone || hasEmail || hasContact ? 10 : 0));
  const timingScore = ["active_tender", "request_for_quote", "request_for_proposal"].includes(signal.type) ? 92 : signal.type === "supplier_registration" ? 72 : ["business_expansion", "new_branch"].includes(signal.type) ? 70 : assessment.disposition === "active_opportunity" ? 65 : assessment.disposition === "buyer" ? 35 : 25;
  const contactabilityScore = clampScore((hasPhone ? 40 : 0) + (hasEmail ? 35 : 0) + (hasContact ? 20 : 0) + (assessment.probableBuyerRole ? 5 : 0));
  let totalScore = clampScore(fitScore * 0.28 + intentScore * 0.26 + evidenceScore * 0.2 + timingScore * 0.14 + contactabilityScore * 0.12);
  if (assessment.disposition === "buyer") totalScore = Math.min(totalScore, 74);
  if (assessment.disposition === "partner") totalScore = Math.min(totalScore, 58);
  if (rejected) totalScore = Math.min(totalScore, 25);
  return { fitScore, intentScore, evidenceScore, timingScore, contactabilityScore, totalScore };
}

function classifyProspect(assessment: CandidateAssessment, signal: ProspectSignal, score: number): ProspectClassification {
  if (["competitor", "directory", "informational", "irrelevant"].includes(assessment.disposition)) return "rejected";
  if (assessment.disposition === "partner") return "partnership";
  if (["active_tender", "request_for_quote", "request_for_proposal"].includes(signal.type)) return "tender";
  if (signal.type === "supplier_registration") return "supplier_opportunity";
  if (assessment.disposition === "active_opportunity") return "active_opportunity";
  return score >= 62 ? "qualified_prospect" : "prospect";
}

function createProspect(request: LeadHunterSearchRequest, candidate: SearchCandidate, inspection: PageInspection): LeadHunterProspect {
  const assessment = assessCandidate(request, candidate, inspection);
  const signal = inferSignal(candidate, inspection, assessment);
  const service = chooseService(request, candidate, inspection);
  const scores = calculateScores(candidate, inspection, signal, assessment);
  const sector: "private" | "government" | "nonprofit" = isGovernmentSource(candidate.url) ? "government" : /\b(church|ministry|nonprofit|ngo|charity|foundation)\b/i.test(`${candidate.title} ${candidate.snippet}`) ? "nonprofit" : "private";
  const organisationName = cleanText((inspection.title || candidate.title).replace(/\s+[|–—-]\s+.*$/, "").replace(/\b(home|contact us|about us|tenders?|rfq|rfp|official website)\b/gi, " ")) || getHostname(candidate.url);
  const rejected = ["competitor", "directory", "informational", "irrelevant"].includes(assessment.disposition);
  const hasContact = Boolean(inspection.phones.length || inspection.emails.length);
  const evidence: ProspectEvidence[] = [{ type: isGovernmentSource(candidate.url) ? (["active_tender", "request_for_quote", "request_for_proposal"].includes(signal.type) ? "tender_notice" : "government_portal") : /contact/i.test(candidate.url) ? "contact_page" : "official_website", title: candidate.title, url: candidate.url, publisher: getHostname(candidate.url) || null, published_at: candidate.publishedAt, checked_at: inspection.inspectedAt, excerpt: candidate.snippet.slice(0, 900), supports: ["organisation discovery", assessment.disposition, signal.type, candidate.provider] }];
  if (inspection.contactPageUrl && inspection.contactPageUrl !== candidate.url) evidence.push({ type: "contact_page", title: `${organisationName} public contact page`, url: inspection.contactPageUrl, publisher: getHostname(inspection.contactPageUrl) || null, published_at: null, checked_at: inspection.inspectedAt, excerpt: "Public contact route discovered on the organisation website.", supports: ["public contact route"] });
  const classification = classifyProspect(assessment, signal, scores.totalScore);
  const verification_status = rejected ? "rejected" : evidence.length >= 2 && hasContact && scores.evidenceScore >= 70 ? "verified" : "partially_verified";
  const opportunity_size: OpportunitySize = /\b(framework agreement|multi-year|national|province-wide|major works|large-scale|multi-site)\b/i.test(`${candidate.title} ${candidate.snippet}`) ? "strategic" : sector === "government" && ["active_tender", "request_for_proposal"].includes(signal.type) ? "large" : /\b(minor works|small works|quotation|rfq|repair|once-off)\b/i.test(`${candidate.title} ${candidate.snippet}`) ? "small" : "unknown";

  return {
    id: crypto.randomUUID(), organisation_name: organisationName, trading_name: null, sector,
    industry: request.industries[0] ?? null, organisation_type: request.organisation_types[0] ?? candidate.targetDescription ?? null,
    website: inspection.finalUrl || candidate.url, public_phone: rejected ? null : inspection.phones[0] ?? null, public_email: rejected ? null : inspection.emails[0] ?? null, contact_page_url: rejected ? null : inspection.contactPageUrl,
    contact_name: null, contact_title: assessment.probableBuyerRole,
    decision_maker_route: sector === "government" ? "Use the official procurement or Supply Chain Management contact in the bid documentation. Confirm the tender number, closing date, submission method and eligibility before acting." : assessment.probableBuyerRole ? `Request the ${assessment.probableBuyerRole} through the organisation’s verified public contact channel.` : hasContact ? "Use the verified public business contact and request the person responsible for procurement, facilities, operations, property, marketing or technology." : "A public decision-maker route still requires verification.",
    address: null, suburb: null, city: request.locations.find((v) => v.toLowerCase() !== "gauteng" && lowerText(`${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 4000)}`).includes(v.toLowerCase())) ?? null, province: lowerText(`${candidate.title} ${candidate.snippet} ${inspection.text.slice(0, 4000)}`).includes("gauteng") || request.locations.includes("Gauteng") ? "Gauteng" : null, country: "South Africa",
    recommended_company: recommendedCompany(service, request.companies), recommended_service: service,
    service_fit_reason: assessment.disposition === "active_opportunity" ? `${organisationName} has a public signal that may indicate a current requirement for ${serviceLabel(service)}. Open and verify the source before outreach or bidding.` : assessment.disposition === "buyer" ? `${organisationName} matches a buyer category that commonly purchases ${serviceLabel(service)}. No active buying request has been proven.` : assessment.reasons.join(" "),
    opportunity_summary: rejected ? assessment.reasons.join(" ") : signal.explanation, opportunity_size, estimated_value: null,
    classification, verification_status, fit_score: scores.fitScore, intent_score: scores.intentScore, evidence_score: scores.evidenceScore, timing_score: scores.timingScore, contactability_score: scores.contactabilityScore, total_score: scores.totalScore,
    signals: [signal], evidence, primary_source_url: candidate.url, date_verified: inspection.inspectedAt,
    next_action: rejected ? `Do not save this result as a customer lead. Reason: ${assessment.reasons.join(" ")}` : sector === "government" ? "Open the official notice. Confirm it is active, then record the tender/RFQ number, closing date, briefing, CIDB grading, CSD requirements, submission method and bid/no-bid decision." : assessment.disposition === "active_opportunity" ? `Open the evidence source and verify the requirement. Then contact the ${assessment.probableBuyerRole ?? "relevant decision-maker"} after human approval.` : `Verify the organisation and contact route. Research one specific pain point before preparing outreach to the ${assessment.probableBuyerRole ?? "relevant decision-maker"}.`,
    outreach_angle: rejected || sector === "government" ? null : assessment.disposition === "active_opportunity" ? "Reference the specific public requirement or expansion signal and offer a short discovery call or site assessment." : "Introduce Cossa briefly, explain one relevant outcome, and offer a low-friction next step.",
    duplicate_status: "not_checked", duplicate_lead_id: null, rejection_reasons: rejected ? assessment.reasons : [], raw_provider_name: candidate.provider, raw_provider_result_id: null,
  };
}

function filterProspects(prospects: LeadHunterProspect[], request: LeadHunterSearchRequest) {
  const unique = new Map<string, LeadHunterProspect>();
  for (const prospect of prospects) {
    if (prospect.verification_status === "rejected" || prospect.classification === "rejected") continue;
    if (request.require_public_phone_or_email && !prospect.public_phone && !prospect.public_email) continue;
    if (request.require_website && !prospect.website) continue;
    if (request.require_opportunity_signal && prospect.signals.every((s) => s.type === "general_fit")) continue;
    if (prospect.total_score < request.minimum_score) continue;
    if (prospect.evidence.length < request.minimum_evidence_sources) continue;
    if (request.verified_sources_only && prospect.evidence_score < 55) continue;
    const key = prospect.website ? getHostname(prospect.website) : prospect.organisation_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = unique.get(key);
    if (!existing || prospect.total_score > existing.total_score) unique.set(key, prospect);
  }
  return [...unique.values()].sort((a, b) => {
    const activeA = ["active_opportunity", "tender", "supplier_opportunity"].includes(a.classification);
    const activeB = ["active_opportunity", "tender", "supplier_opportunity"].includes(b.classification);
    return activeA !== activeB ? Number(activeB) - Number(activeA) : b.total_score - a.total_score;
  }).slice(0, request.result_count);
}

export const Route = createFileRoute("/api/lead-hunter/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const environment = getEnvironment();
        if (!environment) return new Response("Lead Hunter is not configured. Add Supabase variables and at least one search provider key: TAVILY_API_KEY, SERPAPI_API_KEY or NEWS_API_KEY.", { status: 503 });

        const token = getBearerToken(request);
        if (!token) return new Response("Unauthorized", { status: 401 });
        const user = await verifySupabaseUser(token, environment);
        if (!user) return new Response("Your session could not be verified. Sign out and sign in again.", { status: 401 });
        if (!(await verifyOrganisationMembership(token, user.id, environment))) return new Response("You are not authorised to use the Cossa Lead Hunter.", { status: 403 });

        const limit = enforceRateLimit(user.id);
        if (!limit.allowed) return new Response(`Lead Hunter rate limit reached. Try again in ${limit.retryAfterSeconds} seconds.`, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

        let rawPayload: unknown;
        try { rawPayload = await request.json(); } catch { return new Response("Invalid JSON body.", { status: 400 }); }
        const validation = validateRequest(rawPayload);
        if (!validation.valid) return new Response(validation.error, { status: 400 });

        const searchRequest = validation.request;
        const plans = createSearchQueries(searchRequest);
        if (!plans.length) return new Response("No valid search plans could be generated from this hunt.", { status: 400 });

        const searchedAt = new Date().toISOString();
        const warnings: string[] = [];
        const candidates: SearchCandidate[] = [];
        const successfulProviders = new Set<SearchProvider>();

        const executions = await Promise.all(plans.map((plan) => executePlan(plan, environment)));
        for (const group of executions) {
          for (const result of group) {
            if (result.warning) warnings.push(result.warning);
            if (result.candidates.length) {
              successfulProviders.add(result.provider);
              candidates.push(...result.candidates);
            }
          }
        }

        const uniqueCandidates = deduplicateCandidates(candidates).slice(0, MAX_SOURCE_PAGES_TO_INSPECT);
        if (!uniqueCandidates.length) {
          const empty: LeadHunterSearchResponse = {
            hunt_id: crypto.randomUUID(), status: "completed", searched_at: searchedAt, completed_at: new Date().toISOString(), request: searchRequest,
            prospects: [], source_count: 0, accepted_count: 0, rejected_count: 0,
            warnings: [...warnings.slice(0, 12), "No public search results matched this hunt. Broaden the location, buyer type, service or minimum-score filters."],
            providers_used: [...successfulProviders, "Cossa buyer-intelligence qualification"],
          };
          return Response.json(empty, { headers: { "Cache-Control": "no-store" } });
        }

        const inspections = await Promise.all(uniqueCandidates.map((candidate) => inspectSourcePage(candidate.url)));
        const rawProspects = uniqueCandidates.map((candidate, index) => createProspect(searchRequest, candidate, inspections[index]));
        const acceptedProspects = filterProspects(rawProspects, searchRequest);
        const rejectedCompetitors = rawProspects.filter((p) => p.rejection_reasons.some((r) => r.toLowerCase().includes("same service"))).length;
        const rejectedDirectories = rawProspects.filter((p) => p.rejection_reasons.some((r) => r.toLowerCase().includes("directory"))).length;
        const rejectedInformational = rawProspects.filter((p) => p.rejection_reasons.some((r) => r.toLowerCase().includes("informational"))).length;

        const responsePayload: LeadHunterSearchResponse = {
          hunt_id: crypto.randomUUID(), status: "completed", searched_at: searchedAt, completed_at: new Date().toISOString(), request: searchRequest,
          prospects: acceptedProspects, source_count: uniqueCandidates.length, accepted_count: acceptedProspects.length, rejected_count: rawProspects.length - acceptedProspects.length,
          warnings: [
            ...warnings.slice(0, 12),
            `Quality control rejected ${rejectedCompetitors} apparent competitors, ${rejectedDirectories} directories or aggregators, and ${rejectedInformational} informational pages.`,
            ...(acceptedProspects.length === 0 ? ["Search results were found, but none met the buyer-fit, evidence, intent and score requirements. Reduce minimum score or turn off Require Opportunity Signal for broader prospecting."] : []),
            "A qualified prospect is not automatically an active buyer. Only records with supported procurement, expansion or service-requirement evidence should be treated as active opportunities.",
            "Public contact details must be used only for lawful, relevant and respectful business outreach.",
            "Human verification is required before outreach, quotation preparation, tender submission or commitment.",
          ],
          providers_used: [...successfulProviders, "Cossa buyer-intelligence qualification", ...(searchRequest.include_government_sector ? ["Official South African government and eTender sources discovered through search"] : [])],
        };

        return Response.json(responsePayload, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});