// Production Lead Hunter data and verification layer.
//
// Responsibilities:
// - Define revenue-focused private and public-sector hunting strategies.
// - Support guided searches and custom natural-language search instructions.
// - Separate physical, remote and hybrid service opportunities.
// - Support local, provincial, national, African and worldwide targeting.
// - Request verified public prospect research from a secure server endpoint.
// - Validate returned evidence before displaying or saving prospects.
// - Reject invented, incomplete or unsupported prospect records.
// - Preserve server-side scoring and server-normalised hunt instructions.
// - Reconcile explicit natural-language mission instructions with UI selections.
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

export const MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH = 2_500;
export const DEFAULT_MAX_SEARCH_QUERIES = 5;
export const MAX_ALLOWED_SEARCH_QUERIES = 10;
export const DEFAULT_SEARCH_CACHE_HOURS = 24;

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
  | "logo_design"
  | "branding"
  | "seo"
  | "digital_marketing"
  | "social_media_management"
  | "google_business_profile"
  | "lead_generation"
  | "crm"
  | "ai_automation"
  | "business_documents"
  | "quotations"
  | "proposals"
  | "contracts"
  | "ecommerce"
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
  | "supplier_opportunity"
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
  | "company_directory"
  | "business_profile"
  | "job_posting"
  | "news_report"
  | "social_profile"
  | "contact_page"
  | "website_audit"
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
  /** Internal public-identity keys used only to prevent duplicate results. */
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

  search_instruction?: string;
  search_scope?: LeadHunterSearchScope;
  delivery_model?: LeadHunterDeliveryModel;
  revenue_mode?: LeadHunterRevenueMode;
  objectives?: LeadHunterObjective[];
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

export const PHYSICAL_SERVICE_CATEGORIES:
  LeadHunterServiceCategory[] = [
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
  ];

export const REMOTE_SERVICE_CATEGORIES:
  LeadHunterServiceCategory[] = [
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
    "business_documents",
    "quotations",
    "proposals",
    "contracts",
    "ecommerce",
  ];

export const SEARCH_SCOPE_OPTIONS: Array<{
  value: LeadHunterSearchScope;
  label: string;
  description: string;
}> = [
  {
    value: "local",
    label: "Local area",
    description:
      "Search nearby cities, suburbs or a defined service radius.",
  },
  {
    value: "city",
    label: "Selected cities",
    description:
      "Search only the cities and surrounding areas entered.",
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
      "Search nationally across all nine provinces.",
  },
  {
    value: "africa",
    label: "Africa",
    description:
      "Search selected African countries for remotely deliverable services.",
  },
  {
    value: "worldwide",
    label: "Worldwide",
    description:
      "Search international markets for remote digital services.",
  },
  {
    value: "custom",
    label: "Custom locations",
    description:
      "Use your exact countries, provinces, cities and suburbs.",
  },
  {
    value: "unrestricted",
    label: "No geographic restriction",
    description:
      "Let service delivery and opportunity quality determine the market.",
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
      "Lowest credit use. Best for frequent first-customer searches.",
    maximumQueries: 3,
  },
  {
    value: "standard",
    label: "Standard",
    description:
      "Balanced coverage and verification.",
    maximumQueries: 5,
  },
  {
    value: "deep",
    label: "Deep",
    description:
      "Broader investigation. Use only for valuable or difficult searches.",
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
      "Prioritise smaller jobs and reachable customers that can close faster.",
  },
  {
    value: "easy_wins",
    label: "Easy wins",
    description:
      "Prioritise clear service gaps, verified contacts and lower pursuit effort.",
  },
  {
    value: "recurring_revenue",
    label: "Recurring revenue",
    description:
      "Prioritise maintenance, cleaning, marketing and support retainers.",
  },
  {
    value: "high_value",
    label: "High-value work",
    description:
      "Prioritise larger opportunities with stronger commercial value.",
  },
  {
    value: "strategic",
    label: "Strategic",
    description:
      "Prioritise frameworks, supplier routes and long-term accounts.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Balance immediate revenue, evidence, contactability and long-term value.",
  },
];

export const LEAD_HUNTER_STRATEGIES: LeadHunterStrategy[] = [
  {
    id: "first-paying-customers",
    title: "Find Our First Paying Customers",
    description:
      "Prioritise real, reachable organisations with a clear service gap, public contact details and a practical opportunity that Cossa can pursue immediately.",
    target_sector: "mixed",
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
    ],
    organisation_types: [
      "Small business",
      "Property manager",
      "School",
      "Church",
      "Office",
      "Retail store",
      "Professional-services firm",
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
    ],
    recommended_locations: [
      "Pretoria",
      "Centurion",
      "Midrand",
      "Johannesburg",
      "Gauteng",
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 15,
    search_instruction:
      "Find reachable organisations with a publicly evidenced service gap that Cossa can realistically convert into a first paying customer. Prioritise verified contact details, low pursuit effort, immediate need and practical deal size.",
    search_scope: "south_africa",
    delivery_model: "auto",
    revenue_mode: "quick_revenue",
    objectives: [
      "find_customers",
      "find_immediate_cashflow",
    ],
  },

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
    search_scope: "province",
    delivery_model: "physical",
    revenue_mode: "recurring_revenue",
    objectives: [
      "find_customers",
      "find_maintenance_needs",
      "find_cleaning_contracts",
      "find_recurring_contracts",
    ],
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
    search_scope: "province",
    delivery_model: "hybrid",
    revenue_mode: "balanced",
    objectives: [
      "find_customers",
      "find_projects",
      "find_active_tenders",
      "find_rfqs",
    ],
  },

  {
    id: "churches-and-nonprofits",
    title: "Churches and Nonprofit Organisations",
    description:
      "Find churches, community centres, charities and nonprofit organisations needing renovations, cleaning, websites, branding, marketing, documents or operational systems.",
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
      "logo_design",
      "branding",
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
      "church logo",
    ],
    opportunity_signals: [
      "renovation_need",
      "maintenance_need",
      "website_problem",
      "branding_problem",
      "inactive_marketing",
      "document_need",
    ],
    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 20,
    search_scope: "south_africa",
    delivery_model: "hybrid",
    revenue_mode: "easy_wins",
    objectives: [
      "find_customers",
      "find_projects",
      "find_weak_websites",
      "find_branding_gaps",
    ],
  },

  {
    id: "retail-and-shopping-centres",
    title: "Retailers and Shopping Centres",
    description:
      "Find shopping centres, retail stores, restaurants and franchise locations needing fit-outs, maintenance, cleaning, websites, branding, marketing or customer-growth support.",
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
      "logo_design",
      "branding",
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
      "website upgrade",
      "brand redesign",
    ],
    opportunity_signals: [
      "new_branch",
      "business_expansion",
      "renovation_need",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "branding_problem",
    ],
    recommended_locations: [
      ...PRIORITY_GAUTENG_LOCATIONS,
      "South Africa",
    ],
    minimum_score: 60,
    default_result_count: 20,
    search_scope: "south_africa",
    delivery_model: "hybrid",
    revenue_mode: "balanced",
    objectives: [
      "find_customers",
      "find_projects",
      "find_recurring_contracts",
      "find_marketing_gaps",
    ],
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
    search_scope: "province",
    delivery_model: "hybrid",
    revenue_mode: "recurring_revenue",
    objectives: [
      "find_customers",
      "find_maintenance_needs",
      "find_cleaning_contracts",
      "find_recurring_contracts",
    ],
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
      "missing WhatsApp",
    ],
    opportunity_signals: [
      "website_problem",
      "mobile_website_problem",
      "missing_contact_form",
      "missing_whatsapp",
      "seo_gap",
      "inactive_marketing",
      "technology_need",
    ],
    recommended_locations: [
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 20,
    search_instruction:
      "Find real businesses whose official websites show a specific, verifiable conversion, mobile, design, SEO, contact-form or WhatsApp weakness. Do not treat website-design companies or marketing agencies as prospects.",
    search_scope: "south_africa",
    delivery_model: "remote",
    revenue_mode: "easy_wins",
    objectives: [
      "find_customers",
      "find_weak_websites",
      "find_marketing_gaps",
      "find_technology_gaps",
    ],
  },

  {
    id: "logo-and-branding-upgrades",
    title: "Logo and Branding Upgrade Prospects",
    description:
      "Find real organisations with weak, inconsistent, outdated or missing public branding that may benefit from Cossa Tech branding services.",
    target_sector: "private",
    companies: [
      "cossa_tech",
      "cossa_ai_growth",
    ],
    services: [
      "logo_design",
      "branding",
      "website_design",
      "digital_marketing",
    ],
    organisation_types: [
      "Small business",
      "Contractor",
      "Restaurant",
      "Retailer",
      "Professional-services firm",
      "Nonprofit organisation",
    ],
    industries: [
      "Local services",
      "Retail",
      "Hospitality",
      "Construction",
      "Professional services",
    ],
    keywords: [
      "outdated logo",
      "inconsistent branding",
      "low quality logo",
      "missing brand identity",
      "website logo mismatch",
      "branding redesign",
    ],
    opportunity_signals: [
      "branding_problem",
      "missing_logo",
      "website_problem",
      "inactive_marketing",
    ],
    recommended_locations: [
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 15,
    search_instruction:
      "Find legitimate organisations with public evidence of weak, inconsistent, outdated or missing branding. Exclude design agencies, marketing agencies, logo designers and competitors.",
    search_scope: "south_africa",
    delivery_model: "remote",
    revenue_mode: "easy_wins",
    objectives: [
      "find_customers",
      "find_branding_gaps",
      "find_marketing_gaps",
    ],
  },

  {
    id: "inactive-social-profiles",
    title: "Businesses with Inactive Marketing",
    description:
      "Find real businesses whose public marketing presence appears inactive and prepare honest growth-service opportunities supported by evidence.",
    target_sector: "private",
    companies: [
      "cossa_ai_growth",
      "cossa_tech",
    ],
    services: [
      "digital_marketing",
      "social_media_management",
      "google_business_profile",
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
      "weak_google_profile",
      "seo_gap",
      "poor_customer_experience",
    ],
    recommended_locations: [
      "Gauteng",
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 20,
    search_scope: "south_africa",
    delivery_model: "remote",
    revenue_mode: "recurring_revenue",
    objectives: [
      "find_customers",
      "find_marketing_gaps",
      "find_recurring_contracts",
    ],
  },

  {
    id: "municipal-tenders",
    title: "Municipal Tenders and RFQs",
    description:
      "Find current official municipal tenders, quotations, supplier invitations and procurement notices matching Cossa services.",
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
    minimum_score: 70,
    default_result_count: 15,
    search_scope: "south_africa",
    delivery_model: "hybrid",
    revenue_mode: "balanced",
    objectives: [
      "find_active_tenders",
      "find_rfqs",
      "find_supplier_registrations",
    ],
  },

  {
    id: "provincial-and-national-procurement",
    title: "Provincial and National Government Procurement",
    description:
      "Find current verified opportunities from departments, public entities, hospitals, schools, agencies and state-owned organisations.",
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
    minimum_score: 75,
    default_result_count: 15,
    search_scope: "south_africa",
    delivery_model: "hybrid",
    revenue_mode: "strategic",
    objectives: [
      "find_active_tenders",
      "find_rfqs",
      "find_supplier_registrations",
    ],
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
      "logo_design",
      "branding",
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
      "logo redesign",
      "request for quotation",
      "urgent maintenance",
    ],
    opportunity_signals: [
      "request_for_quote",
      "maintenance_need",
      "cleaning_need",
      "website_problem",
      "branding_problem",
      "document_need",
    ],
    recommended_locations: [
      "Pretoria",
      "Centurion",
      "Midrand",
      "Johannesburg",
      "Gauteng",
      "South Africa",
    ],
    minimum_score: 55,
    default_result_count: 15,
    search_scope: "south_africa",
    delivery_model: "auto",
    revenue_mode: "quick_revenue",
    objectives: [
      "find_customers",
      "find_projects",
      "find_immediate_cashflow",
    ],
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
  ],

  locations: [
    "Pretoria",
    "Centurion",
    "Midrand",
    "Johannesburg",
    "Gauteng",
    "South Africa",
  ],

  industries: [],
  organisation_types: [],

  result_count: DEFAULT_HUNT_RESULTS,

  minimum_score: 55,
  minimum_evidence_sources: 1,

  include_small_projects: true,
  include_large_projects: true,
  include_private_sector: true,
  include_government_sector: true,
  include_nonprofits: true,

  require_public_phone_or_email: true,
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
    "website redesign",
    "outdated website",
    "logo redesign",
    "branding",
    "SEO",
    "marketing",
    "lead generation",
    "business documents",
  ],

  verified_sources_only: true,
  exclude_existing_crm_leads: true,

  notes: null,

  search_instruction:
    "Find verified, contactable organisations with a clear service opportunity that Cossa can realistically pursue. Prioritise evidence quality, immediate revenue potential, ease of contact and practical next actions.",

  search_scope: "south_africa",
  delivery_model: "auto",
  search_depth: "economy",
  revenue_mode: "quick_revenue",

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

  suburbs: [],

  radius_km: null,

  search_everything: false,
  easy_wins_only: true,
  revenue_first: true,

  // Economy must actually remain Economy.
  max_search_queries: 3,

  use_cached_results: true,
  cache_max_age_hours: DEFAULT_SEARCH_CACHE_HOURS,

  exclude_competitors: true,
  exclude_directories: true,
  exclude_expired_procurement: true,
};

function cleanText(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
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

  return cleaned || null;
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

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    );

  return valid
    ? email
    : null;
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

  return phone.length >= 9
    ? phone
    : null;
}

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
        text.startsWith(
          "http",
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

    return url.toString();
  } catch {
    return null;
  }
}

function clampScore(
  value: unknown,
): number {
  const score =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      score,
    )
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

function safeBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
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
    (value: string) =>
      value
        .toLowerCase()
        .replace(
          /\b(pty|ltd|limited|inc|cc|company|holdings)\b/g,
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

  return Boolean(
    a &&
      b &&
      (
        a === b ||
        a.includes(
          b,
        ) ||
        b.includes(
          a,
        )
      ),
  );
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

export function isPhysicalService(
  service:
    LeadHunterServiceCategory,
): boolean {
  return PHYSICAL_SERVICE_CATEGORIES.includes(
    service,
  );
}

export function isRemoteService(
  service:
    LeadHunterServiceCategory,
): boolean {
  return REMOTE_SERVICE_CATEGORIES.includes(
    service,
  );
}

export function inferDeliveryModel(
  services:
    LeadHunterServiceCategory[],
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

export function maxQueriesForDepth(
  depth:
    LeadHunterSearchDepth,
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

/*
 * Extract structured mission fields.
 *
 * Supports instructions such as:
 *
 * Company: Cossa Nexus Construction
 * Services: Construction Renovation Property Maintenance
 * Location: Pretoria Centurion Gauteng
 * Results: 10
 * Minimum score: 50
 * Private sector: YES
 * Government: NO
 */
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

/*
 * Boolean instruction fields often appear immediately before free-form prose.
 * `extractMissionField` intentionally captures longer text fields, so it can
 * include that prose when the boolean field is the final structured line.
 * Read the leading boolean token directly instead.
 */
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
    match?.[1]?.toLowerCase();

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
    company:
      LeadHunterCompany;
    pattern: RegExp;
  }> = [
    {
      company:
        "cossa_nexus_construction",
      pattern:
        /\bcossa\s+nexus\s+construction(?:s)?\b/i,
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
        /\bcossa\s+ai\s+growth\b/i,
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

  /*
   * Service selection belongs to the form controls. Natural-language missions
   * often name a Cossa subsidiary or describe competitors to exclude (for
   * example "Cossa Nexus Construction" or "reject cleaning companies").
   * Those mentions must never silently reduce a multi-service hunt to the
   * one service word they contain.
   *
   * Only an explicit `Services:` field can deliberately replace the selected
   * service list.
   */
  if (!serviceField) {
    return [];
  }

  const searchable =
    serviceField;

  const matches:
    LeadHunterServiceCategory[] =
    [];

  const patterns: Array<{
    service:
      LeadHunterServiceCategory;
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
        /\btiling\b/i,
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
        /\bwebsite\s+(?:design|redesign|development|upgrade)\b|\bweb\s+design\b/i,
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
        /\bai\s+automation\b|\bworkflow\s+automation\b/i,
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
        "ecommerce",
      pattern:
        /\be-?commerce\b|\bonline store\b/i,
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
            (
              item,
            ) =>
              cleanText(
                item,
              ),
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
    ) =>
      new RegExp(
        `\\b${location.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}\\b`,
        "i",
      ).test(
        instruction,
      ),
  );
}

/*
 * When a mission names the buyer types directly, they take priority over
 * broad values left in the form from a previous hunt. This keeps a small
 * search budget focused on the customers the user asked for.
 */
function inferBuyerTargetsFromInstruction(
  instruction: string,
): string[] {
  const clause =
    instruction.match(
      /\b(?:find|target|return)\s+(?:(?:private|public|government|nonprofit)\s+)?([^.\n!]{3,180}?)(?=\s+(?:that|who)\s+(?:could|can|may|need|needs|want|wants|have|has)\b|\s+needing\b)/i,
    )?.[1];

  if (
    !clause
  ) {
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
          (item) =>
            cleanText(
              item,
            ),
        )
        .filter(
          (item): item is string =>
            typeof item ===
              "string" &&
            !genericTarget.test(
              item,
            ),
        ),
    ),
  ].slice(
    0,
    6,
  );
}

/*
 * Natural-language mission reconciliation.
 *
 * This does NOT attempt unrestricted AI guessing.
 * It only applies explicit, high-confidence instructions.
 *
 * Therefore:
 * "Company: Cossa Nexus Construction"
 * really searches Construction.
 *
 * "Government: NO"
 * really disables government.
 *
 * "Services: Construction Renovation Property Maintenance"
 * really removes unrelated cleaning/marketing/technology services.
 */
function applyInstructionIntent(
  request:
    Partial<LeadHunterSearchRequest>,
): Partial<LeadHunterSearchRequest> {
  const instruction =
    cleanLongText(
      request.search_instruction,
      MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
    );

  if (
    !instruction
  ) {
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

  const inferredBuyerTargets =
    inferBuyerTargetsFromInstruction(
      instruction,
    );

  if (
    inferredBuyerTargets.length >
    0
  ) {
    next.organisation_types =
      inferredBuyerTargets;
  }

  const privateFieldValue =
    extractMissionBooleanField(
      instruction,
      "Private sector",
    );

  const governmentFieldValue =
    extractMissionBooleanField(
      instruction,
      "Government",
    );

  const explicitPrivateOnly =
    /\bprivate[\s-]*sector\s+only\b/i.test(
      instruction,
    ) ||
    /\bdo not search government\b/i.test(
      instruction,
    ) ||
    /\bno government\b/i.test(
      instruction,
    ) ||
    governmentFieldValue === false;

  const explicitGovernmentOnly =
    /\bgovernment[\s-]*sector\s+only\b/i.test(
      instruction,
    ) ||
    /\bgovernment opportunities only\b/i.test(
      instruction,
    ) ||
    privateFieldValue === false;

  if (
    explicitPrivateOnly &&
    !explicitGovernmentOnly
  ) {
    next.sector =
      "private";

    next.include_private_sector =
      true;

    next.include_government_sector =
      false;

    next.include_nonprofits =
      false;
  } else if (
    explicitGovernmentOnly &&
    !explicitPrivateOnly
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

  /*
   * Handle explicit exclusion clauses.
   *
   * Example:
   * "Do not search government, cleaning, technology, marketing,
   * branding or NexDocs opportunities."
   */
  const negativeClauses =
    instruction.match(
      /\b(?:do not|don't|exclude|without|no)\b[^.!;\n]*/gi,
    ) ??
    [];

  const negativeText =
    negativeClauses
      .join(" ")
      .toLowerCase();

  const excludedServices =
    new Set<
      LeadHunterServiceCategory
    >();

  if (
    /\bcleaning\b/.test(
      negativeText,
    )
  ) {
    excludedServices.add(
      "commercial_cleaning",
    );

    excludedServices.add(
      "deep_cleaning",
    );

    excludedServices.add(
      "hygiene",
    );
  }

  if (
    /\btechnology\b|\btech\b/.test(
      negativeText,
    )
  ) {
    const technologyServices:
      LeadHunterServiceCategory[] =
      [
        "website_design",
        "crm",
        "ai_automation",
        "ecommerce",
        "google_business_profile",
      ];

    for (
      const service of
      technologyServices
    ) {
      excludedServices.add(
        service,
      );
    }
  }

  if (
    /\bmarketing\b/.test(
      negativeText,
    )
  ) {
    const marketingServices:
      LeadHunterServiceCategory[] =
      [
        "seo",
        "digital_marketing",
        "social_media_management",
        "lead_generation",
        "google_business_profile",
      ];

    for (
      const service of
      marketingServices
    ) {
      excludedServices.add(
        service,
      );
    }
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
    const documentServices:
      LeadHunterServiceCategory[] =
      [
        "business_documents",
        "quotations",
        "proposals",
        "contracts",
      ];

    for (
      const service of
      documentServices
    ) {
      excludedServices.add(
        service,
      );
    }

    if (
      next.companies
    ) {
      next.companies =
        next.companies.filter(
          (
            company,
          ) =>
            company !==
            "nexdocs",
        );
    }
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

    /*
     * Never turn the hunt into an empty service list accidentally.
     * Only apply exclusions if at least one valid requested service remains.
     */
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

  /*
   * A customer-only mission may deliberately permit verified Research
   * prospects when there is no current tender or buying signal. Respect that
   * explicit instruction instead of leaving the UI's stricter default on.
   */
  const allowsResearchProspects =
    /\bif no active opportunit(?:y|ies) (?:is|are) proven,?\s*(?:return|keep)\b[\s\S]{0,180}?\b(?:research prospects?|low[-\s]priority research)\b/i.test(
      instruction,
    ) ||
    /\b(?:return|keep)\b[\s\S]{0,100}?\b(?:research prospects?|low[-\s]priority research)\b[\s\S]{0,100}?\b(?:no active opportunit(?:y|ies)|not a confirmed active buyer)\b/i.test(
      instruction,
    );

  if (allowsResearchProspects) {
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

  return next;
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
    clampScore(
      prospect.fit_score,
    ) *
      0.3 +
    clampScore(
      prospect.intent_score,
    ) *
      0.25 +
    clampScore(
      prospect.evidence_score,
    ) *
      0.2 +
    clampScore(
      prospect.timing_score,
    ) *
      0.15 +
    clampScore(
      prospect.contactability_score,
    ) *
      0.1;

  return clampScore(
    weightedScore,
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
    contactabilityScore >=
      60 &&
    (
      intentScore >= 70 ||
      timingScore >= 75
    )
  ) {
    return "hot";
  }

  if (
    totalScore >= 65 &&
    contactabilityScore >=
      40
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

function buildWhyContact(
  candidate:
    Partial<LeadHunterProspect>,
  signals:
    ProspectSignal[],
): string[] {
  const reasons =
    uniqueTexts(
      candidate.why_contact,
      10,
    );

  if (
    reasons.length >
    0
  ) {
    return reasons;
  }

  const generated:
    string[] =
    [];

  if (
    candidate.public_phone ||
    candidate.public_email
  ) {
    generated.push(
      "Verified public contact route is available.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        signal.type ===
          "website_problem" ||
        signal.type ===
          "mobile_website_problem" ||
        signal.type ===
          "missing_contact_form" ||
        signal.type ===
          "missing_whatsapp",
    )
  ) {
    generated.push(
      "A public website or conversion weakness was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        signal.type ===
          "branding_problem" ||
        signal.type ===
          "missing_logo",
    )
  ) {
    generated.push(
      "A public branding weakness was identified.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        signal.type ===
          "maintenance_need" ||
        signal.type ===
          "renovation_need" ||
        signal.type ===
          "cleaning_need",
    )
  ) {
    generated.push(
      "The organisation shows a relevant physical-service signal.",
    );
  }

  if (
    signals.some(
      (
        signal,
      ) =>
        signal.type ===
          "active_tender" ||
        signal.type ===
          "request_for_quote" ||
        signal.type ===
          "request_for_proposal",
    )
  ) {
    generated.push(
      "A public procurement signal was identified.",
    );
  }

  return generated;
}

export function validateProspect(
  candidate:
    Partial<LeadHunterProspect>,
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

  const evidence =
    Array.isArray(
      candidate.evidence,
    )
      ? candidate.evidence
          .filter(
            (
              item,
            ): item is ProspectEvidence =>
              Boolean(
                item &&
                  cleanText(
                    item.title,
                  ) &&
                  isValidPublicUrl(
                    item.url,
                  ),
              ),
          )
          .map(
            (
              item,
            ) => ({
              ...item,

              title:
                cleanText(
                  item.title,
                ) ??
                "Public source",

              url:
                normaliseWebsite(
                  item.url,
                ) as string,

              publisher:
                cleanText(
                  item.publisher,
                ),

              published_at:
                item.published_at ||
                null,

              checked_at:
                item.checked_at ||
                new Date().toISOString(),

              excerpt:
                cleanText(
                  item.excerpt,
                ),

              supports:
                uniqueTexts(
                  item.supports,
                  20,
                ),
            }),
          )
      : [];

  if (
    evidence.length ===
    0
  ) {
    rejectionReasons.push(
      "No valid public evidence source was supplied.",
    );
  }

  const website =
    normaliseWebsite(
      candidate.website,
    );

  const phone =
    normalisePhone(
      candidate.public_phone,
    );

  const email =
    normaliseEmail(
      candidate.public_email,
    );

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
    Array.isArray(
      candidate.signals,
    )
      ? candidate.signals
          .filter(
            (
              signal,
            ): signal is ProspectSignal =>
              Boolean(
                signal &&
                  cleanText(
                    signal.title,
                  ) &&
                  cleanText(
                    signal.explanation,
                  ) &&
                  isValidPublicUrl(
                    signal.evidence_url,
                  ),
              ),
          )
          .map(
            (
              signal,
            ) => ({
              ...signal,

              title:
                cleanText(
                  signal.title,
                ) ??
                "Opportunity signal",

              explanation:
                cleanText(
                  signal.explanation,
                ) ??
                "No signal explanation supplied.",

              evidence_url:
                normaliseWebsite(
                  signal.evidence_url,
                ) as string,

              detected_at:
                signal.detected_at ||
                new Date().toISOString(),

              confidence:
                clampScore(
                  signal.confidence,
                ),
            }),
          )
      : [];

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

  /*
   * Preserve the secure server's total_score.
   *
   * The previous implementation recalculated the score in the browser,
   * which could change a 96 server score into something different.
   *
   * We now calculate only when the server did not provide a score.
   */
  const suppliedTotalScore =
    safeNumber(
      candidate.total_score,
    );

  const totalScore =
    suppliedTotalScore !==
    null
      ? clampScore(
          suppliedTotalScore,
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
            0.55 +
          intentScore *
            0.25 +
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
            "hygiene",
            "landscaping",
            "seo",
            "digital_marketing",
            "social_media_management",
            "lead_generation",
            "crm",
            "ai_automation",
          ].includes(
            candidate.recommended_service ??
            "general",
          )
            ? 75
            : 35,
        );

  const geographicFitScore =
    candidate.geographic_fit_score !==
    undefined
      ? clampScore(
          candidate.geographic_fit_score,
        )
      : 60;

  const requestedStatus =
    candidate.verification_status ??
    "unverified";

  let verificationStatus:
    ProspectVerificationStatus =
      requestedStatus;

  if (
    requestedStatus === "rejected" ||
    candidate.classification === "rejected" ||
    rejectionReasons.length > 0
  ) {
    verificationStatus =
      "rejected";
  } else if (
    requestedStatus === "verified" &&
    evidence.length >= 2 &&
    (
      phone ||
      email
    ) &&
    signals.length >= 1 &&
    evidenceScore >= 70
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
    classification === "prospect" &&
    signals.every(
      (signal) => signal.type === "general_fit",
    )
      ? "research"
      : candidate.sales_priority ??
        calculateSalesPriority({
          totalScore,
          intentScore,
          contactabilityScore,
          timingScore,
        });

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

    sector:
      candidate.sector ??
      "private",

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
        (value) =>
          /^(phone|email):.+$/i.test(
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
      candidate.recommended_company ??
      "cossa_nexus_holdings",

    recommended_service:
      candidate.recommended_service ??
      "general",

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
      candidate.date_verified ||
      new Date().toISOString(),

    next_action:
      cleanText(
        candidate.next_action,
      ) ??
      "Verify the organisation and identify the correct public procurement or decision-maker route.",

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

export function validateSearchRequest(
  requestInput:
    Partial<LeadHunterSearchRequest>,
): LeadHunterSearchRequest {
  /*
   * First reconcile explicit mission instructions.
   *
   * This prevents a hunt saying:
   *
   * Company: Cossa Nexus Construction
   * Government: NO
   *
   * while the underlying request still contains Cossa Tech, NexDocs,
   * government procurement and cleaning.
   */
  const request =
    applyInstructionIntent(
      requestInput,
    );

  const resultCount =
    Math.min(
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

  /*
   * Search depth is now a hard ceiling.
   *
   * Economy = maximum 3
   * Standard = maximum 5
   * Deep = maximum 8
   *
   * An old value of 5 can no longer cause Economy to silently use
   * Standard-level credit consumption.
   */
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

    companies:
      request.companies?.length
        ? [
            ...new Set(
              request.companies,
            ),
          ]
        : DEFAULT_LEAD_HUNTER_REQUEST.companies,

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
        20,
      ),

    organisation_types:
      uniqueTexts(
        request.organisation_types,
        20,
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
              1,
            ),
          ),
        ),
      ),

    tender_keywords:
      uniqueTexts(
        request.tender_keywords,
        25,
      ).length >
      0
        ? uniqueTexts(
            request.tender_keywords,
            25,
          )
        : DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords:
      uniqueTexts(
        request.prospect_keywords,
        35,
      ).length >
      0
        ? uniqueTexts(
            request.prospect_keywords,
            35,
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
  };
}

export function requestFromStrategy(
  strategy:
    LeadHunterStrategy,
  overrides:
    Partial<LeadHunterSearchRequest> =
    {},
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
      `Find verified opportunities matching the ${strategy.title} strategy. Use public evidence and exclude unsupported assumptions.`,

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

    /*
     * Strategies start economically unless the user deliberately changes
     * Search Depth in the UI.
     */
    search_depth:
      "economy",

    max_search_queries:
      maxQueriesForDepth(
        "economy",
      ),

    ...overrides,
  });
}

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

export function buildHuntSummary(
  requestInput:
    Partial<LeadHunterSearchRequest>,
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

      `Sector: ${
        request.sector
      }`,

      `Companies: ${
        request.companies.join(
          ", ",
        )
      }`,

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

      `Services: ${
        request.services.join(
          ", ",
        )
      }`,

      `Locations: ${
        request.locations.join(
          ", ",
        )
      }`,
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

function sectorAllowedForRequest(
  request: LeadHunterSearchRequest,
  sector: LeadHunterSector,
): boolean {
  if (
    request.sector !== "mixed" &&
    request.sector !== sector
  ) {
    return false;
  }

  if (sector === "private") {
    return request.include_private_sector;
  }

  if (sector === "government") {
    return request.include_government_sector;
  }

  if (sector === "nonprofit") {
    return request.include_nonprofits;
  }

  return false;
}

export async function huntProspects(
  request:
    Partial<LeadHunterSearchRequest>,
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

  /*
   * Preserve the server-normalised request.
   *
   * If the server corrected, restricted or interpreted the mission,
   * the UI must show what was actually executed rather than stale browser
   * state.
   */
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
            ) ||
            !effectiveRequest.companies.includes(
              prospect.recommended_company,
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

          /*
           * Client enforcement mirrors server requirements.
           * A result cannot sneak through because of a server/client mismatch.
           */
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
                  signal,
                ) =>
                  signal.type ===
                  "general_fit",
              )
            )
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
            const firstCommercial =
              first.total_score *
                0.35 +
              first.revenue_potential_score *
                0.25 +
              first.ease_to_close_score *
                0.25 +
              first.contactability_score *
                0.15;

            const secondCommercial =
              second.total_score *
                0.35 +
              second.revenue_potential_score *
                0.25 +
              second.ease_to_close_score *
                0.25 +
              second.contactability_score *
                0.15;

            return (
              secondCommercial -
              firstCommercial
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

  return {
    hunt_id:
      cleanText(
        payload.hunt_id,
      ) ??
      createClientId(),

    status:
      "completed",

    searched_at:
      payload.searched_at ??
      new Date().toISOString(),

    completed_at:
      payload.completed_at ??
      new Date().toISOString(),

    request:
      effectiveRequest,

    prospects:
      acceptedProspects,

    /*
     * Null-aware fallback.
     *
     * A legitimate server count of 0 must stay 0.
     * The old `Number(value) || fallback` logic could incorrectly replace it.
     */
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
  };
}

export async function findCrmDuplicates(
  prospect:
    LeadHunterProspect,
): Promise<
  CrmDuplicateMatch[]
> {
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
        1000,
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
        row: Record<
          string,
          unknown
        >,
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
        };
      },
    )
    .filter(
      (
        match:
          CrmDuplicateMatch,
      ) =>
        match
          .match_reasons
          .length >
        0,
    );
}

function formatProspectEvidence(
  prospect:
    LeadHunterProspect,
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
    "Lead Hunter verified public prospect.",

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

    "",

    `Classification: ${prospect.classification}`,

    `Verification: ${prospect.verification_status}`,

    `Sales priority: ${prospect.sales_priority}`,

    `Total score: ${prospect.total_score}/100`,

    `Revenue potential: ${prospect.revenue_potential_score}/100`,

    `Ease to close: ${prospect.ease_to_close_score}/100`,

    `Recurring revenue potential: ${prospect.recurring_revenue_score}/100`,

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

export async function saveProspectToCrm(
  prospectInput:
    LeadHunterProspect,

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

  const crmStatus =
    prospect.classification ===
      "active_opportunity" ||
    prospect.classification ===
      "tender"
      ? "Qualified"
      : "New";

  const crmStage =
    crmStatus;

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
          crmStage,

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

export async function saveProspectsToCrm(
  prospects:
    LeadHunterProspect[],
): Promise<{
  created:
    SaveProspectResult[];

  duplicates:
    SaveProspectResult[];

  failed: Array<{
    prospect:
      LeadHunterProspect;

    error:
      string;
  }>;
}> {
  const created:
    SaveProspectResult[] =
    [];

  const duplicates:
    SaveProspectResult[] =
    [];

  const failed: Array<{
    prospect:
      LeadHunterProspect;

    error:
      string;
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

export function exportProspectsToCsv(
  prospects:
    LeadHunterProspect[],
): string {
  const headers =
    [
      "Organisation",
      "Sector",
      "Industry",
      "Website",
      "Public Phone",
      "Public Email",
      "City",
      "Province",
      "Country",
      "Recommended Company",
      "Recommended Service",
      "Opportunity",
      "Classification",
      "Verification",
      "Sales Priority",
      "Score",
      "Revenue Potential",
      "Ease to Close",
      "Recurring Revenue Potential",
      "Primary Source",
      "Date Verified",
      "Next Action",
    ];

  const escapeCsv =
    (
      value:
        unknown,
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
        prospect.website,
        prospect.public_phone,
        prospect.public_email,
        prospect.city,
        prospect.province,
        prospect.country,
        prospect.recommended_company,
        prospect.recommended_service,
        prospect.opportunity_summary,
        prospect.classification,
        prospect.verification_status,
        prospect.sales_priority,
        prospect.total_score,
        prospect.revenue_potential_score,
        prospect.ease_to_close_score,
        prospect.recurring_revenue_score,
        prospect.primary_source_url,
        prospect.date_verified,
        prospect.next_action,
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
