import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play, Radar, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getAgentRuntimeDashboard,
  queueLeadHunterRuntimeProof,
  type AgentRuntimeDashboard,
} from "@/lib/agent-runtime";
import { inferLeadHunterCommandIntent } from "@/lib/lead-hunter-command-intent";

type MissionProgress = {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  awaitingApproval: number;
  researchResult: Record<string, unknown> | null;
};

function missionProgress(
  dashboard: AgentRuntimeDashboard | null,
  missionId: string | null,
): MissionProgress | null {
  if (!dashboard || !missionId) return null;

  const tasks = dashboard.tasks.filter((task) => task.mission_id === missionId);
  if (tasks.length === 0) return null;

  const countStatus = (status: string) => tasks.filter((task) => task.status === status).length;
  const researchTask = tasks.find((task) => task.task_type === "lead_research");
  const researchResult =
    researchTask?.result && typeof researchTask.result === "object" && !Array.isArray(researchTask.result)
      ? (researchTask.result as Record<string, unknown>)
      : null;

  return {
    total: tasks.length,
    queued: countStatus("queued"),
    running: countStatus("running"),
    completed: countStatus("completed"),
    failed: countStatus("failed"),
    awaitingApproval: dashboard.approvals.filter(
      (approval) => approval.mission_id === missionId && approval.status === "pending",
    ).length,
    researchResult,
  };
}

function readCount(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function LeadHunterQuickCommand() {
  const [command, setCommand] = useState("");
  const [working, setWorking] = useState(false);
  const [lastMission, setLastMission] = useState<{ missionId: string; queuedTasks: number } | null>(null);
  const [dashboard, setDashboard] = useState<AgentRuntimeDashboard | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  const inferredTarget = useMemo(() => inferLeadHunterCommandIntent(command), [command]);
  const progress = useMemo(
    () => missionProgress(dashboard, lastMission?.missionId ?? null),
    [dashboard, lastMission?.missionId],
  );

  useEffect(() => {
    if (!lastMission?.missionId) return;

    let cancelled = false;
    let timer: number | undefined;

    const refresh = async () => {
      try {
        const next = await getAgentRuntimeDashboard();
        if (cancelled) return;
        setDashboard(next);
        setProgressError(null);

        const nextProgress = missionProgress(next, lastMission.missionId);
        const terminal =
          nextProgress &&
          nextProgress.running === 0 &&
          nextProgress.queued === 0 &&
          nextProgress.completed + nextProgress.failed === nextProgress.total;

        if (!terminal) {
          timer = window.setTimeout(() => void refresh(), 2500);
        }
      } catch (error) {
        if (cancelled) return;
        setProgressError(
          error instanceof Error ? error.message : "Mission progress is temporarily unavailable.",
        );
        timer = window.setTimeout(() => void refresh(), 5000);
      }
    };

    void refresh();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [lastMission?.missionId]);

  async function startLeadHunter() {
    if (working) return;

    const objective = command.trim();
    if (!objective) {
      toast.error("Tell Lead Hunter what you want it to find.");
      return;
    }

    if (
      !inferredTarget.confident ||
      !inferredTarget.targetCompany ||
      !inferredTarget.targetService
    ) {
      toast.error("Lead Hunter needs a clearer service target", {
        description: inferredTarget.reason ?? "Name the service or opportunity you want Lead Hunter to find.",
      });
      return;
    }

    setWorking(true);
    setDashboard(null);
    setProgressError(null);
    try {
      const mission = await queueLeadHunterRuntimeProof({
        objective,
        targetCompany: inferredTarget.targetCompany,
        targetService: inferredTarget.targetService,
        targetLocation: inferredTarget.targetLocation,
        resultCount: 10,
      });
      setLastMission(mission);
      toast.success("Lead Hunter started working", {
        description: `${mission.queuedTasks} protected workflow tasks were queued. No outreach was sent.`,
      });
    } catch (error) {
      toast.error("Lead Hunter could not start", {
        description: error instanceof Error ? error.message : "The mission could not be queued.",
      });
    } finally {
      setWorking(false);
    }
  }

  const accepted = readCount(progress?.researchResult ?? null, "accepted_count");
  const rejected = readCount(progress?.researchResult ?? null, "rejected_count");
  const sources = readCount(progress?.researchResult ?? null, "source_count");

  return (
    <section className="glass-card border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Use Lead Hunter</h2>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Write a mission, then press Start Lead Hunter
              </p>
            </div>
          </div>

          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void startLeadHunter();
              }
            }}
            rows={3}
            maxLength={2500}
            disabled={working}
            aria-label="Lead Hunter command"
            className="mt-4 w-full resize-y rounded-xl border border-input bg-background/80 px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-60"
            placeholder="Example: Find verified commercial cleaning opportunities in Centurion with active RFQs, supplier opportunities and public contact details."
          />

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>
              Company: {inferredTarget.targetCompany?.replaceAll("_", " ") ?? "needs clarification"}
            </span>
            <span>
              Service: {inferredTarget.targetService?.replaceAll("_", " ") ?? "needs clarification"}
            </span>
            <span>Location: {inferredTarget.targetLocation}</span>
            <span>Ctrl/⌘ + Enter also starts</span>
          </div>

          {!inferredTarget.confident && command.trim() ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[10px] leading-4 text-warning">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{inferredTarget.reason}</span>
            </div>
          ) : null}

          {lastMission ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Current mission
                  </div>
                  <div className="mt-1 text-xs font-semibold">{lastMission.missionId}</div>
                </div>
                {progress ? (
                  progress.failed > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      {progress.failed} failed
                    </span>
                  ) : progress.completed === progress.total && progress.total > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Workflow completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Working
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Waiting for worker
                  </span>
                )}
              </div>

              {progress ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <MissionStat label="Queued" value={progress.queued} />
                    <MissionStat label="Running" value={progress.running} />
                    <MissionStat label="Completed" value={progress.completed} />
                    <MissionStat label="Failed" value={progress.failed} />
                    <MissionStat label="Review" value={progress.awaitingApproval} />
                  </div>

                  {progress.researchResult ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <MissionStat label="Accepted" value={accepted} />
                      <MissionStat label="Rejected" value={rejected} />
                      <MissionStat label="Sources" value={sources} />
                    </div>
                  ) : null}
                </>
              ) : null}

              {progressError ? (
                <p className="mt-3 text-[10px] leading-4 text-warning">{progressError}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
          <Button
            type="button"
            onClick={() => void startLeadHunter()}
            disabled={working || !command.trim() || !inferredTarget.confident}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            {working ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Lead Hunter
              </>
            )}
          </Button>

          <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-[10px] leading-4 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Safe agent mode
            </div>
            <p className="mt-1">
              Research → verify → qualify → duplicate-protected CRM save → draft for review. External sending stays off.
            </p>
          </div>

          {lastMission ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-[10px] leading-4 text-success">
              Mission queued · {lastMission.queuedTasks} tasks
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MissionStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 px-2 py-2 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}
