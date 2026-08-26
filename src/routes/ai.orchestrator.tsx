import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAgentRuntimeDashboard,
  queueLeadHunterRuntimeProof,
  reviewOutreachDrafts,
  setLeadHunterRuntimeSchedule,
  type LeadHunterRuntimeInput,
} from "@/lib/agent-runtime";

const COMPANY_OPTIONS = [
  ["cossa_facility_services", "Cossa Facility Services"],
  ["cossa_nexus_construction", "Cossa Nexus Construction"],
  ["cossa_tech", "Cossa Tech"],
  ["cossa_ai_growth", "Cossa AI Growth"],
  ["nexdocs", "NexDocs"],
  ["cossa_store", "Cossa Store"],
  ["cossa_nexus_holdings", "Cossa Nexus Holdings"],
] as const;

const SERVICE_OPTIONS = [
  ["facility_management", "Facility management"],
  ["commercial_cleaning", "Commercial cleaning"],
  ["property_maintenance", "Property maintenance"],
  ["construction", "Construction"],
  ["website_design", "Website design"],
  ["digital_marketing", "Digital marketing"],
  ["ai_automation", "AI automation"],
  ["business_documents", "Business documents"],
  ["ecommerce", "E-commerce"],
] as const;

function text(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["ready", "completed", "approved", "closed"].includes(status)) return "default";
  if (
    [
      "failed",
      "rejected",
      "open",
      "disabled",
      "configuration_required",
      "provider_unavailable",
    ].includes(status)
  )
    return "destructive";
  if (
    [
      "queued",
      "running",
      "pending",
      "prepared",
      "awaiting_approval",
      "rate_limited",
      "connection_required",
      "deployment_verification_required",
    ].includes(status)
  )
    return "secondary";
  return "outline";
}

function agentStatus(status: string): string {
  if (status === "active") return "Ready";
  if (status === "paused" || status === "retired") return "Disabled";
  return "Configuration required";
}

function formatTime(value: unknown): string {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
    : "—";
}

function leadHunterInputReady(input: LeadHunterRuntimeInput): boolean {
  return (
    input.objective.trim().length >= 12 &&
    Boolean(input.targetCompany.trim()) &&
    Boolean(input.targetService.trim()) &&
    Boolean(input.targetLocation.trim()) &&
    Number.isFinite(input.resultCount) &&
    input.resultCount >= 1
  );
}

function CossaOrchestrator() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState<LeadHunterRuntimeInput>({
    objective:
      "Find 10 qualified facility-management prospects in Gauteng and prepare evidence-backed outreach drafts for approval.",
    targetCompany: "cossa_facility_services",
    targetService: "facility_management",
    targetLocation: "Gauteng",
    resultCount: 10,
  });
  const runtime = useQuery({
    queryKey: ["cossa-agent-runtime"],
    queryFn: getAgentRuntimeDashboard,
    refetchInterval: 15_000,
  });
  const refresh = () => queryClient.refetchQueries({ queryKey: ["cossa-agent-runtime"] });
  const missionIsReady = leadHunterInputReady(input);

  const queueMission = useMutation({
    mutationFn: () => queueLeadHunterRuntimeProof(input),
    onSuccess: (result) => {
      toast.success("Lead Hunter proof queued", {
        description: `${result.queuedTasks} safe stages are waiting for the hosted runtime. No messages will be sent.`,
      });
      refresh();
    },
    onError: (error) =>
      toast.error("Lead Hunter could not be queued", {
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });
  const setSchedule = useMutation({
    mutationFn: (active: boolean) => setLeadHunterRuntimeSchedule(input, active),
    onSuccess: (_, active) => {
      toast.success(
        active ? "Daily Lead Hunter schedule saved" : "Daily Lead Hunter schedule paused",
        {
          description: active
            ? "The schedule will execute only after the hosted worker deployment and cron are verified. It cannot send messages."
            : "No future scheduled Lead Hunter mission will be queued.",
        },
      );
      refresh();
    },
    onError: (error) =>
      toast.error("Schedule could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });
  const review = useMutation({
    mutationFn: ({
      approvalId,
      decision,
    }: {
      approvalId: string;
      decision: "approved" | "rejected";
    }) => reviewOutreachDrafts(approvalId, decision),
    onSuccess: (_, variables) => {
      toast.success(
        variables.decision === "approved" ? "Drafts approved for human use" : "Drafts rejected",
        { description: "This did not send any email, WhatsApp, quote or proposal." },
      );
      refresh();
    },
    onError: (error) =>
      toast.error("Review could not be saved", {
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  const dashboard = runtime.data;
  const schedule = dashboard?.triggers.find(
    (trigger) => text(trigger.name) === "Lead Hunter scheduled research",
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 sm:p-6 lg:p-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              Cossa AI Workforce
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Cossa Orchestrator</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            One control room for Cossa Store, NexDocs, Growth, construction, facility services,
            technology and future business units. Employees own outcomes; specialist agents execute
            controlled work.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void runtime.refetch()}
          disabled={runtime.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Hosted execution</CardDescription>
            <CardTitle className="text-lg">
              {dashboard?.runtime.server_execution === "configuration_required"
                ? "Configuration required"
                : dashboard?.runtime.server_execution === "active"
                  ? "Hosted worker active"
                  : dashboard?.runtime.server_execution === "deployment_verification_required"
                  ? "Deployment verification required"
                  : "Checking runtime"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {dashboard?.runtime.device_independence ??
              "The control room is loading the server runtime."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Model fallback order</CardDescription>
            <CardTitle className="text-lg">
              {dashboard?.runtime.provider_order.join(" → ") || "No provider configured"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Recoverable failures can use the configured fallback route. Authentication, invalid
            request and safety failures do not retry through another provider.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>External communication</CardDescription>
            <CardTitle className="text-lg text-emerald-600">Disabled</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The proof creates an internal draft and approval request only. It cannot send to
            customers, prospects, suppliers or the public.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider health</CardTitle>
          <CardDescription>
            These states are derived from protected configuration and recorded circuit results; no
            provider is shown as healthy until a real call has succeeded.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {dashboard?.providers.map((provider) => {
            const status = text(provider.status, "configuration_required");
            return (
              <div key={text(provider.provider)} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{text(provider.provider)}</p>
                  <Badge variant={badgeVariant(status)}>{status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {text(provider.model)} · {text(provider.priority)} route
                  {text(provider.last_error_category, "")
                    ? ` · last error: ${text(provider.last_error_category).replaceAll("_", " ")}`
                    : ""}
                </p>
              </div>
            );
          }) ?? (
            <p className="text-sm text-muted-foreground">Checking protected provider status…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run Lead Hunter proof</CardTitle>
          <CardDescription>
            Manual trigger: research → enrich → qualify → existing CRM duplicate protection →
            outreach draft → owner review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="orchestrator-objective">Mission objective</Label>
            <Textarea
              id="orchestrator-objective"
              value={input.objective}
              onChange={(event) =>
                setInput((current) => ({ ...current, objective: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orchestrator-company">Cossa business</Label>
            <select
              id="orchestrator-company"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={input.targetCompany}
              onChange={(event) =>
                setInput((current) => ({ ...current, targetCompany: event.target.value }))
              }
            >
              {COMPANY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orchestrator-service">Service</Label>
            <select
              id="orchestrator-service"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={input.targetService}
              onChange={(event) =>
                setInput((current) => ({ ...current, targetService: event.target.value }))
              }
            >
              {SERVICE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orchestrator-location">Target location</Label>
            <Input
              id="orchestrator-location"
              value={input.targetLocation}
              onChange={(event) =>
                setInput((current) => ({ ...current, targetLocation: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orchestrator-count">Maximum prospects</Label>
            <Input
              id="orchestrator-count"
              type="number"
              min={1}
              max={20}
              value={input.resultCount}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  resultCount: Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <Button
              onClick={() => queueMission.mutate()}
              disabled={queueMission.isPending || !missionIsReady}
            >
              <Play className="mr-2 h-4 w-4" />
              Queue safe proof
            </Button>
            <Button
              variant="outline"
              onClick={() => setSchedule.mutate(true)}
              disabled={setSchedule.isPending || !missionIsReady}
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Enable daily trigger
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSchedule.mutate(false)}
              disabled={setSchedule.isPending}
            >
              Pause schedule
            </Button>
          </div>
          {schedule ? (
            <p className="text-xs text-muted-foreground lg:col-span-2">
              Schedule: <strong>{text(schedule.status)}</strong> · next run{" "}
              {formatTime(schedule.next_run_at)}.{" "}
              {dashboard?.runtime.worker_deployment_verified
                ? "It only queues safe internal work."
                : "The schedule is saved, but no recent authenticated worker tick has been recorded yet."}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employees and specialist agents</CardTitle>
            <CardDescription>
              Employees are accountable business roles. Agents are their execution specialists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.agents.map((agent) => (
              <div
                key={text(agent.id)}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{text(agent.name)}</p>
                  <p className="text-xs text-muted-foreground">{text(agent.purpose)}</p>
                </div>
                <Badge variant={badgeVariant(agentStatus(text(agent.status)).toLowerCase())}>
                  {agentStatus(text(agent.status))}
                </Badge>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">
                No agent profiles yet. Set up the Cossa Workforce, then refresh.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tool router</CardTitle>
            <CardDescription>
              Secrets are never shown here. Connections are prepared server-side and all high-risk
              tools stay approval-gated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.adapters.map((adapter) => (
              <div
                key={text(adapter.id)}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{text(adapter.name)}</p>
                  <p className="text-xs text-muted-foreground">{text(adapter.capability)}</p>
                </div>
                <Badge
                  variant={badgeVariant(
                    text(adapter.runtime_connection_state, text(adapter.connection_state)),
                  )}
                >
                  {text(adapter.runtime_connection_state, text(adapter.connection_state))}
                </Badge>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">Loading protected adapter status…</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Approval inbox</CardTitle>
            <CardDescription>
              Approval of an outreach draft does not send it. A future sending action must be
              designed and approved separately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.approvals
              .filter((approval) => text(approval.action_type) === "review_outreach_drafts")
              .map((approval) => {
                const status = text(approval.status);
                return (
                  <div key={text(approval.id)} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">Outreach drafts</p>
                      <Badge variant={badgeVariant(status)}>{status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {text(approval.justification)} · requested {formatTime(approval.requested_at)}
                    </p>
                    {status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            review.mutate({
                              approvalId: text(approval.id, ""),
                              decision: "approved",
                            })
                          }
                          disabled={review.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Approve drafts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            review.mutate({
                              approvalId: text(approval.id, ""),
                              decision: "rejected",
                            })
                          }
                          disabled={review.isPending}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              }) ?? (
              <p className="text-sm text-muted-foreground">No outreach drafts awaiting review.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Durable task queue</CardTitle>
            <CardDescription>
              Leased tasks survive browser closure. Retries use exponential delay; repeated
              provider/tool failures open a circuit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.tasks.map((task) => (
              <div
                key={text(task.id)}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{text(task.task_type)}</p>
                  <p className="text-xs text-muted-foreground">
                    Attempt {text(task.attempt_count, "0")} of {text(task.max_attempts, "3")} ·{" "}
                    {formatTime(task.created_at)}
                    {text(task.error_message, "") ? ` · ${text(task.error_message)}` : ""}
                  </p>
                </div>
                <Badge variant={badgeVariant(text(task.status))}>{text(task.status)}</Badge>
              </div>
            )) ?? <p className="text-sm text-muted-foreground">No queued runtime tasks yet.</p>}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Observability and recovery
          </CardTitle>
          <CardDescription>
            Provider and tool circuit states are persisted with the organisation. Safe failures
            retry; unsafe capabilities remain blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {dashboard?.circuits.map((circuit) => (
            <div
              key={`${text(circuit.component_type)}-${text(circuit.component_key)}`}
              className="rounded-lg border p-3"
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium">{text(circuit.component_key)}</p>
                <Badge variant={badgeVariant(text(circuit.state))}>{text(circuit.state)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {text(circuit.component_type)} · failures {text(circuit.failure_count, "0")} · opens
                until {formatTime(circuit.open_until)}
              </p>
            </div>
          )) ?? <p className="text-sm text-muted-foreground">No circuit events recorded.</p>}
        </CardContent>
      </Card>
    </main>
  );
}

export const Route = createFileRoute("/ai/orchestrator")({
  component: CossaOrchestrator,
  head: () => ({
    meta: [
      { title: "Cossa Orchestrator — Growth" },
      {
        name: "description",
        content: "Cossa's approval-gated, durable AI workforce control room.",
      },
    ],
  }),
});
