import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { salesLeads, type SalesLead } from "@/lib/business-data";

export const Route = createFileRoute("/sales/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Leads — Cossa AI" },
      {
        name: "description",
        content: "Capture, score and manage every sales lead in one workspace.",
      },
      { property: "og:title", content: "Leads — Cossa AI" },
      { property: "og:description", content: "Live lead management for Cossa AI." },
    ],
  }),
});

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const SOURCES = [
  "website",
  "referral",
  "google",
  "meta",
  "whatsapp",
  "email",
  "cold outbound",
  "event",
];

function Stats({ rows }: { rows: SalesLead[] }) {
  const hot = rows.filter((r) => r.score >= 70).length;
  const newLeads = rows.filter((r) => r.status === "new").length;
  const qualified = rows.filter((r) => r.status === "qualified").length;
  const converted = rows.filter((r) => r.status === "converted").length;
  const stats = [
    { label: "Total leads", value: rows.length },
    { label: "Hot (score ≥70)", value: hot },
    { label: "New", value: newLeads },
    { label: "Qualified", value: qualified },
    { label: "Converted", value: converted },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function LeadsPage() {
  return (
    <CrudWorkspace<SalesLead>
      title="Leads"
      tagline="Never miss a hot lead"
      description="Every lead from every channel — scored, prioritised and ready to work."
      icon={UserPlus}
      queryKey="sales-leads"
      fetch={salesLeads.list}
      create={salesLeads.create}
      update={salesLeads.update}
      remove={salesLeads.remove}
      singular="lead"
      Stats={Stats}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "company", label: "Company" },
        { key: "source", label: "Source", type: "select", options: SOURCES },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "new" },
        { key: "score", label: "Score (0–100)", type: "number", defaultValue: 0 },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "name",
          label: "Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "company", label: "Company" },
        {
          key: "email",
          label: "Contact",
          render: (r) => (
            <div className="text-xs">
              {r.email && <div>{r.email}</div>}
              {r.phone && <div className="text-muted-foreground">{r.phone}</div>}
            </div>
          ),
        },
        { key: "source", label: "Source" },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {r.status}
            </span>
          ),
        },
        {
          key: "score",
          label: "Score",
          render: (r) => (
            <span
              className={
                r.score >= 70
                  ? "text-success font-semibold"
                  : r.score >= 40
                    ? "text-primary"
                    : "text-muted-foreground"
              }
            >
              {r.score}
            </span>
          ),
        },
        { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["name", "email", "company", "source", "status"]}
      emptyHint="Add your first lead to start building pipeline."
    />
  );
}
