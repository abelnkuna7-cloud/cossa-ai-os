import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileCheck2,
  FilePenLine,
  Globe2,
  KeyRound,
  Megaphone,
  PanelTop,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  COSSA_GROWTH_WORKFORCE,
  completeControlledWorkforceRun,
  createGrowthCoordinationMission,
  decideApproval,
  failControlledWorkforceRun,
  installCossaGrowthWorkforce,
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
  listWorkforceRuns,
  startControlledWorkforceRun,
  type AiEmployee,
  type EmployeeHandoff,
  type Mission,
  type MissionRun,
} from "@/lib/workforce-data";
import { streamChat } from "@/lib/ai-stream";
import { checkOfficialWebsite, type OfficialWebsiteHealthReport } from "@/lib/website-health";

export const Route = createFileRoute("/ai/workforce")({
  component: AiWorkforce,
  head: () => ({
    meta: [
      { title: "AI Workforce — Cossa AI" },
      {
        name: "description",
        content:
          "Cossa's controlled AI workforce for social planning, content, scheduling, account growth, paid media and owner briefings.",
      },
    ],
  }),
});

const GROWTH_MISSION_PREFIX = "Growth coordination:";

const WORKFLOW = [
  {
    key: "website-seo-monitor",
    label: "Check website",
    description: "Runs the approved read-only Cossa homepage check and flags verified issues.",
    icon: Globe2,
  },
  {
    key: "social-strategy-planner",
    label: "Plan",
    description: "Creates the strategy brief from approved Cossa context.",
    icon: Megaphone,
  },
  {
    key: "content-writer",
    label: "Write",
    description: "Prepares reviewable content drafts; it never publishes them.",
    icon: FilePenLine,
  },
  {
    key: "social-schedule-coordinator",
    label: "Schedule",
    description: "Organises approved work into a proposed publishing calendar.",
    icon: PanelTop,
  },
  {
    key: "account-growth-analyst",
    label: "Analyse growth",
    description: "Uses authorised account data only and labels missing data.",
    icon: UsersRound,
  },
  {
    key: "paid-media-specialist",
    label: "Review ads",
    description: "Prepares controlled paid-media recommendations; it cannot spend.",
    icon: KeyRound,
  },
  {
    key: "ai-ceo",
    label: "AI CEO briefing",
    description: "Synthesises verified worker outputs for the Cossa owner's decision.",
    icon: BrainCircuit,
  },
] as const;

function reviewableOutputContent(run: MissionRun): string | null {
  if (!run.output || typeof run.output !== "object") return null;

  const content = (run.output as { content?: unknown }).content;
  return typeof content === "string" && content.trim() ? content : null;
}

function websiteReportEvidence(report: OfficialWebsiteHealthReport): string {
  return [
    "Authorised read-only official Cossa website health result",
    `Website: ${report.website}`,
    `Checked at: ${report.checked_at}`,
    `Availability: ${report.availability}`,
    `HTTP status: ${report.http_status ?? "not available"}`,
    `Response time: ${report.response_time_ms ?? "not available"} ms`,
    `Page title: ${report.page_title ?? "not detected"}`,
    `Noindex detected: ${report.noindex_detected ? "yes" : "no"}`,
    `Reported issues: ${report.issues.length > 0 ? report.issues.join("; ") : "none"}`,
    `Scope: ${report.monitoring_scope}`,
  ].join("\n");
}

function controlledStagePrompt({
  mission,
  handoff,
  employee,
  priorOutputs,
  authorisedEvidence,
}: {
  mission: Mission;
  handoff: EmployeeHandoff;
  employee: AiEmployee;
  priorOutputs: string[];
  authorisedEvidence: string[];
}): string {
  const previous =
    priorOutputs.length > 0
      ? priorOutputs
          .map((output, index) => `Earlier worker draft ${index + 1}:\n${output}`)
          .join("\n\n")
      : "No earlier workforce output has been recorded.";

  return [
    `You are ${employee.title} in the controlled Cossa AI Workforce.`,
    "Create one internal, reviewable draft for the assigned handoff. External actions are disabled.",
    "Use only verified Cossa Knowledge Base information and authorised Cossa operational records supplied by the Cossa AI route. If information is unavailable, explicitly label it as missing; do not guess, fabricate customer results, claim account access, or name unverified competitors.",
    "Do not publish content, send messages, contact prospects, spend money, change budgets, alter accounts, connect providers, make legal or financial commitments, or claim that any of those actions occurred.",
    "Use these headings exactly: Verified inputs; Missing information or connections; Reviewable draft; Owner decisions required; External actions disabled.",
    `Mission objective: ${mission.objective}`,
    `Mission instruction: ${mission.instruction}`,
    `Target market: ${mission.target_market || "Not specified"}`,
    `Target location: ${mission.target_location || "Not specified"}`,
    `Assigned handoff: ${handoff.reason}`,
    `Recorded handoff context: ${JSON.stringify(handoff.context)}`,
    authorisedEvidence.length > 0
      ? `Authorised evidence for this stage:\n${authorisedEvidence.join("\n\n")}`
      : "No additional authorised evidence was collected for this stage.",
    previous,
  ].join("\n\n");
}

function AiWorkforce() {
  const queryClient = useQueryClient();
  const [objective, setObjective] = useState(
    "Build a controlled social media and paid-media growth plan for Cossa Nexus Holdings.",
  );
  const [targetMarket, setTargetMarket] = useState("South Africa");
  const [targetLocation, setTargetLocation] = useState("Gauteng");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["ai-workforce-employees"],
    queryFn: () => listEmployees(),
  });
  const missionsQuery = useQuery({
    queryKey: ["ai-workforce-missions"],
    queryFn: () => listMissions(),
  });
  const handoffsQuery = useQuery({
    queryKey: ["ai-workforce-handoffs"],
    queryFn: () => listEmployeeHandoffs(),
  });
  const runsQuery = useQuery({
    queryKey: ["ai-workforce-runs"],
    queryFn: () => listWorkforceRuns(),
  });
  const approvalsQuery = useQuery({
    queryKey: ["ai-workforce-approvals"],
    queryFn: () => listPendingApprovals(),
  });

  const refreshWorkforce = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-employees"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-missions"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-handoffs"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-approvals"] }),
    ]);
  };

  const installMutation = useMutation({
    mutationFn: installCossaGrowthWorkforce,
    onSuccess: async (employees) => {
      await refreshWorkforce();
      toast.success("Cossa growth workforce is ready", {
        description: `${employees.length} workforce profiles are available for controlled planning work.`,
      });
    },
    onError: (error) => {
      toast.error("Workforce setup could not be completed", {
        description: error instanceof Error ? error.message : "Unknown workforce setup error.",
      });
    },
  });

  const coordinationMutation = useMutation({
    mutationFn: createGrowthCoordinationMission,
    onSuccess: async ({ mission, handoffs }) => {
      await refreshWorkforce();
      toast.success("Coordination plan recorded", {
        description: `${mission.title} has ${handoffs.length} controlled handoff stages. No external action was started.`,
      });
    },
    onError: (error) => {
      toast.error("Coordination plan could not be created", {
        description: error instanceof Error ? error.message : "Unknown mission error.",
      });
    },
  });

  const employeesByKey = useMemo(
    () => new Map((employeesQuery.data ?? []).map((employee) => [employee.employee_key, employee])),
    [employeesQuery.data],
  );

  const installedGrowthEmployees = COSSA_GROWTH_WORKFORCE.filter((profile) =>
    employeesByKey.has(profile.employee_key),
  );
  const coordinationMissions = (missionsQuery.data ?? []).filter((mission) =>
    mission.title.startsWith(GROWTH_MISSION_PREFIX),
  );
  const coordinationMissionIds = new Set(coordinationMissions.map((mission) => mission.id));
  const pendingHandoffs = (handoffsQuery.data ?? []).filter(
    (handoff) => handoff.status === "pending" && coordinationMissionIds.has(handoff.mission_id),
  );
  const selectedMission =
    coordinationMissions.find((mission) => mission.id === selectedMissionId) ??
    coordinationMissions[0] ??
    null;
  const selectedMissionHandoffs = selectedMission
    ? (handoffsQuery.data ?? [])
        .filter((handoff) => handoff.mission_id === selectedMission.id)
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
    : [];
  const nextHandoff =
    selectedMissionHandoffs.find((handoff) => handoff.status === "pending") ?? null;
  const nextEmployee = nextHandoff
    ? ((employeesQuery.data ?? []).find((employee) => employee.id === nextHandoff.to_employee_id) ??
      null)
    : null;
  const selectedMissionRuns = selectedMission
    ? (runsQuery.data ?? []).filter((run) => run.mission_id === selectedMission.id)
    : [];
  const reviewableOutputs = selectedMissionRuns
    .map((run) => ({ run, content: reviewableOutputContent(run) }))
    .filter((item): item is { run: MissionRun; content: string } => Boolean(item.content));
  const workforceReviewApprovals = (approvalsQuery.data ?? []).filter(
    (approval) =>
      approval.action_type === "review_growth_coordination_output" &&
      coordinationMissionIds.has(approval.mission_id ?? ""),
  );
  const isLoading =
    employeesQuery.isLoading ||
    missionsQuery.isLoading ||
    handoffsQuery.isLoading ||
    runsQuery.isLoading ||
    approvalsQuery.isLoading;

  const canCreateCoordination =
    installedGrowthEmployees.length === COSSA_GROWTH_WORKFORCE.length &&
    objective.trim().length > 0;

  const runNextStageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMission || !nextHandoff || !nextEmployee) {
        throw new Error("Select a coordination mission with a pending workforce stage first.");
      }

      const priorOutputs = reviewableOutputs.map((item) => item.content);
      const authorisedEvidence =
        nextEmployee.employee_key === "website-seo-monitor"
          ? [websiteReportEvidence(await checkOfficialWebsite())]
          : [];
      const run = await startControlledWorkforceRun({
        mission: selectedMission,
        handoff: nextHandoff,
        employee: nextEmployee,
        provider: "groq",
        modelName: "llama-3.3-70b-versatile",
        priorOutputs,
        authorisedEvidence,
      });

      try {
        const content = await streamChat(
          [
            {
              role: "user",
              content: controlledStagePrompt({
                mission: selectedMission,
                handoff: nextHandoff,
                employee: nextEmployee,
                priorOutputs,
                authorisedEvidence,
              }),
            },
          ],
          () => undefined,
          undefined,
          nextEmployee.system_instructions,
          "groq",
        );

        if (!content.trim()) {
          throw new Error("Cossa AI did not return a reviewable workforce draft.");
        }

        return completeControlledWorkforceRun({
          run,
          handoff: nextHandoff,
          employee: nextEmployee,
          content,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The workforce provider failed to return an output.";
        try {
          await failControlledWorkforceRun({ run, handoff: nextHandoff, errorMessage: message });
        } catch (cleanupError) {
          console.error("Unable to record controlled workforce failure", cleanupError);
        }
        throw error;
      }
    },
    onSuccess: async ({ finalStage }) => {
      await refreshWorkforce();
      toast.success(
        finalStage ? "Final owner review requested" : "Reviewable workforce draft saved",
        {
          description: finalStage
            ? "The AI CEO briefing is saved for your internal review. No external action was enabled."
            : "The next controlled handoff is now ready. No external action was enabled.",
        },
      );
    },
    onError: (error) => {
      toast.error("Controlled workforce stage could not run", {
        description: error instanceof Error ? error.message : "Unknown workforce run error.",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      approvalId,
      decision,
    }: {
      approvalId: string;
      decision: "approved" | "rejected";
    }) =>
      decideApproval(
        approvalId,
        decision,
        decision === "approved"
          ? "Owner approved the internal workforce briefing. External actions remain disabled."
          : "Owner requested changes to the internal workforce briefing. External actions remain disabled.",
      ),
    onSuccess: async (_, variables) => {
      await refreshWorkforce();
      toast.success(
        variables.decision === "approved" ? "Internal briefing approved" : "Changes requested",
        {
          description:
            "This decision affects only the internal workforce mission. It does not authorise publication, messaging, account changes or advertising spend.",
        },
      );
    },
    onError: (error) => {
      toast.error("Owner review could not be recorded", {
        description: error instanceof Error ? error.message : "Unknown approval error.",
      });
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <UsersRound className="h-5 w-5" />
              </div>
              <StatusBadge status="Testing" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Cossa <span className="text-gradient-gold">AI Workforce</span>
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              A controlled growth team for strategy, content, scheduling, account analysis, ads and
              AI CEO briefing. Every external action remains disabled until the relevant business
              account is connected and you approve it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshWorkforce()}
              disabled={isLoading}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh records
            </Button>
            <Button
              type="button"
              onClick={() => installMutation.mutate()}
              disabled={installMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <UsersRound className="mr-1.5 h-4 w-4" />
              {installMutation.isPending
                ? "Setting up workforce…"
                : "Set up Cossa growth workforce"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Growth workers installed"
          value={`${installedGrowthEmployees.length}/${COSSA_GROWTH_WORKFORCE.length}`}
        />
        <Metric label="Coordination missions" value={String(coordinationMissions.length)} />
        <Metric label="Pending controlled handoffs" value={String(pendingHandoffs.length)} />
        <Metric
          label="Approvals awaiting you"
          value={String((approvalsQuery.data ?? []).length)}
          warning={(approvalsQuery.data ?? []).length > 0}
        />
      </section>

      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Controlled handoff line
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Workers support one owner briefing
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            This is a real internal workflow record once you create a coordination plan. It does not
            simulate completed work or claim a social account is connected.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {WORKFLOW.map((step, index) => {
            const Icon = step.icon;
            const employee = employeesByKey.get(step.key);
            return (
              <div
                key={step.key}
                className="relative rounded-xl border border-border/60 bg-card/40 p-4"
              >
                {index < WORKFLOW.length - 1 ? (
                  <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background p-1 text-primary xl:block" />
                ) : null}
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold">{step.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest">
                  <CheckCircle2
                    className={employee ? "h-3 w-3 text-success" : "h-3 w-3 text-muted-foreground"}
                  />
                  <span className={employee ? "text-success" : "text-muted-foreground"}>
                    {employee ? "Installed — controlled" : "Not installed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Controlled workforce execution
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Run one reviewable stage at a time
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Each stage uses the Economy Groq route, saves its input and draft to the selected
              mission, and leaves every external action disabled. Review the saved output before
              continuing.
            </p>
          </div>
          {coordinationMissions.length > 0 ? (
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Coordination mission
              <select
                value={selectedMission?.id ?? ""}
                onChange={(event) => setSelectedMissionId(event.target.value || null)}
                className="min-w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              >
                {coordinationMissions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.objective.slice(0, 100)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {!selectedMission ? (
          <p className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            Create a controlled coordination plan first. Nothing will run until you explicitly start
            a stage.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Next stage
                  </p>
                  <h3 className="mt-1 text-sm font-semibold">
                    {nextEmployee
                      ? `${nextEmployee.name} — ${nextEmployee.title}`
                      : "No pending stage"}
                  </h3>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {selectedMission.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {nextHandoff?.reason ??
                  "All recorded stages are complete. Review the saved final briefing and any owner review request below."}
              </p>
              <Button
                type="button"
                onClick={() => runNextStageMutation.mutate()}
                disabled={
                  !nextHandoff ||
                  !nextEmployee ||
                  runNextStageMutation.isPending ||
                  selectedMission.status === "awaiting_approval" ||
                  selectedMission.status === "completed"
                }
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                {runNextStageMutation.isPending ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                {runNextStageMutation.isPending
                  ? "Saving controlled draft…"
                  : "Run next stage with Economy Groq"}
              </Button>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                If Groq is unavailable or out of credit, the failed attempt is recorded and the
                stage returns to pending. No stage silently falls back to OpenAI.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Saved reviewable outputs
                  </p>
                  <h3 className="text-sm font-semibold">
                    {reviewableOutputs.length} saved for this mission
                  </h3>
                </div>
              </div>
              {reviewableOutputs.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No worker draft has been saved yet. This section will show each recorded internal
                  output with its worker and time.
                </p>
              ) : (
                <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {reviewableOutputs.map(({ run, content }) => (
                    <article
                      key={run.id}
                      className="rounded-lg border border-border/60 bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {run.model_provider === "groq"
                            ? "Economy Groq"
                            : run.model_provider || "Recorded provider"}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-success">
                          reviewable draft
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {content}
                      </p>
                    </article>
                  ))}
                </div>
              )}
              {selectedMissionRuns.some((run) => run.status === "failed") ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />A previous stage failed.
                  Its reason is retained in the mission run record; retry only after the provider
                  issue is resolved.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-xl font-semibold">
                Create a controlled growth coordination plan
              </h2>
              <p className="text-sm text-muted-foreground">
                This saves an internal mission and its pending handoff stages. It does not call Groq
                or make any external change.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              What is the growth objective?
              <textarea
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                rows={4}
                className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Target market
                <input
                  value={targetMarket}
                  onChange={(event) => setTargetMarket(event.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Target location
                <input
                  value={targetLocation}
                  onChange={(event) => setTargetLocation(event.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>
            </div>
            {!canCreateCoordination ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                Set up all {COSSA_GROWTH_WORKFORCE.length} workforce profiles first. No worker will
                be installed automatically without your click.
              </p>
            ) : null}
            <Button
              type="button"
              onClick={() =>
                coordinationMutation.mutate({
                  objective,
                  target_market: targetMarket,
                  target_location: targetLocation,
                })
              }
              disabled={!canCreateCoordination || coordinationMutation.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              {coordinationMutation.isPending
                ? "Creating controlled plan…"
                : "Create controlled coordination plan"}
            </Button>
          </div>
        </section>

        <section className="glass-card flex flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Owner control
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            Your final briefing stays with you
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The AI CEO receives the workforce handoff plan and prepares a decision briefing. You
            remain the person who approves content, customer communication, account connections and
            advertising spend.
          </p>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              No social publishing or customer messaging from this screen.
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              No advertising budget, bid or account changes from this screen.
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Every missing source or connection is visible instead of guessed.
            </div>
          </div>
          <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link to="/integrations">
                <Send className="mr-1.5 h-4 w-4" />
                Review connections
              </Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/ai/ceo">
                <BrainCircuit className="mr-1.5 h-4 w-4" />
                Open AI CEO briefing
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <section className="glass-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Recorded coordination plans
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">Real mission records</h2>
          </div>
          <span className="text-xs text-muted-foreground">{coordinationMissions.length} saved</span>
        </div>
        {coordinationMissions.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No coordination plan has been saved yet. Set up the workforce, then create one from the
            controlled form above.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {coordinationMissions.slice(0, 6).map((mission) => {
              const handoffCount = (handoffsQuery.data ?? []).filter(
                (handoff) => handoff.mission_id === mission.id,
              ).length;
              const reviewApproval = workforceReviewApprovals.find(
                (approval) => approval.mission_id === mission.id,
              );
              return (
                <article
                  key={mission.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-primary">
                      {mission.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{handoffCount} handoffs</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{mission.objective}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {mission.instruction}
                  </p>
                  {reviewApproval ? (
                    <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-foreground">Owner review required</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Approving closes only this internal briefing. It does not approve
                        publishing, customer contact, account changes or advertising spend.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={reviewMutation.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                "Approve this internal workforce briefing? External actions will remain disabled.",
                              )
                            ) {
                              reviewMutation.mutate({
                                approvalId: reviewApproval.id,
                                decision: "approved",
                              });
                            }
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Approve internal briefing
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              approvalId: reviewApproval.id,
                              decision: "rejected",
                            })
                          }
                          className="border-warning/40 text-warning hover:bg-warning/10"
                        >
                          Request changes
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={
          warning
            ? "mt-2 font-display text-2xl font-semibold text-warning"
            : "mt-2 font-display text-2xl font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}
