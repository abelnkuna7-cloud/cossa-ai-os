import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Rocket, TrendingUp, DollarSign, Star, Megaphone, Bot, Search, Trophy,
  HardHat, Sparkles, ShoppingBag, ArrowRight, CheckCircle2, Circle, Play,
  Users, MessageCircle, Mail, FileText, CalendarDays, BarChart3, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mission-control")({
  component: MissionControl,
  head: () => ({
    meta: [
      { title: "Mission Control — Cossa AI" },
      { name: "description", content: "Pick a business goal and Cossa AI generates a full execution plan across every module." },
      { property: "og:title", content: "Mission Control — Cossa AI" },
      { property: "og:description", content: "One guided journey instead of ten scattered tools." },
    ],
  }),
});

const missions = [
  { id: "leads", emoji: "🚀", title: "Get More Leads", desc: "Fill the pipeline with qualified opportunities." },
  { id: "sales", emoji: "💰", title: "Increase Sales", desc: "Close more of the pipeline you already have." },
  { id: "revenue", emoji: "📈", title: "Grow Revenue", desc: "Upsell, cross-sell and expand accounts." },
  { id: "reviews", emoji: "⭐", title: "Improve Google Reviews", desc: "Systematic reputation growth." },
  { id: "campaign", emoji: "📢", title: "Launch a Marketing Campaign", desc: "End-to-end multi-channel launch." },
  { id: "automate", emoji: "🤖", title: "Automate My Business", desc: "Give the boring work to the AI." },
  { id: "seo", emoji: "🌐", title: "Improve My SEO", desc: "Compound organic traffic every month." },
  { id: "tenders", emoji: "💼", title: "Win More Tenders", desc: "Find, qualify and respond faster." },
  { id: "construction", emoji: "🏗", title: "Manage Construction Projects", desc: "Sites, subcontractors and margins." },
  { id: "cleaning", emoji: "🧹", title: "Grow My Cleaning Business", desc: "Route work, retain contracts, upsell." },
  { id: "retail", emoji: "🏪", title: "Grow My Retail Store", desc: "Footfall, loyalty and average basket." },
];

type Step = { icon: typeof Rocket; label: string; module: string };
const PLANS: Record<string, Step[]> = {
  sales: [
    { icon: BarChart3, label: "Review current pipeline", module: "Sales / Pipeline" },
    { icon: Users, label: "Identify inactive leads", module: "Opportunity Radar" },
    { icon: Bot, label: "AI recommends follow-ups", module: "AI Sales Assistant" },
    { icon: MessageCircle, label: "Generate WhatsApp campaign", module: "Marketing / WhatsApp" },
    { icon: Mail, label: "Launch email campaign", module: "Marketing / Email" },
    { icon: FileText, label: "Generate quotations", module: "Sales / Quotations" },
    { icon: CalendarDays, label: "Schedule appointments", module: "Sales / Appointments" },
    { icon: BarChart3, label: "Track results", module: "Business Intelligence" },
  ],
  leads: [
    { icon: Users, label: "Define your ideal customer profile", module: "Sales / Lead Finder" },
    { icon: Search, label: "AI finds matching companies", module: "Sales / Lead Finder" },
    { icon: Bot, label: "Enrich & score every lead", module: "AI CRM Specialist" },
    { icon: Mail, label: "Launch cold outreach", module: "Marketing / Email" },
    { icon: MessageCircle, label: "WhatsApp follow-ups", module: "Marketing / WhatsApp" },
    { icon: BarChart3, label: "Measure & optimise", module: "Sales / Analytics" },
  ],
  reviews: [
    { icon: Users, label: "Import recent customers", module: "Sales / Customers" },
    { icon: MessageCircle, label: "Send WhatsApp review requests", module: "Marketing / WhatsApp" },
    { icon: Mail, label: "Follow up over email", module: "Marketing / Email" },
    { icon: Bot, label: "AI drafts responses to reviews", module: "Brand Monitoring" },
    { icon: BarChart3, label: "Track review growth", module: "Business Intelligence" },
  ],
};

const DEFAULT_PLAN: Step[] = [
  { icon: Bot, label: "Cossa AI analyses your business context", module: "AI Memory" },
  { icon: Sparkles, label: "Generate a tailored execution plan", module: "AI Recommendations" },
  { icon: Zap, label: "Trigger the right modules in order", module: "Automation Center" },
  { icon: BarChart3, label: "Report on the outcome", module: "Business Intelligence" },
];

function MissionControl() {
  const [active, setActive] = useState<string | null>("sales");
  const plan = active ? (PLANS[active] ?? DEFAULT_PLAN) : [];
  const activeMission = missions.find((m) => m.id === active);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      {/* Hero */}
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Rocket className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Mission <span className="text-gradient-gold">Control</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Don't decide which module to open first. Pick a business goal — Cossa AI generates the full execution plan across marketing, sales, operations and AI.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
            <Play className="mr-1.5 h-4 w-4" /> Start a new mission
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Mission gallery */}
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Choose your mission</h2>
              <p className="text-xs text-muted-foreground">One outcome. One guided journey. Every module orchestrated.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {missions.map((m) => {
              const isActive = m.id === active;
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    isActive
                      ? "border-primary/60 bg-primary/10 shadow-[0_0_25px_-5px_var(--gold)]"
                      : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <div className="text-2xl leading-none">{m.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{m.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <ArrowRight className={cn("mt-0.5 h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Live execution plan */}
        <aside className="glass-card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Execution Plan</div>
              <h3 className="font-display text-base font-semibold">
                {activeMission ? `${activeMission.emoji} ${activeMission.title}` : "Pick a mission"}
              </h3>
            </div>
            <StatusBadge status="Planning" />
          </div>

          <ol className="relative space-y-3 pl-0">
            {plan.map((step, i) => {
              const done = i === 0;
              const current = i === 1;
              return (
                <li key={i} className="relative flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border",
                      done ? "border-success/50 bg-success/15 text-success"
                        : current ? "border-primary/60 bg-primary/15 text-primary gold-glow"
                        : "border-border/60 bg-card/40 text-muted-foreground",
                    )}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : current ? <step.icon className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </div>
                    {i < plan.length - 1 && <div className="mt-1 h-6 w-px bg-border/60" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="text-sm font-medium">{step.label}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{step.module}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">AI Orchestration</span>
            </div>
            <p className="mt-1">Cossa AI will trigger each module in order, hand results between agents, and report the outcome — with your approval at every critical step.</p>
          </div>

          <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow" disabled>
            <Rocket className="mr-1.5 h-4 w-4" /> Launch mission (coming soon)
          </Button>
        </aside>
      </div>

      {/* Featured missions */}
      <section className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Featured missions this quarter</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: DollarSign, title: "Recover R500k in dormant revenue", desc: "Cossa scans your CRM and re-engages inactive customers." },
            { icon: Star, title: "Get to 100 Google reviews", desc: "Automated review request flow via WhatsApp + email." },
            { icon: TrendingUp, title: "Double organic traffic in 90 days", desc: "SEO plan, briefs and publishing schedule." },
            { icon: Megaphone, title: "Launch spring campaign", desc: "Cross-channel launch with creatives and reporting." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
