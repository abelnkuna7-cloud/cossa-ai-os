import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { salesAppointments, opsTasks } from "@/lib/business-data";
import { fmtDateTime } from "@/components/crud-workspace";

export const Route = createFileRoute("/operations/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendar — Cossa AI" },
      { name: "description", content: "Every appointment and task deadline in one timeline." },
      { property: "og:title", content: "Calendar — Cossa AI" },
      { property: "og:description", content: "Cossa AI calendar." },
    ],
  }),
});

function CalendarPage() {
  const appts = useQuery({ queryKey: ["sales-appointments"], queryFn: salesAppointments.list });
  const tasks = useQuery({ queryKey: ["ops-tasks"], queryFn: opsTasks.list });

  const items = [
    ...(appts.data ?? []).map((a) => ({
      id: a.id,
      kind: "Appointment",
      title: a.title,
      at: a.starts_at,
      meta: a.location ?? "",
    })),
    ...(tasks.data ?? [])
      .filter((t) => t.due_at)
      .map((t) => ({
        id: t.id,
        kind: "Task",
        title: t.title,
        at: t.due_at!,
        meta: t.assignee ?? "",
      })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Calendar className="h-5 w-5" />
            </div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            Appointments and task deadlines, ordered by time.
          </p>
        </div>
      </section>

      <section className="glass-card p-4 md:p-6">
        {items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nothing scheduled yet. Add an appointment or task to see it here.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.kind + it.id}
                className="flex items-start gap-4 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <div className="w-40 shrink-0 text-xs text-primary">{fmtDateTime(it.at)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{it.title}</div>
                  {it.meta && <div className="text-xs text-muted-foreground">{it.meta}</div>}
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                  {it.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
