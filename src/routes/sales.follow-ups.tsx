import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { salesFollowUps, type SalesFollowUp } from "@/lib/business-data";

export const Route = createFileRoute("/sales/follow-ups")({
  component: FollowUpsPage,
  head: () => ({
    meta: [
      { title: "Follow-ups — Cossa AI" },
      { name: "description", content: "Every follow-up, on time." },
      { property: "og:title", content: "Follow-ups — Cossa AI" },
      { property: "og:description", content: "Cossa AI follow-ups." },
    ],
  }),
});

const STATUSES = ["pending", "in-progress", "done", "skipped"];

function Stats({ rows }: { rows: SalesFollowUp[] }) {
  const now = Date.now();
  const pending = rows.filter((r) => r.status !== "done" && r.status !== "skipped");
  const overdue = pending.filter((r) => new Date(r.due_at).getTime() < now);
  const dueSoon = pending.filter((r) => {
    const d = new Date(r.due_at).getTime();
    return d >= now && d - now < 24 * 60 * 60 * 1000;
  });
  const stats = [
    { label: "Total", value: rows.length },
    { label: "Pending", value: pending.length },
    { label: "Overdue", value: overdue.length },
    { label: "Due in 24h", value: dueSoon.length },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function FollowUpsPage() {
  return (
    <CrudWorkspace<SalesFollowUp>
      title="Follow-up Center"
      tagline="Every follow-up, on time"
      icon={Bell}
      queryKey="sales-follow-ups"
      fetch={salesFollowUps.list}
      create={salesFollowUps.create}
      update={salesFollowUps.update}
      remove={salesFollowUps.remove}
      singular="follow-up"
      Stats={Stats}
      fields={[
        { key: "subject", label: "Subject", required: true },
        { key: "due_at", label: "Due", type: "datetime", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          defaultValue: "pending",
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "subject",
          label: "Subject",
          render: (r) => <span className="font-medium">{r.subject}</span>,
        },
        {
          key: "due_at",
          label: "Due",
          render: (r) => {
            const overdue = r.status !== "done" && new Date(r.due_at).getTime() < Date.now();
            return (
              <span className={overdue ? "text-destructive font-semibold" : ""}>
                {fmtDateTime(r.due_at)}
              </span>
            );
          },
        },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {r.status}
            </span>
          ),
        },
      ]}
      searchKeys={["subject", "status", "notes"]}
    />
  );
}
