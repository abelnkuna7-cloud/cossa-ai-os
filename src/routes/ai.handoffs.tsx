import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Clock3, Network, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { buildAgentHandoffActivity } from "@/lib/agent-handoff-activity";
import { listEmployeeHandoffs, listEmployees, listMissions } from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/handoffs")({ component: AgentHandoffsPage });

function AgentHandoffsPage() {
  const handoffs = useQuery({ queryKey: ["workforce", "handoffs", "activity"], queryFn: listEmployeeHandoffs, retry: false, refetchInterval: 30_000 });
  const employees = useQuery({ queryKey: ["workforce", "employees", "handoffs"], queryFn: listEmployees, retry: false, refetchInterval: 60_000 });
  const missions = useQuery({ queryKey: ["workforce", "missions", "handoffs"], queryFn: listMissions, retry: false, refetchInterval: 30_000 });
  const unavailable = handoffs.isError || employees.isError || missions.isError;
  const loading = handoffs.isLoading || employees.isLoading || missions.isLoading;
  const items = useMemo(() => buildAgentHandoffActivity({ handoffs: handoffs.data ?? [], employees: employees.data ?? [], missions: missions.data ?? [] }), [handoffs.data, employees.data, missions.data]);
  const stuck = items.filter((item) => item.stuck).length;

  return <div className="mx-auto flex max-w-7xl flex-col gap-6">
    <section className="glass-card p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><div className="flex items-center gap-2"><Network className="h-5 w-5 text-primary"/><StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : "Live"}/></div>
          <h1 className="mt-3 font-display text-3xl font-semibold">Agent Handoffs</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">See recorded employee-to-employee work transfer, why it moved, workflow stage, retained record identifiers and where a handoff may be waiting. This workspace is read-only and never invents a handoff.</p>
        </div>
        <Link to="/ai/activity" className="rounded-md border border-border px-4 py-2 text-sm font-medium">Agent Activity</Link>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3">
      <Stat label="Recorded handoffs" value={items.length}/><Stat label="Waiting / stuck" value={stuck}/><Stat label="Completed" value={items.filter(i=>i.status==="completed").length}/>
    </section>

    {unavailable ? <section role="alert" className="glass-card border-destructive/40 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 text-destructive"/><div><h2 className="font-semibold">Handoff facts unavailable</h2><p className="mt-1 text-sm text-muted-foreground">No collaboration state is inferred. Existing workforce records remain unchanged.</p></div></div></section> : null}

    <section className="glass-card p-5 md:p-6">
      <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold">Recorded collaboration trail</h2><p className="mt-1 text-xs text-muted-foreground">A stuck marker means a recorded pending or accepted handoff has waited at least 60 minutes; it does not prove the agent process itself is unhealthy.</p></div><ShieldCheck className="h-5 w-5 text-primary"/></div>
      <div className="mt-5 space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading recorded handoffs…</p> : items.length===0 ? <p className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">No employee handoff records are available. No collaboration is being claimed.</p> : items.map(item => <article key={item.id} className="rounded-xl border border-border/60 bg-card/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><p className="text-xs uppercase tracking-widest text-muted-foreground">{item.workflow ?? "Recorded workforce handoff"}{item.stage ? ` · Stage ${item.stage}${item.totalStages ? `/${item.totalStages}` : ""}` : ""}</p><div className="mt-2 flex flex-wrap items-center gap-2 font-semibold"><span>{item.fromEmployeeName}</span><ArrowRight className="h-4 w-4 text-primary"/><span>{item.toEmployeeName}</span></div><p className="mt-2 text-sm text-muted-foreground">{item.reason}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-border/60 px-2.5 py-1 text-xs font-semibold">{item.status}</span>{item.stuck ? <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"><Clock3 className="h-3 w-3"/>waiting</span> : null}</div></div>
        <div className="mt-4 grid gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground md:grid-cols-2"><div><strong className="text-foreground">Mission:</strong> {item.missionTitle}</div><div><strong className="text-foreground">Execution order:</strong> {item.executionOrder ?? "Not recorded"}</div><div><strong className="text-foreground">Retained records:</strong> {item.retainedRecordKeys.length ? item.retainedRecordKeys.join(", ") : "None recorded"}</div><div><strong className="text-foreground">Context fields retained:</strong> {item.contextKeys.length ? item.contextKeys.join(", ") : "None recorded"}</div></div>
      </article>)}</div>
    </section>
  </div>;
}

function Stat({label,value}:{label:string;value:number}) { return <div className="glass-card p-4"><div className="text-2xl font-semibold">{value}</div><div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</div></div>; }
