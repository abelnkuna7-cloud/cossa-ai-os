import { createFileRoute } from "@tanstack/react-router";
import { Bell, Link2 } from "lucide-react";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { salesFollowUps, type SalesFollowUp } from "@/lib/business-data";

export const Route = createFileRoute("/sales/follow-ups")({
  component: FollowUpsPage,
  head: () => ({
    meta: [
      { title: "Follow-ups — Cossa AI" },
      { name: "description", content: "Every follow-up, on time." },
      { property: "og:title", content: "Follow-ups — Cossa AI" },
      { property: "og:description", content: "Cossa AI follow-ups." },
    ],
  }),
});

const STATUSES = ["pending", "in-progress", "done", "skipped"];
const CHANNELS = ["phone", "email", "whatsapp", "sms", "meeting", "other"];

function Stats({ rows }: { rows: SalesFollowUp[] }) {
  const now = Date.now();
  const pending = rows.filter((r) => r.status !== "done" && r.status !== "skipped");
  const overdue = pending.filter((r) => new Date(r.due_at).getTime() < now);
  const dueSoon = pending.filter((r) => {
    const d = new Date(r.due_at).getTime();
    return d >= now && d - now < 24 * 60 * 60 * 1000;
  });
  const stats = [
    { label: "Total", value: rows.length },
    { label: "Pending", value: pending.length },
    { label: "Overdue", value: overdue.length },
    { label: "Due in 24h", value: dueSoon.length },
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

function FollowUpsPage() {
  return (
    <CrudWorkspace<SalesFollowUp>
      title="Follow-up Center"
      tagline="Every follow-up, on time"
      description="Create a follow-up manually or link it to an existing lead, customer or opportunity. Use only one linked-record ID when the follow-up belongs to a specific CRM record."
      icon={Bell}
      queryKey="sales-follow-ups"
      fetch={salesFollowUps.list}
      create={salesFollowUps.create}
      update={salesFollowUps.update}
      remove={salesFollowUps.remove}
      singular="follow-up"
      Stats={Stats}
      fields={[
        { key: "subject", label: "Subject", required: true, placeholder: "e.g. Check Christiaan dash-cam confirmation" },
        { key: "due_at", label: "Due", type: "datetime", required: true },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "pending" },
        { key: "channel", label: "Channel", type: "select", options: CHANNELS },
        { key: "lead_id", label: "Linked lead ID", placeholder: "Optional — paste the lead record ID" },
        { key: "customer_id", label: "Linked customer ID", placeholder: "Optional — paste the customer record ID" },
        { key: "opportunity_id", label: "Linked opportunity ID", placeholder: "Optional — paste the opportunity record ID" },
        { key: "notes", label: "Follow-up note / outcome", type: "textarea", placeholder: "Short action note or outcome. Do not paste the full conversation." },
      ]}
      columns={[
        { key: "subject", label: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        {
          key: "due_at",
          label: "Due",
          render: (r) => {
            const overdue = r.status !== "done" && new Date(r.due_at).getTime() < Date.now();
            return <span className={overdue ? "text-destructive font-semibold" : ""}>{fmtDateTime(r.due_at)}</span>;
          },
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.status}</span>,
        },
        { key: "channel", label: "Channel", render: (r) => r.channel ?? "—" },
        {
          key: "linked_record",
          label: "Linked record",
          render: (r) => {
            const linked = r.lead_id ? `Lead ${r.lead_id.slice(0, 8)}` : r.opportunity_id ? `Opportunity ${r.opportunity_id.slice(0, 8)}` : r.customer_id ? `Customer ${r.customer_id.slice(0, 8)}` : null;
            return linked ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" />{linked}</span> : "—";
          },
        },
      ]}
      searchKeys={["subject", "status", "channel", "notes", "lead_id", "customer_id", "opportunity_id"]}
    />
  );
}
