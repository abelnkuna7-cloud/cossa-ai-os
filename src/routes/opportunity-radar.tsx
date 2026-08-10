import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  DollarSign,
  Loader2,
  RefreshCw,
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

export const Route = createFileRoute("/opportunity-radar")({
  component: OpportunityRadar,
  head: () => ({
    meta: [
      { title: "Opportunity Radar — Cossa AI" },
      {
        name: "description",
        content: "Evidence-led revenue and customer actions from the live Cossa Nexus CRM.",
      },
      { property: "og:title", content: "Opportunity Radar — Cossa AI" },
    ],
  }),
});

const AREAS: Array<GrowthSignalArea | "All"> = ["All", "Sales", "Customers"];

const impactTone: Record<GrowthSignalImpact, string> = {
  High: "border-primary/40 bg-primary/10 text-primary",
  Medium: "border-warning/40 bg-warning/10 text-warning",
};

function OpportunityRadar() {
  const [activeArea, setActiveArea] = useState<GrowthSignalArea | "All">("All");
  const signalsQuery = useQuery({
    queryKey: ["verified-growth-signals"],
    queryFn: listVerifiedGrowthSignals,
    staleTime: 30_000,
  });
  const signals = signalsQuery.data ?? [];
  const shown =
    activeArea === "All" ? signals : signals.filter((signal) => signal.area === activeArea);
  const highPriority = signals.filter((signal) => signal.impact === "High").length;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Crosshair className="h-4 w-4" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Opportunity <span className="text-gradient-gold">Radar</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A CRM-first scan for revenue and customer actions. Every item below is supported by a
              live lead, quotation, opportunity or follow-up record.
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
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Scan live CRM
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Verified signals" value={String(signals.length)} icon={Crosshair} />
        <Metric
          label="High-priority actions"
          value={String(highPriority)}
          icon={Sparkles}
          tone="text-primary"
        />
        <Metric
          label="Value on linked records"
          value={fmtCurrency(totalSignalValue(signals))}
          icon={DollarSign}
          tone="text-success"
        />
      </section>

      <div className="flex flex-wrap gap-1.5">
        {AREAS.map((area) => {
          const count =
            area === "All"
              ? signals.length
              : signals.filter((signal) => signal.area === area).length;
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                activeArea === area
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {area === "All" ? "All verified opportunities" : area}
              <span className="rounded-full bg-background/40 px-1.5 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {signalsQuery.isLoading ? (
        <section className="glass-card flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Scanning live CRM records…
        </section>
      ) : signalsQuery.isError ? (
        <section
          role="alert"
          className="glass-card flex items-start gap-3 border-destructive/40 p-6"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">The CRM scan could not be completed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No data was changed. Check the underlying CRM access and retry the scan.
            </p>
          </div>
        </section>
      ) : shown.length === 0 ? (
        <section className="glass-card p-6">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <h2 className="mt-3 font-semibold">No verified opportunities need attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The current CRM records do not match the evidence rules. This is preferable to showing
            invented prospects, customers or revenue.
          </p>
        </section>
      ) : (
        <section className="grid gap-3">
          {shown.map((signal) => {
            const Icon = signal.area === "Customers" ? Users : WalletCards;
            return (
              <article
                key={signal.id}
                className="glass-card flex flex-col gap-3 p-4 md:flex-row md:items-center"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{signal.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{signal.detail}</p>
                  <p className="mt-1 text-xs text-primary/90">{signal.evidence}</p>
                </div>
                <div className="flex items-center gap-4 md:ml-auto">
                  {signal.value !== null && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Recorded value
                      </div>
                      <div className="text-sm font-semibold text-success">
                        {fmtCurrency(signal.value)}
                      </div>
                    </div>
                  )}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      impactTone[signal.impact],
                    )}
                  >
                    {signal.impact}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                  >
                    <Link to={signal.to}>
                      {signal.actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  icon: typeof Crosshair;
  tone?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg bg-primary/15", tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={cn("mt-0.5 font-display text-xl font-semibold", tone)}>{value}</div>
        </div>
      </div>
    </div>
  );
}
