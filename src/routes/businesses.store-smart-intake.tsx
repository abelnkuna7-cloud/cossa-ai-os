import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import { resolveStoreOperationsAccess } from "@/lib/store-operations-access";

export const Route = createFileRoute("/businesses/store-smart-intake")({
  component: StoreSmartIntakeControlRoom,
  head: () => ({
    meta: [
      { title: "Store Smart Intake — GROWTH" },
      {
        name: "description",
        content: "Read-only control room for the Cossa Store supplier Smart Intake automation.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);
const STATUSES = ["pending", "processing", "prepared", "hold", "retry", "failed", "hard_hold"] as const;
type QueueStatus = (typeof STATUSES)[number];

type QueueRow = {
  id: string;
  intake_id: string;
  supplier_product_ref: string | null;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  locked_at: string | null;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  last_error_class: string | null;
  created_at: string;
  updated_at: string;
};

type QueueSnapshot = {
  rows: QueueRow[];
  counts: Record<QueueStatus, number>;
  total: number;
  processed: number;
  generatedAt: string;
};

async function loadQueue(): Promise<QueueSnapshot> {
  const access = await resolveStoreOperationsAccess(db as any);
  if (access.status !== "authorized") {
    throw new Error(
      access.status === "unauthenticated"
        ? "Sign in to GROWTH with an owner or administrator account to view Smart Intake."
        : "Owner or administrator access is required to view Smart Intake.",
    );
  }

  const { data, error } = await db
    .from("astrum_intake_v13_queue")
    .select(
      "id,intake_id,supplier_product_ref,status,attempts,max_attempts,next_attempt_at,locked_at,last_started_at,last_completed_at,last_error,last_error_class,created_at,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as QueueRow[];
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<QueueStatus, number>;
  for (const row of rows) {
    if (row.status in counts) counts[row.status] += 1;
  }
  const processed = counts.prepared + counts.hold + counts.failed + counts.hard_hold;
  return { rows, counts, total: rows.length, processed, generatedAt: new Date().toISOString() };
}

function statusLabel(status: QueueStatus) {
  return status === "hard_hold"
    ? "Hard Hold"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function activityTime(row: QueueRow) {
  return row.last_completed_at ?? row.last_started_at ?? row.updated_at;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA");
}

function StoreSmartIntakeControlRoom() {
  const queue = useQuery({
    queryKey: ["store", "astrum-smart-intake-v13-queue"],
    queryFn: loadQueue,
    refetchInterval: 60_000,
    staleTime: 20_000,
    retry: false,
  });

  const snapshot = queue.data;
  const rows = snapshot?.rows.slice(0, 40) ?? [];
  const attention = snapshot
    ? snapshot.counts.hold + snapshot.counts.retry + snapshot.counts.failed + snapshot.counts.hard_hold
    : 0;
  const progress = snapshot?.total ? Math.round((snapshot.processed / snapshot.total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <section className="glass-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
              <Link to="/businesses/store">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Cossa Store
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Store Operations</p>
                <h1 className="font-display text-3xl font-semibold">Smart Intake Control Room</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Permanent GROWTH control surface for Astrum Smart Intake V13. The server remains the engine;
              this screen is read-only monitoring and does not publish products, change CEO-approved prices,
              approve records or bypass publication gates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/35 bg-primary/5 px-3 py-1.5 text-xs text-primary">
              Automation active · every 10 min
            </span>
            <Button variant="outline" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${queue.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {queue.isPending ? (
        <section className="glass-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading the protected Smart Intake queue…
        </section>
      ) : queue.isError ? (
        <section className="glass-card border border-destructive/30 p-6">
          <div className="flex items-start gap-3 text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">Smart Intake access unavailable</h2>
              <p className="mt-1 text-sm">{queue.error.message}</p>
            </div>
          </div>
        </section>
      ) : snapshot ? (
        <>
          <section className="glass-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Astrum V13</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">Live queue health</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {snapshot.total.toLocaleString("en-ZA")} queue records · {progress}% terminally reviewed · {attention} need attention or evidence.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Updated {formatTime(snapshot.generatedAt)}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {STATUSES.map((status) => (
                <div key={status} className="rounded-xl border border-primary/25 bg-background/35 p-4">
                  <p className="text-xs text-muted-foreground">{statusLabel(status)}</p>
                  <p className="mt-1 text-2xl font-semibold">{snapshot.counts[status].toLocaleString("en-ZA")}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Recent queue activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest 40 records. Holds remain visible instead of being blindly retried.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4" /> Auto-refreshes every 60 seconds
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Astrum ref</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Attempts</th>
                    <th className="px-5 py-3">Reason / note</th>
                    <th className="px-5 py-3">Last activity</th>
                    <th className="px-5 py-3">Next attempt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-3 font-mono text-xs">{row.supplier_product_ref ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full border border-primary/30 px-2 py-1 text-xs">{statusLabel(row.status)}</span>
                      </td>
                      <td className="px-5 py-3">{row.attempts}/{row.max_attempts}</td>
                      <td className="max-w-xl px-5 py-3 text-muted-foreground">
                        {row.last_error ?? (row.status === "prepared" ? "Prepared for CEO review" : "—")}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{formatTime(activityTime(row))}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{formatTime(row.next_attempt_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="glass-card p-5">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">CEO gate preserved</h3>
              <p className="mt-1 text-sm text-muted-foreground">Prepared means ready for review, not approved or published.</p>
            </div>
            <div className="glass-card p-5">
              <PackageSearch className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">Evidence first</h3>
              <p className="mt-1 text-sm text-muted-foreground">Identity or evidence conflicts stay on hold instead of being invented or forced through.</p>
            </div>
            <div className="glass-card p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">Read-only control surface</h3>
              <p className="mt-1 text-sm text-muted-foreground">No bulk publish, price override, queue mutation or automation secret is exposed here.</p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
