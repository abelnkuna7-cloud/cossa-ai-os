import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { dashboardStats } from "@/lib/business-data";
import { fmtCurrency } from "@/components/crud-workspace";

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
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: dashboardStats });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
          <p className="mt-1 text-muted-foreground">
            Cross-module reporting, live from the database.
          </p>
        </div>
      </section>

      {isLoading || !data ? (
        <div className="glass-card p-8 text-muted-foreground text-sm">Loading…</div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Accepted quote value", value: fmtCurrency(data.acceptedQuotationValue) },
              { label: "Pipeline value", value: fmtCurrency(data.pipelineValue) },
              { label: "New leads (7d)", value: data.newLeads },
              { label: "Customers", value: data.customers },
              { label: "Active projects", value: data.activeProjects },
              { label: "Open tasks", value: data.openTasks },
              { label: "Overdue tasks", value: data.overdueTasks },
              { label: "Open quotes", value: data.quotesOpen },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
              </div>
            ))}
          </section>

          <section className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold">Pipeline by stage</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {data.pipelineByStage.map((p) => (
                <div key={p.stage} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.stage}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold">{p.count}</div>
                  <div className="text-xs text-primary">{fmtCurrency(p.value)}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
