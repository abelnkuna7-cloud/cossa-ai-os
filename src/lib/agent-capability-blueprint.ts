export type AgentCapabilityUpgradeStatus =
  | "existing_foundation"
  | "ready_to_wire"
  | "requires_runtime_work"
  | "requires_ui_work";

export type AgentCapabilityRisk = "low" | "medium" | "high";

export interface AgentCapabilityBlueprintItem {
  id: string;
  name: string;
  purpose: string;
  status: AgentCapabilityUpgradeStatus;
  risk: AgentCapabilityRisk;
  existingPrimitives: readonly string[];
  requiredOutcome: string;
  safetyBoundary: string;
}

/**
 * Capability blueprint for the requested Muse-inspired upgrade.
 *
 * This is intentionally a Cossa-owned implementation plan. It copies no
 * proprietary Muse UI, source code or private implementation details. Each
 * capability is mapped onto primitives that already exist in the Cossa
 * workforce model so the upgrade remains additive rather than a rebuild.
 */
export const AGENT_CAPABILITY_BLUEPRINT: readonly AgentCapabilityBlueprintItem[] = [
  {
    id: "task_decomposition",
    name: "Task decomposition",
    purpose: "Turn one owner objective into explicit, reviewable work steps and sub-missions.",
    status: "ready_to_wire",
    risk: "low",
    existingPrimitives: ["missions", "parent_mission_id", "constraints", "output_schema"],
    requiredOutcome:
      "A mission can expose its ordered work plan, child missions, dependencies and completion state.",
    safetyBoundary:
      "Planning may be automatic; binding external actions still require the existing approval boundary.",
  },
  {
    id: "durable_working_context",
    name: "Durable working context",
    purpose:
      "Preserve mission goals, evidence, prior outputs and retained record references across longer jobs.",
    status: "existing_foundation",
    risk: "medium",
    existingPrimitives: ["mission_runs", "evidence_records", "employee_handoffs", "retained_record_ids"],
    requiredOutcome:
      "A resumed or handed-off mission receives bounded verified context without replaying the whole history.",
    safetyBoundary:
      "Only authorised organisation records and evidence may enter context; credentials and unrelated private data stay out.",
  },
  {
    id: "visible_progress_timeline",
    name: "Visible progress timeline",
    purpose: "Show the owner what an agent is doing, what finished, what failed and what is next.",
    status: "requires_ui_work",
    risk: "low",
    existingPrimitives: ["missions", "mission_runs", "audit_events", "notification_events"],
    requiredOutcome:
      "Every agent workspace shows current mission, recent activity, evidence, blockers and next action from real records.",
    safetyBoundary:
      "Never infer working status from an enabled employee profile; live work requires a running mission/run or valid lease.",
  },
  {
    id: "agent_handoffs",
    name: "Agent-to-agent handoffs",
    purpose: "Move specialised work to the correct Cossa employee without losing context or evidence.",
    status: "existing_foundation",
    risk: "medium",
    existingPrimitives: ["employee_handoffs", "from_employee_id", "to_employee_id", "context"],
    requiredOutcome:
      "The owner can see who handed work to whom, why, what was retained and whether the handoff completed.",
    safetyBoundary:
      "A handoff does not expand permissions; the receiving employee remains limited by its own allowed actions and approvals.",
  },
  {
    id: "pause_resume_retry",
    name: "Pause, resume and controlled retry",
    purpose: "Allow long-running jobs to recover safely instead of restarting from zero.",
    status: "requires_runtime_work",
    risk: "medium",
    existingPrimitives: ["missions", "mission_runs", "error_code", "error_message"],
    requiredOutcome:
      "Transient failures can resume from the last verified checkpoint while non-retryable failures stop clearly.",
    safetyBoundary:
      "Retries must obey existing non-retryable error rules and must never repeat a binding external action without fresh authority.",
  },
  {
    id: "reusable_playbooks",
    name: "Reusable task playbooks",
    purpose: "Turn successful recurring jobs into repeatable Cossa workflows without hard-coding one-off prompts.",
    status: "ready_to_wire",
    risk: "low",
    existingPrimitives: ["playbooks", "missions", "constraints", "output_schema"],
    requiredOutcome:
      "The owner can launch a proven workflow template, review its steps and adjust scope before execution.",
    safetyBoundary:
      "A playbook may automate safe internal work only; high-risk steps remain explicit approval checkpoints.",
  },
  {
    id: "evidence_gated_reasoning",
    name: "Evidence-gated reasoning",
    purpose:
      "Make agent conclusions traceable to current records, verified evidence and provider/runtime truth.",
    status: "existing_foundation",
    risk: "high",
    existingPrimitives: ["evidence_records", "audit_events", "notification_events", "capability_registry"],
    requiredOutcome:
      "Agent outputs clearly separate verified facts, inference, missing evidence and blocked actions.",
    safetyBoundary:
      "No invented leads, suppliers, revenue, execution state or completed action may be promoted as fact.",
  },
  {
    id: "owner_controlled_execution",
    name: "Owner-controlled execution checkpoints",
    purpose: "Let agents work independently internally while keeping consequential actions under CEO control.",
    status: "existing_foundation",
    risk: "high",
    existingPrimitives: ["approvals", "risk_level", "audit_events", "allowed_actions", "prohibited_actions"],
    requiredOutcome:
      "An agent can prepare the action and evidence, then stop at a visible approval checkpoint when authority is required.",
    safetyBoundary:
      "Financial, legal, credential, publication, account-control and other high-risk external actions cannot self-approve.",
  },
] as const;

export function capabilityBlueprintById(id: string): AgentCapabilityBlueprintItem | null {
  return AGENT_CAPABILITY_BLUEPRINT.find((item) => item.id === id) ?? null;
}

export function capabilitiesReadyToWire(): AgentCapabilityBlueprintItem[] {
  return AGENT_CAPABILITY_BLUEPRINT.filter((item) => item.status === "ready_to_wire");
}
