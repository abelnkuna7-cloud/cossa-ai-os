import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, ArrowUpRight, Brain, CalendarDays, CheckCircle2, DollarSign,
  Gauge, Globe, Handshake, LineChart, MessageCircle, Rocket, Sparkles, TrendingUp,
  Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Command Center — Cossa AI" }] }),
});

const kpis = [
  { label: "Revenue (MTD)", value: "R 482,300", delta: "+12.4%", icon: DollarSign, tone: "text-success" },
  { label: "New Leads", value: "184", delta: "+8.1%", icon: Users, tone: "text-info" },
  { label: "Pipeline Value", value: "R 3.42M", delta: "+5.6%", icon: TrendingUp, tone: "text-primary" },
  { label: "Conversion Rate", value: "24.8%", delta: "+2.1%", icon: Gauge, tone: "text-chart-5" },
];

const healthCategories = [
  { name: "Marketing", score: 78 },
  { name: "Sales", score: 84 },
  { name: "Customer Service", score: 71 },
  { name: "Operations", score: 66 },
  { name: "Finance", score: 89 },
  { name: "Online Presence", score: 74 },
  { name: "Automation", score: 58 },
];

const briefing = [
  { icon: Users, text: "9 new leads captured overnight — 3 rated hot by AI." },
  { icon: MessageCircle, text: "4 overdue follow-ups on deals worth R 214,000." },
  { icon: TrendingUp, text: "Google Ads CPA down 18% week-over-week — consider scaling budget." },
  { icon: Activity, text: "Website conversion dipped 4% — AI suggests A/B testing the hero." },
];

const recommendations = [
  { title: "Increase Google Ads budget", detail: "Search campaigns at 87% impression share and profitable CPA.", impact: "High" },
  { title: "Follow up 5 overdue leads", detail: "Estimated pipeline recovery: R 214,000.", impact: "High" },
  { title: "Request Google reviews", detail: "12 recent 5★ customers haven't been asked yet.", impact: "Medium" },
  { title: "Publish today's social post", detail: "AI has 3 on-brand variants ready to review.", impact: "Medium" },
];

const activity = [
  { who: "Sipho", what: "closed deal", target: "Acme Construction — R 84,000", when: "12 min ago" },
  { who: "AI", what: "qualified lead", target: "Riverside Retail (Hot)", when: "34 min ago" },
  { who: "Naledi", what: "sent quote", target: "Kruger Logistics — R 42,500", when: "1 hr ago" },
  { who: "AI", what: "drafted email sequence", target: "Winter Promo", when: "2 hr ago" },
];

const pipeline = [
  { stage: "Prospect", count: 42, value: "R 620k" },
  { stage: "Qualified", count: 28, value: "R 940k" },
  { stage: "Proposal", count: 14, value: "R 1.1M" },
  { stage: "Negotiation", count: 7, value: "R 560k" },
  { stage: "Won", count: 11, value: "R 482k" },
];

const tasks = [
  { title: "Approve June marketing plan", due: "Today", tag: "Marketing" },
  { title: "Call back A. van Wyk", due: "Today", tag: "Sales" },
  { title: "Review NexDocs template updates", due: "Tomorrow", tag: "Ops" },
  { title: "Sign supplier contract — Delta", due: "Fri", tag: "Finance" },
];

const quickActions = [
  { label: "New Lead", icon: Users, to: "/sales/leads" },
  { label: "Create Quote", icon: Handshake, to: "/sales/quotations" },
  { label: "Launch Campaign", icon: Rocket, to: "/marketing/campaigns" },
  { label: "Ask Cossa AI", icon: Brain, to: "/ai/cossa" },
  { label: "Schedule Meeting", icon: CalendarDays, to: "/operations/calendar" },
  { label: "New Automation", icon: Zap, to: "/ai/automation" },
];

function scoreTone(v: number) {
  if (v >= 80) return "text-success";
  if (v >= 65) return "text-primary";
  if (v >= 50) return "text-warning";
  return "text-destructive";
}

function Dashboard() {
  const overallScore = Math.round(healthCategories.reduce((a, c) => a + c.score, 0) / healthCategories.length);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Hero */}
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Live" />
              <span className="text-xs text-muted-foreground">Monday, demo data</span>
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Good morning. <span className="text-gradient-gold">Here's your business today.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Cossa AI has scanned every channel overnight and prepared your briefing, priorities and recommended next actions.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-right gold-glow">
              <div className="text-[10px] uppercase tracking-widest text-primary/90">Growth Score</div>
              <div className="text-3xl font-semibold text-gradient-gold font-display">{overallScore}</div>
            </div>
            <Link to="/ai/cossa">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                <Brain className="mr-2 h-4 w-4" /> Ask Cossa AI
              </Button>
            </Link>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold font-display">{k.value}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />{k.delta} vs last period
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Business Health */}
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Business Health</h2>
              <p className="text-xs text-muted-foreground">Composite score across seven core functions</p>
            </div>
            <Link to="/business-health" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {healthCategories.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className={`font-semibold ${scoreTone(c.score)}`}>{c.score}</span>
                </div>
                <Progress value={c.score} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </section>

        {/* AI Briefing */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Today's AI Briefing</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {briefing.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <b.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-foreground/90">{b.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recommendations + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recommended Actions</h2>
            <Link to="/ai-recommendations" className="text-xs text-primary hover:underline">See all</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommendations.map((r) => (
              <div key={r.title} className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{r.title}</div>
                  <span className={`text-[10px] uppercase tracking-widest ${r.impact === "High" ? "text-primary" : "text-muted-foreground"}`}>{r.impact}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-primary hover:bg-primary/10">
                  Take action <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <a.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Pipeline + Website + Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Sales Pipeline</h2>
            <Link to="/sales/pipeline" className="text-xs text-primary hover:underline">Open pipeline</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {pipeline.map((p) => (
              <div key={p.stage} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.stage}</div>
                <div className="mt-1 font-display text-xl font-semibold">{p.count}</div>
                <div className="text-xs text-primary">{p.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Website Traffic</h2>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="font-display text-2xl font-semibold">18,240</div>
              <div className="text-xs text-muted-foreground">Visitors this week</div>
            </div>
            <span className="text-xs text-success inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />+9.2%</span>
          </div>
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {[30, 42, 38, 55, 48, 62, 71].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold">Tasks</h2>
          <ul className="mt-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.title} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{t.title}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.tag}</span>
                <span className="text-xs text-primary">{t.due}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Calendar</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3"><span className="w-14 shrink-0 text-xs text-primary">09:00</span><span>Sales stand-up</span></li>
            <li className="flex items-start gap-3"><span className="w-14 shrink-0 text-xs text-primary">11:30</span><span>Demo — Riverside Retail</span></li>
            <li className="flex items-start gap-3"><span className="w-14 shrink-0 text-xs text-primary">14:00</span><span>Marketing review</span></li>
            <li className="flex items-start gap-3"><span className="w-14 shrink-0 text-xs text-primary">16:30</span><span>1:1 with Naledi</span></li>
          </ul>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                  {a.who[0]}
                </span>
                <div className="min-w-0">
                  <div className="truncate"><span className="font-medium">{a.who}</span> {a.what} <span className="text-muted-foreground">{a.target}</span></div>
                  <div className="text-xs text-muted-foreground">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
