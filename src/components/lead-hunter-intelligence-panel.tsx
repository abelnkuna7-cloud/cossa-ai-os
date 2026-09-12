import { useEffect, useMemo, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Clock3, Radar, RefreshCcw } from "lucide-react";

import type { AgentRuntimeTruth } from "@/lib/agent-runtime-truth";
import type { LeadHunterSearchResponse } from "@/lib/lead-hunter-data";
import type {
  LeadHunterHistoryDashboard,
  LeadHunterHistoryWindow,
} from "@/lib/lead-hunter-history-dashboard";
import { leadHunterDiagnosticsForResponse } from "@/lib/lead-hunter-ui-truth";
import { cn } from "@/lib/utils";

type ProviderConfigState = "CONFIGURED" | "NOT_CONFIGURED";

type LeadHunterProviderConfigurationHealth = {
  checked_at: string;
  environment: string;
  search_providers: {
    tavily: ProviderConfigState;
    serpapi: ProviderConfigState;
    newsapi: ProviderConfigState;
  };
  model_providers: {
    groq: { configuration: ProviderConfigState; model: string };
    openai: { configuration: ProviderConfigState; model: string };
    gemini: { configuration: ProviderConfigState; model: string };
  };
  lead_hunter_search_available: boolean;
  model_reasoning_available: boolean;
  protected_runtime: {
    supabase: ProviderConfigState;
    runtime_worker: ProviderConfigState;
    history_writer: ProviderConfigState;
  };
  note: string;
};

type LoadState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "unavailable"; data: null; error: string };

const loadLeadHunterHistory = createClientOnlyFn(
  async (signal?: AbortSignal): Promise<LeadHunterHistoryDashboard> => {
    const { fetchLeadHunterHistoryDashboard } = await import("@/lib/lead-hunter-history.client");
    return fetchLeadHunterHistoryDashboard(signal);
  },
);

const loadLeadHunterProviderHealth = createClientOnlyFn(
  async (signal?: AbortSignal): Promise<LeadHunterProviderConfigurationHealth> => {
    const { fetchLeadHunterProviderConfigurationHealth } = await import(
      "@/lib/lead-hunter-history.client"
    );
    return fetchLeadHunterProviderConfigurationHealth(signal);
  },
);

const loadAgentRuntimeTruth = createClientOnlyFn(async (): Promise<AgentRuntimeTruth> => {
  const runtime = await import("@/lib/agent-runtime");
  const dashboard = await runtime.getAgentRuntimeDashboard();
  return runtime.resolveAgentRuntimeTruth(dashboard);
});

export function LeadHunterIntelligencePanel({
  result,
  refreshKey = 0,
}: {
  result: LeadHunterSearchResponse | null;
  refreshKey?: number;
}) {
  const [history, setHistory] = useState<LoadState<LeadHunterHistoryDashboard>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [providerConfig, setProviderConfig] = useState<
    LoadState<LeadHunterProviderConfigurationHealth>
  >({ status: "loading", data: null, error: null });
  const [runtimeTruth, setRuntimeTruth] = useState<LoadState<AgentRuntimeTruth>>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setHistory({ status: "loading", data: null, error: null });
    loadLeadHunterHistory(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setHistory({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setHistory({
            status: "unavailable",
            data: null,
            error: error instanceof Error ? error.message : "Lead Hunter history is unavailable.",
          });
        }
      });
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setProviderConfig({ status: "loading", data: null, error: null });
    loadLeadHunterProviderHealth(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProviderConfig({ status: "ready", data, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setProviderConfig({
            status: "unavailable",
            data: null,
            error:
              error instanceof Error ? error.message : "Lead Hunter provider health is unavailable.",
          });
        }
      });
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setRuntimeTruth({ status: "loading", data: null, error: null });
    loadAgentRuntimeTruth()
      .then((data) => {
        if (!cancelled) setRuntimeTruth({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setRuntimeTruth({
            status: "unavailable",
            data: null,
            error: error instanceof Error ? error.message : "Agent runtime truth is unavailable.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
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

        {history.status === "loading" ? (
          <LoadingCard text="Loading verified hunt history…" />
        ) : history.status === "unavailable" ? (
          <UnavailableCard title="History unavailable" error={history.error} />
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <WindowCard label="Today" window={history.data.today} />
            <WindowCard label="Last 7 days" window={history.data.last_7_days} />
            <WindowCard label="Last 30 days" window={history.data.last_30_days} />
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Provider configuration
          </div>
          <h2 className="mt-1 text-sm font-semibold">Lead Hunter provider readiness</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Configuration truth only. A configured provider is not called healthy until a real execution proves authentication, quota and model access.
          </p>
        </div>

        {providerConfig.status === "loading" ? (
          <LoadingCard text="Checking provider configuration…" />
        ) : providerConfig.status === "unavailable" ? (
          <UnavailableCard title="Provider truth unavailable" error={providerConfig.error} />
        ) : (
          <>
            <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              Search providers
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <ConfigurationCard label="Tavily" status={providerConfig.data.search_providers.tavily} />
              <ConfigurationCard label="SerpAPI" status={providerConfig.data.search_providers.serpapi} />
              <ConfigurationCard label="NewsAPI" status={providerConfig.data.search_providers.newsapi} />
            </div>

            <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              Model providers
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {Object.entries(providerConfig.data.model_providers).map(([key, provider]) => (
                <ModelConfigurationCard
                  key={key}
                  label={providerLabel(key)}
                  status={provider.configuration}
                  model={provider.model}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] leading-4 text-muted-foreground">
              Search configured: {providerConfig.data.lead_hunter_search_available ? "Yes" : "No"} · model reasoning configured: {providerConfig.data.model_reasoning_available ? "Yes" : "No"} · checked {formatDateTime(providerConfig.data.checked_at)}
            </div>
          </>
        )}
      </div>

      <div className="glass-card p-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Runtime circuit truth
          </div>
          <h2 className="mt-1 text-sm font-semibold">What can actually execute now</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Live runtime truth from the existing orchestration dashboard. Configuration alone is not treated as success.
          </p>
        </div>

        {runtimeTruth.status === "loading" ? (
          <LoadingCard text="Checking worker and model circuits…" />
        ) : runtimeTruth.status === "unavailable" ? (
          <UnavailableCard title="Runtime truth unavailable" error={runtimeTruth.error} />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RuntimeCard
                label="Hosted worker"
                state={runtimeTruth.data.worker.state}
                detail={runtimeTruth.data.worker.message}
                meta={
                  runtimeTruth.data.worker.lastSeenAt
                    ? `Last heartbeat ${formatDateTime(runtimeTruth.data.worker.lastSeenAt)}`
                    : "No verified heartbeat timestamp"
                }
              />
              {runtimeTruth.data.providers.map((provider) => (
                <RuntimeCard
                  key={provider.provider}
                  label={providerLabel(provider.provider)}
                  state={provider.state}
                  detail={runtimeProviderDetail(provider.state, provider.lastErrorCategory)}
                  meta={`${provider.model} · circuit ${provider.circuitState}${
                    provider.circuitOpenUntil
                      ? ` until ${formatDateTime(provider.circuitOpenUntil)}`
                      : ""
                  }`}
                />
              ))}
            </div>

            {runtimeTruth.data.tools
              .filter((tool) => tool.toolKey === "cossa-lead-hunter")
              .map((tool) => (
                <div key={tool.toolKey} className="mt-3">
                  <RuntimeCard
                    label="Lead Hunter evidence engine"
                    state={tool.state}
                    detail={runtimeToolDetail(tool.state)}
                    meta={
                      tool.lastCheckedAt
                        ? `Last checked ${formatDateTime(tool.lastCheckedAt)}`
                        : "No last-check timestamp"
                    }
                  />
                </div>
              ))}
          </>
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

function LoadingCard({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-border/60 p-4 text-xs text-muted-foreground">{text}</div>;
}

function UnavailableCard({ title, error }: { title: string; error: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <div className="text-xs font-semibold text-warning">{title}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{error}</p>
      </div>
    </div>
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

function ConfigurationCard({ label, status }: { label: string; status: ProviderConfigState }) {
  const configured = status === "CONFIGURED";
  const Icon = configured ? CheckCircle2 : AlertCircle;
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
          configured
            ? "border-success/30 bg-success/10 text-success"
            : "border-warning/30 bg-warning/10 text-warning",
        )}>
          <Icon className="h-3 w-3" />
          {status.replaceAll("_", " ")}
        </span>
      </div>
    </div>
  );
}

function ModelConfigurationCard({
  label,
  status,
  model,
}: {
  label: string;
  status: ProviderConfigState;
  model: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <ProviderState state={status === "CONFIGURED" ? "HEALTHY" : "NOT_CONFIGURED"} label={status} />
      </div>
      <div className="mt-2 break-all text-[10px] leading-4 text-muted-foreground">{model}</div>
    </div>
  );
}

function RuntimeCard({
  label,
  state,
  detail,
  meta,
}: {
  label: string;
  state: string;
  detail: string;
  meta: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <ProviderState state={state} label={state} />
      </div>
      <div className="mt-2 text-[11px] leading-4 text-foreground/90">{detail}</div>
      <div className="mt-1 break-all text-[10px] leading-4 text-muted-foreground">{meta}</div>
    </div>
  );
}

function ProviderState({ state, label }: { state: string; label: string }) {
  const good = state === "HEALTHY" || state === "SUCCESS" || state === "CONFIGURED";
  const neutral = state === "NOT_VERIFIED" || state === "NOT_ATTEMPTED";
  const Icon = good ? CheckCircle2 : neutral ? RefreshCcw : AlertCircle;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
      good
        ? "border-success/30 bg-success/10 text-success"
        : neutral
          ? "border-border/60 text-muted-foreground"
          : "border-warning/30 bg-warning/10 text-warning",
    )}>
      <Icon className="h-3 w-3" />
      {label.replaceAll("_", " ")}
    </span>
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
  const Icon = good ? CheckCircle2 : waiting ? RefreshCcw : AlertCircle;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
      good
        ? "border-success/30 bg-success/10 text-success"
        : waiting
          ? "border-border/60 text-muted-foreground"
          : "border-warning/30 bg-warning/10 text-warning",
    )}>
      <Icon className="h-3 w-3" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function runtimeProviderDetail(state: string, errorCategory: string | null): string {
  if (state === "HEALTHY") return "Provider is available to the runtime.";
  if (state === "RATE_LIMITED") return "Provider is rate limited; the runtime will not pretend it is available.";
  if (state === "NOT_CONFIGURED") return "Provider is not configured for this runtime.";
  if (errorCategory === "quota_exhausted") return "Quota exhausted. No paid top-up is assumed or triggered.";
  if (errorCategory === "model_unavailable") return "Configured model is unavailable or inaccessible.";
  if (errorCategory === "authentication_failed") return "Authentication failed for this provider.";
  if (errorCategory === "provider_unavailable") return "Provider is currently unavailable.";
  if (errorCategory === "timeout") return "Provider timed out during execution.";
  return errorCategory ? `Provider failed: ${errorCategory.replaceAll("_", " ")}.` : "Provider is not currently healthy.";
}

function runtimeToolDetail(state: string): string {
  if (state === "HEALTHY") return "Lead Hunter evidence engine is available to the runtime.";
  if (state === "DEGRADED") return "Lead Hunter evidence engine is degraded; inspect provider diagnostics before trusting a hunt.";
  if (state === "NOT_CONFIGURED") return "Lead Hunter evidence engine requires configuration before execution.";
  return "Lead Hunter evidence engine is not currently verified as healthy.";
}

function providerLabel(value: string): string {
  if (value.toLowerCase() === "openai") return "OpenAI";
  if (value.toLowerCase() === "groq") return "Groq";
  if (value.toLowerCase() === "gemini") return "Gemini";
  return value;
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
