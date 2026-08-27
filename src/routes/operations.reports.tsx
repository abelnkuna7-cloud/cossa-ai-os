import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { fmtCurrency } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { consolidatedGrowthIntelligence } from "@/lib/consolidated-growth-intelligence";

export const Route = createFileRoute("/operations/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports — Cossa AI" },
      { name: "description", content: "Live cross-module reports." },
      { property: "og:title", content: "Reports — Cossa AI" },
      { property: "og:description", content: "Cossa AI reports." },
    ],
  }),
});

function ReportsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["consolidated-growth-intelligence"],
    queryFn: consolidatedGrowthIntelligence,
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <FileBarChart className="h-5 w-5" />
            </div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Reports</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Consolidated reporting across the new Cossa AI architecture and the canonical Growth operating records. Lead funnel and opportunity pipeline are reported separately so neither dataset is hidden or double-counted.
          </p>
        </div>
      </section>

      {isLoading || !data ? (
        <div className="glass-card p-8 text-muted-foreground text-sm">
          {isError && error instanceof Error ? error.message : "Loading…"}
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Accepted quote value", value: fmtCurrency(data.dashboard.acceptedQuotationValue) },
              { label: "Open opportunity value", value: fmtCurrency(data.dashboard.pipelineValue) },
              { label: "All leads", value: data.dashboard.totalLeads },
              { label: "New leads (7d)", value: data.dashboard.newLeads },
              { label: "Customers", value: data.dashboard.customers },
              { label: "Active projects", value: data.dashboard.activeProjects },
              { label: "Open tasks", value: data.dashboard.openTasks },
              { label: "Open quotes", value: data.dashboard.quotesOpen },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">{stat.value}</div>
              </div>
            ))}
          </section>

          <section className="glass-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Lead funnel</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Canonical records from the shared leads table, including legacy and newer stages.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/sales/lead-pipeline">Open Lead Funnel</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {data.leadFunnel.map((stage) => (
                <div key={stage.key} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{stage.label}</div>
                  <div className="mt-1 font-display text-xl font-semibold">{stage.count}</div>
                  {stage.estimatedValue > 0 ? (
                    <div className="text-xs text-primary">Recorded estimate: {fmtCurrency(stage.estimatedValue)}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No recorded estimate</div>
                  )}
                </div>
              ))}
            </div>
            {data.unmappedLeadStages.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">Unmapped real lead stages</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {data.unmappedLeadStages.map((stage) => (
                    <span key={stage.key} className="rounded-full border border-border/60 px-2 py-1">
                      {stage.label}: {stage.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="glass-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Opportunity pipeline</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Qualified opportunity records remain separate from the lead funnel.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/sales/pipeline">Open Opportunity Pipeline</Link>
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {data.dashboard.pipelineByStage.map((stage) => (
                <div key={stage.stage} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{stage.stage}</div>
                  <div className="mt-1 font-display text-xl font-semibold">{stage.count}</div>
                  <div className="text-xs text-primary">{fmtCurrency(stage.value)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold">Marketing operating records</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Existing Growth marketing records now surfaced again in the new platform.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Content calendar", data.marketingOperations.contentItems],
                ["Social posts", data.marketingOperations.socialPosts],
                ["Social accounts", data.marketingOperations.socialAccounts],
                ["Referrals", data.marketingOperations.referrals],
                ["Review requests", data.marketingOperations.reviewRequests],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="mt-1 font-display text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
