import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FilePenLine,
  Globe2,
  KeyRound,
  Megaphone,
  PanelTop,
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
  createGrowthCoordinationMission,
  installCossaGrowthWorkforce,
  listEmployeeHandoffs,
  listEmployees,
  listMissions,
  listPendingApprovals,
} from "@/lib/workforce-data";

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

function AiWorkforce() {
  const queryClient = useQueryClient();
  const [objective, setObjective] = useState(
    "Build a controlled social media and paid-media growth plan for Cossa Nexus Holdings.",
  );
  const [targetMarket, setTargetMarket] = useState("South Africa");
  const [targetLocation, setTargetLocation] = useState("Gauteng");

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
  const approvalsQuery = useQuery({
    queryKey: ["ai-workforce-approvals"],
    queryFn: () => listPendingApprovals(),
  });

  const refreshWorkforce = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-employees"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-missions"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-workforce-handoffs"] }),
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
  const isLoading =
    employeesQuery.isLoading ||
    missionsQuery.isLoading ||
    handoffsQuery.isLoading ||
    approvalsQuery.isLoading;

  const canCreateCoordination =
    installedGrowthEmployees.length === COSSA_GROWTH_WORKFORCE.length &&
    objective.trim().length > 0;

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
                    {employee ? employee.status : "Not installed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
                Set up all {COSSA_GROWTH_WORKFORCE.length} workforce profiles first. No worker will be installed automatically without your click.
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
