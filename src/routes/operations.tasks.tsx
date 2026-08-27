import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { opsTasks, type OpsTask } from "@/lib/business-data";

export const Route = createFileRoute("/operations/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "Tasks — Cossa AI" },
      { name: "description", content: "Get things done with a clear task list." },
      { property: "og:title", content: "Tasks — Cossa AI" },
      { property: "og:description", content: "Cossa AI tasks." },
    ],
  }),
});

const STATUSES = ["todo", "in-progress", "blocked", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function Stats({ rows }: { rows: OpsTask[] }) {
  const now = Date.now();
  const open = rows.filter((r) => r.status !== "done");
  const overdue = open.filter((r) => r.due_at && new Date(r.due_at).getTime() < now).length;
  const done = rows.filter((r) => r.status === "done").length;
  const stats = [
    { label: "Total", value: rows.length },
    { label: "Open", value: open.length },
    { label: "Overdue", value: overdue },
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

function TasksPage() {
  return (
    <CrudWorkspace<OpsTask>
      title="Tasks"
      tagline="Get it done"
      icon={ListChecks}
      queryKey="ops-tasks"
      fetch={opsTasks.list}
      create={opsTasks.create}
      update={opsTasks.update}
      remove={opsTasks.remove}
      singular="task"
      Stats={Stats}
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "todo" },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          options: PRIORITIES,
          defaultValue: "medium",
        },
        { key: "assignee", label: "Assignee" },
        { key: "due_at", label: "Due", type: "datetime" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "title",
          label: "Task",
          render: (r) => <span className="font-medium">{r.title}</span>,
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
        { key: "priority", label: "Priority" },
        { key: "assignee", label: "Assignee" },
        {
          key: "due_at",
          label: "Due",
          render: (r) => {
            const overdue =
              r.status !== "done" && r.due_at && new Date(r.due_at).getTime() < Date.now();
            return (
              <span className={overdue ? "text-destructive font-semibold" : ""}>
                {fmtDateTime(r.due_at)}
              </span>
            );
          },
        },
      ]}
      searchKeys={["title", "assignee", "status", "notes"]}
    />
  );
}
