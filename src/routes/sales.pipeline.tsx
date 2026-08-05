import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  createProjectFromOpportunity,
  salesOpportunities,
  type SalesOpportunity,
} from "@/lib/business-data";
import {
  fmtCurrency,
  fmtDate,
} from "@/components/crud-workspace";

export const Route = createFileRoute(
  "/sales/pipeline",
)({
  component: PipelinePage,
  head: () => ({
    meta: [
      {
        title:
          "Sales Pipeline — Cossa AI",
      },
      {
        name: "description",
        content:
          "Manage live sales opportunities through prospecting, qualification, proposal, negotiation, closing and project conversion.",
      },
      {
        property: "og:title",
        content:
          "Sales Pipeline — Cossa AI",
      },
      {
        property: "og:description",
        content:
          "Production sales pipeline for Cossa Nexus Holdings.",
      },
    ],
  }),
});

const ACTIVE_STAGES = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
] as const;

const CLOSED_STAGES = [
  "won",
  "lost",
] as const;

const STAGES = [
  ...ACTIVE_STAGES,
  ...CLOSED_STAGES,
] as const;

type PipelineStage =
  (typeof STAGES)[number];

interface StageDefinition {
  stage: PipelineStage;
  label: string;
  description: string;
}

interface WonConversionResult {
  opportunityId: string;
  opportunityTitle: string;
  projectId: string;
  projectName: string;
}

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: "prospect",
    label: "Prospect",
    description:
      "Potential opportunity identified but not yet qualified.",
  },
  {
    stage: "qualified",
    label: "Qualified",
    description:
      "Need, fit and contact route have been confirmed.",
  },
  {
    stage: "proposal",
    label: "Proposal",
    description:
      "A quotation, proposal or solution has been prepared.",
  },
  {
    stage: "negotiation",
    label: "Negotiation",
    description:
      "Scope, price, timing or commercial terms are under discussion.",
  },
  {
    stage: "won",
    label: "Won",
    description:
      "Accepted opportunities converted into operational projects.",
  },
  {
    stage: "lost",
    label: "Lost",
    description:
      "The opportunity did not proceed.",
  },
];

function normaliseStage(
  value: unknown,
): PipelineStage {
  const stage = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    STAGES.includes(
      stage as PipelineStage,
    )
  ) {
    return stage as PipelineStage;
  }

  return "prospect";
}

function getStageLabel(
  stage: PipelineStage,
): string {
  return (
    STAGE_DEFINITIONS.find(
      (definition) =>
        definition.stage === stage,
    )?.label ?? stage
  );
}

function getPreviousStage(
  stage: PipelineStage,
): PipelineStage | null {
  const index =
    ACTIVE_STAGES.indexOf(
      stage as
        (typeof ACTIVE_STAGES)[number],
    );

  if (index <= 0) {
    return null;
  }

  return ACTIVE_STAGES[index - 1];
}

function getNextStage(
  stage: PipelineStage,
): PipelineStage | null {
  const index =
    ACTIVE_STAGES.indexOf(
      stage as
        (typeof ACTIVE_STAGES)[number],
    );

  if (
    index < 0 ||
    index >=
      ACTIVE_STAGES.length - 1
  ) {
    return null;
  }

  return ACTIVE_STAGES[index + 1];
}

function PipelinePage() {
  const queryClient = useQueryClient();

  const opportunitiesQuery = useQuery({
    queryKey: ["sales-opportunities"],
    queryFn: salesOpportunities.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  async function refreshPipelineData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          "sales-opportunities",
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "dashboard-stats",
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "ops-projects",
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "operations-projects",
        ],
      }),
    ]);
  }

  const stageMutation = useMutation({
    mutationFn: async ({
      opportunityId,
      stage,
    }: {
      opportunityId: string;
      stage: PipelineStage;
    }) => {
      await salesOpportunities.update(
        opportunityId,
        {
          stage,
        },
      );

      return {
        opportunityId,
        stage,
      };
    },

    onSuccess: async ({ stage }) => {
      await refreshPipelineData();

      toast.success(
        `Opportunity moved to ${getStageLabel(
          stage,
        )}`,
      );
    },

    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "The opportunity stage could not be updated.";

      toast.error(
        "Pipeline update failed",
        {
          description: message,
        },
      );
    },
  });

  const wonConversionMutation =
    useMutation({
      mutationFn: async (
        opportunity: SalesOpportunity,
      ): Promise<WonConversionResult> => {
        /*
         * Step 1:
         * Persist the Won stage in the opportunities table.
         */
        await salesOpportunities.update(
          opportunity.id,
          {
            stage: "won",
          },
        );

        /*
         * Step 2:
         * Pass a Won-version of the record to the project conversion
         * function. The function checks for an existing source marker,
         * so clicking again cannot create duplicate projects.
         */
        const project =
          await createProjectFromOpportunity({
            ...opportunity,
            stage: "won",
          });

        return {
          opportunityId:
            opportunity.id,
          opportunityTitle:
            opportunity.title,
          projectId: project.id,
          projectName: project.name,
        };
      },

      onSuccess: async (result) => {
        await refreshPipelineData();

        toast.success(
          "Opportunity won and project created",
          {
            description:
              `"${result.projectName}" is now available in Operations → Projects.`,
          },
        );
      },

      onError: async (error) => {
        /*
         * The stage update may have succeeded before project creation
         * failed. Refresh all views so the user sees the true database
         * state and can use the retry conversion button in the Won card.
         */
        await refreshPipelineData();

        const message =
          error instanceof Error
            ? error.message
            : "The opportunity or project conversion could not be completed.";

        toast.error(
          "Won conversion needs attention",
          {
            description: message,
          },
        );
      },
    });

  const projectRetryMutation =
    useMutation({
      mutationFn: async (
        opportunity: SalesOpportunity,
      ) => {
        return createProjectFromOpportunity({
          ...opportunity,
          stage: "won",
        });
      },

      onSuccess: async (project) => {
        await refreshPipelineData();

        toast.success(
          "Project ready",
          {
            description:
              `"${project.name}" is available in Operations → Projects.`,
          },
        );
      },

      onError: (error) => {
        toast.error(
          "Project conversion failed",
          {
            description:
              error instanceof Error
                ? error.message
                : "The project could not be created.",
          },
        );
      },
    });

  const rows = (
    opportunitiesQuery.data ?? []
  ).map((opportunity) => ({
    ...opportunity,
    stage: normaliseStage(
      opportunity.stage,
    ),
  }));

  const columns =
    STAGE_DEFINITIONS.map(
      (definition) => {
        const stageRows =
          rows.filter(
            (opportunity) =>
              opportunity.stage ===
              definition.stage,
          );

        return {
          ...definition,
          rows: stageRows,
          value: stageRows.reduce(
            (
              total,
              opportunity,
            ) =>
              total +
              Number(
                opportunity.value ??
                  0,
              ),
            0,
          ),
        };
      },
    );

  const openPipelineValue =
    rows
      .filter(
        (opportunity) =>
          opportunity.stage !==
            "won" &&
          opportunity.stage !==
            "lost",
      )
      .reduce(
        (
          total,
          opportunity,
        ) =>
          total +
          Number(
            opportunity.value ?? 0,
          ),
        0,
      );

  const openOpportunityCount =
    rows.filter(
      (opportunity) =>
        opportunity.stage !== "won" &&
        opportunity.stage !== "lost",
    ).length;

  const wonOpportunityCount =
    rows.filter(
      (opportunity) =>
        opportunity.stage === "won",
    ).length;

  const mutationPending =
    stageMutation.isPending ||
    wonConversionMutation.isPending ||
    projectRetryMutation.isPending;

  function updateStage(
    opportunity: SalesOpportunity,
    targetStage: PipelineStage,
  ) {
    if (mutationPending) {
      return;
    }

    const currentStage =
      normaliseStage(
        opportunity.stage,
      );

    if (
      currentStage === targetStage
    ) {
      return;
    }

    if (targetStage === "lost") {
      const confirmed =
        window.confirm(
          `Mark "${opportunity.title}" as lost?`,
        );

      if (!confirmed) {
        return;
      }
    }

    stageMutation.mutate({
      opportunityId:
        opportunity.id,
      stage: targetStage,
    });
  }

  function markOpportunityWon(
    opportunity: SalesOpportunity,
  ) {
    if (mutationPending) {
      return;
    }

    const confirmed =
      window.confirm(
        [
          `Mark "${opportunity.title}" as won?`,
          "",
          "This will:",
          "1. Close the sales opportunity as Won.",
          "2. Count its value as won revenue.",
          "3. Create an operational project.",
          "4. Add the project to the Command Center.",
        ].join("\n"),
      );

    if (!confirmed) {
      return;
    }

    wonConversionMutation.mutate(
      opportunity,
    );
  }

  function retryProjectCreation(
    opportunity: SalesOpportunity,
  ) {
    if (mutationPending) {
      return;
    }

    const confirmed =
      window.confirm(
        `Create or recover the Operations project for "${opportunity.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    projectRetryMutation.mutate(
      opportunity,
    );
  }

  function advanceOpportunity(
    opportunity: SalesOpportunity,
  ) {
    const currentStage =
      normaliseStage(
        opportunity.stage,
      );

    const nextStage =
      getNextStage(currentStage);

    if (!nextStage) {
      return;
    }

    updateStage(
      opportunity,
      nextStage,
    );
  }

  function moveOpportunityBack(
    opportunity: SalesOpportunity,
  ) {
    const currentStage =
      normaliseStage(
        opportunity.stage,
      );

    const previousStage =
      getPreviousStage(
        currentStage,
      );

    if (!previousStage) {
      return;
    }

    updateStage(
      opportunity,
      previousStage,
    );
  }

  function reopenOpportunity(
    opportunity: SalesOpportunity,
  ) {
    const confirmed =
      window.confirm(
        [
          `Reopen "${opportunity.title}" and return it to Negotiation?`,
          "",
          "Important: any project already created from this opportunity will remain in Operations. Reopening does not delete the project.",
        ].join("\n"),
      );

    if (!confirmed) {
      return;
    }

    updateStage(
      opportunity,
      "negotiation",
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <GitBranch className="h-5 w-5" />
              </div>

              <StatusBadge status="Production" />
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Sales Pipeline
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Move every opportunity through
              Prospect, Qualified, Proposal,
              Negotiation and then convert
              accepted work into an operational
              project.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/operations/projects">
              <Button
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10"
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                View projects
              </Button>
            </Link>

            <Link to="/sales/opportunities">
              <Button
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10"
              >
                Manage opportunities
              </Button>
            </Link>

            <Link to="/sales/leads">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                View leads
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open opportunities"
          value={
            opportunitiesQuery.isLoading
              ? "—"
              : String(
                  openOpportunityCount,
                )
          }
          description="Opportunities not marked won or lost."
        />

        <MetricCard
          label="Open pipeline value"
          value={
            opportunitiesQuery.isLoading
              ? "—"
              : fmtCurrency(
                  openPipelineValue,
                )
          }
          description="Estimated value of active opportunities."
          primary
        />

        <MetricCard
          label="Won opportunities"
          value={
            opportunitiesQuery.isLoading
              ? "—"
              : String(
                  wonOpportunityCount,
                )
          }
          description="Accepted opportunities eligible for projects."
        />

        <MetricCard
          label="Data status"
          value={
            opportunitiesQuery.isLoading
              ? "Loading"
              : opportunitiesQuery.isError
                ? "Query failed"
                : "Live from database"
          }
          description="Pipeline refreshes every 60 seconds."
        />
      </section>

      {opportunitiesQuery.isError && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

          <div>
            <h2 className="text-sm font-semibold">
              Pipeline records could not be
              loaded
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              No records were changed. Retry
              the query or inspect Supabase
              permissions and the opportunities
              table.
            </p>

            <button
              type="button"
              onClick={() => {
                void opportunitiesQuery.refetch();
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Retry pipeline query
            </button>
          </div>
        </section>
      )}

      {opportunitiesQuery.isLoading ? (
        <div className="glass-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live pipeline…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {columns.map((column) => (
            <section
              key={column.stage}
              className="glass-card flex min-h-[460px] flex-col p-3"
            >
              <header className="mb-3 border-b border-border/60 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {column.label}
                    </h2>

                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                      {column.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-display text-lg font-semibold">
                      {column.rows.length}
                    </div>

                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      deals
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs font-semibold text-primary">
                  {fmtCurrency(
                    column.value,
                  )}
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {column.rows.length ===
                0 ? (
                  <div className="mt-6 rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    No opportunities in this
                    stage.
                  </div>
                ) : (
                  column.rows.map(
                    (opportunity) => (
                      <OpportunityCard
                        key={
                          opportunity.id
                        }
                        opportunity={
                          opportunity
                        }
                        stage={
                          column.stage
                        }
                        mutationPending={
                          mutationPending
                        }
                        onAdvance={() =>
                          advanceOpportunity(
                            opportunity,
                          )
                        }
                        onBack={() =>
                          moveOpportunityBack(
                            opportunity,
                          )
                        }
                        onWon={() =>
                          markOpportunityWon(
                            opportunity,
                          )
                        }
                        onLost={() =>
                          updateStage(
                            opportunity,
                            "lost",
                          )
                        }
                        onReopen={() =>
                          reopenOpportunity(
                            opportunity,
                          )
                        }
                        onCreateProject={() =>
                          retryProjectCreation(
                            opportunity,
                          )
                        }
                      />
                    ),
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  primary = false,
}: {
  label: string;
  value: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <div className="glass-card p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div
        className={
          primary
            ?