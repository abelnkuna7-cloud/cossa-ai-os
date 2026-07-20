import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, ArrowRight, FileText, Megaphone, Globe, Star, UserMinus,
  Facebook, PenTool, Search, TrendingUp, Filter, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-recommendations")({
  component: Recommendations,
  head: () => ({
    meta: [
      { title: "AI Recommendations — Cossa AI" },
      { name: "description", content: "Prioritised, AI-generated next actions across marketing, sales, ops and finance." },
    ],
  }),
});

type Impact = "High" | "Medium" | "Low";
type Area = "Sales" | "Marketing" | "Operations" | "Finance" | "Customer";
interface Rec {
  title: string;
  detail: string;
  reason: string;
  impact: Impact;
  effort: "Quick" | "Medium" | "Deep";
  value: string;
  area: Area;
  icon: typeof Sparkles;
}

const recs: Rec[] = [
  { title: "Recover 8 overdue quotations", detail: "R 214,000 in stalled proposals older than 14 days.", reason: "Deals in Proposal >14 days without touch.", impact: "High", effort: "Quick", value: "R 214,000", area: "Sales", icon: FileText },
  { title: "Launch winter campaign", detail: "Historic winter uplift +32% in your category.", reason: "Seasonal trend + last year's revenue pattern.", impact: "High", effort: "Medium", value: "R 380,000", area: "Marketing", icon: Megaphone },
  { title: "Improve website speed", detail: "LCP is 3.8s — target 2.5s for +14% conversion.", reason: "Core Web Vitals audit failing on mobile.", impact: "High", effort: "Medium", value: "+14% conv.", area: "Operations", icon: Globe },
  { title: "Update Google Business Profile", detail: "Hours, photos and services are stale.", reason: "No update in 90 days · reviews stalled.", impact: "Medium", effort: "Quick", value: "+22% local leads", area: "Marketing", icon: Star },
  { title: "Contact 47 dormant customers", detail: "No engagement in 120+ days · high LTV cohort.", reason: "Churn risk detected on top-25% LTV segment.", impact: "High", effort: "Quick", value: "R 96,000", area: "Customer", icon: UserMinus },
  { title: "Increase Facebook Ads budget", detail: "ROAS 4.1× — well above 2.5× threshold.", reason: "Performance sustained for 14 consecutive days.", impact: "Medium", effort: "Quick", value: "+R 82k/mo", area: "Marketing", icon: Facebook },
  { title: "Publish new blog: local SEO", detail: "Ranking gap vs. 3 top competitors.", reason: "3 competitors ranking on 8 target keywords.", impact: "Medium", effort: "Medium", value: "+1,200 visits/mo", area: "Marketing", icon: PenTool },
  { title: "Improve SEO on service pages", detail: "Add schema + internal links to 12 pages.", reason: "Semantic audit found 12 fixable issues.", impact: "Medium", effort: "Medium", value: "+18% organic", area: "Marketing", icon: Search },
  { title: "Automate invoice reminders", detail: "3-step cadence for overdue invoices.", reason: "R64k in overdue AR · manual follow-up.", impact: "High", effort: "Quick", value: "R 64,000", area: "Finance", icon: TrendingUp },
];

const AREAS: (Area | "All")[] = ["All", "Sales", "Marketing", "Operations", "Finance", "Customer"];
const impactTone: Record<Impact, string> = {
  High: "text-primary border-primary/40 bg-primary/10",
  Medium: "text-warning border-warning/30 bg-warning/10",
  Low: "text-muted-foreground border-border bg-card/40",
};

function Recommendations() {
  const [filter, setFilter] = useState<Area | "All">("All");
  const filtered = filter === "All" ? recs : recs.filter((r) => r.area === filter);
  const total = recs.length;
  const high = recs.filter((r) => r.impact === "High").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Sparkles className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              AI Recommendation <span className="text-gradient-gold">Engine</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Cossa AI continuously scans your business and surfaces the highest-leverage next actions — with reasoning and impact estimates.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:min-w-[380px]">
            <Stat label="Actions" value={String(total)} />
            <Stat label="High impact" value={String(high)} tone="text-primary" />
            <Stat label="Est. value" value="R 1.05M" tone="text-success" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {AREAS.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === a
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Recs grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <article key={r.title} className="glass-card flex flex-col gap-3 p-5">
            <header className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <r.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.area}</div>
                  <h3 className="font-semibold leading-tight">{r.title}</h3>
                </div>
              </div>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", impactTone[r.impact])}>{r.impact}</span>
            </header>
            <p className="text-sm text-muted-foreground">{r.detail}</p>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3 w-3" /> <span className="font-medium">Why the AI recommends this</span>
              </div>
              <p className="mt-1 text-muted-foreground">{r.reason}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.effort}</span>
              <span className="font-semibold text-success">{r.value}</span>
            </div>
            <div className="mt-1 flex gap-2">
              <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                Take action <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="border-border/60 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass-card p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-xl font-semibold", tone)}>{value}</div>
    </div>
  );
}
