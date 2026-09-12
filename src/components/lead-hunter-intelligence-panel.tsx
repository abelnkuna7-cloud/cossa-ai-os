import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Radar, RefreshCcw, ShieldCheck, Target, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LeadHunterSearchResponse } from "@/lib/lead-hunter-data";
import type { LeadHunterHistoryDashboard, LeadHunterHistoryWindow } from "@/lib/lead-hunter-history-dashboard";
import {
  fetchLeadHunterHistoryDashboard,
  leadHunterDiagnosticsForResponse,
} from "@/lib/lead-hunter-ui-truth";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: LeadHunterHistoryDashboard; error: null }
  | { status: "unavailable"; data: null; error: string };

export function LeadHunterIntelligencePanel({
  result,
  refreshKey = 0,
}: {
  result: LeadHunterSearchResponse | null;
  refreshKey?: number;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    fetchLeadHunterHistoryDashboard(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({
            status: "unavailable",
            data: null,
            error: error instanceof Error ? error.message : "Lead Hunter history is unavailable.",
          });
        }
      });
    return () => controller.abort();
  }, [refreshKey]);

  const diagnostics = useMemo(
    () => (result ? leadHunterDiagnosticsForResponse(result) : null),
    [result],
  );

  return (
    <section className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radar className="h-4 w-4 text-primary" />
              Lead Hunter intelligence
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Persisted hunt facts only. These totals come from durable hunt history, not estimated dashboard data.
            </p>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Africa/Johannesburg
          </div>
        </div>

        {state.status === "loading" ? (
          <div className="mt-4 rounded-xl border border-border/60 p-4 text-xs text-muted-foreground">
            Loading verified hunt history…
          </div>
        ) : state.status === "unavailable" ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <div className="text-xs font-semibold text-warning">History unavailable</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{state.error}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                No replacement or estimated counters are shown when the protected history source cannot be read.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <WindowCard label="Today" window={state.data.today} />
            <WindowCard label="Last 7 days" window={state.data.last_7_days} />
            <WindowCard label="Last 30 days" window={state.data.last_30_days} />
          </div>
        )}
      </div>

      {diagnostics ? (
        <div className="glass-card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Latest hunt truth
              </div>
              <h2 className="mt-1 text-sm font-semibold">{diagnostics.headline}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{diagnostics.explanation}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Raw" value={diagnostics.rawCandidateCount} />
              <MiniStat label="Accepted" value={diagnostics.acceptedCount} />
              <MiniStat label="Rejected" value={diagnostics.rejectedCount} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {diagnostics.providers.map((provider) => (
              <div key={provider.provider} className="rounded-xl border border-border/60 bg-card/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{provider.provider}</span>
                  <ProviderStatus status={provider.status} />
                </div>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div>{provider.resultCount} provider result{provider.resultCount === 1 ? "" : "s"}</div>
                  <div>{provider.timingMs == null ? "Timing unavailable" : `${provider.timingMs} ms`}</div>
                  {provider.httpStatus ? <div>HTTP {provider.httpStatus}</div> : null}
                  {provider.errorReason ? <div className="text-warning">{provider.errorReason}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WindowCard({ label, window }: { label: string; window: LeadHunterHistoryWindow }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold">{label}</div>
        <Clock3 className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Hunted" value={window.hunted} />
        <MiniStat label="Verified" value={window.verified} />
        <MiniStat label="Hot" value={window.hot} />
        <MiniStat label="Warm" value={window.warm} />
        <MiniStat label="Cold" value={window.cold} />
        <MiniStat label="Research" value={window.research} />
        <MiniStat label="Tenders" value={window.tenders} />
        <MiniStat label="Supplier" value={window.supplier_opportunities} />
      </div>
      <div className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-4 text-muted-foreground">
        <div>{window.hunts} hunts · {window.duplicates} duplicates · {window.failed_hunts} failed</div>
        <div className="mt-1">
          Last success: {window.last_successful_hunt_at ? formatDateTime(window.last_successful_hunt_at) : "No recorded success"}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}

function ProviderStatus({ status }: { status: string }) {
  const good = status === "SUCCESS" || status === "FALLBACK_USED" || status === "NO_RESULTS";
  const waiting = status === "NOT_ATTEMPTED";
  const icon = good ? CheckCircle2 : waiting ? RefreshCcw : AlertCircle;
  const Icon = icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
        good
          ? "border-success/30 bg-success/10 text-success"
          : waiting
            ? "border-border/60 text-muted-foreground"
            : "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      <Icon className="h-3 w-3" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}
