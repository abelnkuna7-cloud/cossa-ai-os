import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeNotificationEventsForPresentation,
  topCeoNotificationEvents,
} from "../src/lib/notification-event-presentation.ts";

function event(overrides: Partial<any> = {}) {
  return {
    id: "event-1",
    organisation_id: "org-1",
    event_key: "workforce:test",
    category: "workforce",
    severity: "high",
    source_type: "test",
    source_id: "source-1",
    title: "Test",
    summary: "Summary",
    evidence: {},
    action_href: "/notifications",
    occurred_at: "2026-09-13T10:00:00Z",
    recorded_at: "2026-09-13T10:00:00Z",
    metadata: {},
    ...overrides,
  } as never;
}

test("deduplicates projected events when canonical persisted record exists", () => {
  const projected = event({ id: "projected", title: "Projected" });
  const persisted = event({ id: "persisted", title: "Persisted" });
  const merged = mergeNotificationEventsForPresentation({ persisted: [persisted], projected: [projected] });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "persisted");
  assert.equal(merged[0].title, "Persisted");
});

test("keeps unique projected integrity events visible before persistence", () => {
  const merged = mergeNotificationEventsForPresentation({
    persisted: [event({ event_key: "approval:1", severity: "normal", occurred_at: "2026-09-13T09:00:00Z" })],
    projected: [event({ event_key: "workforce:context-integrity:1", severity: "critical", occurred_at: "2026-09-13T10:00:00Z" })],
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].event_key, "workforce:context-integrity:1");
});

test("CEO view returns only the highest priority ordered events", () => {
  const events = [
    event({ event_key: "normal", severity: "normal" }),
    event({ event_key: "critical", severity: "critical" }),
    event({ event_key: "high", severity: "high" }),
  ];

  const top = topCeoNotificationEvents(events, 2);
  assert.deepEqual(top.map((item) => item.event_key), ["critical", "high"]);
});
