export type WorkspaceEnvironment = "production" | "preview" | "development";

export type WorkspaceRuntimeStatus = "Production" | "Testing" | "Development";

/**
 * Keep the visible runtime state consistent across workspaces. This identifies
 * the deployed application environment; it never implies an external provider
 * or business account is connected.
 */
export function workspaceEnvironment(): WorkspaceEnvironment {
  const configuredEnvironment = import.meta.env.VITE_APP_ENV?.trim().toLowerCase();

  if (configuredEnvironment === "production") return "production";
  if (configuredEnvironment === "preview" || configuredEnvironment === "staging") {
    return "preview";
  }
  if (configuredEnvironment === "development") return "development";

  return import.meta.env.PROD ? "production" : "development";
}

export function workspaceRuntimeStatus(): WorkspaceRuntimeStatus {
  const environment = workspaceEnvironment();
  if (environment === "production") return "Production";
  if (environment === "preview") return "Testing";
  return "Development";
}

export function workspaceRuntimeDescription(): string {
  const environment = workspaceEnvironment();
  if (environment === "production") {
    return "Production Cossa workspace. Available information depends on authorised source connections; verify every AI recommendation before acting.";
  }
  if (environment === "preview") {
    return "Preview environment for controlled validation before production release.";
  }
  return "Development environment for local implementation and testing.";
}
