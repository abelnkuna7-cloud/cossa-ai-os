import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Link2 } from "lucide-react";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import {
  salesFollowUps,
  salesLeads,
  salesCustomers,
  salesOpportunities,
  type SalesFollowUp,
} from "@/lib/business-data";

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
  const leads = useQuery({ queryKey: ["sales-leads", "follow-up-link-options"], queryFn: salesLeads.list });
  const customers = useQuery({ queryKey: ["sales-customers", "follow-up-link-options"], queryFn: salesCustomers.list });
  const opportunities = useQuery({ queryKey: ["sales-opportunities", "follow-up-link-options"], queryFn: salesOpportunities.list });

  const leadOptions = (leads.data ?? []).map((lead) => ({
    value: lead.id,
    label: [lead.name, lead.company, lead.phone || lead.email].filter(Boolean).join(" · "),
  }));
  const customerOptions = (customers.data ?? []).map((customer) => ({
    value: customer.id,
    label: [customer.name, customer.email || customer.phone].filter(Boolean).join(" · "),
  }));
  const opportunityOptions = (opportunities.data ?? []).map((opportunity) => ({
    value: opportunity.id,
    label: `${opportunity.title} · R${Number(opportunity.value || 0).toLocaleString("en-ZA")}`,
  }));

  return (
    <CrudWorkspace<SalesFollowUp>
      title="Follow-up Center"
      tagline="Every follow-up, on time"
      description="Create the follow-up, then search Growth by customer, lead or opportunity name to link it. No CRM IDs need to be copied or memorised."
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
        { key: "lead_id", label: "Link to lead", type: "lookup", options: leadOptions, placeholder: "Search lead name, company, phone or email…" },
        { key: "customer_id", label: "Link to customer", type: "lookup", options: customerOptions, placeholder: "Search customer name, email or phone…" },
        { key: "opportunity_id", label: "Link to opportunity", type: "lookup", options: opportunityOptions, placeholder: "Search opportunity name…" },
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
            const lead = r.lead_id ? (leads.data ?? []).find((item) => item.id === r.lead_id) : null;
            const opportunity = r.opportunity_id ? (opportunities.data ?? []).find((item) => item.id === r.opportunity_id) : null;
            const customer = r.customer_id ? (customers.data ?? []).find((item) => item.id === r.customer_id) : null;
            const linked = lead ? `Lead · ${lead.name}` : opportunity ? `Opportunity · ${opportunity.title}` : customer ? `Customer · ${customer.name}` : null;
            return linked ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" />{linked}</span> : "—";
          },
        },
      ]}
      searchKeys={["subject", "status", "channel", "notes", "lead_id", "customer_id", "opportunity_id"]}
    />
  );
}
