import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";

import { CrudWorkspace, fmtCurrency, fmtDate } from "@/components/crud-workspace";
import { growthReferrals, type GrowthReferral } from "@/lib/legacy-growth-data";

export const Route = createFileRoute("/marketing/referrals")({
  component: ReferralsPage,
  head: () => ({
    meta: [
      { title: "Referrals — Cossa AI" },
      {
        name: "description",
        content: "Manage Cossa referral partners, referred clients and recorded commissions.",
      },
    ],
  }),
});

const STATUSES = ["pending", "contacted", "converted", "paid", "rejected"];
const SERVICES = ["construction", "facility", "tech", "store", "nexdocs", "growth", "other"];

function ReferralStats({ rows }: { rows: GrowthReferral[] }) {
  const converted = rows.filter((row) => ["converted", "paid"].includes(row.status)).length;
  const recordedCommission = rows.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);
  const paid = rows.filter((row) => row.status === "paid" || row.reward_paid).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Referrals", rows.length],
        ["Converted", converted],
        ["Recorded commission", fmtCurrency(recordedCommission)],
        ["Recorded paid", paid],
      ].map(([label, value]) => (
        <div key={String(label)} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
        </div>
      ))}
    </section>
  );
}

function ReferralsPage() {
  return (
    <CrudWorkspace<GrowthReferral>
      title="Referrals"
      tagline="Turn trusted introductions into tracked revenue opportunities"
      description="Restored referral operations from the original Growth platform. Commission figures are recorded obligations/estimates only and are not treated as cash paid unless the underlying record says so."
      icon={UsersRound}
      queryKey="growth-referrals"
      fetch={growthReferrals.list}
      create={growthReferrals.create}
      update={growthReferrals.update}
      remove={growthReferrals.remove}
      singular="referral"
      fields={[
        { key: "referrer_name", label: "Referrer name", required: true },
        { key: "referrer_phone", label: "Referrer phone" },
        { key: "referrer_email", label: "Referrer email", type: "email" },
        { key: "referee_name", label: "Referred client", required: true },
        { key: "referee_phone", label: "Client phone" },
        { key: "referee_email", label: "Client email", type: "email" },
        { key: "service", label: "Service", type: "select", options: SERVICES },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          defaultValue: "pending",
        },
        { key: "commission_percent", label: "Commission %", type: "number", defaultValue: 10 },
        {
          key: "commission_amount",
          label: "Commission amount (R)",
          type: "number",
          defaultValue: 0,
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "referrer_name",
          label: "Referrer",
          render: (row) => <span className="font-medium">{row.referrer_name}</span>,
        },
        { key: "referee_name", label: "Referred client" },
        { key: "service", label: "Service" },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {row.status}
            </span>
          ),
        },
        {
          key: "commission_percent",
          label: "%",
          render: (row) => `${Number(row.commission_percent || 0)}%`,
        },
        {
          key: "commission_amount",
          label: "Commission",
          render: (row) => fmtCurrency(row.commission_amount),
        },
        { key: "created_at", label: "Added", render: (row) => fmtDate(row.created_at) },
      ]}
      searchKeys={["referrer_name", "referee_name", "service", "status"]}
      Stats={ReferralStats}
    />
  );
}
