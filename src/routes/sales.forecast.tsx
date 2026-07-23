import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { salesOpportunities } from "@/lib/business-data";
import { fmtCurrency } from "@/components/crud-workspace";

export const Route = createFileRoute("/sales/forecast")({
  component: ForecastPage,
  head: () => ({
    meta: [
      { title: "Sales Forecast — Cossa AI" },
      { name: "description", content: "Weighted revenue forecast from every open opportunity." },
      { property: "og:title", content: "Sales Forecast — Cossa AI" },
      { property: "og:description", content: "Cossa AI sales forecast." },
    ],
  }),
});

function ForecastPage() {
  const { data, isLoading } = useQuery({ queryKey: ["sales-opportunities"], queryFn: salesOpportunities.list });
  const rows = (data ?? []).filter((o) => !["won", "lost"].includes(o.stage));
  const months = new Map<string, { count: number; value: number; weighted: number }>();
  for (const o of rows) {
    const key = o.expected_close ? new Date(o.expected_close).toISOString().slice(0, 7) : "unscheduled";
    const cur = months.get(key) ?? { count: 0, value: 0, weighted: 0 };
    cur.count++;
    cur.value += Number(o.value ?? 0);
    cur.weighted += Number(o.value ?? 0) * (o.probability / 100);
    months.set(key, cur);
  }
  const sorted = Array.from(months.entries()).sort(([a], [b]) => (a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b)));
  const totalValue = rows.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const totalWeighted = rows.reduce((s, o) => s + Number(o.value ?? 0) * (o.probability / 100), 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><LineChart className="h-5 w-5" /></div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Sales Forecast</h1>
          <p className="mt-1 text-muted-foreground">Rolled up from every open opportunity, weighted by probability.</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Open deals</div><div className="mt-1 font-display text-2xl font-semibold">{rows.length}</div></div>
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Open value</div><div className="mt-1 font-display text-2xl font-semibold">{fmtCurrency(totalValue)}</div></div>
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Weighted</div><div className="mt-1 font-display text-2xl font-semibold text-gradient-gold">{fmtCurrency(totalWeighted)}</div></div>
      </div>

      <section className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold">By expected close</h2>
        {isLoading ? (
          <div className="mt-4 text-muted-foreground text-sm">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="mt-4 text-muted-foreground text-sm">No opportunities yet. Add one to see the forecast.</div>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-left font-medium">Deals</th>
                <th className="px-3 py-2 text-left font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(([key, v]) => (
                <tr key={key} className="border-b border-border/40">
                  <td className="px-3 py-3 font-medium">{key}</td>
                  <td className="px-3 py-3">{v.count}</td>
                  <td className="px-3 py-3">{fmtCurrency(v.value)}</td>
                  <td className="px-3 py-3 text-primary">{fmtCurrency(v.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
