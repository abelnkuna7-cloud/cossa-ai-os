import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { inspectAllMissionContextIntegrity } from "@/lib/agent-context-integrity";
import { contextIntegrityNotificationEvents } from "@/lib/context-integrity-notification-events";
import { listNotificationEvents } from "@/lib/notification-events";
import { mergeNotificationEventsForPresentation } from "@/lib/notification-event-presentation";
import { notificationEventsToWorkspaceItems } from "@/lib/notification-event-items";
import {
  COSSA_ORGANISATION_ID,
  listEmployeeHandoffs,
  listWorkforceRuns,
} from "@/lib/workforce-data";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/notifications/events")({
  component: CanonicalNotificationEventsPage,
  head: () => ({
    meta: [
      { title: "Notification Events — Cossa AI" },
      {
        name: "description",
        content: "Evidence-backed operational events from trusted Cossa backend sources.",
      },
    ],
  }),
});

function fmt(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return value.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CanonicalNotificationEventsPage() {
  const eventsQuery = useQuery({
    queryKey: ["notifications", "canonical-events"],
    queryFn: () => listNotificationEvents(250),
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const handoffsQuery = useQuery({
    queryKey: ["notifications", "context-integrity", "handoffs"],
    queryFn: listEmployeeHandoffs,
    retry: false,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const runsQuery = useQuery({
    queryKey: ["notifications", "context-integrity", "runs"],
    queryFn: listWorkforceRuns,
    retry: false,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const integrityReports = inspectAllMissionContextIntegrity({
    handoffs: handoffsQuery.data ?? [],
    runs: runsQuery.data ?? [],
  });
  const projectedIntegrityEvents = contextIntegrityNotificationEvents({
    organisationId: COSSA_ORGANISATION_ID,
    reports: integrityReports,
  });
  const events = mergeNotificationEventsForPresentation({
    persisted: eventsQuery.data ?? [],
    projected: projectedIntegrityEvents,
  });
  const items = notificationEventsToWorkspaceItems(events);
  const counts = {
    urgent: items.filter((item) => item.priority === "urgent").length,
    high: items.filter((item) => item.priority === "high").length,
    normal: items.filter((item) => item.priority === "normal").length,
  };
  const loading = eventsQuery.isLoading || handoffsQuery.isLoading || runsQuery.isLoading;
  const unavailable = eventsQuery.isError && handoffsQuery.isError && runsQuery.isError;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <Bell className="h-5 w-5" />
          </div>
          <StatusBadge status={unavailable ? "Unavailable" : loading ? "Checking" : "Live"} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Canonical notification events</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Trusted, evidence-backed events recorded by protected Cossa backend sources, plus safe live
          context-integrity projections. Duplicate event keys are collapsed so the same issue is not
          counted twice before and after persistence. This workspace is read-only and does not send
          messages or execute external actions.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Stat label="Urgent" value={counts.urgent} tone="urgent" />
          <Stat label="High" value={counts.high} tone="high" />
          <Stat label="Normal / info" value={counts.normal} tone="normal" />
        </div>
      </section>

      <section className="glass-card p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading operational events…
          </p>
        ) : unavailable ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <div className="font-medium">Operational event sources unavailable</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Existing operational records have not been changed and no healthy state is being inferred.
                </p>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div className="font-display text-lg font-semibold">No operational events recorded</div>
            <p className="max-w-md text-sm text-muted-foreground">
              This means no trusted canonical event or live context-integrity failure is currently visible.
              It does not mean every business system is healthy.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className={
                      item.priority === "urgent"
                        ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                        : item.priority === "high"
                          ? "mt-0.5 h-4 w-4 shrink-0 text-primary"
                          : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium">{item.title}</div>
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {item.type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                    <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground md:grid-cols-2">
                      <span>
                        <strong className="text-foreground">Affected record:</strong>{" "}
                        {item.affectedRecord}
                      </span>
                      <span>
                        <strong className="text-foreground">Business:</strong>{" "}
                        {item.affectedBusiness}
                      </span>
                      <span>
                        <strong className="text-foreground">Occurred:</strong> {fmt(item.when)}
                      </span>
                      <span className="md:col-span-2">
                        <strong className="text-foreground">Why:</strong> {item.why}
                      </span>
                      <span className="md:col-span-2">
                        <strong className="text-foreground">Evidence:</strong> {item.evidence}
                      </span>
                      <span className="md:col-span-2">
                        <strong className="text-foreground">Recommended action:</strong>{" "}
                        {item.recommendedAction}
                      </span>
                    </div>
                    {item.href !== "/notifications" ? (
                      <a
                        href={item.href}
                        className="mt-3 inline-flex items-center rounded-md border border-primary/40 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-primary"
                      >
                        Open affected record <ArrowRight className="ml-1 h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "urgent" | "high" | "normal";
}) {
  const cls =
    tone === "urgent"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : tone === "high"
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/60 bg-card/40 text-muted-foreground";
  return (
    <div className={`rounded-xl border px-4 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
