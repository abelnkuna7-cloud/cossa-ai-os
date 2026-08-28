import type { AgentRuntimeDashboard } from "@/lib/agent-runtime";
import { isActiveSalesPipelineStage, workforceHasLiveWork } from "@/lib/operational-truth";
import type { SalesLead, SalesOpportunity } from "@/lib/business-data";
import type {
  AiEmployee,
  Approval,
  EmployeeHandoff,
  Mission,
  MissionRun,
} from "@/lib/workforce-data";

export type WorkforceFailureClass =
  | "recoverable"
  | "configuration_required"
  | "provider_failure"
  | "execution_failure"
  | "blocked_by_approval";

export interface WorkforceFailure {
  id: string;
  employeeId: string | null;
  classification: WorkforceFailureClass;
  message: string | null;
}

export interface WorkforceIntelligence {
  verifiedAt: string;
  totalEmployees: number;
  active: number;
  workingNow: number;
  available: number;
  assigned: number;
  waitingForApproval: number;
  failedNeedsAttention: number;
  missionsToday: number;
  completedToday: number;
  overdue: number;
  handoffsToday: number;
  leadsGenerated: number;
  leadsQualified: number;
  opportunitiesCreated: number;
  approvalsRequired: number;
  providerWarnings: number;
  failures: WorkforceFailure[];
  activeOpportunityCount: number;
  activeOpportunityValue: number;
}

function onDate(value: string | null | undefined, now: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === now.toDateString();
}

function lower(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function classifyWorkforceFailure(errorCode: unknown): WorkforceFailureClass {
  const code = lower(errorCode);
  if (/approval/.test(code)) return "blocked_by_approval";
  if (/config|permission|not_configured|missing|disabled|route/.test(code)) {
    return "configuration_required";
  }
  if (/provider|model|rate|timeout|overload|gateway/.test(code)) return "provider_failure";
  if (/retry|temporary|network/.test(code)) return "recoverable";
  return "execution_failure";
}

function runtimeTasks(runtime?: AgentRuntimeDashboard | null): Array<Record<string, unknown>> {
  return runtime?.tasks ?? [];
}

export function buildWorkforceIntelligence(input: {
  employees: readonly AiEmployee[];
  missions: readonly Mission[];
  runs: readonly MissionRun[];
  handoffs: readonly EmployeeHandoff[];
  approvals: readonly Approval[];
  leads: readonly SalesLead[];
  opportunities: readonly SalesOpportunity[];
  runtime?: AgentRuntimeDashboard | null;
  now?: Date;
}): WorkforceIntelligence {
  const now = input.now ?? new Date();
  const activeEmployees = input.employees.filter((employee) => employee.status === "active");
  const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));
  const workingEmployeeIds = new Set(
    input.runs
      .filter(
        (run) =>
          run.status === "running" && run.employee_id && activeEmployeeIds.has(run.employee_id),
      )
      .map((run) => run.employee_id as string),
  );
  const assignedEmployeeIds = new Set(
    input.handoffs
      .filter(
        (handoff) =>
          ["pending", "accepted"].includes(handoff.status) &&
          activeEmployeeIds.has(handoff.to_employee_id),
      )
      .map((handoff) => handoff.to_employee_id),
  );
  const pendingApprovalEmployeeIds = new Set(
    input.approvals
      .filter((approval) => approval.status === "pending" && approval.requested_by_employee_id)
      .map((approval) => approval.requested_by_employee_id as string),
  );

  for (const task of runtimeTasks(input.runtime)) {
    const taskState = lower(task.status);
    const employeeId = typeof task.employee_id === "string" ? task.employee_id : null;
    if (!employeeId || !activeEmployeeIds.has(employeeId)) continue;
    if (
      workforceHasLiveWork({
        taskStatus: taskState,
        leaseExpiresAt: typeof task.lease_expires_at === "string" ? task.lease_expires_at : null,
        now,
      })
    ) {
      workingEmployeeIds.add(employeeId);
    }
    if (["queued", "pending", "retrying"].includes(taskState)) assignedEmployeeIds.add(employeeId);
  }

  const failures = input.runs
    .filter((run) => run.status === "failed")
    .map((run) => ({
      id: run.id,
      employeeId: run.employee_id,
      classification: classifyWorkforceFailure(run.error_code),
      message: run.error_message,
    }));
  const providerWarnings =
    input.runs.filter(
      (run) =>
        run.status === "failed" && classifyWorkforceFailure(run.error_code) === "provider_failure",
    ).length +
    (input.runtime?.providers ?? []).filter((provider) =>
      /warning|failed|error|unavailable|misconfigured/.test(
        lower(provider.status ?? provider.state),
      ),
    ).length;
  const available = activeEmployees.filter(
    (employee) =>
      !workingEmployeeIds.has(employee.id) &&
      !assignedEmployeeIds.has(employee.id) &&
      !pendingApprovalEmployeeIds.has(employee.id),
  ).length;
  const activeOpportunities = input.opportunities.filter((opportunity) =>
    isActiveSalesPipelineStage(opportunity.stage),
  );

  return {
    verifiedAt: now.toISOString(),
    totalEmployees: input.employees.length,
    active: activeEmployees.length,
    workingNow: workingEmployeeIds.size,
    available,
    assigned: [...assignedEmployeeIds].filter((id) => !workingEmployeeIds.has(id)).length,
    waitingForApproval: [...pendingApprovalEmployeeIds].filter((id) => activeEmployeeIds.has(id))
      .length,
    failedNeedsAttention: failures.length,
    missionsToday: input.missions.filter((mission) => onDate(mission.created_at, now)).length,
    completedToday: input.runs.filter(
      (run) => run.status === "completed" && onDate(run.completed_at, now),
    ).length,
    overdue: input.missions.filter(
      (mission) =>
        ["queued", "running", "awaiting_approval"].includes(mission.status) &&
        mission.created_at &&
        new Date(mission.created_at).getTime() < now.getTime() - 24 * 60 * 60 * 1_000,
    ).length,
    handoffsToday: input.handoffs.filter((handoff) => onDate(handoff.created_at, now)).length,
    leadsGenerated: input.leads.filter((lead) => onDate(lead.created_at, now)).length,
    leadsQualified: input.leads.filter(
      (lead) =>
        lower(lead.status) === "qualified" && onDate(lead.updated_at ?? lead.created_at, now),
    ).length,
    opportunitiesCreated: input.opportunities.filter((opportunity) =>
      onDate(opportunity.created_at, now),
    ).length,
    approvalsRequired: input.approvals.filter((approval) => approval.status === "pending").length,
    providerWarnings,
    failures,
    activeOpportunityCount: activeOpportunities.length,
    activeOpportunityValue: activeOpportunities.reduce(
      (total, opportunity) => total + Number(opportunity.value ?? 0),
      0,
    ),
  };
}

export interface OwnerBriefing {
  generatedAt: string;
  sections: Array<{ title: string; points: string[] }>;
  topActions: string[];
}

export function buildOwnerBriefing(intelligence: WorkforceIntelligence): OwnerBriefing {
  const failureSummary = intelligence.failures.length
    ? intelligence.failures.map(
        (failure) =>
          `${failure.classification.replaceAll("_", " ")}: ${failure.message ?? "No message recorded."}`,
      )
    : ["No failed workforce runs were recorded in the verified data set."];
  const topActions = [
    intelligence.approvalsRequired > 0
      ? `Review ${intelligence.approvalsRequired} approval request${intelligence.approvalsRequired === 1 ? "" : "s"} before any controlled external action.`
      : null,
    intelligence.failedNeedsAttention > 0
      ? `Investigate ${intelligence.failedNeedsAttention} failed workforce run${intelligence.failedNeedsAttention === 1 ? "" : "s"}.`
      : null,
    intelligence.activeOpportunityCount > 0
      ? `Follow up the ${intelligence.activeOpportunityCount} active opportunity record${intelligence.activeOpportunityCount === 1 ? "" : "s"} with a verified combined estimated value of R${intelligence.activeOpportunityValue.toLocaleString("en-ZA")}.`
      : "No active opportunity records are available for a revenue follow-up recommendation.",
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    generatedAt: intelligence.verifiedAt,
    sections: [
      {
        title: "Executive summary",
        points: [
          `Verified refresh at ${new Date(intelligence.verifiedAt).toLocaleString("en-ZA")}.`,
          `${intelligence.workingNow} employee(s) have a real running mission or leased runtime task; ${intelligence.available} are eligible for assignment.`,
        ],
      },
      {
        title: "Revenue & pipeline",
        points: [
          `${intelligence.activeOpportunityCount} active opportunities are recorded. Estimated pipeline value is R${intelligence.activeOpportunityValue.toLocaleString("en-ZA")}; this is not cash received.`,
          `${intelligence.opportunitiesCreated} opportunity record(s) were created today.`,
        ],
      },
      {
        title: "Customers & leads",
        points: [
          `${intelligence.leadsGenerated} lead(s) were created today and ${intelligence.leadsQualified} were qualified today based on CRM timestamps.`,
        ],
      },
      {
        title: "Workforce",
        points: [
          `${intelligence.totalEmployees} profiles exist; ${intelligence.active} are active, ${intelligence.assigned} assigned, ${intelligence.waitingForApproval} waiting for approval, and ${intelligence.overdue} active mission(s) are older than 24 hours.`,
        ],
      },
      {
        title: "Store",
        points: [
          "No Store-specific performance claim is included because this briefing input contains no verified Store snapshot.",
        ],
      },
      {
        title: "Marketing",
        points: [
          "No marketing performance claim is included because this briefing input contains no verified campaign or publication evidence.",
        ],
      },
      {
        title: "Operations",
        points: [
          `${intelligence.handoffsToday} workforce handoff(s) were recorded today; ${intelligence.completedToday} mission run(s) completed today.`,
        ],
      },
      {
        title: "System / provider health",
        points: [
          `${intelligence.providerWarnings} provider warning(s) are recorded from verified runtime or run evidence.`,
          ...failureSummary,
        ],
      },
      {
        title: "Approvals required",
        points: [
          intelligence.approvalsRequired
            ? `${intelligence.approvalsRequired} pending approval request(s) require a recorded decision before execution.`
            : "No pending approval records were found.",
        ],
      },
      {
        title: "Safe automation vs CEO approval",
        points: [
          "Safe internal drafting, analysis and non-binding handoffs may be automated within recorded policy. Publishing, spending, external sending and other controlled actions require their recorded approval boundary.",
        ],
      },
    ],
    topActions,
  };
}
