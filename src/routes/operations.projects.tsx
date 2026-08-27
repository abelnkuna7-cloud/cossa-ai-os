import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { CrudWorkspace, fmtCurrency, fmtDate } from "@/components/crud-workspace";
import { opsProjects, type OpsProject } from "@/lib/business-data";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/operations/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — Cossa AI" },
      { name: "description", content: "Deliver every project on time and on budget." },
      { property: "og:title", content: "Projects — Cossa AI" },
      { property: "og:description", content: "Cossa AI projects." },
    ],
  }),
});

const STATUSES = ["planning", "in-progress", "on-hold", "done", "archived"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function Stats({ rows }: { rows: OpsProject[] }) {
  const active = rows.filter((r) => !["done", "archived"].includes(r.status));
  const avg = active.length
    ? Math.round(active.reduce((s, r) => s + r.progress, 0) / active.length)
    : 0;
  const done = rows.filter((r) => r.status === "done").length;
  const stats = [
    { label: "Total", value: rows.length },
    { label: "Active", value: active.length },
    { label: "Avg progress", value: `${avg}%` },
    { label: "Completed", value: done },
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

function ProjectsPage() {
  return (
    <CrudWorkspace<OpsProject>
      title="Projects"
      tagline="Deliver every project"
      icon={FolderKanban}
      queryKey="ops-projects"
      fetch={opsProjects.list}
      create={opsProjects.create}
      update={opsProjects.update}
      remove={opsProjects.remove}
      singular="project"
      Stats={Stats}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "service", label: "Service / business division" },
        { key: "customer", label: "Customer" },
        { key: "location", label: "Location" },
        { key: "budget", label: "Budget (R)", type: "number" },
        { key: "description", label: "Description / scope", type: "textarea" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          defaultValue: "planning",
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          options: PRIORITIES,
          defaultValue: "medium",
        },
        { key: "progress", label: "Progress %", type: "number", defaultValue: 0 },
        { key: "start_date", label: "Start", type: "date" },
        { key: "due_date", label: "Due", type: "date" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "name",
          label: "Project",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "service", label: "Service", render: (r) => r.service ?? "—" },
        { key: "customer", label: "Customer", render: (r) => r.customer ?? r.customer_id ?? "—" },
        {
          key: "budget",
          label: "Budget",
          render: (r) => (r.budget === null ? "—" : fmtCurrency(r.budget)),
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
        {
          key: "priority",
          label: "Priority",
          render: (r) => (
            <span
              className={
                r.priority === "urgent"
                  ? "text-destructive"
                  : r.priority === "high"
                    ? "text-warning"
                    : "text-muted-foreground"
              }
            >
              {r.priority}
            </span>
          ),
        },
        {
          key: "progress",
          label: "Progress",
          render: (r) => (
            <div className="min-w-[120px]">
              <div className="flex justify-between text-[10px]">
                <span>{r.progress}%</span>
              </div>
              <Progress value={r.progress} className="mt-1 h-1.5" />
            </div>
          ),
        },
        { key: "due_date", label: "Due", render: (r) => fmtDate(r.due_date) },
      ]}
      searchKeys={[
        "name",
        "service",
        "customer",
        "customer_id",
        "location",
        "description",
        "status",
        "priority",
        "notes",
      ]}
    />
  );
}
