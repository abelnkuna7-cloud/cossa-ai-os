import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { salesLeads, salesOpportunities, salesQuotations } from "@/lib/business-data";
import { fmtCurrency } from "@/components/crud-workspace";

export const Route = createFileRoute("/sales/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Sales Analytics — Cossa AI" },
      {
        name: "description",
        content: "Live sales metrics from your pipeline, leads and quotations.",
      },
      { property: "og:title", content: "Sales Analytics — Cossa AI" },
      { property: "og:description", content: "Cossa AI sales analytics." },
    ],
  }),
});

function AnalyticsPage() {
  const leads = useQuery({ queryKey: ["sales-leads"], queryFn: salesLeads.list });
  const opps = useQuery({ queryKey: ["sales-opportunities"], queryFn: salesOpportunities.list });
  const quotes = useQuery({ queryKey: ["sales-quotations"], queryFn: salesQuotations.list });

  const leadRows = leads.data ?? [];
  const oppRows = opps.data ?? [];
  const quoteRows = quotes.data ?? [];

  const converted = leadRows.filter((l) => l.status === "converted").length;
  const conversion = leadRows.length ? Math.round((converted / leadRows.length) * 100) : 0;
  const won = oppRows.filter((o) => o.stage === "won");
  const lost = oppRows.filter((o) => o.stage === "lost");
  const winRate =
    won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const wonValue = won.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const acceptedRate = quoteRows.length
    ? Math.round((quoteRows.filter((q) => q.status === "accepted").length / quoteRows.length) * 100)
    : 0;

  const stats = [
    { label: "Leads", value: leadRows.length },
    { label: "Lead → customer", value: `${conversion}%` },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Won revenue", value: fmtCurrency(wonValue) },
    { label: "Quote acceptance", value: `${acceptedRate}%` },
    {
      label: "Open deals",
      value: oppRows.filter((o) => !["won", "lost"].includes(o.stage)).length,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <BarChart3 className="h-5 w-5" />
            </div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Sales Analytics</h1>
          <p className="mt-1 text-muted-foreground">Every metric derived live from your data.</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-gradient-gold">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
