import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Database, ExternalLink, FileText, Link2, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { buildAgentWorkingContext, contextForMission } from "@/lib/agent-working-context";
import {
  listEmployees,
  listEmployeeHandoffs,
  listMissions,
  listWorkforceRuns,
} from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/context")({
  component: AgentContextPage,
  head: () => ({
    meta: [
      { title: "Agent Context — Cossa AI" },
      {
        name: "description",
        content: "Persistent recorded context, retained source identifiers and evidence boundaries across Cossa AI workforce stages.",
      },
    ],
  }),
});

function AgentContextPage() {
  const missionsQuery = useQuery({ queryKey: ["agent-context", "missions"], queryFn: listMissions, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const employeesQuery = useQuery({ queryKey: ["agent-context", "employees"], queryFn: listEmployees, retry: false, staleTime: 30_000, refetchInterval: 60_000 });
  const handoffsQuery = useQuery({ queryKey: ["agent-context", "handoffs"], queryFn: listEmployeeHandoffs, retry: false, staleTime: 15_000, refetchInterval: 30_000 });
  const runsQuery = useQuery({ queryKey: ["agent-context", "runs"], queryFn: listWorkforceRuns, retry: false, staleTime: 15_000, refetchInterval: 30_000 });

  const entries = useMemo(
    () =>
      buildAgentWorkingContext({
        missions: missionsQuery.data ?? [],
        employees: employeesQuery.data ?? [],
        handoffs: handoffsQuery.data ?? [],
        runs: runsQuery.data ?? [],
      }),
    [missionsQuery.data, employeesQuery.data, handoffsQuery.data, runsQuery.data],
  );

  const missionOptions = useMemo(
    () => (missionsQuery.data ?? []).filter((mission) => entries.some((entry) => entry.missionId === mission.id)),
    [missionsQuery.data, entries],
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const activeMissionId = selectedMissionId ?? missionOptions[0]?.id ?? null;
  const visibleEntries = activeMissionId ? contextForMission(entries, activeMissionId) : [];

  const loading = missionsQuery.isLoading || employeesQuery.isLoading || handoffsQuery.isLoading || runsQuery.isLoading;
  const unavailable = missionsQuery.isError || employeesQuery.isError || handoffsQuery.isError || runsQuery.isError;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : "Live"} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">Agent Working Context</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Recorded mission context that can survive hand-to-hand execution: completed workforce outputs,
              handoff reasons, source identifiers and evidence boundaries. This view does not manufacture memory
              and does not treat retained context as proof of external execution.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/ai/handoffs" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
              Agent Handoffs <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/ai/activity" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
              Agent Activity <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {unavailable ? (
        <section role="alert" className="glass-card border-destructive/40 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-semibold">Persistent workforce context is unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">No context is being guessed. Existing workforce records remain unchanged.</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="glass-card p-4">
          <h2 className="font-display text-lg font-semibold">Missions with context</h2>
          <p className="mt-1 text-xs text-muted-foreground">Only missions with recorded handoffs, identifiers or completed outputs appear here.</p>
          <div className="mt-4 space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading context…</p> : missionOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">No persistent context records are available.</p>
            ) : missionOptions.map((mission) => {
              const selected = mission.id === activeMissionId;
              const count = contextForMission(entries, mission.id).length;
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => setSelectedMissionId(mission.id)}
                  className={`w-full rounded-xl border p-3 text-left ${selected ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/30 hover:border-primary/30"}`}
                >
                  <p className="text-sm font-semibold">{mission.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count} recorded context item{count === 1 ? "" : "s"}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-card p-5 md:p-6">
          {!activeMissionId ? (
            <p className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">Select a mission with recorded context.</p>
          ) : visibleEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">No recorded context exists for this mission.</p>
          ) : (
            <div className="space-y-3">
              {visibleEntries.map((entry) => {
                const Icon = entry.kind === "run_output" ? FileText : entry.kind === "retained_records" ? Link2 : ShieldCheck;
                return (
                  <article key={entry.id} className="rounded-xl border border-border/60 bg-card/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{entry.kind.replaceAll("_", " ")}</p>
                            <h3 className="font-semibold">{entry.employeeName}</h3>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(entry.recordedAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{entry.summary}</p>

                        {entry.sourceScope.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-border/50 bg-background/30 p-3 text-xs">
                            <p className="font-medium">Recorded source scope</p>
                            <ul className="mt-1 space-y-1 text-muted-foreground">
                              {entry.sourceScope.map((source) => <li key={source}>• {source}</li>)}
                            </ul>
                          </div>
                        ) : null}

                        {Object.keys(entry.retainedRecordIds).length > 0 ? (
                          <div className="mt-3 rounded-lg border border-border/50 bg-background/30 p-3 text-xs">
                            <p className="font-medium">Retained record identifiers</p>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">{JSON.stringify(entry.retainedRecordIds, null, 2)}</pre>
                          </div>
                        ) : null}

                        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Evidence boundary:</span> {entry.evidenceBoundary}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
