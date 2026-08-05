// Production Lead Hunter data and verification layer.
//
// Responsibilities:
// - Define high-value private and public-sector hunting strategies.
// - Request verified public prospect research from a secure server endpoint.
// - Validate returned evidence before displaying or saving prospects.
// - Reject invented, incomplete or unsupported prospect records.
// - Score prospects consistently.
// - Detect likely duplicates in the existing Growth CRM.
// - Save approved prospects into the existing public.leads table.
//
// Important:
// This browser file does not scrape or search the internet directly.
// Real research must be performed by the authenticated server route:
// POST /api/lead-hunter/search
//
// API keys, search providers and government-data integrations must remain
// server-side and must never be exposed in this client file.

import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  from: (table: string) => any;
};

export const LEAD_HUNTER_SEARCH_ENDPOINT =
  "/api/lead-hunter/search";

export const MAX_HUNT_RESULTS = 50;
export const DEFAULT_HUNT_RESULTS = 15;

export type LeadHunterSector =
  | "private"
  | "government"
  | "nonprofit"
  | "mixed";

export type LeadHunterCompany =
  | "cossa_nexus_construction"
  | "cossa_facility_services"
  | "cossa_tech"
  | "cossa_ai_growth"
  | "nexdocs"
  | "cossa_store"
  | "cossa_nexus_holdings";

export type LeadHunterServiceCategory =
  | "construction"
  | "renovation"
  | "property_maintenance"
  | "painting"
  | "tiling"
  | "ceilings"
  | "roofing"
  | "plumbing"
  | "facility_management"
  | "commercial_cleaning"
  | "deep_cleaning"
  | "hygiene"
  | "landscaping"
  | "waste_management"
  | "website_design"
  | "seo"
  | "digital_marketing"
  | "lead_generation"
  | "crm"
  | "ai_automation"
  | "business_documents"
  | "quotations"
  | "proposals"
  | "contracts"
  | "ecommerce"
  | "general";

export type ProspectVerificationStatus =
  | "unverified"
  | "partially_verified"
  | "verified"
  | "rejected";

export type ProspectClassification =
  | "prospect"
  | "qualified_prospect"
  | "active_opportunity"
  | "tender"
  | "supplier_opportunity"
  | "partnership"
  | "referral_source"
  | "rejected";

export type OpportunitySize =
  | "micro"
  | "small"
  | "medium"
  | "large"
  | "strategic"
  | "unknown";

export type EvidenceType =
  | "official_website"
  | "government_portal"
  | "tender_notice"
  | "procurement_notice"
  | "company_directory"
  | "business_profile"
  | "job_posting"
  | "news_report"
  | "social_profile"
  | "contact_page"
  | "other_public_source";

export type ProspectSignalType =
  | "active_tender"
  | "request_for_quote"
  | "request_for_proposal"
  | "supplier_registration"
  | "new_development"
  | "renovation_need"
  | "maintenance_need"
  | "cleaning_need"
  | "website_problem"
  | "seo_gap"
  | "inactive_marketing"
  | "hiring_signal"
  | "new_branch"
  | "business_expansion"
  | "poor_customer_experience"
  | "document_need"
  | "technology_need"
  | "general_fit";

export type HuntStatus =
  | "idle"
  | "searching"
  | "completed"
  | "failed";

export interface ProspectEvidence {
  id?: string;
  type: EvidenceType;
  title: string;
  url: string;
  publisher: string | null;
  published_at: string | null;
  checked_at: string;
  excerpt: string | null;
  supports: string[];
}

export interface ProspectSignal {
  type: ProspectSignalType;
  title: string;
  explanation: string;
  evidence_url: string;
  detected_at: string;
  confidence: number;
}

export interface LeadHunterProspect {
  id: string;
  organisation_name: string;
  trading_name: string | null;

  sector: LeadHunterSector;
  industry: string | null;
  organisation_type: string | null;

  website: string | null;
  public_phone: string | null;
  public_email: string | null;
  contact_page_url: string | null;

  contact_name: string | null;
  contact_title: string | null;
  decision_maker_route: string | null;

  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  country: string;

  recommended_company: LeadHunterCompany;
  recommended_service: LeadHunterServiceCategory;
  service_fit_reason: string;

  opportunity_summary: string;
  opportunity_size: OpportunitySize;
  estimated_value: number | null;

  classification: ProspectClassification;
  verification_status: ProspectVerificationStatus;

  fit_score: number;
  intent_score: number;
  evidence_score: number;
  timing_score: number;
  contactability_score: number;
  total_score: number;

  signals: ProspectSignal[];
  evidence: ProspectEvidence[];

  primary_source_url: string;
  date_verified: string;

  next_action: string;
  outreach_angle: string | null;

  duplicate_status:
    | "not_checked"
    | "clear"
    | "possible_duplicate"
    | "existing_crm_lead";

  duplicate_lead_id: string | null;
  rejection_reasons: string[];

  raw_provider_name: string | null;
  raw_provider_result_id: string | null;
}

export interface LeadHunterSearchRequest {
  sector: LeadHunterSector;
  companies: LeadHunterCompany[];
  services: LeadHunterServiceCategory[];

  locations: string[];
  industries: string[];
  organisation_types: string[];

  result_count: number;

  minimum_score: number;
  minimum_evidence_sources: number;

  include_small_projects: boolean;
  include_large_projects: boolean;
  include_private_sector: boolean;
  include_government_sector: boolean;
  include_nonprofits: boolean;

  require_public_phone_or_email: boolean;
  require_website: boolean;
  require_opportunity_signal: boolean;

  tender_keywords: string[];
  prospect_keywords: string[];

  verified_sources_only: boolean;
  exclude_existing_crm_leads: boolean;
  notes: string | null;
}

export interface LeadHunterSearchResponse {
  hunt_id: string;
  status: HuntStatus;
  searched_at: string;
  completed_at: string | null;

  request: LeadHunterSearchRequest;
  prospects: LeadHunterProspect[];

  source_count: number;
  accepted_count: number;
  rejected_count: number;

  warnings: string[];
  providers_used: string[];
}

export interface CrmDuplicateMatch {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  score: number;
  created_at: string;
  match_reasons: string[];
}

export interface SaveProspectResult {
  lead_id: string;
  created: boolean;
  duplicate: boolean;
  duplicate_match: CrmDuplicateMatch | null;
}

export interface LeadHunterStrategy {
  id: string;
  title: string;
  description: string;
  target_sector: LeadHunterSector;
  companies: LeadHunterCompany[];
  services: LeadHunterServiceCategory[];
  organisation_types: string[];
  industries: string[];
  keywords: string[];
  opportunity_signals: ProspectSignalType[];
  recommended_locations: string[];
  minimum_score: number;
  default_result_count: number;
}

export const SOUTH_AFRICAN_PROVINCES = [
  "Gauteng",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Western Cape",
  "Northern Cape",
] as const;

export const PRIORITY_GAUTENG_LOCATIONS = [
  "Pretoria",
  "Centurion",
  "Midrand",
  "Johannesburg",
  "Sandton",
  "Randburg",
  "Roodepoort",
  "Kempton Park",
  "Boksburg",
  "Benoni",
  "Germiston",
  "Alberton",
  "Vanderbijlpark",
  "Vereeniging",
] as const;

/**
 * Hunting strategies are opportunity hypotheses—not claims that a prospect
 * exists or needs a service. Every returned prospect still requires evidence.
 */
export const LEAD_HUNTER_STRATEGIES: LeadHunterStrategy[] = [
  {
    id: "property-managers-gauteng",
    title: "Property Managers and Managing Agents",
    description:
      "Find property-management firms, sectional-title managers and estate managers that may procure recurring maintenance, renovations, cleaning, landscaping or facility support.",
    target_sector: "private",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
    ],
    services: [
      "property_maintenance",
      "renovation",
      "commercial_cleaning",
      "facility_management",
      "landscaping",
    ],
    organisation_types: [
      "Property management company",
      "Managing agent",
      "Estate management company",
      "Body corporate management company",
    ],
    industries: [
      "Property management",
      "Real estate",
      "Sectional-title management",
    ],
    keywords: [
      "property manager",
      "managing agent",
      "body corporate",
      "estate management",
      "maintenance contractor",
      "cleaning contractor",
      "supplier registration",
    ],
    opportunity_signals: [
      "maintenance_need",
      "renovation_need",
      "cleaning_need",
      "supplier_registration",
    ],
    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
    ],
    minimum_score: 60,
    default_result_count: 20,
  },

  {
    id: "schools-and-training-centres",
    title: "Schools, Colleges and Training Centres",
    description:
      "Find public and private education facilities with maintenance, cleaning, painting, roofing, technology, website or document needs.",
    target_sector: "mixed",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
    ],
    services: [
      "property_maintenance",
      "painting",
      "roofing",
      "commercial_cleaning",
      "website_design",
      "business_documents",
    ],
    organisation_types: [
      "Public school",
      "Private school",
      "College",
      "Training centre",
      "TVET college",
    ],
    industries: [
      "Education",
      "Training",
    ],
    keywords: [
      "school maintenance tender",
      "school cleaning tender",
      "school renovation",
      "college supplier database",
      "request for quotation",
      "school website",
    ],
    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
    ],
    recommended_locations: [
      "Gauteng",
      "Limpopo",
      "Mpumalanga",
      "North West",
    ],
    minimum_score: 65,
    default_result_count: 20,
  },

  {
    id: "churches-and-nonprofits",
    title: "Churches and Nonprofit Organisations",
    description:
      "Find churches, community centres, charities and nonprofit organisations needing small or large renovations, cleaning, websites, marketing, documents or operational systems.",
    target_sector: "nonprofit",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "cossa_ai_growth",
      "nexdocs",
    ],
    services: [
      "renovation",
      "painting",
      "ceilings",
      "commercial_cleaning",
      "website_design",
      "digital_marketing",
      "business_documents",
    ],
    organisation_types: [
      "Church",
      "Religious organisation",
      "Nonprofit organisation",
      "Community centre",
      "Charity",
    ],
    industries: [
      "Religious organisations",
      "Nonprofit",
      "Community services",
    ],
    keywords: [
      "church renovation",
      "church building project",
      "community centre maintenance",
      "nonprofit website",
      "church cleaning services",
    ],
    opportunity_signals: [
      "renovation_need",
      "maintenance_need",
      "website_problem",
      "inactive_marketing",
      "document_need",
    ],
    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
    ],
    minimum_score: 55,
    default_result_count: 20,
  },

  {
    id: "retail-and-shopping-centres",
    title: "Retailers and Shopping Centres",
    description:
      "Find shopping centres, retail stores, restaurants and franchise locations needing fit-outs, maintenance, cleaning, websites, marketing or customer-growth support.",
    target_sector: "private",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "cossa_ai_growth",
    ],
    services: [
      "renovation",
      "property_maintenance",
      "commercial_cleaning",
      "website_design",
      "seo",
      "digital_marketing",
    ],
    organisation_types: [
      "Shopping centre",
      "Retail store",
      "Restaurant",
      "Franchise",
      "Commercial landlord",
    ],
    industries: [
      "Retail",
      "Hospitality",
      "Commercial property",
    ],
    keywords: [
      "new store opening",
      "shop fitting",
      "retail maintenance",
      "shopping centre tender",
      "commercial cleaning contract",
      "new branch",
    ],
    opportunity_signals: [
      "new_branch",
      "business_expansion",
      "renovation_need",
      "maintenance_need",
      "cleaning_need",
    ],
    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
    ],
    minimum_score: 65,
    default_result_count: 20,
  },

  {
    id: "industrial-and-warehousing",
    title: "Industrial Sites, Warehouses and Logistics Firms",
    description:
      "Find warehouses, factories, logistics providers and industrial properties with recurring maintenance, cleaning, repairs, painting, facility or technology requirements.",
    target_sector: "private",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
    ],
    services: [
      "property_maintenance",
      "painting",
      "roofing",
      "facility_management",
      "commercial_cleaning",
      "ai_automation",
      "crm",
    ],
    organisation_types: [
      "Warehouse",
      "Logistics company",
      "Factory",
      "Distribution centre",
      "Industrial park",
    ],
    industries: [
      "Logistics",
      "Warehousing",
      "Manufacturing",
      "Distribution",
    ],
    keywords: [
      "warehouse maintenance",
      "industrial cleaning",
      "facility management tender",
      "logistics company expansion",
      "distribution centre contractor",
    ],
    opportunity_signals: [
      "maintenance_need",
      "cleaning_need",
      "business_expansion",
      "technology_need",
      "supplier_registration",
    ],
    recommended_locations: [
      "Centurion",
      "Midrand",
      "Pretoria",
      "Rosslyn",
      "Silverton",
      "Kempton Park",
      "Boksburg",
      "Germiston",
    ],
    minimum_score: 65,
    default_result_count: 20,
  },

  {
    id: "outdated-websites",
    title: "Businesses with Weak or Outdated Websites",
    description:
      "Find legitimate businesses with broken, outdated, slow, non-mobile or poorly converting websites and prepare evidence-based Cossa Tech outreach.",
    target_sector: "private",
    companies: [
      "cossa_tech",
      "cossa_ai_growth",
    ],
    services: [
      "website_design",
      "seo",
      "digital_marketing",
      "lead_generation",
      "crm",
    ],
    organisation_types: [
      "Small business",
      "Professional-services firm",
      "Contractor",
      "Retailer",
      "Property business",
    ],
    industries: [
      "Construction",
      "Professional services",
      "Retail",
      "Property",
      "Hospitality",
      "Local services",
    ],
    keywords: [
      "outdated website",
      "website not mobile friendly",
      "no online quote form",
      "broken website",
      "poor local SEO",
      "inactive website",
    ],
    opportunity_signals: [
      "website_problem",
      "seo_gap",
      "inactive_marketing",
      "technology_need",
    ],
    recommended_locations: [
      "South Africa",
    ],
    minimum_score: 60,
    default_result_count: 25,
  },

  {
    id: "inactive-social-profiles",
    title: "Businesses with Inactive Marketing",
    description:
      "Find real businesses whose public social or Google profiles appear inactive and prepare honest growth-service opportunities supported by evidence.",
    target_sector: "private",
    companies: [
      "cossa_ai_growth",
      "cossa_tech",
    ],
    services: [
      "digital_marketing",
      "lead_generation",
      "seo",
      "crm",
    ],
    organisation_types: [
      "Small business",
      "Local service provider",
      "Retailer",
      "Professional firm",
    ],
    industries: [
      "Construction",
      "Cleaning",
      "Property",
      "Retail",
      "Hospitality",
      "Professional services",
    ],
    keywords: [
      "inactive Facebook page",
      "inactive Google Business Profile",
      "no recent posts",
      "poor review response",
      "weak online presence",
    ],
    opportunity_signals: [
      "inactive_marketing",
      "seo_gap",
      "poor_customer_experience",
    ],
    recommended_locations: [
      "Gauteng",
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 25,
  },

  {
    id: "municipal-tenders",
    title: "Municipal Tenders and RFQs",
    description:
      "Find official municipal tenders, quotations, supplier invitations and procurement notices matching Cossa construction, maintenance, cleaning, technology and document services.",
    target_sector: "government",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
    ],
    services: [
      "construction",
      "property_maintenance",
      "commercial_cleaning",
      "facility_management",
      "website_design",
      "business_documents",
    ],
    organisation_types: [
      "Metropolitan municipality",
      "Local municipality",
      "District municipality",
      "Municipal entity",
    ],
    industries: [
      "Government",
      "Municipal services",
      "Public infrastructure",
    ],
    keywords: [
      "tender",
      "RFQ",
      "RFP",
      "request for quotation",
      "supplier database",
      "maintenance services",
      "cleaning services",
      "renovation",
      "website services",
    ],
    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
      "supplier_registration",
    ],
    recommended_locations: [
      ...SOUTH_AFRICAN_PROVINCES,
    ],
    minimum_score: 75,
    default_result_count: 20,
  },

  {
    id: "provincial-and-national-procurement",
    title: "Provincial and National Government Procurement",
    description:
      "Find verified opportunities from departments, public entities, hospitals, schools, agencies and state-owned organisations.",
    target_sector: "government",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
    ],
    services: [
      "construction",
      "renovation",
      "property_maintenance",
      "commercial_cleaning",
      "facility_management",
      "website_design",
      "ai_automation",
      "business_documents",
    ],
    organisation_types: [
      "National department",
      "Provincial department",
      "Public entity",
      "Government agency",
      "Public hospital",
      "State-owned organisation",
    ],
    industries: [
      "Government",
      "Healthcare",
      "Education",
      "Public infrastructure",
    ],
    keywords: [
      "eTender",
      "bid invitation",
      "request for quotation",
      "request for proposal",
      "maintenance tender",
      "cleaning tender",
      "construction tender",
      "ICT tender",
    ],
    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
      "supplier_registration",
    ],
    recommended_locations: [
      ...SOUTH_AFRICAN_PROVINCES,
    ],
    minimum_score: 80,
    default_result_count: 20,
  },

  {
    id: "small-projects-now",
    title: "Small Projects Available Now",
    description:
      "Find smaller, faster-to-close public requests and private-sector needs that can generate early cash flow without ignoring larger strategic work.",
    target_sector: "mixed",
    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "cossa_ai_growth",
      "nexdocs",
    ],
    services: [
      "painting",
      "tiling",
      "ceilings",
      "property_maintenance",
      "deep_cleaning",
      "website_design",
      "seo",
      "business_documents",
    ],
    organisation_types: [
      "Small business",
      "Property manager",
      "School",
      "Church",
      "Office",
      "Retail store",
      "Municipality",
    ],
    industries: [
      "Property",
      "Education",
      "Retail",
      "Local government",
      "Professional services",
    ],
    keywords: [
      "small works",
      "minor repairs",
      "painting quotation",
      "cleaning quotation",
      "website redesign",
      "request for quotation",
      "urgent maintenance",
    ],
    opportunity_signals: [
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "document_need",
    ],
    recommended_locations: [
      "Pretoria",
      "Centurion",
      "Midrand",
      "Johannesburg",
      "Gauteng",
    ],
    minimum_score: 55,
    default_result_count: 25,
  },
];

export const DEFAULT_LEAD_HUNTER_REQUEST: LeadHunterSearchRequest = {
  sector: "mixed",

  companies: [
    "cossa_nexus_construction",
    "cossa_facility_services",
    "cossa_tech",
    "cossa_ai_growth",
    "nexdocs",
  ],

  services: [
    "construction",
    "property_maintenance",
    "commercial_cleaning",
    "facility_management",
    "website_design",
    "seo",
    "digital_marketing",
    "lead_generation",
    "ai_automation",
    "business_documents",
  ],

  locations: [
    "Pretoria",
    "Centurion",
    "Midrand",
    "Johannesburg",
    "Gauteng",
  ],

  industries: [],
  organisation_types: [],

  result_count: DEFAULT_HUNT_RESULTS,

  minimum_score: 60,
  minimum_evidence_sources: 1,

  include_small_projects: true,
  include_large_projects: true,
  include_private_sector: true,
  include_government_sector: true,
  include_nonprofits: true,

  require_public_phone_or_email: false,
  require_website: false,
  require_opportunity_signal: true,

  tender_keywords: [
    "tender",
    "RFQ",
    "RFP",
    "request for quotation",
    "request for proposal",
    "supplier registration",
  ],

  prospect_keywords: [
    "maintenance",
    "renovation",
    "cleaning",
    "facility management",
    "construction",
    "website",
    "marketing",
    "lead generation",
    "business documents",
  ],

  verified_sources_only: true,
  exclude_existing_crm_leads: true,
  notes: null,
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();

  return cleaned || null;
}

function lowerText(value: unknown): string {
  return cleanText(value)?.toLowerCase() ?? "";
}

function normaliseEmail(value: unknown): string | null {
  const email = lowerText(value);

  if (!email) {
    return null;
  }

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return valid ? email : null;
}

function normalisePhone(value: unknown): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const phone = text.replace(/[^\d+]/g, "");

  return phone.length >= 9 ? phone : null;
}

function normaliseWebsite(value: unknown): string | null {
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

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function clampScore(value: unknown): number {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function safeNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isValidPublicUrl(value: unknown): boolean {
  return normaliseWebsite(value) !== null;
}

function samePhone(
  first: string | null,
  second: string | null,
): boolean {
  if (!first || !second) {
    return false;
  }

  const a = first.replace(/\D/g, "");
  const b = second.replace(/\D/g, "");

  if (a.length < 9 || b.length < 9) {
    return false;
  }

  return (
    a === b ||
    a.slice(-9) === b.slice(-9)
  );
}

function sameEmail(
  first: string | null,
  second: string | null,
): boolean {
  return Boolean(
    first &&
      second &&
      first.toLowerCase() === second.toLowerCase(),
  );
}

function similarCompanyName(
  first: string,
  second: string,
): boolean {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(
        /\b(pty|ltd|limited|inc|cc|company|holdings)\b/g,
        "",
      )
      .replace(/[^a-z0-9]/g, "");

  const a = normalise(first);
  const b = normalise(second);

  return Boolean(
    a &&
      b &&
      (a === b ||
        a.includes(b) ||
        b.includes(a)),
  );
}

function createClientId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `prospect-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function calculateProspectScore(
  prospect: Pick<
    LeadHunterProspect,
    | "fit_score"
    | "intent_score"
    | "evidence_score"
    | "timing_score"
    | "contactability_score"
  >,
): number {
  const weightedScore =
    clampScore(prospect.fit_score) * 0.3 +
    clampScore(prospect.intent_score) * 0.25 +
    clampScore(prospect.evidence_score) * 0.2 +
    clampScore(prospect.timing_score) * 0.15 +
    clampScore(prospect.contactability_score) * 0.1;

  return clampScore(weightedScore);
}

export function validateProspect(
  candidate: Partial<LeadHunterProspect>,
): LeadHunterProspect {
  const rejectionReasons: string[] = [];

  const organisationName =
    cleanText(candidate.organisation_name);

  if (!organisationName) {
    rejectionReasons.push(
      "Organisation name is missing.",
    );
  }

  const primarySourceUrl = normaliseWebsite(
    candidate.primary_source_url,
  );

  if (!primarySourceUrl) {
    rejectionReasons.push(
      "No valid primary public source URL was supplied.",
    );
  }

  const evidence = Array.isArray(candidate.evidence)
    ? candidate.evidence
        .filter(
          (item): item is ProspectEvidence =>
            Boolean(
              item &&
                cleanText(item.title) &&
                isValidPublicUrl(item.url),
            ),
        )
        .map((item) => ({
          ...item,
          title: cleanText(item.title) ?? "Public source",
          url: normaliseWebsite(item.url) as string,
          publisher: cleanText(item.publisher),
          published_at: item.published_at || null,
          checked_at:
            item.checked_at ||
            new Date().toISOString(),
          excerpt: cleanText(item.excerpt),
          supports: Array.isArray(item.supports)
            ? item.supports
                .map(cleanText)
                .filter(
                  (value): value is string =>
                    Boolean(value),
                )
            : [],
        }))
    : [];

  if (evidence.length === 0) {
    rejectionReasons.push(
      "No valid public evidence source was supplied.",
    );
  }

  const website = normaliseWebsite(candidate.website);
  const phone = normalisePhone(candidate.public_phone);
  const email = normaliseEmail(candidate.public_email);

  if (!website && !phone && !email) {
    rejectionReasons.push(
      "No website, public phone number or public email was verified.",
    );
  }

  const signals = Array.isArray(candidate.signals)
    ? candidate.signals.filter(
        (signal): signal is ProspectSignal =>
          Boolean(
            signal &&
              cleanText(signal.title) &&
              cleanText(signal.explanation) &&
              isValidPublicUrl(signal.evidence_url),
          ),
      )
    : [];

  const fitScore = clampScore(candidate.fit_score);
  const intentScore = clampScore(candidate.intent_score);
  const evidenceScore = clampScore(candidate.evidence_score);
  const timingScore = clampScore(candidate.timing_score);
  const contactabilityScore = clampScore(
    candidate.contactability_score,
  );

  const totalScore = calculateProspectScore({
    fit_score: fitScore,
    intent_score: intentScore,
    evidence_score: evidenceScore,
    timing_score: timingScore,
    contactability_score: contactabilityScore,
  });

  const requestedStatus =
    candidate.verification_status ??
    "unverified";

  let verificationStatus: ProspectVerificationStatus =
    requestedStatus;

  if (rejectionReasons.length > 0) {
    verificationStatus = "rejected";
  } else if (
    evidence.length >= 2 &&
    (phone || email) &&
    signals.length >= 1
  ) {
    verificationStatus = "verified";
  } else {
    verificationStatus = "partially_verified";
  }

  const classification =
    verificationStatus === "rejected"
      ? "rejected"
      : candidate.classification ?? "prospect";

  return {
    id: cleanText(candidate.id) ?? createClientId(),

    organisation_name:
      organisationName ?? "Rejected prospect",

    trading_name: cleanText(candidate.trading_name),

    sector: candidate.sector ?? "private",
    industry: cleanText(candidate.industry),
    organisation_type: cleanText(
      candidate.organisation_type,
    ),

    website,
    public_phone: phone,
    public_email: email,
    contact_page_url: normaliseWebsite(
      candidate.contact_page_url,
    ),

    contact_name: cleanText(candidate.contact_name),
    contact_title: cleanText(candidate.contact_title),
    decision_maker_route: cleanText(
      candidate.decision_maker_route,
    ),

    address: cleanText(candidate.address),
    suburb: cleanText(candidate.suburb),
    city: cleanText(candidate.city),
    province: cleanText(candidate.province),
    country:
      cleanText(candidate.country) ?? "South Africa",

    recommended_company:
      candidate.recommended_company ??
      "cossa_nexus_holdings",

    recommended_service:
      candidate.recommended_service ?? "general",

    service_fit_reason:
      cleanText(candidate.service_fit_reason) ??
      "Service fit has not been sufficiently explained.",

    opportunity_summary:
      cleanText(candidate.opportunity_summary) ??
      "No verified opportunity summary supplied.",

    opportunity_size:
      candidate.opportunity_size ?? "unknown",

    estimated_value: safeNumber(
      candidate.estimated_value,
    ),

    classification,
    verification_status: verificationStatus,

    fit_score: fitScore,
    intent_score: intentScore,
    evidence_score: evidenceScore,
    timing_score: timingScore,
    contactability_score: contactabilityScore,
    total_score: totalScore,

    signals,
    evidence,

    primary_source_url:
      primarySourceUrl ?? "",

    date_verified:
      candidate.date_verified ||
      new Date().toISOString(),

    next_action:
      cleanText(candidate.next_action) ??
      "Verify the organisation and identify the correct public procurement or decision-maker route.",

    outreach_angle: cleanText(candidate.outreach_angle),

    duplicate_status:
      candidate.duplicate_status ?? "not_checked",

    duplicate_lead_id:
      cleanText(candidate.duplicate_lead_id),

    rejection_reasons: [
      ...new Set([
        ...(candidate.rejection_reasons ?? []),
        ...rejectionReasons,
      ]),
    ],

    raw_provider_name: cleanText(
      candidate.raw_provider_name,
    ),

    raw_provider_result_id: cleanText(
      candidate.raw_provider_result_id,
    ),
  };
}

export function validateSearchRequest(
  request: Partial<LeadHunterSearchRequest>,
): LeadHunterSearchRequest {
  const resultCount = Math.min(
    MAX_HUNT_RESULTS,
    Math.max(
      1,
      Math.round(
        Number(
          request.result_count ??
            DEFAULT_HUNT_RESULTS,
        ),
      ),
    ),
  );

  return {
    ...DEFAULT_LEAD_HUNTER_REQUEST,
    ...request,

    companies:
      request.companies?.length
        ? [...new Set(request.companies)]
        : DEFAULT_LEAD_HUNTER_REQUEST.companies,

    services:
      request.services?.length
        ? [...new Set(request.services)]
        : DEFAULT_LEAD_HUNTER_REQUEST.services,

    locations:
      request.locations
        ?.map(cleanText)
        .filter(
          (value): value is string =>
            Boolean(value),
        ) ??
      DEFAULT_LEAD_HUNTER_REQUEST.locations,

    industries:
      request.industries
        ?.map(cleanText)
        .filter(
          (value): value is string =>
            Boolean(value),
        ) ?? [],

    organisation_types:
      request.organisation_types
        ?.map(cleanText)
        .filter(
          (value): value is string =>
            Boolean(value),
        ) ?? [],

    result_count: resultCount,

    minimum_score: clampScore(
      request.minimum_score ??
        DEFAULT_LEAD_HUNTER_REQUEST.minimum_score,
    ),

    minimum_evidence_sources: Math.max(
      1,
      Math.min(
        5,
        Math.round(
          Number(
            request.minimum_evidence_sources ??
              1,
          ),
        ),
      ),
    ),

    tender_keywords:
      request.tender_keywords
        ?.map(cleanText)
        .filter(
          (value): value is string =>
            Boolean(value),
        ) ??
      DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords:
      request.prospect_keywords
        ?.map(cleanText)
        .filter(
          (value): value is string =>
            Boolean(value),
        ) ??
      DEFAULT_LEAD_HUNTER_REQUEST.prospect_keywords,

    notes: cleanText(request.notes),
  };
}

export function requestFromStrategy(
  strategy: LeadHunterStrategy,
  overrides: Partial<LeadHunterSearchRequest> = {},
): LeadHunterSearchRequest {
  return validateSearchRequest({
    ...DEFAULT_LEAD_HUNTER_REQUEST,

    sector: strategy.target_sector,
    companies: strategy.companies,
    services: strategy.services,

    locations: strategy.recommended_locations,
    industries: strategy.industries,
    organisation_types: strategy.organisation_types,

    result_count: strategy.default_result_count,
    minimum_score: strategy.minimum_score,

    tender_keywords:
      strategy.target_sector === "government"
        ? strategy.keywords
        : DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords: strategy.keywords,

    include_private_sector:
      strategy.target_sector === "private" ||
      strategy.target_sector === "mixed",

    include_government_sector:
      strategy.target_sector === "government" ||
      strategy.target_sector === "mixed",

    include_nonprofits:
      strategy.target_sector === "nonprofit" ||
      strategy.target_sector === "mixed",

    ...overrides,
  });
}

export async function huntProspects(
  request: Partial<LeadHunterSearchRequest>,
  signal?: AbortSignal,
): Promise<LeadHunterSearchResponse> {
  const validatedRequest =
    validateSearchRequest(request);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      `Lead Hunter authentication failed: ${sessionError.message}`,
    );
  }

  if (!session) {
    throw new Error(
      "Your session has expired. Sign in again before running the Lead Hunter.",
    );
  }

  const response = await fetch(
    LEAD_HUNTER_SEARCH_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(validatedRequest),
      signal,
    },
  );

  if (!response.ok) {
    const message = await response
      .text()
      .catch(() => "");

    throw new Error(
      message ||
        `Lead Hunter search failed (${response.status}).`,
    );
  }

  const payload =
    (await response.json()) as Partial<LeadHunterSearchResponse>;

  const prospects = Array.isArray(payload.prospects)
    ? payload.prospects.map(validateProspect)
    : [];

  const acceptedProspects = prospects
    .filter(
      (prospect) =>
        prospect.verification_status !== "rejected" &&
        prospect.total_score >=
          validatedRequest.minimum_score &&
        prospect.evidence.length >=
          validatedRequest.minimum_evidence_sources,
    )
    .sort(
      (first, second) =>
        second.total_score - first.total_score,
    )
    .slice(0, validatedRequest.result_count);

  const rejectedCount =
    prospects.length - acceptedProspects.length;

  return {
    hunt_id:
      cleanText(payload.hunt_id) ?? createClientId(),

    status: "completed",

    searched_at:
      payload.searched_at ??
      new Date().toISOString(),

    completed_at:
      payload.completed_at ??
      new Date().toISOString(),

    request: validatedRequest,
    prospects: acceptedProspects,

    source_count:
      Number(payload.source_count) ||
      acceptedProspects.reduce(
        (total, prospect) =>
          total + prospect.evidence.length,
        0,
      ),

    accepted_count:
      acceptedProspects.length,

    rejected_count:
      Number(payload.rejected_count) ||
      rejectedCount,

    warnings: Array.isArray(payload.warnings)
      ? payload.warnings
          .map(cleanText)
          .filter(
            (value): value is string =>
              Boolean(value),
          )
      : [],

    providers_used: Array.isArray(
      payload.providers_used,
    )
      ? payload.providers_used
          .map(cleanText)
          .filter(
            (value): value is string =>
              Boolean(value),
          )
      : [],
  };
}

export async function findCrmDuplicates(
  prospect: LeadHunterProspect,
): Promise<CrmDuplicateMatch[]> {
  const { data, error } = await db
    .from("leads")
    .select(
      "id,name,full_name,company,phone,email,source,status,score,created_at",
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1000);

  if (error) {
    throw new Error(
      `Unable to check CRM duplicates: ${error.message}`,
    );
  }

  const prospectPhone = normalisePhone(
    prospect.public_phone,
  );

  const prospectEmail = normaliseEmail(
    prospect.public_email,
  );

  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const rowName =
        cleanText(row.company) ??
        cleanText(row.full_name) ??
        cleanText(row.name) ??
        "Unnamed lead";

      const matchReasons: string[] = [];

      if (
        sameEmail(
          prospectEmail,
          normaliseEmail(row.email),
        )
      ) {
        matchReasons.push("Same email address");
      }

      if (
        samePhone(
          prospectPhone,
          normalisePhone(row.phone),
        )
      ) {
        matchReasons.push("Same phone number");
      }

      if (
        similarCompanyName(
          prospect.organisation_name,
          rowName,
        )
      ) {
        matchReasons.push(
          "Similar organisation name",
        );
      }

      return {
        id: String(row.id),
        name:
          cleanText(row.full_name) ??
          cleanText(row.name) ??
          rowName,
        company: cleanText(row.company),
        phone: normalisePhone(row.phone),
        email: normaliseEmail(row.email),
        source: cleanText(row.source),
        status: cleanText(row.status) ?? "New",
        score: clampScore(row.score),
        created_at:
          cleanText(row.created_at) ?? "",
        match_reasons: matchReasons,
      };
    })
    .filter(
      (match: CrmDuplicateMatch) =>
        match.match_reasons.length > 0,
    );
}

function formatProspectEvidence(
  prospect: LeadHunterProspect,
): string {
  const evidenceLines = prospect.evidence.map(
    (evidence, index) =>
      [
        `${index + 1}. ${evidence.title}`,
        `URL: ${evidence.url}`,
        evidence.publisher
          ? `Publisher: ${evidence.publisher}`
          : null,
        evidence.published_at
          ? `Published: ${evidence.published_at}`
          : null,
        `Checked: ${evidence.checked_at}`,
        evidence.excerpt
          ? `Evidence: ${evidence.excerpt}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
  );

  return [
    "Lead Hunter verified public prospect.",
    "",
    `Organisation: ${prospect.organisation_name}`,
    `Sector: ${prospect.sector}`,
    `Industry: ${prospect.industry ?? "Not confirmed"}`,
    `Organisation type: ${
      prospect.organisation_type ?? "Not confirmed"
    }`,
    `Website: ${prospect.website ?? "Not found"}`,
    `Public phone: ${
      prospect.public_phone ?? "Not found"
    }`,
    `Public email: ${
      prospect.public_email ?? "Not found"
    }`,
    `Location: ${[
      prospect.address,
      prospect.suburb,
      prospect.city,
      prospect.province,
      prospect.country,
    ]
      .filter(Boolean)
      .join(", ")}`,
    "",
    `Recommended Cossa company: ${prospect.recommended_company}`,
    `Recommended service: ${prospect.recommended_service}`,
    `Service fit: ${prospect.service_fit_reason}`,
    "",
    `Opportunity: ${prospect.opportunity_summary}`,
    `Opportunity size: ${prospect.opportunity_size}`,
    `Estimated value: ${
      prospect.estimated_value !== null
        ? `R${prospect.estimated_value.toFixed(2)}`
        : "Not verified"
    }`,
    "",
    `Classification: ${prospect.classification}`,
    `Verification: ${prospect.verification_status}`,
    `Total score: ${prospect.total_score}/100`,
    `Date verified: ${prospect.date_verified}`,
    "",
    `Decision-maker route: ${
      prospect.decision_maker_route ??
      "Not yet verified"
    }`,
    `Recommended next action: ${prospect.next_action}`,
    prospect.outreach_angle
      ? `Outreach angle: ${prospect.outreach_angle}`
      : null,
    "",
    "PUBLIC EVIDENCE",
    ...evidenceLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function saveProspectToCrm(
  prospectInput: LeadHunterProspect,
  options: {
    allowPossibleDuplicate?: boolean;
  } = {},
): Promise<SaveProspectResult> {
  const prospect = validateProspect(prospectInput);

  if (
    prospect.verification_status === "rejected"
  ) {
    throw new Error(
      `This prospect cannot be saved because it failed verification: ${prospect.rejection_reasons.join(
        " ",
      )}`,
    );
  }

  if (!prospect.primary_source_url) {
    throw new Error(
      "A verified public source URL is required before saving a prospect.",
    );
  }

  const duplicateMatches =
    await findCrmDuplicates(prospect);

  const strongestDuplicate =
    duplicateMatches.find((match) =>
      match.match_reasons.some(
        (reason) =>
          reason === "Same email address" ||
          reason === "Same phone number",
      ),
    ) ?? duplicateMatches[0] ?? null;

  if (
    strongestDuplicate &&
    !options.allowPossibleDuplicate
  ) {
    return {
      lead_id: strongestDuplicate.id,
      created: false,
      duplicate: true,
      duplicate_match: strongestDuplicate,
    };
  }

  const contactName =
    prospect.contact_name ??
    prospect.organisation_name;

  const crmStatus =
    prospect.classification === "active_opportunity" ||
    prospect.classification === "tender"
      ? "Qualified"
      : "New";

  const crmStage = crmStatus;

  const estimatedValue =
    prospect.estimated_value ?? 0;

  const { data, error } = await db
    .from("leads")
    .insert({
      full_name: contactName,
      name: contactName,

      company: prospect.organisation_name,

      phone: prospect.public_phone,
      email: prospect.public_email,

      service: prospect.recommended_service,

      location: [
        prospect.suburb,
        prospect.city,
        prospect.province,
        prospect.country,
      ]
        .filter(Boolean)
        .join(", "),

      source: "cossa_verified_lead_hunter",

      status: crmStatus,
      stage: crmStage,

      notes: formatProspectEvidence(prospect),

      score: prospect.total_score,

      value: estimatedValue,
      estimated_value: estimatedValue,

      next_follow_up: new Date()
        .toISOString()
        .slice(0, 10),

      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Unable to save the verified prospect to CRM: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error(
      "The prospect was not saved because Supabase returned no lead ID.",
    );
  }

  return {
    lead_id: String(data.id),
    created: true,
    duplicate: false,
    duplicate_match: null,
  };
}

export async function saveProspectsToCrm(
  prospects: LeadHunterProspect[],
): Promise<{
  created: SaveProspectResult[];
  duplicates: SaveProspectResult[];
  failed: Array<{
    prospect: LeadHunterProspect;
    error: string;
  }>;
}> {
  const created: SaveProspectResult[] = [];
  const duplicates: SaveProspectResult[] = [];
  const failed: Array<{
    prospect: LeadHunterProspect;
    error: string;
  }> = [];

  for (const prospect of prospects) {
    try {
      const result =
        await saveProspectToCrm(prospect);

      if (result.duplicate) {
        duplicates.push(result);
      } else {
        created.push(result);
      }
    } catch (error) {
      failed.push({
        prospect,
        error:
          error instanceof Error
            ? error.message
            : "Unknown CRM save error.",
      });
    }
  }

  return {
    created,
    duplicates,
    failed,
  };
}

export function exportProspectsToCsv(
  prospects: LeadHunterProspect[],
): string {
  const headers = [
    "Organisation",
    "Sector",
    "Industry",
    "Website",
    "Public Phone",
    "Public Email",
    "City",
    "Province",
    "Recommended Company",
    "Recommended Service",
    "Opportunity",
    "Classification",
    "Verification",
    "Score",
    "Primary Source",
    "Date Verified",
    "Next Action",
  ];

  const escapeCsv = (value: unknown) => {
    const string = String(value ?? "");

    return `"${string.replace(/"/g, '""')}"`;
  };

  const rows = prospects.map((prospect) => [
    prospect.organisation_name,
    prospect.sector,
    prospect.industry,
    prospect.website,
    prospect.public_phone,
    prospect.public_email,
    prospect.city,
    prospect.province,
    prospect.recommended_company,
    prospect.recommended_service,
    prospect.opportunity_summary,
    prospect.classification,
    prospect.verification_status,
    prospect.total_score,
    prospect.primary_source_url,
    prospect.date_verified,
    prospect.next_action,
  ]);

  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      row.map(escapeCsv).join(","),
    ),
  ].join("\n");
}