// Production Lead Hunter data, intelligence, verification and workforce layer.
//
// Cossa Nexus Holdings
// Lead Hunter:
// AI Revenue Lead Hunter & Opportunity Intelligence Specialist
//
// Core responsibilities:
// - Discover legitimate revenue opportunities using authenticated server-side
//   public research.
// - Support private-sector, public-sector and nonprofit opportunity hunting.
// - Interpret both guided configuration and natural-language CEO missions.
// - Separate physical, remote and hybrid service opportunities.
// - Support local, provincial, South African, African and worldwide targeting.
// - Prioritise revenue potential, urgency, buyer intent, contactability,
//   recurring value, geographic fit and ease-to-close.
// - Validate evidence before displaying, ranking or saving prospects.
// - Count independent evidence domains rather than raw page count.
// - Reject invented, unsupported, competitor, directory and invalid records.
// - Preserve procurement verification for tenders and RFQs.
// - Preserve objective website-audit findings.
// - Preserve AI interpretation metadata while prohibiting AI-created facts.
// - Detect likely duplicate CRM records.
// - Save verified prospects into the existing Growth CRM.
// - Execute as a specialised Workforce employee without requiring Groq.
// - Return durable Hunt IDs, Prospect IDs and CRM Lead IDs for downstream
//   Lead Intake and Sales & Conversion workflows.
//
// Security:
// - This browser file does NOT scrape/search the internet directly.
// - Real research is performed through:
//       POST /api/lead-hunter/search
// - Search-provider keys, government-data credentials and AI-provider keys
//   must remain server-side.
// - Lead Hunter never automatically contacts prospects.
// - Lead Hunter never makes binding promises, spends money or submits bids.

import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/* DATABASE                                                                   */
/* -------------------------------------------------------------------------- */

const db = supabase as unknown as {
  from: (table: string) => any;
};

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

export const LEAD_HUNTER_SEARCH_ENDPOINT =
  "/api/lead-hunter/search";

export const MAX_HUNT_RESULTS = 50;
export const DEFAULT_HUNT_RESULTS = 15;

export const MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH =
  2_500;

export const DEFAULT_MAX_SEARCH_QUERIES = 5;
export const MAX_ALLOWED_SEARCH_QUERIES = 10;
export const DEFAULT_SEARCH_CACHE_HOURS = 24;

export const DEFAULT_WORKFORCE_HUNT_RESULTS = 10;

export const LEAD_HUNTER_EMPLOYEE_KEY =
  "lead-hunter";

export const LEAD_HUNTER_TOOL_PROVIDER =
  "cossa-lead-hunter";

export const LEAD_HUNTER_TOOL_MODEL =
  "authenticated-search-verification";

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

export type LeadHunterWorkflowOutcome =
  | "SUCCESS_WITH_RESULTS"
  | "SUCCESS_NO_VERIFIED_RESULTS"
  | "SUCCESS_WITH_PROVIDER_WARNINGS"
  | "PARTIAL_PROVIDER_FAILURE"
  | "FAILED";

export interface LeadHunterProviderDiagnostic {
  provider: string;
  attempted: boolean;
  configured: boolean;
  succeeded: boolean;
  failed: boolean;
  warning: string | null;
  http_status: number | null;
  error_reason: string | null;
  result_count: number;
  source_count: number;
  timing_ms: number | null;
  configuration_required: boolean;
}

export type ProcurementCurrentStatus =
  | "active"
  | "expired"
  | "unknown"
  | "not_applicable";

export type WebsiteAuditFindingType =
  | "missing_contact_form"
  | "missing_whatsapp"
  | "mobile_issue"
  | "broken_link"
  | "missing_https"
  | "missing_meta_description"
  | "weak_title"
  | "missing_schema"
  | "slow_page"
  | "conversion_gap"
  | "other";

/* -------------------------------------------------------------------------- */
/* DATA MODELS                                                                */
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
  independent_source_key?: string | null;
  is_official_source?: boolean;
}

export interface ProspectSignal {
  type: ProspectSignalType;
  title: string;
  explanation: string;
  evidence_url: string;
  detected_at: string;
  confidence: number;
}

export interface ProspectVerificationMeta {
  independent_source_count: number;
  corroborating_domains: string[];
  official_source_count: number;
  source_cluster_id: string | null;
  cross_verified: boolean;
  verification_notes: string[];
}

export interface ProcurementVerification {
  reference_number: string | null;
  closing_date: string | null;
  briefing_date: string | null;
  issuing_body: string | null;
  submission_method: string | null;
  source_is_official: boolean;
  service_match_verified: boolean;
  current_status: ProcurementCurrentStatus;
}

export interface WebsiteAuditFinding {
  type: WebsiteAuditFindingType;
  severity: "low" | "medium" | "high";
  evidence: string;
  source_url: string;
  verified: boolean;
}

export interface AiInterpretationMeta {
  used: boolean;
  provider: string | null;
  model: string | null;
  confidence: number | null;
  grounded_source_urls: string[];
  may_not_create_facts: true;
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
    | "existing_crm_lead"
    | "excluded_existing_crm_lead";

  duplicate_lead_id: string | null;

  rejection_reasons: string[];

  raw_provider_name: string | null;
  raw_provider_result_id: string | null;

  verification_meta?: ProspectVerificationMeta;

  procurement?: ProcurementVerification | null;

  website_audit?: WebsiteAuditFinding[];

  ai_interpretation?: AiInterpretationMeta | null;

  entity_cluster_id?: string | null;
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

  status: LeadHunterWorkflowOutcome;

  searched_at: string;

  completed_at: string | null;

  request: LeadHunterSearchRequest;

  prospects: LeadHunterProspect[];

  source_count: number;

  accepted_count: number;

  rejected_count: number;

  warnings: string[];

  providers_used: string[];

  provider_diagnostics: LeadHunterProviderDiagnostic[];
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

export interface SaveProspectsBatchResult {
  created: SaveProspectResult[];

  duplicates: SaveProspectResult[];

  failed: Array<{
    prospect: LeadHunterProspect;
    error: string;
  }>;
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

  search_depth?: LeadHunterSearchDepth;
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE TYPES                                                            */
/* -------------------------------------------------------------------------- */

export interface LeadHunterWorkforceExecutionInput {
  objective: string;

  instruction?: string | null;

  targetMarket?: string | null;

  targetLocation?: string | null;

  targetService?: string | null;

  resultCount?: number | null;

  minimumScore?: number | null;

  saveVerifiedProspectsToCrm?: boolean;

  searchDepth?: LeadHunterSearchDepth | null;

  revenueMode?: LeadHunterRevenueMode | null;

  signal?: AbortSignal;
}

export interface LeadHunterRetainedRecordIds {
  hunt_id: string;

  prospect_ids: string[];

  lead_ids: string[];

  duplicate_lead_ids: string[];

  failed_prospect_ids: string[];
}

export interface LeadHunterWorkforceExecutionResult {
  hunt: LeadHunterSearchResponse;

  crm: SaveProspectsBatchResult;

  content: string;

  retained_record_ids: LeadHunterRetainedRecordIds;

  provider: typeof LEAD_HUNTER_TOOL_PROVIDER;

  model: typeof LEAD_HUNTER_TOOL_MODEL;

  external_actions: {
    prospect_contacted: false;
    spending_executed: false;
    bid_submitted: false;
    contract_committed: false;
  };
}

/* -------------------------------------------------------------------------- */
/* LOCATIONS                                                                  */
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
/* SERVICE MODELS                                                             */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* OPTIONS                                                                    */
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

/* -------------------------------------------------------------------------- */
/* STRATEGIES                                                                 */
/* -------------------------------------------------------------------------- */

export const LEAD_HUNTER_STRATEGIES:
  LeadHunterStrategy[] = [
    {
      id: "first-paying-customers",

      title:
        "Find Our First Paying Customers",

      description:
        "Prioritise real, reachable organisations with a clear service gap, public contact details and a practical opportunity that Cossa can pursue immediately.",

      target_sector:
        "mixed",

      companies: [
        "cossa_nexus_construction",
        "cossa_facility_services",
        "cossa_tech",
      ],

      services: [
        "property_maintenance",
        "commercial_cleaning",
        "website_design",
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
        "commercial cleaning",
        "website redesign",
        "outdated website",
      ],

      opportunity_signals: [
        "request_for_quote",
        "maintenance_need",
        "cleaning_need",
        "website_problem",
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
        "Find reachable organisations with a publicly evidenced service gap that Cossa can realistically convert into a first paying customer. Prioritise verified contact details, low pursuit effort, immediate need and practical deal size.",

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

      search_depth:
        "economy",
    },

    {
      id:
        "property-managers-gauteng",

      title:
        "Property Managers and Managing Agents",

      description:
        "Find property-management firms, sectional-title managers and estate managers that may procure recurring maintenance, renovations, cleaning, landscaping or facility support.",

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

      search_depth:
        "standard",
    },

    {
      id:
        "schools-and-training-centres",

      title:
        "Schools, Colleges and Training Centres",

      description:
        "Find public and private education facilities with maintenance, cleaning, painting, roofing, technology, website or document needs.",

      target_sector:
        "mixed",

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

      minimum_score:
        65,

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
      ],

      search_depth:
        "deep",
    },

    {
      id:
        "churches-and-nonprofits",

      title:
        "Churches and Nonprofit Organisations",

      description:
        "Find churches, community centres, charities and nonprofit organisations needing renovations, cleaning, websites, branding, marketing, documents or operational systems.",

      target_sector:
        "nonprofit",

      companies: [
        "cossa_nexus_construction",
        "cossa_facility_services",
        "cossa_tech",
        "cossa_ai_growth",
        "nexdocs",
      ],

      services: [
        "renovation",
        "commercial_cleaning",
        "website_design",
        "branding",
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
        "church branding",
      ],

      opportunity_signals: [
        "renovation_need",
        "maintenance_need",
        "website_problem",
        "branding_problem",
        "document_need",
      ],

      recommended_locations: [
        ...PRIORITY_GAUTENG_LOCATIONS,
        "South Africa",
      ],

      minimum_score:
        55,

      default_result_count:
        20,

      search_scope:
        "south_africa",

      delivery_model:
        "hybrid",

      revenue_mode:
        "easy_wins",

      objectives: [
        "find_customers",
        "find_projects",
        "find_weak_websites",
        "find_branding_gaps",
      ],

      search_depth:
        "standard",
    },

    {
      id:
        "retail-and-shopping-centres",

      title:
        "Retailers and Shopping Centres",

      description:
        "Find shopping centres, retail stores, restaurants and franchise locations needing fit-outs, maintenance, cleaning, websites, branding, marketing or customer-growth support.",

      target_sector:
        "private",

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
        "branding",
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

      minimum_score:
        60,

      default_result_count:
        20,

      search_scope:
        "south_africa",

      delivery_model:
        "hybrid",

      revenue_mode:
        "balanced",

      objectives: [
        "find_customers",
        "find_projects",
        "find_recurring_contracts",
        "find_marketing_gaps",
      ],

      search_depth:
        "deep",
    },

    {
      id:
        "industrial-and-warehousing",

      title:
        "Industrial Sites, Warehouses and Logistics Firms",

      description:
        "Find warehouses, factories, logistics providers and industrial properties with recurring maintenance, cleaning, repairs, painting, facility or technology requirements.",

      target_sector:
        "private",

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

      minimum_score:
        65,

      default_result_count:
        20,

      search_scope:
        "province",

      delivery_model:
        "hybrid",

      revenue_mode:
        "recurring_revenue",

      objectives: [
        "find_customers",
        "find_maintenance_needs",
        "find_cleaning_contracts",
        "find_recurring_contracts",
      ],

      search_depth:
        "deep",
    },

    {
      id:
        "outdated-websites",

      title:
        "Businesses with Weak or Outdated Websites",

      description:
        "Find legitimate businesses with broken, outdated, slow, non-mobile or poorly converting websites and prepare evidence-based Cossa Tech outreach.",

      target_sector:
        "private",

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

      minimum_score:
        55,

      default_result_count:
        20,

      search_instruction:
        "Find real businesses whose official websites show a specific, verifiable conversion, mobile, design, SEO, contact-form or WhatsApp weakness. Do not treat website-design companies or marketing agencies as prospects.",

      search_scope:
        "south_africa",

      delivery_model:
        "remote",

      revenue_mode:
        "easy_wins",

      objectives: [
        "find_customers",
        "find_weak_websites",
        "find_marketing_gaps",
        "find_technology_gaps",
      ],

      search_depth:
        "standard",
    },

    {
      id:
        "logo-and-branding-upgrades",

      title:
        "Logo and Branding Upgrade Prospects",

      description:
        "Find real organisations with weak, inconsistent, outdated or missing public branding that may benefit from Cossa Tech branding services.",

      target_sector:
        "private",

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

      minimum_score:
        55,

      default_result_count:
        15,

      search_instruction:
        "Find legitimate organisations with public evidence of weak, inconsistent, outdated or missing branding. Exclude design agencies, marketing agencies, logo designers and competitors.",

      search_scope:
        "south_africa",

      delivery_model:
        "remote",

      revenue_mode:
        "easy_wins",

      objectives: [
        "find_customers",
        "find_branding_gaps",
        "find_marketing_gaps",
      ],

      search_depth:
        "standard",
    },

    {
      id:
        "inactive-social-profiles",

      title:
        "Businesses with Inactive Marketing",

      description:
        "Find real businesses whose public marketing presence appears inactive and prepare honest growth-service opportunities supported by evidence.",

      target_sector:
        "private",

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

      search_depth:
        "standard",
    },

    {
      id:
        "municipal-tenders",

      title:
        "Municipal Tenders and RFQs",

      description:
        "Find current official municipal tenders, quotations, supplier invitations and procurement notices matching Cossa services.",

      target_sector:
        "government",

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

      minimum_score:
        70,

      default_result_count:
        15,

      search_scope:
        "south_africa",

      delivery_model:
        "hybrid",

      revenue_mode:
        "balanced",

      objectives: [
        "find_active_tenders",
        "find_rfqs",
        "find_supplier_registrations",
      ],

      search_depth:
        "deep",
    },

    {
      id:
        "provincial-and-national-procurement",

      title:
        "Provincial and National Government Procurement",

      description:
        "Find current verified opportunities from departments, public entities, hospitals, schools, agencies and state-owned organisations.",

      target_sector:
        "government",

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

      minimum_score:
        75,

      default_result_count:
        15,

      search_scope:
        "south_africa",

      delivery_model:
        "hybrid",

      revenue_mode:
        "strategic",

      objectives: [
        "find_active_tenders",
        "find_rfqs",
        "find_supplier_registrations",
      ],

      search_depth:
        "deep",
    },

    {
      id:
        "small-projects-now",

      title:
        "Small Projects Available Now",

      description:
        "Find smaller, faster-to-close public requests and private-sector needs that can generate early cash flow without ignoring larger strategic work.",

      target_sector:
        "mixed",

      companies: [
        "cossa_nexus_construction",
        "cossa_facility_services",
        "cossa_tech",
        "nexdocs",
      ],

      services: [
        "painting",
        "property_maintenance",
        "deep_cleaning",
        "website_design",
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

      search_depth:
        "standard",
    },
  ];

/* -------------------------------------------------------------------------- */
/* DEFAULT REQUEST                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_LEAD_HUNTER_REQUEST:
  LeadHunterSearchRequest = {
    sector:
      "mixed",

    companies: [
      "cossa_nexus_construction",
      "cossa_facility_services",
      "cossa_tech",
    ],

    services: [
      "property_maintenance",
      "commercial_cleaning",
      "website_design",
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
      55,

    minimum_evidence_sources:
      1,

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
    ],

    prospect_keywords: [
      "maintenance",
      "commercial cleaning",
      "website redesign",
      "outdated website",
      "request for quotation",
    ],

    verified_sources_only:
      true,

    exclude_existing_crm_leads:
      true,

    notes:
      null,

    search_instruction:
      "Find verified, contactable organisations with a clear service opportunity that Cossa can realistically pursue. Prioritise evidence quality, immediate revenue potential, ease of contact and practical next actions.",

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
  };

/* -------------------------------------------------------------------------- */
/* GENERIC HELPERS                                                            */
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

  return cleaned || null;
}

function cleanLongText(
  value: unknown,
  maximumLength: number,
): string | null {
  const text =
    cleanText(value);

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
    cleanText(value)
      ?.toLowerCase() ??
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
            Boolean(value),
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
    lowerText(value);

  if (!email) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  )
    ? email
    : null;
}

function normalisePhone(
  value: unknown,
): string | null {
  const text =
    cleanText(value);

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

    url.hash =
      "";

    return url.toString();
  } catch {
    return null;
  }
}

function hostnameForUrl(
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
    )
      .hostname
      .replace(
        /^www\./i,
        "",
      )
      .toLowerCase();
  } catch {
    return null;
  }
}

function registrableSourceKey(
  hostname: string,
): string {
  const parts =
    hostname
      .split(".")
      .filter(Boolean);

  if (
    parts.length <= 2
  ) {
    return hostname;
  }

  const southAfricanSecondLevel =
    new Set([
      "co.za",
      "org.za",
      "gov.za",
      "ac.za",
      "net.za",
    ]);

  const lastTwo =
    parts
      .slice(-2)
      .join(".");

  if (
    parts.length >= 3 &&
    southAfricanSecondLevel.has(
      lastTwo,
    )
  ) {
    return parts
      .slice(-3)
      .join(".");
  }

  return lastTwo;
}

function evidenceSourceKey(
  evidence: ProspectEvidence,
): string | null {
  const explicit =
    cleanText(
      evidence.independent_source_key,
    );

  if (explicit) {
    return explicit.toLowerCase();
  }

  const host =
    hostnameForUrl(
      evidence.url,
    );

  return host
    ? registrableSourceKey(
        host,
      )
    : null;
}

export function countIndependentEvidenceSources(
  evidence:
    ProspectEvidence[],
): {
  count: number;
  domains: string[];
} {
  const keys =
    evidence
      .map(
        evidenceSourceKey,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

  const domains = [
    ...new Set(
      keys,
    ),
  ];

  return {
    count:
      domains.length,

    domains,
  };
}

function countOfficialEvidenceSources(
  evidence:
    ProspectEvidence[],
): number {
  return evidence.filter(
    (item) => {
      if (
        item.is_official_source ===
        true
      ) {
        return true;
      }

      const host =
        hostnameForUrl(
          item.url,
        );

      if (!host) {
        return false;
      }

      return (
        host.endsWith(
          ".gov.za",
        ) ||
        host.endsWith(
          ".ac.za",
        ) ||
        item.type ===
          "government_portal" ||
        item.type ===
          "tender_notice"
      );
    },
  ).length;
}

function clampScore(
  value: unknown,
): number {
  const score =
    Number(value);

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
    value ===
      undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

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

function safeDateString(
  value: unknown,
): string | null {
  const text =
    cleanText(value);

  if (!text) {
    return null;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
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
  const normalise = (
    value: string,
  ) =>
    value
      .toLowerCase()
      .replace(
        /\b(pty|ltd|limited|inc|cc|company|holdings|group|south africa)\b/g,
        "",
      )
      .replace(
        /[^a-z0-9]/g,
        "",
      );

  const a =
    normalise(first);

  const b =
    normalise(second);

  return Boolean(
    a &&
      b &&
      (
        a === b ||
        a.includes(b) ||
        b.includes(a)
      ),
  );
}

function createClientId(): string {
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
/* DELIVERY INTELLIGENCE                                                      */
/* -------------------------------------------------------------------------- */

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
      (option) =>
        option.value ===
        depth,
    )
      ?.maximumQueries ??
    DEFAULT_MAX_SEARCH_QUERIES
  );
}

export function minimumDepthForServiceCount(
  serviceCount: number,
): LeadHunterSearchDepth {
  if (
    serviceCount <=
    maxQueriesForDepth(
      "economy",
    )
  ) {
    return "economy";
  }

  if (
    serviceCount <=
    maxQueriesForDepth(
      "standard",
    )
  ) {
    return "standard";
  }

  return "deep";
}

function trimServicesToHardMaximum(
  services:
    LeadHunterServiceCategory[],
): LeadHunterServiceCategory[] {
  return [
    ...new Set(
      services,
    ),
  ].slice(
    0,
    maxQueriesForDepth(
      "deep",
    ),
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

/* -------------------------------------------------------------------------- */
/* COMPANY INTELLIGENCE                                                       */
/* -------------------------------------------------------------------------- */

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
        /\bcossa\s+(?:ai\s+)?growth\b/i,
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
    const item
    of patterns
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

/* -------------------------------------------------------------------------- */
/* SERVICE INTELLIGENCE                                                       */
/* -------------------------------------------------------------------------- */

function inferServicesFromInstruction(
  instruction: string,
): LeadHunterServiceCategory[] {
  const serviceField =
    extractMissionField(
      instruction,
      "Services",
    );

  /*
   * SMART behaviour:
   * Explicit "Services:" fields remain supported, but natural-language CEO
   * commands are now interpreted too.
   */
  const searchable =
    serviceField ??
    instruction;

  if (
    !searchable.trim()
  ) {
    return [];
  }

  const matches:
    LeadHunterServiceCategory[] =
    [];

  const patterns: Array<{
    service:
      LeadHunterServiceCategory;
    pattern:
      RegExp;
  }> = [
    {
      service:
        "construction",

      pattern:
        /\bconstruction\b|\bbuilding contractor\b|\bbuilding work\b/i,
    },

    {
      service:
        "renovation",

      pattern:
        /\brenovation(?:s)?\b|\brefurbishment\b|\bremodelling\b/i,
    },

    {
      service:
        "property_maintenance",

      pattern:
        /\bproperty\s+maintenance\b|\bmaintenance\s+services?\b|\bbuilding maintenance\b|\brepairs?\b/i,
    },

    {
      service:
        "painting",

      pattern:
        /\bpainting\b|\brepainting\b|\bpaint contractor\b/i,
    },

    {
      service:
        "tiling",

      pattern:
        /\btiling\b|\btile installation\b/i,
    },

    {
      service:
        "ceilings",

      pattern:
        /\bceilings?\b|\bceiling installation\b|\bceiling repairs?\b/i,
    },

    {
      service:
        "roofing",

      pattern:
        /\broofing\b|\broof repairs?\b|\broof replacement\b/i,
    },

    {
      service:
        "plumbing",

      pattern:
        /\bplumbing\b|\bplumber\b|\bwater leak\b/i,
    },

    {
      service:
        "facility_management",

      pattern:
        /\bfacilit(?:y|ies)\s+management\b|\bfacility services\b/i,
    },

    {
      service:
        "commercial_cleaning",

      pattern:
        /\bcommercial\s+cleaning\b|\boffice cleaning\b|\bindustrial cleaning\b|\bcleaning contract\b/i,
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
        /\blandscaping\b|\bgarden services?\b|\bgrounds maintenance\b/i,
    },

    {
      service:
        "waste_management",

      pattern:
        /\bwaste\s+management\b|\bwaste removal\b/i,
    },

    {
      service:
        "website_design",

      pattern:
        /\bwebsite\s+(?:design|redesign|development|upgrade|revamp)\b|\bweb\s+design\b|\bnew website\b|\bbad website\b|\boutdated website\b/i,
    },

    {
      service:
        "logo_design",

      pattern:
        /\blogo\s+(?:design|redesign|upgrade|revamp)\b|\bnew logo\b|\bbad logo\b/i,
    },

    {
      service:
        "branding",

      pattern:
        /\bbranding\b|\bbrand\s+identity\b|\bbrand redesign\b/i,
    },

    {
      service:
        "seo",

      pattern:
        /\bseo\b|\bsearch engine optimi[sz]ation\b|\bgoogle ranking\b/i,
    },

    {
      service:
        "digital_marketing",

      pattern:
        /\bdigital\s+marketing\b|\bonline marketing\b|\bmarketing campaign\b/i,
    },

    {
      service:
        "social_media_management",

      pattern:
        /\bsocial\s+media\s+management\b|\bsocial media marketing\b|\bfacebook management\b|\binstagram management\b/i,
    },

    {
      service:
        "google_business_profile",

      pattern:
        /\bgoogle\s+business\s+profile\b|\bgoogle business\b|\bgbp\b/i,
    },

    {
      service:
        "lead_generation",

      pattern:
        /\blead\s+generation\b|\bcustomer acquisition\b|\bfind customers\b/i,
    },

    {
      service:
        "crm",

      pattern:
        /\bcrm\b|\bcustomer relationship management\b|\bsales pipeline\b/i,
    },

    {
      service:
        "ai_automation",

      pattern:
        /\bai\s+automation\b|\bworkflow\s+automation\b|\bautomation system\b|\bai assistant\b/i,
    },

    {
      service:
        "business_documents",

      pattern:
        /\bbusiness\s+documents?\b|\bdocument generation\b|\bnexdocs\b/i,
    },

    {
      service:
        "quotations",

      pattern:
        /\bquotations?\b|\bquote systems?\b|\bquote documents?\b/i,
    },

    {
      service:
        "proposals",

      pattern:
        /\bbusiness proposals?\b|\bproposal documents?\b/i,
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
        /\be-?commerce\b|\bonline store\b|\becommerce website\b/i,
    },
  ];

  for (
    const item
    of patterns
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

/* -------------------------------------------------------------------------- */
/* LOCATION INTELLIGENCE                                                      */
/* -------------------------------------------------------------------------- */

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
            (item) =>
              cleanText(
                item,
              ),
          )
          .filter(
            (
              item,
            ): item is string =>
              Boolean(item),
          ),
      ),
    ].slice(
      0,
      25,
    );
  }

  const knownLocations = [
    ...PRIORITY_GAUTENG_LOCATIONS,
    ...SOUTH_AFRICAN_PROVINCES,
    "South Africa",
  ];

  return knownLocations.filter(
    (location) =>
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

/* -------------------------------------------------------------------------- */
/* BUYER-TYPE INTELLIGENCE                                                    */
/* -------------------------------------------------------------------------- */

function inferBuyerTargetsFromInstruction(
  instruction: string,
): string[] {
  const clause =
    instruction.match(
      /\b(?:find|target|return|hunt|search for|look for)\s+(?:(?:real|verified|qualified)\s+)?(?:(?:private|public|government|nonprofit)\s+)?([^.\n!]{3,180}?)(?=\s+(?:that|who|which)\s+(?:could|can|may|need|needs|want|wants|have|has)\b|\s+needing\b|\s+with\b)/i,
    )?.[1];

  if (!clause) {
    return [];
  }

  const genericTarget =
    /^(?:real|verified|qualified)?\s*(?:customer|buyer|lead|prospect|organisation|organization|company|business|opportunity)(?:s|es)?$/i;

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
          (
            item,
          ): item is string =>
            typeof item ===
              "string" &&
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
/* OBJECTIVE INTELLIGENCE                                                     */
/* -------------------------------------------------------------------------- */

function inferObjectivesFromInstruction(
  instruction: string,
): LeadHunterObjective[] {
  const objectives:
    LeadHunterObjective[] =
    [];

  const text =
    instruction.toLowerCase();

  if (
    /\b(customer|customers|client|clients|buyers?|prospects?|leads?)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_customers",
    );
  }

  if (
    /\b(project|projects|work available|job opportunities|small works?)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_projects",
    );
  }

  if (
    /\b(tender|tenders|bid|bids|etender)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_active_tenders",
    );
  }

  if (
    /\b(rfq|request for quotation|quotation request)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_rfqs",
    );
  }

  if (
    /\b(supplier registration|supplier database|vendor registration)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_supplier_registrations",
    );
  }

  if (
    /\b(subcontract|subcontractor|subcontracting)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_subcontracting",
    );
  }

  if (
    /\b(partner|partnership|referral partner|strategic partner)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_partners",
    );
  }

  if (
    /\b(outdated website|bad website|weak website|website problem|website redesign)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_weak_websites",
    );
  }

  if (
    /\b(branding gap|branding problem|logo problem|bad logo|missing logo)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_branding_gaps",
    );
  }

  if (
    /\b(inactive marketing|weak marketing|poor online presence|social media gap)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_marketing_gaps",
    );
  }

  if (
    /\b(technology gap|automation gap|manual process|technology problem)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_technology_gaps",
    );
  }

  if (
    /\b(maintenance|repairs?|property maintenance)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_maintenance_needs",
    );
  }

  if (
    /\b(cleaning contract|commercial cleaning|office cleaning|industrial cleaning)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_cleaning_contracts",
    );
  }

  if (
    /\b(recurring|retainer|monthly contract|repeat revenue|long-term contract)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_recurring_contracts",
    );
  }

  if (
    /\b(quick revenue|cash flow|cashflow|first paying customer|easy win|fast sale|close quickly)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "find_immediate_cashflow",
    );
  }

  if (
    /\b(search everything|everything relevant|all opportunities|any opportunity)\b/.test(
      text,
    )
  ) {
    objectives.push(
      "search_everything_relevant",
    );
  }

  return [
    ...new Set(
      objectives,
    ),
  ];
}

/* -------------------------------------------------------------------------- */
/* REVENUE-MODE INTELLIGENCE                                                  */
/* -------------------------------------------------------------------------- */

function inferRevenueModeFromInstruction(
  instruction: string,
): LeadHunterRevenueMode | null {
  const text =
    instruction.toLowerCase();

  if (
    /\b(quick revenue|cash flow|cashflow|first paying customer|fast close|close quickly|smaller jobs?|small projects?)\b/.test(
      text,
    )
  ) {
    return "quick_revenue";
  }

  if (
    /\b(easy wins?|low pursuit effort|easy to close|reachable customers?)\b/.test(
      text,
    )
  ) {
    return "easy_wins";
  }

  if (
    /\b(recurring revenue|retainer|monthly contract|repeat business|long-term maintenance|cleaning contract)\b/.test(
      text,
    )
  ) {
    return "recurring_revenue";
  }

  if (
    /\b(high value|large contract|large project|major deal|high-value)\b/.test(
      text,
    )
  ) {
    return "high_value";
  }

  if (
    /\b(strategic|framework|supplier database|long-term account|government procurement)\b/.test(
      text,
    )
  ) {
    return "strategic";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* SECTOR INTELLIGENCE                                                        */
/* -------------------------------------------------------------------------- */

function inferSectorFromInstruction(
  instruction: string,
): LeadHunterSector | null {
  const text =
    instruction.toLowerCase();

  const government =
    /\b(government|municipality|municipal|public sector|department|state-owned|state owned|etender|tender|rfq)\b/.test(
      text,
    );

  const privateSector =
    /\b(private sector|businesses?|companies|retailers?|restaurants?|property managers?|warehouses?|offices?)\b/.test(
      text,
    );

  const nonprofit =
    /\b(nonprofit|non-profit|ngo|church|charity|community centre|community center)\b/.test(
      text,
    );

  const count =
    [
      government,
      privateSector,
      nonprofit,
    ].filter(
      Boolean,
    ).length;

  if (
    count > 1
  ) {
    return "mixed";
  }

  if (
    government
  ) {
    return "government";
  }

  if (
    nonprofit
  ) {
    return "nonprofit";
  }

  if (
    privateSector
  ) {
    return "private";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* SEARCH-DEPTH INTELLIGENCE                                                  */
/* -------------------------------------------------------------------------- */

function inferSearchDepthFromInstruction(
  instruction: string,
): LeadHunterSearchDepth | null {
  if (
    /\b(deep search|deep research|investigate thoroughly|comprehensive search)\b/i.test(
      instruction,
    )
  ) {
    return "deep";
  }

  if (
    /\b(standard search|balanced search|normal search)\b/i.test(
      instruction,
    )
  ) {
    return "standard";
  }

  if (
    /\b(economy|low credit|save credits|cheap search|minimise credits|minimize credits)\b/i.test(
      instruction,
    )
  ) {
    return "economy";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* NATURAL-LANGUAGE MISSION INTELLIGENCE                                      */
/* -------------------------------------------------------------------------- */

function applyInstructionIntent(
  request:
    Partial<LeadHunterSearchRequest>,
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

  const inferredObjectives =
    inferObjectivesFromInstruction(
      instruction,
    );

  if (
    inferredObjectives.length >
    0
  ) {
    next.objectives =
      inferredObjectives;
  }

  const inferredRevenueMode =
    inferRevenueModeFromInstruction(
      instruction,
    );

  if (
    inferredRevenueMode
  ) {
    next.revenue_mode =
      inferredRevenueMode;
  }

  const inferredSector =
    inferSectorFromInstruction(
      instruction,
    );

  if (
    inferredSector
  ) {
    next.sector =
      inferredSector;

    if (
      inferredSector ===
      "government"
    ) {
      next.include_private_sector =
        false;

      next.include_government_sector =
        true;

      next.include_nonprofits =
        false;
    }

    if (
      inferredSector ===
      "private"
    ) {
      next.include_private_sector =
        true;

      next.include_government_sector =
        false;

      next.include_nonprofits =
        false;
    }

    if (
      inferredSector ===
      "nonprofit"
    ) {
      next.include_private_sector =
        false;

      next.include_government_sector =
        false;

      next.include_nonprofits =
        true;
    }
  }

  const inferredDepth =
    inferSearchDepthFromInstruction(
      instruction,
    );

  if (
    inferredDepth
  ) {
    next.search_depth =
      inferredDepth;
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
    governmentFieldValue ===
      false;

  const explicitGovernmentOnly =
    /\bgovernment[\s-]*sector\s+only\b/i.test(
      instruction,
    ) ||
    /\bgovernment opportunities only\b/i.test(
      instruction,
    ) ||
    privateFieldValue ===
      false;

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

  const negativeClauses =
    instruction.match(
      /\b(?:do not|don't|exclude|without|no)\b[^.!;\n]*/gi,
    ) ?? [];

  const negativeText =
    negativeClauses
      .join(" ")
      .toLowerCase();

  const excludedServices =
    new Set<LeadHunterServiceCategory>();

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
    [
      "website_design",
      "crm",
      "ai_automation",
      "ecommerce",
      "google_business_profile",
    ].forEach(
      (service) =>
        excludedServices.add(
          service as LeadHunterServiceCategory,
        ),
    );
  }

  if (
    /\bmarketing\b/.test(
      negativeText,
    )
  ) {
    [
      "seo",
      "digital_marketing",
      "social_media_management",
      "lead_generation",
      "google_business_profile",
    ].forEach(
      (service) =>
        excludedServices.add(
          service as LeadHunterServiceCategory,
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
    [
      "business_documents",
      "quotations",
      "proposals",
      "contracts",
    ].forEach(
      (service) =>
        excludedServices.add(
          service as LeadHunterServiceCategory,
        ),
    );

    if (
      next.companies
    ) {
      next.companies =
        next.companies.filter(
          (company) =>
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
        (service) =>
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
      resultsField
        ?.match(
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
      minimumScoreField
        ?.match(
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
    /\bif no active opportunit(?:y|ies) (?:is|are) proven,?\s*(?:return|keep)\b[\s\S]{0,180}?\b(?:research prospects?|low[-\s]priority research)\b/i.test(
      instruction,
    ) ||
    /\b(?:return|keep)\b[\s\S]{0,100}?\b(?:research prospects?|low[-\s]priority research)\b[\s\S]{0,100}?\b(?:no active opportunit(?:y|ies)|not a confirmed active buyer)\b/i.test(
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
    /\brecurring revenue\b|\bretainer\b|\bmonthly contract\b|\brepeat revenue\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "recurring_revenue";

    next.revenue_first =
      true;
  }

  if (
    /\bhigh[-\s]value\b|\blarge contracts?\b|\bmajor opportunities\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "high_value";

    next.revenue_first =
      true;
  }

  if (
    /\bstrategic\b|\bframework\b|\blong[-\s]term account\b/i.test(
      instruction,
    )
  ) {
    next.revenue_mode =
      "strategic";

    next.revenue_first =
      true;
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

/**
 * Revenue-first ranking.
 *
 * This is deliberately deterministic.
 * Groq or another LLM is not required to rank prospects.
 */
export function calculateCommercialPriorityScore(
  prospect:
    LeadHunterProspect,
): number {
  const score =
    prospect.total_score *
      0.25 +
    prospect.revenue_potential_score *
      0.2 +
    prospect.ease_to_close_score *
      0.2 +
    prospect.contactability_score *
      0.1 +
    prospect.recurring_revenue_score *
      0.1 +
    prospect.geographic_fit_score *
      0.1 +
    prospect.intent_score *
      0.05;

  return Math.round(
    score * 100,
  ) / 100;
}

/* -------------------------------------------------------------------------- */
/* VERIFICATION NORMALISATION                                                 */
/* -------------------------------------------------------------------------- */

function normaliseVerificationMeta(
  candidate:
    Partial<LeadHunterProspect>,
  evidence:
    ProspectEvidence[],
): ProspectVerificationMeta {
  const detected =
    countIndependentEvidenceSources(
      evidence,
    );

  const raw =
    candidate.verification_meta;

  const suppliedIndependentCount =
    safeNumber(
      raw?.independent_source_count,
    );

  const suppliedDomains =
    uniqueTexts(
      raw?.corroborating_domains,
      20,
    )
      .map(
        (value) =>
          value.toLowerCase(),
      )
      .filter(Boolean);

  const corroboratingDomains =
    suppliedDomains.length >
    0
      ? suppliedDomains
      : detected.domains;

  const independentSourceCount =
    Math.max(
      detected.count,

      suppliedIndependentCount !==
        null
        ? Math.max(
            0,
            Math.round(
              suppliedIndependentCount,
            ),
          )
        : 0,
    );

  const officialSourceCount =
    Math.max(
      countOfficialEvidenceSources(
        evidence,
      ),

      Math.max(
        0,
        Math.round(
          safeNumber(
            raw?.official_source_count,
          ) ?? 0,
        ),
      ),
    );

  return {
    independent_source_count:
      independentSourceCount,

    corroborating_domains:
      corroboratingDomains,

    official_source_count:
      officialSourceCount,

    source_cluster_id:
      cleanText(
        raw?.source_cluster_id,
      ) ??
      cleanText(
        candidate.entity_cluster_id,
      ),

    cross_verified:
      raw?.cross_verified ===
        true ||
      independentSourceCount >=
        2,

    verification_notes:
      uniqueTexts(
        raw?.verification_notes,
        20,
      ),
  };
}

function normaliseProcurement(
  candidate:
    Partial<LeadHunterProspect>,
): ProcurementVerification | null {
  const raw =
    candidate.procurement;

  if (!raw) {
    return null;
  }

  const status:
    ProcurementCurrentStatus =
    raw.current_status ===
      "active" ||
    raw.current_status ===
      "expired" ||
    raw.current_status ===
      "unknown" ||
    raw.current_status ===
      "not_applicable"
      ? raw.current_status
      : "unknown";

  return {
    reference_number:
      cleanText(
        raw.reference_number,
      ),

    closing_date:
      safeDateString(
        raw.closing_date,
      ),

    briefing_date:
      safeDateString(
        raw.briefing_date,
      ),

    issuing_body:
      cleanText(
        raw.issuing_body,
      ),

    submission_method:
      cleanText(
        raw.submission_method,
      ),

    source_is_official:
      raw.source_is_official ===
      true,

    service_match_verified:
      raw.service_match_verified ===
      true,

    current_status:
      status,
  };
}

function normaliseWebsiteAudit(
  candidate:
    Partial<LeadHunterProspect>,
): WebsiteAuditFinding[] {
  if (
    !Array.isArray(
      candidate.website_audit,
    )
  ) {
    return [];
  }

  const validTypes =
    new Set<WebsiteAuditFindingType>(
      [
        "missing_contact_form",
        "missing_whatsapp",
        "mobile_issue",
        "broken_link",
        "missing_https",
        "missing_meta_description",
        "weak_title",
        "missing_schema",
        "slow_page",
        "conversion_gap",
        "other",
      ],
    );

  return candidate.website_audit
    .flatMap(
      (
        finding,
      ): WebsiteAuditFinding[] => {
        if (
          !finding ||
          typeof finding !==
            "object"
        ) {
          return [];
        }

        const type =
          validTypes.has(
            finding.type,
          )
            ? finding.type
            : "other";

        const evidence =
          cleanLongText(
            finding.evidence,
            1_000,
          );

        const sourceUrl =
          normaliseWebsite(
            finding.source_url,
          );

        if (
          !evidence ||
          !sourceUrl
        ) {
          return [];
        }

        const severity =
          finding.severity ===
            "high" ||
          finding.severity ===
            "medium" ||
          finding.severity ===
            "low"
            ? finding.severity
            : "medium";

        return [
          {
            type,

            severity,

            evidence,

            source_url:
              sourceUrl,

            verified:
              finding.verified ===
              true,
          },
        ];
      },
    )
    .slice(
      0,
      20,
    );
}

function normaliseAiInterpretation(
  candidate:
    Partial<LeadHunterProspect>,
): AiInterpretationMeta | null {
  const raw =
    candidate.ai_interpretation;

  if (!raw) {
    return null;
  }

  return {
    used:
      raw.used ===
      true,

    provider:
      cleanText(
        raw.provider,
      ),

    model:
      cleanText(
        raw.model,
      ),

    confidence:
      raw.confidence ===
        null ||
      raw.confidence ===
        undefined
        ? null
        : clampScore(
            raw.confidence,
          ),

    grounded_source_urls:
      uniqueTexts(
        raw.grounded_source_urls,
        20,
      )
        .map(
          normaliseWebsite,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),

    may_not_create_facts:
      true,
  };
}

/* -------------------------------------------------------------------------- */
/* PROCUREMENT VERIFICATION                                                   */
/* -------------------------------------------------------------------------- */

function isProcurementClassification(
  classification:
    ProspectClassification | undefined,
): boolean {
  return (
    classification ===
      "tender" ||
    classification ===
      "supplier_opportunity"
  );
}

export function procurementCanBeVerified(
  classification:
    ProspectClassification,
  procurement:
    ProcurementVerification | null,
): boolean {
  if (
    !isProcurementClassification(
      classification,
    )
  ) {
    return true;
  }

  if (
    !procurement
  ) {
    return false;
  }

  if (
    classification ===
    "supplier_opportunity"
  ) {
    return (
      procurement.source_is_official &&
      procurement.service_match_verified &&
      procurement.current_status !==
        "expired"
    );
  }

  return Boolean(
    procurement.reference_number &&
      procurement.closing_date &&
      procurement.source_is_official &&
      procurement.service_match_verified &&
      procurement.current_status ===
        "active",
  );
}

/* -------------------------------------------------------------------------- */
/* CONTACT REASONING                                                          */
/* -------------------------------------------------------------------------- */

function buildWhyContact(
  candidate:
    Partial<LeadHunterProspect>,
  signals:
    ProspectSignal[],
  websiteAudit:
    WebsiteAuditFinding[],
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
    string[] = [];

  if (
    candidate.public_phone ||
    candidate.public_email
  ) {
    generated.push(
      "Verified public contact route is available.",
    );
  }

  if (
    websiteAudit.some(
      (finding) =>
        finding.verified &&
        (
          finding.type ===
            "missing_contact_form" ||
          finding.type ===
            "missing_whatsapp" ||
          finding.type ===
            "mobile_issue" ||
          finding.type ===
            "conversion_gap"
        ),
    )
  ) {
    generated.push(
      "Objective website-audit evidence identifies a public conversion or usability gap.",
    );
  }

  if (
    signals.some(
      (signal) =>
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
      (signal) =>
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
      (signal) =>
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
      (signal) =>
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

  if (
    signals.some(
      (signal) =>
        signal.type ===
          "new_branch" ||
        signal.type ===
          "business_expansion" ||
        signal.type ===
          "new_development",
    )
  ) {
    generated.push(
      "Public expansion or development evidence may create a timely commercial requirement.",
    );
  }

  return generated;
}

/* -------------------------------------------------------------------------- */
/* PROSPECT VALIDATION                                                        */
/* -------------------------------------------------------------------------- */

export function validateProspect(
  candidate:
    Partial<LeadHunterProspect>,
): LeadHunterProspect {
  const rejectionReasons:
    string[] = [];

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
            (item) => ({
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
                safeDateString(
                  item.published_at,
                ),

              checked_at:
                safeDateString(
                  item.checked_at,
                ) ??
                new Date().toISOString(),

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

              independent_source_key:
                cleanText(
                  item.independent_source_key,
                ),

              is_official_source:
                item.is_official_source ===
                true,
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
            (signal) => ({
              ...signal,

              title:
                cleanText(
                  signal.title,
                ) ??
                "Opportunity signal",

              explanation:
                cleanLongText(
                  signal.explanation,
                  2_000,
                ) ??
                "No signal explanation supplied.",

              evidence_url:
                normaliseWebsite(
                  signal.evidence_url,
                ) as string,

              detected_at:
                safeDateString(
                  signal.detected_at,
                ) ??
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

  const verificationMeta =
    normaliseVerificationMeta(
      candidate,
      evidence,
    );

  const procurement =
    normaliseProcurement(
      candidate,
    );

  const websiteAudit =
    normaliseWebsiteAudit(
      candidate,
    );

  const aiInterpretation =
    normaliseAiInterpretation(
      candidate,
    );

  const requestedStatus =
    candidate.verification_status ??
    "unverified";

  const requestedClassification =
    candidate.classification ??
    "prospect";

  let classification:
    ProspectClassification =
    requestedStatus ===
      "rejected" ||
    requestedClassification ===
      "rejected"
      ? "rejected"
      : requestedClassification;

  const hasAnyPublicIdentity =
    Boolean(
      website ||
        phone ||
        email,
    );

  const procurementVerified =
    procurementCanBeVerified(
      classification,
      procurement,
    );

  /*
   * If a supposed tender does not satisfy the procurement proof boundary,
   * preserve the record for analysis but never let it become a verified tender.
   */
  if (
    classification ===
      "tender" &&
    !procurementVerified
  ) {
    rejectionReasons.push(
      "Tender verification is incomplete.",
    );
  }

  let verificationStatus:
    ProspectVerificationStatus;

  if (
    requestedStatus ===
      "rejected" ||
    classification ===
      "rejected" ||
    rejectionReasons.some(
      (reason) =>
        reason ===
          "Organisation name is missing." ||
        reason ===
          "No valid primary public source URL was supplied." ||
        reason ===
          "No valid public evidence source was supplied." ||
        reason ===
          "No website, public phone number or public email was verified.",
    )
  ) {
    verificationStatus =
      "rejected";

    classification =
      "rejected";
  } else if (
    requestedStatus ===
      "verified" &&
    evidenceScore >= 70 &&
    verificationMeta.independent_source_count >=
      2 &&
    verificationMeta.cross_verified &&
    hasAnyPublicIdentity &&
    signals.length >=
      1 &&
    procurementVerified
  ) {
    verificationStatus =
      "verified";
  } else {
    verificationStatus =
      "partially_verified";
  }

  const salesPriority =
    classification ===
      "prospect" &&
    signals.length > 0 &&
    signals.every(
      (signal) =>
        signal.type ===
        "general_fit",
    )
      ? "research"
      : candidate.sales_priority ??
        calculateSalesPriority({
          totalScore,

          intentScore,

          contactabilityScore,

          timingScore,
        });

  const duplicateStatus =
    candidate.duplicate_status ===
      "clear" ||
    candidate.duplicate_status ===
      "possible_duplicate" ||
    candidate.duplicate_status ===
      "existing_crm_lead" ||
    candidate.duplicate_status ===
      "excluded_existing_crm_lead"
      ? candidate.duplicate_status
      : "not_checked";

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
        30,
      ).filter(
        (value) =>
          /^(phone|email|domain|organisation):.+$/i.test(
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
      cleanLongText(
        candidate.decision_maker_route,
        2_000,
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
      cleanLongText(
        candidate.service_fit_reason,
        2_500,
      ) ??
      "Service fit has not been sufficiently explained.",

    opportunity_summary:
      cleanLongText(
        candidate.opportunity_summary,
        2_500,
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
        websiteAudit,
      ),

    signals,

    evidence,

    primary_source_url:
      primarySourceUrl ??
      "",

    date_verified:
      safeDateString(
        candidate.date_verified,
      ) ??
      new Date().toISOString(),

    next_action:
      cleanLongText(
        candidate.next_action,
        2_000,
      ) ??
      "Verify the organisation and identify the correct public procurement or decision-maker route.",

    outreach_angle:
      cleanLongText(
        candidate.outreach_angle,
        2_000,
      ),

    duplicate_status:
      duplicateStatus,

    duplicate_lead_id:
      cleanText(
        candidate.duplicate_lead_id,
      ),

    rejection_reasons: [
      ...new Set([
        ...(candidate.rejection_reasons ??
          []),

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

    verification_meta:
      verificationMeta,

    procurement,

    website_audit:
      websiteAudit,

    ai_interpretation:
      aiInterpretation,

    entity_cluster_id:
      cleanText(
        candidate.entity_cluster_id,
      ) ??
      verificationMeta.source_cluster_id,
  };
}

/* -------------------------------------------------------------------------- */
/* REQUEST VALIDATION                                                         */
/* -------------------------------------------------------------------------- */

export function validateSearchRequest(
  requestInput:
    Partial<LeadHunterSearchRequest>,
): LeadHunterSearchRequest {
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

  const rawServices =
    request.services?.length
      ? request.services
      : DEFAULT_LEAD_HUNTER_REQUEST.services;

  const services =
    trimServicesToHardMaximum(
      rawServices,
    );

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

  const explicitDepth =
    request.search_depth;

  const searchDepth =
    explicitDepth ??
    minimumDepthForServiceCount(
      services.length,
    );

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

  const fallbackLocations = [
    ...cities,
    ...provinces,
    ...countries,
  ];

  const tenderKeywords =
    uniqueTexts(
      request.tender_keywords,
      25,
    );

  const prospectKeywords =
    uniqueTexts(
      request.prospect_keywords,
      35,
    );

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
      tenderKeywords.length >
      0
        ? tenderKeywords
        : DEFAULT_LEAD_HUNTER_REQUEST.tender_keywords,

    prospect_keywords:
      prospectKeywords.length >
      0
        ? prospectKeywords
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

/* -------------------------------------------------------------------------- */
/* STRATEGY REQUEST                                                           */
/* -------------------------------------------------------------------------- */

export function requestFromStrategy(
  strategy:
    LeadHunterStrategy,

  overrides:
    Partial<LeadHunterSearchRequest> =
    {},
): LeadHunterSearchRequest {
  const defaultProvinces =
    strategy.recommended_locations.filter(
      (location) =>
        SOUTH_AFRICAN_PROVINCES.includes(
          location as
            (typeof SOUTH_AFRICAN_PROVINCES)[number],
        ),
    );

  const defaultCities =
    strategy.recommended_locations.filter(
      (location) =>
        !SOUTH_AFRICAN_PROVINCES.includes(
          location as
            (typeof SOUTH_AFRICAN_PROVINCES)[number],
        ) &&
        location !==
          "South Africa",
    );

  const strategyDepth =
    strategy.search_depth ??
    minimumDepthForServiceCount(
      strategy.services.length,
    );

  const strategyBudget =
    maxQueriesForDepth(
      strategyDepth,
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

    search_depth:
      strategyDepth,

    max_search_queries:
      strategyBudget,

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
  countries = ["South Africa"],
  revenueMode = "quick_revenue",
  searchDepth,
}: {
  instruction: string;

  services:
    LeadHunterServiceCategory[];

  companies:
    LeadHunterCompany[];

  scope?:
    LeadHunterSearchScope;

  deliveryModel?:
    LeadHunterDeliveryModel;

  locations?:
    string[];

  provinces?:
    string[];

  cities?:
    string[];

  countries?:
    string[];

  revenueMode?:
    LeadHunterRevenueMode;

  searchDepth?:
    LeadHunterSearchDepth;
}): LeadHunterSearchRequest {
  const resolvedDepth =
    searchDepth ??
    minimumDepthForServiceCount(
      services.length,
    );

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
      resolvedDepth,

    max_search_queries:
      maxQueriesForDepth(
        resolvedDepth,
      ),
  });
}

/* -------------------------------------------------------------------------- */
/* HUNT SUMMARY                                                               */
/* -------------------------------------------------------------------------- */

export function buildHuntSummary(
  requestInput:
    Partial<LeadHunterSearchRequest>,
): string[] {
  const request =
    validateSearchRequest(
      requestInput,
    );

  const summary = [
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

    `Services: ${request.services.join(
      ", ",
    )}`,

    `Locations: ${request.locations.join(
      ", ",
    )}`,
  ];

  if (
    request.objectives?.length
  ) {
    summary.push(
      `Objectives: ${request.objectives.join(
        ", ",
      )}`,
    );
  }

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
/* REQUEST FILTERS                                                            */
/* -------------------------------------------------------------------------- */

function sectorAllowedForRequest(
  request:
    LeadHunterSearchRequest,

  sector:
    LeadHunterSector,
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
    return request.include_private_sector;
  }

  if (
    sector ===
    "government"
  ) {
    return request.include_government_sector;
  }

  if (
    sector ===
    "nonprofit"
  ) {
    return request.include_nonprofits;
  }

  return false;
}

function prospectHasRequiredOpportunitySignal(
  prospect:
    LeadHunterProspect,
): boolean {
  if (
    prospect.signals.some(
      (signal) =>
        signal.type !==
        "general_fit",
    )
  ) {
    return true;
  }

  if (
    prospect.website_audit?.some(
      (finding) =>
        finding.verified ===
        true,
    )
  ) {
    return true;
  }

  if (
    prospect.procurement &&
    prospect.procurement.current_status ===
      "active" &&
    prospect.procurement.service_match_verified
  ) {
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* HUNT EXECUTION                                                             */
/* -------------------------------------------------------------------------- */

export async function huntProspects(
  request:
    Partial<LeadHunterSearchRequest>,

  signal?:
    AbortSignal,
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
          () => "",
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
        (prospect) => {
          if (
            prospect.verification_status ===
            "rejected"
          ) {
            return false;
          }

          if (
            effectiveRequest.exclude_existing_crm_leads &&
            (
              prospect.duplicate_status ===
                "existing_crm_lead" ||
              prospect.duplicate_status ===
                "excluded_existing_crm_lead"
            )
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

          /*
           * IMPORTANT:
           *
           * Evidence quantity now means INDEPENDENT SOURCE DOMAINS,
           * not simply the number of URLs.
           */
          const independentSourceCount =
            prospect.verification_meta
              ?.independent_source_count ??
            countIndependentEvidenceSources(
              prospect.evidence,
            ).count;

          if (
            independentSourceCount <
            effectiveRequest.minimum_evidence_sources
          ) {
            return false;
          }

          if (
            effectiveRequest.verified_sources_only &&
            prospect.evidence_score <
              55
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
            !prospectHasRequiredOpportunitySignal(
              prospect,
            )
          ) {
            return false;
          }

          if (
            prospect.classification ===
              "tender" &&
            !procurementCanBeVerified(
              prospect.classification,
              prospect.procurement ??
                null,
            )
          ) {
            return false;
          }

          if (
            prospect.classification ===
              "supplier_opportunity" &&
            !procurementCanBeVerified(
              prospect.classification,
              prospect.procurement ??
                null,
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
            return (
              calculateCommercialPriorityScore(
                second,
              ) -
              calculateCommercialPriorityScore(
                first,
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

  const calculatedIndependentSourceCount =
    new Set(
      acceptedProspects.flatMap(
        (prospect) =>
          prospect.verification_meta
            ?.corroborating_domains ??
          countIndependentEvidenceSources(
            prospect.evidence,
          ).domains,
      ),
    ).size;

  return {
    hunt_id:
      cleanText(
        payload.hunt_id,
      ) ??
      createClientId(),

    status:
      payload.status === "SUCCESS_WITH_RESULTS" ||
      payload.status === "SUCCESS_NO_VERIFIED_RESULTS" ||
      payload.status === "SUCCESS_WITH_PROVIDER_WARNINGS" ||
      payload.status === "PARTIAL_PROVIDER_FAILURE" ||
      payload.status === "FAILED"
        ? payload.status
        : acceptedProspects.length > 0
          ? "SUCCESS_WITH_RESULTS"
          : "SUCCESS_NO_VERIFIED_RESULTS",

    searched_at:
      safeDateString(
        payload.searched_at,
      ) ??
      new Date().toISOString(),

    completed_at:
      safeDateString(
        payload.completed_at,
      ) ??
      new Date().toISOString(),

    request:
      effectiveRequest,

    prospects:
      acceptedProspects,

    source_count:
      payloadSourceCount ??
      calculatedIndependentSourceCount,

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

    provider_diagnostics:
      Array.isArray(payload.provider_diagnostics)
        ? payload.provider_diagnostics.flatMap((entry) => {
            if (!entry || typeof entry !== "object") return [];
            const item = entry as Partial<LeadHunterProviderDiagnostic>;
            return [{
              provider: cleanText(item.provider) ?? "Unknown provider",
              attempted: item.attempted === true,
              configured: item.configured === true,
              succeeded: item.succeeded === true,
              failed: item.failed === true,
              warning: cleanText(item.warning),
              http_status: safeNumber(item.http_status),
              error_reason: cleanText(item.error_reason),
              result_count: safeNumber(item.result_count) ?? 0,
              source_count: safeNumber(item.source_count) ?? 0,
              timing_ms: safeNumber(item.timing_ms),
              configuration_required: item.configuration_required === true,
            }];
          })
        : [],
  };
}

/* -------------------------------------------------------------------------- */
/* CRM DUPLICATE CHECK                                                        */
/* -------------------------------------------------------------------------- */

export async function findCrmDuplicates(
  prospect:
    LeadHunterProspect,
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
    data ?? []
  )
    .map(
      (
        row:
          Record<string, unknown>,
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
          string[] = [];

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
        match.match_reasons.length >
        0,
    );
}

/* -------------------------------------------------------------------------- */
/* PROSPECT EVIDENCE FORMAT                                                   */
/* -------------------------------------------------------------------------- */

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
          .filter(Boolean)
          .join("\n"),
    );

  const verificationMeta =
    prospect.verification_meta;

  const procurement =
    prospect.procurement;

  const websiteAuditLines =
    (
      prospect.website_audit ??
      []
    )
      .filter(
        (finding) =>
          finding.verified,
      )
      .map(
        (
          finding,
          index,
        ) =>
          `${index + 1}. ${finding.type} (${finding.severity}) — ${finding.evidence} — ${finding.source_url}`,
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

    `Commercial priority: ${calculateCommercialPriorityScore(
      prospect,
    )}/100`,

    `Revenue potential: ${prospect.revenue_potential_score}/100`,

    `Ease to close: ${prospect.ease_to_close_score}/100`,

    `Recurring revenue potential: ${prospect.recurring_revenue_score}/100`,

    `Geographic fit: ${prospect.geographic_fit_score}/100`,

    `Date verified: ${prospect.date_verified}`,

    verificationMeta
      ? `Independent source count: ${verificationMeta.independent_source_count}`
      : null,

    verificationMeta
      ? `Cross-verified: ${
          verificationMeta.cross_verified
            ? "YES"
            : "NO"
        }`
      : null,

    verificationMeta
      ?.corroborating_domains
      .length
      ? `Corroborating domains: ${verificationMeta.corroborating_domains.join(
          ", ",
        )}`
      : null,

    procurement
      ? `Procurement reference: ${
          procurement.reference_number ??
          "Not verified"
        }`
      : null,

    procurement
      ? `Procurement closing date: ${
          procurement.closing_date ??
          "Not verified"
        }`
      : null,

    procurement
      ? `Procurement status: ${procurement.current_status}`
      : null,

    "",

    "WHY CONTACT",

    ...(
      prospect.why_contact.length >
      0
        ? prospect.why_contact.map(
            (reason) =>
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

    websiteAuditLines.length >
    0
      ? ""
      : null,

    websiteAuditLines.length >
    0
      ? "VERIFIED WEBSITE AUDIT"
      : null,

    ...websiteAuditLines,

    "",

    "PUBLIC EVIDENCE",

    ...evidenceLines,
  ]
    .filter(
      (value) =>
        value !==
          null &&
        value !==
          undefined,
    )
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* CRM SAVE ELIGIBILITY                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Automatic workforce promotion to CRM is intentionally stricter than simply
 * being visible in Hunter results.
 *
 * A prospect can be displayed as partially verified for research, but the
 * automatic workforce path only promotes VERIFIED prospects.
 */
export function prospectEligibleForAutomaticCrmSave(
  prospect:
    LeadHunterProspect,
): boolean {
  if (
    prospect.verification_status !==
    "verified"
  ) {
    return false;
  }

  if (
    prospect.classification ===
    "rejected"
  ) {
    return false;
  }

  if (
    prospect.duplicate_status ===
      "existing_crm_lead" ||
    prospect.duplicate_status ===
      "excluded_existing_crm_lead"
  ) {
    return false;
  }

  if (
    !prospect.primary_source_url
  ) {
    return false;
  }

  const independentSources =
    prospect.verification_meta
      ?.independent_source_count ??
    countIndependentEvidenceSources(
      prospect.evidence,
    ).count;

  if (
    independentSources <
    2
  ) {
    return false;
  }

  if (
    isProcurementClassification(
      prospect.classification,
    ) &&
    !procurementCanBeVerified(
      prospect.classification,
      prospect.procurement ??
        null,
    )
  ) {
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* SAVE ONE PROSPECT                                                          */
/* -------------------------------------------------------------------------- */

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
    prospect.duplicate_status ===
    "excluded_existing_crm_lead"
  ) {
    throw new Error(
      "This prospect was excluded because it already exists in CRM.",
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
    isProcurementClassification(
      prospect.classification,
    ) &&
    !procurementCanBeVerified(
      prospect.classification,
      prospect.procurement ??
        null,
    )
  ) {
    throw new Error(
      "This procurement opportunity cannot be saved as verified until its official source, service match and current procurement state are verified.",
    );
  }

  const duplicateMatches =
    await findCrmDuplicates(
      prospect,
    );

  const strongestDuplicate =
    duplicateMatches.find(
      (match) =>
        match.match_reasons.some(
          (reason) =>
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
      "tender" ||
    prospect.classification ===
      "supplier_opportunity"
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
          .filter(Boolean)
          .join(", "),

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

/* -------------------------------------------------------------------------- */
/* SAVE MANY PROSPECTS                                                        */
/* -------------------------------------------------------------------------- */

export async function saveProspectsToCrm(
  prospects:
    LeadHunterProspect[],
): Promise<SaveProspectsBatchResult> {
  const created:
    SaveProspectResult[] =
    [];

  const duplicates:
    SaveProspectResult[] =
    [];

  const failed:
    SaveProspectsBatchResult["failed"] =
    [];

  for (
    const prospect
    of prospects
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
/* WORKFORCE REQUEST BUILDER                                                  */
/* -------------------------------------------------------------------------- */

function buildWorkforceSearchInstruction(
  input:
    LeadHunterWorkforceExecutionInput,
): string {
  const parts = [
    cleanLongText(
      input.objective,
      MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
    ),

    cleanLongText(
      input.instruction,
      1_000,
    ),

    input.targetMarket
      ? `Target market: ${cleanText(
          input.targetMarket,
        )}`
      : null,

    input.targetLocation
      ? `Location: ${cleanText(
          input.targetLocation,
        )}`
      : null,

    input.targetService
      ? `Services: ${cleanText(
          input.targetService,
        )}`
      : null,

    input.resultCount
      ? `Results: ${Math.max(
          1,
          Math.min(
            MAX_HUNT_RESULTS,
            Math.round(
              input.resultCount,
            ),
          ),
        )}`
      : null,

    input.minimumScore
      ? `Minimum score: ${clampScore(
          input.minimumScore,
        )}`
      : null,
  ]
    .filter(
      (
        value,
      ): value is string =>
        Boolean(
          cleanText(
            value,
          ),
        ),
    );

  return parts
    .join("\n")
    .slice(
      0,
      MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
    );
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE OUTPUT                                                           */
/* -------------------------------------------------------------------------- */

function formatWorkforceProspect(
  prospect:
    LeadHunterProspect,
  index: number,
): string {
  const location = [
    prospect.suburb,
    prospect.city,
    prospect.province,
    prospect.country,
  ]
    .filter(Boolean)
    .join(", ");

  const independentSources =
    prospect.verification_meta
      ?.independent_source_count ??
    countIndependentEvidenceSources(
      prospect.evidence,
    ).count;

  return [
    `${index + 1}. ${prospect.organisation_name}`,

    `Classification: ${prospect.classification}`,

    `Verification: ${prospect.verification_status}`,

    `Sales priority: ${prospect.sales_priority}`,

    `Recommended business: ${prospect.recommended_company}`,

    `Recommended service: ${prospect.recommended_service}`,

    `Location: ${
      location ||
      "Not fully verified"
    }`,

    `Total score: ${prospect.total_score}/100`,

    `Commercial priority: ${calculateCommercialPriorityScore(
      prospect,
    )}/100`,

    `Revenue potential: ${prospect.revenue_potential_score}/100`,

    `Ease to close: ${prospect.ease_to_close_score}/100`,

    `Recurring value: ${prospect.recurring_revenue_score}/100`,

    `Independent sources: ${independentSources}`,

    `Opportunity: ${prospect.opportunity_summary}`,

    `Why contact: ${
      prospect.why_contact.length >
      0
        ? prospect.why_contact.join(
            " ",
          )
        : "No additional verified commercial reason."
    }`,

    `Next action: ${prospect.next_action}`,

    `Source: ${prospect.primary_source_url}`,
  ].join("\n");
}

function formatLeadHunterWorkforceOutput({
  hunt,
  crm,
}: {
  hunt:
    LeadHunterSearchResponse;

  crm:
    SaveProspectsBatchResult;
}): string {
  const topProspects =
    hunt.prospects.slice(
      0,
      10,
    );

  const verifiedCount =
    hunt.prospects.filter(
      (prospect) =>
        prospect.verification_status ===
        "verified",
    ).length;

  const partiallyVerifiedCount =
    hunt.prospects.filter(
      (prospect) =>
        prospect.verification_status ===
        "partially_verified",
    ).length;

  const hotCount =
    hunt.prospects.filter(
      (prospect) =>
        prospect.sales_priority ===
        "hot",
    ).length;

  const warmCount =
    hunt.prospects.filter(
      (prospect) =>
        prospect.sales_priority ===
        "warm",
    ).length;

  return [
    "LEAD HUNTER EXECUTION",

    "",

    `Hunt ID: ${hunt.hunt_id}`,

    `Status: ${hunt.status}`,

    `Providers: ${
      hunt.providers_used.length >
      0
        ? hunt.providers_used.join(
            ", ",
          )
        : "No provider reported"
    }`,

    `Search depth: ${hunt.request.search_depth ?? "unknown"}`,

    `Revenue mode: ${hunt.request.revenue_mode ?? "unknown"}`,

    `Accepted prospects: ${hunt.accepted_count}`,

    `Rejected during filtering: ${hunt.rejected_count}`,

    `Verified prospects: ${verifiedCount}`,

    `Partially verified prospects: ${partiallyVerifiedCount}`,

    `Hot opportunities: ${hotCount}`,

    `Warm opportunities: ${warmCount}`,

    `CRM leads created: ${crm.created.length}`,

    `Existing CRM matches retained: ${crm.duplicates.length}`,

    `CRM save failures: ${crm.failed.length}`,

    "",

    "TOP REVENUE OPPORTUNITIES",

    "",

    ...(topProspects.length >
    0
      ? topProspects.map(
          (
            prospect,
            index,
          ) =>
            formatWorkforceProspect(
              prospect,
              index,
            ),
        )
      : [
          "No prospect passed the current verification and commercial filters.",
        ]),

    "",

    "HANDOFF TO LEAD INTAKE",

    crm.created.length >
    0
      ? `${crm.created.length} verified CRM lead record(s) are available for Lead Intake and Sales & Conversion.`
      : "No new verified CRM lead was automatically created during this hunt.",

    crm.duplicates.length >
    0
      ? `${crm.duplicates.length} existing CRM record(s) were retained instead of duplicated.`
      : "No existing CRM duplicate was retained during this hunt.",

    "",

    "WARNINGS",

    ...(hunt.warnings.length >
    0
      ? hunt.warnings.map(
          (warning) =>
            `- ${warning}`,
        )
      : [
          "- No Hunter warning was returned.",
        ]),

    "",

    "EXTERNAL ACTION STATUS",

    "Prospects contacted: NO",

    "Emails/messages sent: NO",

    "Advertising spend: NO",

    "Supplier orders: NO",

    "Tender submissions: NO",

    "Contracts/promises made: NO",

    "",

    "Lead Hunter completed evidence-backed internal research only.",
  ].join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE EXECUTION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Specialised employee executor.
 *
 * This function is intended to be called by the AI Workforce when
 * employee.employee_key === "lead-hunter".
 *
 * It intentionally bypasses generic streamChat/Groq prospect generation.
 */
export async function runLeadHunterWorkforceHunt(
  input:
    LeadHunterWorkforceExecutionInput,
): Promise<LeadHunterWorkforceExecutionResult> {
  const objective =
    cleanLongText(
      input.objective,
      MAX_CUSTOM_SEARCH_INSTRUCTION_LENGTH,
    );

  if (
    !objective
  ) {
    throw new Error(
      "Lead Hunter requires a real revenue-hunting objective.",
    );
  }

  const instruction =
    buildWorkforceSearchInstruction(
      input,
    );

  const inferredServices =
    inferServicesFromInstruction(
      instruction,
    );

  const inferredDepth =
    input.searchDepth ??
    inferSearchDepthFromInstruction(
      instruction,
    ) ??
    (
      inferredServices.length >
      0
        ? minimumDepthForServiceCount(
            inferredServices.length,
          )
        : "economy"
    );

  const inferredRevenueMode =
    input.revenueMode ??
    inferRevenueModeFromInstruction(
      instruction,
    ) ??
    "quick_revenue";

  const request =
    validateSearchRequest({
      ...DEFAULT_LEAD_HUNTER_REQUEST,

      search_instruction:
        instruction,

      result_count:
        input.resultCount ??
        DEFAULT_WORKFORCE_HUNT_RESULTS,

      minimum_score:
        input.minimumScore ??
        DEFAULT_LEAD_HUNTER_REQUEST.minimum_score,

      search_depth:
        inferredDepth,

      max_search_queries:
        maxQueriesForDepth(
          inferredDepth,
        ),

      revenue_mode:
        inferredRevenueMode,

      revenue_first:
        true,

      exclude_existing_crm_leads:
        true,

      exclude_competitors:
        true,

      exclude_directories:
        true,

      exclude_expired_procurement:
        true,

      verified_sources_only:
        true,

      use_cached_results:
        true,
    });

  const hunt =
    await huntProspects(
      request,
      input.signal,
    );

  /*
   * Only VERIFIED prospects are automatically promoted into CRM.
   *
   * Partially verified research remains visible in the workforce output,
   * but does not silently enter the operational sales pipeline.
   */
  const prospectsForCrm =
    hunt.prospects.filter(
      prospectEligibleForAutomaticCrmSave,
    );

  const saveToCrm =
    input.saveVerifiedProspectsToCrm !==
    false;

  const crm:
    SaveProspectsBatchResult =
    saveToCrm
      ? await saveProspectsToCrm(
          prospectsForCrm,
        )
      : {
          created:
            [],

          duplicates:
            [],

          failed:
            [],
        };

  const prospectIds =
    hunt.prospects.map(
      (prospect) =>
        prospect.id,
    );

  const leadIds =
    crm.created.map(
      (result) =>
        result.lead_id,
    );

  const duplicateLeadIds =
    crm.duplicates.map(
      (result) =>
        result.lead_id,
    );

  const failedProspectIds =
    crm.failed.map(
      (item) =>
        item.prospect.id,
    );

  const content =
    formatLeadHunterWorkforceOutput({
      hunt,
      crm,
    });

  return {
    hunt,

    crm,

    content,

    retained_record_ids: {
      hunt_id:
        hunt.hunt_id,

      prospect_ids:
        prospectIds,

      lead_ids:
        leadIds,

      duplicate_lead_ids:
        duplicateLeadIds,

      failed_prospect_ids:
        failedProspectIds,
    },

    provider:
      LEAD_HUNTER_TOOL_PROVIDER,

    model:
      LEAD_HUNTER_TOOL_MODEL,

    external_actions: {
      prospect_contacted:
        false,

      spending_executed:
        false,

      bid_submitted:
        false,

      contract_committed:
        false,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* CSV EXPORT                                                                 */
/* -------------------------------------------------------------------------- */

export function exportProspectsToCsv(
  prospects:
    LeadHunterProspect[],
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
    "Country",
    "Recommended Company",
    "Recommended Service",
    "Opportunity",
    "Classification",
    "Verification",
    "Independent Sources",
    "Cross Verified",
    "Procurement Reference",
    "Procurement Closing Date",
    "Procurement Status",
    "Sales Priority",
    "Score",
    "Commercial Priority",
    "Revenue Potential",
    "Ease to Close",
    "Recurring Revenue Potential",
    "Geographic Fit",
    "Primary Source",
    "Date Verified",
    "Next Action",
  ];

  const escapeCsv = (
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
      (prospect) => [
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

        prospect.verification_meta
          ?.independent_source_count ??
          countIndependentEvidenceSources(
            prospect.evidence,
          ).count,

        prospect.verification_meta
          ?.cross_verified
          ? "YES"
          : "NO",

        prospect.procurement
          ?.reference_number,

        prospect.procurement
          ?.closing_date,

        prospect.procurement
          ?.current_status,

        prospect.sales_priority,

        prospect.total_score,

        calculateCommercialPriorityScore(
          prospect,
        ),

        prospect.revenue_potential_score,

        prospect.ease_to_close_score,

        prospect.recurring_revenue_score,

        prospect.geographic_fit_score,

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
      .join(","),

    ...rows.map(
      (row) =>
        row
          .map(
            escapeCsv,
          )
          .join(","),
    ),
  ].join("\n");
}
