import type { AgentContextEntry } from "./agent-working-context";

export interface AgentExecutionContextPacket {
  missionId: string;
  priorOutputs: string[];
  authorisedEvidence: string[];
  retainedRecordIds: Record<string, unknown>;
  evidenceBoundaries: string[];
  sourceEntryIds: string[];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildAgentExecutionContextPacket(input: {
  entries: readonly AgentContextEntry[];
  missionId: string;
  maxPriorOutputs?: number;
  maxEvidenceItems?: number;
}): AgentExecutionContextPacket {
  const missionEntries = input.entries.filter((entry) => entry.missionId === input.missionId);
  const maxPriorOutputs = Math.max(0, input.maxPriorOutputs ?? 2);
  const maxEvidenceItems = Math.max(0, input.maxEvidenceItems ?? 2);

  const completedOutputs = missionEntries
    .filter((entry) => entry.kind === "run_output")
    .slice()
    .sort((a, b) => (Date.parse(a.recordedAt) || 0) - (Date.parse(b.recordedAt) || 0));

  const priorOutputs = completedOutputs
    .slice(Math.max(0, completedOutputs.length - maxPriorOutputs))
    .map((entry) => entry.summary.trim())
    .filter(Boolean);

  const authorisedEvidence = uniqueStrings(completedOutputs.flatMap((entry) => entry.sourceScope)).slice(
    0,
    maxEvidenceItems,
  );

  const retainedRecordIds: Record<string, unknown> = {};
  for (const entry of missionEntries
    .filter((candidate) => candidate.kind === "retained_records" || candidate.kind === "handoff")
    .slice()
    .sort((a, b) => (Date.parse(a.recordedAt) || 0) - (Date.parse(b.recordedAt) || 0))) {
    Object.assign(retainedRecordIds, entry.retainedRecordIds ?? {});
  }

  return {
    missionId: input.missionId,
    priorOutputs,
    authorisedEvidence,
    retainedRecordIds,
    evidenceBoundaries: uniqueStrings(missionEntries.map((entry) => entry.evidenceBoundary)),
    sourceEntryIds: missionEntries.map((entry) => entry.id),
  };
}
