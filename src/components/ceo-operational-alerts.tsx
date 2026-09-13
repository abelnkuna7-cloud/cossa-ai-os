import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, BellRing } from "lucide-react";

import { inspectAllMissionContextIntegrity } from "@/lib/agent-context-integrity";
import { contextIntegrityNotificationEvents } from "@/lib/context-integrity-notification-events";
import {
  mergeNotificationEventsForPresentation,
  topCeoNotificationEvents,
} from "@/lib/notification-event-presentation";
import { listNotificationEvents } from "@/lib/notification-events";
import {
  COSSA_ORGANISATION_ID,
  listEmployeeHandoffs,
  listWorkforceRuns,
} from "@/lib/workforce-data";

export function CeoOperationalAlerts() {
  const eventsQuery = useQuery({
    queryKey: ["ceo", "canonical-events"],
    queryFn: () => listNotificationEvents(100),
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const handoffsQuery = useQuery({
    queryKey: ["ceo", "context-integrity", "handoffs"],
    queryFn: listEmployeeHandoffs,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const runsQuery = useQuery({
    queryKey: ["ceo", "context-integrity", "runs"],
    queryFn: listWorkforceRuns,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const projected = useMemo(() => {
    if (!handoffsQuery.data || !runsQuery.data) return [];
    const reports = inspectAllMissionContextIntegrity({
      handoffs: handoffsQuery.data,
      runs: runsQuery.data,
    });
    return contextIntegrityNotificationEvents({
      organisationId: COSSA_ORGANISATION_ID,
      reports,
    });
  }, [handoffsQuery.data, runsQuery.data]);

  const merged = useMemo(
    () =>
      mergeNotificationEventsForPresentation({
        persisted: eventsQuery.data ?? [],
        projected,
      }),
    [eventsQuery.data, projected],
  );
  const top = topCeoNotificationEvents(merged, 5);
  const unavailable = eventsQuery.isError && handoffsQuery.isError && runsQuery.isError;

  return (
    <section className="glass-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BellRing className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest">CEO intelligence</span>
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold">Priority operational alerts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Canonical events plus live context-integrity projections, deduplicated by event key. No external action is executed here.
          </p>
        </div>
        <Link to="/notifications/events" className="inline-flex items-center text-xs font-medium text-primary">
          Open notifications <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>

      {unavailable ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>Operational alert sources are unavailable. No healthy state is being inferred.</span>
        </div>
      ) : top.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
          No priority event is currently recorded. This does not prove every business system is healthy.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {top.map((event) => (
            <article key={event.event_key} className="rounded-lg border border-border/60 bg-card/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={event.severity === "critical" ? "text-[10px] uppercase tracking-widest text-destructive" : "text-[10px] uppercase tracking-widest text-primary"}>
                  {event.severity}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{event.category}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold">{event.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{event.summary}</p>
              {event.action_href ? (
                <Link to={event.action_href as never} className="mt-2 inline-flex items-center text-[10px] uppercase tracking-widest text-primary">
                  Review <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
