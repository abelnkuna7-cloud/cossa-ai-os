import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Crosshair, TrendingUp, Users, Star, Search, Target, DollarSign, Repeat,
  ArrowRight, Sparkles, AlertCircle, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/opportunity-radar")({
  component: OpportunityRadar,
  head: () => ({
    meta: [
      { title: "Opportunity Radar — Cossa AI" },
      { name: "description", content: "The AI that finds growth for you — dormant customers, upsells, SEO gaps, review opportunities and competitor weaknesses." },
      { property: "og:title", content: "Opportunity Radar — Cossa AI" },
    ],
  }),
});

const filters = [
  { id: "all", label: "All opportunities", count: 34 },
  { id: "revenue", label: "Revenue", count: 12 },
  { id: "customers", label: "Customers", count: 8 },
  { id: "marketing", label: "Marketing", count: 6 },
  { id: "seo", label: "SEO", count: 4 },
  { id: "competitors", label: "Competitors", count: 4 },
];

const opportunities = [
  { cat: "customers", tone: "primary", icon: Users, title: "12 dormant customers to re-engage", detail: "Bought once in the last 18 months, never followed up. Combined LTV: R384,200.", value: "R384k", impact: "High" },
  { cat: "revenue", tone: "success", icon: DollarSign, title: "8 upsell opportunities in your top accounts", detail: "Customers using only 1 of your 3 core services. AI-matched to what they need next.", value: "R210k", impact: "High" },
  { cat: "revenue", tone: "success", icon: Repeat, title: "5 cross-sell moments this month", detail: "Customers who bought Service A typically buy Service B within 60 days.", value: "R98k", impact: "Med" },
  { cat: "customers", tone: "warning", icon: AlertCircle, title: "3 accounts showing churn signals", detail: "Reduced usage + missed payment. Reach out before renewal.", value: "R120k", impact: "High" },
  { cat: "marketing", tone: "info", icon: Star, title: "24 recent customers you can ask for a review", detail: "5-star service, no review requested. Google reviews compound.", value: "+24 reviews", impact: "Med" },
  { cat: "seo", tone: "info", icon: Search, title: "6 high-intent keywords you don't rank for", detail: "Competitors rank in top 5. Content briefs are one click away.", value: "1.2k/mo", impact: "Med" },
  { cat: "competitors", tone: "warning", icon: Target, title: "Competitor lowered price on their entry package", detail: "Kruger Co dropped 12% two days ago. Consider a counter-offer or bundle.", value: "—", impact: "Med" },
  { cat: "marketing", tone: "success", icon: TrendingUp, title: "Instagram Reel outperformed avg by 340%", detail: "Repurpose the format for 5 more Reels this week.", value: "+22% reach", impact: "Low" },
];

const toneMap: Record<string, string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/40 bg-info/10 text-info",
};

function OpportunityRadar() {
  const [active, setActive] = useState("all");
  const shown = active === "all" ? opportunities : opportunities.filter((o) => o.cat === active);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Crosshair className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Opportunity <span className="text-gradient-gold">Radar</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A sales director that never sleeps. Cossa AI continuously scans your CRM, marketing, reviews and operations for growth you'd otherwise miss.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
            <Sparkles className="mr-1.5 h-4 w-4" /> Run a fresh scan
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Untapped revenue detected", value: "R812,400", icon: DollarSign },
          { label: "Live opportunities", value: "34", icon: Crosshair },
          { label: "Actioned this month", value: "18 · R187k", icon: ArrowUpRight },
        ].map((k) => (
          <div key={k.label} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary gold-glow">
                <k.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
                <div className="mt-0.5 font-display text-xl font-semibold">{k.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              active === f.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {f.label}
            <span className="rounded-full bg-background/40 px-1.5 text-[10px]">{f.count}</span>
          </button>
        ))}
      </div>

      <section className="grid gap-3">
        {shown.map((o) => (
          <article key={o.title} className="glass-card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", toneMap[o.tone])}>
              <o.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{o.title}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{o.detail}</p>
            </div>
            <div className="flex items-center gap-4 md:ml-auto">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Value</div>
                <div className="text-sm font-semibold text-primary">{o.value}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Impact</div>
                <div className="text-sm font-semibold">{o.impact}</div>
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                Act on it <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
