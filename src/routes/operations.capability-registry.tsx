import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Database,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  listCapabilityRegistry,
  listMetricDefinitions,
  type CapabilityOperationalStatus,
} from "@/lib/truth-layer";

export const Route = createFileRoute("/operations/capability-registry")({
  component: CapabilityRegistryPage,
  head: () => ({
    meta: [
      { title: "Capability Registry — Cossa Growth" },
      {
        name: "description",
        content: "Verified operational status and data provenance for Cossa Growth capabilities.",
      },
    ],
  }),
});

function humanise(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No verification recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recorded time unavailable"
    : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusTone(status: CapabilityOperationalStatus | string): string {
  if (status === "operational") return "border-success/40 bg-success/10 text-success";
  if (status === "partially_operational" || status === "manual" || status === "waiting_approval") {
    return "border-primary/40 bg-primary/10 text-primary";
  }
  if (
    status === "degraded" ||
    status === "integration_required" ||
    status === "paid_access_required"
  ) {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  if (status === "failed" || status === "disabled")
    return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border/70 bg-muted/40 text-muted-foreground";
}

function CapabilityRegistryPage() {
  const capabilitiesQuery = useQuery({
    queryKey: ["capability-registry"],
    queryFn: listCapabilityRegistry,
    staleTime: 30_000,
  });
  const metricsQuery = useQuery({
    queryKey: ["metric-definitions"],
    queryFn: listMetricDefinitions,
    staleTime: 30_000,
  });

  const capabilities = capabilitiesQuery.data ?? [];
  const metrics = metricsQuery.data ?? [];
  const isLoading = capabilitiesQuery.isLoading || metricsQuery.isLoading;
  const hasError = capabilitiesQuery.isError || metricsQuery.isError;
  const verified = capabilities.filter(
    (capability) => capability.operational_status === "operational",
  ).length;
  const needsAttention = capabilities.filter((capability) =>
    ["degraded", "failed", "integration_required", "paid_access_required"].includes(
      capability.operational_status,
    ),
  ).length;
  const awaitingAssessment = capabilities.filter(
    (capability) => capability.operational_status === "not_assessed",
  ).length;

  function refresh() {
    void capabilitiesQuery.refetch();
    void metricsQuery.refetch();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Cossa Growth truth layer
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
                Capability Registry
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                A source-of-truth view of what Growth can do, what has actually been verified, and
                what still needs a connection, approval, or live check.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh registry
          </Button>
        </div>
      </section>

      {hasError ? (
        <section
          role="alert"
          className="glass-card flex items-start gap-3 border-destructive/40 p-5"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">The registry could not be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No capability has been changed. Check authenticated access and refresh the registry.
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RegistryStat
          icon={Database}
          label="Registered capabilities"
          value={isLoading ? "Loading" : String(capabilities.length)}
        />
        <RegistryStat
          icon={CheckCircle2}
          label="Operationally verified"
          value={isLoading ? "Loading" : String(verified)}
        />
        <RegistryStat
          icon={CircleDashed}
          label="Awaiting assessment"
          value={isLoading ? "Loading" : String(awaitingAssessment)}
        />
        <RegistryStat
          icon={ShieldCheck}
          label="Needs attention"
          value={isLoading ? "Loading" : String(needsAttention)}
        />
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Operational capabilities</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              “Not assessed” is intentional: it means no successful live verification has been
              recorded yet, not that the capability is working.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Browser access is read-only; protected server workflows record outcomes.
          </span>
        </div>

        {isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading capability records…</p>
        ) : capabilities.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No capability records are available for this organisation yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {capabilities.map((capability) => (
              <article
                key={capability.id}
                className="rounded-xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {capability.module}
                    </p>
                    <h3 className="mt-1 font-semibold">{capability.name}</h3>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(capability.operational_status)}`}
                  >
                    {humanise(capability.operational_status)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{capability.purpose}</p>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-widest text-muted-foreground">Automation</dt>
                    <dd className="mt-1 font-medium">{humanise(capability.automation_status)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-muted-foreground">Approval</dt>
                    <dd className="mt-1 font-medium">
                      {humanise(capability.approval_requirement)}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-muted-foreground">
                      Required connection
                    </dt>
                    <dd className="mt-1 font-medium">
                      {capability.required_integration ?? "None recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-muted-foreground">
                      Latest verification
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(capability.verified_at ?? capability.last_success_at)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-border/50 pt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Evidence sources
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {capability.data_sources.length > 0
                      ? capability.data_sources.join(" · ")
                      : "No source is registered"}
                  </p>
                  {capability.last_error ? (
                    <p className="mt-2 text-xs text-warning">
                      Latest recorded issue: {capability.last_error}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">Metric definitions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These definitions prevent pipeline, quotation value, supplier availability, and
            payment-confirmed revenue from being treated as the same thing.
          </p>
        </div>

        {isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading metric definitions…</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Sources</th>
                  <th className="px-4 py-3 font-medium">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {metrics.map((metric) => (
                  <tr key={metric.id}>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium">{metric.name}</p>
                      <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                        {metric.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-xs">
                      {humanise(metric.semantic_type)} · {humanise(metric.value_kind)}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                      {metric.source_systems.join(" · ") || "No source"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(metric.availability_status)}`}
                      >
                        {humanise(metric.availability_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function RegistryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card p-5">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
