import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, ArrowRight, ArrowUpRight, Brain, CalendarDays, CheckCircle2, DollarSign,
  Gauge, Handshake, LineChart, Rocket, Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { dashboardStats, opsTasks, salesAppointments } from "@/lib/business-data";
import { fmtCurrency, fmtDateTime } from "@/components/crud-workspace";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Command Center — Cossa AI" }] }),
});

// Health is deliberately empty until it is calculated from verified source
// data. A polished invented score is worse than an honest pending state.
const healthCategories: { name: string; score: number }[] = [];

const quickActions = [
  { label: "New Lead", icon: Users, to: "/sales/leads" as const },
  { label: "Create Quote", icon: Handshake, to: "/sales/quotations" as const },
  { label: "Launch Campaign", icon: Rocket, to: "/marketing/campaigns" as const },
  { label: "Ask Cossa AI", icon: Brain, to: "/ai/cossa" as const },
  { label: "Schedule Meeting", icon: CalendarDays, to: "/sales/appointments" as const },
  { label: "New Automation", icon: Zap, to: "/ai/automation" as const },
];

function scoreTone(v: number) {
  if (v >= 80) return "text-success";
  if (v >= 65) return "text-primary";
  if (v >= 50) return "text-warning";
  return "text-destructive";
}

function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: dashboardStats });
  const tasks = useQuery({ queryKey: ["ops-tasks"], queryFn: opsTasks.list });
  const appts = useQuery({ queryKey: ["sales-appointments"], queryFn: salesAppointments.list });

  const kpis = [
    { label: "Revenue", value: fmtCurrency(stats?.revenueMTD ?? 0), icon: DollarSign, tone: "text-success" },
    { label: "New Leads (7d)", value: String(stats?.newLeads ?? 0), icon: Users, tone: "text-info" },
    { label: "Pipeline Value", value: fmtCurrency(stats?.pipelineValue ?? 0), icon: TrendingUp, tone: "text-primary" },
    { label: "Active Projects", value: String(stats?.activeProjects ?? 0), icon: Gauge, tone: "text-chart-5" },
  ];

  const openTasks = (tasks.data ?? []).filter((t) => t.status !== "done").slice(0, 5);
  const upcoming = (appts.data ?? []).filter((a) => new Date(a.starts_at).getTime() >= Date.now()).slice(0, 5);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Live" />
              <span className="text-xs text-muted-foreground">Command Center</span>
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Welcome back. <span className="text-gradient-gold">Here's your business today.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              CRM, projects, quotes and appointments are connected to the Cossa AI workspace. AI health analysis starts only after verified knowledge is loaded.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-right gold-glow">
              <div className="text-[10px] uppercase tracking-widest text-primary/90">Business Health</div>
              <div className="text-sm font-semibold text-gradient-gold font-display">Awaiting verified inputs</div>
            </div>
            <Link to="/ai/cossa">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                <Brain className="mr-2 h-4 w-4" /> Ask Cossa AI
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold font-display">{k.value}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3" />live from database
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
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
          {healthCategories.length === 0 ? (
            <p className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No health score has been calculated yet. Cossa AI will calculate one only from verified CRM, financial, operational and marketing evidence.
            </p>
          ) : (
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
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.label} to={a.to}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <a.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Sales Pipeline</h2>
            <Link to="/sales/pipeline" className="text-xs text-primary hover:underline">Open pipeline</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {(stats?.pipelineByStage ?? []).map((p) => (
              <Link key={p.stage} to="/sales/pipeline" className="rounded-xl border border-border/60 bg-card/40 p-3 hover:border-primary/40 transition-colors">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.stage}</div>
                <div className="mt-1 font-display text-xl font-semibold">{p.count}</div>
                <div className="text-xs text-primary">{fmtCurrency(p.value)}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">At a glance</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Customers</span><span className="font-semibold">{stats?.customers ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Open tasks</span><span className="font-semibold">{stats?.openTasks ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Overdue tasks</span><span className={`font-semibold ${(stats?.overdueTasks ?? 0) > 0 ? "text-destructive" : ""}`}>{stats?.overdueTasks ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Open quotes</span><span className="font-semibold">{stats?.quotesOpen ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Total leads</span><span className="font-semibold">{stats?.totalLeads ?? 0}</span></li>
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Tasks</h2>
            <Link to="/operations/tasks" className="text-xs text-primary hover:underline">All tasks</Link>
          </div>
          {openTasks.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">No open tasks. <Link to="/operations/tasks" className="text-primary hover:underline">Add one</Link>.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {openTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.priority}</span>
                  <span className="text-xs text-primary">{t.due_at ? fmtDateTime(t.due_at) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Upcoming</h2>
            </div>
            <Link to="/operations/calendar" className="text-xs text-primary hover:underline">Calendar</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">Nothing on the calendar. <Link to="/sales/appointments" className="text-primary hover:underline">Book something</Link>.</div>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="w-32 shrink-0 text-xs text-primary">{fmtDateTime(a.starts_at)}</span>
                  <span>{a.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass-card p-6">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Get started</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Add real data to your workspace so every widget above lights up.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/sales/leads"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Add a lead</Button></Link>
          <Link to="/sales/opportunities"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Add an opportunity</Button></Link>
          <Link to="/operations/projects"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Start a project</Button></Link>
          <Link to="/ai/cossa"><Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"><Brain className="mr-1.5 h-4 w-4" /> Ask Cossa AI</Button></Link>
        </div>
      </section>
    </div>
  );
}
