// Production Cossa Lead Hunter data, intelligence and verification layer.
//
// This file is intentionally CLIENT-SIDE.
//
// Responsibilities:
// - Define Cossa-wide revenue hunting strategies.
// - Support Construction, Facility Services, Tech, Growth, NexDocs,
//   Cossa Store and Cossa Nexus Holdings.
// - Support private, government, nonprofit and mixed-sector hunting.
// - Support customers, projects, tenders, RFQs, RFPs, supplier registrations,
//   subcontracting, recurring contracts, product-supply opportunities,
//   digital weaknesses and document/compliance opportunities.
// - Support guided strategies and natural-language missions.
// - Separate physical, remote and hybrid opportunities.
// - Support local, provincial, South African, African and worldwide searches.
// - Send validated missions to the authenticated production search endpoint.
// - Validate server-returned prospects before displaying or saving them.
// - Reject missing, malformed, stale, expired or unsupported opportunities.
// - Preserve server-normalised requests and server scoring where supplied.
// - Detect possible CRM duplicates.
// - Save approved prospects into public.leads.
// - Produce safe CSV exports.
//
// IMPORTANT SECURITY RULES:
//
// This browser file MUST NEVER contain:
// - SERPAPI_API_KEY
// - TAVILY_API_KEY
// - NEWS_API_KEY
// - GROQ_API_KEY
// - service-role Supabase keys
// - government portal credentials
// - scraping credentials
//
// Real research belongs server-side:
//
// POST /api/lead-hunter/search
//
// Suggested protected provider chain:
//
// 1. SerpAPI
// 2. Tavily
// 3. NewsAPI
// 4. Official/public-source direct enrichment
// 5. GROQ only for interpretation, extraction, ranking and reconciliation
//
// GROQ/LLMs must NEVER invent organisations, contacts, tenders,
// dates, prices, procurement references or opportunity evidence.
//
// Every accepted record must trace back to public evidence.

import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/* DATABASE                                                                   */
/* -------------------------------------------------------------------------- */

const db = supabase as unknown as {
  from: (table: string) => any;
};

/* -------------------------------------------------------------------------- */
/* ENDPOINTS / LIMITS                                                         */
/* -------------------------------------------------------------------------- */

export const LEAD_HUNTER_SEARCH_ENDPOINT =
  "/api/lead-hunter/search";

export const MAX_HUNT_RESULTS = 50;
export const DEFAULT_HUNT_RESULTS = 15;

export const MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH = 2_500;

export const DEFAULT_MAX_SEARCH_QUERIES = 5;
export const MAX_ALLOWED_SEARCH_QUERIES = 10;

export const DEFAULT_SEARCH_CACHE_HOURS = 24;

export const MAX_PROSPECT_EVIDENCE_ITEMS = 15;
export const MAX_PROSPECT_SIGNALS = 15;

export const DEFAULT_MINIMUM_SCORE = 55;
export const DEFAULT_MINIMUM_EVIDENCE_SOURCES = 1;

export const MAX_CRM_DUPLICATE_SCAN = 1_000;

/* -------------------------------------------------------------------------- */
/* CORE TYPES                                                                 */
/* -------------------------------------------------------------------------- */

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
  // Cossa Nexus Construction
  | "construction"
  | "renovation"
  | "property_maintenance"
  | "painting"
  | "tiling"
  | "ceilings"
  | "roofing"
  | "plumbing"
  | "carpentry"
  | "waterproofing"
  | "shopfitting"
  | "minor_building_works"

  // Cossa Facility Services
  | "facility_management"
  | "commercial_cleaning"
  | "deep_cleaning"
  | "hygiene"
  | "landscaping"
  | "waste_management"
  | "grounds_maintenance"
  | "office_cleaning"
  | "post_construction_cleaning"

  // Cossa Tech
  | "website_design"
  | "website_development"
  | "ecommerce"
  | "logo_design"
  | "branding"
  | "seo"
  | "google_business_profile"
  | "crm"
  | "ai_automation"
  | "business_automation"
  | "software_development"
  | "technology_support"

  // Growth
  | "digital_marketing"
  | "social_media_management"
  | "lead_generation"
  | "marketing_strategy"
  | "sales_enablement"
  | "conversion_optimisation"
  | "customer_follow_up"

  // NexDocs
  | "business_documents"
  | "quotations"
  | "proposals"
  | "contracts"
  | "company_profiles"
  | "tender_documents"
  | "supplier_documents"
  | "compliance_documents"

  // Cossa Store
  | "building_material_supply"
  | "hardware_supply"
  | "cleaning_supply"
  | "office_supply"
  | "technology_supply"
  | "general_product_supply"
  | "procurement_supply"
  | "retail_ecommerce"

  | "general";

export type LeadHunterSearchScope =
  | "local"
  | "city"
  | "province"
  | "south_africa"
  | "africa"
  | "worldwide"
  | "custom"
  | "unrestricted";

export type LeadHunterDeliveryModel =
  | "auto"
  | "physical"
  | "remote"
  | "hybrid";

export type LeadHunterSearchDepth =
  | "economy"
  | "standard"
  | "deep";

export type LeadHunterRevenueMode =
  | "balanced"
  | "quick_revenue"
  | "easy_wins"
  | "recurring_revenue"
  | "high_value"
  | "strategic";

export type LeadHunterObjective =
  | "find_customers"
  | "find_projects"
  | "find_active_tenders"
  | "find_rfqs"
  | "find_rfps"
  | "find_supplier_registrations"
  | "find_subcontracting"
  | "find_partners"
  | "find_weak_websites"
  | "find_branding_gaps"
  | "find_marketing_gaps"
  | "find_technology_gaps"
  | "find_maintenance_needs"
  | "find_cleaning_contracts"
  | "find_recurring_contracts"
  | "find_document_opportunities"
  | "find_product_supply_opportunities"
  | "find_ecommerce_opportunities"
  | "find_immediate_cashflow"
  | "search_everything_relevant";

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
  | "rfq"
  | "rfp"
  | "supplier_opportunity"
  | "subcontracting_opportunity"
  | "product_supply_opportunity"
  | "partnership"
  | "referral_source"
  | "historical_signal"
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
  | "rfq_notice"
  | "rfp_notice"
  | "supplier_database"
  | "company_directory"
  | "business_profile"
  | "job_posting"
  | "news_report"
  | "social_profile"
  | "contact_page"
  | "website_audit"
  | "public_document"
  | "public_pdf"
  | "other_public_source";

export type ProspectSignalType =
  | "active_tender"
  | "request_for_quote"
  | "request_for_proposal"
  | "supplier_registration"
  | "subcontracting"
  | "product_supply_need"
  | "new_development"
  | "renovation_need"
  | "maintenance_need"
  | "cleaning_need"
  | "website_problem"
  | "missing_website"
  | "mobile_website_problem"
  | "branding_problem"
  | "missing_logo"
  | "seo_gap"
  | "inactive_marketing"
  | "missing_whatsapp"
  | "missing_contact_form"
  | "weak_google_profile"
  | "hiring_signal"
  | "new_branch"
  | "business_expansion"
  | "poor_customer_experience"
  | "document_need"
  | "technology_need"
  | "ecommerce_need"
  | "procurement_need"
  | "general_fit";

export type ProspectSalesPriority =
  | "hot"
  | "warm"
  | "cold"
  | "research";

export type HuntStatus =
  | "idle"
  | "searching"
  | "completed"
  | "failed";

export type ProcurementStatus =
  | "not_applicable"
  | "unknown"
  | "open"
  | "closing_soon"
  | "closed"
  | "expired"
  | "awarded";

export type PursuitRisk =
  | "low"
  | "medium"
  | "high"
  | "unknown";

/* -------------------------------------------------------------------------- */
/* PROVIDER / SOURCE TYPES                                                    */
/* -------------------------------------------------------------------------- */

export type LeadHunterProvider =
  | "serpapi"
  | "tavily"
  | "newsapi"
  | "official_source"
  | "government_source"
  | "direct_fetch"
  | "groq"
  | "other";

export interface LeadHunterProviderTrace {
  provider: LeadHunterProvider;
  query: string | null;
  result_count: number;
  used_for:
    | "discovery"
    | "verification"
    | "enrichment"
    | "interpretation"
    | "ranking";
  completed_at: string | null;
}

/* -------------------------------------------------------------------------- */
/* EVIDENCE                                                                   */
/* -------------------------------------------------------------------------- */

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

  source_quality_score?: number;
  freshness_score?: number;

  is_primary_source?: boolean;
  is_official_source?: boolean;

  provider?: LeadHunterProvider | null;
}

/* -------------------------------------------------------------------------- */
/* SIGNALS                                                                    */
/* -------------------------------------------------------------------------- */

export interface ProspectSignal {
  type: ProspectSignalType;

  title: string;
  explanation: string;

  evidence_url: string;

  detected_at: string;

  confidence: number;
}

/* -------------------------------------------------------------------------- */
/* PROSPECT                                                                   */
/* -------------------------------------------------------------------------- */

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

  identity_keys?: string[];

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

  tender_reference?: string | null;

  procurement_status?: ProcurementStatus;

  opportunity_open_date?: string | null;
  opportunity_closing_date?: string | null;

  classification: ProspectClassification;

  verification_status: ProspectVerificationStatus;

  fit_score: number;
  intent_score: number;
  evidence_score: number;
  timing_score: number;
  contactability_score: number;

  total_score: number;

  revenue_potential_score: number;
  ease_to_close_score: number;
  recurring_revenue_score: number;
  geographic_fit_score: number;

  data_quality_score?: number;
  freshness_score?: number;
  source_diversity_score?: number;
  verification_confidence?: number;

  pursuit_risk?: PursuitRisk;

  sales_priority: ProspectSalesPriority;

  why_contact: string[];

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

/* -------------------------------------------------------------------------- */
/* SEARCH REQUEST                                                             */
/* -------------------------------------------------------------------------- */

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

  search_instruction?: string | null;

  search_scope?: LeadHunterSearchScope;

  delivery_model?: LeadHunterDeliveryModel;

  search_depth?: LeadHunterSearchDepth;

  revenue_mode?: LeadHunterRevenueMode;

  objectives?: LeadHunterObjective[];

  countries?: string[];
  provinces?: string[];
  cities?: string[];
  suburbs?: string[];

  radius_km?: number | null;

  search_everything?: boolean;

  easy_wins_only?: boolean;

  revenue_first?: boolean;

  max_search_queries?: number;

  use_cached_results?: boolean;

  cache_max_age_hours?: number;

  exclude_competitors?: boolean;
  exclude_directories?: boolean;
  exclude_expired_procurement?: boolean;

  require_primary_source_for_procurement?: boolean;

  reject_stale_opportunities?: boolean;

  minimum_contactability_score?: number;

  diversify_results_by_company?: boolean;

  diversify_results_by_sector?: boolean;
}

/* -------------------------------------------------------------------------- */
/* SEARCH RESPONSE                                                            */
/* -------------------------------------------------------------------------- */

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

  provider_trace?: LeadHunterProviderTrace[];
}

/* -------------------------------------------------------------------------- */
/* CRM TYPES                                                                  */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* STRATEGIES                                                                 */
/* -------------------------------------------------------------------------- */

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

  search_instruction?: string;

  search_scope?: LeadHunterSearchScope;

  delivery_model?: LeadHunterDeliveryModel;

  revenue_mode?: LeadHunterRevenueMode;

  objectives?: LeadHunterObjective[];
}

/* -------------------------------------------------------------------------- */
/* GEOGRAPHY                                                                  */
/* -------------------------------------------------------------------------- */

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

export const SOUTH_AFRICAN_COUNTRIES = [
  "South Africa",
] as const;

export const PRIORITY_AFRICAN_MARKETS = [
  "South Africa",
  "Botswana",
  "Namibia",
  "Zimbabwe",
  "Zambia",
  "Mozambique",
  "Kenya",
  "Ghana",
  "Nigeria",
] as const;

/* -------------------------------------------------------------------------- */
/* SERVICE GROUPS                                                             */
/* -------------------------------------------------------------------------- */

export const CONSTRUCTION_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "construction",
  "renovation",
  "property_maintenance",
  "painting",
  "tiling",
  "ceilings",
  "roofing",
  "plumbing",
  "carpentry",
  "waterproofing",
  "shopfitting",
  "minor_building_works",
];

export const FACILITY_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "facility_management",
  "commercial_cleaning",
  "deep_cleaning",
  "hygiene",
  "landscaping",
  "waste_management",
  "grounds_maintenance",
  "office_cleaning",
  "post_construction_cleaning",
];

export const TECH_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "website_design",
  "website_development",
  "ecommerce",
  "logo_design",
  "branding",
  "seo",
  "google_business_profile",
  "crm",
  "ai_automation",
  "business_automation",
  "software_development",
  "technology_support",
];

export const GROWTH_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "digital_marketing",
  "social_media_management",
  "lead_generation",
  "marketing_strategy",
  "sales_enablement",
  "conversion_optimisation",
  "customer_follow_up",
  "seo",
  "google_business_profile",
  "crm",
];

export const NEXDOCS_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "business_documents",
  "quotations",
  "proposals",
  "contracts",
  "company_profiles",
  "tender_documents",
  "supplier_documents",
  "compliance_documents",
];

export const STORE_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  "building_material_supply",
  "hardware_supply",
  "cleaning_supply",
  "office_supply",
  "technology_supply",
  "general_product_supply",
  "procurement_supply",
  "retail_ecommerce",
];

export const PHYSICAL_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  ...CONSTRUCTION_SERVICE_CATEGORIES,
  ...FACILITY_SERVICE_CATEGORIES,

  "building_material_supply",
  "hardware_supply",
  "cleaning_supply",
  "office_supply",
  "technology_supply",
  "general_product_supply",
  "procurement_supply",
];

export const REMOTE_SERVICE_CATEGORIES: LeadHunterServiceCategory[] = [
  ...TECH_SERVICE_CATEGORIES,
  ...GROWTH_SERVICE_CATEGORIES,
  ...NEXDOCS_SERVICE_CATEGORIES,

  "retail_ecommerce",
];

/* -------------------------------------------------------------------------- */
/* COMPANY / SERVICE MATRIX                                                   */
/* -------------------------------------------------------------------------- */

export const COMPANY_SERVICE_MAP: Record<
  LeadHunterCompany,
  LeadHunterServiceCategory[]
> = {
  cossa_nexus_construction:
    CONSTRUCTION_SERVICE_CATEGORIES,

  cossa_facility_services:
    FACILITY_SERVICE_CATEGORIES,

  cossa_tech:
    TECH_SERVICE_CATEGORIES,

  cossa_ai_growth:
    GROWTH_SERVICE_CATEGORIES,

  nexdocs:
    NEXDOCS_SERVICE_CATEGORIES,

  cossa_store:
    STORE_SERVICE_CATEGORIES,

  cossa_nexus_holdings: [
    ...CONSTRUCTION_SERVICE_CATEGORIES,
    ...FACILITY_SERVICE_CATEGORIES,
    ...TECH_SERVICE_CATEGORIES,
    ...GROWTH_SERVICE_CATEGORIES,
    ...NEXDOCS_SERVICE_CATEGORIES,
    ...STORE_SERVICE_CATEGORIES,
    "general",
  ],
};

/* -------------------------------------------------------------------------- */
/* SEARCH OPTIONS                                                             */
/* -------------------------------------------------------------------------- */

export const SEARCH_SCOPE_OPTIONS: Array<{
  value: LeadHunterSearchScope;
  label: string;
  description: string;
}> = [
  {
    value: "local",
    label: "Local area",
    description:
      "Search nearby organisations and opportunities inside a defined service radius.",
  },
  {
    value: "city",
    label: "Selected cities",
    description:
      "Search selected cities and surrounding business areas.",
  },
  {
    value: "province",
    label: "Selected provinces",
    description:
      "Search one or more South African provinces.",
  },
  {
    value: "south_africa",
    label: "South Africa",
    description:
      "Search nationally across South Africa.",
  },
  {
    value: "africa",
    label: "Africa",
    description:
      "Search selected African markets, especially for remote and supply opportunities.",
  },
  {
    value: "worldwide",
    label: "Worldwide",
    description:
      "Search international markets for remotely deliverable services.",
  },
  {
    value: "custom",
    label: "Custom locations",
    description:
      "Use exact countries, provinces, cities and suburbs.",
  },
  {
    value: "unrestricted",
    label: "No geographic restriction",
    description:
      "Let opportunity quality and delivery feasibility determine the market.",
  },
];

export const DELIVERY_MODEL_OPTIONS: Array<{
  value: LeadHunterDeliveryModel;
  label: string;
}> = [
  {
    value: "auto",
    label: "Auto-detect",
  },
  {
    value: "physical",
    label: "Physical services",
  },
  {
    value: "remote",
    label: "Remote services",
  },
  {
    value: "hybrid",
    label: "Physical and remote",
  },
];

export const SEARCH_DEPTH_OPTIONS: Array<{
  value: LeadHunterSearchDepth;
  label: string;
  description: string;
  maximumQueries: number;
}> = [
  {
    value: "economy",
    label: "Economy",
    description:
      "Low provider usage for frequent searches and quick prospect discovery.",
    maximumQueries: 3,
  },
  {
    value: "standard",
    label: "Standard",
    description:
      "Balanced discovery, enrichment and verification.",
    maximumQueries: 5,
  },
  {
    value: "deep",
    label: "Deep",
    description:
      "Broad investigation for valuable, strategic or difficult opportunities.",
    maximumQueries: 8,
  },
];

export const REVENUE_MODE_OPTIONS: Array<{
  value: LeadHunterRevenueMode;
  label: string;
  description: string;
}> = [
  {
    value: "quick_revenue",
    label: "Quick revenue",
    description:
      "Prioritise reachable customers and smaller opportunities that could close faster.",
  },
  {
    value: "easy_wins",
    label: "Easy wins",
    description:
      "Prioritise obvious problems, strong contact routes and low pursuit effort.",
  },
  {
    value: "recurring_revenue",
    label: "Recurring revenue",
    description:
      "Prioritise maintenance, cleaning, marketing, CRM and support retainers.",
  },
  {
    value: "high_value",
    label: "High-value work",
    description:
      "Prioritise commercially larger opportunities.",
  },
  {
    value: "strategic",
    label: "Strategic",
    description:
      "Prioritise frameworks, supplier databases, procurement relationships and long-term accounts.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Balance revenue, evidence, timing, contactability and strategic value.",
  },
];

/* -------------------------------------------------------------------------- */
/* STRATEGY LIBRARY                                                           */
/* -------------------------------------------------------------------------- */

export const LEAD_HUNTER_STRATEGIES: LeadHunterStrategy[] = [
  {
    id: "first-paying-customers",

    title:
      "Find Our First Paying Customers",

    description:
      "Prioritise legitimate, reachable organisations with a practical service gap and enough public evidence for respectful outreach.",

    target_sector:
      "mixed",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "cossa_ai_growth",
      "nexdocs",
      "cossa_store",
      "cossa_nexus_holdings",
    ],

    services: [
      "property_maintenance",
      "painting",
      "commercial_cleaning",
      "deep_cleaning",
      "website_design",
      "logo_design",
      "branding",
      "seo",
      "digital_marketing",
      "business_documents",
      "building_material_supply",
      "cleaning_supply",
      "office_supply",
    ],

    organisation_types: [
      "Small business",
      "Property manager",
      "School",
      "Church",
      "Office",
      "Retail store",
      "Professional-services firm",
      "Hospitality business",
    ],

    industries: [
      "Property",
      "Education",
      "Retail",
      "Professional services",
      "Hospitality",
      "Local services",
    ],

    keywords: [
      "request a quote",
      "maintenance required",
      "website redesign",
      "outdated website",
      "commercial cleaning",
      "painting contractor",
      "logo redesign",
      "supplier required",
      "weak online presence",
    ],

    opportunity_signals: [
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "branding_problem",
      "seo_gap",
      "inactive_marketing",
      "product_supply_need",
    ],

    recommended_locations: [
      "Pretoria",
      "Centurion",
      "Midrand",
      "Johannesburg",
      "Gauteng",
      "South Africa",
    ],

    minimum_score:
      55,

    default_result_count:
      15,

    search_instruction:
      "Find legitimate and reachable organisations with publicly evidenced needs that Cossa can realistically convert into paying work. Prioritise verified contactability, immediate commercial need, low pursuit effort, clear service fit and practical next actions. Never invent demand.",

    search_scope:
      "south_africa",

    delivery_model:
      "auto",

    revenue_mode:
      "quick_revenue",

    objectives: [
      "find_customers",
      "find_immediate_cashflow",
    ],
  },

  {
    id: "construction-projects",

    title:
      "Construction and Renovation Opportunities",

    description:
      "Find verified construction, renovation, refurbishment, repair and building-maintenance opportunities.",

    target_sector:
      "mixed",

    companies: [
      "cossa_nexus_construction",
    ],

    services: [
      "construction",
      "renovation",
      "property_maintenance",
      "painting",
      "tiling",
      "ceilings",
      "roofing",
      "plumbing",
      "carpentry",
      "waterproofing",
      "minor_building_works",
    ],

    organisation_types: [
      "Property manager",
      "Commercial property owner",
      "School",
      "Church",
      "Retailer",
      "Municipality",
      "Government department",
      "Estate manager",
    ],

    industries: [
      "Property",
      "Construction",
      "Education",
      "Retail",
      "Government",
      "Hospitality",
    ],

    keywords: [
      "construction tender",
      "renovation tender",
      "refurbishment",
      "minor building works",
      "repair contractor",
      "painting quotation",
      "roof repair",
      "tiling quotation",
      "building maintenance",
    ],

    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
      "renovation_need",
      "maintenance_need",
      "new_development",
    ],

    recommended_locations: [
      "Gauteng",
      "South Africa",
    ],

    minimum_score:
      60,

    default_result_count:
      20,

    search_scope:
      "south_africa",

    delivery_model:
      "physical",

    revenue_mode:
      "balanced",

    objectives: [
      "find_customers",
      "find_projects",
      "find_active_tenders",
      "find_rfqs",
    ],
  },

  {
    id: "facility-contracts",

    title:
      "Facility Services and Cleaning Contracts",

    description:
      "Find verified recurring cleaning, facility, hygiene, grounds and property-support contracts.",

    target_sector:
      "mixed",

    companies: [
      "cossa_facility_services",
    ],

    services: [
      "facility_management",
      "commercial_cleaning",
      "deep_cleaning",
      "office_cleaning",
      "post_construction_cleaning",
      "hygiene",
      "landscaping",
      "grounds_maintenance",
      "waste_management",
    ],

    organisation_types: [
      "Office",
      "Shopping centre",
      "School",
      "College",
      "Property manager",
      "Warehouse",
      "Factory",
      "Hospitality business",
      "Government facility",
    ],

    industries: [
      "Property",
      "Education",
      "Retail",
      "Logistics",
      "Manufacturing",
      "Government",
      "Hospitality",
    ],

    keywords: [
      "cleaning tender",
      "cleaning contract",
      "facility management",
      "office cleaning",
      "grounds maintenance",
      "hygiene services",
      "landscaping tender",
      "property maintenance",
    ],

    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "supplier_registration",
    ],

    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
      "South Africa",
    ],

    minimum_score:
      60,

    default_result_count:
      20,

    search_scope:
      "south_africa",

    delivery_model:
      "physical",

    revenue_mode:
      "recurring_revenue",

    objectives: [
      "find_customers",
      "find_cleaning_contracts",
      "find_maintenance_needs",
      "find_recurring_contracts",
    ],
  },

  {
    id: "property-managers-gauteng",

    title:
      "Property Managers and Managing Agents",

    description:
      "Find property-management firms, sectional-title managers and estate managers that may procure maintenance, renovations, cleaning or facility support.",

    target_sector:
      "private",

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

    minimum_score:
      60,

    default_result_count:
      20,

    search_scope:
      "province",

    delivery_model:
      "physical",

    revenue_mode:
      "recurring_revenue",

    objectives: [
      "find_customers",
      "find_maintenance_needs",
      "find_cleaning_contracts",
      "find_recurring_contracts",
    ],
  },

  {
    id: "tech-digital-gaps",

    title:
      "Cossa Tech Digital Opportunity Hunter",

    description:
      "Find legitimate businesses with publicly verifiable technology, website, automation, CRM or ecommerce weaknesses.",

    target_sector:
      "private",

    companies: [
      "cossa_tech",
    ],

    services: [
      "website_design",
      "website_development",
      "ecommerce",
      "crm",
      "ai_automation",
      "business_automation",
      "software_development",
      "technology_support",
      "google_business_profile",
    ],

    organisation_types: [
      "Small business",
      "Professional-services firm",
      "Contractor",
      "Retailer",
      "Property company",
      "Restaurant",
      "Hospitality business",
    ],

    industries: [
      "Professional services",
      "Retail",
      "Property",
      "Hospitality",
      "Construction",
      "Local services",
    ],

    keywords: [
      "outdated website",
      "website not mobile friendly",
      "missing contact form",
      "missing online booking",
      "manual process",
      "no ecommerce",
      "no CRM",
      "poor customer follow up",
    ],

    opportunity_signals: [
      "website_problem",
      "missing_website",
      "mobile_website_problem",
      "missing_contact_form",
      "technology_need",
      "ecommerce_need",
      "poor_customer_experience",
    ],

    recommended_locations: [
      "South Africa",
    ],

    minimum_score:
      55,

    default_result_count:
      20,

    search_instruction:
      "Find real organisations with specific, public and verifiable website, ecommerce, CRM, automation or technology weaknesses. Evidence must identify the actual problem. Exclude technology companies, software agencies, web-design agencies and direct competitors unless the mission explicitly requests partners.",

    search_scope:
      "south_africa",

    delivery_model:
      "remote",

    revenue_mode:
      "easy_wins",

    objectives: [
      "find_customers",
      "find_weak_websites",
      "find_technology_gaps",
    ],
  },

  {
    id: "growth-marketing-gaps",

    title:
      "Growth Marketing Opportunity Hunter",

    description:
      "Find organisations with public evidence of weak lead generation, marketing, SEO, Google presence or customer conversion.",

    target_sector:
      "private",

    companies: [
      "cossa_ai_growth",
    ],

    services: [
      "digital_marketing",
      "social_media_management",
      "lead_generation",
      "marketing_strategy",
      "sales_enablement",
      "conversion_optimisation",
      "customer_follow_up",
      "seo",
      "google_business_profile",
      "crm",
    ],

    organisation_types: [
      "Small business",
      "Contractor",
      "Professional firm",
      "Retailer",
      "Restaurant",
      "Property business",
      "Hospitality business",
    ],

    industries: [
      "Local services",
      "Retail",
      "Hospitality",
      "Construction",
      "Professional services",
      "Property",
    ],

    keywords: [
      "weak online presence",
      "poor local SEO",
      "few Google reviews",
      "inactive social media",
      "missing Google Business Profile",
      "no enquiry form",
      "poor follow up",
    ],

    opportunity_signals: [
      "seo_gap",
      "inactive_marketing",
      "weak_google_profile",
      "missing_contact_form",
      "missing_whatsapp",
      "poor_customer_experience",
    ],

    recommended_locations: [
      "South Africa",
    ],

    minimum_score:
      55,

    default_result_count:
      20,

    search_scope:
      "south_africa",

    delivery_model:
      "remote",

    revenue_mode:
      "recurring_revenue",

    objectives: [
      "find_customers",
      "find_marketing_gaps",
      "find_recurring_contracts",
    ],
  },

  {
    id: "nexdocs-opportunities",

    title:
      "NexDocs Business Document Opportunities",

    description:
      "Find organisations that publicly show procurement, company-profile, proposal, tender-document, quotation or compliance-document requirements.",

    target_sector:
      "mixed",

    companies: [
      "nexdocs",
    ],

    services: [
      "business_documents",
      "quotations",
      "proposals",
      "contracts",
      "company_profiles",
      "tender_documents",
      "supplier_documents",
      "compliance_documents",
    ],

    organisation_types: [
      "Small business",
      "Startup",
      "Contractor",
      "Supplier",
      "Nonprofit organisation",
      "Professional-services firm",
    ],

    industries: [
      "Construction",
      "Professional services",
      "Retail",
      "Suppliers",
      "Small business",
      "Nonprofit",
    ],

    keywords: [
      "company profile required",
      "supplier documents",
      "quotation template",
      "proposal required",
      "tender documents",
      "compliance documents",
      "business profile",
    ],

    opportunity_signals: [
      "document_need",
      "supplier_registration",
      "request_for_quote",
      "request_for_proposal",
    ],

    recommended_locations: [
      "South Africa",
    ],

    minimum_score:
      50,

    default_result_count:
      15,

    search_scope:
      "south_africa",

    delivery_model:
      "remote",

    revenue_mode:
      "quick_revenue",

    objectives: [
      "find_customers",
      "find_document_opportunities",
      "find_immediate_cashflow",
    ],
  },

  {
    id: "cossa-store-procurement",

    title:
      "Cossa Store Product and Procurement Opportunities",

    description:
      "Find verified requests for products, materials, hardware, cleaning supplies, office supplies and technology products that Cossa Store may be able to source and supply.",

    target_sector:
      "mixed",

    companies: [
      "cossa_store",
    ],

    services: [
      "building_material_supply",
      "hardware_supply",
      "cleaning_supply",
      "office_supply",
      "technology_supply",
      "general_product_supply",
      "procurement_supply",
    ],

    organisation_types: [
      "School",
      "Municipality",
      "Government department",
      "Office",
      "Property manager",
      "Construction company",
      "Retail business",
      "Nonprofit organisation",
    ],

    industries: [
      "Government",
      "Education",
      "Property",
      "Construction",
      "Retail",
      "Professional services",
    ],

    keywords: [
      "supply and delivery",
      "request for quotation supply",
      "supply of materials",
      "supply of cleaning materials",
      "supply of stationery",
      "supply of hardware",
      "supply of ICT equipment",
      "supplier required",
    ],

    opportunity_signals: [
      "product_supply_need",
      "procurement_need",
      "request_for_quote",
      "active_tender",
      "supplier_registration",
    ],

    recommended_locations: [
      "Gauteng",
      "South Africa",
    ],

    minimum_score:
      60,

    default_result_count:
      20,

    search_instruction:
      "Find current, verifiable supply opportunities for products that Cossa Store could realistically source and deliver. Prioritise clear item descriptions, procurement references, delivery locations, valid closing dates and official buyer contact routes. Reject expired or unsupported procurement notices.",

    search_scope:
      "south_africa",

    delivery_model:
      "physical",

    revenue_mode:
      "balanced",

    objectives: [
      "find_product_supply_opportunities",
      "find_rfqs",
      "find_active_tenders",
      "find_supplier_registrations",
    ],
  },

  {
    id: "schools-and-training-centres",

    title:
      "Schools, Colleges and Training Centres",

    description:
      "Find public and private education facilities with maintenance, cleaning, construction, technology, document or supply needs.",

    target_sector:
      "mixed",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
      "cossa_store",
    ],

    services: [
      "property_maintenance",
      "painting",
      "roofing",
      "commercial_cleaning",
      "website_design",
      "business_documents",
      "building_material_supply",
      "cleaning_supply",
      "office_supply",
      "technology_supply",
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
      "school stationery supply",
      "school equipment supply",
    ],

    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "product_supply_need",
    ],

    recommended_locations: [
      "Gauteng",
      "Limpopo",
      "Mpumalanga",
      "North West",
    ],

    minimum_score:
      60,

    default_result_count:
      20,

    search_scope:
      "province",

    delivery_model:
      "hybrid",

    revenue_mode:
      "balanced",

    objectives: [
      "find_customers",
      "find_projects",
      "find_active_tenders",
      "find_rfqs",
      "find_product_supply_opportunities",
    ],
  },

  {
    id: "municipal-tenders",

    title:
      "Municipal Tenders, RFQs and Supplier Opportunities",

    description:
      "Find current official municipal tenders, quotations, supplier invitations and procurement notices matching Cossa services.",

    target_sector:
      "government",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
      "cossa_store",
    ],

    services: [
      "construction",
      "renovation",
      "property_maintenance",
      "commercial_cleaning",
      "facility_management",
      "website_design",
      "technology_support",
      "business_documents",
      "building_material_supply",
      "cleaning_supply",
      "office_supply",
      "technology_supply",
      "general_product_supply",
      "procurement_supply",
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
      "request for proposal",
      "supplier database",
      "maintenance services",
      "cleaning services",
      "renovation",
      "ICT services",
      "supply and delivery",
    ],

    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
      "supplier_registration",
      "product_supply_need",
    ],

    recommended_locations: [
      ...SOUTH_AFRICAN_PROVINCES,
    ],

    minimum_score:
      70,

    default_result_count:
      20,

    search_scope:
      "south_africa",

    delivery_model:
      "hybrid",

    revenue_mode:
      "balanced",

    objectives: [
      "find_active_tenders",
      "find_rfqs",
      "find_rfps",
      "find_supplier_registrations",
      "find_product_supply_opportunities",
    ],
  },

  {
    id: "provincial-and-national-procurement",

    title:
      "Provincial and National Government Procurement",

    description:
      "Find current verified procurement opportunities from departments, public entities, hospitals, schools, agencies and state organisations.",

    target_sector:
      "government",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "nexdocs",
      "cossa_store",
    ],

    services: [
      "construction",
      "renovation",
      "property_maintenance",
      "commercial_cleaning",
      "facility_management",
      "website_design",
      "technology_support",
      "ai_automation",
      "business_documents",
      "building_material_supply",
      "cleaning_supply",
      "office_supply",
      "technology_supply",
      "procurement_supply",
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
      "supply and delivery",
    ],

    opportunity_signals: [
      "active_tender",
      "request_for_quote",
      "request_for_proposal",
      "supplier_registration",
      "product_supply_need",
    ],

    recommended_locations: [
      ...SOUTH_AFRICAN_PROVINCES,
    ],

    minimum_score:
      72,

    default_result_count:
      20,

    search_scope:
      "south_africa",

    delivery_model:
      "hybrid",

    revenue_mode:
      "strategic",

    objectives: [
      "find_active_tenders",
      "find_rfqs",
      "find_rfps",
      "find_supplier_registrations",
      "find_product_supply_opportunities",
    ],
  },

  {
    id: "small-projects-now",

    title:
      "Small Projects and Fast Revenue",

    description:
      "Find smaller, faster-to-close requests and service needs that could generate early cash flow.",

    target_sector:
      "mixed",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
      "cossa_ai_growth",
      "nexdocs",
      "cossa_store",
    ],

    services: [
      "painting",
      "tiling",
      "ceilings",
      "property_maintenance",
      "deep_cleaning",
      "website_design",
      "logo_design",
      "branding",
      "seo",
      "business_documents",
      "building_material_supply",
      "cleaning_supply",
      "office_supply",
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
      "logo redesign",
      "request for quotation",
      "urgent maintenance",
      "supply quotation",
    ],

    opportunity_signals: [
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "branding_problem",
      "document_need",
      "product_supply_need",
    ],

    recommended_locations: [
      "Pretoria",
      "Centurion",
      "Midrand",
      "Johannesburg",
      "Gauteng",
      "South Africa",
    ],

    minimum_score:
      55,

    default_result_count:
      15,

    search_scope:
      "south_africa",

    delivery_model:
      "auto",

    revenue_mode:
      "quick_revenue",

    objectives: [
      "find_customers",
      "find_projects",
      "find_immediate_cashflow",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* DEFAULT REQUEST                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_LEAD_HUNTER_REQUEST: LeadHunterSearchRequest = {
  sector:
    "mixed",

  companies: [
    "cossa_nexus_construction",
    "cossa_facility_services",
    "cossa_tech",
    "cossa_ai_growth",
    "nexdocs",
    "cossa_store",
    "cossa_nexus_holdings",
  ],

  services: [
    "property_maintenance",
    "painting",
    "commercial_cleaning",
    "deep_cleaning",
    "website_design",
    "logo_design",
    "branding",
    "seo",
    "digital_marketing",
    "lead_generation",
    "ai_automation",
    "business_documents",
    "building_material_supply",
    "cleaning_supply",
    "office_supply",
    "technology_supply",
  ],

  locations: [
    "Pretoria",
    "Centurion",
    "Midrand",
    "Johannesburg",
    "Gauteng",
    "South Africa",
  ],

  industries:
    [],

  organisation_types:
    [],

  result_count:
    DEFAULT_HUNT_RESULTS,

  minimum_score:
    DEFAULT_MINIMUM_SCORE,

  minimum_evidence_sources:
    DEFAULT_MINIMUM_EVIDENCE_SOURCES,

  include_small_projects:
    true,

  include_large_projects:
    true,

  include_private_sector:
    true,

  include_government_sector:
    true,

  include_nonprofits:
    true,

  require_public_phone_or_email:
    true,

  require_website:
    false,

  require_opportunity_signal:
    true,

  tender_keywords: [
    "tender",
    "RFQ",
    "RFP",
    "request for quotation",
    "request for proposal",
    "supplier registration",
    "supply and delivery",
  ],

  prospect_keywords: [
    "maintenance",
    "renovation",
    "cleaning",
    "facility management",
    "website redesign",
    "outdated website",
    "logo redesign",
    "branding",
    "SEO",
    "marketing",
    "lead generation",
    "business documents",
    "supplier",
    "supply and delivery",
    "procurement",
  ],

  verified_sources_only:
    true,

  exclude_existing_crm_leads:
    true,

  notes:
    null,

  search_instruction:
    "Find verified, contactable organisations with a genuine publicly supported service, project, procurement or commercial opportunity that Cossa can realistically pursue. Prioritise evidence quality, revenue potential, contactability, timing and practical next actions. Never invent buying intent.",

  search_scope:
    "south_africa",

  delivery_model:
    "auto",

  search_depth:
    "economy",

  revenue_mode:
    "quick_revenue",

  objectives: [
    "find_customers",
    "find_immediate_cashflow",
  ],

  countries: [
    "South Africa",
  ],

  provinces: [
    "Gauteng",
  ],

  cities: [
    "Pretoria",
    "Centurion",
    "Midrand",
    "Johannesburg",
  ],

  suburbs:
    [],

  radius_km:
    null,

  search_everything:
    false,

  easy_wins_only:
    true,

  revenue_first:
    true,

  max_search_queries:
    3,

  use_cached_results:
    true,

  cache_max_age_hours:
    DEFAULT_SEARCH_CACHE_HOURS,

  exclude_competitors:
    true,

  exclude_directories:
    true,

  exclude_expired_procurement:
    true,

  require_primary_source_for_procurement:
    true,

  reject_stale_opportunities:
    true,

  minimum_contactability_score:
    0,

  diversify_results_by_company:
    true,

  diversify_results_by_sector:
    true,
};

/* -------------------------------------------------------------------------- */
/* VALUE SETS                                                                 */
/* -------------------------------------------------------------------------- */

const VALID_SECTORS =
  new Set<LeadHunterSector>([
    "private",
    "government",
    "nonprofit",
    "mixed",
  ]);

const VALID_COMPANIES =
  new Set<LeadHunterCompany>([
    "cossa_nexus_construction",
    "cossa_facility_services",
    "cossa_tech",
    "cossa_ai_growth",
    "nexdocs",
    "cossa_store",
    "cossa_nexus_holdings",
  ]);

const VALID_VERIFICATION_STATUSES =
  new Set<ProspectVerificationStatus>([
    "unverified",
    "partially_verified",
    "verified",
    "rejected",
  ]);

const VALID_PROCUREMENT_STATUSES =
  new Set<ProcurementStatus>([
    "not_applicable",
    "unknown",
    "open",
    "closing_soon",
    "closed",
    "expired",
    "awarded",
  ]);

/* -------------------------------------------------------------------------- */
/* TEXT HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function cleanText(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    value
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  return cleaned ||
    null;
}

function cleanLongText(
  value: unknown,
  maximumLength: number,
): string | null {
  const text =
    cleanText(
      value,
    );

  if (!text) {
    return null;
  }

  return text.slice(
    0,
    maximumLength,
  );
}

function lowerText(
  value: unknown,
): string {
  return (
    cleanText(
      value,
    )?.toLowerCase() ??
    ""
  );
}

function uniqueTexts(
  values: unknown,
  maximumItems = 50,
): string[] {
  if (
    !Array.isArray(
      values,
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      values
        .map(
          cleanText,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(
              value,
            ),
        ),
    ),
  ].slice(
    0,
    maximumItems,
  );
}

/* -------------------------------------------------------------------------- */
/* NUMBER HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function safeNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(
      value,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}

function clampScore(
  value: unknown,
): number {
  const score =
    safeNumber(
      value,
    );

  if (
    score === null
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        score,
      ),
    ),
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

/* -------------------------------------------------------------------------- */
/* DATE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function normaliseDate(
  value: unknown,
): string | null {
  const text =
    cleanText(
      value,
    );

  if (!text) {
    return null;
  }

  const date =
    new Date(
      text,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function opportunityHasExpired(
  closingDate: string | null,
): boolean {
  if (!closingDate) {
    return false;
  }

  const parsed =
    new Date(
      closingDate,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return false;
  }

  return (
    parsed.getTime() <
    Date.now()
  );
}

function calculateFreshnessScore(
  dateValue: string | null,
): number {
  if (!dateValue) {
    return 50;
  }

  const parsed =
    new Date(
      dateValue,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return 40;
  }

  const ageMilliseconds =
    Math.max(
      0,
      Date.now() -
        parsed.getTime(),
    );

  const ageDays =
    ageMilliseconds /
    86_400_000;

  if (
    ageDays <= 1
  ) {
    return 100;
  }

  if (
    ageDays <= 7
  ) {
    return 95;
  }

  if (
    ageDays <= 30
  ) {
    return 85;
  }

  if (
    ageDays <= 90
  ) {
    return 70;
  }

  if (
    ageDays <= 180
  ) {
    return 55;
  }

  if (
    ageDays <= 365
  ) {
    return 35;
  }

  return 15;
}

/* -------------------------------------------------------------------------- */
/* CONTACT HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function normaliseEmail(
  value: unknown,
): string | null {
  const email =
    lowerText(
      value,
    );

  if (!email) {
    return null;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return null;
  }

  const obviousFakePatterns =
    [
      "example.com",
      "test.com",
      "email.com",
      "yourdomain.com",
    ];

  if (
    obviousFakePatterns.some(
      (pattern) =>
        email.endsWith(
          `@${pattern}`,
        ),
    )
  ) {
    return null;
  }

  return email;
}

function normalisePhone(
  value: unknown,
): string | null {
  const text =
    cleanText(
      value,
    );

  if (!text) {
    return null;
  }

  const phone =
    text.replace(
      /[^\d+]/g,
      "",
    );

  const digits =
    phone.replace(
      /\D/g,
      "",
    );

  if (
    digits.length < 9 ||
    digits.length > 15
  ) {
    return null;
  }

  if (
    /^0+$/.test(
      digits,
    )
  ) {
    return null;
  }

  return phone;
}

/* -------------------------------------------------------------------------- */
/* URL HELPERS                                                                */
/* -------------------------------------------------------------------------- */

function normaliseWebsite(
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

    if (
      !url.hostname ||
      !url.hostname.includes(
        ".",
      )
    ) {
      return null;
    }

    url.hash =
      "";

    return url.toString();
  } catch {
    return null;
  }
}

function isValidPublicUrl(
  value: unknown,
): boolean {
  return (
    normaliseWebsite(
      value,
    ) !== null
  );
}

function urlHostname(
  value: unknown,
): string | null {
  const url =
    normaliseWebsite(
      value,
    );

  if (!url) {
    return null;
  }

  try {
    return new URL(
      url,
    ).hostname
      .replace(
        /^www\./i,
        "",
      )
      .toLowerCase();
  } catch {
    return null;
  }
}

function sameHostname(
  first: unknown,
  second: unknown,
): boolean {
  const a =
    urlHostname(
      first,
    );

  const b =
    urlHostname(
      second,
    );

  return Boolean(
    a &&
      b &&
      a === b,
  );
}

/* -------------------------------------------------------------------------- */
/* PUBLIC SOURCE QUALITY                                                      */
/* -------------------------------------------------------------------------- */

function sourceQualityScore(
  evidence: Partial<ProspectEvidence>,
  organisationWebsite?: string | null,
): number {
  const hostname =
    urlHostname(
      evidence.url,
    );

  if (!hostname) {
    return 0;
  }

  if (
    evidence.is_official_source ===
      true ||
    evidence.is_primary_source ===
      true
  ) {
    return 95;
  }

  if (
    organisationWebsite &&
    sameHostname(
      evidence.url,
      organisationWebsite,
    )
  ) {
    return 95;
  }

  if (
    hostname.endsWith(
      ".gov.za",
    ) ||
    hostname ===
      "gov.za"
  ) {
    return 100;
  }

  if (
    hostname.includes(
      "etenders.gov.za",
    ) ||
    hostname.includes(
      "treasury.gov.za",
    )
  ) {
    return 100;
  }

  switch (
    evidence.type
  ) {
    case "government_portal":
    case "tender_notice":
    case "procurement_notice":
    case "rfq_notice":
    case "rfp_notice":
    case "supplier_database":
      return 90;

    case "official_website":
    case "contact_page":
      return 90;

    case "public_document":
    case "public_pdf":
      return 80;

    case "business_profile":
      return 65;

    case "news_report":
      return 60;

    case "social_profile":
      return 45;

    case "company_directory":
      return 35;

    default:
      return 45;
  }
}

/* -------------------------------------------------------------------------- */
/* IDENTIFIER HELPERS                                                         */
/* -------------------------------------------------------------------------- */

function samePhone(
  first: string | null,
  second: string | null,
): boolean {
  if (
    !first ||
    !second
  ) {
    return false;
  }

  const a =
    first.replace(
      /\D/g,
      "",
    );

  const b =
    second.replace(
      /\D/g,
      "",
    );

  if (
    a.length < 9 ||
    b.length < 9
  ) {
    return false;
  }

  return (
    a === b ||
    a.slice(-9) ===
      b.slice(-9)
  );
}

function sameEmail(
  first: string | null,
  second: string | null,
): boolean {
  return Boolean(
    first &&
      second &&
      first.toLowerCase() ===
        second.toLowerCase(),
  );
}

function similarCompanyName(
  first: string,
  second: string,
): boolean {
  const normalise =
    (
      value: string,
    ) =>
      value
        .toLowerCase()
        .replace(
          /\b(pty|ltd|limited|inc|cc|company|holdings|group|services)\b/g,
          "",
        )
        .replace(
          /[^a-z0-9]/g,
          "",
        );

  const a =
    normalise(
      first,
    );

  const b =
    normalise(
      second,
    );

  if (
    !a ||
    !b
  ) {
    return false;
  }

  if (
    a === b
  ) {
    return true;
  }

  if (
    Math.min(
      a.length,
      b.length,
    ) >= 6 &&
    (
      a.includes(
        b,
      ) ||
      b.includes(
        a,
      )
    )
  ) {
    return true;
  }

  return false;
}

function createClientId():
  string {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in
      crypto
  ) {
    return crypto.randomUUID();
  }

  return `prospect-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/* -------------------------------------------------------------------------- */
/* SERVICE INTELLIGENCE                                                       */
/* -------------------------------------------------------------------------- */

export function isPhysicalService(
  service: LeadHunterServiceCategory,
): boolean {
  return (
    PHYSICAL_SERVICE_CATEGORIES.includes(
      service,
    )
  );
}

export function isRemoteService(
  service: LeadHunterServiceCategory,
): boolean {
  return (
    REMOTE_SERVICE_CATEGORIES.includes(
      service,
    )
  );
}

export function inferDeliveryModel(
  services: LeadHunterServiceCategory[],
): LeadHunterDeliveryModel {
  const containsPhysical =
    services.some(
      isPhysicalService,
    );

  const containsRemote =
    services.some(
      isRemoteService,
    );

  if (
    containsPhysical &&
    containsRemote
  ) {
    return "hybrid";
  }

  if (
    containsPhysical
  ) {
    return "physical";
  }

  if (
    containsRemote
  ) {
    return "remote";
  }

  return "auto";
}

export function companyCanDeliverService(
  company: LeadHunterCompany,
  service: LeadHunterServiceCategory,
): boolean {
  if (
    company ===
    "cossa_nexus_holdings"
  ) {
    return true;
  }

  return (
    COMPANY_SERVICE_MAP[
      company
    ]?.includes(
      service,
    ) ??
    false
  );
}

export function maxQueriesForDepth(
  depth: LeadHunterSearchDepth,
): number {
  return (
    SEARCH_DEPTH_OPTIONS.find(
      (
        option,
      ) =>
        option.value ===
        depth,
    )?.maximumQueries ??
    DEFAULT_MAX_SEARCH_QUERIES
  );
}

/* -------------------------------------------------------------------------- */
/* MISSION PARSING                                                            */
/* -------------------------------------------------------------------------- */

function extractMissionField(
  instruction: string,
  field:
    | "Company"
    | "Services"
    | "Location"
    | "Results"
    | "Minimum score"
    | "Private sector"
    | "Government"
    | "Require opportunity signal",
): string | null {
  const boundary =
    "(?=\\s+(?:Company|Services?|Location|Results?|Minimum score|Private sector|Government|Require opportunity signal)\\s*:|$)";

  const pattern =
    new RegExp(
      `${field}\\s*:\\s*(.+?)${boundary}`,
      "i",
    );

  return cleanText(
    instruction.match(
      pattern,
    )?.[1],
  );
}

function extractMissionBooleanField(
  instruction: string,
  fieldPattern: string,
): boolean | null {
  const match =
    instruction.match(
      new RegExp(
        `\\b(?:${fieldPattern})\\s*:\\s*(yes|no|true|false|on|off)\\b`,
        "i",
      ),
    );

  const value =
    match?.[1]
      ?.toLowerCase();

  if (
    [
      "yes",
      "true",
      "on",
    ].includes(
      value ?? "",
    )
  ) {
    return true;
  }

  if (
    [
      "no",
      "false",
      "off",
    ].includes(
      value ?? "",
    )
  ) {
    return false;
  }

  return null;
}

function inferCompaniesFromInstruction(
  instruction: string,
): LeadHunterCompany[] {
  const matches:
    LeadHunterCompany[] =
    [];

  const companyField =
    extractMissionField(
      instruction,
      "Company",
    );

  const searchable =
    companyField ??
    instruction;

  const patterns: Array<{
    company: LeadHunterCompany;
    pattern: RegExp;
  }> = [
    {
      company:
        "cossa_nexus_construction",

      pattern:
        /\bcossa\s+nexus\s+construction(?:s)?\b|\bcossa\s+construction\b/i,
    },

    {
      company:
        "cossa_facility_services",

      pattern:
        /\bcossa\s+facility\s+services\b/i,
    },

    {
      company:
        "cossa_tech",

      pattern:
        /\bcossa\s+tech\b/i,
    },

    {
      company:
        "cossa_ai_growth",

      pattern:
        /\bcossa\s+(?:ai\s+)?growth\b|\bgrowth\b/i,
    },

    {
      company:
        "nexdocs",

      pattern:
        /\bnexdocs\b/i,
    },

    {
      company:
        "cossa_store",

      pattern:
        /\bcossa\s+store\b/i,
    },

    {
      company:
        "cossa_nexus_holdings",

      pattern:
        /\bcossa\s+nexus\s+holdings\b/i,
    },
  ];

  for (
    const item of
    patterns
  ) {
    if (
      item.pattern.test(
        searchable,
      )
    ) {
      matches.push(
        item.company,
      );
    }
  }

  return [
    ...new Set(
      matches,
    ),
  ];
}

function inferServicesFromInstruction(
  instruction: string,
): LeadHunterServiceCategory[] {
  const serviceField =
    extractMissionField(
      instruction,
      "Services",
    );

  if (!serviceField) {
    return [];
  }

  const patterns: Array<{
    service: LeadHunterServiceCategory;
    pattern: RegExp;
  }> = [
    {
      service:
        "construction",

      pattern:
        /\bconstruction\b/i,
    },

    {
      service:
        "renovation",

      pattern:
        /\brenovation(?:s)?\b|\brefurbishment\b/i,
    },

    {
      service:
        "property_maintenance",

      pattern:
        /\bproperty\s+maintenance\b|\bmaintenance\s+services?\b/i,
    },

    {
      service:
        "painting",

      pattern:
        /\bpainting\b|\brepainting\b/i,
    },

    {
      service:
        "tiling",

      pattern:
        /\btiling\b|\btiles?\b/i,
    },

    {
      service:
        "ceilings",

      pattern:
        /\bceilings?\b/i,
    },

    {
      service:
        "roofing",

      pattern:
        /\broofing\b|\broof repairs?\b/i,
    },

    {
      service:
        "plumbing",

      pattern:
        /\bplumbing\b/i,
    },

    {
      service:
        "carpentry",

      pattern:
        /\bcarpentry\b|\bjoinery\b/i,
    },

    {
      service:
        "waterproofing",

      pattern:
        /\bwaterproofing\b/i,
    },

    {
      service:
        "shopfitting",

      pattern:
        /\bshop\s*fit(?:ting)?\b|\bfit[-\s]?out\b/i,
    },

    {
      service:
        "minor_building_works",

      pattern:
        /\bminor building works?\b|\bsmall works?\b/i,
    },

    {
      service:
        "facility_management",

      pattern:
        /\bfacilit(?:y|ies)\s+management\b/i,
    },

    {
      service:
        "commercial_cleaning",

      pattern:
        /\bcommercial\s+cleaning\b/i,
    },

    {
      service:
        "deep_cleaning",

      pattern:
        /\bdeep\s+cleaning\b/i,
    },

    {
      service:
        "office_cleaning",

      pattern:
        /\boffice\s+cleaning\b/i,
    },

    {
      service:
        "hygiene",

      pattern:
        /\bhygiene\b|\bsanitation\b/i,
    },

    {
      service:
        "landscaping",

      pattern:
        /\blandscaping\b|\bgarden services?\b/i,
    },

    {
      service:
        "waste_management",

      pattern:
        /\bwaste\s+management\b/i,
    },

    {
      service:
        "website_design",

      pattern:
        /\bwebsite\s+(?:design|redesign)\b|\bweb\s+design\b/i,
    },

    {
      service:
        "website_development",

      pattern:
        /\bwebsite\s+development\b|\bweb\s+development\b/i,
    },

    {
      service:
        "logo_design",

      pattern:
        /\blogo\s+(?:design|redesign|upgrade)\b/i,
    },

    {
      service:
        "branding",

      pattern:
        /\bbranding\b|\bbrand\s+identity\b/i,
    },

    {
      service:
        "seo",

      pattern:
        /\bseo\b|\bsearch engine optimi[sz]ation\b/i,
    },

    {
      service:
        "digital_marketing",

      pattern:
        /\bdigital\s+marketing\b/i,
    },

    {
      service:
        "social_media_management",

      pattern:
        /\bsocial\s+media\s+management\b/i,
    },

    {
      service:
        "google_business_profile",

      pattern:
        /\bgoogle\s+business\s+profile\b|\bgbp\b/i,
    },

    {
      service:
        "lead_generation",

      pattern:
        /\blead\s+generation\b/i,
    },

    {
      service:
        "crm",

      pattern:
        /\bcrm\b|\bcustomer relationship management\b/i,
    },

    {
      service:
        "ai_automation",

      pattern:
        /\bai\s+automation\b/i,
    },

    {
      service:
        "business_automation",

      pattern:
        /\bbusiness\s+automation\b|\bworkflow\s+automation\b/i,
    },

    {
      service:
        "business_documents",

      pattern:
        /\bbusiness\s+documents?\b/i,
    },

    {
      service:
        "quotations",

      pattern:
        /\bquotations?\b|\bquote systems?\b/i,
    },

    {
      service:
        "proposals",

      pattern:
        /\bproposals?\b/i,
    },

    {
      service:
        "contracts",

      pattern:
        /\bcontracts?\b|\bcontract documents?\b/i,
    },

    {
      service:
        "company_profiles",

      pattern:
        /\bcompany profiles?\b/i,
    },

    {
      service:
        "tender_documents",

      pattern:
        /\btender documents?\b/i,
    },

    {
      service:
        "ecommerce",

      pattern:
        /\be-?commerce\b|\bonline store\b/i,
    },

    {
      service:
        "building_material_supply",

      pattern:
        /\bbuilding materials?\b|\bconstruction materials?\b/i,
    },

    {
      service:
        "hardware_supply",

      pattern:
        /\bhardware supply\b|\bhardware materials?\b/i,
    },

    {
      service:
        "cleaning_supply",

      pattern:
        /\bcleaning supplies?\b|\bcleaning materials?\b/i,
    },

    {
      service:
        "office_supply",

      pattern:
        /\boffice supplies?\b|\bstationery\b/i,
    },

    {
      service:
        "technology_supply",

      pattern:
        /\bICT equipment\b|\btechnology supply\b|\bcomputer equipment\b/i,
    },

    {
      service:
        "general_product_supply",

      pattern:
        /\bgeneral supply\b|\bproduct supply\b/i,
    },

    {
      service:
        "procurement_supply",

      pattern:
        /\bprocurement supply\b|\bsupply and delivery\b/i,
    },
  ];

  const matches:
    LeadHunterServiceCategory[] =
    [];

  for (
    const item of
    patterns
  ) {
    if (
      item.pattern.test(
        serviceField,
      )
    ) {
      matches.push(
        item.service,
      );
    }
  }

  return [
    ...new Set(
      matches,
    ),
  ];
}

function inferLocationsFromInstruction(
  instruction: string,
): string[] {
  const locationField =
    extractMissionField(
      instruction,
      "Location",
    );

  if (
    locationField
  ) {
    return [
      ...new Set(
        locationField
          .split(
            /[,;|]+|\s+(?:and|&)\s+/i,
          )
          .map(
            cleanText,
          )
          .filter(
            (
              item,
            ): item is string =>
              Boolean(
                item,
              ),
          ),
      ),
    ].slice(
      0,
      25,
    );
  }

  const knownLocations =
    [
      ...PRIORITY_GAUTENG_LOCATIONS,
      ...SOUTH_AFRICAN_PROVINCES,
      "South Africa",
    ];

  return knownLocations.filter(
    (
      location,
    ) => {
      const escaped =
        location.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      return new RegExp(
        `\\b${escaped}\\b`,
        "i",
      ).test(
        instruction,
      );
    },
  );
}

function inferBuyerTargetsFromInstruction(
  instruction: string,
): string[] {
  const clause =
    instruction.match(
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
        .split(
          /[,;]|\s+(?:and|&)\s+/i,
        )
        .map(
          cleanText,
        )
        .filter(
          (
            item,
          ): item is string =>
            Boolean(
              item,
            ) &&
            !genericTarget.test(
              item,
            ),
        ),
    ),
  ].slice(
    0,
    8,
  );
}

/* -------------------------------------------------------------------------- */
/* NATURAL LANGUAGE RECONCILIATION                                            */
/* -------------------------------------------------------------------------- */

function applyInstructionIntent(
  request: Partial<LeadHunterSearchRequest>,
): Partial<LeadHunterSearchRequest> {
  const instruction =
    cleanLongText(
      request.search_instruction,
      MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
    );

  if (!instruction) {
    return request;
  }

  const next:
    Partial<LeadHunterSearchRequest> =
    {
      ...request,

      search_instruction:
        instruction,
    };

  const inferredCompanies =
    inferCompaniesFromInstruction(
      instruction,
    );

  if (
    inferredCompanies.length >
    0
  ) {
    next.companies =
      inferredCompanies;
  }

  const inferredServices =
    inferServicesFromInstruction(
      instruction,
    );

  if (
    inferredServices.length >
    0
  ) {
    next.services =
      inferredServices;
  }

  const inferredLocations =
    inferLocationsFromInstruction(
      instruction,
    );

  if (
    inferredLocations.length >
    0
  ) {
    next.locations =
      inferredLocations;
  }

  const buyerTargets =
    inferBuyerTargetsFromInstruction(
      instruction,
    );

  if (
    buyerTargets.length >
    0
  ) {
    next.organisation_types =
      buyerTargets;
  }

  const privateField =
    extractMissionBooleanField(
      instruction,
      "Private sector",
    );

  const governmentField =
    extractMissionBooleanField(
      instruction,
      "Government",
    );

  const privateOnly =
    /\bprivate[\s-]*sector\s+only\b/i.test(
      instruction,
    ) ||
    /\bdo not search government\b/i.test(
      instruction,
    ) ||
    /\bno government\b/i.test(
      instruction,
    ) ||
    governmentField ===
      false;

  const governmentOnly =
    /\bgovernment[\s-]*sector\s+only\b/i.test(
      instruction,
    ) ||
    /\bgovernment opportunities only\b/i.test(
      instruction,
    ) ||
    privateField ===
      false;

  if (
    privateOnly &&
    !governmentOnly
  ) {
    next.sector =
      "private";

    next.include_private_sector =
      true;

    next.include_government_sector =
      false;

    next.include_nonprofits =
      false;
  }

  if (
    governmentOnly &&
    !privateOnly
  ) {
    next.sector =
      "government";

    next.include_private_sector =
      false;

    next.include_government_sector =
      true;

    next.include_nonprofits =
      false;
  }

  const negativeClauses =
    instruction.match(
      /\b(?:do not|don't|exclude|without|no)\b[^.!;\n]*/gi,
    ) ??
    [];

  const negativeText =
    negativeClauses
      .join(
        " ",
      )
      .toLowerCase();

  const excludedServices =
    new Set<LeadHunterServiceCategory>();

  if (
    /\bcleaning\b/.test(
      negativeText,
    )
  ) {
    [
      "commercial_cleaning",
      "deep_cleaning",
      "office_cleaning",
      "post_construction_cleaning",
      "hygiene",
    ].forEach(
      (
        service,
      ) =>
        excludedServices.add(
          service as LeadHunterServiceCategory,
        ),
    );
  }

  if (
    /\btechnology\b|\btech\b/.test(
      negativeText,
    )
  ) {
    TECH_SERVICE_CATEGORIES.forEach(
      (
        service,
      ) =>
        excludedServices.add(
          service,
        ),
    );
  }

  if (
    /\bmarketing\b|\bgrowth\b/.test(
      negativeText,
    )
  ) {
    GROWTH_SERVICE_CATEGORIES.forEach(
      (
        service,
      ) =>
        excludedServices.add(
          service,
        ),
    );
  }

  if (
    /\bbranding\b|\blogo\b/.test(
      negativeText,
    )
  ) {
    excludedServices.add(
      "logo_design",
    );

    excludedServices.add(
      "branding",
    );
  }

  if (
    /\bnexdocs\b|\bbusiness documents?\b/.test(
      negativeText,
    )
  ) {
    NEXDOCS_SERVICE_CATEGORIES.forEach(
      (
        service,
      ) =>
        excludedServices.add(
          service,
        ),
    );

    next.companies =
      next.companies?.filter(
        (
          company,
        ) =>
          company !==
          "nexdocs",
      );
  }

  if (
    /\bcossa store\b|\bproduct supply\b|\bsupply opportunities\b/.test(
      negativeText,
    )
  ) {
    STORE_SERVICE_CATEGORIES.forEach(
      (
        service,
      ) =>
        excludedServices.add(
          service,
        ),
    );

    next.companies =
      next.companies?.filter(
        (
          company,
        ) =>
          company !==
          "cossa_store",
      );
  }

  if (
    next.services &&
    excludedServices.size >
      0
  ) {
    const filtered =
      next.services.filter(
        (
          service,
        ) =>
          !excludedServices.has(
            service,
          ),
      );

    if (
      filtered.length >
      0
    ) {
      next.services =
        filtered;
    }
  }

  const resultsField =
    extractMissionField(
      instruction,
      "Results",
    );

  const resultCount =
    safeNumber(
      resultsField?.match(
        /\d+/,
      )?.[0],
    );

  if (
    resultCount !==
    null
  ) {
    next.result_count =
      Math.max(
        1,
        Math.min(
          MAX_HUNT_RESULTS,
          Math.round(
            resultCount,
          ),
        ),
      );
  }

  const minimumScoreField =
    extractMissionField(
      instruction,
      "Minimum score",
    );

  const minimumScore =
    safeNumber(
      minimumScoreField?.match(
        /\d+/,
      )?.[0],
    );

  if (
    minimumScore !==
    null
  ) {
    next.minimum_score =
      clampScore(
        minimumScore,
      );
  }

  const requireOpportunitySignal =
    extractMissionBooleanField(
      instruction,
      "Require opportunity (?:signal|evidence)",
    );

  const allowsResearchProspects =
    /\b(?:return|keep|allow)\b[\s\S]{0,120}\bresearch prospects?\b/i.test(
      instruction,
    );

  if (
    allowsResearchProspects
  ) {
    next.require_opportunity_signal =
      false;
  } else if (
    requireOpportunitySignal !==
    null
  ) {
    next.require_opportunity_signal =
      requireOpportunitySignal;
  }

  if (
    /\bquick revenue\b|\beasy wins?\b|\bfaster[-\s]to[-\s]close\b|\bsmall(?:er)? jobs?\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "quick_revenue";

    next.easy_wins_only =
      true;

    next.revenue_first =
      true;
  }

  if (
    /\brecurring revenue\b|\bmonthly contract\b|\bretainer\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "recurring_revenue";

    next.revenue_first =
      true;
  }

  if (
    /\bhigh value\b|\blarge contract\b|\bstrategic opportunity\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "high_value";
  }

  return next;
}

/* -------------------------------------------------------------------------- */
/* SCORING                                                                    */
/* -------------------------------------------------------------------------- */

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
  const weighted =
    clampScore(
      prospect.fit_score,
    ) *
      0.28 +
    clampScore(
      prospect.intent_score,
    ) *
      0.25 +
    clampScore(
      prospect.evidence_score,
    ) *
      0.22 +
    clampScore(
      prospect.timing_score,
    ) *
      0.15 +
    clampScore(
      prospect.contactability_score,
    ) *
      0.1;

  return clampScore(
    weighted,
  );
}

export function calculateSalesPriority({
  totalScore,
  intentScore,
  contactabilityScore,
  timingScore,
}: {
  totalScore: number;
  intentScore: number;
  contactabilityScore: number;
  timingScore: number;
}): ProspectSalesPriority {
  if (
    totalScore >= 80 &&
    contactabilityScore >= 60 &&
    (
      intentScore >= 70 ||
      timingScore >= 75
    )
  ) {
    return "hot";
  }

  if (
    totalScore >= 65 &&
    contactabilityScore >= 40
  ) {
    return "warm";
  }

  if (
    totalScore >= 50
  ) {
    return "cold";
  }

  return "research";
}

function calculateSourceDiversityScore(
  evidence: ProspectEvidence[],
): number {
  if (
    evidence.length ===
    0
  ) {
    return 0;
  }

  const domains =
    new Set(
      evidence
        .map(
          (
            item,
          ) =>
            urlHostname(
              item.url,
            ),
        )
        .filter(
          Boolean,
        ),
    );

  if (
    domains.size >= 4
  ) {
    return 100;
  }

  if (
    domains.size === 3
  ) {
    return 90;
  }

  if (
    domains.size === 2
  ) {
    return 75;
  }

  return 50;
}

function calculateDataQualityScore({
  organisationName,
  phone,
  email,
  website,
  evidence,
  signals,
  primarySourceUrl,
}: {
  organisationName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  evidence: ProspectEvidence[];
  signals: ProspectSignal[];
  primarySourceUrl: string | null;
}): number {
  let score =
    0;

  if (
    organisationName
  ) {
    score += 15;
  }

  if (
    primarySourceUrl
  ) {
    score += 20;
  }

  if (
    website
  ) {
    score += 10;
  }

  if (
    phone
  ) {
    score += 10;
  }

  if (
    email
  ) {
    score += 10;
  }

  if (
    evidence.length >= 1
  ) {
    score += 15;
  }

  if (
    evidence.length >= 2
  ) {
    score += 10;
  }

  if (
    signals.length >= 1
  ) {
    score += 10;
  }

  return clampScore(
    score,
  );
}

function calculateVerificationConfidence({
  evidenceScore,
  dataQualityScore,
  sourceDiversityScore,
  freshnessScore,
}: {
  evidenceScore: number;
  dataQualityScore: number;
  sourceDiversityScore: number;
  freshnessScore: number;
}): number {
  return clampScore(
    evidenceScore *
      0.4 +
    dataQualityScore *
      0.3 +
    sourceDiversityScore *
      0.15 +
    freshnessScore *
      0.15,
  );
}

/* -------------------------------------------------------------------------- */
/* WHY CONTACT                                                                */
/* -------------------------------------------------------------------------- */

function buildWhyContact(
  candidate: Partial<LeadHunterProspect>,
  signals: ProspectSignal[],
): string[] {
  const existing =
    uniqueTexts(
      candidate.why_contact,
      10,
    );

  if (
    existing.length >
    0
  ) {
    return existing;
  }

  const reasons:
    string[] =
    [];

  if (
    candidate.public_phone ||
    candidate.public_email
  ) {
    reasons.push(
      "A verified public business contact route is available.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        [
          "website_problem",
          "missing_website",
          "mobile_website_problem",
          "missing_contact_form",
          "missing_whatsapp",
          "technology_need",
          "ecommerce_need",
        ].includes(
          signal.type,
        ),
    )
  ) {
    reasons.push(
      "A publicly observable technology or website opportunity was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        [
          "branding_problem",
          "missing_logo",
          "seo_gap",
          "inactive_marketing",
          "weak_google_profile",
        ].includes(
          signal.type,
        ),
    )
  ) {
    reasons.push(
      "A publicly observable marketing or brand-growth gap was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        [
          "maintenance_need",
          "renovation_need",
          "cleaning_need",
          "new_development",
        ].includes(
          signal.type,
        ),
    )
  ) {
    reasons.push(
      "A relevant construction, maintenance or facility-service signal was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        [
          "active_tender",
          "request_for_quote",
          "request_for_proposal",
          "supplier_registration",
          "product_supply_need",
          "procurement_need",
        ].includes(
          signal.type,
        ),
    )
  ) {
    reasons.push(
      "A public procurement or supplier opportunity was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        signal.type ===
        "document_need",
    )
  ) {
    reasons.push(
      "A business-document or procurement-document need was identified.",
    );
  }

  return reasons;
}

/* -------------------------------------------------------------------------- */
/* EVIDENCE NORMALISATION                                                     */
/* -------------------------------------------------------------------------- */

function normaliseEvidence(
  input: unknown,
  organisationWebsite: string | null,
): ProspectEvidence[] {
  if (
    !Array.isArray(
      input,
    )
  ) {
    return [];
  }

  const seenUrls =
    new Set<string>();

  const evidence:
    ProspectEvidence[] =
    [];

  for (
    const raw of
    input
  ) {
    const item =
      raw as Partial<ProspectEvidence>;

    const title =
      cleanText(
        item?.title,
      );

    const url =
      normaliseWebsite(
        item?.url,
      );

    if (
      !title ||
      !url
    ) {
      continue;
    }

    const canonical =
      url.toLowerCase();

    if (
      seenUrls.has(
        canonical,
      )
    ) {
      continue;
    }

    seenUrls.add(
      canonical,
    );

    const publishedAt =
      normaliseDate(
        item.published_at,
      );

    const checkedAt =
      normaliseDate(
        item.checked_at,
      ) ??
      new Date().toISOString();

    const quality =
      item.source_quality_score !==
      undefined
        ? clampScore(
            item.source_quality_score,
          )
        : sourceQualityScore(
            item,
            organisationWebsite,
          );

    const freshness =
      item.freshness_score !==
      undefined
        ? clampScore(
            item.freshness_score,
          )
        : calculateFreshnessScore(
            publishedAt ??
            checkedAt,
          );

    evidence.push({
      id:
        cleanText(
          item.id,
        ) ??
        undefined,

      type:
        item.type ??
        "other_public_source",

      title,

      url,

      publisher:
        cleanText(
          item.publisher,
        ),

      published_at:
        publishedAt,

      checked_at:
        checkedAt,

      excerpt:
        cleanLongText(
          item.excerpt,
          2_000,
        ),

      supports:
        uniqueTexts(
          item.supports,
          20,
        ),

      source_quality_score:
        quality,

      freshness_score:
        freshness,

      is_primary_source:
        item.is_primary_source ===
          true ||
        sameHostname(
          url,
          organisationWebsite,
        ),

      is_official_source:
        item.is_official_source ===
          true ||
        quality >=
          90,

      provider:
        item.provider ??
        null,
    });

    if (
      evidence.length >=
      MAX_PROSPECT_EVIDENCE_ITEMS
    ) {
      break;
    }
  }

  return evidence;
}

/* -------------------------------------------------------------------------- */
/* SIGNAL NORMALISATION                                                       */
/* -------------------------------------------------------------------------- */

function normaliseSignals(
  input: unknown,
): ProspectSignal[] {
  if (
    !Array.isArray(
      input,
    )
  ) {
    return [];
  }

  return input
    .map(
      (
        raw,
      ) => {
        const signal =
          raw as Partial<ProspectSignal>;

        const title =
          cleanText(
            signal.title,
          );

        const explanation =
          cleanText(
            signal.explanation,
          );

        const evidenceUrl =
          normaliseWebsite(
            signal.evidence_url,
          );

        if (
          !title ||
          !explanation ||
          !evidenceUrl
        ) {
          return null;
        }

        return {
          type:
            signal.type ??
            "general_fit",

          title,

          explanation,

          evidence_url:
            evidenceUrl,

          detected_at:
            normaliseDate(
              signal.detected_at,
            ) ??
            new Date().toISOString(),

          confidence:
            clampScore(
              signal.confidence,
            ),
        } satisfies ProspectSignal;
      },
    )
    .filter(
      (
        signal,
      ): signal is ProspectSignal =>
        Boolean(
          signal,
        ),
    )
    .slice(
      0,
      MAX_PROSPECT_SIGNALS,
    );
}

/* -------------------------------------------------------------------------- */
/* PROSPECT VALIDATION                                                        */
/* -------------------------------------------------------------------------- */

export function validateProspect(
  candidate: Partial<LeadHunterProspect>,
): LeadHunterProspect {
  const rejectionReasons:
    string[] =
    [];

  const organisationName =
    cleanText(
      candidate.organisation_name,
    );

  if (
    !organisationName
  ) {
    rejectionReasons.push(
      "Organisation name is missing.",
    );
  }

  const website =
    normaliseWebsite(
      candidate.website,
    );

  const primarySourceUrl =
    normaliseWebsite(
      candidate.primary_source_url,
    );

  if (
    !primarySourceUrl
  ) {
    rejectionReasons.push(
      "No valid primary public source URL was supplied.",
    );
  }

  const phone =
    normalisePhone(
      candidate.public_phone,
    );

  const email =
    normaliseEmail(
      candidate.public_email,
    );

  const evidence =
    normaliseEvidence(
      candidate.evidence,
      website,
    );

  if (
    evidence.length ===
    0
  ) {
    rejectionReasons.push(
      "No valid public evidence source was supplied.",
    );
  }

  if (
    !website &&
    !phone &&
    !email
  ) {
    rejectionReasons.push(
      "No website, public phone number or public email was verified.",
    );
  }

  const signals =
    normaliseSignals(
      candidate.signals,
    );

  const sector =
    VALID_SECTORS.has(
      candidate.sector as LeadHunterSector,
    )
      ? candidate.sector as LeadHunterSector
      : "private";

  const recommendedCompany =
    VALID_COMPANIES.has(
      candidate.recommended_company as LeadHunterCompany,
    )
      ? candidate.recommended_company as LeadHunterCompany
      : "cossa_nexus_holdings";

  const recommendedService =
    candidate.recommended_service ??
    "general";

  if (
    recommendedService !==
      "general" &&
    !companyCanDeliverService(
      recommendedCompany,
      recommendedService,
    )
  ) {
    rejectionReasons.push(
      `Recommended service ${recommendedService} does not match ${recommendedCompany}.`,
    );
  }

  const fitScore =
    clampScore(
      candidate.fit_score,
    );

  const intentScore =
    clampScore(
      candidate.intent_score,
    );

  const evidenceScore =
    clampScore(
      candidate.evidence_score,
    );

  const timingScore =
    clampScore(
      candidate.timing_score,
    );

  const contactabilityScore =
    clampScore(
      candidate.contactability_score,
    );

  const suppliedTotal =
    safeNumber(
      candidate.total_score,
    );

  const totalScore =
    suppliedTotal !==
    null
      ? clampScore(
          suppliedTotal,
        )
      : calculateProspectScore({
          fit_score:
            fitScore,

          intent_score:
            intentScore,

          evidence_score:
            evidenceScore,

          timing_score:
            timingScore,

          contactability_score:
            contactabilityScore,
        });

  const revenuePotentialScore =
    candidate.revenue_potential_score !==
    undefined
      ? clampScore(
          candidate.revenue_potential_score,
        )
      : clampScore(
          totalScore *
            0.5 +
          intentScore *
            0.3 +
          timingScore *
            0.2,
        );

  const easeToCloseScore =
    candidate.ease_to_close_score !==
    undefined
      ? clampScore(
          candidate.ease_to_close_score,
        )
      : clampScore(
          contactabilityScore *
            0.45 +
          intentScore *
            0.3 +
          fitScore *
            0.25,
        );

  const recurringRevenueScore =
    candidate.recurring_revenue_score !==
    undefined
      ? clampScore(
          candidate.recurring_revenue_score,
        )
      : clampScore(
          [
            "facility_management",
            "commercial_cleaning",
            "office_cleaning",
            "hygiene",
            "landscaping",
            "grounds_maintenance",
            "seo",
            "digital_marketing",
            "social_media_management",
            "lead_generation",
            "crm",
            "ai_automation",
            "customer_follow_up",
          ].includes(
            recommendedService,
          )
            ? 80
            : 35,
        );

  const geographicFitScore =
    candidate.geographic_fit_score !==
    undefined
      ? clampScore(
          candidate.geographic_fit_score,
        )
      : 60;

  const opportunityOpenDate =
    normaliseDate(
      candidate.opportunity_open_date,
    );

  const opportunityClosingDate =
    normaliseDate(
      candidate.opportunity_closing_date,
    );

  let procurementStatus:
    ProcurementStatus =
      VALID_PROCUREMENT_STATUSES.has(
        candidate.procurement_status as ProcurementStatus,
      )
        ? candidate.procurement_status as ProcurementStatus
        : "unknown";

  const procurementClassification =
    [
      "tender",
      "rfq",
      "rfp",
      "supplier_opportunity",
      "product_supply_opportunity",
    ].includes(
      candidate.classification ??
      "",
    );

  if (
    procurementClassification &&
    opportunityHasExpired(
      opportunityClosingDate,
    )
  ) {
    procurementStatus =
      "expired";
  }

  const evidenceFreshness =
    evidence.length >
    0
      ? Math.round(
          evidence.reduce(
            (
              total,
              item,
            ) =>
              total +
              (
                item.freshness_score ??
                0
              ),
            0,
          ) /
          evidence.length,
        )
      : 0;

  const freshnessScore =
    candidate.freshness_score !==
    undefined
      ? clampScore(
          candidate.freshness_score,
        )
      : procurementClassification
        ? (
            opportunityClosingDate
              ? (
                  opportunityHasExpired(
                    opportunityClosingDate,
                  )
                    ? 0
                    : 95
                )
              : evidenceFreshness
          )
        : evidenceFreshness;

  const sourceDiversityScore =
    candidate.source_diversity_score !==
    undefined
      ? clampScore(
          candidate.source_diversity_score,
        )
      : calculateSourceDiversityScore(
          evidence,
        );

  const dataQualityScore =
    candidate.data_quality_score !==
    undefined
      ? clampScore(
          candidate.data_quality_score,
        )
      : calculateDataQualityScore({
          organisationName,
          phone,
          email,
          website,
          evidence,
          signals,
          primarySourceUrl,
        });

  const verificationConfidence =
    candidate.verification_confidence !==
    undefined
      ? clampScore(
          candidate.verification_confidence,
        )
      : calculateVerificationConfidence({
          evidenceScore,
          dataQualityScore,
          sourceDiversityScore,
          freshnessScore,
        });

  const requestedVerificationStatus =
    VALID_VERIFICATION_STATUSES.has(
      candidate.verification_status as ProspectVerificationStatus,
    )
      ? candidate.verification_status as ProspectVerificationStatus
      : "unverified";

  if (
    procurementStatus ===
    "expired"
  ) {
    rejectionReasons.push(
      "Procurement opportunity appears to have expired.",
    );
  }

  let verificationStatus:
    ProspectVerificationStatus =
      requestedVerificationStatus;

  if (
    requestedVerificationStatus ===
      "rejected" ||
    candidate.classification ===
      "rejected" ||
    rejectionReasons.length >
      0
  ) {
    verificationStatus =
      "rejected";
  } else if (
    evidence.length >= 2 &&
    evidenceScore >= 70 &&
    verificationConfidence >= 70 &&
    (
      phone ||
      email ||
      website
    )
  ) {
    verificationStatus =
      "verified";
  } else {
    verificationStatus =
      "partially_verified";
  }

  const classification =
    verificationStatus ===
    "rejected"
      ? "rejected"
      : candidate.classification ??
        "prospect";

  const salesPriority =
    classification ===
      "prospect" &&
    (
      signals.length === 0 ||
      signals.every(
        (
          signal,
        ) =>
          signal.type ===
          "general_fit",
      )
    )
      ? "research"
      : candidate.sales_priority ??
        calculateSalesPriority({
          totalScore,
          intentScore,
          contactabilityScore,
          timingScore,
        });

  const pursuitRisk:
    PursuitRisk =
      candidate.pursuit_risk ??
      (
        verificationStatus ===
          "verified" &&
        contactabilityScore >=
          60 &&
        freshnessScore >=
          70
          ? "low"
          : verificationStatus ===
              "partially_verified"
            ? "medium"
            : "high"
      );

  return {
    id:
      cleanText(
        candidate.id,
      ) ??
      createClientId(),

    organisation_name:
      organisationName ??
      "Rejected prospect",

    trading_name:
      cleanText(
        candidate.trading_name,
      ),

    sector,

    industry:
      cleanText(
        candidate.industry,
      ),

    organisation_type:
      cleanText(
        candidate.organisation_type,
      ),

    website,

    public_phone:
      phone,

    public_email:
      email,

    identity_keys:
      uniqueTexts(
        candidate.identity_keys,
        20,
      ).filter(
        (
          value,
        ) =>
          /^(phone|email|domain):.+$/i.test(
            value,
          ),
      ),

    contact_page_url:
      normaliseWebsite(
        candidate.contact_page_url,
      ),

    contact_name:
      cleanText(
        candidate.contact_name,
      ),

    contact_title:
      cleanText(
        candidate.contact_title,
      ),

    decision_maker_route:
      cleanText(
        candidate.decision_maker_route,
      ),

    address:
      cleanText(
        candidate.address,
      ),

    suburb:
      cleanText(
        candidate.suburb,
      ),

    city:
      cleanText(
        candidate.city,
      ),

    province:
      cleanText(
        candidate.province,
      ),

    country:
      cleanText(
        candidate.country,
      ) ??
      "South Africa",

    recommended_company:
      recommendedCompany,

    recommended_service:
      recommendedService,

    service_fit_reason:
      cleanText(
        candidate.service_fit_reason,
      ) ??
      "Service fit has not been sufficiently explained.",

    opportunity_summary:
      cleanText(
        candidate.opportunity_summary,
      ) ??
      "No verified opportunity summary supplied.",

    opportunity_size:
      candidate.opportunity_size ??
      "unknown",

    estimated_value:
      safeNumber(
        candidate.estimated_value,
      ),

    tender_reference:
      cleanText(
        candidate.tender_reference,
      ),

    procurement_status:
      procurementClassification
        ? procurementStatus
        : "not_applicable",

    opportunity_open_date:
      opportunityOpenDate,

    opportunity_closing_date:
      opportunityClosingDate,

    classification,

    verification_status:
      verificationStatus,

    fit_score:
      fitScore,

    intent_score:
      intentScore,

    evidence_score:
      evidenceScore,

    timing_score:
      timingScore,

    contactability_score:
      contactabilityScore,

    total_score:
      totalScore,

    revenue_potential_score:
      revenuePotentialScore,

    ease_to_close_score:
      easeToCloseScore,

    recurring_revenue_score:
      recurringRevenueScore,

    geographic_fit_score:
      geographicFitScore,

    data_quality_score:
      dataQualityScore,

    freshness_score:
      freshnessScore,

    source_diversity_score:
      sourceDiversityScore,

    verification_confidence:
      verificationConfidence,

    pursuit_risk:
      pursuitRisk,

    sales_priority:
      salesPriority,

    why_contact:
      buildWhyContact(
        candidate,
        signals,
      ),

    signals,

    evidence,

    primary_source_url:
      primarySourceUrl ??
      "",

    date_verified:
      normaliseDate(
        candidate.date_verified,
      ) ??
      new Date().toISOString(),

    next_action:
      cleanText(
        candidate.next_action,
      ) ??
      "Review the verified public evidence and identify the correct procurement or decision-maker route before outreach.",

    outreach_angle:
      cleanText(
        candidate.outreach_angle,
      ),

    duplicate_status:
      candidate.duplicate_status ??
      "not_checked",

    duplicate_lead_id:
      cleanText(
        candidate.duplicate_lead_id,
      ),

    rejection_reasons: [
      ...new Set([
        ...(
          candidate.rejection_reasons ??
          []
        ),

        ...rejectionReasons,
      ]),
    ],

    raw_provider_name:
      cleanText(
        candidate.raw_provider_name,
      ),

    raw_provider_result_id:
      cleanText(
        candidate.raw_provider_result_id,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* REQUEST VALIDATION                                                         */
/* -------------------------------------------------------------------------- */

export function validateSearchRequest(
  requestInput: Partial<LeadHunterSearchRequest>,
): LeadHunterSearchRequest {
  const request =
    applyInstructionIntent(
      requestInput,
    );

  const resultCount =
    Math.max(
      1,
      Math.min(
        MAX_HUNT_RESULTS,
        Math.round(
          Number(
            request.result_count ??
            DEFAULT_HUNT_RESULTS,
          ),
        ),
      ),
    );

  const validCompanies =
    (
      request.companies ??
      []
    ).filter(
      (
        company,
      ): company is LeadHunterCompany =>
        VALID_COMPANIES.has(
          company,
        ),
    );

  const companies =
    validCompanies.length >
    0
      ? [
          ...new Set(
            validCompanies,
          ),
        ]
      : DEFAULT_LEAD_HUNTER_REQUEST.companies;

  const services =
    request.services?.length
      ? [
          ...new Set(
            request.services,
          ),
        ]
      : DEFAULT_LEAD_HUNTER_REQUEST.services;

  const requestedDeliveryModel =
    request.delivery_model ??
    DEFAULT_LEAD_HUNTER_REQUEST.delivery_model ??
    "auto";

  const deliveryModel =
    requestedDeliveryModel ===
    "auto"
      ? inferDeliveryModel(
          services,
        )
      : requestedDeliveryModel;

  const searchDepth =
    request.search_depth ??
    DEFAULT_LEAD_HUNTER_REQUEST.search_depth ??
    "economy";

  const depthQueryLimit =
    maxQueriesForDepth(
      searchDepth,
    );

  const requestedQueryLimit =
    Math.max(
      1,
      Math.min(
        MAX_ALLOWED_SEARCH_QUERIES,
        Math.round(
          Number(
            request.max_search_queries ??
            depthQueryLimit,
          ),
        ),
      ),
    );

  const maximumQueries =
    Math.min(
      depthQueryLimit,
      requestedQueryLimit,
    );

  const objectives =
    Array.isArray(
      request.objectives,
    ) &&
    request.objectives.length >
      0
      ? [
          ...new Set(
            request.objectives,
          ),
        ]
      : DEFAULT_LEAD_HUNTER_REQUEST.objectives ??
        [
          "find_customers",
        ];

  const searchEverything =
    safeBoolean(
      request.search_everything,
      false,
    ) ||
    objectives.includes(
      "search_everything_relevant",
    );

  const locations =
    uniqueTexts(
      request.locations,
      25,
    );

  const countries =
    uniqueTexts(
      request.countries,
      15,
    );

  const provinces =
    uniqueTexts(
      request.provinces,
      12,
    );

  const cities =
    uniqueTexts(
      request.cities,
      25,
    );

  const suburbs =
    uniqueTexts(
      request.suburbs,
      30,
    );

  const fallbackLocations =
    [
      ...cities,
      ...provinces,
      ...countries,
    ];

  return {
    ...DEFAULT_LEAD_HUNTER_REQUEST,
    ...request,

    companies,

    services,

    locations:
      locations.length >
      0
        ? locations
        : fallbackLocations.length >
            0
          ? fallbackLocations
          : DEFAULT_LEAD_HUNTER_REQUEST.locations,

    industries:
      uniqueTexts(
        request.industries,
        25,
      ),

    organisation_types:
      uniqueTexts(
        request.organisation_types,
        25,
      ),

    result_count:
      resultCount,

    minimum_score:
      clampScore(
        request.minimum_score ??
        DEFAULT_LEAD_HUNTER_REQUEST.minimum_score,
      ),

    minimum_evidence_sources:
      Math.max(
        1,
        Math.min(
          5,
          Math.round(
            Number(
              request.minimum_evidence_sources ??
              DEFAULT_MINIMUM_EVIDENCE_SOURCES,
            ),
          ),
        ),
      ),

    tender_keywords:
      uniqueTexts(
        request.tender_keywords,
        30,
      ).length >
      0
        ? uniqueTexts(
            request.tender_keywords,
            30,
          )
        : DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords:
      uniqueTexts(
        request.prospect_keywords,
        40,
      ).length >
      0
        ? uniqueTexts(
            request.prospect_keywords,
            40,
          )
        : DEFAULT_LEAD_HUNTER_REQUEST.prospect_keywords,

    notes:
      cleanLongText(
        request.notes,
        2_000,
      ),

    search_instruction:
      cleanLongText(
        request.search_instruction,
        MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
      ) ??
      DEFAULT_LEAD_HUNTER_REQUEST.search_instruction ??
      null,

    search_scope:
      request.search_scope ??
      DEFAULT_LEAD_HUNTER_REQUEST.search_scope ??
      "south_africa",

    delivery_model:
      deliveryModel,

    search_depth:
      searchDepth,

    revenue_mode:
      request.revenue_mode ??
      DEFAULT_LEAD_HUNTER_REQUEST.revenue_mode ??
      "quick_revenue",

    objectives,

    countries:
      countries.length >
      0
        ? countries
        : DEFAULT_LEAD_HUNTER_REQUEST.countries ??
          [
            "South Africa",
          ],

    provinces:
      provinces.length >
      0
        ? provinces
        : DEFAULT_LEAD_HUNTER_REQUEST.provinces ??
          [],

    cities:
      cities.length >
      0
        ? cities
        : DEFAULT_LEAD_HUNTER_REQUEST.cities ??
          [],

    suburbs,

    radius_km:
      request.radius_km ===
        null ||
      request.radius_km ===
        undefined
        ? null
        : Math.max(
            1,
            Math.min(
              500,
              Math.round(
                Number(
                  request.radius_km,
                ),
              ),
            ),
          ),

    search_everything:
      searchEverything,

    easy_wins_only:
      safeBoolean(
        request.easy_wins_only,
        DEFAULT_LEAD_HUNTER_REQUEST.easy_wins_only ??
        true,
      ),

    revenue_first:
      safeBoolean(
        request.revenue_first,
        DEFAULT_LEAD_HUNTER_REQUEST.revenue_first ??
        true,
      ),

    max_search_queries:
      maximumQueries,

    use_cached_results:
      safeBoolean(
        request.use_cached_results,
        true,
      ),

    cache_max_age_hours:
      Math.max(
        1,
        Math.min(
          168,
          Math.round(
            Number(
              request.cache_max_age_hours ??
              DEFAULT_SEARCH_CACHE_HOURS,
            ),
          ),
        ),
      ),

    exclude_competitors:
      safeBoolean(
        request.exclude_competitors,
        true,
      ),

    exclude_directories:
      safeBoolean(
        request.exclude_directories,
        true,
      ),

    exclude_expired_procurement:
      safeBoolean(
        request.exclude_expired_procurement,
        true,
      ),

    require_primary_source_for_procurement:
      safeBoolean(
        request.require_primary_source_for_procurement,
        true,
      ),

    reject_stale_opportunities:
      safeBoolean(
        request.reject_stale_opportunities,
        true,
      ),

    minimum_contactability_score:
      clampScore(
        request.minimum_contactability_score ??
        0,
      ),

    diversify_results_by_company:
      safeBoolean(
        request.diversify_results_by_company,
        true,
      ),

    diversify_results_by_sector:
      safeBoolean(
        request.diversify_results_by_sector,
        true,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* STRATEGY REQUEST                                                           */
/* -------------------------------------------------------------------------- */

export function requestFromStrategy(
  strategy: LeadHunterStrategy,
  overrides: Partial<LeadHunterSearchRequest> = {},
): LeadHunterSearchRequest {
  const defaultProvinces =
    strategy.recommended_locations.filter(
      (
        location,
      ) =>
        SOUTH_AFRICAN_PROVINCES.includes(
          location as
            (typeof SOUTH_AFRICAN_PROVINCES)[number],
        ),
    );

  const defaultCities =
    strategy.recommended_locations.filter(
      (
        location,
      ) =>
        !SOUTH_AFRICAN_PROVINCES.includes(
          location as
            (typeof SOUTH_AFRICAN_PROVINCES)[number],
        ) &&
        location !==
          "South Africa",
    );

  return validateSearchRequest({
    ...DEFAULT_LEAD_HUNTER_REQUEST,

    sector:
      strategy.target_sector,

    companies:
      strategy.companies,

    services:
      strategy.services,

    locations:
      strategy.recommended_locations,

    industries:
      strategy.industries,

    organisation_types:
      strategy.organisation_types,

    result_count:
      strategy.default_result_count,

    minimum_score:
      strategy.minimum_score,

    tender_keywords:
      strategy.target_sector ===
      "government"
        ? strategy.keywords
        : DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords:
      strategy.keywords,

    include_private_sector:
      strategy.target_sector ===
        "private" ||
      strategy.target_sector ===
        "mixed",

    include_government_sector:
      strategy.target_sector ===
        "government" ||
      strategy.target_sector ===
        "mixed",

    include_nonprofits:
      strategy.target_sector ===
        "nonprofit" ||
      strategy.target_sector ===
        "mixed",

    search_instruction:
      strategy.search_instruction ??
      `Find verified opportunities matching the ${strategy.title} strategy. Every returned prospect must be grounded in public evidence. Never invent demand, contacts or procurement information.`,

    search_scope:
      strategy.search_scope ??
      "custom",

    delivery_model:
      strategy.delivery_model ??
      "auto",

    revenue_mode:
      strategy.revenue_mode ??
      "balanced",

    objectives:
      strategy.objectives ??
      [
        "find_customers",
      ],

    countries: [
      "South Africa",
    ],

    provinces:
      defaultProvinces,

    cities:
      defaultCities,

    search_depth:
      "economy",

    max_search_queries:
      maxQueriesForDepth(
        "economy",
      ),

    ...overrides,
  });
}

/* -------------------------------------------------------------------------- */
/* CUSTOM REQUEST                                                             */
/* -------------------------------------------------------------------------- */

export function createCustomHuntRequest({
  instruction,
  services,
  companies,
  scope = "south_africa",
  deliveryModel = "auto",
  locations = [],
  provinces = [],
  cities = [],
  countries = [
    "South Africa",
  ],
  revenueMode = "quick_revenue",
  searchDepth = "economy",
}: {
  instruction: string;
  services: LeadHunterServiceCategory[];
  companies: LeadHunterCompany[];
  scope?: LeadHunterSearchScope;
  deliveryModel?: LeadHunterDeliveryModel;
  locations?: string[];
  provinces?: string[];
  cities?: string[];
  countries?: string[];
  revenueMode?: LeadHunterRevenueMode;
  searchDepth?: LeadHunterSearchDepth;
}): LeadHunterSearchRequest {
  return validateSearchRequest({
    ...DEFAULT_LEAD_HUNTER_REQUEST,

    search_instruction:
      instruction,

    services,

    companies,

    search_scope:
      scope,

    delivery_model:
      deliveryModel,

    locations,

    provinces,

    cities,

    countries,

    revenue_mode:
      revenueMode,

    search_depth:
      searchDepth,

    max_search_queries:
      maxQueriesForDepth(
        searchDepth,
      ),
  });
}

/* -------------------------------------------------------------------------- */
/* SUMMARY                                                                    */
/* -------------------------------------------------------------------------- */

export function buildHuntSummary(
  requestInput: Partial<LeadHunterSearchRequest>,
): string[] {
  const request =
    validateSearchRequest(
      requestInput,
    );

  const summary =
    [
      `Mission: ${
        request.search_instruction ??
        "Find verified prospects"
      }`,

      `Sector: ${request.sector}`,

      `Companies: ${request.companies.join(
        ", ",
      )}`,

      `Scope: ${
        request.search_scope ??
        "south_africa"
      }`,

      `Delivery model: ${
        request.delivery_model ??
        "auto"
      }`,

      `Revenue mode: ${
        request.revenue_mode ??
        "balanced"
      }`,

      `Search depth: ${
        request.search_depth ??
        "economy"
      }`,

      `Maximum search queries: ${
        request.max_search_queries ??
        maxQueriesForDepth(
          request.search_depth ??
          "economy",
        )
      }`,

      `Private sector: ${
        request.include_private_sector
          ? "YES"
          : "NO"
      }`,

      `Government: ${
        request.include_government_sector
          ? "YES"
          : "NO"
      }`,

      `Nonprofit: ${
        request.include_nonprofits
          ? "YES"
          : "NO"
      }`,

      `Require opportunity evidence: ${
        request.require_opportunity_signal
          ? "YES"
          : "NO"
      }`,

      `Reject expired procurement: ${
        request.exclude_expired_procurement
          ? "YES"
          : "NO"
      }`,

      `Services: ${request.services.join(
        ", ",
      )}`,

      `Locations: ${request.locations.join(
        ", ",
      )}`,
    ];

  if (
    request.provinces?.length
  ) {
    summary.push(
      `Provinces: ${request.provinces.join(
        ", ",
      )}`,
    );
  }

  if (
    request.cities?.length
  ) {
    summary.push(
      `Cities: ${request.cities.join(
        ", ",
      )}`,
    );
  }

  if (
    request.organisation_types.length >
    0
  ) {
    summary.push(
      `Buyer types: ${request.organisation_types.join(
        ", ",
      )}`,
    );
  }

  return summary;
}

/* -------------------------------------------------------------------------- */
/* REQUEST MATCHING                                                           */
/* -------------------------------------------------------------------------- */

function sectorAllowedForRequest(
  request: LeadHunterSearchRequest,
  sector: LeadHunterSector,
): boolean {
  if (
    request.sector !==
      "mixed" &&
    request.sector !==
      sector
  ) {
    return false;
  }

  if (
    sector ===
    "private"
  ) {
    return (
      request.include_private_sector
    );
  }

  if (
    sector ===
    "government"
  ) {
    return (
      request.include_government_sector
    );
  }

  if (
    sector ===
    "nonprofit"
  ) {
    return (
      request.include_nonprofits
    );
  }

  return false;
}

function isProcurementProspect(
  prospect: LeadHunterProspect,
): boolean {
  return [
    "tender",
    "rfq",
    "rfp",
    "supplier_opportunity",
    "product_supply_opportunity",
  ].includes(
    prospect.classification,
  );
}

function hasPrimaryEvidence(
  prospect: LeadHunterProspect,
): boolean {
  return prospect.evidence.some(
    (
      evidence,
    ) =>
      evidence.is_primary_source ===
        true ||
      evidence.is_official_source ===
        true ||
      (
        evidence.source_quality_score ??
        0
      ) >=
        90,
  );
}

/* -------------------------------------------------------------------------- */
/* COMMERCIAL SORTING                                                         */
/* -------------------------------------------------------------------------- */

function commercialScore(
  prospect: LeadHunterProspect,
  request: LeadHunterSearchRequest,
): number {
  let score =
    prospect.total_score *
      0.28 +
    prospect.revenue_potential_score *
      0.22 +
    prospect.ease_to_close_score *
      0.18 +
    prospect.contactability_score *
      0.12 +
    (
      prospect.verification_confidence ??
      prospect.evidence_score
    ) *
      0.1 +
    (
      prospect.freshness_score ??
      prospect.timing_score
    ) *
      0.1;

  if (
    request.revenue_mode ===
    "recurring_revenue"
  ) {
    score +=
      prospect.recurring_revenue_score *
      0.2;
  }

  if (
    request.revenue_mode ===
    "quick_revenue"
  ) {
    score +=
      prospect.ease_to_close_score *
      0.15;

    score +=
      prospect.contactability_score *
      0.1;
  }

  if (
    request.revenue_mode ===
    "high_value"
  ) {
    score +=
      prospect.revenue_potential_score *
      0.2;
  }

  if (
    prospect.sales_priority ===
    "hot"
  ) {
    score +=
      10;
  }

  if (
    prospect.pursuit_risk ===
    "high"
  ) {
    score -=
      15;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* HUNT                                                                       */
/* -------------------------------------------------------------------------- */

export async function huntProspects(
  request: Partial<LeadHunterSearchRequest>,
  signal?: AbortSignal,
): Promise<LeadHunterSearchResponse> {
  const validatedRequest =
    validateSearchRequest(
      request,
    );

  const {
    data: {
      session,
    },

    error:
      sessionError,
  } =
    await supabase.auth.getSession();

  if (
    sessionError
  ) {
    throw new Error(
      `Lead Hunter authentication failed: ${sessionError.message}`,
    );
  }

  if (
    !session
  ) {
    throw new Error(
      "Your session has expired. Sign in again before running the Lead Hunter.",
    );
  }

  const response =
    await fetch(
      LEAD_HUNTER_SEARCH_ENDPOINT,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body:
          JSON.stringify(
            validatedRequest,
          ),

        signal,
      },
    );

  if (
    !response.ok
  ) {
    const message =
      await response
        .text()
        .catch(
          () =>
            "",
        );

    throw new Error(
      message ||
      `Lead Hunter search failed (${response.status}).`,
    );
  }

  const payload =
    (
      await response.json()
    ) as Partial<LeadHunterSearchResponse>;

  const effectiveRequest =
    payload.request
      ? validateSearchRequest(
          payload.request,
        )
      : validatedRequest;

  const prospects =
    Array.isArray(
      payload.prospects,
    )
      ? payload.prospects.map(
          validateProspect,
        )
      : [];

  const acceptedProspects =
    prospects
      .filter(
        (
          prospect,
        ) => {
          if (
            prospect.verification_status ===
            "rejected"
          ) {
            return false;
          }

          if (
            !sectorAllowedForRequest(
              effectiveRequest,
              prospect.sector,
            )
          ) {
            return false;
          }

          if (
            !effectiveRequest.services.includes(
              prospect.recommended_service,
            )
          ) {
            return false;
          }

          if (
            !effectiveRequest.companies.includes(
              prospect.recommended_company,
            )
          ) {
            return false;
          }

          if (
            !companyCanDeliverService(
              prospect.recommended_company,
              prospect.recommended_service,
            )
          ) {
            return false;
          }

          if (
            prospect.total_score <
            effectiveRequest.minimum_score
          ) {
            return false;
          }

          if (
            prospect.evidence.length <
            effectiveRequest.minimum_evidence_sources
          ) {
            return false;
          }

          if (
            prospect.contactability_score <
            (
              effectiveRequest.minimum_contactability_score ??
              0
            )
          ) {
            return false;
          }

          if (
            effectiveRequest.require_public_phone_or_email &&
            !prospect.public_phone &&
            !prospect.public_email
          ) {
            return false;
          }

          if (
            effectiveRequest.require_website &&
            !prospect.website
          ) {
            return false;
          }

          if (
            effectiveRequest.require_opportunity_signal &&
            (
              prospect.signals.length ===
                0 ||
              prospect.signals.every(
                (
                  signalItem,
                ) =>
                  signalItem.type ===
                  "general_fit",
              )
            )
          ) {
            return false;
          }

          if (
            effectiveRequest.exclude_expired_procurement &&
            isProcurementProspect(
              prospect,
            ) &&
            (
              prospect.procurement_status ===
                "expired" ||
              prospect.procurement_status ===
                "closed" ||
              opportunityHasExpired(
                prospect.opportunity_closing_date ??
                null,
              )
            )
          ) {
            return false;
          }

          if (
            effectiveRequest.require_primary_source_for_procurement &&
            isProcurementProspect(
              prospect,
            ) &&
            !hasPrimaryEvidence(
              prospect,
            )
          ) {
            return false;
          }

          if (
            effectiveRequest.reject_stale_opportunities &&
            isProcurementProspect(
              prospect,
            ) &&
            (
              prospect.freshness_score ??
              0
            ) <
              25
          ) {
            return false;
          }

          return true;
        },
      )
      .sort(
        (
          first,
          second,
        ) => {
          if (
            effectiveRequest.revenue_first
          ) {
            return (
              commercialScore(
                second,
                effectiveRequest,
              ) -
              commercialScore(
                first,
                effectiveRequest,
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
        effectiveRequest.result_count,
      );

  const rejectedCount =
    prospects.length -
    acceptedProspects.length;

  const payloadSourceCount =
    safeNumber(
      payload.source_count,
    );

  const payloadRejectedCount =
    safeNumber(
      payload.rejected_count,
    );

  const providerTrace =
    Array.isArray(
      payload.provider_trace,
    )
      ? payload.provider_trace
      : undefined;

  return {
    hunt_id:
      cleanText(
        payload.hunt_id,
      ) ??
      createClientId(),

    status:
      "completed",

    searched_at:
      normaliseDate(
        payload.searched_at,
      ) ??
      new Date().toISOString(),

    completed_at:
      normaliseDate(
        payload.completed_at,
      ) ??
      new Date().toISOString(),

    request:
      effectiveRequest,

    prospects:
      acceptedProspects,

    source_count:
      payloadSourceCount ??
      acceptedProspects.reduce(
        (
          total,
          prospect,
        ) =>
          total +
          prospect.evidence.length,
        0,
      ),

    accepted_count:
      acceptedProspects.length,

    rejected_count:
      payloadRejectedCount ??
      rejectedCount,

    warnings:
      Array.isArray(
        payload.warnings,
      )
        ? uniqueTexts(
            payload.warnings,
            30,
          )
        : [],

    providers_used:
      Array.isArray(
        payload.providers_used,
      )
        ? uniqueTexts(
            payload.providers_used,
            15,
          )
        : [],

    provider_trace:
      providerTrace,
  };
}

/* -------------------------------------------------------------------------- */
/* CRM DUPLICATES                                                             */
/* -------------------------------------------------------------------------- */

export async function findCrmDuplicates(
  prospect: LeadHunterProspect,
): Promise<CrmDuplicateMatch[]> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "leads",
      )
      .select(
        "id,name,full_name,company,phone,email,source,status,score,created_at",
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        MAX_CRM_DUPLICATE_SCAN,
      );

  if (
    error
  ) {
    throw new Error(
      `Unable to check CRM duplicates: ${error.message}`,
    );
  }

  const prospectPhone =
    normalisePhone(
      prospect.public_phone,
    );

  const prospectEmail =
    normaliseEmail(
      prospect.public_email,
    );

  return (
    data ??
    []
  )
    .map(
      (
        row: Record<string, unknown>,
      ) => {
        const rowName =
          cleanText(
            row.company,
          ) ??
          cleanText(
            row.full_name,
          ) ??
          cleanText(
            row.name,
          ) ??
          "Unnamed lead";

        const matchReasons:
          string[] =
          [];

        if (
          sameEmail(
            prospectEmail,
            normaliseEmail(
              row.email,
            ),
          )
        ) {
          matchReasons.push(
            "Same email address",
          );
        }

        if (
          samePhone(
            prospectPhone,
            normalisePhone(
              row.phone,
            ),
          )
        ) {
          matchReasons.push(
            "Same phone number",
          );
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
          id:
            String(
              row.id,
            ),

          name:
            cleanText(
              row.full_name,
            ) ??
            cleanText(
              row.name,
            ) ??
            rowName,

          company:
            cleanText(
              row.company,
            ),

          phone:
            normalisePhone(
              row.phone,
            ),

          email:
            normaliseEmail(
              row.email,
            ),

          source:
            cleanText(
              row.source,
            ),

          status:
            cleanText(
              row.status,
            ) ??
            "New",

          score:
            clampScore(
              row.score,
            ),

          created_at:
            cleanText(
              row.created_at,
            ) ??
            "",

          match_reasons:
            matchReasons,
        } satisfies CrmDuplicateMatch;
      },
    )
    .filter(
      (
        match,
      ) =>
        match.match_reasons.length >
        0,
    );
}

/* -------------------------------------------------------------------------- */
/* CRM NOTES                                                                  */
/* -------------------------------------------------------------------------- */

function formatProspectEvidence(
  prospect: LeadHunterProspect,
): string {
  const evidenceLines =
    prospect.evidence.map(
      (
        evidence,
        index,
      ) =>
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

          evidence.source_quality_score !==
          undefined
            ? `Source quality: ${evidence.source_quality_score}/100`
            : null,

          evidence.excerpt
            ? `Evidence: ${evidence.excerpt}`
            : null,
        ]
          .filter(
            Boolean,
          )
          .join(
            "\n",
          ),
    );

  return [
    "Cossa Lead Hunter verified public prospect.",

    "",

    `Organisation: ${prospect.organisation_name}`,

    `Sector: ${prospect.sector}`,

    `Industry: ${
      prospect.industry ??
      "Not confirmed"
    }`,

    `Organisation type: ${
      prospect.organisation_type ??
      "Not confirmed"
    }`,

    `Website: ${
      prospect.website ??
      "Not found"
    }`,

    `Public phone: ${
      prospect.public_phone ??
      "Not found"
    }`,

    `Public email: ${
      prospect.public_email ??
      "Not found"
    }`,

    `Location: ${[
      prospect.address,
      prospect.suburb,
      prospect.city,
      prospect.province,
      prospect.country,
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      )}`,

    "",

    `Recommended Cossa company: ${prospect.recommended_company}`,

    `Recommended service: ${prospect.recommended_service}`,

    `Service fit: ${prospect.service_fit_reason}`,

    "",

    `Opportunity: ${prospect.opportunity_summary}`,

    `Opportunity size: ${prospect.opportunity_size}`,

    `Estimated value: ${
      prospect.estimated_value !==
      null
        ? `R${prospect.estimated_value.toFixed(
            2,
          )}`
        : "Not verified"
    }`,

    prospect.tender_reference
      ? `Tender / RFQ reference: ${prospect.tender_reference}`
      : null,

    prospect.procurement_status &&
    prospect.procurement_status !==
      "not_applicable"
      ? `Procurement status: ${prospect.procurement_status}`
      : null,

    prospect.opportunity_closing_date
      ? `Closing date: ${prospect.opportunity_closing_date}`
      : null,

    "",

    `Classification: ${prospect.classification}`,

    `Verification: ${prospect.verification_status}`,

    `Verification confidence: ${
      prospect.verification_confidence ??
      0
    }/100`,

    `Sales priority: ${prospect.sales_priority}`,

    `Pursuit risk: ${
      prospect.pursuit_risk ??
      "unknown"
    }`,

    `Total score: ${prospect.total_score}/100`,

    `Revenue potential: ${prospect.revenue_potential_score}/100`,

    `Ease to close: ${prospect.ease_to_close_score}/100`,

    `Recurring revenue potential: ${prospect.recurring_revenue_score}/100`,

    `Freshness: ${
      prospect.freshness_score ??
      0
    }/100`,

    `Data quality: ${
      prospect.data_quality_score ??
      0
    }/100`,

    `Date verified: ${prospect.date_verified}`,

    "",

    "WHY CONTACT",

    ...(
      prospect.why_contact.length >
      0
        ? prospect.why_contact.map(
            (
              reason,
            ) =>
              `- ${reason}`,
          )
        : [
            "- No additional commercial reason supplied.",
          ]
    ),

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
    .filter(
      Boolean,
    )
    .join(
      "\n",
    );
}

/* -------------------------------------------------------------------------- */
/* SAVE TO CRM                                                                */
/* -------------------------------------------------------------------------- */

export async function saveProspectToCrm(
  prospectInput: LeadHunterProspect,
  options: {
    allowPossibleDuplicate?: boolean;
  } = {},
): Promise<SaveProspectResult> {
  const prospect =
    validateProspect(
      prospectInput,
    );

  if (
    prospect.verification_status ===
    "rejected"
  ) {
    throw new Error(
      `This prospect cannot be saved because it failed verification: ${prospect.rejection_reasons.join(
        " ",
      )}`,
    );
  }

  if (
    !prospect.primary_source_url
  ) {
    throw new Error(
      "A verified public source URL is required before saving a prospect.",
    );
  }

  if (
    isProcurementProspect(
      prospect,
    ) &&
    (
      prospect.procurement_status ===
        "expired" ||
      prospect.procurement_status ===
        "closed"
    )
  ) {
    throw new Error(
      "This procurement opportunity is closed or expired and cannot be saved as an active opportunity.",
    );
  }

  const duplicateMatches =
    await findCrmDuplicates(
      prospect,
    );

  const strongestDuplicate =
    duplicateMatches.find(
      (
        match,
      ) =>
        match.match_reasons.some(
          (
            reason,
          ) =>
            reason ===
              "Same email address" ||
            reason ===
              "Same phone number",
        ),
    ) ??
    duplicateMatches[0] ??
    null;

  if (
    strongestDuplicate &&
    !options.allowPossibleDuplicate
  ) {
    return {
      lead_id:
        strongestDuplicate.id,

      created:
        false,

      duplicate:
        true,

      duplicate_match:
        strongestDuplicate,
    };
  }

  const contactName =
    prospect.contact_name ??
    prospect.organisation_name;

  const qualifiedClassifications:
    ProspectClassification[] =
    [
      "active_opportunity",
      "tender",
      "rfq",
      "rfp",
      "supplier_opportunity",
      "subcontracting_opportunity",
      "product_supply_opportunity",
    ];

  const crmStatus =
    qualifiedClassifications.includes(
      prospect.classification,
    )
      ? "Qualified"
      : "New";

  const estimatedValue =
    prospect.estimated_value ??
    0;

  const {
    data,
    error,
  } =
    await db
      .from(
        "leads",
      )
      .insert({
        full_name:
          contactName,

        name:
          contactName,

        company:
          prospect.organisation_name,

        phone:
          prospect.public_phone,

        email:
          prospect.public_email,

        service:
          prospect.recommended_service,

        location: [
          prospect.suburb,
          prospect.city,
          prospect.province,
          prospect.country,
        ]
          .filter(
            Boolean,
          )
          .join(
            ", ",
          ),

        source:
          "cossa_verified_lead_hunter",

        status:
          crmStatus,

        stage:
          crmStatus,

        notes:
          formatProspectEvidence(
            prospect,
          ),

        score:
          prospect.total_score,

        value:
          estimatedValue,

        estimated_value:
          estimatedValue,

        next_follow_up:
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            ),

        updated_at:
          new Date().toISOString(),
      })
      .select(
        "id",
      )
      .single();

  if (
    error
  ) {
    throw new Error(
      `Unable to save the verified prospect to CRM: ${error.message}`,
    );
  }

  if (
    !data?.id
  ) {
    throw new Error(
      "The prospect was not saved because Supabase returned no lead ID.",
    );
  }

  return {
    lead_id:
      String(
        data.id,
      ),

    created:
      true,

    duplicate:
      false,

    duplicate_match:
      null,
  };
}

/* -------------------------------------------------------------------------- */
/* BULK CRM SAVE                                                              */
/* -------------------------------------------------------------------------- */

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
  const created:
    SaveProspectResult[] =
    [];

  const duplicates:
    SaveProspectResult[] =
    [];

  const failed: Array<{
    prospect: LeadHunterProspect;
    error: string;
  }> = [];

  for (
    const prospect of
    prospects
  ) {
    try {
      const result =
        await saveProspectToCrm(
          prospect,
        );

      if (
        result.duplicate
      ) {
        duplicates.push(
          result,
        );
      } else {
        created.push(
          result,
        );
      }
    } catch (
      error
    ) {
      failed.push({
        prospect,

        error:
          error instanceof
          Error
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

/* -------------------------------------------------------------------------- */
/* CSV EXPORT                                                                 */
/* -------------------------------------------------------------------------- */

export function exportProspectsToCsv(
  prospects: LeadHunterProspect[],
): string {
  const headers =
    [
      "Organisation",
      "Sector",
      "Industry",
      "Organisation Type",

      "Website",
      "Public Phone",
      "Public Email",

      "City",
      "Province",
      "Country",

      "Recommended Company",
      "Recommended Service",

      "Opportunity",
      "Opportunity Size",
      "Estimated Value",

      "Classification",
      "Procurement Status",
      "Tender / RFQ Reference",
      "Closing Date",

      "Verification",
      "Verification Confidence",
      "Sales Priority",
      "Pursuit Risk",

      "Score",
      "Fit",
      "Intent",
      "Evidence",
      "Timing",
      "Contactability",

      "Revenue Potential",
      "Ease to Close",
      "Recurring Revenue Potential",

      "Freshness",
      "Data Quality",
      "Source Diversity",

      "Primary Source",
      "Date Verified",

      "Decision Maker Route",
      "Next Action",
      "Outreach Angle",
    ];

  const escapeCsv =
    (
      value: unknown,
    ) => {
      const string =
        String(
          value ??
          "",
        );

      return `"${string.replace(
        /"/g,
        '""',
      )}"`;
    };

  const rows =
    prospects.map(
      (
        prospect,
      ) => [
        prospect.organisation_name,
        prospect.sector,
        prospect.industry,
        prospect.organisation_type,

        prospect.website,
        prospect.public_phone,
        prospect.public_email,

        prospect.city,
        prospect.province,
        prospect.country,

        prospect.recommended_company,
        prospect.recommended_service,

        prospect.opportunity_summary,
        prospect.opportunity_size,
        prospect.estimated_value,

        prospect.classification,
        prospect.procurement_status,
        prospect.tender_reference,
        prospect.opportunity_closing_date,

        prospect.verification_status,
        prospect.verification_confidence,
        prospect.sales_priority,
        prospect.pursuit_risk,

        prospect.total_score,
        prospect.fit_score,
        prospect.intent_score,
        prospect.evidence_score,
        prospect.timing_score,
        prospect.contactability_score,

        prospect.revenue_potential_score,
        prospect.ease_to_close_score,
        prospect.recurring_revenue_score,

        prospect.freshness_score,
        prospect.data_quality_score,
        prospect.source_diversity_score,

        prospect.primary_source_url,
        prospect.date_verified,

        prospect.decision_maker_route,
        prospect.next_action,
        prospect.outreach_angle,
      ],
    );

  return [
    headers
      .map(
        escapeCsv,
      )
      .join(
        ",",
      ),

    ...rows.map(
      (
        row,
      ) =>
        row
          .map(
            escapeCsv,
          )
          .join(
            ",",
          ),
    ),
  ].join(
    "\n",
  );
}
