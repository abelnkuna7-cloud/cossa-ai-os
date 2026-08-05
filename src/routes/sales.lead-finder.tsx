import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSearch,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Radar,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_LEAD_HUNTER_REQUEST,
  LEAD_HUNTER_STRATEGIES,
  exportProspectsToCsv,
  huntProspects,
  requestFromStrategy,
  saveProspectToCrm,
  type LeadHunterCompany,
  type LeadHunterProspect,
  type LeadHunterSearchRequest,
  type LeadHunterSearchResponse,
  type LeadHunterSector,
  type LeadHunterServiceCategory,
  type ProspectVerificationStatus,
} from "@/lib/lead-hunter-data";
import { cn } from "@/lib/utils";

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
          "Find verified private-sector and government prospects using live public sources, evidence, scoring and CRM duplicate checks.",
      },
      {
        property: "og:title",
        content:
          "Lead Hunter — Cossa AI",
      },
      {
        property: "og:description",
        content:
          "Production prospect research and verified lead capture for Cossa Nexus Holdings.",
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
    value: "cossa_tech",
    label: "Cossa Tech",
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
    value: "cossa_store",
    label: "Cossa Store",
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
    value: "deep_cleaning",
    label: "Deep Cleaning",
  },
  {
    value: "landscaping",
    label: "Landscaping",
  },
  {
    value: "website_design",
    label: "Website Design",
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
      "lead_generation",
    label:
      "Lead Generation",
  },
  {
    value: "crm",
    label: "CRM Systems",
  },
  {
    value: "ai_automation",
    label: "AI Automation",
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
];

function LeadHunterPage() {
  const abortRef =
    useRef<AbortController | null>(
      null,
    );

  const [request, setRequest] =
    useState<LeadHunterSearchRequest>(
      DEFAULT_LEAD_HUNTER_REQUEST,
    );

  const [
    selectedStrategyId,
    setSelectedStrategyId,
  ] = useState<string>(
    LEAD_HUNTER_STRATEGIES[0]
      ?.id ?? "",
  );

  const [locationInput, setLocationInput] =
    useState(
      DEFAULT_LEAD_HUNTER_REQUEST.locations.join(
        ", ",
      ),
    );

  const [industryInput, setIndustryInput] =
    useState("");

  const [organisationTypeInput, setOrganisationTypeInput] =
    useState("");

  const [
    result,
    setResult,
  ] =
    useState<LeadHunterSearchResponse | null>(
      null,
    );

  const [huntState, setHuntState] =
    useState<HuntState>("idle");

  const [huntError, setHuntError] =
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

    setRequest(strategyRequest);

    setLocationInput(
      strategyRequest.locations.join(
        ", ",
      ),
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

    setResult(null);
    setHuntState("idle");
    setHuntError(null);
  }

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
    service: LeadHunterServiceCategory,
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

  async function runHunt() {
    if (
      request.companies.length === 0
    ) {
      toast.error(
        "Choose at least one Cossa company.",
      );
      return;
    }

    if (
      request.services.length === 0
    ) {
      toast.error(
        "Choose at least one service.",
      );
      return;
    }

    const finalRequest: LeadHunterSearchRequest =
      {
        ...request,
        locations:
          parseCommaSeparated(
            locationInput,
          ),
        industries:
          parseCommaSeparated(
            industryInput,
          ),
        organisation_types:
          parseCommaSeparated(
            organisationTypeInput,
          ),
      };

    if (
      finalRequest.locations.length ===
      0
    ) {
      toast.error(
        "Enter at least one location.",
      );
      return;
    }

    abortRef.current =
      new AbortController();

    setHuntState("searching");
    setHuntError(null);
    setResult(null);

    try {
      const response =
        await huntProspects(
          finalRequest,
          abortRef.current.signal,
        );

      setResult(response);
      setHuntState("completed");

      if (
        response.prospects.length ===
        0
      ) {
        toast.warning(
          "No verified prospects met the current filters.",
          {
            description:
              "Broaden the location, service or minimum-score settings.",
          },
        );
      } else {
        toast.success(
          `${response.prospects.length} verified prospects found`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Lead Hunter search failed.";

      setHuntError(message);
      setHuntState("error");

      toast.error(
        "Lead Hunter search failed",
        {
          description: message,
        },
      );
    } finally {
      abortRef.current = null;
    }
  }

  function cancelHunt() {
    abortRef.current?.abort();
    abortRef.current = null;
    setHuntState("idle");
    setHuntError(
      "The hunt was cancelled. No CRM records were changed.",
    );
  }

  async function saveProspect(
    prospect: LeadHunterProspect,
  ) {
    setSavingProspectIds(
      (current) =>
        new Set(current).add(
          prospect.id,
        ),
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
          (current) =>
            new Set(
              current,
            ).add(
              prospect.id,
            ),
        );

        toast.warning(
          "Possible CRM duplicate",
          {
            description:
              saveResult
                .duplicate_match
                ? `${saveResult.duplicate_match.name} already exists in CRM.`
                : "A matching lead already exists.",
          },
        );

        return;
      }

      setSavedProspectIds(
        (current) =>
          new Set(current).add(
            prospect.id,
          ),
      );

      toast.success(
        "Prospect saved to CRM",
        {
          description:
            `${prospect.organisation_name} is now available in Sales → Leads.`,
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
            new Set(current);
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
          new Set(current);

        if (
          next.has(prospectId)
        ) {
          next.delete(prospectId);
        } else {
          next.add(prospectId);
        }

        return next;
      },
    );
  }

  function exportCsv() {
    if (
      prospects.length === 0
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

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      `cossa-lead-hunter-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success(
      "Lead Hunter CSV exported",
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Radar className="h-5 w-5" />
              </div>

              <StatusBadge status="Production" />
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Lead{" "}
              <span className="text-gradient-gold">
                Hunter
              </span>
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Search live public sources for
              private-sector prospects, government
              opportunities, RFQs, tenders,
              maintenance needs, facility-service
              demand, weak websites and marketing
              gaps.
            </p>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
              Results must contain public evidence.
              The system does not invent companies,
              contact details, opportunities or
              buying intent.
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
                prospects.length === 0
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Verified results"
          value={
            huntState === "searching"
              ? "—"
              : String(
                  verifiedCount,
                )
          }
          icon={ShieldCheck}
        />

        <MetricCard
          label="Government"
          value={
            huntState === "searching"
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
            huntState === "searching"
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
            huntState === "searching"
              ? "—"
              : prospects.length >
                  0
                ? `${averageScore}/100`
                : "0/100"
          }
          icon={Target}
        />

        <MetricCard
          label="Sources checked"
          value={
            huntState === "searching"
              ? "—"
              : String(
                  result?.source_count ??
                    0,
                )
          }
          icon={Globe2}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="glass-card h-fit p-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />

            <h2 className="font-display text-lg font-semibold">
              Hunt configuration
            </h2>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="lead-hunter-strategy">
                Hunting strategy
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
                Sector
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
                      key={sector}
                      onClick={() =>
                        setRequest(
                          (
                            current,
                          ) => ({
                            ...current,
                            sector,
                            include_private_sector:
                              sector ===
                                "private" ||
                              sector ===
                                "mixed",
                            include_government_sector:
                              sector ===
                                "government" ||
                              sector ===
                                "mixed",
                            include_nonprofits:
                              sector ===
                                "nonprofit" ||
                              sector ===
                                "mixed",
                          }),
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-hunter-locations">
                Locations
              </Label>

              <Input
                id="lead-hunter-locations"
                value={
                  locationInput
                }
                onChange={(
                  event,
                ) =>
                  setLocationInput(
                    event.target
                      .value,
                  )
                }
                placeholder="Pretoria, Centurion, Midrand, Gauteng"
              />

              <p className="text-[10px] leading-4 text-muted-foreground">
                Separate multiple locations with
                commas.
              </p>
            </div>

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
                Organisation types
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
                placeholder="Property manager, School, Warehouse"
              />
            </div>

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
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-hunter-results">
                  Results
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

            <div className="space-y-2">
              <ToggleOption
                label="Require phone or email"
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
                label="Require a website"
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
                label="Require opportunity signal"
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
                label="Exclude existing CRM leads"
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
            </div>

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
                onClick={runHunt}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                <Radar className="mr-2 h-4 w-4" />
                Hunt verified prospects
              </Button>
            )}

            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
              Lead Hunter searches public sources.
              It does not send messages, submit
              tenders or contact organisations
              automatically.
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {huntState === "idle" && (
            <EmptyHuntState />
          )}

          {huntState ===
            "searching" && (
            <SearchingState />
          )}

          {huntState === "error" && (
            <ErrorState
              message={
                huntError ??
                "The hunt failed."
              }
              onRetry={runHunt}
            />
          )}

          {huntState ===
            "completed" &&
            prospects.length ===
              0 && (
              <NoResultsState
                warnings={
                  result?.warnings ??
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        Verified prospect results
                      </h2>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Searched{" "}
                        {formatDateTime(
                          result?.searched_at,
                        )}
                        .
                      </p>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {
                        result?.accepted_count
                      }{" "}
                      accepted ·{" "}
                      {
                        result?.rejected_count
                      }{" "}
                      rejected
                    </div>
                  </div>

                  {result?.warnings &&
                    result.warnings
                      .length >
                      0 && (
                      <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-warning">
                          <AlertCircle className="h-4 w-4" />
                          Search notices
                        </div>

                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {result.warnings.map(
                            (
                              warning,
                            ) => (
                              <li
                                key={
                                  warning
                                }
                              >
                                •{" "}
                                {
                                  warning
                                }
                              </li>
                            ),
                          )}
                        </ul>
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

function SelectionGroup<T extends string>({
  title,
  items,
  selected,
  onToggle,
  maxHeight = false,
}: {
  title: string;
  items: Array<{
    value: T;
    label: string;
  }>;
  selected: T[];
  onToggle: (value: T) => void;
  maxHeight?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>

      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          maxHeight &&
            "max-h-64 overflow-y-auto pr-1",
        )}
      >
        {items.map((item) => {
          const active =
            selected.includes(
              item.value,
            );

          return (
            <button
              type="button"
              key={item.value}
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
        })}
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
      <span className="text-muted-foreground">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-4 w-4 accent-primary"
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
  prospect: LeadHunterProspect;
  expanded: boolean;
  saving: boolean;
  saved: boolean;
  duplicate: boolean;
  onToggleExpanded: () => void;
  onSave: () => void;
}) {
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

              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                {
                  prospect.classification
                }
              </span>

              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                {
                  prospect.sector
                }
              </span>
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
                prospect.province) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />

                  {[
                    prospect.city,
                    prospect.province,
                  ]
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
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Website
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
              onClick={onSave}
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Contactability"
            value={
              prospect.contactability_score
            }
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoBlock
            label="Recommended Cossa company"
            value={formatCompany(
              prospect.recommended_company,
            )}
          />

          <InfoBlock
            label="Recommended service"
            value={formatService(
              prospect.recommended_service,
            )}
          />

          <InfoBlock
            label="Opportunity size"
            value={
              prospect.opportunity_size
            }
          />

          <InfoBlock
            label="Date verified"
            value={formatDateTime(
              prospect.date_verified,
            )}
          />
        </div>

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
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
                Public evidence
              </h3>

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
                          <a
                            href={
                              evidence.url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {
                              evidence.title
                            }
                          </a>

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
  status: ProspectVerificationStatus;
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
      {status === "verified" && (
        <CheckCircle2 className="h-3 w-3" />
      )}

      {status ===
        "partially_verified" && (
        <AlertCircle className="h-3 w-3" />
      )}

      {status === "rejected" && (
        <XCircle className="h-3 w-3" />
      )}

      {item.label}
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
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
        </span>

        <span className="font-semibold text-primary">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                value,
              ),
            )}%`,
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

      <div className="mt-1 text-sm font-medium capitalize">
        {value}
      </div>
    </div>
  );
}

function EmptyHuntState() {
  return (
    <section className="glass-card flex min-h-[620px] items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary gold-glow">
          <Radar className="h-7 w-7" />
        </div>

        <h2 className="mt-5 font-display text-2xl font-semibold">
          Configure the first live hunt
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Select a strategy, service, location and
          sector. Lead Hunter will search public
          sources and return evidence-backed
          prospects.
        </p>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {[
            "Private companies",
            "Government tenders",
            "Small urgent projects",
            "Large strategic opportunities",
            "Public phone and email",
            "CRM duplicate protection",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchingState() {
  return (
    <section className="glass-card flex min-h-[620px] items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />

        <h2 className="mt-5 font-display text-xl font-semibold">
          Hunting live public sources
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Searching organisations, government
          sources, websites, public contact routes
          and opportunity signals.
        </p>

        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
          This can take time because the system
          verifies evidence instead of returning
          invented records.
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
  onRetry: () => void;
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
          onClick={onRetry}
          className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Retry hunt
        </Button>
      </div>
    </section>
  );
}

function NoResultsState({
  warnings,
}: {
  warnings: string[];
}) {
  return (
    <section className="glass-card flex min-h-[520px] items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Search className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-xl font-semibold">
          No prospects met the verification rules
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The search may have found public pages,
          but none met the required evidence,
          score, contact or opportunity-signal
          thresholds.
        </p>

        {warnings.length > 0 && (
          <ul className="mt-5 space-y-2 rounded-lg border border-border/60 p-4 text-left text-xs text-muted-foreground">
            {warnings.map(
              (warning) => (
                <li key={warning}>
                  • {warning}
                </li>
              ),
            )}
          </ul>
        )}

        <p className="mt-5 text-xs text-primary">
          Reduce the minimum score, remove the
          contact requirement, broaden the location
          or select another strategy.
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
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatCompany(
  company: LeadHunterCompany,
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
    nexdocs: "NexDocs",
    cossa_store:
      "Cossa Store",
    cossa_nexus_holdings:
      "Cossa Nexus Holdings",
  };

  return labels[company];
}

function formatService(
  service: LeadHunterServiceCategory,
): string {
  return service
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}