import assert from "node:assert/strict";
import test from "node:test";
import {
  notificationEventToWorkspaceItem,
  notificationEventsToWorkspaceItems,
} from "../src/lib/notification-event-items.ts";
import type { NotificationEvent } from "../src/lib/notification-events.ts";

function event(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: "event-id",
    organisation_id: "org-id",
    event_key: "approval:123",
    category: "approval",
    severity: "critical",
    source_type: "approval",
    source_id: "123",
    title: "CEO approval required",
    summary: "A high-risk action is waiting for owner approval.",
    evidence: { risk_level: "critical", action_type: "publish" },
    action_href: "/ai/approvals",
    occurred_at: "2026-09-13T09:00:00.000Z",
    recorded_at: "2026-09-13T09:00:01.000Z",
    metadata: {},
    ...overrides,
  };
}

test("critical canonical events become urgent workspace items", () => {
  const item = notificationEventToWorkspaceItem(event());
  assert.equal(item.priority, "urgent");
  assert.equal(item.id, "event-approval:123");
  assert.equal(item.href, "/ai/approvals");
  assert.equal(item.canonical, true);
});

test("high remains high and info/normal remain normal", () => {
  assert.equal(notificationEventToWorkspaceItem(event({ severity: "high" })).priority, "high");
  assert.equal(notificationEventToWorkspaceItem(event({ severity: "normal" })).priority, "normal");
  assert.equal(notificationEventToWorkspaceItem(event({ severity: "info" })).priority, "normal");
});

test("mapping never invents an external action or destination", () => {
  const item = notificationEventToWorkspaceItem(
    event({ action_href: null, metadata: {}, evidence: {} }),
  );
  assert.equal(item.href, "/notifications");
  assert.match(item.recommendedAction, /Review the evidence/);
  assert.equal(item.evidence, "Canonical notification event record");
});

test("metadata may supply owner-facing business and recommended action", () => {
  const item = notificationEventToWorkspaceItem(
    event({
      metadata: {
        affected_business: "Cossa Facility Services",
        recommended_action: "Review and decide this approval.",
        why: "The requested action is classified as critical risk.",
      },
    }),
  );
  assert.equal(item.affectedBusiness, "Cossa Facility Services");
  assert.equal(item.recommendedAction, "Review and decide this approval.");
  assert.equal(item.why, "The requested action is classified as critical risk.");
});

test("batch mapping preserves every canonical event exactly once", () => {
  const items = notificationEventsToWorkspaceItems([
    event({ event_key: "approval:1" }),
    event({ event_key: "run:2", category: "workforce", source_type: "mission_run" }),
  ]);
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((item) => item.id),
    ["event-approval:1", "event-run:2"],
  );
});
