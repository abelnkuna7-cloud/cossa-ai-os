import type { AgentContextIntegrityReport } from "./agent-context-integrity";
import type { NotificationEvent } from "./notification-events";

export interface ContextIntegrityNotificationInput {
  organisationId: string;
  reports: readonly AgentContextIntegrityReport[];
  recordedAt?: string;
}

/**
 * Projects recorded context-integrity failures into the canonical notification shape.
 * This is a pure projection only: it does not persist, send or execute anything.
 */
export function contextIntegrityNotificationEvents(
  input: ContextIntegrityNotificationInput,
): NotificationEvent[] {
  const recordedAt = input.recordedAt ?? new Date().toISOString();

  return input.reports.flatMap((report) =>
    report.issues.map((issue) => ({
      id: `context-integrity-${issue.id}`,
      organisation_id: input.organisationId,
      event_key: `workforce:context-integrity:${issue.id}`,
      category: "workforce" as const,
      severity: issue.severity === "critical" ? ("critical" as const) : ("high" as const),
      source_type: "agent_context_integrity",
      source_id: issue.handoffId,
      title:
        issue.severity === "critical"
          ? "Critical agent context integrity failure"
          : "Agent context integrity needs attention",
      summary: issue.summary,
      evidence: {
        mission_id: issue.missionId,
        handoff_id: issue.handoffId,
        stage: issue.stage,
        integrity_code: issue.code,
        integrity_severity: issue.severity,
      },
      action_href: "/ai/context-integrity",
      occurred_at: recordedAt,
      recorded_at: recordedAt,
      metadata: {
        affected_business: "Cossa Nexus Holdings",
        why: "A recorded workforce chain failed a context-integrity check.",
        recommended_action:
          "Review the affected mission handoff, retained identifiers and upstream completed output before allowing downstream work to continue.",
      },
    })),
  );
}
