import assert from "node:assert/strict";
import test from "node:test";

import { contextIntegrityNotificationEvents } from "../src/lib/context-integrity-notification-events.ts";

test("projects critical and high integrity issues into canonical workforce events", () => {
  const events = contextIntegrityNotificationEvents({
    organisationId: "org-1",
    recordedAt: "2026-09-13T11:00:00.000Z",
    reports: [
      {
        missionId: "mission-1",
        status: "critical",
        checkedHandoffs: 3,
        issues: [
          {
            id: "handoff-2-ordering",
            missionId: "mission-1",
            handoffId: "handoff-2",
            stage: 2,
            severity: "critical",
            code: "ordering_violation",
            summary: "Downstream completed before upstream.",
          },
          {
            id: "handoff-3-records",
            missionId: "mission-1",
            handoffId: "handoff-3",
            stage: 3,
            severity: "high",
            code: "missing_retained_records",
            summary: "Retained identifiers are missing.",
          },
        ],
      },
    ],
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].category, "workforce");
  assert.equal(events[0].severity, "critical");
  assert.equal(events[0].event_key, "workforce:context-integrity:handoff-2-ordering");
  assert.equal(events[0].action_href, "/ai/context-integrity");
  assert.deepEqual(events[0].evidence, {
    mission_id: "mission-1",
    handoff_id: "handoff-2",
    stage: 2,
    integrity_code: "ordering_violation",
    integrity_severity: "critical",
  });
  assert.equal(events[1].severity, "high");
});

test("does not manufacture events for healthy reports", () => {
  const events = contextIntegrityNotificationEvents({
    organisationId: "org-1",
    recordedAt: "2026-09-13T11:00:00.000Z",
    reports: [{ missionId: "mission-healthy", status: "healthy", checkedHandoffs: 2, issues: [] }],
  });

  assert.deepEqual(events, []);
});
