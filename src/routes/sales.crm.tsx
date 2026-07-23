import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Building2, GitBranch, FileText, Bell, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { salesLeads, salesCustomers, salesCompanies, salesOpportunities } from "@/lib/business-data";

export const Route = createFileRoute("/sales/crm")({
  component: CrmHub,
  head: () => ({
    meta: [
      { title: "CRM — Cossa AI" },
      { name: "description", content: "One home for every contact, deal and activity." },
      { property: "og:title", content: "CRM — Cossa AI" },
      { property: "og:description", content: "Cossa AI CRM." },
    ],
  }),
});

function CrmHub() {
  const leads = useQuery({ queryKey: ["sales-leads"], queryFn: salesLeads.list });
  const customers = useQuery({ queryKey: ["sales-customers"], queryFn: salesCustomers.list });
  const companies = useQuery({ queryKey: ["sales-companies"], queryFn: salesCompanies.list });
  const opps = useQuery({ queryKey: ["sales-opportunities"], queryFn: salesOpportunities.list });

  const tiles = [
    { title: "Leads", to: "/sales/leads", icon: UserPlus, count: leads.data?.length ?? 0, desc: "Capture and score inbound." },
    { title: "Customers", to: "/sales/customers", icon: Users, count: customers.data?.length ?? 0, desc: "Every relationship in one place." },
    { title: "Companies", to: "/sales/companies", icon: Building2, count: companies.data?.length ?? 0, desc: "Account-based intel." },
    { title: "Pipeline", to: "/sales/pipeline", icon: GitBranch, count: (opps.data ?? []).filter((o) => !["won", "lost"].includes(o.stage)).length, desc: "Move deals forward." },
    { title: "Quotations", to: "/sales/quotations", icon: FileText, count: null, desc: "Draft, send, close." },
    { title: "Follow-ups", to: "/sales/follow-ups", icon: Bell, count: null, desc: "Never miss a touchpoint." },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><Users className="h-5 w-5" /></div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">CRM</h1>
          <p className="mt-1 text-muted-foreground">Everything customer-facing, in one hub.</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="glass-card group flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow"><t.icon className="h-5 w-5" /></div>
              {t.count !== null && (
                <div className="text-right">
                  <div className="font-display text-2xl font-semibold">{t.count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">records</div>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{t.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <div className="mt-auto inline-flex items-center gap-1 text-xs text-primary group-hover:underline">Open <ArrowRight className="h-3 w-3" /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
