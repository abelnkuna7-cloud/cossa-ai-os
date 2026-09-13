import type { NotificationEvent, NotificationEventSeverity } from "@/lib/notification-events";

export type NotificationWorkspacePriority = "urgent" | "high" | "normal";

export interface NotificationWorkspaceEventItem {
  id: string;
  priority: NotificationWorkspacePriority;
  type: string;
  title: string;
  description: string;
  href: string;
  affectedRecord: string;
  entityType: string;
  entityId: string;
  affectedBusiness: string;
  evidence: string;
  why: string;
  recommendedAction: string;
  when: string;
  canonical: true;
}

function priorityForSeverity(severity: NotificationEventSeverity): NotificationWorkspacePriority {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  return "normal";
}

function evidenceSummary(evidence: Record<string, unknown>): string {
  const keys = Object.keys(evidence);
  if (keys.length === 0) return "Canonical notification event record";
  return `Canonical event evidence: ${keys.slice(0, 6).join(", ")}`;
}

function metadataText(event: NotificationEvent, key: string): string | null {
  const value = event.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function notificationEventToWorkspaceItem(
  event: NotificationEvent,
): NotificationWorkspaceEventItem {
  const affectedBusiness = metadataText(event, "affected_business") ?? "Cossa Nexus Holdings";
  const recommendedAction =
    metadataText(event, "recommended_action") ??
    (event.action_href
      ? "Open the affected record, review the evidence, and take the appropriate owner action."
      : "Review the evidence and decide the appropriate owner action.");
  const why =
    metadataText(event, "why") ??
    `A trusted Cossa backend recorded this ${event.category} event with ${event.severity} severity.`;

  return {
    id: `event-${event.event_key}`,
    priority: priorityForSeverity(event.severity),
    type: event.category,
    title: event.title,
    description: event.summary,
    href: event.action_href ?? "/notifications",
    affectedRecord: event.source_id ?? event.id,
    entityType: event.source_type,
    entityId: event.source_id ?? event.id,
    affectedBusiness,
    evidence: evidenceSummary(event.evidence ?? {}),
    why,
    recommendedAction,
    when: event.occurred_at,
    canonical: true,
  };
}

export function notificationEventsToWorkspaceItems(
  events: readonly NotificationEvent[],
): NotificationWorkspaceEventItem[] {
  return events.map(notificationEventToWorkspaceItem);
}
