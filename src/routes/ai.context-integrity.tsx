import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { inspectAllMissionContextIntegrity } from "@/lib/agent-context-integrity";
import { listEmployeeHandoffs, listMissions, listWorkforceRuns } from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/context-integrity")({
  component: AgentContextIntegrityPage,
  head: () => ({
    meta: [
      { title: "Context Integrity — Cossa AI" },
      {
        name: "description",
        content: "Evidence-backed checks for missing workforce context, retained identifiers and stage ordering.",
      },
    ],
  }),
});

function AgentContextIntegrityPage() {
  const handoffsQuery = useQuery({ queryKey: ["context-integrity", "handoffs"], queryFn: listEmployeeHandoffs, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const runsQuery = useQuery({ queryKey: ["context-integrity", "runs"], queryFn: listWorkforceRuns, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const missionsQuery = useQuery({ queryKey: ["context-integrity", "missions"], queryFn: listMissions, retry: false, staleTime: 30_000, refetchInterval: 60_000 });

  const reports = useMemo(
    () => inspectAllMissionContextIntegrity({ handoffs: handoffsQuery.data ?? [], runs: runsQuery.data ?? [] }),
    [handoffsQuery.data, runsQuery.data],
  );
  const missionNames = useMemo(
    () => new Map((missionsQuery.data ?? []).map((mission) => [mission.id, mission.title])),
    [missionsQuery.data],
  );

  const loading = handoffsQuery.isLoading || runsQuery.isLoading || missionsQuery.isLoading;
  const unavailable = handoffsQuery.isError || runsQuery.isError || missionsQuery.isError;
  const critical = reports.filter((report) => report.status === "critical").length;
  const attention = reports.filter((report) => report.status === "attention").length;
  const healthy = reports.filter((report) => report.status === "healthy").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : critical > 0 ? "Attention" : "Live"} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">Agent Context Integrity</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Checks recorded workforce stages for silent context loss. It flags missing retained identifiers,
              missing upstream completed outputs and impossible stage ordering. It does not infer failures from missing data sources.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/ai/context" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
              Working Context <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/ai/handoffs" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
              Handoffs <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {unavailable ? (
        <section role="alert" className="glass-card border-destructive/40 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-semibold">Integrity monitoring is unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">No integrity status is being guessed while workforce records are unavailable.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Critical" value={critical} warning={critical > 0} />
        <Metric label="Needs attention" value={attention} warning={attention > 0} />
        <Metric label="Healthy" value={healthy} />
      </section>

      <section className="glass-card p-5 md:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking workforce context integrity…</p>
        ) : reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
            No recorded workforce handoffs are available to inspect. This is not treated as a healthy result.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const title = missionNames.get(report.missionId) ?? "Recorded mission";
              const Icon = report.status === "healthy" ? CheckCircle2 : AlertTriangle;
              return (
                <article key={report.missionId} className="rounded-xl border border-border/60 bg-card/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{report.status}</p>
                          <h2 className="font-semibold">{title}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{report.checkedHandoffs} handoff{report.checkedHandoffs === 1 ? "" : "s"} checked</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{report.issues.length} issue{report.issues.length === 1 ? "" : "s"}</span>
                      </div>

                      {report.issues.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">No context-integrity violation was detected in the currently recorded handoffs and runs.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {report.issues.map((issue) => (
                            <div key={issue.id} className="rounded-lg border border-border/50 bg-background/30 p-3">
                              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
                                <span className={issue.severity === "critical" ? "text-destructive" : "text-warning"}>{issue.severity}</span>
                                <span className="text-muted-foreground">{issue.code.replaceAll("_", " ")}</span>
                                {issue.stage !== null ? <span className="text-muted-foreground">stage {issue.stage}</span> : null}
                              </div>
                              <p className="mt-1 text-sm text-foreground/90">{issue.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${warning ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
