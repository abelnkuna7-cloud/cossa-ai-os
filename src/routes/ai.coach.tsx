import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Target,
  Flame, Sun, Coffee, Trophy, ArrowRight, MessageCircle, Star, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai/coach")({
  component: AiCoach,
  head: () => ({
    meta: [
      { title: "AI Business Coach — Cossa AI" },
      { name: "description", content: "A permanent AI coach that reviews your business every day and tells you exactly what to focus on next." },
      { property: "og:title", content: "AI Business Coach — Cossa AI" },
    ],
  }),
});

const dailyInsights = [
  { tone: "warning", icon: AlertTriangle, title: "Your hottest lead has not been followed up", detail: "Sipho from Kruger Logistics opened your proposal 4 times in 24 hours. No follow-up sent.", action: "Draft follow-up" },
  { tone: "info", icon: TrendingDown, title: "Website traffic up 22%, conversions down 8%", detail: "You're getting more visitors but converting fewer. Likely a landing page issue.", action: "Review landing pages" },
  { tone: "success", icon: Star, title: "5 customers served today — request their reviews", detail: "Google reviews compound. A daily review cadence beats a monthly push.", action: "Send review requests" },
  { tone: "primary", icon: DollarSign, title: "R250,000 in quotations waiting on response", detail: "8 quotes are older than 5 days without follow-up. Every day cuts win-rate by ~2%.", action: "Chase quotes" },
  { tone: "success", icon: TrendingUp, title: "Facebook is outperforming Google Ads this week", detail: "R/lead is 34% lower on Meta. Consider shifting budget for the next 14 days.", action: "Rebalance budget" },
];

const weeklyFocus = [
  { icon: Target, title: "Focus: Referrals", detail: "You've never systematically asked customers for referrals. This week's play is a 3-step referral flow." },
];

const streaks = [
  { icon: Flame, label: "Daily briefing", value: "17 days" },
  { icon: Sun, label: "Morning review", value: "9 days" },
  { icon: Coffee, label: "Follow-up habit", value: "4 days" },
];

const toneMap: Record<string, string> = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
  primary: "border-primary/40 bg-primary/10 text-primary",
};

function AiCoach() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <GraduationCap className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              AI Business <span className="text-gradient-gold">Coach</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Not just an assistant — a proactive coach that reviews your business every day and tells you exactly where to focus next.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
            <Sparkles className="mr-1.5 h-4 w-4" /> Coach me now
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Today's coaching</h2>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Updated 12 min ago</span>
          </div>

          <ul className="space-y-3">
            {dailyInsights.map((d) => (
              <li key={d.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", toneMap[d.tone])}>
                    <d.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{d.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                    {d.action} <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">This week's focus</div>
            {weeklyFocus.map((f) => (
              <div key={f.title} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <f.icon className="h-4 w-4" />
                  <div className="text-sm font-semibold">{f.title}</div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                <Button size="sm" className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                  Start the play
                </Button>
              </div>
            ))}
          </div>

          <div className="glass-card p-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your streaks</div>
            <ul className="space-y-2">
              {streaks.map((s) => (
                <li key={s.label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-xs">{s.label}</span>
                  <span className="text-xs font-semibold">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Trophy className="h-4 w-4" />
              <div className="text-sm font-semibold">Coaching wins this month</div>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>• 12 dormant customers re-engaged (R89,400 recovered)</li>
              <li>• +18 Google reviews from review flow</li>
              <li>• Quote response time cut from 5.2 → 1.8 days</li>
              <li>• Ad spend rebalanced, saved R14,200</li>
            </ul>
          </div>

          <div className="glass-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">Ask your coach</div>
            </div>
            <p className="text-xs text-muted-foreground">"What should I do first tomorrow morning to grow revenue this month?"</p>
            <Button size="sm" variant="outline" className="mt-3 w-full border-primary/40 text-primary hover:bg-primary/10">
              Open chat with coach
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
