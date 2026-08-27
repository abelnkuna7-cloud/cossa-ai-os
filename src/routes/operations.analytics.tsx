import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PieChart } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { opsProjects, opsTasks } from "@/lib/business-data";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/operations/analytics")({
  component: OpsAnalyticsPage,
  head: () => ({
    meta: [
      { title: "Operations Analytics — Cossa AI" },
      {
        name: "description",
        content: "Delivery, throughput and overdue insight across every project.",
      },
      { property: "og:title", content: "Operations Analytics — Cossa AI" },
      { property: "og:description", content: "Cossa AI operations analytics." },
    ],
  }),
});

function OpsAnalyticsPage() {
  const projects = useQuery({ queryKey: ["ops-projects"], queryFn: opsProjects.list });
  const tasks = useQuery({ queryKey: ["ops-tasks"], queryFn: opsTasks.list });

  const pRows = projects.data ?? [];
  const tRows = tasks.data ?? [];
  const active = pRows.filter((p) => !["done", "archived"].includes(p.status));
  const avgProgress = active.length
    ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length)
    : 0;
  const doneTasks = tRows.filter((t) => t.status === "done").length;
  const openTasks = tRows.filter((t) => t.status !== "done").length;
  const overdue = tRows.filter(
    (t) => t.status !== "done" && t.due_at && new Date(t.due_at).getTime() < Date.now(),
  ).length;
  const throughput = tRows.length ? Math.round((doneTasks / tRows.length) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <PieChart className="h-5 w-5" />
            </div>
            <StatusBadge status="Live" />
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
            Operations Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">Delivery, throughput and risk — live.</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active projects", value: active.length },
          { label: "Avg progress", value: `${avgProgress}%` },
          { label: "Open tasks", value: openTasks },
          { label: "Overdue tasks", value: overdue },
          { label: "Completed tasks", value: doneTasks },
          { label: "Task throughput", value: `${throughput}%` },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold">Active projects</h2>
        {active.length === 0 ? (
          <div className="mt-3 text-sm text-muted-foreground">No active projects.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {active.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-primary">{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
