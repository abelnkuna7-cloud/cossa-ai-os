import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Gauge,
  Globe2,
  Layers3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Radar,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_LEAD_HUNTER_REQUEST,
  DELIVERY_MODEL_OPTIONS,
  LEAD_HUNTER_STRATEGIES,
  REVENUE_MODE_OPTIONS,
  SEARCH_DEPTH_OPTIONS,
  SEARCH_SCOPE_OPTIONS,
  SOUTH_AFRICAN_PROVINCES,
  buildHuntSummary,
  exportProspectsToCsv,
  huntProspects,
  maxQueriesForDepth,
  requestFromStrategy,
  saveProspectToCrm,
  validateSearchRequest,
  type LeadHunterCompany,
  type LeadHunterDeliveryModel,
  type LeadHunterProspect,
  type LeadHunterRevenueMode,
  type LeadHunterSearchDepth,
  type LeadHunterSearchRequest,
  type LeadHunterSearchResponse,
  type LeadHunterSearchScope,
  type LeadHunterSector,
  type LeadHunterServiceCategory,
  type ProspectSalesPriority,
  type ProspectVerificationStatus,
} from "@/lib/lead-hunter-data";
import { cn } from "@/lib/utils";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute(
  "/sales/lead-finder",
)({
  component: LeadHunterPage,

  head: () => ({
    meta: [
      {
        title:
          "Lead Hunter — Cossa AI",
      },
      {
        name: "description",
        content:
          "Find verified customers, projects, tenders and service opportunities from public evidence across South Africa and remote markets.",
      },
      {
        property: "og:title",
        content:
          "Lead Hunter — Cossa AI",
      },
      {
        property: "og:description",
        content:
          "Production prospect research, commercial scoring, source verification and CRM lead capture.",
      },
    ],
  }),
});

type HuntState =
  | "idle"
  | "searching"
  | "completed"
  | "error";

const COMPANY_OPTIONS: Array<{
  value: LeadHunterCompany;
  label: string;
}> = [
  {
    value:
      "cossa_nexus_holdings",
    label:
      "Cossa Nexus Holdings",
  },
  {
    value:
      "cossa_nexus_construction",
    label:
      "Cossa Nexus Construction",
  },
  {
    value:
      "cossa_facility_services",
    label:
      "Cossa Facility Services",
  },
  {
    value:
      "cossa_tech",
    label:
      "Cossa Tech",
  },
  {
    value:
      "cossa_ai_growth",
    label:
      "Cossa AI Growth",
  },
  {
    value: "nexdocs",
    label: "NexDocs",
  },
  {
    value:
      "cossa_store",
    label:
      "Cossa Store",
  },
];

const SERVICE_OPTIONS: Array<{
  value: LeadHunterServiceCategory;
  label: string;
}> = [
  {
    value: "construction",
    label: "Construction",
  },
  {
    value: "renovation",
    label: "Renovations",
  },
  {
    value:
      "property_maintenance",
    label:
      "Property Maintenance",
  },
  {
    value: "painting",
    label: "Painting",
  },
  {
    value: "tiling",
    label: "Tiling",
  },
  {
    value: "ceilings",
    label: "Ceilings",
  },
  {
    value: "roofing",
    label: "Roofing",
  },
  {
    value: "plumbing",
    label: "Plumbing",
  },
  {
    value:
      "facility_management",
    label:
      "Facility Management",
  },
  {
    value:
      "commercial_cleaning",
    label:
      "Commercial Cleaning",
  },
  {
    value:
      "deep_cleaning",
    label:
      "Deep Cleaning",
  },
  {
    value: "hygiene",
    label:
      "Hygiene & Sanitation",
  },
  {
    value: "landscaping",
    label: "Landscaping",
  },
  {
    value:
      "waste_management",
    label:
      "Waste Management",
  },
  {
    value:
      "website_design",
    label:
      "Website Design",
  },
  {
    value: "logo_design",
    label:
      "Logo Design",
  },
  {
    value: "branding",
    label: "Branding",
  },
  {
    value: "seo",
    label: "SEO",
  },
  {
    value:
      "digital_marketing",
    label:
      "Digital Marketing",
  },
  {
    value:
      "social_media_management",
    label:
      "Social Media Management",
  },
  {
    value:
      "google_business_profile",
    label:
      "Google Business Profile",
  },
  {
    value:
      "lead_generation",
    label:
      "Lead Generation",
  },
  {
    value: "crm",
    label: "CRM Systems",
  },
  {
    value:
      "ai_automation",
    label:
      "AI Automation",
  },
  {
    value:
      "business_documents",
    label:
      "Business Documents",
  },
  {
    value: "quotations",
    label: "Quotations",
  },
  {
    value: "proposals",
    label: "Proposals",
  },
  {
    value: "contracts",
    label: "Contracts",
  },
  {
    value: "ecommerce",
    label: "E-commerce",
  },
];

const DIGITAL_SERVICES =
  new Set<LeadHunterServiceCategory>([
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

const PROCUREMENT_SERVICES =
  new Set<LeadHunterServiceCategory>([
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
    "website_design",
    "branding",
    "digital_marketing",
    "crm",
    "ai_automation",
  ]);

const COSSA_COMPANY_AS_ORGANISATION_TYPE_PATTERN =
  /\b(?:cossa nexus(?: holdings| construction)?|cossa facility services|cossa tech|cossa ai growth|cossa store|nexdocs)\b/i;

function parseCommaSeparated(
  value: string,
): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function LeadHunterPage() {
  const abortRef =
    useRef<AbortController | null>(
      null,
    );

  const [request, setRequest] =
    useState<LeadHunterSearchRequest>({
      ...DEFAULT_LEAD_HUNTER_REQUEST,
    });

  const [
    selectedStrategyId,
    setSelectedStrategyId,
  ] = useState<string>(
    LEAD_HUNTER_STRATEGIES[0]
      ?.id ?? "",
  );

  const [
    searchInstruction,
    setSearchInstruction,
  ] = useState(
    DEFAULT_LEAD_HUNTER_REQUEST
      .search_instruction ?? "",
  );

  const [
    locationInput,
    setLocationInput,
  ] = useState(
    DEFAULT_LEAD_HUNTER_REQUEST.locations.join(
      ", ",
    ),
  );

  const [
    countryInput,
    setCountryInput,
  ] = useState(
    (
      DEFAULT_LEAD_HUNTER_REQUEST
        .countries ?? [
        "South Africa",
      ]
    ).join(", "),
  );

  const [
    provinceInput,
    setProvinceInput,
  ] = useState(
    (
      DEFAULT_LEAD_HUNTER_REQUEST
        .provinces ?? [
        "Gauteng",
      ]
    ).join(", "),
  );

  const [
    cityInput,
    setCityInput,
  ] = useState(
    (
      DEFAULT_LEAD_HUNTER_REQUEST
        .cities ?? [
        "Pretoria",
        "Centurion",
        "Midrand",
        "Johannesburg",
      ]
    ).join(", "),
  );

  const [
    suburbInput,
    setSuburbInput,
  ] = useState("");

  const [
    industryInput,
    setIndustryInput,
  ] = useState("");

  const [
    organisationTypeInput,
    setOrganisationTypeInput,
  ] = useState("");

  const [
    keywordInput,
    setKeywordInput,
  ] = useState(
    DEFAULT_LEAD_HUNTER_REQUEST.prospect_keywords.join(
      ", ",
    ),
  );

  const [
    tenderKeywordInput,
    setTenderKeywordInput,
  ] = useState(
    (
      DEFAULT_LEAD_HUNTER_REQUEST
        .tender_keywords ?? []
    ).join(", "),
  );

  const [
    result,
    setResult,
  ] =
    useState<LeadHunterSearchResponse | null>(
      null,
    );

  const [
    huntState,
    setHuntState,
  ] =
    useState<HuntState>("idle");

  const [
    huntError,
    setHuntError,
  ] =
    useState<string | null>(null);

  const [
    savingProspectIds,
    setSavingProspectIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    savedProspectIds,
    setSavedProspectIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    duplicateProspectIds,
    setDuplicateProspectIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    expandedProspectIds,
    setExpandedProspectIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    noticesExpanded,
    setNoticesExpanded,
  ] = useState(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current =
        null;
    };
  }, []);

  const prospects =
    result?.prospects ?? [];

  const verifiedCount =
    prospects.filter(
      (prospect) =>
        prospect.verification_status ===
        "verified",
    ).length;

  const governmentCount =
    prospects.filter(
      (prospect) =>
        prospect.sector ===
        "government",
    ).length;

  const contactableCount =
    prospects.filter(
      (prospect) =>
        prospect.public_phone ||
        prospect.public_email,
    ).length;

  const hotLeadCount =
    prospects.filter(
      (prospect) =>
        prospect.sales_priority ===
        "hot",
    ).length;

  const opportunityCount =
    prospects.filter((prospect) =>
      [
        "active_opportunity",
        "tender",
        "supplier_opportunity",
        "partnership",
      ].includes(
        prospect.classification,
      ),
    ).length;

  const averageScore =
    prospects.length > 0
      ? Math.round(
          prospects.reduce(
            (
              total,
              prospect,
            ) =>
              total +
              prospect.total_score,
            0,
          ) / prospects.length,
        )
      : 0;

  const selectedStrategy =
    useMemo(
      () =>
        LEAD_HUNTER_STRATEGIES.find(
          (strategy) =>
            strategy.id ===
            selectedStrategyId,
        ) ?? null,
      [selectedStrategyId],
    );

  const selectedDigitalServiceCount =
    useMemo(
      () =>
        request.services.filter(
          (service) =>
            DIGITAL_SERVICES.has(
              service,
            ),
        ).length,
      [request.services],
    );

  const selectedProcurementServiceCount =
    useMemo(
      () =>
        request.services.filter(
          (service) =>
            PROCUREMENT_SERVICES.has(
              service,
            ),
        ).length,
      [request.services],
    );

  const activeDepth =
    request.search_depth ??
    "economy";

  const queryCapacity =
    Math.min(
      maxQueriesForDepth(
        activeDepth,
      ),
      request.max_search_queries ??
        maxQueriesForDepth(
          activeDepth,
        ),
    );

  const serviceCapacityExceeded =
    request.services.length >
    queryCapacity;

  const currentSummary =
    useMemo(
      () =>
        buildHuntSummary({
          ...request,

          search_instruction:
            searchInstruction,

          locations:
            parseCommaSeparated(
              locationInput,
            ),

          countries:
            parseCommaSeparated(
              countryInput,
            ),

          provinces:
            parseCommaSeparated(
              provinceInput,
            ),

          cities:
            parseCommaSeparated(
              cityInput,
            ),

          suburbs:
            parseCommaSeparated(
              suburbInput,
            ),

          industries:
            parseCommaSeparated(
              industryInput,
            ),

          organisation_types:
            parseCommaSeparated(
              organisationTypeInput,
            ),

          prospect_keywords:
            parseCommaSeparated(
              keywordInput,
            ),

          tender_keywords:
            parseCommaSeparated(
              tenderKeywordInput,
            ),
        }),
      [
        request,
        searchInstruction,
        locationInput,
        countryInput,
        provinceInput,
        cityInput,
        suburbInput,
        industryInput,
        organisationTypeInput,
        keywordInput,
        tenderKeywordInput,
      ],
    );

  function applyStrategy(
    strategyId: string,
  ) {
    const strategy =
      LEAD_HUNTER_STRATEGIES.find(
        (item) =>
          item.id ===
          strategyId,
      );

    setSelectedStrategyId(
      strategyId,
    );

    if (!strategy) {
      return;
    }

    const strategyRequest =
      requestFromStrategy(
        strategy,
      );

    setRequest(
      strategyRequest,
    );

    setSearchInstruction(
      strategyRequest
        .search_instruction ?? "",
    );

    setLocationInput(
      strategyRequest.locations.join(
        ", ",
      ),
    );

    setCountryInput(
      (
        strategyRequest.countries ??
        []
      ).join(", "),
    );

    setProvinceInput(
      (
        strategyRequest.provinces ??
        []
      ).join(", "),
    );

    setCityInput(
      (
        strategyRequest.cities ??
        []
      ).join(", "),
    );

    setSuburbInput(
      (
        strategyRequest.suburbs ??
        []
      ).join(", "),
    );

    setIndustryInput(
      strategyRequest.industries.join(
        ", ",
      ),
    );

    setOrganisationTypeInput(
      strategyRequest.organisation_types.join(
        ", ",
      ),
    );

    setKeywordInput(
      strategyRequest.prospect_keywords.join(
        ", ",
      ),
    );

    setTenderKeywordInput(
      (
        strategyRequest.tender_keywords ??
        []
      ).join(", "),
    );

    resetResults();
  }

  function resetResults() {
    abortRef.current?.abort();
    abortRef.current =
      null;

    setResult(null);
    setHuntState("idle");
    setHuntError(null);

    setSavedProspectIds(
      new Set(),
    );

    setDuplicateProspectIds(
      new Set(),
    );

    setExpandedProspectIds(
      new Set(),
    );

    setNoticesExpanded(false);
  }

  function toggleCompany(
    company: LeadHunterCompany,
  ) {
    setRequest((current) => {
      const exists =
        current.companies.includes(
          company,
        );

      return {
        ...current,

        companies: exists
          ? current.companies.filter(
              (item) =>
                item !== company,
            )
          : [
              ...current.companies,
              company,
            ],
      };
    });
  }

  function toggleService(
    service:
      LeadHunterServiceCategory,
  ) {
    setRequest((current) => {
      const exists =
        current.services.includes(
          service,
        );

      return {
        ...current,

        services: exists
          ? current.services.filter(
              (item) =>
                item !== service,
            )
          : [
              ...current.services,
              service,
            ],
      };
    });
  }

  function selectAllCompanies() {
    setRequest((current) => ({
      ...current,

      companies:
        COMPANY_OPTIONS.map(
          (item) =>
            item.value,
        ),
    }));
  }

  function clearCompanies() {
    setRequest((current) => ({
      ...current,
      companies: [],
    }));
  }

  function clearServices() {
    setRequest((current) => ({
      ...current,
      services: [],
    }));
  }

  function selectProvince(
    province: string,
  ) {
    const current =
      parseCommaSeparated(
        provinceInput,
      );

    const exists =
      current.some(
        (item) =>
          item.toLowerCase() ===
          province.toLowerCase(),
      );

    const next = exists
      ? current.filter(
          (item) =>
            item.toLowerCase() !==
            province.toLowerCase(),
        )
      : [
          ...current,
          province,
        ];

    setProvinceInput(
      next.join(", "),
    );
  }

  function changeSearchDepth(
    depth:
      LeadHunterSearchDepth,
  ) {
    setRequest(
      (current) => ({
        ...current,

        search_depth:
          depth,

        max_search_queries:
          maxQueriesForDepth(
            depth,
          ),
      }),
    );
  }

  function setSector(
    sector: LeadHunterSector,
  ) {
    setRequest(
      (current) => ({
        ...current,

        sector,

        include_private_sector:
          sector === "private" ||
          sector === "mixed",

        include_government_sector:
          sector === "government" ||
          sector === "mixed",

        include_nonprofits:
          sector === "nonprofit" ||
          sector === "mixed",
      }),
    );
  }

  function showHuntValidationError(
    message: string,
  ) {
    setResult(null);
    setHuntError(message);
    setHuntState("error");
    toast.error(message);
  }

  async function runHunt() {
    if (
      huntState ===
      "searching"
    ) {
      return;
    }

    abortRef.current?.abort();

    if (
      request.companies.length ===
      0
    ) {
      showHuntValidationError(
        "Choose at least one Cossa company.",
      );
      return;
    }

    if (
      request.services.length ===
      0
    ) {
      showHuntValidationError(
        "Choose at least one service.",
      );
      return;
    }

    const instruction =
      searchInstruction.trim();

    if (
      !instruction &&
      !request.search_everything
    ) {
      showHuntValidationError(
        "Tell Lead Hunter exactly what you want it to find.",
      );
      return;
    }

    const locations =
      parseCommaSeparated(
        locationInput,
      );

    const countries =
      parseCommaSeparated(
        countryInput,
      );

    const provinces =
      parseCommaSeparated(
        provinceInput,
      );

    const cities =
      parseCommaSeparated(
        cityInput,
      );

    const suburbs =
      parseCommaSeparated(
        suburbInput,
      );

    const finalRequest =
      validateSearchRequest({
        ...request,

        search_instruction:
          instruction ||
          "Search everything relevant to the selected Cossa services and return the strongest verified opportunities.",

        locations,

        countries,

        provinces,

        cities,

        suburbs,

        industries:
          parseCommaSeparated(
            industryInput,
          ),

        organisation_types:
          parseCommaSeparated(
            organisationTypeInput,
          ),

        prospect_keywords:
          parseCommaSeparated(
            keywordInput,
          ),

        tender_keywords:
          parseCommaSeparated(
            tenderKeywordInput,
          ),
      });

    const misplacedCossaCompany =
      finalRequest.organisation_types.find(
        (
          organisationType,
        ) =>
          COSSA_COMPANY_AS_ORGANISATION_TYPE_PATTERN.test(
            organisationType,
          ),
      );

    if (
      misplacedCossaCompany
    ) {
      showHuntValidationError(
        `Remove "${misplacedCossaCompany}" from Organisation types. Cossa companies belong in the Cossa companies selector; Organisation types must describe buyers.`,
      );
      return;
    }

    const searchDepth =
      finalRequest.search_depth ??
      "economy";

    const requestedQueryBudget =
      finalRequest.max_search_queries ??
      maxQueriesForDepth(
        searchDepth,
      );

    const serviceQueryBudget =
      Math.min(
        maxQueriesForDepth(
          searchDepth,
        ),
        requestedQueryBudget,
      );

    if (
      finalRequest.services.length >
      serviceQueryBudget
    ) {
      showHuntValidationError(
        `${searchDepth === "economy" ? "Economy" : "This"} search depth can cover at most ${serviceQueryBudget} selected services per hunt. Run focused service batches or choose a deeper search depth.`,
      );
      return;
    }

    const hasEnabledSector =
      finalRequest.include_private_sector ||
      finalRequest.include_government_sector ||
      finalRequest.include_nonprofits;

    if (!hasEnabledSector) {
      showHuntValidationError(
        "Enable at least one buyer sector.",
      );
      return;
    }

    const scope =
      finalRequest.search_scope;

    const needsSpecificArea =
      scope === "local" ||
      scope === "city" ||
      scope === "province" ||
      scope === "custom";

    if (
      needsSpecificArea &&
      locations.length === 0 &&
      provinces.length === 0 &&
      cities.length === 0 &&
      suburbs.length === 0
    ) {
      showHuntValidationError(
        "Enter at least one location, province, city or suburb for this search scope.",
      );
      return;
    }

    const controller =
      new AbortController();

    abortRef.current =
      controller;

    setHuntState(
      "searching",
    );

    setHuntError(null);
    setResult(null);
    setNoticesExpanded(false);

    try {
      const response =
        await huntProspects(
          finalRequest,
          controller.signal,
        );

      if (
        controller.signal
          .aborted
      ) {
        return;
      }

      setRequest(
        response.request,
      );

      setSearchInstruction(
        response.request
          .search_instruction ??
          instruction,
      );

      setResult(
        response,
      );

      setHuntState(
        "completed",
      );

      if (
        response.prospects.length ===
        0
      ) {
        toast.warning(
          "No verified prospects met the current rules.",
          {
            description:
              "The Hunter found no result strong enough to pass the active verification rules.",
          },
        );
      } else {
        toast.success(
          `${response.prospects.length} qualified prospects found`,
          {
            description:
              `${response.source_count} candidate sources were evaluated.`,
          },
        );
      }
    } catch (error) {
      const isAbort =
        error instanceof DOMException &&
        error.name === "AbortError";

      if (isAbort) {
        setHuntState(
          "idle",
        );

        setHuntError(
          "The hunt was cancelled. No CRM records were changed.",
        );

        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Lead Hunter search failed.";

      setHuntError(
        message,
      );

      setHuntState(
        "error",
      );

      toast.error(
        "Lead Hunter search failed",
        {
          description:
            message,
        },
      );
    } finally {
      if (
        abortRef.current ===
        controller
      ) {
        abortRef.current =
          null;
      }
    }
  }

  function cancelHunt() {
    abortRef.current?.abort();
    abortRef.current =
      null;

    setHuntState(
      "idle",
    );

    setHuntError(
      "The hunt was cancelled. No CRM records were changed.",
    );

    toast.info(
      "Lead Hunter cancelled",
    );
  }

  async function saveProspect(
    prospect:
      LeadHunterProspect,
  ) {
    if (
      savingProspectIds.has(
        prospect.id,
      ) ||
      savedProspectIds.has(
        prospect.id,
      ) ||
      duplicateProspectIds.has(
        prospect.id,
      )
    ) {
      return;
    }

    setSavingProspectIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        next.add(
          prospect.id,
        );

        return next;
      },
    );

    try {
      const saveResult =
        await saveProspectToCrm(
          prospect,
        );

      if (
        saveResult.duplicate
      ) {
        setDuplicateProspectIds(
          (current) => {
            const next =
              new Set(
                current,
              );

            next.add(
              prospect.id,
            );

            return next;
          },
        );

        toast.warning(
          "Possible CRM duplicate",
          {
            description:
              saveResult
                .duplicate_match
                ? `${saveResult.duplicate_match.name} already exists in CRM.`
                : "A matching CRM lead already exists.",
          },
        );

        return;
      }

      setSavedProspectIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.add(
            prospect.id,
          );

          return next;
        },
      );

      toast.success(
        "Prospect saved to CRM",
        {
          description:
            `${prospect.organisation_name} is now available under Sales → Leads.`,
        },
      );
    } catch (error) {
      toast.error(
        "CRM save failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "The prospect could not be saved.",
        },
      );
    } finally {
      setSavingProspectIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            prospect.id,
          );

          return next;
        },
      );
    }
  }

  function toggleExpanded(
    prospectId: string,
  ) {
    setExpandedProspectIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            prospectId,
          )
        ) {
          next.delete(
            prospectId,
          );
        } else {
          next.add(
            prospectId,
          );
        }

        return next;
      },
    );
  }

  function exportCsv() {
    if (
      prospects.length ===
      0
    ) {
      toast.error(
        "There are no prospects to export.",
      );
      return;
    }

    const csv =
      exportProspectsToCsv(
        prospects,
      );

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      `cossa-lead-hunter-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(
          url,
        ),
      0,
    );

    toast.success(
      "Lead Hunter CSV exported",
    );
  }

  return (
    <div className="mx-auto flex max-w-[1700px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Radar className="h-5 w-5" />
              </div>

              <StatusBadge status={workspaceRuntimeStatus()} />

              <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-success">
                Evidence-first
              </span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Lead{" "}
              <span className="text-gradient-gold">
                Hunter
              </span>
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              Hunt verified customers, private projects,
              public tenders, supplier opportunities,
              partnerships and objectively observable
              digital-service gaps.
            </p>

            <p className="mt-2 max-w-4xl text-xs leading-5 text-muted-foreground">
              Search engines discover candidates. The
              Hunter then verifies public sources,
              rejects competitors and directories,
              checks procurement validity, deduplicates
              organisations and routes each accepted
              opportunity to the correct Cossa company.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/sales/leads">
              <Button
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10"
              >
                <Users className="mr-2 h-4 w-4" />
                Open CRM leads
              </Button>
            </Link>

            <Button
              type="button"
              onClick={exportCsv}
              disabled={
                prospects.length ===
                0
              }
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <MetricCard
          label="Verified"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  verifiedCount,
                )
          }
          icon={ShieldCheck}
        />

        <MetricCard
          label="Opportunities"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  opportunityCount,
                )
          }
          icon={Target}
        />

        <MetricCard
          label="Hot leads"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  hotLeadCount,
                )
          }
          icon={Zap}
        />

        <MetricCard
          label="Government"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  governmentCount,
                )
          }
          icon={Building2}
        />

        <MetricCard
          label="Contactable"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  contactableCount,
                )
          }
          icon={Phone}
        />

        <MetricCard
          label="Average score"
          value={
            huntState ===
            "searching"
              ? "—"
              : prospects.length >
                  0
                ? `${averageScore}/100`
                : "0/100"
          }
          icon={Gauge}
        />

        <MetricCard
          label="Sources"
          value={
            huntState ===
            "searching"
              ? "—"
              : String(
                  result?.source_count ??
                  0,
                )
          }
          icon={Globe2}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[500px_1fr]">
        <aside className="glass-card h-fit p-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />

            <h2 className="font-display text-lg font-semibold">
              Hunt configuration
            </h2>
          </div>

          <div className="mt-5 space-y-6">
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />

                <Label htmlFor="lead-hunter-instruction">
                  Hunter mission
                </Label>
              </div>

              <textarea
                id="lead-hunter-instruction"
                value={
                  searchInstruction
                }
                onChange={(
                  event,
                ) =>
                  setSearchInstruction(
                    event.target
                      .value,
                  )
                }
                rows={6}
                maxLength={2500}
                placeholder="Example: Find property-management companies in Centurion and Midrand that are suitable buyers for recurring maintenance or commercial cleaning. Prioritise verified organisations with public contact routes and reject construction or cleaning competitors."
                className="mt-3 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />

              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>
                  Define the buyer, service, location and
                  opportunity conditions. The server still
                  verifies every result independently.
                </span>

                <span>
                  {
                    searchInstruction.length
                  }
                  /2500
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InstructionExample
                  label="Website audit prospects"
                  onClick={() =>
                    setSearchInstruction(
                      "Find legitimate small and medium businesses in South Africa whose official websites can be objectively inspected for website-design or conversion improvement opportunities. Prioritise businesses with verified public contact routes. Do not assume a weak website from search snippets; verify observable website signals and exclude web designers and marketing agencies.",
                    )
                  }
                />

                <InstructionExample
                  label="Branding prospects"
                  onClick={() =>
                    setSearchInstruction(
                      "Find legitimate businesses in Gauteng that are suitable buyers for branding, logo or digital-presence services. Require verifiable public evidence before classifying an active opportunity and exclude branding agencies, designers and direct competitors.",
                    )
                  }
                />

                <InstructionExample
                  label="Cleaning opportunities"
                  onClick={() =>
                    setSearchInstruction(
                      "Find offices, schools, churches, property managers, warehouses and retail premises in Pretoria, Centurion, Midrand and Johannesburg with a verified cleaning requirement, supplier route, procurement notice or strong buyer fit for recurring commercial cleaning, deep cleaning or hygiene services.",
                    )
                  }
                />

                <InstructionExample
                  label="Construction quick wins"
                  onClick={() =>
                    setSearchInstruction(
                      "Find smaller and faster-to-close construction, painting, tiling, ceiling, roofing, renovation and property-maintenance opportunities in Gauteng. Prioritise current RFQs, maintenance requirements, managing agents, schools, churches, offices and organisations with verified public contact routes.",
                    )
                  }
                />
              </div>
            </section>

            <div className="space-y-2">
              <Label htmlFor="lead-hunter-strategy">
                Proven hunting strategy
              </Label>

              <select
                id="lead-hunter-strategy"
                value={
                  selectedStrategyId
                }
                onChange={(event) =>
                  applyStrategy(
                    event.target.value,
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {LEAD_HUNTER_STRATEGIES.map(
                  (strategy) => (
                    <option
                      key={
                        strategy.id
                      }
                      value={
                        strategy.id
                      }
                    >
                      {
                        strategy.title
                      }
                    </option>
                  ),
                )}
              </select>

              {selectedStrategy && (
                <p className="text-xs leading-5 text-muted-foreground">
                  {
                    selectedStrategy.description
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Buyer sector
              </Label>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "mixed",
                    "private",
                    "government",
                    "nonprofit",
                  ] as LeadHunterSector[]
                ).map(
                  (sector) => (
                    <button
                      type="button"
                      key={
                        sector
                      }
                      onClick={() =>
                        setSector(
                          sector,
                        )
                      }
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs capitalize transition-colors",

                        request.sector ===
                          sector
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      {sector}
                    </button>
                  ),
                )}
              </div>

              <p className="text-[10px] leading-4 text-muted-foreground">
                Government results are treated more
                strictly: normal government pages are
                not sales leads without a valid
                procurement, supplier or partnership
                route.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="lead-hunter-scope"
                label="Search scope"
                value={
                  request.search_scope ??
                  "south_africa"
                }
                options={
                  SEARCH_SCOPE_OPTIONS.map(
                    (option) => ({
                      value:
                        option.value,
                      label:
                        option.label,
                    }),
                  )
                }
                onChange={(
                  value,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      search_scope:
                        value as LeadHunterSearchScope,
                    }),
                  )
                }
              />

              <SelectField
                id="lead-hunter-delivery"
                label="Delivery model"
                value={
                  request.delivery_model ??
                  "auto"
                }
                options={
                  DELIVERY_MODEL_OPTIONS
                }
                onChange={(
                  value,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      delivery_model:
                        value as LeadHunterDeliveryModel,
                    }),
                  )
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="lead-hunter-revenue-mode"
                label="Revenue priority"
                value={
                  request.revenue_mode ??
                  "quick_revenue"
                }
                options={
                  REVENUE_MODE_OPTIONS.map(
                    (option) => ({
                      value:
                        option.value,
                      label:
                        option.label,
                    }),
                  )
                }
                onChange={(
                  value,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      revenue_mode:
                        value as LeadHunterRevenueMode,
                    }),
                  )
                }
              />

              <SelectField
                id="lead-hunter-depth"
                label="Search depth"
                value={
                  activeDepth
                }
                options={
                  SEARCH_DEPTH_OPTIONS.map(
                    (option) => ({
                      value:
                        option.value,
                      label:
                        option.label,
                    }),
                  )
                }
                onChange={(
                  value,
                ) =>
                  changeSearchDepth(
                    value as LeadHunterSearchDepth,
                  )
                }
              />
            </div>

            <div
              className={cn(
                "rounded-lg border p-3 text-xs leading-5",

                serviceCapacityExceeded
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border/60 bg-card/30 text-muted-foreground",
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Gauge className="h-4 w-4 text-primary" />
                Search budget
              </div>

              <p className="mt-1">
                Current depth supports{" "}
                <strong className="text-primary">
                  {queryCapacity}
                </strong>{" "}
                selected service
                {queryCapacity === 1
                  ? ""
                  : "s"}{" "}
                in this hunt.
              </p>

              <p className="mt-1">
                Selected:{" "}
                <strong>
                  {
                    request.services
                      .length
                  }
                </strong>
                .
              </p>

              {serviceCapacityExceeded && (
                <p className="mt-2 font-medium">
                  Reduce selected services or increase
                  search depth before running the hunt.
                </p>
              )}
            </div>

            <LocationControls
              searchScope={
                request.search_scope ??
                "south_africa"
              }
              locationInput={
                locationInput
              }
              countryInput={
                countryInput
              }
              provinceInput={
                provinceInput
              }
              cityInput={
                cityInput
              }
              suburbInput={
                suburbInput
              }
              radiusKm={
                request.radius_km ??
                null
              }
              onLocationChange={
                setLocationInput
              }
              onCountryChange={
                setCountryInput
              }
              onProvinceChange={
                setProvinceInput
              }
              onCityChange={
                setCityInput
              }
              onSuburbChange={
                setSuburbInput
              }
              onProvinceToggle={
                selectProvince
              }
              onRadiusChange={(
                value,
              ) =>
                setRequest(
                  (
                    current,
                  ) => ({
                    ...current,
                    radius_km:
                      value,
                  }),
                )
              }
            />

            <div className="space-y-2">
              <Label htmlFor="lead-hunter-industries">
                Industries
              </Label>

              <Input
                id="lead-hunter-industries"
                value={
                  industryInput
                }
                onChange={(
                  event,
                ) =>
                  setIndustryInput(
                    event.target
                      .value,
                  )
                }
                placeholder="Property, Education, Retail, Logistics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-hunter-organisations">
                Buyer organisation types
              </Label>

              <Input
                id="lead-hunter-organisations"
                value={
                  organisationTypeInput
                }
                onChange={(
                  event,
                ) =>
                  setOrganisationTypeInput(
                    event.target
                      .value,
                  )
                }
                placeholder="Property manager, School, Warehouse, Church"
              />

              <p className="text-[10px] leading-4 text-muted-foreground">
                Describe the customer, not the Cossa
                subsidiary selling to them.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-hunter-keywords">
                Prospect keywords
              </Label>

              <Input
                id="lead-hunter-keywords"
                value={
                  keywordInput
                }
                onChange={(
                  event,
                ) =>
                  setKeywordInput(
                    event.target
                      .value,
                  )
                }
                placeholder="new premises, expansion, refurbishment, maintenance"
              />

              <p className="text-[10px] leading-4 text-muted-foreground">
                These guide discovery. They do not
                override evidence requirements.
              </p>
            </div>

            {(request.include_government_sector ||
              request.sector ===
                "government" ||
              request.sector ===
                "mixed" ||
              selectedProcurementServiceCount >
                0) && (
              <div className="space-y-2">
                <Label htmlFor="lead-hunter-tender-keywords">
                  Tender / procurement keywords
                </Label>

                <Input
                  id="lead-hunter-tender-keywords"
                  value={
                    tenderKeywordInput
                  }
                  onChange={(
                    event,
                  ) =>
                    setTenderKeywordInput(
                      event.target
                        .value,
                    )
                  }
                  placeholder="RFQ, tender, bid, supplier panel, CIDB"
                />

                <p className="text-[10px] leading-4 text-muted-foreground">
                  Useful for government RFQs, tenders,
                  supplier panels and formal procurement
                  searches.
                </p>
              </div>
            )}

            <SelectionGroup
              title="Cossa companies"
              items={
                COMPANY_OPTIONS
              }
              selected={
                request.companies
              }
              onToggle={
                toggleCompany
              }
              actions={
                <div className="flex gap-2">
                  <MiniAction
                    label="All"
                    onClick={
                      selectAllCompanies
                    }
                  />

                  <MiniAction
                    label="Clear"
                    onClick={
                      clearCompanies
                    }
                  />
                </div>
              }
            />

            <SelectionGroup
              title="Services"
              items={
                SERVICE_OPTIONS
              }
              selected={
                request.services
              }
              onToggle={
                toggleService
              }
              maxHeight
              actions={
                <div className="flex gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",

                      serviceCapacityExceeded
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {
                      request.services
                        .length
                    }
                    /{queryCapacity}
                  </span>

                  <MiniAction
                    label="Clear"
                    onClick={
                      clearServices
                    }
                  />
                </div>
              }
            />

            {selectedDigitalServiceCount >
              0 && (
              <div className="rounded-lg border border-info/25 bg-info/5 p-3 text-[10px] leading-4 text-muted-foreground">
                <strong className="text-info">
                  Digital audit rule:
                </strong>{" "}
                the Hunter should verify observable
                website signals itself rather than
                trusting search snippets that call a
                website “bad”, “outdated” or “poor”.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-hunter-results">
                  Max results
                </Label>

                <Input
                  id="lead-hunter-results"
                  type="number"
                  min={1}
                  max={50}
                  value={
                    request.result_count
                  }
                  onChange={(
                    event,
                  ) =>
                    setRequest(
                      (
                        current,
                      ) => ({
                        ...current,

                        result_count:
                          Math.max(
                            1,
                            Math.min(
                              50,
                              Number(
                                event
                                  .target
                                  .value ||
                                1,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-hunter-score">
                  Minimum score
                </Label>

                <Input
                  id="lead-hunter-score"
                  type="number"
                  min={0}
                  max={100}
                  value={
                    request.minimum_score
                  }
                  onChange={(
                    event,
                  ) =>
                    setRequest(
                      (
                        current,
                      ) => ({
                        ...current,

                        minimum_score:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(
                                event
                                  .target
                                  .value ||
                                0,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-hunter-evidence-sources">
                  Evidence sources
                </Label>

                <Input
                  id="lead-hunter-evidence-sources"
                  type="number"
                  min={1}
                  max={5}
                  value={
                    request.minimum_evidence_sources ??
                    1
                  }
                  onChange={(
                    event,
                  ) =>
                    setRequest(
                      (
                        current,
                      ) => ({
                        ...current,

                        minimum_evidence_sources:
                          Math.max(
                            1,
                            Math.min(
                              5,
                              Number(
                                event
                                  .target
                                  .value ||
                                1,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                />

                <p className="text-[10px] leading-4 text-muted-foreground">
                  Independent domains, not repeated
                  pages from one website.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-hunter-cache-age">
                  Cache age hours
                </Label>

                <Input
                  id="lead-hunter-cache-age"
                  type="number"
                  min={1}
                  max={168}
                  value={
                    request.cache_max_age_hours ??
                    24
                  }
                  disabled={
                    request.use_cached_results ===
                    false
                  }
                  onChange={(
                    event,
                  ) =>
                    setRequest(
                      (
                        current,
                      ) => ({
                        ...current,

                        cache_max_age_hours:
                          Math.max(
                            1,
                            Math.min(
                              168,
                              Number(
                                event
                                  .target
                                  .value ||
                                24,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <ToggleOption
                label="Search everything relevant"
                description="Use the selected services, mission and location without restricting the hunt to one opportunity type."
                checked={
                  request.search_everything ??
                  false
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      search_everything:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Revenue-first ranking"
                description="Prioritise commercial potential, timing, buyer intent and contactability."
                checked={
                  request.revenue_first ??
                  true
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      revenue_first:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Prioritise easier wins"
                description="Prefer practical and reachable opportunities over vague strategic prospects."
                checked={
                  request.easy_wins_only ??
                  true
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      easy_wins_only:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Include smaller projects"
                description="Allow RFQs, repairs, minor works and smaller opportunities."
                checked={
                  request.include_small_projects !==
                  false
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      include_small_projects:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Include larger projects"
                description="Allow larger tenders, frameworks and strategic projects."
                checked={
                  request.include_large_projects !==
                  false
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      include_large_projects:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Require phone or email"
                description="Reject accepted prospects that do not expose a public phone number or email address."
                checked={
                  request.require_public_phone_or_email
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      require_public_phone_or_email:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Require website"
                description="Useful for digital audits and official-organisation verification."
                checked={
                  request.require_website
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      require_website:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Require opportunity evidence"
                description="When enabled, general buyer-fit research prospects are excluded."
                checked={
                  request.require_opportunity_signal
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      require_opportunity_signal:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Verified sources only"
                description="Require stronger source evidence before accepted results can appear."
                checked={
                  request.verified_sources_only !==
                  false
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      verified_sources_only:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Exclude existing CRM leads"
                description="Prevent repeated research and duplicate outreach when CRM matching is available."
                checked={
                  request.exclude_existing_crm_leads
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      exclude_existing_crm_leads:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Buyer-only protection"
                description="Companies selling the selected service are rejected unless a separate verified procurement, supplier or partnership route exists."
                checked
                disabled
                onChange={() =>
                  undefined
                }
              />

              <ToggleOption
                label="Exclude directories"
                description="Reject generic listing sites and aggregators that do not represent one buyer organisation."
                checked={
                  request.exclude_directories ??
                  true
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      exclude_directories:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Reject expired procurement"
                description="Prevent historical tenders and RFQs from being treated as current opportunities."
                checked={
                  request.exclude_expired_procurement ??
                  true
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      exclude_expired_procurement:
                        checked,
                    }),
                  )
                }
              />

              <ToggleOption
                label="Reuse recent provider searches"
                description="Reuse equivalent search-provider results and rerun current verification to reduce provider credits."
                checked={
                  request.use_cached_results ??
                  true
                }
                onChange={(
                  checked,
                ) =>
                  setRequest(
                    (
                      current,
                    ) => ({
                      ...current,

                      use_cached_results:
                        checked,
                    }),
                  )
                }
              />
            </div>

            <section className="rounded-xl border border-border/60 bg-card/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Hunt summary
              </div>

              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                {currentSummary.map(
                  (item) => (
                    <li
                      key={
                        item
                      }
                      className="flex gap-2"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />

                      <span>
                        {item}
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <InfoMini
                  label="Digital services"
                  value={String(
                    selectedDigitalServiceCount,
                  )}
                />

                <InfoMini
                  label="Procurement-capable"
                  value={String(
                    selectedProcurementServiceCount,
                  )}
                />
              </div>
            </section>

            {huntState ===
            "searching" ? (
              <Button
                type="button"
                onClick={
                  cancelHunt
                }
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel live hunt
              </Button>
            ) : (
              <Button
                type="button"
                onClick={
                  runHunt
                }
                disabled={
                  serviceCapacityExceeded
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                <Radar className="mr-2 h-4 w-4" />
                Hunt verified prospects
              </Button>
            )}

            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
              Lead Hunter researches and qualifies
              public evidence. It does not send
              outreach, submit bids, accept contracts,
              invent contacts or claim that an
              organisation requested Cossa's services.
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {huntState ===
            "idle" && (
            <EmptyHuntState />
          )}

          {huntState ===
            "searching" && (
            <SearchingState
              instruction={
                searchInstruction
              }
              searchDepth={
                activeDepth
              }
              queryLimit={
                request.max_search_queries ??
                queryCapacity
              }
              services={
                request.services.length
              }
              minimumEvidenceSources={
                request.minimum_evidence_sources ??
                1
              }
            />
          )}

          {huntState ===
            "error" && (
            <ErrorState
              message={
                huntError ??
                "The hunt failed."
              }
              onRetry={
                runHunt
              }
            />
          )}

          {huntState === "completed" && result ? (
            <section className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workflow outcome</div>
                  <div className="mt-1 font-semibold text-primary">{result.status.replaceAll("_", " ")}</div>
                </div>
                <div className="text-xs text-muted-foreground">Provider diagnostics are separate from the overall hunt result.</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {result.provider_diagnostics.map((diagnostic) => (
                  <div key={diagnostic.provider} className="rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
                    <div className="font-semibold">{diagnostic.provider}</div>
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <div>{diagnostic.configuration_required ? "Configuration required" : diagnostic.failed ? "Failed" : diagnostic.succeeded ? "Succeeded" : diagnostic.attempted ? "Attempted" : "Not attempted"}</div>
                      <div>{diagnostic.result_count} provider results · {diagnostic.timing_ms ?? "—"} ms</div>
                      {diagnostic.http_status ? <div>HTTP {diagnostic.http_status}</div> : null}
                      {diagnostic.error_reason ? <div className="text-warning">{diagnostic.error_reason}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {huntState ===
            "completed" &&
            prospects.length ===
              0 && (
              <NoResultsState
                warnings={
                  result?.warnings ??
                  []
                }
                providers={
                  result?.providers_used ??
                  []
                }
              />
            )}

          {huntState ===
            "completed" &&
            prospects.length >
              0 && (
              <div className="space-y-4">
                <section className="glass-card p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-semibold">
                          Qualified prospect results
                        </h2>

                        <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-success">
                          {
                            result?.accepted_count ??
                            prospects.length
                          }{" "}
                          accepted
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Hunt started{" "}
                        {formatDateTime(
                          result?.searched_at,
                        )}
                        .
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <ResultStat
                        label="Accepted"
                        value={String(
                          result?.accepted_count ??
                            prospects.length,
                        )}
                      />

                      <ResultStat
                        label="Rejected"
                        value={String(
                          result?.rejected_count ??
                            0,
                        )}
                      />

                      <ResultStat
                        label="Sources"
                        value={String(
                          result?.source_count ??
                            0,
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-primary">
                      Executed mission
                    </div>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {
                        result?.request
                          .search_instruction ??
                        searchInstruction
                      }
                    </p>
                  </div>

                  {result?.providers_used &&
                    result.providers_used
                      .length >
                      0 && (
                      <div className="mt-4">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Intelligence pipeline
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.providers_used.map(
                            (
                              provider,
                            ) => (
                              <span
                                key={
                                  provider
                                }
                                className="rounded-full border border-border/60 bg-card/50 px-2.5 py-1 text-[10px] text-muted-foreground"
                              >
                                {
                                  provider
                                }
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {result?.warnings &&
                    result.warnings
                      .length >
                      0 && (
                      <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                        <button
                          type="button"
                          onClick={() =>
                            setNoticesExpanded(
                              (
                                current,
                              ) =>
                                !current,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-warning">
                            <AlertCircle className="h-4 w-4" />

                            Search and verification notices

                            <span className="rounded-full border border-warning/30 px-2 py-0.5 text-[10px]">
                              {
                                result.warnings
                                  .length
                              }
                            </span>
                          </div>

                          {noticesExpanded ? (
                            <ChevronUp className="h-4 w-4 text-warning" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-warning" />
                          )}
                        </button>

                        {noticesExpanded && (
                          <ul className="mt-3 space-y-2 border-t border-warning/20 pt-3 text-xs leading-5 text-muted-foreground">
                            {result.warnings.map(
                              (
                                warning,
                              ) => (
                                <li
                                  key={
                                    warning
                                  }
                                  className="flex gap-2"
                                >
                                  <span className="text-warning">
                                    •
                                  </span>

                                  <span>
                                    {
                                      warning
                                    }
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                </section>

                {prospects.map(
                  (prospect) => (
                    <ProspectCard
                      key={
                        prospect.id
                      }
                      prospect={
                        prospect
                      }
                      expanded={expandedProspectIds.has(
                        prospect.id,
                      )}
                      saving={savingProspectIds.has(
                        prospect.id,
                      )}
                      saved={savedProspectIds.has(
                        prospect.id,
                      )}
                      duplicate={duplicateProspectIds.has(
                        prospect.id,
                      )}
                      onToggleExpanded={() =>
                        toggleExpanded(
                          prospect.id,
                        )
                      }
                      onSave={() =>
                        saveProspect(
                          prospect,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
        </main>
      </div>
    </div>
  );
}

function LocationControls({
  searchScope,
  locationInput,
  countryInput,
  provinceInput,
  cityInput,
  suburbInput,
  radiusKm,
  onLocationChange,
  onCountryChange,
  onProvinceChange,
  onCityChange,
  onSuburbChange,
  onProvinceToggle,
  onRadiusChange,
}: {
  searchScope:
    LeadHunterSearchScope;
  locationInput: string;
  countryInput: string;
  provinceInput: string;
  cityInput: string;
  suburbInput: string;
  radiusKm: number | null;
  onLocationChange:
    (value: string) => void;
  onCountryChange:
    (value: string) => void;
  onProvinceChange:
    (value: string) => void;
  onCityChange:
    (value: string) => void;
  onSuburbChange:
    (value: string) => void;
  onProvinceToggle:
    (value: string) => void;
  onRadiusChange:
    (value: number | null) => void;
}) {
  const showCountry =
    searchScope === "africa" ||
    searchScope === "worldwide" ||
    searchScope === "custom" ||
    searchScope === "unrestricted";

  const showProvince =
    searchScope === "province" ||
    searchScope === "south_africa" ||
    searchScope === "custom";

  const showCity =
    searchScope === "local" ||
    searchScope === "city" ||
    searchScope === "province" ||
    searchScope === "south_africa" ||
    searchScope === "custom";

  const showSuburb =
    searchScope === "local" ||
    searchScope === "custom";

  const showRadius =
    searchScope === "local";

  return (
    <section className="space-y-4 rounded-xl border border-border/60 p-4">
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />

          <h3 className="text-sm font-semibold">
            Geographic targeting
          </h3>
        </div>

        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          Physical services should target realistic
          service areas. Remote and digital services
          can expand beyond South Africa where the
          selected delivery model permits it.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-hunter-locations">
          Combined location terms
        </Label>

        <Input
          id="lead-hunter-locations"
          value={
            locationInput
          }
          onChange={(
            event,
          ) =>
            onLocationChange(
              event.target.value,
            )
          }
          placeholder="South Africa, Gauteng, Pretoria, Centurion"
        />
      </div>

      {showCountry && (
        <div className="space-y-2">
          <Label htmlFor="lead-hunter-countries">
            Countries
          </Label>

          <Input
            id="lead-hunter-countries"
            value={
              countryInput
            }
            onChange={(
              event,
            ) =>
              onCountryChange(
                event.target.value,
              )
            }
            placeholder="South Africa, Botswana, Namibia"
          />
        </div>
      )}

      {showProvince && (
        <div className="space-y-2">
          <Label htmlFor="lead-hunter-provinces">
            Provinces
          </Label>

          <Input
            id="lead-hunter-provinces"
            value={
              provinceInput
            }
            onChange={(
              event,
            ) =>
              onProvinceChange(
                event.target.value,
              )
            }
            placeholder="Gauteng, Limpopo, Mpumalanga"
          />

          <div className="flex flex-wrap gap-1.5">
            {SOUTH_AFRICAN_PROVINCES.map(
              (province) => {
                const active =
                  parseCommaSeparated(
                    provinceInput,
                  ).some(
                    (item) =>
                      item.toLowerCase() ===
                      province.toLowerCase(),
                  );

                return (
                  <button
                    key={
                      province
                    }
                    type="button"
                    onClick={() =>
                      onProvinceToggle(
                        province,
                      )
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] transition-colors",

                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {province}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}

      {showCity && (
        <div className="space-y-2">
          <Label htmlFor="lead-hunter-cities">
            Cities and towns
          </Label>

          <Input
            id="lead-hunter-cities"
            value={
              cityInput
            }
            onChange={(
              event,
            ) =>
              onCityChange(
                event.target.value,
              )
            }
            placeholder="Pretoria, Centurion, Midrand, Johannesburg"
          />
        </div>
      )}

      {showSuburb && (
        <div className="space-y-2">
          <Label htmlFor="lead-hunter-suburbs">
            Suburbs or local areas
          </Label>

          <Input
            id="lead-hunter-suburbs"
            value={
              suburbInput
            }
            onChange={(
              event,
            ) =>
              onSuburbChange(
                event.target.value,
              )
            }
            placeholder="Menlyn, Pretoria East, Rooihuiskraal"
          />
        </div>
      )}

      {showRadius && (
        <div className="space-y-2">
          <Label htmlFor="lead-hunter-radius">
            Search radius in kilometres
          </Label>

          <Input
            id="lead-hunter-radius"
            type="number"
            min={1}
            max={500}
            value={
              radiusKm ??
              ""
            }
            onChange={(
              event,
            ) => {
              const value =
                event.target
                  .value;

              onRadiusChange(
                value
                  ? Math.max(
                      1,
                      Math.min(
                        500,
                        Number(
                          value,
                        ),
                      ),
                    )
                  : null,
              );
            }}
            placeholder="50"
          />
        </div>
      )}
    </section>
  );
}

function InstructionExample({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-lg border border-primary/25 bg-background/60 px-3 py-2 text-left text-xs text-primary transition-colors hover:bg-primary/10"
    >
      <Sparkles className="mr-1 inline h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function MiniAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      {label}
    </button>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  onChange:
    (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>

      <select
        id={id}
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Radar;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>

        <Icon className="h-4 w-4 text-primary" />
      </div>

      <div className="mt-2 font-display text-2xl font-semibold">
        {value}
      </div>
    </div>
  );
}

function SelectionGroup<
  T extends string,
>({
  title,
  items,
  selected,
  onToggle,
  maxHeight = false,
  actions,
}: {
  title: string;
  items: Array<{
    value: T;
    label: string;
  }>;
  selected: T[];
  onToggle:
    (value: T) => void;
  maxHeight?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>
          {title}
        </Label>

        {actions}
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2",

          maxHeight &&
            "max-h-72 overflow-y-auto pr-1",
        )}
      >
        {items.map(
          (item) => {
            const active =
              selected.includes(
                item.value,
              );

            return (
              <button
                type="button"
                key={
                  item.value
                }
                onClick={() =>
                  onToggle(
                    item.value,
                  )
                }
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",

                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/30",
                )}
              >
                {item.label}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange:
    (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-3",

        disabled
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer",
      )}
    >
      <span>
        <span className="block text-xs font-medium text-foreground">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
            {description}
          </span>
        )}
      </span>

      <input
        type="checkbox"
        disabled={disabled}
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.checked,
          )
        }
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
    </label>
  );
}

function ProspectCard({
  prospect,
  expanded,
  saving,
  saved,
  duplicate,
  onToggleExpanded,
  onSave,
}: {
  prospect:
    LeadHunterProspect;
  expanded: boolean;
  saving: boolean;
  saved: boolean;
  duplicate: boolean;
  onToggleExpanded:
    () => void;
  onSave:
    () => void;
}) {
  const independentPublishers =
    new Set(
      prospect.evidence
        .map(
          (evidence) =>
            evidence.publisher?.toLowerCase(),
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ).size;

  const opportunityLike =
    [
      "active_opportunity",
      "tender",
      "supplier_opportunity",
      "partnership",
    ].includes(
      prospect.classification,
    );

  return (
    <article className="glass-card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge
                status={
                  prospect.verification_status
                }
              />

              <SalesPriorityBadge
                priority={
                  prospect.sales_priority
                }
              />

              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest",

                  opportunityLike
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {
                  formatClassification(
                    prospect.classification,
                  )
                }
              </span>

              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                {
                  prospect.sector
                }
              </span>

              {independentPublishers >
                1 && (
                <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-success">
                  {
                    independentPublishers
                  }{" "}
                  source domains
                </span>
              )}
            </div>

            <h2 className="mt-3 font-display text-xl font-semibold">
              {
                prospect.organisation_name
              }
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {
                prospect.opportunity_summary
              }
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {(prospect.city ||
                prospect.province ||
                prospect.country) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />

                  {[prospect.city, prospect.province, prospect.country]
                    .filter(
                      Boolean,
                    )
                    .join(", ")}
                </span>
              )}

              {prospect.website && (
                <a
                  href={
                    prospect.website
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Official source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {prospect.public_phone && (
                <a
                  href={`tel:${prospect.public_phone}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {
                    prospect.public_phone
                  }
                </a>
              )}

              {prospect.public_email && (
                <a
                  href={`mailto:${prospect.public_email}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {
                    prospect.public_email
                  }
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Lead score
              </div>

              <div className="mt-1 font-display text-2xl font-semibold text-primary">
                {
                  prospect.total_score
                }
                /100
              </div>
            </div>

            <Button
              type="button"
              onClick={
                onSave
              }
              disabled={
                saving ||
                saved ||
                duplicate
              }
              className={cn(
                "min-w-40",

                saved
                  ? "bg-success text-success-foreground"
                  : duplicate
                    ? "bg-warning text-warning-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking CRM…
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved to CRM
                </>
              ) : duplicate ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  CRM duplicate
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to CRM
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <ScoreItem
            label="Fit"
            value={
              prospect.fit_score
            }
          />

          <ScoreItem
            label="Intent"
            value={
              prospect.intent_score
            }
          />

          <ScoreItem
            label="Evidence"
            value={
              prospect.evidence_score
            }
          />

          <ScoreItem
            label="Timing"
            value={
              prospect.timing_score
            }
          />

          <ScoreItem
            label="Contact"
            value={
              prospect.contactability_score
            }
          />

          <ScoreItem
            label="Ease"
            value={
              prospect.ease_to_close_score
            }
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoBlock
            label="Recommended Cossa company"
            value={
              formatCompany(
                prospect.recommended_company,
              )
            }
          />

          <InfoBlock
            label="Recommended service"
            value={
              formatService(
                prospect.recommended_service,
              )
            }
          />

          <InfoBlock
            label="Opportunity size"
            value={
              formatSimpleValue(
                prospect.opportunity_size,
              )
            }
          />

          <InfoBlock
            label="Revenue potential"
            value={`${prospect.revenue_potential_score}/100`}
          />

          <InfoBlock
            label="Recurring potential"
            value={`${prospect.recurring_revenue_score}/100`}
          />

          <InfoBlock
            label="Evidence records"
            value={String(
              prospect.evidence.length,
            )}
          />
        </div>

        {prospect.why_contact.length >
          0 && (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Banknote className="h-4 w-4" />
              Commercial case
            </div>

            <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
              {prospect.why_contact.map(
                (reason) => (
                  <li
                    key={
                      reason
                    }
                    className="flex gap-2"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />

                    <span>
                      {reason}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={
            onToggleExpanded
          }
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {expanded
            ? "Hide evidence and next action"
            : "View evidence and next action"}

          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/60 bg-card/20 p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
                Opportunity reasoning
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {
                  prospect.service_fit_reason
                }
              </p>

              <div className="mt-4 rounded-lg border border-border/60 p-4">
                <div className="text-xs font-semibold">
                  Recommended next action
                </div>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {
                    prospect.next_action
                  }
                </p>
              </div>

              {prospect.decision_maker_route && (
                <div className="mt-3 rounded-lg border border-border/60 p-4">
                  <div className="text-xs font-semibold">
                    Decision-maker route
                  </div>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {
                      prospect.decision_maker_route
                    }
                  </p>
                </div>
              )}

              {prospect.outreach_angle && (
                <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <div className="text-xs font-semibold text-primary">
                    Suggested outreach angle
                  </div>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {
                      prospect.outreach_angle
                    }
                  </p>
                </div>
              )}

              <div className="mt-3 rounded-lg border border-border/60 p-4">
                <div className="text-xs font-semibold">
                  Verification metadata
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <Definition
                    label="Status"
                    value={formatSimpleValue(
                      prospect.verification_status,
                    )}
                  />

                  <Definition
                    label="Classification"
                    value={formatClassification(
                      prospect.classification,
                    )}
                  />

                  <Definition
                    label="Provider"
                    value={
                      prospect.raw_provider_name ??
                      "Unknown"
                    }
                  />

                  <Definition
                    label="Verified"
                    value={formatDateTime(
                      prospect.date_verified,
                    )}
                  />

                  <Definition
                    label="Identity keys"
                    value={String(
                      prospect.identity_keys
                        ?.length ?? 0,
                    )}
                  />

                  <Definition
                    label="Evidence domains"
                    value={String(
                      independentPublishers,
                    )}
                  />
                </dl>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Public evidence
                </h3>

                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  <FileCheck2 className="h-3 w-3" />
                  {
                    prospect.evidence
                      .length
                  }{" "}
                  records
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {prospect.evidence.map(
                  (
                    evidence,
                    index,
                  ) => (
                    <div
                      key={`${evidence.url}-${index}`}
                      className="rounded-lg border border-border/60 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={
                                evidence.url
                              }
                              target="_blank"
                              rel="noreferrer noopener"
                              className="break-words text-sm font-semibold text-primary hover:underline"
                            >
                              {
                                evidence.title
                              }
                            </a>

                            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                              {
                                formatSimpleValue(
                                  evidence.type,
                                )
                              }
                            </span>
                          </div>

                          {evidence.publisher && (
                            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                              {
                                evidence.publisher
                              }
                            </p>
                          )}

                          {evidence.excerpt && (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              {
                                evidence.excerpt
                              }
                            </p>
                          )}

                          {evidence.supports &&
                            evidence.supports
                              .length >
                              0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {evidence.supports.map(
                                  (
                                    item,
                                  ) => (
                                    <span
                                      key={
                                        item
                                      }
                                      className="rounded-full border border-border/60 bg-card/40 px-2 py-0.5 text-[9px] text-muted-foreground"
                                    >
                                      {
                                        formatSimpleValue(
                                          item,
                                        )
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Checked{" "}
                            {formatDateTime(
                              evidence.checked_at,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </article>
  );
}

function VerificationBadge({
  status,
}: {
  status:
    ProspectVerificationStatus;
}) {
  const config: Record<
    ProspectVerificationStatus,
    {
      label: string;
      className: string;
    }
  > = {
    verified: {
      label: "Verified",
      className:
        "border-success/30 bg-success/10 text-success",
    },

    partially_verified: {
      label:
        "Partially verified",
      className:
        "border-warning/30 bg-warning/10 text-warning",
    },

    unverified: {
      label: "Unverified",
      className:
        "border-border/60 bg-card/40 text-muted-foreground",
    },

    rejected: {
      label: "Rejected",
      className:
        "border-destructive/30 bg-destructive/10 text-destructive",
    },
  };

  const item =
    config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest",
        item.className,
      )}
    >
      {status ===
        "verified" && (
        <CheckCircle2 className="h-3 w-3" />
      )}

      {status ===
        "partially_verified" && (
        <AlertCircle className="h-3 w-3" />
      )}

      {status ===
        "rejected" && (
        <XCircle className="h-3 w-3" />
      )}

      {item.label}
    </span>
  );
}

function SalesPriorityBadge({
  priority,
}: {
  priority:
    ProspectSalesPriority;
}) {
  const styles: Record<
    ProspectSalesPriority,
    string
  > = {
    hot:
      "border-destructive/30 bg-destructive/10 text-destructive",

    warm:
      "border-warning/30 bg-warning/10 text-warning",

    cold:
      "border-info/30 bg-info/10 text-info",

    research:
      "border-border/60 bg-card/40 text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest",
        styles[priority],
      )}
    >
      {priority}
    </span>
  );
}

function ScoreItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        value,
      ),
    );

  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
        </span>

        <span className="font-semibold text-primary">
          {safeValue}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

function InfoMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-xs font-semibold text-primary">
        {value}
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-20 rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-primary">
        {value}
      </div>
    </div>
  );
}

function Definition({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>

      <dd className="mt-1 break-words text-xs font-medium">
        {value}
      </dd>
    </div>
  );
}

function EmptyHuntState() {
  return (
    <section className="glass-card flex min-h-[720px] items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary gold-glow">
          <Radar className="h-7 w-7" />
        </div>

        <h2 className="mt-5 font-display text-2xl font-semibold">
          Define a commercial mission and hunt
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tell the Hunter what buyer, service,
          opportunity, procurement route or location
          matters. The server will search, inspect,
          verify, score and reject weak results before
          anything reaches this screen.
        </p>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {[
            "Verified private-sector prospects",
            "Current government tenders and RFQs",
            "Supplier-registration opportunities",
            "Subcontracting and partnership routes",
            "Objective website audit opportunities",
            "Revenue-first commercial scoring",
            "Independent evidence verification",
            "CRM duplicate protection",
          ].map(
            (item) => (
              <div
                key={
                  item
                }
                className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />

                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function SearchingState({
  instruction,
  searchDepth,
  queryLimit,
  services,
  minimumEvidenceSources,
}: {
  instruction: string;
  searchDepth:
    LeadHunterSearchDepth;
  queryLimit: number;
  services: number;
  minimumEvidenceSources: number;
}) {
  return (
    <section className="glass-card flex min-h-[720px] items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />

        <h2 className="mt-5 font-display text-xl font-semibold">
          Hunting and verifying live public evidence
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Candidate discovery is only the first stage.
          The Hunter is also inspecting sources,
          checking buyer fit, rejecting competitors,
          validating procurement and removing duplicate
          organisations.
        </p>

        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4 text-left">
          <div className="text-[10px] uppercase tracking-widest text-primary">
            Current mission
          </div>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {instruction ||
              "Search everything relevant to the selected services."}
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoMini
            label="Depth"
            value={
              searchDepth
            }
          />

          <InfoMini
            label="Queries"
            value={String(
              queryLimit,
            )}
          />

          <InfoMini
            label="Services"
            value={String(
              services,
            )}
          />

          <InfoMini
            label="Evidence min"
            value={String(
              minimumEvidenceSources,
            )}
          />
        </div>

        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
          Verification takes longer than ordinary
          search because unsupported results are
          intentionally discarded instead of being
          shown as leads.
        </div>
      </div>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry:
    () => void;
}) {
  return (
    <section className="glass-card flex min-h-[520px] items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-xl font-semibold">
          Lead Hunter could not complete the search
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {message}
        </p>

        <Button
          type="button"
          onClick={
            onRetry
          }
          className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry hunt
        </Button>
      </div>
    </section>
  );
}

function NoResultsState({
  warnings,
  providers,
}: {
  warnings: string[];
  providers: string[];
}) {
  return (
    <section className="glass-card flex min-h-[520px] items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Search className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-xl font-semibold">
          No prospect survived verification
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This does not necessarily mean the search
          found nothing. It means nothing met the
          current buyer-fit, service, source,
          procurement, contact or scoring rules strongly
          enough to return.
        </p>

        {providers.length >
          0 && (
          <div className="mt-5 rounded-lg border border-border/60 p-4 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Layers3 className="h-4 w-4 text-primary" />
              Pipeline used
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {providers.map(
                (provider) => (
                  <span
                    key={
                      provider
                    }
                    className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground"
                  >
                    {provider}
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        {warnings.length >
          0 && (
          <ul className="mt-5 space-y-2 rounded-lg border border-border/60 p-4 text-left text-xs leading-5 text-muted-foreground">
            {warnings.map(
              (warning) => (
                <li
                  key={
                    warning
                  }
                  className="flex gap-2"
                >
                  <span className="text-primary">
                    •
                  </span>

                  <span>
                    {warning}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        <p className="mt-5 text-xs text-primary">
          First improve the mission or broaden the
          geography. Lower evidence and scoring
          requirements only when there is a commercial
          reason to accept weaker research prospects.
        </p>
      </div>
    </section>
  );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}

function formatCompany(
  company:
    LeadHunterCompany,
): string {
  const labels: Record<
    LeadHunterCompany,
    string
  > = {
    cossa_nexus_construction:
      "Cossa Nexus Construction",

    cossa_facility_services:
      "Cossa Facility Services",

    cossa_tech:
      "Cossa Tech",

    cossa_ai_growth:
      "Cossa AI Growth",

    nexdocs:
      "NexDocs",

    cossa_store:
      "Cossa Store",

    cossa_nexus_holdings:
      "Cossa Nexus Holdings",
  };

  return labels[
    company
  ];
}

function formatService(
  service:
    LeadHunterServiceCategory,
): string {
  return service
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatClassification(
  value: string,
): string {
  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatSimpleValue(
  value: string,
): string {
  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}
