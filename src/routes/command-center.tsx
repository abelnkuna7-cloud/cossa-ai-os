import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileText,
  Gauge,
  Globe2,
  Handshake,
  LineChart,
  Loader2,
  Rocket,
  Sparkles,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { dashboardStats, opsTasks, salesAppointments } from "@/lib/business-data";
import { fmtCurrency, fmtDateTime } from "@/components/crud-workspace";
import { GrowthEagleArtwork, ParentBrandEndorsement } from "@/components/brand/growth-brand";
import { GROWTH_BRAND } from "@/lib/brand";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";
import {
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
} from "@/lib/workforce-data";
import {
  getConnectedBusinessSummary,
  listStoreQuoteRequests,
  type StoreQuoteRequest,
} from "@/lib/connected-business-data";

export const Route = createFileRoute("/command-center")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "GROWTH Command Center — Business Growth Intelligence",
      },
      {
        name: "description",
        content:
          "Monitor live CRM, sales pipeline, quotations, projects, tasks and appointments inside GROWTH, a Cossa Nexus Holdings platform.",
      },
    ],
  }),
});

/**
 * Business-health scores remain empty until a verified calculation
 * workflow exists. Never display invented operational scores.
 */
const healthCategories: {
  name: string;
  score: number;
}[] = [];

const quickActions = [
  {
    label: "New Lead",
    icon: Users,
    to: "/sales/leads" as const,
  },
  {
    label: "Create Quote",
    icon: Handshake,
    to: "/sales/quotations" as const,
  },
  {
    label: "Launch Campaign",
    icon: Rocket,
    to: "/marketing/campaigns" as const,
  },
  {
    label: "Ask Cossa AI",
    icon: Brain,
    to: "/ai/cossa" as const,
  },
  {
    label: "Schedule Meeting",
    icon: CalendarDays,
    to: "/sales/appointments" as const,
  },
  {
    label: "New Automation",
    icon: Zap,
    to: "/ai/automation" as const,
  },
];

function scoreTone(value: number) {
  if (value >= 80) {
    return "text-success";
  }

  if (value >= 65) {
    return "text-primary";
  }

  if (value >= 50) {
    return "text-warning";
  }

  return "text-destructive";
}

function normaliseStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatQuoteDate(value: string | null): string {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatQuoteScope(value: string | null): string {
  return value?.replaceAll("_", " ").trim() || "Store enquiry";
}

function quoteRequirements(request: StoreQuoteRequest): string {
  return (
    request.requirements?.trim() ||
    request.project_details?.trim() ||
    "No written requirement was supplied."
  );
}

function quoteItemLabels(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [item.trim()];
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const name = [record.name, record.title, record.product_name, record.sku].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    const quantity = [record.quantity, record.qty].find(
      (value) => typeof value === "number" || (typeof value === "string" && value.trim()),
    );

    if (!name) {
      return [];
    }

    return [quantity ? `${name.trim()} × ${quantity}` : name.trim()];
  });
}

function Dashboard() {
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardStats,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["ops-tasks"],
    queryFn: opsTasks.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["sales-appointments"],
    queryFn: salesAppointments.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const storeQuotesQuery = useQuery({
    queryKey: ["store-quote-requirements"],
    queryFn: listStoreQuoteRequests,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const connectedBusinessQuery = useQuery({
    queryKey: ["connected-business-summary"],
    queryFn: getConnectedBusinessSummary,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const workforceEmployeesQuery = useQuery({
    queryKey: ["dashboard-ai-workforce-employees"],
    queryFn: () => listEmployees(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const workforceMissionsQuery = useQuery({
    queryKey: ["dashboard-ai-workforce-missions"],
    queryFn: () => listMissions(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const workforceHandoffsQuery = useQuery({
    queryKey: ["dashboard-ai-workforce-handoffs"],
    queryFn: () => listEmployeeHandoffs(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const workforceApprovalsQuery = useQuery({
    queryKey: ["dashboard-ai-workforce-approvals"],
    queryFn: () => listPendingApprovals(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const stats = statsQuery.data;
  const verifiedStats = statsQuery.isSuccess ? stats : undefined;
  const storeQuotes = storeQuotesQuery.isSuccess ? (storeQuotesQuery.data ?? []) : undefined;
  const connectedBusiness = connectedBusinessQuery.isSuccess
    ? connectedBusinessQuery.data
    : undefined;

  const kpis = [
    {
      label: "Accepted quote value",
      value: verifiedStats ? fmtCurrency(verifiedStats.acceptedQuotationValue) : "Unavailable",
      icon: DollarSign,
      tone: "text-success",
      to: "/sales/quotations" as const,
      description: "Accepted quotations only — not cash received",
    },
    {
      label: "New Leads (7d)",
      value: verifiedStats ? String(verifiedStats.newLeads) : "Unavailable",
      icon: Users,
      tone: "text-info",
      to: "/sales/leads" as const,
      description: "Leads created during the last seven days",
    },
    {
      label: "Pipeline Value",
      value: verifiedStats ? fmtCurrency(verifiedStats.pipelineValue) : "Unavailable",
      icon: TrendingUp,
      tone: "text-primary",
      to: "/sales/pipeline" as const,
      description: "Estimated value of open opportunities",
    },
    {
      label: "Active Projects",
      value: verifiedStats ? String(verifiedStats.activeProjects) : "Unavailable",
      icon: Gauge,
      tone: "text-chart-5",
      to: "/operations/projects" as const,
      description: "Projects not marked done or archived",
    },
  ];

  const openTasks = (tasksQuery.data ?? [])
    .filter((task) => normaliseStatus(task.status) !== "done")
    .slice(0, 5);

  const upcomingAppointments = (appointmentsQuery.data ?? [])
    .filter((appointment) => {
      const startsAt = new Date(appointment.starts_at).getTime();

      return Number.isFinite(startsAt) && startsAt >= Date.now();
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  const growthCoordinationMissions = (workforceMissionsQuery.data ?? []).filter((mission) =>
    mission.title.startsWith("Growth coordination:"),
  );
  const growthMissionIds = new Set(growthCoordinationMissions.map((mission) => mission.id));
  const pendingGrowthHandoffs = (workforceHandoffsQuery.data ?? []).filter(
    (handoff) => handoff.status === "pending" && growthMissionIds.has(handoff.mission_id),
  );
  const latestGrowthMission = growthCoordinationMissions[0] ?? null;
  const workforceLoading =
    workforceEmployeesQuery.isLoading ||
    workforceMissionsQuery.isLoading ||
    workforceHandoffsQuery.isLoading ||
    workforceApprovalsQuery.isLoading;

  const dashboardHasError =
    statsQuery.isError ||
    tasksQuery.isError ||
    appointmentsQuery.isError ||
    storeQuotesQuery.isError ||
    connectedBusinessQuery.isError ||
    workforceEmployeesQuery.isError ||
    workforceMissionsQuery.isError ||
    workforceHandoffsQuery.isError ||
    workforceApprovalsQuery.isError;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <GrowthEagleArtwork className="pointer-events-none absolute -right-10 -top-24 hidden h-[420px] w-[210px] object-cover object-[center_38%] opacity-[0.13] lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-background/80 to-transparent lg:block" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={workspaceRuntimeStatus()} />

              <span className="text-xs text-muted-foreground">GROWTH Command Center</span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Welcome back to{" "}
              <span className="text-gradient-gold">{GROWTH_BRAND.productName}.</span>
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              {GROWTH_BRAND.productDescriptor} connects CRM, leads, opportunities, quotations,
              projects, tasks and appointments in one production workspace.
            </p>

            <ParentBrandEndorsement className="mt-4" />
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-left gold-glow md:text-right">
              <div className="text-[10px] uppercase tracking-widest text-primary/90">
                Business Health
              </div>

              <div className="font-display text-sm font-semibold text-gradient-gold">
                Awaiting verified calculation
              </div>
            </div>

            <Link to="/ai/cossa">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                <Brain className="mr-2 h-4 w-4" />
                Ask Cossa AI
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {dashboardHasError && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              Some dashboard information could not be loaded
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Existing records have not been changed. Refresh the dashboard or check the relevant
              Supabase permissions if the problem continues.
            </p>

            <button
              type="button"
              onClick={() => {
                void statsQuery.refetch();
                void tasksQuery.refetch();
                void appointmentsQuery.refetch();
                void storeQuotesQuery.refetch();
                void connectedBusinessQuery.refetch();
                void workforceEmployeesQuery.refetch();
                void workforceMissionsQuery.refetch();
                void workforceHandoffsQuery.refetch();
                void workforceApprovalsQuery.refetch();
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Retry dashboard queries
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="glass-card group block p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {kpi.label}
                </div>

                <Icon className={`h-4 w-4 ${kpi.tone}`} />
              </div>

              <div className="mt-2 font-display text-2xl font-semibold">
                {statsQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  kpi.value
                )}
              </div>

              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.description}</p>

              <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                {statsQuery.isSuccess ? "Open live records" : "Open records"}

                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Business Health</h2>

              <p className="text-xs text-muted-foreground">
                A future verified score across finance, sales, marketing, operations, customers and
                delivery.
              </p>
            </div>

            <Link
              to="/business-health"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              View details
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {healthCategories.length === 0 ? (
            <p className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No health score has been calculated. Cossa AI must only calculate it from verified
              CRM, financial, operational and marketing evidence.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {healthCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{category.name}</span>

                    <span className={`font-semibold ${scoreTone(category.score)}`}>
                      {category.score}
                    </span>
                  </div>

                  <Progress value={category.score} className="mt-1.5 h-1.5" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />

            <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Icon className="h-4 w-4 text-primary" />

                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Sales Pipeline</h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Open opportunities grouped by their current sales stage.
              </p>
            </div>

            <Link to="/sales/pipeline" className="text-xs text-primary hover:underline">
              Open pipeline
            </Link>
          </div>

          {statsQuery.isLoading ? (
            <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pipeline…
            </div>
          ) : !verifiedStats ? (
            <p className="mt-6 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              Pipeline values are unavailable until the CRM snapshot loads successfully.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {verifiedStats.pipelineByStage.map((stage) => (
                <Link
                  key={stage.stage}
                  to="/sales/pipeline"
                  className="group rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {stage.stage}
                  </div>

                  <div className="mt-1 font-display text-xl font-semibold">{stage.count}</div>

                  <div className="text-xs text-primary">{fmtCurrency(stage.value)}</div>

                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-primary">
                    View stage
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />

            <h2 className="font-display text-lg font-semibold">At a glance</h2>
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <DashboardMetricRow
              label="Customers"
              value={verifiedStats?.customers ?? "Unavailable"}
              to="/sales/customers"
            />

            <DashboardMetricRow
              label="Open tasks"
              value={verifiedStats?.openTasks ?? "Unavailable"}
              to="/operations/tasks"
            />

            <DashboardMetricRow
              label="Overdue tasks"
              value={verifiedStats?.overdueTasks ?? "Unavailable"}
              to="/operations/tasks"
              warning={(verifiedStats?.overdueTasks ?? 0) > 0}
            />

            <DashboardMetricRow
              label="Open quotes"
              value={verifiedStats?.quotesOpen ?? "Unavailable"}
              to="/sales/quotations"
            />

            <DashboardMetricRow
              label="Total leads"
              value={verifiedStats?.totalLeads ?? "Unavailable"}
              to="/sales/leads"
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold">Store quote requirements</h2>
              </div>

              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Every Cossa Store quote is recorded here with its reference, customer requirement,
                product list and delivery information for management follow-up.
              </p>
            </div>

            <Link
              to="/sales/crm"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              Open CRM
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {storeQuotesQuery.isLoading ? (
            <div className="mt-5 flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Store quote requirements…
            </div>
          ) : storeQuotes === undefined ? (
            <p className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
              Store quote requests are temporarily unavailable. Existing customer requests have not
              been changed.
            </p>
          ) : storeQuotes.length === 0 ? (
            <p className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No Store quote requests have been submitted yet. New requests will appear here
              automatically after the customer receives their quotation reference.
            </p>
          ) : (
            <ol className="mt-5 space-y-3">
              {storeQuotes.map((quote) => {
                const itemLabels = quoteItemLabels(quote.items);
                const requester = quote.contact_name?.trim() || quote.full_name?.trim() || "Store customer";

                return (
                  <li
                    key={quote.id}
                    className="rounded-xl border border-primary/25 bg-card/40 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{requester}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {formatQuoteScope(quote.scope)}
                          </span>
                        </div>

                        {quote.company?.trim() ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{quote.company.trim()}</p>
                        ) : null}
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="font-mono text-xs font-semibold text-primary">
                          {quote.reference || "Reference pending"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatQuoteDate(quote.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-border/60 bg-background/30 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Customer requirement
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                        {quoteRequirements(quote)}
                      </p>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Location
                        </dt>
                        <dd className="mt-1">{quote.location?.trim() || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Quantity
                        </dt>
                        <dd className="mt-1">{quote.estimated_quantity?.trim() || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Required date
                        </dt>
                        <dd className="mt-1">{quote.required_date?.trim() || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Budget
                        </dt>
                        <dd className="mt-1">{quote.budget?.trim() || "Not specified"}</dd>
                      </div>
                    </dl>

                    {itemLabels.length > 0 ? (
                      <div className="mt-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Requested products
                        </div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {itemLabels.map((item) => (
                            <li
                              key={item}
                              className="rounded-full border border-border/60 bg-background/30 px-2.5 py-1 text-xs"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {quote.additional_information?.trim() ? (
                      <div className="mt-4 border-t border-border/60 pt-3 text-sm">
                        <span className="font-medium">Additional information: </span>
                        <span className="whitespace-pre-wrap text-muted-foreground">
                          {quote.additional_information.trim()}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Connected business systems</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Verified reporting from the shared Cossa production database.
          </p>

          {connectedBusinessQuery.isLoading ? (
            <div className="mt-5 flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connected systems…
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <Link
                to="/sales/leads"
                className="group block rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Main website</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Enquiries sent to Growth CRM
                    </div>
                  </div>
                  <Globe2 className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-2xl font-semibold">
                  {connectedBusiness ? connectedBusiness.mainWebsiteLeadCount : "Unavailable"}
                </div>
                <div className="text-xs text-muted-foreground">Recorded website leads</div>
              </Link>

              <Link
                to="/businesses/store"
                className="group block rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Cossa Store</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Quotes, leads and buyable-product orders
                    </div>
                  </div>
                  <Store className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-2xl font-semibold">
                  {storeQuotes === undefined ? "Unavailable" : storeQuotes.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {connectedBusiness
                    ? `Quote requests · ${connectedBusiness.storeLeadCount} Growth leads · ${connectedBusiness.storeOrderCount} orders`
                    : "Connected Store reporting is unavailable"}
                </div>
              </Link>

              <Link
                to="/businesses/nexdocs"
                className="group block rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">NexDocs</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Document activity and subscription reporting
                    </div>
                  </div>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-2xl font-semibold">
                  {connectedBusiness?.nexdocsDocumentCount ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {connectedBusiness?.nexdocsDocumentCount === null
                    ? "Document count is owner/admin protected"
                    : "Managed document drafts"}
                  {connectedBusiness?.nexdocsSubscription
                    ? ` · ${connectedBusiness.nexdocsSubscription.planCode || "Plan"} ${
                        connectedBusiness.nexdocsSubscription.status || "status pending"
                      }`
                    : ""}
                </div>
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">AI Workforce owner briefing</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Live records for Cossa's controlled social, content, account-growth and paid-media
              planning team. Pending handoffs are not completed work, and external actions remain
              disabled until you approve an authorised connection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/ai/workforce"
              search={{
                view: "command",
                department: "all",
              }}
            >
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <UsersRound className="mr-1.5 h-4 w-4" />
                Manage workforce
              </Button>
            </Link>
            <Link to="/ai/ceo">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                <Brain className="mr-1.5 h-4 w-4" />
                Open AI CEO briefing
              </Button>
            </Link>
          </div>
        </div>

        {workforceLoading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading workforce recordsâ€¦
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkforceMetric
              label="Active workforce profiles"
              value={String(
                (workforceEmployeesQuery.data ?? []).filter(
                  (employee) => employee.status === "active",
                ).length,
              )}
              detail="Installed AI workers"
            />
            <WorkforceMetric
              label="Growth coordination plans"
              value={String(growthCoordinationMissions.length)}
              detail={latestGrowthMission ? latestGrowthMission.status : "No plan recorded"}
            />
            <WorkforceMetric
              label="Pending internal handoffs"
              value={String(pendingGrowthHandoffs.length)}
              detail="Waiting for recorded progress"
              warning={pendingGrowthHandoffs.length > 0}
            />
            <WorkforceMetric
              label="Approvals awaiting owner"
              value={String((workforceApprovalsQuery.data ?? []).length)}
              detail="No approval means no external action"
              warning={(workforceApprovalsQuery.data ?? []).length > 0}
            />
          </div>
        )}

        {latestGrowthMission ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <span className="font-medium">Latest recorded objective: </span>
              {latestGrowthMission.objective}
              <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                {latestGrowthMission.status}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Tasks</h2>

            <Link to="/operations/tasks" className="text-xs text-primary hover:underline">
              All tasks
            </Link>
          </div>

          {tasksQuery.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tasks…
            </div>
          ) : openTasks.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No open tasks.{" "}
              <Link to="/operations/tasks" className="text-primary hover:underline">
                Add one
              </Link>
              .
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {openTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to="/operations/tasks"
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm transition-colors hover:border-primary/40"
                  >
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />

                    <span className="min-w-0 flex-1 truncate">{task.title}</span>

                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {task.priority}
                    </span>

                    <span className="text-xs text-primary">
                      {task.due_at ? fmtDateTime(task.due_at) : "No due date"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-display text-lg font-semibold">Upcoming</h2>
            </div>

            <Link to="/operations/calendar" className="text-xs text-primary hover:underline">
              Calendar
            </Link>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading appointments…
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              Nothing is currently scheduled.{" "}
              <Link to="/sales/appointments" className="text-primary hover:underline">
                Book an appointment
              </Link>
              .
            </div>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    to="/sales/appointments"
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-primary/5"
                  >
                    <span className="w-32 shrink-0 text-xs text-primary">
                      {fmtDateTime(appointment.starts_at)}
                    </span>

                    <span>{appointment.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass-card p-6">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />

          <h2 className="font-display text-lg font-semibold">Build the operating record</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Keep adding verified business records so Cossa AI and the dashboard can provide stronger,
          evidence-based decisions.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/sales/leads">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Add a lead
            </Button>
          </Link>

          <Link to="/sales/opportunities">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Add an opportunity
            </Button>
          </Link>

          <Link to="/operations/projects">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Start a project
            </Button>
          </Link>

          <Link to="/ai/cossa">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              <Brain className="mr-1.5 h-4 w-4" />
              Ask Cossa AI
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function WorkforceMetric({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={
          warning
            ? "mt-2 font-display text-2xl font-semibold text-warning"
            : "mt-2 font-display text-2xl font-semibold"
        }
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function DashboardMetricRow({
  label,
  value,
  to,
  warning = false,
}: {
  label: string;
  value: number | string;
  to: "/sales/customers" | "/operations/tasks" | "/sales/quotations" | "/sales/leads";
  warning?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
    >
      <span className="text-muted-foreground group-hover:text-foreground">{label}</span>

      <span className={warning ? "font-semibold text-destructive" : "font-semibold"}>{value}</span>
    </Link>
  );
}
