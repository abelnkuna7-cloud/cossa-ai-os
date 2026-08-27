import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  Clock,
  CalendarDays,
  FileText,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Check,
  X,
  AlarmClock,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import {
  salesFollowUps,
  salesAppointments,
  salesLeads,
  salesQuotations,
  opsTasks,
} from "@/lib/business-data";
import {
  listNotificationInteractions,
  recordNotificationInteraction,
  type NotificationAction,
  type NotificationInteraction,
} from "@/lib/notification-interactions";

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
  entityType: string;
  entityId: string;
  affectedBusiness: string;
  evidence: string;
  why: string;
  recommendedAction: string;
  when: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { data: tasks = [] } = useQuery({ queryKey: ["ops-tasks"], queryFn: opsTasks.list });
  const { data: followUps = [] } = useQuery({
    queryKey: ["sales-follow-ups"],
    queryFn: salesFollowUps.list,
  });
  const { data: appointments = [] } = useQuery({
    queryKey: ["sales-appointments"],
    queryFn: salesAppointments.list,
  });
  const { data: leads = [] } = useQuery({ queryKey: ["sales-leads"], queryFn: salesLeads.list });
  const { data: quotes = [] } = useQuery({
    queryKey: ["sales-quotations"],
    queryFn: salesQuotations.list,
  });
  const interactions = useQuery({
    queryKey: ["notifications", "interactions"],
    queryFn: listNotificationInteractions,
    retry: false,
  });
  const actionMutation = useMutation({
    mutationFn: recordNotificationInteraction,
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: ["notifications", "interactions"] });
      toast.success(`Notification ${variables.action}`);
    },
    onError: (error) =>
      toast.error("Notification action failed", {
        description: error instanceof Error ? error.message : "The audit record was not saved.",
      }),
    onSettled: () => setBusyKey(null),
  });

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
      entityType: "ops_task",
      entityId: t.id,
      affectedBusiness: "Cossa Nexus Holdings",
      evidence: "Operations task due_at and status fields",
      why: overdue
        ? "The task passed its recorded due time without being marked done."
        : "The task is due within 24 hours.",
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
      entityType: "sales_follow_up",
      entityId: f.id,
      affectedBusiness: "Cossa Nexus Holdings",
      evidence: "Sales follow-up due_at and status fields",
      why: overdue
        ? "The recorded follow-up time has passed and the follow-up is still open."
        : "The follow-up is due within 24 hours.",
      recommendedAction:
        "Open follow-up, review the customer context and complete or reschedule it.",
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
      entityType: "sales_appointment",
      entityId: a.id,
      affectedBusiness: "Cossa Nexus Holdings",
      evidence: "Appointment starts_at record",
      why: "The appointment starts within the next 48 hours.",
      recommendedAction:
        "Open appointment and confirm preparation, customer context and required documents.",
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
          entityType: "sales_quotation",
          entityId: q.id,
          affectedBusiness: "Cossa Nexus Holdings",
          evidence: "Quotation valid_until and status fields",
          why: "The quotation remains draft or sent after its recorded validity date.",
          recommendedAction:
            "Open quotation, verify customer status and decide whether to follow up, revise validity or close it.",
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
          entityType: "sales_quotation",
          entityId: q.id,
          affectedBusiness: "Cossa Nexus Holdings",
          evidence: "Quotation valid_until field",
          why: "The quotation will reach its recorded validity date within three days.",
          recommendedAction:
            "Open quotation and review whether a customer follow-up is required before expiry.",
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
      entityType: "sales_lead",
      entityId: l.id,
      affectedBusiness: "Cossa Nexus Holdings",
      evidence: "CRM lead created_at, score, source and status fields",
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

  const latestAction = new Map<string, NotificationInteraction>();
  for (const interaction of interactions.data ?? []) {
    if (!latestAction.has(interaction.notification_key))
      latestAction.set(interaction.notification_key, interaction);
  }

  const visibleItems = items.filter((item) => {
    const action = latestAction.get(item.id);
    if (!action) return true;
    if (action.action === "resolved" || action.action === "dismissed") return false;
    if (
      action.action === "snoozed" &&
      action.snoozed_until &&
      Date.parse(action.snoozed_until) > now
    )
      return false;
    return true;
  });

  const counts = {
    urgent: visibleItems.filter((i) => i.priority === "urgent").length,
    high: visibleItems.filter((i) => i.priority === "high").length,
    normal: visibleItems.filter((i) => i.priority === "normal").length,
  };

  function recordAction(item: Item, action: NotificationAction) {
    if (busyKey) return;
    setBusyKey(item.id);
    actionMutation.mutate({
      notificationKey: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      action,
      reason:
        action === "escalated"
          ? "Escalated for owner attention from the Notifications workspace."
          : null,
      snoozedUntil:
        action === "snoozed" ? new Date(Date.now() + 24 * 3600_000).toISOString() : null,
      metadata: { href: item.href, type: item.type, affected_business: item.affectedBusiness },
    });
  }

  async function openRecord(item: Item) {
    if (busyKey) return;
    if (interactions.isError) {
      window.location.assign(item.href);
      return;
    }

    setBusyKey(item.id);
    try {
      await recordNotificationInteraction({
        notificationKey: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        action: "opened",
        reason: null,
        snoozedUntil: null,
        metadata: { href: item.href, type: item.type, affected_business: item.affectedBusiness },
      });
      window.location.assign(item.href);
    } catch (error) {
      toast.error("Notification open was not audited", {
        description: error instanceof Error ? error.message : "The audit record was not saved.",
      });
      setBusyKey(null);
    }
  }

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
          Operational alerts generated from current Cossa records. Open the affected record before
          taking action.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Stat label="Urgent" value={counts.urgent} tone="urgent" />
          <Stat label="High" value={counts.high} tone="high" />
          <Stat label="Normal" value={counts.normal} tone="normal" />
        </div>
      </section>

      <section className="glass-card p-6">
        {interactions.isError ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            Notification actions require the prepared database migration. Alerts remain readable,
            but actions will not be presented as saved.
          </div>
        ) : null}
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div className="font-display text-lg font-semibold">All clear</div>
            <p className="max-w-md text-sm text-muted-foreground">
              No current records meet the notification rules for overdue work, upcoming
              appointments, quotation expiry or recent leads.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {visibleItems.map((n) => {
              const Icon = n.icon;
              const tone =
                n.priority === "urgent"
                  ? "text-destructive"
                  : n.priority === "high"
                    ? "text-primary"
                    : "text-muted-foreground";
              return (
                <li key={n.id}>
                  <div
                    className="cursor-pointer rounded-lg px-2 py-4 -mx-2 transition hover:bg-card/40"
                    role="link"
                    tabIndex={0}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a")) return;
                      void openRecord(n);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openRecord(n);
                      }
                    }}
                  >
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
                          <span>
                            <strong className="text-foreground">Affected record:</strong>{" "}
                            {n.affectedRecord}
                          </span>
                          <span>
                            <strong className="text-foreground">Business:</strong>{" "}
                            {n.affectedBusiness}
                          </span>
                          <span>
                            <strong className="text-foreground">Raised:</strong> {fmt(n.when)} ·{" "}
                            {relative(n.when)}
                          </span>
                          <span className="md:col-span-2">
                            <strong className="text-foreground">Why:</strong> {n.why}
                          </span>
                          <span className="md:col-span-2">
                            <strong className="text-foreground">Next action:</strong>{" "}
                            {n.recommendedAction}
                          </span>
                          <span className="md:col-span-2">
                            <strong className="text-foreground">Evidence/source:</strong>{" "}
                            {n.evidence}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            disabled={busyKey === n.id}
                            onClick={() => void openRecord(n)}
                            className="inline-flex items-center rounded-md border border-primary/40 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-primary"
                          >
                            Open record <ArrowRight className="ml-1 h-3 w-3" />
                          </button>
                          {!interactions.isError ? (
                            <>
                              <button
                                disabled={busyKey === n.id}
                                onClick={() => recordAction(n, "resolved")}
                                className="inline-flex items-center rounded-md border border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-widest"
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Resolve
                              </button>
                              <button
                                disabled={busyKey === n.id}
                                onClick={() => recordAction(n, "snoozed")}
                                className="inline-flex items-center rounded-md border border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-widest"
                              >
                                <AlarmClock className="mr-1 h-3 w-3" />
                                Snooze 24h
                              </button>
                              <button
                                disabled={busyKey === n.id}
                                onClick={() => recordAction(n, "escalated")}
                                className="inline-flex items-center rounded-md border border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-widest"
                              >
                                <ShieldAlert className="mr-1 h-3 w-3" />
                                Escalate
                              </button>
                              <button
                                disabled={busyKey === n.id}
                                onClick={() => recordAction(n, "dismissed")}
                                className="inline-flex items-center rounded-md border border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Dismiss
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "urgent" | "high" | "normal";
}) {
  const cls =
    tone === "urgent"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : tone === "high"
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/60 bg-card/40 text-muted-foreground";
  return (
    <div className={`rounded-xl border px-4 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
