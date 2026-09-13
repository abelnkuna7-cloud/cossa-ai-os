import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentExecutionContextPacket } from "../src/lib/agent-execution-context.ts";

test("builds downstream execution context only from recorded mission entries", () => {
  const packet = buildAgentExecutionContextPacket({
    missionId: "m1",
    entries: [
      {
        id: "run-1",
        missionId: "m1",
        missionTitle: "Revenue mission",
        employeeId: "e1",
        employeeName: "Lead Hunter",
        kind: "run_output",
        recordedAt: "2026-09-13T10:00:00Z",
        summary: "Verified prospect A.",
        sourceScope: ["authenticated Lead Hunter route"],
        retainedRecordIds: {},
        evidenceBoundary: "External outreach is not proven.",
      },
      {
        id: "records-1",
        missionId: "m1",
        missionTitle: "Revenue mission",
        employeeId: "e2",
        employeeName: "Lead Intake",
        kind: "retained_records",
        recordedAt: "2026-09-13T10:01:00Z",
        summary: "Retained identifiers.",
        sourceScope: [],
        retainedRecordIds: { hunt_id: "hunt-1", prospect_ids: ["p1"] },
        evidenceBoundary: "Identifiers preserve traceability only.",
      },
      {
        id: "other",
        missionId: "m2",
        missionTitle: "Other",
        employeeId: "e3",
        employeeName: "Other",
        kind: "run_output",
        recordedAt: "2026-09-13T10:02:00Z",
        summary: "Must not leak.",
        sourceScope: ["other evidence"],
        retainedRecordIds: {},
        evidenceBoundary: "Other mission boundary.",
      },
    ],
  });

  assert.deepEqual(packet.priorOutputs, ["Verified prospect A."]);
  assert.deepEqual(packet.authorisedEvidence, ["authenticated Lead Hunter route"]);
  assert.equal(packet.retainedRecordIds.hunt_id, "hunt-1");
  assert.deepEqual(packet.sourceEntryIds, ["run-1", "records-1"]);
});

test("keeps only the most recent configured completed outputs", () => {
  const packet = buildAgentExecutionContextPacket({
    missionId: "m1",
    maxPriorOutputs: 2,
    entries: [
      {
        id: "r3", missionId: "m1", missionTitle: "M", employeeId: "e3", employeeName: "C", kind: "run_output", recordedAt: "2026-09-13T12:00:00Z", summary: "third", sourceScope: [], retainedRecordIds: {}, evidenceBoundary: "b",
      },
      {
        id: "r1", missionId: "m1", missionTitle: "M", employeeId: "e1", employeeName: "A", kind: "run_output", recordedAt: "2026-09-13T10:00:00Z", summary: "first", sourceScope: [], retainedRecordIds: {}, evidenceBoundary: "b",
      },
      {
        id: "r2", missionId: "m1", missionTitle: "M", employeeId: "e2", employeeName: "B", kind: "run_output", recordedAt: "2026-09-13T11:00:00Z", summary: "second", sourceScope: [], retainedRecordIds: {}, evidenceBoundary: "b",
      },
    ],
  });

  assert.deepEqual(packet.priorOutputs, ["second", "third"]);
});

test("later retained identifiers update the packet without inventing evidence", () => {
  const packet = buildAgentExecutionContextPacket({
    missionId: "m1",
    entries: [
      {
        id: "h1", missionId: "m1", missionTitle: "M", employeeId: "e1", employeeName: "A", kind: "handoff", recordedAt: "2026-09-13T10:00:00Z", summary: "handoff", sourceScope: [], retainedRecordIds: { lead_id: "old" }, evidenceBoundary: "Handoff is not execution proof.",
      },
      {
        id: "h2", missionId: "m1", missionTitle: "M", employeeId: "e2", employeeName: "B", kind: "retained_records", recordedAt: "2026-09-13T11:00:00Z", summary: "records", sourceScope: [], retainedRecordIds: { lead_id: "new", quote_id: "q1" }, evidenceBoundary: "Identifiers are traceability only.",
      },
    ],
  });

  assert.equal(packet.retainedRecordIds.lead_id, "new");
  assert.equal(packet.retainedRecordIds.quote_id, "q1");
  assert.deepEqual(packet.authorisedEvidence, []);
});
