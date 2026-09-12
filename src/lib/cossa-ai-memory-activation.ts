export type CossaMemoryMode = "disabled" | "read" | "read-write";

export interface CossaMemoryActivation {
  mode: CossaMemoryMode;
  readEnabled: boolean;
  writeEnabled: boolean;
  reason: string;
}

type EnvironmentLike = Record<string, string | undefined>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Fail-closed memory activation.
 *
 * Read must be explicitly enabled before writeback is allowed. This prevents a
 * partially configured deployment from silently writing memory that the active
 * reasoning path is not yet reading and validating.
 */
export function resolveCossaMemoryActivation(
  environment: EnvironmentLike = process.env,
): CossaMemoryActivation {
  const readEnabled = enabled(environment.COSSA_AI_MEMORY_ENABLED);
  const requestedWrite = enabled(environment.COSSA_AI_MEMORY_WRITEBACK_ENABLED);
  const writeEnabled = readEnabled && requestedWrite;

  if (writeEnabled) {
    return {
      mode: "read-write",
      readEnabled: true,
      writeEnabled: true,
      reason: "Memory read and protected conversation writeback are explicitly enabled.",
    };
  }

  if (readEnabled) {
    return {
      mode: "read",
      readEnabled: true,
      writeEnabled: false,
      reason: requestedWrite
        ? "Writeback was requested but remains blocked until memory read is active."
        : "Memory read is enabled while writeback remains staged off.",
    };
  }

  return {
    mode: "disabled",
    readEnabled: false,
    writeEnabled: false,
    reason: requestedWrite
      ? "Writeback cannot activate by itself; memory read must be explicitly enabled first."
      : "Memory remains fail-closed until explicitly activated.",
  };
}
