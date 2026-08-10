import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { getGrowthAnalyticsReport } from "@/lib/growth-analytics";
import { checkOfficialWebsite } from "@/lib/website-health";
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
    queryKey: ["official-website-health"],
    queryFn: checkOfficialWebsite,
    retry: false,
    staleTime: 30_000,
  });
  const analyticsCheck = useQuery({
    queryKey: ["growth-analytics-report"],
    queryFn: getGrowthAnalyticsReport,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const report = websiteCheck.data;
  const analytics = analyticsCheck.data;
  const isChecking = websiteCheck.isFetching;
  const isHealthy = report?.availability === "healthy";
  const isUnavailable = report?.availability === "unavailable";

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
              A direct, read-only check of{" "}
              <span className="font-medium text-foreground">growth.cossanexusholdings.co.za</span>.
              It checks the public homepage without editing it, publishing content or claiming a
              full SEO audit.
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
              {isChecking ? "Checking GROWTH..." : "Run website check"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <a href="https://growth.cossanexusholdings.co.za" target="_blank" rel="noreferrer">
                Open GROWTH website <ExternalLink className="ml-1.5 h-4 w-4" />
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
                . The workspace can read aggregate reporting only after the protected Cossa service
                account is authorised as a Viewer.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void analyticsCheck.refetch()}
            disabled={analyticsCheck.isFetching}
            className="shrink-0 border-primary/40 text-primary hover:bg-primary/10"
          >
            {analyticsCheck.isFetching ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Refresh GA4 report
          </Button>
        </div>

        {analyticsCheck.isError ? (
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

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="glass-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Verified check result
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">GROWTH homepage health</h2>
            </div>
            {report ? (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  isHealthy
                    ? "border-success/30 bg-success/10 text-success"
                    : isUnavailable
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {report.availability}
              </span>
            ) : null}
          </div>

          {websiteCheck.isError ? (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {websiteCheck.error instanceof Error
                  ? websiteCheck.error.message
                  : "The website check could not be completed."}
              </span>
            </div>
          ) : report ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="HTTP response"
                  value={report.http_status ? String(report.http_status) : "No response"}
                />
                <Metric
                  label="Response time"
                  value={
                    report.response_time_ms === null
                      ? "Not measured"
                      : `${report.response_time_ms} ms`
                  }
                />
                <Metric
                  label="Page title"
                  value={report.title_detected ? "Detected" : "Not detected"}
                />
                <Metric
                  label="Indexing signal"
                  value={report.noindex_detected ? "Noindex found" : "No noindex found"}
                />
              </div>

              <div className="mt-5 rounded-lg border border-border/60 bg-card/40 p-4 text-sm">
                <div className="flex items-start gap-2">
                  {report.issues.length === 0 ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">
                      {report.issues.length === 0
                        ? "No issue was found by this limited check."
                        : "Items requiring review"}
                    </p>
                    {report.page_title ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Homepage title: {report.page_title}
                      </p>
                    ) : null}
                    {report.issues.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {report.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Checked {new Date(report.checked_at).toLocaleString()}. {report.monitoring_scope}
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
              The first live check starts automatically while this page opens. You can run another
              check at any time.
            </div>
          )}
        </article>

        <aside className="glass-card p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Worker ownership
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">Website &amp; SEO Monitor</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This worker owns the internal check, records verified issues for the strategy team and
            escalates decisions to the AI CEO. It cannot edit the website, publish content or access
            hosting credentials.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-5 w-full border-primary/40 text-primary hover:bg-primary/10"
          >
            <Link to="/ai/workforce">
              <Activity className="mr-1.5 h-4 w-4" />
              Open workforce
            </Link>
          </Button>
        </aside>
      </section>

      <section className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Current monitoring boundary</p>
            <p className="mt-1 text-xs leading-5">
              This is a real on-demand homepage check. The GA4 section can read only aggregate data
              from the confirmed GROWTH property after its protected service-account connection is
              authorised. Neither feature sends alerts while nobody is signed in, monitors every
              page, checks security certificates or makes website changes.
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
