import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, ClipboardList, Send, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { buildAgentWorkspaceModel } from "@/lib/agent-workspace-model";
import {
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
} from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/employee/$employeeId")({
  component: AgentWorkspacePage,
  head: () => ({
    meta: [
      { title: "Agent Workspace — Cossa AI" },
      { name: "description", content: "Recorded missions, runs, handoffs, approvals and results for one Cossa AI employee." },
    ],
  }),
});

function fmt(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-ZA");
}

function outputText(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const content = (output as { content?: unknown }).content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

function AgentWorkspacePage() {
  const { employeeId } = Route.useParams();
  const employeesQuery = useQuery({ queryKey: ["agent-workspace", employeeId, "employees"], queryFn: listEmployees, retry: false, staleTime: 30_000 });
  const missionsQuery = useQuery({ queryKey: ["agent-workspace", employeeId, "missions"], queryFn: listMissions, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const runsQuery = useQuery({ queryKey: ["agent-workspace", employeeId, "runs"], queryFn: listWorkforceRuns, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const handoffsQuery = useQuery({ queryKey: ["agent-workspace", employeeId, "handoffs"], queryFn: listEmployeeHandoffs, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const approvalsQuery = useQuery({ queryKey: ["agent-workspace", employeeId, "approvals"], queryFn: listPendingApprovals, retry: false, staleTime: 15_000, refetchInterval: 30_000 });

  const employee = (employeesQuery.data ?? []).find((item) => item.id === employeeId) ?? null;
  const model = useMemo(
    () =>
      buildAgentWorkspaceModel({
        employeeId,
        missions: missionsQuery.data ?? [],
        runs: runsQuery.data ?? [],
        handoffs: handoffsQuery.data ?? [],
        approvals: approvalsQuery.data ?? [],
      }),
    [employeeId, missionsQuery.data, runsQuery.data, handoffsQuery.data, approvalsQuery.data],
  );

  const loading = employeesQuery.isLoading || missionsQuery.isLoading || runsQuery.isLoading || handoffsQuery.isLoading || approvalsQuery.isLoading;
  const unavailable = employeesQuery.isError || missionsQuery.isError || runsQuery.isError || handoffsQuery.isError || approvalsQuery.isError;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="glass-card p-6 md:p-8">
        <a href="/ai/workforce" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to workforce
        </a>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : employee ? "Live" : "Unavailable"} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">{employee?.name ?? "Agent workspace"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{employee ? `${employee.title} · ${employee.department ?? "Department not recorded"}` : `Employee ${employeeId}`}</p>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              One employee's evidence-backed workspace. Missions, runs, handoffs, approvals and recorded results are shown from workforce records only. External actions remain owner-controlled.
            </p>
          </div>
          {employee ? (
            <Button asChild>
              <Link to="/ai/employee/$employeeId/command" params={{ employeeId }}>
                <Send className="mr-2 h-4 w-4" /> Give task
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {unavailable ? (
        <section className="glass-card border-destructive/40 p-4" role="alert">
          <div className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />One or more workforce sources are unavailable. Missing information is not being inferred.</div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Active missions" value={model.counts.activeMissions} />
        <Metric label="Running" value={model.counts.running} />
        <Metric label="Failures" value={model.counts.failed} warning={model.counts.failed > 0} />
        <Metric label="Approvals" value={model.counts.pendingApprovals} warning={model.counts.pendingApprovals > 0} />
        <Metric label="Incoming" value={model.counts.incomingHandoffs} />
        <Metric label="Outgoing" value={model.counts.outgoingHandoffs} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Missions</h2></div>
          <div className="mt-4 space-y-2">
            {model.missions.length === 0 ? <Empty text="No mission is recorded for this employee." /> : model.missions.map((mission) => (
              <article key={mission.id} className="rounded-lg border border-border/60 bg-card/30 p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{mission.title}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{mission.status}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{mission.objective}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">Created {fmt(mission.created_at)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card p-5">
          <div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Handoffs</h2></div>
          <div className="mt-4 space-y-2">
            {model.handoffs.length === 0 ? <Empty text="No incoming or outgoing handoff is recorded." /> : model.handoffs.map((handoff) => (
              <article key={handoff.id} className="rounded-lg border border-border/60 bg-card/30 p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{handoff.from_employee_id === employeeId ? "Outgoing" : "Incoming"}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{handoff.status}</span></div>
                <p className="mt-1 text-sm">{handoff.reason}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">Recorded {fmt(handoff.created_at)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card p-5">
        <h2 className="font-display text-lg font-semibold">Recorded runs & results</h2>
        <div className="mt-4 space-y-3">
          {model.runs.length === 0 ? <Empty text="No workforce run is recorded for this employee." /> : model.runs.map((run) => {
            const content = outputText(run.output);
            return (
              <article key={run.id} className="rounded-lg border border-border/60 bg-card/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={run.status === "failed" ? "text-[10px] uppercase tracking-widest text-destructive" : run.status === "completed" ? "text-[10px] uppercase tracking-widest text-success" : "text-[10px] uppercase tracking-widest text-primary"}>{run.status}</span>
                  {run.model_provider ? <span className="text-[10px] text-muted-foreground">{run.model_provider}{run.model_name ? ` · ${run.model_name}` : ""}</span> : null}
                  <span className="text-[10px] text-muted-foreground">{fmt(run.completed_at ?? run.started_at ?? run.created_at)}</span>
                </div>
                {run.error_message ? <p className="mt-2 text-xs text-destructive">{run.error_message}</p> : null}
                {content ? <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90">{content}</pre> : <p className="mt-2 text-xs text-muted-foreground">No recorded result content.</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="font-display text-lg font-semibold">Pending approvals</h2>
        <div className="mt-4 space-y-2">
          {model.approvals.filter((approval) => approval.status === "pending").length === 0 ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />No pending approval is recorded for this employee's current work.</div> : model.approvals.filter((approval) => approval.status === "pending").map((approval) => (
            <article key={approval.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-warning">{approval.risk_level} · pending</p>
              <p className="mt-1 text-sm font-medium">{approval.action_type}</p>
              <p className="mt-1 text-xs text-muted-foreground">{approval.justification}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="glass-card p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className={`mt-1 font-display text-2xl font-semibold ${warning ? "text-warning" : ""}`}>{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">{text}</p>;
}
