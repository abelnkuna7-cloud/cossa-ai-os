import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAgentRuntimeTruth,
  type AgentRuntimeDashboard,
} from "../src/lib/agent-runtime";

function dashboard(overrides: Partial<AgentRuntimeDashboard> = {}): AgentRuntimeDashboard {
  return {
    runtime: {
      server_execution: "deployment_verification_required",
      device_independence: "server-first",
      provider_order: ["groq", "openai", "gemini"],
      worker_trigger_configuration_present: true,
      worker_deployment_verified: false,
      worker_last_seen_at: null,
      external_sending_enabled: false,
    },
    providers: [
      {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        priority: "primary",
        capabilities: ["reasoning"],
        configured: true,
        status: "ready",
        last_error_category: null,
        circuit_state: "closed",
        circuit_open_until: null,
      },
      {
        provider: "openai",
        model: "gpt-5.6",
        priority: "secondary",
        capabilities: ["reasoning"],
        configured: true,
        status: "rate_limited",
        last_error_category: "rate_limited",
        circuit_state: "open",
        circuit_open_until: "2026-09-12T18:30:00.000Z",
      },
    ],
    agents: [],
    adapters: [
      {
        tool_key: "cossa-lead-hunter",
        name: "Cossa Lead Hunter",
        runtime_connection_state: "degraded",
        last_checked_at: "2026-09-12T18:00:00.000Z",
      },
    ],
    tasks: [],
    approvals: [],
    circuits: [],
    triggers: [],
    missions: [],
    ...overrides,
  };
}

describe("agent runtime operational truth", () => {
  it("does not claim a configured worker is deployed without a recent heartbeat", () => {
    const truth = resolveAgentRuntimeTruth(dashboard());
    assert.equal(truth.worker.state, "NOT_VERIFIED");
    assert.equal(truth.worker.configured, true);
    assert.equal(truth.worker.deploymentVerified, false);
  });

  it("maps provider and tool states into owner-facing health", () => {
    const truth = resolveAgentRuntimeTruth(dashboard());
    assert.equal(truth.providers[0].state, "HEALTHY");
    assert.equal(truth.providers[1].state, "RATE_LIMITED");
    assert.equal(truth.tools[0].state, "DEGRADED");
  });

  it("marks a recent verified worker as healthy", () => {
    const input = dashboard();
    input.runtime.worker_deployment_verified = true;
    input.runtime.worker_last_seen_at = "2026-09-12T18:59:00.000Z";
    const truth = resolveAgentRuntimeTruth(input);
    assert.equal(truth.worker.state, "HEALTHY");
  });
});