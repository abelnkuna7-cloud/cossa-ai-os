import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  listVerifiedGrowthSignals,
  type GrowthSignalArea,
  type GrowthSignalImpact,
} from "@/lib/growth-signals";
import { cn } from "@/lib/utils";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/ai/coach")({
  component: AiCoach,
  head: () => ({
    meta: [
      { title: "AI Business Coach â€” Cossa AI" },
      {
        name: "description",
        content: "Evidence-led business coaching from current Cossa CRM records.",
      },
      { property: "og:title", content: "AI Business Coach â€” Cossa AI" },
    ],
  }),
});

const impactTone: Record<GrowthSignalImpact, string> = {
  High: "border-primary/40 bg-primary/10 text-primary",
  Medium: "border-warning/40 bg-warning/10 text-warning",
};

function AiCoach() {
  const signalsQuery = useQuery({
    queryKey: ["verified-growth-signals"],
    queryFn: listVerifiedGrowthSignals,
    staleTime: 30_000,
  });
  const signals = signalsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="gold-glow flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <GraduationCap className="h-4 w-4" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              AI Business <span className="text-gradient-gold">Coach</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Evidence-led next actions from live CRM records. Cossa does not display invented
              customers, advertising results, revenue or completed work.
            </p>
          </div>
          <Button
            onClick={() => void signalsQuery.refetch()}
            disabled={signalsQuery.isFetching}
            className="gold-glow bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {signalsQuery.isFetching ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Refresh coaching signals
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Verified coaching signals</h2>
          </div>

          {signalsQuery.isLoading ? (
            <CoachState
              icon={Loader2}
              title="Loading live CRM signals"
              detail="Cossa is checking recorded leads, quotations, opportunities and follow-ups."
              spin
            />
          ) : signalsQuery.isError ? (
            <CoachState
              icon={AlertCircle}
              title="Coaching signals could not be calculated"
              detail="No information has been changed. Check CRM access, then refresh this page."
              tone="text-destructive"
            />
          ) : signals.length === 0 ? (
            <CoachState
              icon={CheckCircle2}
              title="No verified action needs attention right now"
              detail="The current CRM records do not meet a rule that requires attention. Add or update records to reveal genuine coaching signals."
              tone="text-success"
            />
          ) : (
            <ul className="space-y-3">
              {signals.map((signal) => (
                <CoachSignal key={signal.id} {...signal} />
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="glass-card p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              <h2 className="text-sm font-semibold">How this coach works</h2>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              It checks only recorded CRM dates, statuses, scores and values. It does not inspect
              social accounts, advertising, website traffic or customer activity until an authorised
              connection supplies that data.
            </p>
          </section>

          <section className="glass-card p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <GraduationCap className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Ask the coach</h2>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Use Cossa AI for a source-grounded planning discussion. Important customer, financial
              and external actions still require owner review.
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-3 w-full border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link to="/ai/cossa">
                Open Cossa AI <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CoachSignal({
  area,
  impact,
  title,
  detail,
  evidence,
  to,
  actionLabel,
}: {
  area: GrowthSignalArea;
  impact: GrowthSignalImpact;
  title: string;
  detail: string;
  evidence: string;
  to: "/sales/leads" | "/sales/pipeline" | "/sales/quotations" | "/sales/follow-ups";
  actionLabel: string;
}) {
  const Icon = area === "Customers" ? Users : WalletCards;

  return (
    <li className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", impactTone[impact])}>
              {impact}
            </span>
          </div>
          <p className="mt-2 text-xs text-primary/90">Evidence: {evidence}</p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-3 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Link to={to}>
              {actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

function CoachState({
  icon: Icon,
  title,
  detail,
  tone = "text-muted-foreground",
  spin = false,
}: {
  icon: typeof Sparkles;
  title: string;
  detail: string;
  tone?: string;
  spin?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <Icon className={cn("h-5 w-5", tone, spin && "animate-spin")} />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
