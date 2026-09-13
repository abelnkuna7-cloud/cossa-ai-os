import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentActivityFeed } from "../src/lib/agent-activity.ts";

test("orders recorded runs and approvals newest first", () => {
  const feed = buildAgentActivityFeed({
    runs: [
      {
        id: "run-1",
        mission_id: "mission-1",
        employee_id: "employee-1",
        status: "completed",
        model_provider: "groq",
        model_name: "model-a",
        error_code: null,
        error_message: null,
        started_at: "2026-09-13T08:00:00Z",
        completed_at: "2026-09-13T08:05:00Z",
        created_at: "2026-09-13T08:00:00Z",
      },
    ],
    approvals: [
      {
        id: "approval-1",
        mission_id: "mission-1",
        run_id: "run-2",
        requested_by_employee_id: "employee-2",
        action_type: "send_customer_email",
        risk_level: "high",
        justification: "Customer communication needs owner approval.",
        status: "pending",
        requested_at: "2026-09-13T08:10:00Z",
      },
    ],
  });

  assert.equal(feed.length, 2);
  assert.equal(feed[0].kind, "approval");
  assert.equal(feed[0].state, "pending_approval");
  assert.equal(feed[1].kind, "run");
});

test("failed runs surface only recorded failure detail", () => {
  const feed = buildAgentActivityFeed({
    runs: [
      {
        id: "run-failed",
        mission_id: "mission-1",
        employee_id: "employee-1",
        status: "failed",
        model_provider: "openai",
        model_name: "gpt",
        error_code: "provider_error",
        error_message: "Provider request failed.",
        started_at: null,
        completed_at: "2026-09-13T08:05:00Z",
        created_at: "2026-09-13T08:00:00Z",
      },
    ],
    approvals: [],
  });

  assert.equal(feed[0].detail, "Provider request failed.");
  assert.equal(feed[0].state, "failed");
});

test("non-pending approvals are not presented as current blockers", () => {
  const feed = buildAgentActivityFeed({
    runs: [],
    approvals: [
      {
        id: "approval-closed",
        mission_id: "mission-1",
        run_id: null,
        requested_by_employee_id: "employee-1",
        action_type: "publish",
        risk_level: "high",
        justification: "Review",
        status: "approved",
        requested_at: "2026-09-13T08:10:00Z",
      },
    ],
  });

  assert.equal(feed.length, 0);
});
