import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { salesLeads } from "@/lib/business-data";

export const Route = createFileRoute("/sales/lead-scoring")({
  component: LeadScoringPage,
  head: () => ({
    meta: [
      { title: "Lead Scoring — Cossa AI" },
      { name: "description", content: "See every lead ranked by score." },
      { property: "og:title", content: "Lead Scoring — Cossa AI" },
      { property: "og:description", content: "Cossa AI lead scoring." },
    ],
  }),
});

function LeadScoringPage() {
  const { data, isLoading } = useQuery({ queryKey: ["sales-leads"], queryFn: salesLeads.list });
  const rows = [...(data ?? [])].sort((a, b) => b.score - a.score);
  const hot = rows.filter((r) => r.score >= 70);
  const warm = rows.filter((r) => r.score >= 40 && r.score < 70);
  const cold = rows.filter((r) => r.score < 40);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><Gauge className="h-5 w-5" /></div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Lead Scoring</h1>
          <p className="mt-1 text-muted-foreground">Every lead ranked. Work the hottest first.</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-success">Hot (≥70)</div><div className="mt-1 font-display text-2xl font-semibold">{hot.length}</div></div>
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-primary">Warm (40–69)</div><div className="mt-1 font-display text-2xl font-semibold">{warm.length}</div></div>
        <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cold (&lt;40)</div><div className="mt-1 font-display text-2xl font-semibold">{cold.length}</div></div>
      </div>

      <section className="glass-card p-4 md:p-6">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">No leads yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60"><th className="px-3 py-2 text-left font-medium">Score</th><th className="px-3 py-2 text-left font-medium">Name</th><th className="px-3 py-2 text-left font-medium">Company</th><th className="px-3 py-2 text-left font-medium">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="px-3 py-3"><span className={r.score >= 70 ? "text-success font-semibold" : r.score >= 40 ? "text-primary" : "text-muted-foreground"}>{r.score}</span></td>
                  <td className="px-3 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3">{r.company ?? "—"}</td>
                  <td className="px-3 py-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
