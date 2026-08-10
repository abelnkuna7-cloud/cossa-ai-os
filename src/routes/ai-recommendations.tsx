import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  listVerifiedGrowthSignals,
  totalSignalValue,
  type GrowthSignalArea,
  type GrowthSignalImpact,
} from "@/lib/growth-signals";
import { fmtCurrency } from "@/components/crud-workspace";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/ai-recommendations")({
  component: Recommendations,
  head: () => ({
    meta: [
      { title: "AI Recommendations — Cossa AI" },
      {
        name: "description",
        content: "Evidence-led next actions calculated from the live Cossa Nexus CRM.",
      },
    ],
  }),
});

const AREAS: Array<GrowthSignalArea | "All"> = ["All", "Sales", "Customers"];

const impactTone: Record<GrowthSignalImpact, string> = {
  High: "text-primary border-primary/40 bg-primary/10",
  Medium: "text-warning border-warning/30 bg-warning/10",
};

function Recommendations() {
  const [filter, setFilter] = useState<GrowthSignalArea | "All">("All");
  const signalsQuery = useQuery({
    queryKey: ["verified-growth-signals"],
    queryFn: listVerifiedGrowthSignals,
    staleTime: 30_000,
  });
  const signals = signalsQuery.data ?? [];
  const filtered = filter === "All" ? signals : signals.filter((signal) => signal.area === filter);
  const highImpact = signals.filter((signal) => signal.impact === "High").length;
  const trackedValue = totalSignalValue(signals);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Sparkles className="h-4 w-4" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Verified <span className="text-gradient-gold">Recommendations</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Practical next actions calculated from current CRM records. Cossa does not invent
              customer, revenue, campaign or competitor information.
            </p>
          </div>
          <Button
            onClick={() => void signalsQuery.refetch()}
            disabled={signalsQuery.isFetching}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            {signalsQuery.isFetching ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Refresh live signals
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Verified actions" value={String(signals.length)} />
        <Stat label="High priority" value={String(highImpact)} tone="text-primary" />
        <Stat
          label="Value on linked records"
          value={fmtCurrency(trackedValue)}
          tone="text-success"
        />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {AREAS.map((area) => (
          <button
            key={area}
            onClick={() => setFilter(area)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === area
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {area}
          </button>
        ))}
      </div>

      {signalsQuery.isLoading ? (
        <section className="glass-card flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading verified CRM signals…
        </section>
      ) : signalsQuery.isError ? (
        <section
          role="alert"
          className="glass-card flex items-start gap-3 border-destructive/40 p-6"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">Recommendations could not be calculated</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No information has been changed. Check your CRM access, then refresh this page.
            </p>
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <section className="glass-card p-6">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <h2 className="mt-3 font-semibold">No verified action needs attention right now</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cossa checked the current lead scores, open pipeline, quotation dates and follow-up
            dates. Add or update live CRM records to reveal new signals.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((signal) => {
            const Icon = signal.area === "Customers" ? Users : WalletCards;
            return (
              <article key={signal.id} className="glass-card flex flex-col gap-3 p-5">
                <header className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {signal.area}
                      </div>
                      <h3 className="font-semibold leading-tight">{signal.title}</h3>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      impactTone[signal.impact],
                    )}
                  >
                    {signal.impact}
                  </span>
                </header>
                <p className="text-sm text-muted-foreground">{signal.detail}</p>
                <div className="rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium">Evidence</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{signal.evidence}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Human review required
                  </span>
                  {signal.value !== null && (
                    <span className="font-semibold text-success">{fmtCurrency(signal.value)}</span>
                  )}
                </div>
                <Button
                  asChild
                  size="sm"
                  className="mt-1 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  <Link to={signal.to}>
                    {signal.actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="glass-card p-4 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-xl font-semibold", tone)}>{value}</div>
    </div>
  );
}
