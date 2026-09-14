import assert from "node:assert/strict";
import test from "node:test";
import {
  sortNotificationEvents,
  type NotificationEventSeverity,
} from "../src/lib/notification-event-ordering.ts";

interface EventRecord {
  id: string;
  severity: NotificationEventSeverity;
  occurred_at: string;
}

function event(id: string, severity: NotificationEventSeverity, occurredAt: string): EventRecord {
  return {
    id,
    severity,
    occurred_at: occurredAt,
  };
}

test("notification events prioritise severity before recency", () => {
  const ordered = sortNotificationEvents([
    event("new-normal", "normal", "2026-09-13T10:00:00Z"),
    event("old-critical", "critical", "2026-09-12T10:00:00Z"),
    event("new-high", "high", "2026-09-13T11:00:00Z"),
  ]);

  assert.deepEqual(
    ordered.map((item) => item.id),
    ["old-critical", "new-high", "new-normal"],
  );
});

test("notification events use newest-first ordering within one severity", () => {
  const ordered = sortNotificationEvents([
    event("older", "high", "2026-09-13T08:00:00Z"),
    event("newer", "high", "2026-09-13T09:00:00Z"),
  ]);

  assert.deepEqual(
    ordered.map((item) => item.id),
    ["newer", "older"],
  );
});
