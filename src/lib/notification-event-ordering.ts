export type NotificationEventSeverity = "critical" | "high" | "normal" | "info";

export interface NotificationEventOrderingRecord {
  severity: NotificationEventSeverity;
  occurred_at: string;
}

export function notificationEventRank(event: NotificationEventOrderingRecord) {
  const severityRank: Record<NotificationEventSeverity, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    info: 3,
  };

  return {
    severity: severityRank[event.severity],
    occurredAt: Date.parse(event.occurred_at) || 0,
  };
}

export function sortNotificationEvents<T extends NotificationEventOrderingRecord>(
  events: readonly T[],
): T[] {
  return [...events].sort((left, right) => {
    const a = notificationEventRank(left);
    const b = notificationEventRank(right);
    if (a.severity !== b.severity) return a.severity - b.severity;
    return b.occurredAt - a.occurredAt;
  });
}
