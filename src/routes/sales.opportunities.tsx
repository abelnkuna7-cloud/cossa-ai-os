import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  Radar,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  salesOpportunities,
  type SalesOpportunity,
} from "@/lib/business-data";
import {
  fmtCurrency,
  fmtDate,
} from "@/components/crud-workspace";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute(
  "/sales/opportunities",
)({
  component: OpportunitiesPage,
  head: () => ({
    meta: [
      {
        title: "Opportunities — Cossa AI",
      },
      {
        name: "description",
        content:
          "Create, manage and track live sales opportunities through the Cossa AI production pipeline.",
      },
      {
        property: "og:title",
        content: "Opportunities — Cossa AI",
      },
      {
        property: "og:description",
        content:
          "Cossa AI opportunity register and pipeline management workspace.",
      },
    ],
  }),
});

const STAGES = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

type OpportunityStage =
  (typeof STAGES)[number];

interface OpportunityFormState {
  title: string;
  value: string;
  stage: OpportunityStage;
  probability: string;
  expectedClose: string;
  notes: string;
}

const EMPTY_FORM: OpportunityFormState = {
  title: "",
  value: "0",
  stage: "prospect",
  probability: "20",
  expectedClose: "",
  notes: "",
};

function normaliseStage(
  value: unknown,
): OpportunityStage {
  const stage = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    STAGES.includes(
      stage as OpportunityStage,
    )
  ) {
    return stage as OpportunityStage;
  }

  return "prospect";
}

function normaliseNumber(
  value: string,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function clampProbability(
  value: number,
): number {
  return Math.min(
    100,
    Math.max(0, Math.round(value)),
  );
}

function OpportunitiesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] =
    useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<OpportunityFormState>(
      EMPTY_FORM,
    );

  const opportunitiesQuery = useQuery({
    queryKey: ["sales-opportunities"],
    queryFn: salesOpportunities.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (
      payload: Partial<SalesOpportunity>,
    ) => {
      return salesOpportunities.create(
        payload,
      );
    },

    onSuccess: async () => {
      await refreshOpportunityData();

      toast.success(
        "Opportunity created",
        {
          description:
            "The opportunity is now available in the Sales Pipeline.",
        },
      );

      closeForm();
    },

    onError: (error) => {
      toast.error(
        "Opportunity could not be created",
        {
          description:
            error instanceof Error
              ? error.message
              : "An unknown database error occurred.",
        },
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<SalesOpportunity>;
    }) => {
      await salesOpportunities.update(
        id,
        payload,
      );
    },

    onSuccess: async () => {
      await refreshOpportunityData();

      toast.success(
        "Opportunity updated",
      );

      closeForm();
    },

    onError: (error) => {
      toast.error(
        "Opportunity could not be updated",
        {
          description:
            error instanceof Error
              ? error.message
              : "An unknown database error occurred.",
        },
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await salesOpportunities.remove(id);
    },

    onSuccess: async () => {
      await refreshOpportunityData();

      toast.success(
        "Opportunity deleted",
      );
    },

    onError: (error) => {
      toast.error(
        "Opportunity could not be deleted",
        {
          description:
            error instanceof Error
              ? error.message
              : "An unknown database error occurred.",
        },
      );
    },
  });

  async function refreshOpportunityData() {
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
    ]);
  }

  const rows = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const normalisedRows =
      (
        opportunitiesQuery.data ?? []
      ).map((opportunity) => ({
        ...opportunity,
        stage: normaliseStage(
          opportunity.stage,
        ),
      }));

    if (!query) {
      return normalisedRows;
    }

    return normalisedRows.filter(
      (opportunity) =>
        [
          opportunity.title,
          opportunity.stage,
          opportunity.notes,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [
    opportunitiesQuery.data,
    search,
  ]);

  const allRows =
    opportunitiesQuery.data ?? [];

  const openRows = allRows.filter(
    (opportunity) =>
      !["won", "lost"].includes(
        normaliseStage(
          opportunity.stage,
        ),
      ),
  );

  const openValue = openRows.reduce(
    (total, opportunity) =>
      total +
      Number(
        opportunity.value ?? 0,
      ),
    0,
  );

  const weightedValue =
    openRows.reduce(
      (total, opportunity) =>
        total +
        Number(
          opportunity.value ?? 0,
        ) *
          (Number(
            opportunity.probability ?? 0,
          ) /
            100),
      0,
    );

  const wonValue = allRows
    .filter(
      (opportunity) =>
        normaliseStage(
          opportunity.stage,
        ) === "won",
    )
    .reduce(
      (total, opportunity) =>
        total +
        Number(
          opportunity.value ?? 0,
        ),
      0,
    );

  const mutationPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(
    opportunity: SalesOpportunity,
  ) {
    setEditingId(opportunity.id);

    setForm({
      title:
        opportunity.title ?? "",
      value: String(
        opportunity.value ?? 0,
      ),
      stage: normaliseStage(
        opportunity.stage,
      ),
      probability: String(
        opportunity.probability ?? 20,
      ),
      expectedClose:
        opportunity.expected_close ??
        "",
      notes:
        opportunity.notes ?? "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (mutationPending) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function submitOpportunity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const title = form.title.trim();
    const value = normaliseNumber(
      form.value,
      0,
    );
    const probability =
      clampProbability(
        normaliseNumber(
          form.probability,
          20,
        ),
      );
    const notes =
      form.notes.trim();

    if (!title) {
      toast.error(
        "Opportunity title is required",
      );
      return;
    }

    if (value < 0) {
      toast.error(
        "Opportunity value cannot be negative",
      );
      return;
    }

    const payload: Partial<SalesOpportunity> =
      {
        title,
        value,
        stage: form.stage,
        probability,
        expected_close:
          form.expectedClose || null,
        notes: notes || null,
      };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  }

  function deleteOpportunity(
    opportunity: SalesOpportunity,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${opportunity.title}"? This permanently removes the opportunity from the pipeline.`,
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      opportunity.id,
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Radar className="h-5 w-5" />
              </div>

              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Opportunities
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Create and manage qualified
              sales opportunities before
              progressing them through the
              live Sales Pipeline.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/sales/pipeline">
              <Button
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10"
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Open pipeline
              </Button>
            </Link>

            <Button
              type="button"
              onClick={openCreateForm}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              New opportunity
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open deals"
          value={String(
            openRows.length,
          )}
        />

        <StatCard
          label="Open value"
          value={fmtCurrency(
            openValue,
          )}
        />

        <StatCard
          label="Weighted value"
          value={fmtCurrency(
            weightedValue,
          )}
        />

        <StatCard
          label="Won value"
          value={fmtCurrency(
            wonValue,
          )}
        />
      </section>

      {showForm && (
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {editingId
                  ? "Edit opportunity"
                  : "Create opportunity"}
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                The saved record will appear
                immediately in Opportunities,
                Pipeline and dashboard totals.
              </p>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={closeForm}
              disabled={mutationPending}
              aria-label="Close opportunity form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form
            onSubmit={submitOpportunity}
            className="grid gap-5 p-5 md:grid-cols-2"
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="opportunity-title">
                Opportunity title
              </Label>

              <Input
                id="opportunity-title"
                required
                maxLength={200}
                placeholder="Example: Office renovation — ABC Logistics"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity-value">
                Estimated value (R)
              </Label>

              <Input
                id="opportunity-value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    value:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity-stage">
                Pipeline stage
              </Label>

              <select
                id="opportunity-stage"
                value={form.stage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stage:
                      event.target
                        .value as OpportunityStage,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {STAGES.map((stage) => (
                  <option
                    key={stage}
                    value={stage}
                  >
                    {stage
                      .charAt(0)
                      .toUpperCase() +
                      stage.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity-probability">
                Win probability %
              </Label>

              <Input
                id="opportunity-probability"
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.probability}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    probability:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity-close">
                Expected close date
              </Label>

              <Input
                id="opportunity-close"
                type="date"
                value={form.expectedClose}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expectedClose:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="opportunity-notes">
                Notes
              </Label>

              <Textarea
                id="opportunity-notes"
                rows={4}
                maxLength={4000}
                placeholder="Record the customer need, service, location, decision-maker route and next action."
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={mutationPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={mutationPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                {mutationPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create opportunity
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="glass-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Opportunity register
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Live records from the
              opportunities table.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search opportunities"
              className="pl-9"
            />
          </div>
        </div>

        {opportunitiesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading opportunities…
          </div>
        ) : opportunitiesQuery.isError ? (
          <div
            role="alert"
            className="m-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div>
              <h3 className="text-sm font-semibold">
                Opportunities could not be
                loaded
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                No records were changed.
                Retry the query or inspect
                Supabase permissions.
              </p>

              <button
                type="button"
                onClick={() =>
                  opportunitiesQuery.refetch()
                }
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Retry query
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Radar className="mx-auto h-10 w-10 text-muted-foreground/60" />

            <h3 className="mt-3 font-display text-lg font-semibold">
              No opportunities found
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Create the first qualified
              opportunity to start building
              the pipeline.
            </p>

            <Button
              type="button"
              onClick={openCreateForm}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create opportunity
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border/60 bg-card/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">
                    Opportunity
                  </th>
                  <th className="px-5 py-3">
                    Value
                  </th>
                  <th className="px-5 py-3">
                    Stage
                  </th>
                  <th className="px-5 py-3">
                    Win %
                  </th>
                  <th className="px-5 py-3">
                    Expected close
                  </th>
                  <th className="px-5 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {rows.map(
                  (opportunity) => (
                    <tr
                      key={opportunity.id}
                      className="transition-colors hover:bg-primary/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {opportunity.title}
                        </div>

                        {opportunity.notes && (
                          <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                            {
                              opportunity.notes
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-primary">
                        {fmtCurrency(
                          opportunity.value ??
                            0,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-primary">
                          {
                            opportunity.stage
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {Number(
                          opportunity.probability ??
                            0,
                        )}
                        %
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />

                          {opportunity.expected_close
                            ? fmtDate(
                                opportunity.expected_close,
                              )
                            : "Not set"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              openEditForm(
                                opportunity,
                              )
                            }
                            disabled={
                              mutationPending
                            }
                            aria-label={`Edit ${opportunity.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              deleteOpportunity(
                                opportunity,
                              )
                            }
                            disabled={
                              mutationPending
                            }
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${opportunity.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 font-display text-2xl font-semibold">
        {value}
      </div>
    </div>
  );
}
