import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3, DollarSign, TrendingUp, Users, Megaphone, FolderKanban,
  UserCheck, LineChart, Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operations/business-intelligence")({
  component: BusinessIntelligence,
  head: () => ({
    meta: [
      { title: "Business Intelligence — Cossa AI" },
      { name: "description", content: "Cross-functional BI dashboards across revenue, sales, marketing, projects, customers, employees and profitability." },
    ],
  }),
});

const kpis = [
  { label: "Revenue (YTD)", value: "R 5.24M", delta: "+18.4%", tone: "text-success", icon: DollarSign },
  { label: "Gross Margin", value: "42.1%", delta: "+2.6pp", tone: "text-primary", icon: TrendingUp },
  { label: "Active Customers", value: "1,284", delta: "+9.1%", tone: "text-info", icon: Users },
  { label: "Employee NPS", value: "48", delta: "+6", tone: "text-chart-5", icon: UserCheck },
];

const revenueBars = [42, 55, 48, 62, 71, 66, 78, 82, 74, 88, 92, 96];
const salesBars = [12, 18, 15, 22, 26, 24, 28, 32, 30, 36, 34, 40];

function Bars({ data, tone = "from-primary/60 to-primary/20" }: { data: number[]; tone?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((v, i) => (
        <div key={i} className={cn("flex-1 rounded-t bg-gradient-to-t", tone)} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

function BusinessIntelligence() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2"><StatusBadge status="Design" /></div>
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
              Business <span className="text-gradient-gold">Intelligence</span>
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Every KPI, one dashboard. Revenue, sales, marketing, projects, customers, employees, growth and profitability.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <k.icon className={cn("h-4 w-4", k.tone)} />
            </div>
            <div className="mt-2 font-display text-2xl font-semibold">{k.value}</div>
            <div className={cn("mt-1 text-xs", k.tone)}>{k.delta} vs last period</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Revenue vs. Sales Volume</h2>
              <p className="text-xs text-muted-foreground">Last 12 months</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-primary">Revenue (R)</span><span className="text-muted-foreground">Trend</span>
              </div>
              <Bars data={revenueBars} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-info">Sales volume</span><span className="text-muted-foreground">Trend</span>
              </div>
              <Bars data={salesBars} tone="from-info/60 to-info/20" />
            </div>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold">Growth Health</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "MRR Growth", value: 82 },
              { label: "Customer Retention", value: 91 },
              { label: "CAC Payback", value: 68 },
              { label: "Net Revenue Retention", value: 108 },
              { label: "Pipeline Coverage", value: 74 },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium tabular-nums text-primary">{r.value}%</span>
                </div>
                <Progress value={Math.min(r.value, 100)} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {[
          { title: "Marketing", icon: Megaphone, stat: "R 4.20", label: "Cost per lead", delta: "-12%" },
          { title: "Sales", icon: LineChart, stat: "R 3.42M", label: "Pipeline", delta: "+5.6%" },
          { title: "Projects", icon: FolderKanban, stat: "42", label: "On-time delivery", delta: "+8%" },
          { title: "Customers", icon: Users, stat: "94%", label: "CSAT", delta: "+3pp" },
          { title: "Employees", icon: UserCheck, stat: "42", label: "Headcount", delta: "+6" },
          { title: "Growth", icon: TrendingUp, stat: "18.4%", label: "YoY revenue", delta: "+2.1pp" },
          { title: "Profitability", icon: DollarSign, stat: "42.1%", label: "Gross margin", delta: "+2.6pp" },
          { title: "Forecast", icon: LineChart, stat: "R 6.9M", label: "Next 12 mo", delta: "+22%" },
        ].map((c) => (
          <article key={c.title} className="glass-card p-5">
            <div className="flex items-center gap-2 text-primary">
              <c.icon className="h-4 w-4" />
              <span className="font-display text-sm font-semibold">{c.title}</span>
            </div>
            <div className="mt-3 font-display text-2xl font-semibold">{c.stat}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-xs text-success">{c.delta}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
