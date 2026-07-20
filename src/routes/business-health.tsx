import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity, Megaphone, Handshake, Cog, DollarSign, Headphones, Zap, Globe,
  CheckCircle2, AlertTriangle, Sparkles, ArrowRight, TrendingUp,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business-health")({
  component: BusinessHealth,
  head: () => ({
    meta: [
      { title: "Business Health — Cossa AI" },
      { name: "description", content: "AI-graded health score across every core function of your business — with strengths, weaknesses and improvement roadmaps." },
    ],
  }),
});

type Priority = "High" | "Medium" | "Low";
interface Category {
  key: string;
  name: string;
  icon: typeof Activity;
  score: number;
  priority: Priority;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: { title: string; detail: string; impact: Priority }[];
  roadmap: string[];
}

const categories: Category[] = [
  {
    key: "marketing", name: "Marketing", icon: Megaphone, score: 78, priority: "Medium",
    summary: "Strong organic presence and creative output. Paid social under-invested vs. category.",
    strengths: ["High organic traffic growth", "Consistent content calendar", "Solid brand recognition"],
    weaknesses: ["Under-invested in paid social", "Weak email nurture flows", "No attribution model"],
    recommendations: [
      { title: "Increase Meta Ads budget by 30%", detail: "Category benchmark shows 2.3× ROAS opportunity.", impact: "High" },
      { title: "Launch 3-step welcome email series", detail: "Est. +14% lead-to-customer conversion.", impact: "High" },
      { title: "Adopt GA4 + UTMs for attribution", detail: "Unlock channel-level ROAS reporting.", impact: "Medium" },
    ],
    roadmap: ["Instrument attribution model", "Scale winning ad creatives", "Automate nurture across email + WhatsApp"],
  },
  {
    key: "sales", name: "Sales", icon: Handshake, score: 84, priority: "Low",
    summary: "Pipeline healthy and forecast accurate. Reps under-utilise follow-up automation.",
    strengths: ["Healthy pipeline coverage (3.2×)", "Accurate forecast (±6%)", "Fast response times"],
    weaknesses: ["Follow-ups still manual", "Deal notes inconsistent", "No structured coaching"],
    recommendations: [
      { title: "Enable AI follow-up drafts", detail: "Save reps ~8 hrs/week.", impact: "High" },
      { title: "Weekly deal review cadence", detail: "Improve win-rate on stalled deals.", impact: "Medium" },
    ],
    roadmap: ["Deploy AI Sales Assistant", "Introduce Sales Coaching agent", "Automate quote-to-cash"],
  },
  {
    key: "operations", name: "Operations", icon: Cog, score: 66, priority: "High",
    summary: "Delivery is inconsistent. Project visibility low, blockers surface late.",
    strengths: ["Skilled delivery team", "Good tooling foundation"],
    weaknesses: ["Fragmented project visibility", "Manual status reporting", "Ad-hoc task allocation"],
    recommendations: [
      { title: "Adopt unified project workspace", detail: "Cut status meetings by 50%.", impact: "High" },
      { title: "Standardise weekly ops review", detail: "AI-generated status packs.", impact: "High" },
    ],
    roadmap: ["Roll out Projects module", "Enable AI Operations Manager", "Automate reporting"],
  },
  {
    key: "finance", name: "Finance", icon: DollarSign, score: 89, priority: "Low",
    summary: "Cashflow is healthy and margins improving. Some overdue receivables to recover.",
    strengths: ["Positive cashflow", "Improving gross margin", "Tight expense control"],
    weaknesses: ["R214k in overdue invoices", "Manual reconciliation"],
    recommendations: [
      { title: "Automate overdue invoice reminders", detail: "Recover ~R160k in 30 days.", impact: "High" },
      { title: "Connect banking + accounting", detail: "Real-time cashflow view.", impact: "Medium" },
    ],
    roadmap: ["Deploy AI Finance Assistant", "Integrate Xero / Sage", "Cashflow forecasting"],
  },
  {
    key: "cs", name: "Customer Service", icon: Headphones, score: 71, priority: "Medium",
    summary: "Response times solid but knowledge base gaps drive repeat questions.",
    strengths: ["Fast first-response", "High CSAT on live chat"],
    weaknesses: ["Sparse self-service KB", "No proactive outreach", "Ticket routing manual"],
    recommendations: [
      { title: "Publish top-20 KB articles", detail: "Deflect ~35% of tickets.", impact: "High" },
      { title: "Enable AI Customer Support", detail: "24/7 first-line automation.", impact: "High" },
    ],
    roadmap: ["Knowledge base v1", "AI support agent", "CSAT prediction"],
  },
  {
    key: "automation", name: "Automation", icon: Zap, score: 58, priority: "High",
    summary: "Repetitive work still done manually. Big opportunity across ops and sales.",
    strengths: ["Team open to change"],
    weaknesses: ["No workflow engine", "Manual data entry", "No AI in loop"],
    recommendations: [
      { title: "Automate lead → CRM → follow-up", detail: "Est. 12 hrs/week saved.", impact: "High" },
      { title: "Automate invoice + reminders", detail: "Faster cash-in.", impact: "High" },
      { title: "Automate weekly reporting", detail: "Auto board pack.", impact: "Medium" },
    ],
    roadmap: ["Ship Workflow Builder", "Deploy AI Automation agent", "Marketplace of recipes"],
  },
  {
    key: "online", name: "Online Presence", icon: Globe, score: 74, priority: "Medium",
    summary: "Website solid; Google Business Profile stale, few recent reviews.",
    strengths: ["Site core web vitals green", "Consistent branding"],
    weaknesses: ["Google Business Profile outdated", "Only 3 new reviews in 90 days", "Weak schema markup"],
    recommendations: [
      { title: "Refresh Google Business Profile", detail: "Photos, hours, services, offers.", impact: "High" },
      { title: "Auto-request reviews post-purchase", detail: "Target 20 reviews / month.", impact: "High" },
    ],
    roadmap: ["Local SEO plan", "Review automation", "AI reputation monitor"],
  },
];

const priorityTone: Record<Priority, string> = {
  High: "text-destructive border-destructive/30 bg-destructive/10",
  Medium: "text-warning border-warning/30 bg-warning/10",
  Low: "text-success border-success/30 bg-success/10",
};

function scoreTone(v: number) {
  if (v >= 80) return "text-success";
  if (v >= 65) return "text-primary";
  if (v >= 50) return "text-warning";
  return "text-destructive";
}

function BusinessHealth() {
  const [active, setActive] = useState(categories[0].key);
  const current = categories.find((c) => c.key === active)!;
  const overall = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Hero */}
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Activity className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Business Health <span className="text-gradient-gold">360° Score</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Cossa AI grades every core function of your business — click any category for strengths, weaknesses, AI recommendations and an improvement roadmap.
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-6 py-4 text-center gold-glow">
            <div className="text-[10px] uppercase tracking-widest text-primary/90">Overall</div>
            <div className="text-4xl font-semibold text-gradient-gold font-display">{overall}</div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => {
          const isActive = c.key === active;
          return (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={cn(
                "glass-card p-4 text-left transition-all",
                isActive ? "border-primary/60 gold-glow" : "hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", priorityTone[c.priority])}>
                  {c.priority}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={cn("font-display text-2xl font-semibold", scoreTone(c.score))}>{c.score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
              <Progress value={c.score} className="mt-2 h-1.5" />
            </button>
          );
        })}
      </section>

      {/* Detail panel */}
      <section className="glass-card p-6 md:p-8">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <current.icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">{current.name}</h2>
            <p className="text-sm text-muted-foreground">{current.summary}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={cn("rounded-full border px-3 py-1 text-xs", priorityTone[current.priority])}>
              Priority: {current.priority}
            </span>
            <div className={cn("font-display text-3xl font-semibold", scoreTone(current.score))}>{current.score}</div>
          </div>
        </header>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-success/30 bg-success/5 p-5">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="font-semibold">Strengths</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {current.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-semibold">Weaknesses</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {current.weaknesses.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">AI Recommendations</h3>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {current.recommendations.map((r) => (
              <div key={r.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{r.title}</div>
                  <span className={cn("text-[10px] uppercase tracking-widest", r.impact === "High" ? "text-primary" : "text-muted-foreground")}>
                    {r.impact}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-primary hover:bg-primary/10">
                  Take action <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Improvement Roadmap</h3>
          </div>
          <ol className="relative mt-4 flex flex-col gap-4 pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/15 to-transparent" aria-hidden />
            {current.roadmap.map((r, i) => (
              <li key={r} className="relative">
                <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-background">
                  <span className="text-[9px] font-semibold text-primary">{i + 1}</span>
                </div>
                <div className="text-sm font-medium">{r}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
