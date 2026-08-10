import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  FolderKanban,
  Loader2,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { fmtCurrency } from "@/components/crud-workspace";
import { dashboardStats } from "@/lib/business-data";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/operations/business-intelligence")({
  component: BusinessIntelligence,
  head: () => ({
    meta: [
      { title: "Business Intelligence — Cossa AI" },
      {
        name: "description",
        content: "A verified CRM and operations snapshot for Cossa Nexus Holdings.",
      },
    ],
  }),
});

function BusinessIntelligence() {
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardStats,
    staleTime: 30_000,
  });
  const data = statsQuery.data;

  const kpis = [
    {
      label: "Recorded revenue",
      value: fmtCurrency(data?.recordedRevenue ?? 0),
      detail: "Won opportunities and accepted quotations",
      icon: DollarSign,
      to: "/sales/quotations" as const,
    },
    {
      label: "Open pipeline",
      value: fmtCurrency(data?.pipelineValue ?? 0),
      detail: "Recorded value on open opportunities",
      icon: TrendingUp,
      to: "/sales/pipeline" as const,
    },
    {
      label: "Customers",
      value: String(data?.customers ?? 0),
      detail: "Customer records in the CRM",
      icon: Users,
      to: "/sales/customers" as const,
    },
    {
      label: "Active projects",
      value: String(data?.activeProjects ?? 0),
      detail: "Projects not marked done or archived",
      icon: FolderKanban,
      to: "/operations/projects" as const,
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={workspaceRuntimeStatus()} />
              </div>
              <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
                Business <span className="text-gradient-gold">Intelligence</span>
              </h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                A current CRM and operations snapshot. Metrics appear only when supported by records
                in your live workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {statsQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh snapshot
          </button>
        </div>
      </section>

      {statsQuery.isError ? (
        <section
          role="alert"
          className="glass-card flex items-start gap-3 border-destructive/40 p-6"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">Business intelligence could not load</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No information has been changed. Verify CRM access and refresh the snapshot.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Link
                key={kpi.label}
                to={kpi.to}
                className="glass-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </div>
                  <kpi.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  {statsQuery.isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    kpi.value
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p>
              </Link>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="glass-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Pipeline by stage</h2>
                  <p className="text-xs text-muted-foreground">
                    Current count and recorded value of opportunities.
                  </p>
                </div>
                <ReceiptText className="h-4 w-4 text-primary" />
              </div>
              {statsQuery.isLoading ? (
                <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {(data?.pipelineByStage ?? []).map((stage) => (
                    <Link
                      key={stage.stage}
                      to="/sales/pipeline"
                      className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {stage.stage}
                      </div>
                      <div className="mt-1 font-display text-xl font-semibold">{stage.count}</div>
                      <div className="text-xs text-primary">{fmtCurrency(stage.value)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="glass-card p-6">
              <h2 className="font-display text-lg font-semibold">Work to manage</h2>
              <div className="mt-4 space-y-3 text-sm">
                <MetricRow
                  label="New leads (7 days)"
                  value={data?.newLeads ?? 0}
                  to="/sales/leads"
                />
                <MetricRow
                  label="Open quotations"
                  value={data?.quotesOpen ?? 0}
                  to="/sales/quotations"
                />
                <MetricRow label="Open tasks" value={data?.openTasks ?? 0} to="/operations/tasks" />
                <MetricRow
                  label="Overdue tasks"
                  value={data?.overdueTasks ?? 0}
                  to="/operations/tasks"
                  warn={(data?.overdueTasks ?? 0) > 0}
                />
              </div>
            </section>
          </div>

          <section className="glass-card p-6">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h2 className="mt-3 font-semibold">Data sources not yet connected are excluded</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Marketing performance, gross margin, cashflow, employee measures and external
              analytics will appear only after their authorised source has been connected and the
              evidence model is approved. Cossa will not estimate them.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  to,
  warn = false,
}: {
  label: string;
  value: number;
  to: "/sales/leads" | "/sales/quotations" | "/operations/tasks";
  warn?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2 transition-colors hover:border-primary/40"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? "font-semibold text-warning" : "font-semibold text-primary"}>
        {value}
      </span>
    </Link>
  );
}
