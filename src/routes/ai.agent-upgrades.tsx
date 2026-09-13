import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, ShieldCheck, Sparkles, Workflow } from "lucide-react";

import {
  AGENT_CAPABILITY_BLUEPRINT,
  type AgentCapabilityUpgradeStatus,
} from "@/lib/agent-capability-blueprint";

export const Route = createFileRoute("/ai/agent-upgrades")({
  component: AgentUpgradesPage,
  head: () => ({
    meta: [
      { title: "Agent Upgrades — Cossa GROWTH" },
      {
        name: "description",
        content:
          "Cossa-owned capability upgrade plan for stronger task execution, context, handoffs, progress and owner control.",
      },
    ],
  }),
});

function statusLabel(status: AgentCapabilityUpgradeStatus): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: AgentCapabilityUpgradeStatus): string {
  if (status === "existing_foundation") return "border-success/40 bg-success/10 text-success";
  if (status === "ready_to_wire") return "border-primary/40 bg-primary/10 text-primary";
  return "border-warning/40 bg-warning/10 text-warning";
}

function AgentUpgradesPage() {
  const foundation = AGENT_CAPABILITY_BLUEPRINT.filter(
    (item) => item.status === "existing_foundation",
  ).length;
  const ready = AGENT_CAPABILITY_BLUEPRINT.filter((item) => item.status === "ready_to_wire").length;
  const runtime = AGENT_CAPABILITY_BLUEPRINT.filter(
    (item) => item.status === "requires_runtime_work",
  ).length;
  const ui = AGENT_CAPABILITY_BLUEPRINT.filter((item) => item.status === "requires_ui_work").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Cossa AI capability upgrade
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">Agent Upgrades</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Additive upgrades for stronger multi-step task execution, durable context, visible
              progress, handoffs, reusable playbooks and owner-controlled execution. This workspace
              is a Cossa-owned implementation plan; it does not copy another product's UI or source
              code.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CheckCircle2} label="Existing foundation" value={foundation} />
        <Stat icon={Workflow} label="Ready to wire" value={ready} />
        <Stat icon={CircleDashed} label="Runtime work" value={runtime} />
        <Stat icon={ShieldCheck} label="UI work" value={ui} />
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Capability map</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every upgrade is mapped to existing Cossa workforce primitives so we extend the system
              instead of rebuilding it.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Production execution remains approval-gated.</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {AGENT_CAPABILITY_BLUEPRINT.map((item) => (
            <article key={item.id} className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.purpose}</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-widest text-muted-foreground">Existing primitives</dt>
                  <dd className="mt-1 font-medium">{item.existingPrimitives.join(" · ")}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-widest text-muted-foreground">Risk</dt>
                  <dd className="mt-1 font-medium capitalize">{item.risk}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-border/50 pt-3 text-xs">
                <p>
                  <strong>Required outcome:</strong> {item.requiredOutcome}
                </p>
                <p className="mt-2 text-muted-foreground">
                  <strong className="text-foreground">Safety boundary:</strong> {item.safetyBoundary}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
