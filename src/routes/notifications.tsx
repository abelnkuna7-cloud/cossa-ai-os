import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, Clock, CalendarDays, FileText, UserPlus, CheckCircle2, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  salesFollowUps, salesAppointments, salesLeads, salesQuotations, opsTasks,
} from "@/lib/business-data";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — Cossa AI" },
      { name: "description", content: "AI-curated notifications ranked by business impact." },
      { property: "og:title", content: "Notifications — Cossa AI" },
      { property: "og:description", content: "Everything important, nothing noisy." },
    ],
  }),
});

type Priority = "urgent" | "high" | "normal";
interface Item {
  id: string;
  priority: Priority;
  icon: typeof Bell;
  type: string;
  title: string;
  description: string;
  href: string;
  affectedRecord: string;
  why: string;
  recommendedAction: string;
  when: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function relative(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  if (min < 60) return diff < 0 ? `${min}m ago` : `in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return diff < 0 ? `${hr}h ago` : `in ${hr}h`;
  const d = Math.round(hr / 24);
  return diff < 0 ? `${d}d ago` : `in ${d}d`;
}

function NotificationsPage() {
  const { data: tasks = [] } = useQuery({ queryKey: ["ops-tasks"], queryFn: opsTasks.list });
  const { data: followUps = [] } = useQuery({ queryKey: ["sales-follow-ups"], queryFn: salesFollowUps.list });
  const { data: appointments = [] } = useQuery({ queryKey: ["sales-appointments"], queryFn: salesAppointments.list });
  const { data: leads = [] } = useQuery({ queryKey: ["sales-leads"], queryFn: salesLeads.list });
  const { data: quotes = [] } = useQuery({ queryKey: ["sales-quotations"], queryFn: salesQuotations.list });

  const now = Date.now();
  const items: Item[] = [];

  for (const t of tasks) {
    if (t.status === "done" || !t.due_at) continue;
    const when = new Date(t.due_at).getTime();
    const overdue = when < now;
    const dueSoon = !overdue && when - now < 24 * 3600_000;
    if (!overdue && !dueSoon) continue;
    items.push({
      id: `task-${t.id}`,
      priority: overdue ? "urgent" : "high",
      icon: overdue ? AlertTriangle : Clock,
      type: overdue ? "overdue_task" : "task_due_soon",
      title: overdue ? `Overdue task: ${t.title}` : `Task due soon: ${t.title}`,
      description: `Due ${fmt(t.due_at)} · ${t.status}`,
      href: "/operations/tasks",
      affectedRecord: t.id,
      why: overdue ? "The task passed its recorded due time without being marked done." : "The task is due within 24 hours.",
      recommendedAction: "Open task and update the owner, due date or completion state.",
      when: t.due_at,
    });
  }

  for (const f of followUps) {
    if (f.status === "done" || f.status === "skipped") continue;
    const when = new Date(f.due_at).getTime();
    const overdue = when < now;
    const dueSoon = !overdue && when - now < 24 * 3600_000;
    if (!overdue && !dueSoon) continue;
    items.push({
      id: `fu-${f.id}`,
      priority: overdue ? "urgent" : "high",
      icon: Bell,
      type: overdue ? "overdue_follow_up" : "follow_up_due",
      title: overdue ? `Overdue follow-up: ${f.subject}` : `Follow-up due: ${f.subject}`,
      description: `Scheduled ${fmt(f.due_at)}`,
      href: "/sales/follow-ups",
      affectedRecord: f.id,
      why: overdue ? "The recorded follow-up time has passed and the follow-up is still open." : "The follow-up is due within 24 hours.",
      recommendedAction: "Open follow-up, review the customer context and complete or reschedule it.",
      when: f.due_at,
    });
  }

  for (const a of appointments) {
    const when = new Date(a.starts_at).getTime();
    if (when < now || when - now > 48 * 3600_000) continue;
    items.push({
      id: `appt-${a.id}`,
      priority: when - now < 4 * 3600_000 ? "high" : "normal",
      icon: CalendarDays,
      type: "upcoming_appointment",
      title: `Upcoming: ${a.title}`,
      description: `${fmt(a.starts_at)}${a.location ? ` · ${a.location}` : ""}`,
      href: "/sales/appointments",
      affectedRecord: a.id,
      why: "The appointment starts within the next 48 hours.",
      recommendedAction: "Open appointment and confirm preparation, customer context and required documents.",
      when: a.starts_at,
    });
  }

  for (const q of quotes) {
    if (!["draft", "sent"].includes(q.status)) continue;
    if (q.valid_until) {
      const when = new Date(q.valid_until).getTime();
      if (when < now) {
        items.push({
          id: `quote-exp-${q.id}`,
          priority: "high",
          icon: FileText,
          type: "quotation_expired",
          title: `Quote expired: ${q.number}`,
          description: `Expired ${fmt(q.valid_until)} · ${q.status}`,
          href: `/sales/quotations?record=${encodeURIComponent(q.id)}`,
          affectedRecord: `${q.number} · ${q.id}`,
          why: "The quotation remains draft or sent after its recorded validity date.",
          recommendedAction: "Open quotation, verify customer status and decide whether to follow up, revise validity or close it.",
          when: q.valid_until,
        });
        continue;
      }
      if (when - now < 3 * 24 * 3600_000) {
        items.push({
          id: `quote-exp-soon-${q.id}`,
          priority: "normal",
          icon: FileText,
          type: "quotation_expiring",
          title: `Quote expiring: ${q.number}`,
          description: `Valid until ${fmt(q.valid_until)}`,
          href: `/sales/quotations?record=${encodeURIComponent(q.id)}`,
          affectedRecord: `${q.number} · ${q.id}`,
          why: "The quotation will reach its recorded validity date within three days.",
          recommendedAction: "Open quotation and review whether a customer follow-up is required before expiry.",
          when: q.valid_until,
        });
      }
    }
  }

  for (const l of leads) {
    if (l.status !== "new" && l.status !== "prospect") continue;
    const created = new Date(l.created_at).getTime();
    if (now - created > 48 * 3600_000) continue;
    items.push({
      id: `lead-${l.id}`,
      priority: l.score >= 70 ? "high" : "normal",
      icon: UserPlus,
      type: "new_lead",
      title: `New lead: ${l.name}`,
      description: `Score ${l.score} · ${l.source ?? "unknown source"}`,
      href: "/sales/leads",
      affectedRecord: l.id,
      why: "The lead was created within the last 48 hours and is still new or prospect status.",
      recommendedAction: "Open lead, verify evidence and assign the next legitimate sales action.",
      when: l.created_at,
    });
  }

  items.sort((a, b) => {
    const rank = { urgent: 0, high: 1, normal: 2 } as const;
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return Math.abs(new Date(a.when).getTime() - now) - Math.abs(new Date(b.when).getTime() - now);
  });

  const counts = {
    urgent: items.filter((i) => i.priority === "urgent").length,
    high: items.filter((i) => i.priority === "high").length,
    normal: items.filter((i) => i.priority === "normal").length,
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <Bell className="h-5 w-5" />
          </div>
          <StatusBadge status="Live" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Notifications</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Operational alerts generated from current Cossa records. Open the affected record before taking action.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Stat label="Urgent" value={counts.urgent} tone="urgent" />
          <Stat label="High" value={counts.high} tone="high" />
          <Stat label="Normal" value={counts.normal} tone="normal" />
        </div>
      </section>

      <section className="glass-card p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div className="font-display text-lg font-semibold">All clear</div>
            <p className="max-w-md text-sm text-muted-foreground">
              No current records meet the notification rules for overdue work, upcoming appointments, quotation expiry or recent leads.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {items.map((n) => {
              const Icon = n.icon;
              const tone =
                n.priority === "urgent" ? "text-destructive" :
                n.priority === "high" ? "text-primary" : "text-muted-foreground";
              return (
                <li key={n.id}>
                  <a href={n.href} className="block rounded-lg px-2 py-4 -mx-2 transition hover:bg-card/40">
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-medium">{n.title}</div>
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {n.type.replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{n.description}</div>
                        <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground md:grid-cols-2">
                          <span><strong className="text-foreground">Affected record:</strong> {n.affectedRecord}</span>
                          <span><strong className="text-foreground">Raised:</strong> {fmt(n.when)} · {relative(n.when)}</span>
                          <span className="md:col-span-2"><strong className="text-foreground">Why:</strong> {n.why}</span>
                          <span className="md:col-span-2"><strong className="text-foreground">Next action:</strong> {n.recommendedAction}</span>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 pt-1 text-[10px] uppercase tracking-widest text-primary">
                        Open record <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "urgent" | "high" | "normal" }) {
  const cls =
    tone === "urgent" ? "border-destructive/40 bg-destructive/10 text-destructive" :
    tone === "high" ? "border-primary/40 bg-primary/10 text-primary" :
    "border-border/60 bg-card/40 text-muted-foreground";
  return (
    <div className={`rounded-xl border px-4 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}