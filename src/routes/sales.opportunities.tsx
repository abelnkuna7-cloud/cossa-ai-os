import { createFileRoute } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { CrudWorkspace, fmtCurrency, fmtDate } from "@/components/crud-workspace";
import { salesOpportunities, type SalesOpportunity } from "@/lib/business-data";

export const Route = createFileRoute("/sales/opportunities")({
  component: OpportunitiesPage,
  head: () => ({
    meta: [
      { title: "Opportunities — Cossa AI" },
      { name: "description", content: "Track every open deal and expected close." },
      { property: "og:title", content: "Opportunities — Cossa AI" },
      { property: "og:description", content: "Cossa AI opportunity register." },
    ],
  }),
});

const STAGES = ["prospect", "qualified", "proposal", "negotiation", "won", "lost"];

function Stats({ rows }: { rows: SalesOpportunity[] }) {
  const open = rows.filter((r) => !["won", "lost"].includes(r.stage));
  const openValue = open.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const weighted = open.reduce((s, o) => s + Number(o.value ?? 0) * (o.probability / 100), 0);
  const won = rows.filter((r) => r.stage === "won").reduce((s, o) => s + Number(o.value ?? 0), 0);
  const stats = [
    { label: "Open deals", value: open.length },
    { label: "Open value", value: fmtCurrency(openValue) },
    { label: "Weighted", value: fmtCurrency(weighted) },
    { label: "Won (all-time)", value: fmtCurrency(won) },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
          <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function OpportunitiesPage() {
  return (
    <CrudWorkspace<SalesOpportunity>
      title="Opportunities"
      tagline="Every open deal, one view"
      icon={Radar}
      queryKey="sales-opportunities"
      fetch={salesOpportunities.list}
      create={salesOpportunities.create}
      update={salesOpportunities.update}
      remove={salesOpportunities.remove}
      singular="opportunity"
      Stats={Stats}
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "value", label: "Value (R)", type: "number", defaultValue: 0 },
        { key: "stage", label: "Stage", type: "select", options: STAGES, defaultValue: "prospect" },
        { key: "probability", label: "Probability %", type: "number", defaultValue: 20 },
        { key: "expected_close", label: "Expected close", type: "date" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "value", label: "Value", render: (r) => fmtCurrency(r.value) },
        { key: "stage", label: "Stage", render: (r) => (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.stage}</span>
        ) },
        { key: "probability", label: "Win %", render: (r) => `${r.probability}%` },
        { key: "expected_close", label: "Close", render: (r) => fmtDate(r.expected_close) },
      ]}
      searchKeys={["title", "stage", "notes"]}
    />
  );
}
