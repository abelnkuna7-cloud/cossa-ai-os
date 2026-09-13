import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Bot, Send, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { createDirectEmployeeMission, listEmployees } from "@/lib/workforce-data";

export const Route = createFileRoute("/ai/employee/$employeeId/command")({
  component: AgentCommandPage,
  head: () => ({
    meta: [
      { title: "Agent Command — Cossa AI" },
      {
        name: "description",
        content: "Queue a safe internal mission for one recorded Cossa AI employee without performing external actions.",
      },
    ],
  }),
});

function AgentCommandPage() {
  const { employeeId } = Route.useParams();
  const [objective, setObjective] = useState("");
  const [createdMissionId, setCreatedMissionId] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["agent-command", employeeId, "employees"],
    queryFn: listEmployees,
    retry: false,
    staleTime: 30_000,
  });

  const employee = (employeesQuery.data ?? []).find((item) => item.id === employeeId) ?? null;

  const commandMutation = useMutation({
    mutationFn: async () => {
      const trimmed = objective.trim();
      if (!trimmed) throw new Error("Enter a task objective before queuing the mission.");
      return createDirectEmployeeMission({ employeeId, objective: trimmed });
    },
    onSuccess: (result) => {
      setCreatedMissionId(result.mission.id);
      setObjective("");
    },
  });

  const unavailable = employeesQuery.isError;
  const disabled = unavailable || !employee || employee.status !== "active" || commandMutation.isPending || !objective.trim();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <section className="glass-card p-6 md:p-8">
        <Link
          to="/ai/employee/$employeeId"
          params={{ employeeId }}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agent workspace
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <Bot className="mt-1 h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={unavailable ? "Unavailable" : employeesQuery.isLoading ? "Checking" : employee ? "Live" : "Unavailable"} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">Command {employee?.name ?? "agent"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Queue a recorded internal mission for this employee. This screen does not start a workforce run, send messages, spend money, publish content, place orders, or perform external actions.
            </p>
          </div>
        </div>
      </section>

      {unavailable ? (
        <section className="glass-card border-destructive/40 p-4" role="alert">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            Employee records are unavailable. No command can be queued until the employee is verified.
          </div>
        </section>
      ) : null}

      <section className="glass-card p-5 md:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Owner command</h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The command uses the existing direct-employee mission path. It creates a real queued mission and recorded handoff only; execution remains controlled by the existing workforce runtime and approval rules.
        </p>

        <label className="mt-5 block text-xs font-medium text-muted-foreground" htmlFor="agent-command-objective">
          Task objective
        </label>
        <textarea
          id="agent-command-objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Example: Review the latest verified Store supplier intake issues and prepare the next safe corrective actions."
          className="mt-2 w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => commandMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {commandMutation.isPending ? "Queuing…" : "Queue internal mission"}
          </button>
          <span className="text-xs text-muted-foreground">
            {employee ? `${employee.title} · ${employee.status}` : "Employee record not available"}
          </span>
        </div>

        {commandMutation.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {commandMutation.error instanceof Error ? commandMutation.error.message : "Unable to queue the employee mission."}
          </p>
        ) : null}

        {createdMissionId ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-card/30 p-3 text-sm">
            <p className="font-medium">Mission queued successfully.</p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded mission ID: {createdMissionId}</p>
            <Link
              to="/ai/employee/$employeeId"
              params={{ employeeId }}
              className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
            >
              Return to the agent workspace to watch recorded progress
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
