import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export const Route = createFileRoute("/sales/lead-pipeline")({
  component: LeadPipelinePage,
  head: () => ({
    meta: [
      { title: "Lead Funnel — Cossa AI" },
      {
        name: "description",
        content:
          "Manage the canonical Cossa lead funnel from intake through qualification, quotation, negotiation and outcome.",
      },
    ],
  }),
});

interface LeadPipelineRecord {
  id: string;
  name: string;
  company: string | null;
  service: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  estimatedValue: number;
  createdAt: string;
}

interface StageDefinition {
  key: string;
  label: string;
  aliases: string[];
  description: string;
  terminal?: boolean;
}

const STAGES: StageDefinition[] = [
  {
    key: "new",
    label: "New / Intake",
    aliases: ["new", "new_lead"],
    description: "New enquiries and discovered leads awaiting first action.",
  },
  {
    key: "contacted",
    label: "Contacted",
    aliases: ["contacted"],
    description: "Initial contact or contact attempt has been recorded.",
  },
  {
    key: "qualified",
    label: "Qualified",
    aliases: ["qualified"],
    description: "Need, fit and next commercial step have been confirmed.",
  },
  {
    key: "inspection_booked",
    label: "Inspection",
    aliases: ["inspection_booked"],
    description: "Site visit, inspection or discovery meeting is booked.",
  },
  {
    key: "quote_sent",
    label: "Quote Sent",
    aliases: ["quote_sent"],
    description: "Quotation or proposal has been issued or recorded.",
  },
  {
    key: "follow_up",
    label: "Follow Up",
    aliases: ["follow_up"],
    description: "The lead needs an active follow-up action.",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    aliases: ["negotiation"],
    description: "Scope, price, timing or terms are being discussed.",
  },
  {
    key: "won",
    label: "Won",
    aliases: ["won"],
    description: "The commercial outcome has been won.",
    terminal: true,
  },
  {
    key: "converted",
    label: "Converted",
    aliases: ["converted"],
    description: "The lead was converted into a downstream customer/opportunity record.",
    terminal: true,
  },
  {
    key: "completed",
    label: "Completed",
    aliases: ["completed", "referral_requested"],
    description: "The lead lifecycle or resulting work has been completed.",
    terminal: true,
  },
  {
    key: "lost",
    label: "Lost",
    aliases: ["lost", "rejected"],
    description: "The lead did not proceed or was deliberately rejected.",
    terminal: true,
  },
];

const EDITABLE_STAGE_OPTIONS = [
  ["new", "New / Intake"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["inspection_booked", "Inspection"],
  ["quote_sent", "Quote Sent"],
  ["follow_up", "Follow Up"],
  ["negotiation", "Negotiation"],
  ["won", "Won"],
  ["completed", "Completed"],
  ["lost", "Lost"],
] as const;

function cleanStage(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function stageDefinition(value: string): StageDefinition | null {
  const clean = cleanStage(value);
  return STAGES.find((stage) => stage.aliases.includes(clean)) ?? null;
}

async function listLeadPipeline(): Promise<LeadPipelineRecord[]> {
  const { data, error } = await db
    .from("leads")
    .select(
      [
        "id",
        "name",
        "full_name",
        "company",
        "service",
        "phone",
        "source",
        "stage",
        "status",
        "estimated_value",
        "created_at",
      ].join(","),
    )
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Unable to load the lead funnel: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name ?? row.full_name ?? "").trim() || "Unnamed lead",
    company: typeof row.company === "string" && row.company.trim() ? row.company.trim() : null,
    service: typeof row.service === "string" && row.service.trim() ? row.service.trim() : null,
    phone: typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
    source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : null,
    stage: cleanStage(row.stage ?? row.status ?? "new"),
    estimatedValue: Number.isFinite(Number(row.estimated_value)) ? Number(row.estimated_value) : 0,
    createdAt: String(row.created_at ?? ""),
  }));
}

async function updateLeadStage(id: string, stage: string): Promise<void> {
  const clean = cleanStage(stage);
  const allowed = EDITABLE_STAGE_OPTIONS.some(([value]) => value === clean);

  if (!allowed) {
    throw new Error("That lead stage is not an authorised pipeline stage.");
  }

  const { data, error } = await db
    .from("leads")
    .update({
      stage: clean,
      status: clean,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to update the lead stage: ${error.message}`);
  }

  if (!data) {
    throw new Error("The lead was not found or access was denied.");
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function LeadPipelinePage() {
  const queryClient = useQueryClient();
  const leadsQuery = useQuery({
    queryKey: ["sales-lead-pipeline"],
    queryFn: listLeadPipeline,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => updateLeadStage(id, stage),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales-lead-pipeline"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);
      toast.success("Lead stage updated");
    },
    onError: (error) => {
      toast.error("Lead stage update failed", {
        description: error instanceof Error ? error.message : "The lead could not be updated.",
      });
    },
  });

  const rows = leadsQuery.data ?? [];
  const unmapped = rows.filter((lead) => !stageDefinition(lead.stage));

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <GitBranch className="h-5 w-5" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Lead Funnel</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              The canonical lead-stage pipeline from the shared Cossa CRM. Legacy and newer lead
              stages are shown together so records are never silently hidden.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => leadsQuery.refetch()}
              disabled={leadsQuery.isFetching}
            >
              {leadsQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales/leads">Open Leads</Link>
            </Button>
            <Button asChild>
              <Link to="/sales/pipeline">
                Opportunity Pipeline
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            All leads
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">{rows.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Open funnel
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {rows.filter((lead) => !stageDefinition(lead.stage)?.terminal).length}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Won / converted
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {rows.filter((lead) => ["won", "converted"].includes(lead.stage)).length}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Unmapped stages
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">{unmapped.length}</div>
        </div>
      </section>

      {leadsQuery.isError ? (
        <section className="glass-card flex items-start gap-3 border-destructive/30 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">Lead funnel could not be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {leadsQuery.error instanceof Error
                ? leadsQuery.error.message
                : "An unknown data error occurred."}
            </p>
          </div>
        </section>
      ) : leadsQuery.isLoading ? (
        <section className="glass-card flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the canonical lead funnel…
        </section>
      ) : (
        <section className="overflow-x-auto pb-4">
          <div className="grid grid-flow-col auto-cols-[310px] gap-4">
            {STAGES.map((stage) => {
              const items = rows.filter((lead) => stage.aliases.includes(lead.stage));
              const total = items.reduce((sum, lead) => sum + lead.estimatedValue, 0);

              return (
                <article
                  key={stage.key}
                  className="glass-card flex max-h-[72vh] min-h-[340px] flex-col overflow-hidden"
                >
                  <header className="border-b border-border/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display font-semibold">{stage.label}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                        {items.length}
                      </span>
                    </div>
                    {total > 0 ? (
                      <div className="mt-2 text-xs text-primary">
                        Recorded estimate: {formatCurrency(total)}
                      </div>
                    ) : null}
                  </header>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                    {items.map((lead) => (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-border/60 bg-card/45 p-3"
                      >
                        <div className="font-medium">{lead.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[lead.company, lead.service, lead.phone].filter(Boolean).join(" · ") ||
                            "No company/service/contact detail recorded"}
                        </div>
                        {lead.source ? (
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            Source: {lead.source}
                          </div>
                        ) : null}
                        {lead.estimatedValue > 0 ? (
                          <div className="mt-2 text-xs text-primary">
                            Estimated value: {formatCurrency(lead.estimatedValue)}
                          </div>
                        ) : null}

                        <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
                          Move stage
                          <select
                            value={
                              stage.key === "new" && lead.stage === "new_lead" ? "new" : lead.stage
                            }
                            disabled={stageMutation.isPending}
                            onChange={(event) => {
                              if (event.target.value === lead.stage) return;
                              stageMutation.mutate({ id: lead.id, stage: event.target.value });
                            }}
                            className="mt-1 w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60"
                          >
                            {EDITABLE_STAGE_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))}

                    {items.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No leads in this stage.
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {unmapped.length > 0 ? (
              <article className="glass-card flex max-h-[72vh] min-h-[340px] flex-col overflow-hidden border-amber-500/30">
                <header className="border-b border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-semibold">Needs Mapping</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Real records using a stage that this funnel does not yet classify. They are
                        shown rather than hidden.
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                      {unmapped.length}
                    </span>
                  </div>
                </header>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  {unmapped.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-border/60 bg-card/45 p-3"
                    >
                      <div className="font-medium">{lead.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Current stage: {lead.stage}
                      </div>
                      <select
                        defaultValue=""
                        disabled={stageMutation.isPending}
                        onChange={(event) => {
                          if (!event.target.value) return;
                          stageMutation.mutate({ id: lead.id, stage: event.target.value });
                        }}
                        className="mt-3 w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-xs text-foreground"
                      >
                        <option value="" disabled>
                          Map deliberately…
                        </option>
                        {EDITABLE_STAGE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
