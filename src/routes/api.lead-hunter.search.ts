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
const MAX_SEARCH_QUERIES = 10;
const MAX_RESULTS_PER_QUERY = 12;
const MAX_SOURCE_PAGES_TO_INSPECT = 35;
const MAX_SOURCE_CONTENT_LENGTH = 25_000;
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

type SearchCandidate = {
  query: string;
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

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
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

  return Math.max(
    0,
    Math.min(100, Math.round(parsed)),
  );
}

function getEnvironment(): Environment | null {
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

  return (
    authorization.slice(7).trim() ||
    null
  );
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
            (
              item,
            ): item is string =>
              Boolean(item),
          )
          .slice(0, 12)
      : [];

  const industries =
    Array.isArray(candidate.industries)
      ? candidate.industries
          .map(cleanText)
          .filter(
            (
              item,
            ): item is string =>
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
            (
              item,
            ): item is string =>
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

  if (
    services.length === 0 ||
    companies.length === 0
  ) {
    return {
      valid: false,
      error:
        "Choose at least one Cossa company and one service.",
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
                (
                  item,
                ): item is string =>
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
                (
                  item,
                ): item is string =>
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
    painting: "painting services",
    tiling: "tiling services",
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
    seo: "SEO services",
    digital_marketing:
      "digital marketing",
    lead_generation:
      "lead generation",
    crm: "CRM implementation",
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

function createSearchQueries(
  request: LeadHunterSearchRequest,
): string[] {
  const queries: string[] = [];

  const locations =
    request.locations.length > 0
      ? request.locations
      : ["South Africa"];

  const services =
    request.services.slice(0, 5);

  const organisationTypes =
    request.organisation_types.length >
    0
      ? request.organisation_types.slice(
          0,
          4,
        )
      : request.industries.slice(0, 4);

  const privateTargets =
    organisationTypes.length > 0
      ? organisationTypes
      : [
          "property management company",
          "school",
          "church",
          "shopping centre",
          "office park",
          "warehouse",
        ];

  if (
    request.include_private_sector
  ) {
    for (
      let index = 0;
      index <
      Math.min(
        services.length,
        privateTargets.length,
        locations.length,
        5,
      );
      index += 1
    ) {
      const service =
        serviceLabel(
          services[
            index % services.length
          ],
        );

      const target =
        privateTargets[
          index %
            privateTargets.length
        ];

      const location =
        locations[
          index % locations.length
        ];

      queries.push(
        `"${target}" "${location}" ${service} contact website`,
      );
    }

    const keywordPhrase =
      request.prospect_keywords
        .slice(0, 5)
        .join(" ");

    if (keywordPhrase) {
      queries.push(
        `${keywordPhrase} business "${locations[0]}" contact`,
      );
    }
  }

  if (
    request.include_nonprofits
  ) {
    queries.push(
      `church nonprofit community centre ${serviceLabel(
        services[0],
      )} "${locations[0]}" contact`,
    );
  }

  if (
    request.include_government_sector
  ) {
    const tenderServices =
      services
        .slice(0, 4)
        .map(serviceLabel)
        .join(" OR ");

    queries.push(
      `site:etenders.gov.za (${tenderServices}) active tender`,
    );

    queries.push(
      `site:gov.za (${tenderServices}) tender OR RFQ OR RFP`,
    );

    for (const location of locations.slice(
      0,
      3,
    )) {
      queries.push(
        `"${location}" (${tenderServices}) tender OR RFQ`,
      );
    }
  }

  return [
    ...new Set(
      queries
        .map((query) =>
          query
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean),
    ),
  ].slice(0, MAX_SEARCH_QUERIES);
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
  query,
  apiKey,
}: {
  query: string;
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
          query,
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
        query,
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
              Number(
                result.score ?? 0,
              ),
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
      .hostname.replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function deduplicateCandidates(
  candidates: SearchCandidate[],
): SearchCandidate[] {
  const byUrl = new Map<
    string,
    SearchCandidate
  >();

  for (const candidate of candidates) {
    const key =
      candidate.url
        .replace(/\/+$/, "")
        .toLowerCase();

    const existing =
      byUrl.get(key);

    if (
      !existing ||
      candidate.tavilyScore >
        existing.tavilyScore
    ) {
      byUrl.set(key, candidate);
    }
  }

  return [...byUrl.values()].sort(
    (first, second) =>
      second.tavilyScore -
      first.tavilyScore,
  );
}

function htmlToText(
  html: string,
): string {
  return html
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
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(
      0,
      MAX_SOURCE_CONTENT_LENGTH,
    );
}

function extractHtmlTitle(
  html: string,
): string | null {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  );

  return cleanText(
    match?.[1]
      ?.replace(/<[^>]+>/g, " "),
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
              "CossaLeadHunter/1.0 (+https://growth.cossanexusholdings.co.za)",
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

function inferOrganisationName(
  candidate: SearchCandidate,
  inspection: PageInspection,
): string {
  const source =
    inspection.title ||
    candidate.title ||
    getHostname(candidate.url);

  const cleaned = source
    .replace(
      /\s+[|–—-]\s+.*$/,
      "",
    )
    .replace(
      /\b(home|contact us|about us|tenders?|rfq|rfp)\b/gi,
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
): "private" | "government" | "nonprofit" {
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
    /\b(church|ministry|nonprofit|non-profit|charity|ngo|community centre)\b/i.test(
      combined,
    )
  ) {
    return "nonprofit";
  }

  return "private";
}

function inferSignal(
  candidate: SearchCandidate,
  inspection: PageInspection,
): ProspectSignal {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      4_000,
    )}`.toLowerCase();

  let type: ProspectSignalType =
    "general_fit";

  let title =
    "Public service-fit signal";

  if (
    /\b(request for quotation|rfq)\b/i.test(
      searchable,
    )
  ) {
    type = "request_for_quote";
    title =
      "Request for quotation signal";
  } else if (
    /\b(request for proposal|rfp)\b/i.test(
      searchable,
    )
  ) {
    type =
      "request_for_proposal";
    title =
      "Request for proposal signal";
  } else if (
    /\b(tender|bid invitation|invitation to bid)\b/i.test(
      searchable,
    )
  ) {
    type = "active_tender";
    title =
      "Tender or bid signal";
  } else if (
    /\b(supplier registration|supplier database|vendor registration)\b/i.test(
      searchable,
    )
  ) {
    type =
      "supplier_registration";
    title =
      "Supplier-registration signal";
  } else if (
    /\b(new branch|opening soon|new development|expansion)\b/i.test(
      searchable,
    )
  ) {
    type =
      "business_expansion";
    title =
      "Business-expansion signal";
  } else if (
    /\b(maintenance|repair|refurbish|renovation|upgrade)\b/i.test(
      searchable,
    )
  ) {
    type =
      "maintenance_need";
    title =
      "Maintenance or upgrade signal";
  } else if (
    /\b(cleaning|hygiene|sanitation)\b/i.test(
      searchable,
    )
  ) {
    type = "cleaning_need";
    title =
      "Cleaning or hygiene signal";
  } else if (
    /\b(website|web design|digital platform|online portal)\b/i.test(
      searchable,
    )
  ) {
    type =
      "technology_need";
    title =
      "Technology or website signal";
  }

  const confidence =
    type === "general_fit"
      ? 45
      : inspection.fetchSucceeded
        ? 82
        : 68;

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
): LeadHunterServiceCategory {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      5_000,
    )}`.toLowerCase();

  const servicePatterns: Array<{
    service: LeadHunterServiceCategory;
    pattern: RegExp;
  }> = [
    {
      service:
        "commercial_cleaning",
      pattern:
        /\b(cleaning|hygiene|sanitation|janitorial)\b/i,
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
        /\b(maintenance|repairs?|property services)\b/i,
    },
    {
      service: "renovation",
      pattern:
        /\b(renovation|refurbishment|upgrade)\b/i,
    },
    {
      service: "painting",
      pattern:
        /\b(painting|repainting)\b/i,
    },
    {
      service: "roofing",
      pattern:
        /\b(roofing|roof repair)\b/i,
    },
    {
      service:
        "website_design",
      pattern:
        /\b(website|web design|web development)\b/i,
    },
    {
      service:
        "digital_marketing",
      pattern:
        /\b(marketing|social media|advertising)\b/i,
    },
    {
      service: "seo",
      pattern:
        /\b(search engine optimisation|search engine optimization|seo)\b/i,
    },
    {
      service:
        "ai_automation",
      pattern:
        /\b(automation|artificial intelligence|ai system)\b/i,
    },
    {
      service:
        "business_documents",
      pattern:
        /\b(document management|proposal|quotation|contract)\b/i,
    },
    {
      service: "construction",
      pattern:
        /\b(construction|building works|civil works)\b/i,
    },
  ];

  for (const item of servicePatterns) {
    if (
      request.services.includes(
        item.service,
      ) &&
      item.pattern.test(searchable)
    ) {
      return item.service;
    }
  }

  return (
    request.services[0] ??
    "general"
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
    seo: "cossa_tech",
    crm: "cossa_tech",
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
  locationText: string | null;
} {
  const searchable =
    `${candidate.title} ${candidate.snippet} ${inspection.text.slice(
      0,
      3_000,
    )}`.toLowerCase();

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
    locationText:
      matchedLocation,
  };
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

function calculateScores({
  candidate,
  inspection,
  signal,
  sector,
  request,
}: {
  candidate: SearchCandidate;
  inspection: PageInspection;
  signal: ProspectSignal;
  sector:
    | "private"
    | "government"
    | "nonprofit";
  request: LeadHunterSearchRequest;
}) {
  const hasContact =
    inspection.phones.length > 0 ||
    inspection.emails.length > 0;

  const strongSignal =
    signal.type !== "general_fit";

  const governmentTrust =
    sector === "government" &&
    isGovernmentSource(
      candidate.url,
    );

  const fitScore = clampScore(
    48 +
      candidate.tavilyScore * 35 +
      (request.organisation_types.length >
      0
        ? 5
        : 0),
  );

  const intentScore = clampScore(
    strongSignal
      ? 78 +
          signal.confidence * 0.15
      : 42,
  );

  const evidenceScore = clampScore(
    45 +
      (inspection.fetchSucceeded
        ? 25
        : 0) +
      (hasContact ? 15 : 0) +
      (governmentTrust ? 15 : 0),
  );

  const timingScore = clampScore(
    [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
    ].includes(signal.type)
      ? 90
      : [
            "supplier_registration",
            "business_expansion",
            "new_branch",
          ].includes(signal.type)
        ? 75
        : 55,
  );

  const contactabilityScore =
    clampScore(
      (inspection.phones.length > 0
        ? 45
        : 0) +
        (inspection.emails.length > 0
          ? 35
          : 0) +
        (inspection.contactPageUrl
          ? 20
          : 0),
    );

  const totalScore = clampScore(
    fitScore * 0.3 +
      intentScore * 0.25 +
      evidenceScore * 0.2 +
      timingScore * 0.15 +
      contactabilityScore *
        0.1,
  );

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
    /\b(framework contract|multi-year|national|province-wide|major works|large-scale)\b/i.test(
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
    /\b(minor works|small works|quotation|rfq|repair)\b/i.test(
      searchable,
    )
  ) {
    return "small";
  }

  return "unknown";
}

function classifyProspect(
  signal: ProspectSignal,
  totalScore: number,
): ProspectClassification {
  if (
    signal.type === "active_tender" ||
    signal.type ===
      "request_for_quote" ||
    signal.type ===
      "request_for_proposal"
  ) {
    return "tender";
  }

  if (
    signal.type ===
    "supplier_registration"
  ) {
    return "supplier_opportunity";
  }

  if (totalScore >= 80) {
    return "active_opportunity";
  }

  if (totalScore >= 65) {
    return "qualified_prospect";
  }

  return "prospect";
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
    if (
      signal.type ===
        "active_tender" ||
      signal.type ===
        "request_for_quote" ||
      signal.type ===
        "request_for_proposal"
    ) {
      return "tender_notice";
    }

    return "government_portal";
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
  const sector =
    inferSector(candidate);

  const signal =
    inferSignal(
      candidate,
      inspection,
    );

  const service =
    chooseRecommendedService(
      request,
      candidate,
      inspection,
    );

  const company =
    recommendedCompanyForService(
      service,
      request.companies,
    );

  const scores = calculateScores({
    candidate,
    inspection,
    signal,
    sector,
    request,
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

  const evidence: ProspectEvidence[] =
    [
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
          "organisation",
          "opportunity signal",
          "public source",
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
        "Public contact route discovered on the source website.",
      supports: [
        "contact route",
      ],
    });
  }

  const hasContact =
    inspection.phones.length > 0 ||
    inspection.emails.length > 0;

  const verificationStatus =
    evidence.length >= 2 &&
    hasContact &&
    scores.evidenceScore >= 70
      ? "verified"
      : "partially_verified";

  const opportunitySize =
    inferOpportunitySize(
      signal,
      sector,
      candidate,
    );

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
      null,

    website:
      inspection.finalUrl ||
      candidate.url,

    public_phone:
      inspection.phones[0] ??
      null,

    public_email:
      inspection.emails[0] ??
      null,

    contact_page_url:
      inspection.contactPageUrl,

    contact_name: null,
    contact_title: null,

    decision_maker_route:
      sector === "government"
        ? "Use the procurement contact and tender documentation on the official notice."
        : inspection.contactPageUrl
          ? "Use the organisation’s public contact page and ask for the relevant owner, procurement manager, facilities manager or marketing decision-maker."
          : hasContact
            ? "Use the verified public business contact and request the relevant decision-maker."
            : "Public decision-maker route requires further verification.",

    address: null,
    suburb: null,
    city: location.city,
    province:
      location.province,
    country:
      "South Africa",

    recommended_company:
      company,

    recommended_service:
      service,

    service_fit_reason:
      `${organisationName} appeared in a live public search for ${serviceLabel(
        service,
      )}. The public source contains a ${signal.title.toLowerCase()}.`,

    opportunity_summary:
      signal.explanation,

    opportunity_size:
      opportunitySize,

    estimated_value: null,

    classification:
      classifyProspect(
        signal,
        scores.totalScore,
      ),

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
      sector === "government"
        ? "Open the official notice, confirm the closing date, eligibility, compulsory briefing, CIDB or supplier requirements, and prepare a bid/no-bid decision."
        : hasContact
          ? `Review the source, confirm the service need, then prepare a personalised ${inspection.phones.length > 0 ? "call or WhatsApp" : "email"} approach for human approval.`
          : "Verify a public phone, email or contact page before outreach.",

    outreach_angle:
      sector === "government"
        ? null
        : `Introduce ${company} and reference the publicly visible ${signal.title.toLowerCase()} without claiming that the organisation has requested contact.`,

    duplicate_status:
      "not_checked",

    duplicate_lead_id:
      null,

    rejection_reasons: [],

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
      ? getHostname(
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
  const unique = new Map<
    string,
    LeadHunterProspect
  >();

  for (const prospect of prospects) {
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
      unique.set(key, prospect);
    }
  }

  return [...unique.values()]
    .sort(
      (first, second) =>
        second.total_score -
        first.total_score,
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

          const queries =
            createSearchQueries(
              searchRequest,
            );

          if (
            queries.length === 0
          ) {
            return new Response(
              "No valid search queries could be generated from this hunt.",
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
              queries.map((query) =>
                tavilySearch({
                  query,
                  apiKey:
                    environment.tavilyApiKey,
                }),
              ),
            );

          const candidates: SearchCandidate[] =
            [];

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
                `Search failed for query: ${queries[index]}`,
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
            const emptyResponse: LeadHunterSearchResponse =
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
                  "No public search results matched this hunt. Broaden the service, location or organisation-type filters.",
                ],
                providers_used: [
                  "Tavily",
                ],
              };

            return Response.json(
              emptyResponse,
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

          const responsePayload: LeadHunterSearchResponse =
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
                ...(acceptedProspects.length ===
                0
                  ? [
                      "Search results were found, but none met the current evidence and score requirements.",
                    ]
                  : []),
                "Public contact details must be used only for lawful, relevant and respectful business outreach.",
                "A prospect result is an opportunity signal, not proof that the organisation has agreed to buy or requested contact.",
              ],

              providers_used: [
                "Tavily",
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