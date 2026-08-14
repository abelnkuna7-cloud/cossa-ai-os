import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  getGrowthAnalyticsReport,
  GrowthAnalyticsError,
  startGrowthAnalyticsOAuth,
} from "@/lib/growth-analytics";
import { checkCossaWebsites } from "@/lib/website-health";
import { cn } from "@/lib/utils";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/marketing/monitoring")({
  component: WebsiteMonitoring,
  head: () => ({
    meta: [
      { title: "Website Watch — GROWTH" },
      {
        name: "description",
        content:
          "A controlled health check for the public GROWTH website, with no website changes or publishing.",
      },
    ],
  }),
});

function WebsiteMonitoring() {
  const websiteCheck = useQuery({
    queryKey: ["cossa-website-health"],
    queryFn: checkCossaWebsites,
    retry: false,
    staleTime: 30_000,
  });
  const analyticsCheck = useQuery({
    queryKey: ["growth-analytics-report"],
    queryFn: getGrowthAnalyticsReport,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const analyticsConnection = useMutation({
    mutationFn: startGrowthAnalyticsOAuth,
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
  });
  const reports = websiteCheck.data?.checks ?? [];
  const analytics = analyticsCheck.data;
  const analyticsError = analyticsConnection.error ?? analyticsCheck.error;
  const analyticsConfigurationPending =
    analyticsError instanceof GrowthAnalyticsError &&
    analyticsError.code === "configuration-pending";
  const analyticsApprovalRequired =
    analyticsError instanceof GrowthAnalyticsError && analyticsError.code === "approval-required";
  const isChecking = websiteCheck.isFetching;
  const unavailableCount = reports.filter((report) => report.availability === "unavailable").length;
  const healthyCount = reports.filter((report) => report.availability === "healthy").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Globe2 className="h-5 w-5" />
              </div>
              <StatusBadge status={report ? "Live" : workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Website <span className="text-gradient-gold">Watch</span>
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              A direct, read-only check of the Cossa Nexus Holdings, Store, NexDocs and GROWTH
              homepages. It checks public availability and indexing signals without editing,
              publishing or claiming a full SEO audit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void websiteCheck.refetch()}
              disabled={isChecking}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              {isChecking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              {isChecking ? "Checking Cossa sites..." : "Check all Cossa sites"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <a href="https://www.cossanexusholdings.co.za" target="_blank" rel="noreferrer">
                Open main website <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Authorised reporting source
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">GROWTH Google Analytics</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Confirmed property <span className="font-medium text-foreground">542695998</span>{" "}
                and measurement ID <span className="font-medium text-foreground">G-EWW4BPZN6R</span>
                . The workspace can read aggregate reporting only after a Cossa owner approves the
                protected, read-only Google OAuth connection.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => analyticsConnection.mutate()}
              disabled={analyticsConnection.isPending || analyticsConfigurationPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {analyticsConnection.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-1.5 h-4 w-4" />
              )}
              {analyticsConfigurationPending ? "Secure setup pending" : "Connect Google Analytics"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void analyticsCheck.refetch()}
              disabled={analyticsCheck.isFetching}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {analyticsCheck.isFetching ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Refresh GA4 report
            </Button>
          </div>
        </div>

        {analyticsConfigurationPending ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                Secure Google Analytics setup is pending
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                No Analytics data has been accessed. A Cossa owner must finish the protected server
                configuration and redeploy GROWTH before Google approval can begin.
              </p>
            </div>
          </div>
        ) : analyticsApprovalRequired ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Google approval is still required</p>
              <p className="mt-1 text-xs leading-5">
                A Cossa owner or admin can select Connect Google Analytics to start the read-only
                approval flow.
              </p>
            </div>
          </div>
        ) : analyticsConnection.isError ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-5">
              {analyticsConnection.error instanceof Error
                ? analyticsConnection.error.message
                : "Google Analytics connection could not be started."}
            </p>
          </div>
        ) : null}

        {analyticsConfigurationPending ||
        analyticsApprovalRequired ? null : analyticsCheck.isError ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">GA4 reporting is not connected yet</p>
              <p className="mt-1 text-xs leading-5">
                {analyticsCheck.error instanceof Error
                  ? analyticsCheck.error.message
                  : "The authorised GA4 report could not be loaded."}
              </p>
            </div>
          </div>
        ) : analytics ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Metric label="Active users" value={String(analytics.active_users)} />
              <Metric label="New users" value={String(analytics.new_users)} />
              <Metric label="Sessions" value={String(analytics.sessions)} />
              <Metric label="Page views" value={String(analytics.page_views)} />
              <Metric label="Engaged sessions" value={String(analytics.engaged_sessions)} />
              <Metric label="Key events" value={String(analytics.key_events)} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Top acquisition channels
                </p>
                {analytics.channels.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No channel rows were returned.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {analytics.channels.map((channel) => (
                      <div
                        key={channel.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 text-sm"
                      >
                        <span className="truncate font-medium">{channel.name}</span>
                        <span className="text-muted-foreground">{channel.sessions} sessions</span>
                        <span className="text-primary">{channel.key_events} key events</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Reporting boundary</p>
                <p className="mt-2 text-xs leading-5">{analytics.reporting_scope}</p>
                <p className="mt-3 text-xs">
                  Last refreshed {new Date(analytics.fetched_at).toLocaleString()}.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading authorised GA4 status…
          </div>
        )}
      </section>

      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Verified check result
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">Cossa website estate health</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Four public homepages checked from one read-only Growth workspace.
            </p>
          </div>
          {reports.length > 0 ? (
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                unavailableCount > 0
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : healthyCount === reports.length
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              {unavailableCount > 0
                ? `${unavailableCount} site${unavailableCount === 1 ? "" : "s"} unavailable`
                : `${healthyCount}/${reports.length} healthy`}
            </span>
          ) : null}
        </div>

        {websiteCheck.isError ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {websiteCheck.error instanceof Error
                ? websiteCheck.error.message
                : "The website checks could not be completed."}
            </span>
          </div>
        ) : reports.length > 0 ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reports.map((report) => (
                <a
                  key={report.id}
                  href={report.final_url ?? report.website}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">{report.name}</div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest",
                        report.availability === "healthy"
                          ? "border-success/30 bg-success/10 text-success"
                          : report.availability === "unavailable"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-warning/30 bg-warning/10 text-warning",
                      )}
                    >
                      {report.availability}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>HTTP: {report.http_status ?? "—"}</span>
                    <span>{report.response_time_ms ?? "—"} ms</span>
                    <span>{report.title_detected ? "Title found" : "No title"}</span>
                    <span>{report.noindex_detected ? "Noindex found" : "Indexable"}</span>
                  </div>
                  {report.issues.length > 0 ? (
                    <p className="mt-3 text-xs leading-5 text-warning">{report.issues[0]}</p>
                  ) : (
                    <p className="mt-3 text-xs text-success">No issue found by this limited check.</p>
                  )}
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Checked {new Date(websiteCheck.data?.checked_at ?? "").toLocaleString()}.{" "}
              {websiteCheck.data?.monitoring_scope}
            </p>
          </>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
            The first live check starts automatically while this page opens. You can check all Cossa sites at any time.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Current monitoring boundary</p>
            <p className="mt-1 text-xs leading-5">
              This is a real on-demand check of the four public homepages. The GA4 section currently
              reads aggregate data only from the approved GROWTH property. Sitewide traffic requires
              the relevant GA4 properties to be approved separately. Neither feature changes a
              website, publishes content or replaces full security, uptime or SEO monitoring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
