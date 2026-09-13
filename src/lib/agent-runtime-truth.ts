export type RuntimeProviderStatus =
  | "ready"
  | "configuration_required"
  | "rate_limited"
  | "provider_unavailable";

export type AgentRuntimeProvider = {
  provider: string;
  model: string;
  priority: string;
  capabilities: string[];
  configured: boolean;
  status: RuntimeProviderStatus;
  last_error_category: string | null;
  circuit_state: string;
  circuit_open_until: string | null;
};

export type AgentRuntimeAdapter = {
  id?: string;
  tool_key?: string;
  name?: string;
  provider?: string;
  capability?: string;
  connection_state?: string;
  runtime_connection_state?:
    | "ready"
    | "degraded"
    | "disabled"
    | "configuration_required"
    | "connection_required";
  risk_level?: string;
  requires_approval?: boolean;
  last_checked_at?: string | null;
  [key: string]: unknown;
};

export type AgentRuntimeDashboard = {
  runtime: {
    server_execution: "active" | "deployment_verification_required" | "configuration_required" | string;
    device_independence: string;
    provider_order: string[];
    worker_trigger_configuration_present: boolean;
    worker_deployment_verified: boolean;
    worker_last_seen_at: string | null;
    external_sending_enabled: boolean;
  };
  providers: AgentRuntimeProvider[];
  agents: Array<Record<string, unknown>>;
  adapters: AgentRuntimeAdapter[];
  tasks: Array<Record<string, unknown>>;
  approvals: Array<Record<string, unknown>>;
  circuits: Array<Record<string, unknown>>;
  triggers: Array<Record<string, unknown>>;
  missions: Array<Record<string, unknown>>;
};

export type RuntimeHealthState =
  | "HEALTHY"
  | "DEGRADED"
  | "FAILED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "NOT_VERIFIED";

export type AgentRuntimeTruth = {
  worker: {
    state: RuntimeHealthState;
    configured: boolean;
    deploymentVerified: boolean;
    lastSeenAt: string | null;
    message: string;
  };
  providers: Array<{
    provider: string;
    model: string;
    state: RuntimeHealthState;
    configured: boolean;
    lastErrorCategory: string | null;
    circuitState: string;
    circuitOpenUntil: string | null;
  }>;
  tools: Array<{
    toolKey: string;
    name: string;
    state: RuntimeHealthState;
    lastCheckedAt: string | null;
  }>;
};

function providerHealth(status: RuntimeProviderStatus): RuntimeHealthState {
  if (status === "ready") return "HEALTHY";
  if (status === "rate_limited") return "RATE_LIMITED";
  if (status === "configuration_required") return "NOT_CONFIGURED";
  return "FAILED";
}

function adapterHealth(status: AgentRuntimeAdapter["runtime_connection_state"]): RuntimeHealthState {
  if (status === "ready") return "HEALTHY";
  if (status === "degraded") return "DEGRADED";
  if (status === "configuration_required" || status === "connection_required") return "NOT_CONFIGURED";
  if (status === "disabled") return "FAILED";
  return "NOT_VERIFIED";
}

export function resolveAgentRuntimeTruth(dashboard: AgentRuntimeDashboard): AgentRuntimeTruth {
  const workerConfigured = dashboard.runtime.worker_trigger_configuration_present;
  const workerVerified = dashboard.runtime.worker_deployment_verified;
  const workerState: RuntimeHealthState = workerVerified
    ? "HEALTHY"
    : workerConfigured
      ? "NOT_VERIFIED"
      : "NOT_CONFIGURED";

  return {
    worker: {
      state: workerState,
      configured: workerConfigured,
      deploymentVerified: workerVerified,
      lastSeenAt: dashboard.runtime.worker_last_seen_at,
      message: workerVerified
        ? "Hosted worker heartbeat is recent and deployment is verified."
        : workerConfigured
          ? "Worker configuration exists, but a recent hosted-worker heartbeat has not verified deployment."
          : "Hosted worker configuration is incomplete.",
    },
    providers: dashboard.providers.map((provider) => ({
      provider: provider.provider,
      model: provider.model,
      state: providerHealth(provider.status),
      configured: provider.configured,
      lastErrorCategory: provider.last_error_category,
      circuitState: provider.circuit_state,
      circuitOpenUntil: provider.circuit_open_until,
    })),
    tools: dashboard.adapters.map((adapter) => ({
      toolKey: typeof adapter.tool_key === "string" ? adapter.tool_key : "unknown",
      name: typeof adapter.name === "string" ? adapter.name : "Unnamed tool",
      state: adapterHealth(adapter.runtime_connection_state),
      lastCheckedAt: typeof adapter.last_checked_at === "string" ? adapter.last_checked_at : null,
    })),
  };
}
