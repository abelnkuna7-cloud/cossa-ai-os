import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  ListChecks,
  PlayCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { buildLiveMissionControlModels } from "@/lib/mission-control-live";
import {
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
} from "@/lib/workforce-data";

export const Route = createFileRoute("/mission-control/live")({
  component: LiveMissionControlPage,
  head: () => ({
    meta: [
      { title: "Live Mission Control — Cossa AI" },
      {
        name: "description",
        content:
          "Evidence-backed mission plans, task dependencies, approvals and execution progress for Cossa AI workforce missions.",
      },
    ],
  }),
});

function statusIcon(status: string) {
  if (status === "completed") return CheckCircle2;
  if (status === "running") return PlayCircle;
  if (status === "failed") return XCircle;
  if (status === "blocked") return ShieldAlert;
  if (status === "ready") return Clock3;
  return CircleDashed;
}

function LiveMissionControlPage() {
  const missionsQuery = useQuery({
    queryKey: ["workforce", "missions", "mission-control-live"],
    queryFn: listMissions,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const runsQuery = useQuery({
    queryKey: ["workforce", "runs", "mission-control-live"],
    queryFn: listWorkforceRuns,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const approvalsQuery = useQuery({
    queryKey: ["workforce", "approvals", "mission-control-live"],
    queryFn: listPendingApprovals,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const models = useMemo(
    () =>
      buildLiveMissionControlModels({
        missions: missionsQuery.data ?? [],
        runs: runsQuery.data ?? [],
        approvals: approvalsQuery.data ?? [],
      }),
    [missionsQuery.data, runsQuery.data, approvalsQuery.data],
  );

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const selected =
    models.find((model) => model.mission.id === selectedMissionId) ?? models[0] ?? null;
  const loading = missionsQuery.isLoading || runsQuery.isLoading || approvalsQuery.isLoading;
  const unavailable = missionsQuery.isError || runsQuery.isError || approvalsQuery.isError;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : "Live"} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">Live Mission Control</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Watch persisted Cossa workforce missions as task plans. Progress is calculated only
              from recorded mission facts; this screen does not start work, bypass approvals,
              message customers or execute external actions.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/mission-control">
              Guided Mission Control <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {unavailable ? (
        <section role="alert" className="glass-card border-destructive/40 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-semibold">Live mission facts are unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No progress is being guessed. Existing missions remain unchanged; verify authenticated
                workforce access and runtime availability.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <section className="glass-card p-4">
          <h2 className="font-display text-lg font-semibold">Persisted missions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Root missions only. Child missions appear as plan steps.
          </p>

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading mission facts…</p>
            ) : models.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No persisted root missions are available. No activity is inferred.
              </p>
            ) : (
              models.map((model) => {
                const active = selected?.mission.id === model.mission.id;
                return (
                  <button
                    key={model.mission.id}
                    type="button"
                    onClick={() => setSelectedMissionId(model.mission.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 bg-card/30 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{model.mission.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {model.mission.objective}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary">{model.progress.percent}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>{model.mission.status}</span>
                      <span>·</span>
                      <span>{model.progress.total} steps</span>
                      {model.pendingApprovalCount > 0 ? (
                        <>
                          <span>·</span>
                          <span>{model.pendingApprovalCount} approval</span>
                        </>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-card p-5 md:p-6">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Select a persisted mission to inspect its real task plan.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary">Mission plan</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{selected.mission.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    {selected.mission.objective}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold text-primary">{selected.progress.percent}%</div>
                  <div className="text-xs text-muted-foreground">persisted completion</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Completed", selected.progress.completed],
                  ["Running", selected.progress.running],
                  ["Ready", selected.progress.ready],
                  ["Blocked", selected.progress.blocked],
                  ["Failed", selected.progress.failed],
                  ["Approvals", selected.pendingApprovalCount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border/60 bg-card/30 p-3">
                    <div className="text-xl font-semibold">{value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              {!selected.valid ? (
                <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                  <p className="font-semibold text-destructive">Task plan validation failed</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {selected.errors.map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {selected.plan.steps.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    This mission has no persisted child mission steps. Cossa will not invent a task
                    plan or claim work is underway.
                  </div>
                ) : (
                  selected.plan.steps.map((step) => {
                    const ready = step.status === "planned" || step.status === "ready"
                      ? selected.plan.steps.length > 0 &&
                        step.dependsOn.every(
                          (dependencyId) =>
                            selected.plan.steps.find((candidate) => candidate.id === dependencyId)?.status ===
                            "completed",
                        ) && !step.requiresApproval
                      : false;
                    const displayStatus = ready && step.status === "planned" ? "ready" : step.status;
                    const StepIcon = statusIcon(displayStatus);
                    return (
                      <article key={step.id} className="rounded-xl border border-border/60 bg-card/30 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                  Step {step.order}
                                </p>
                                <h3 className="font-semibold">{step.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{step.objective}</p>
                              </div>
                              <span className="w-fit rounded-full border border-border/60 px-2.5 py-1 text-xs font-semibold">
                                {displayStatus.replaceAll("_", " ")}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <div>
                                <span className="font-medium text-foreground">Agent:</span>{" "}
                                {step.assignedEmployeeId ?? "Unassigned"}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Dependencies:</span>{" "}
                                {step.dependsOn.length ? step.dependsOn.length : "None"}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Approval gate:</span>{" "}
                                {step.requiresApproval ? "Required" : "No active gate"}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Evidence requirement:</span>{" "}
                                {step.evidenceRequired.length ? step.evidenceRequired.join(", ") : "Not recorded"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="mt-6 rounded-xl border border-border/60 bg-card/20 p-4 text-xs text-muted-foreground">
                Latest root run: {selected.latestRun ? `${selected.latestRun.status} · ${selected.latestRun.model_provider ?? "provider not recorded"}` : "No run recorded"}.
                This view is observational only; execution authority remains in the workforce and approval layers.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
