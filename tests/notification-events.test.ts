import assert from "node:assert/strict";
import test from "node:test";
import { sortNotificationEvents, type NotificationEvent } from "../src/lib/notification-events";

function event(
  id: string,
  severity: NotificationEvent["severity"],
  occurredAt: string,
): NotificationEvent {
  return {
    id,
    organisation_id: "00000000-0000-0000-0000-000000000001",
    event_key: id,
    category: "system",
    severity,
    source_type: "test",
    source_id: id,
    title: id,
    summary: id,
    evidence: {},
    action_href: null,
    occurred_at: occurredAt,
    recorded_at: occurredAt,
    metadata: {},
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
