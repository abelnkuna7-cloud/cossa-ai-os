import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";

import { buildAgentActivityFeed } from "@/lib/agent-activity";
import {
  listEmployees,
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
} from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/activity")({
  component: AgentActivityPage,
  head: () => ({
    meta: [
      { title: "Agent Activity — Cossa GROWTH" },
      {
        name: "description",
        content:
          "Read-only evidence-backed activity stream for Cossa AI workforce runs and pending approvals.",
      },
    ],
  }),
});

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded time unavailable";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function stateClass(state: string): string {
  if (state === "completed") return "border-success/40 bg-success/10 text-success";
  if (state === "failed" || state === "cancelled")
    return "border-destructive/40 bg-destructive/10 text-destructive";
  if (state === "pending_approval" || state === "awaiting_approval")
    return "border-warning/40 bg-warning/10 text-warning";
  if (state === "running") return "border-primary/40 bg-primary/10 text-primary";
  return "border-border/70 bg-muted/40 text-muted-foreground";
}

function AgentActivityPage() {
  const employeesQuery = useQuery({ queryKey: ["agent-activity", "employees"], queryFn: listEmployees, retry: false });
  const missionsQuery = useQuery({ queryKey: ["agent-activity", "missions"], queryFn: listMissions, retry: false });
  const runsQuery = useQuery({ queryKey: ["agent-activity", "runs"], queryFn: listWorkforceRuns, retry: false, refetchInterval: 30_000 });
  const approvalsQuery = useQuery({ queryKey: ["agent-activity", "approvals"], queryFn: listPendingApprovals, retry: false, refetchInterval: 30_000 });

  const hasError = employeesQuery.isError || missionsQuery.isError || runsQuery.isError || approvalsQuery.isError;
  const isLoading = employeesQuery.isLoading || missionsQuery.isLoading || runsQuery.isLoading || approvalsQuery.isLoading;
  const employees = new Map((employeesQuery.data ?? []).map((employee) => [employee.id, employee]));
  const missions = new Map((missionsQuery.data ?? []).map((mission) => [mission.id, mission]));
  const feed = buildAgentActivityFeed({ runs: runsQuery.data ?? [], approvals: approvalsQuery.data ?? [] });

  const running = feed.filter((item) => item.state === "running").length;
  const approval = feed.filter((item) => item.state === "pending_approval").length;
  const failed = feed.filter((item) => item.state === "failed").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Cossa AI workforce truth</p>
              <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">Agent Activity</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Read-only activity from recorded workforce runs and current pending approvals. It does not infer work from configuration and does not execute actions.
              </p>
            </div>
          </div>
          <Link
            to="/mission-control/live"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border/70 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Open Live Mission Control
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Bot} label="Running now" value={running} />
        <Stat icon={ShieldAlert} label="Pending approvals" value={approval} />
        <Stat icon={AlertTriangle} label="Recorded failures" value={failed} />
      </section>

      {hasError ? (
        <section role="alert" className="glass-card border-destructive/40 p-5">
          <h2 className="font-semibold">Agent activity is unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No activity is being invented. Existing workforce records remain unchanged; check authenticated organisation access and refresh.
          </p>
        </section>
      ) : null}

      <section className="glass-card p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Recorded activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Newest recorded workforce facts first.</p>
          </div>
          <span className="text-xs text-muted-foreground">Read only · refreshes every 30 seconds</span>
        </div>

        {isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading recorded workforce activity…</p>
        ) : feed.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border/60 p-5">
            <p className="font-medium">No recorded activity is available.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This does not mean every agent is healthy or working; it only means no matching run or pending approval record is available to this workspace.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {feed.map((item) => {
              const employee = item.employeeId ? employees.get(item.employeeId) : null;
              const mission = item.missionId ? missions.get(item.missionId) : null;
              const Icon = item.state === "completed" ? CheckCircle2 : item.state === "pending_approval" ? ShieldAlert : Clock3;

              return (
                <article key={item.id} className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass(item.state)}`}>
                      {item.state.replaceAll("_", " ")}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="uppercase tracking-widest text-muted-foreground">Agent</dt>
                      <dd className="mt-1 font-medium">{employee?.name ?? item.employeeId ?? "No employee recorded"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-widest text-muted-foreground">Mission</dt>
                      <dd className="mt-1 font-medium">{mission?.title ?? item.missionId ?? "No mission recorded"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-widest text-muted-foreground">Provider</dt>
                      <dd className="mt-1 font-medium">{item.provider ? `${item.provider}${item.model ? ` · ${item.model}` : ""}` : "Not applicable"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-widest text-muted-foreground">Recorded</dt>
                      <dd className="mt-1 font-medium">{formatTime(item.occurredAt)}</dd>
                    </div>
                  </dl>

                  {item.riskLevel ? (
                    <p className="mt-3 text-xs text-warning">Recorded approval risk: {item.riskLevel}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
