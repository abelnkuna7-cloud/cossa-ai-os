import {
  decideCossaIntelligenceSources,
  getGroqCapacityMode,
  shouldDeferBackgroundWork,
  type CossaTaskPriority,
  type GroqCapacitySnapshot,
} from "./cossa-ai-intelligence";
import {
  buildMemoryGroundingBlock,
  type CossaConversationMemory,
  type CossaConversationMessage,
} from "./cossa-ai-memory";

export interface CossaContextPlanInput {
  message: string;
  conversationMemory?: CossaConversationMemory | null;
  recentMessages?: readonly CossaConversationMessage[];
  groqCapacity?: GroqCapacitySnapshot;
  priorityOverride?: CossaTaskPriority;
}

export interface CossaContextPlan {
  groundingOrder: readonly ["memory", "knowledge", "operational", "external"];
  requestedSources: ReturnType<typeof decideCossaIntelligenceSources>["sources"];
  memoryGrounding: string;
  needsExternalResearch: boolean;
  priority: CossaTaskPriority;
  groqMode: ReturnType<typeof getGroqCapacityMode>;
  deferProviderCall: boolean;
  instructions: string[];
}

/**
 * Shared planner for Cossa AI OS agents and assistants.
 *
 * It does not perform network calls. It decides what evidence should be
 * consulted first and whether a provider call should be deferred. This keeps
 * policy deterministic, testable and reusable across Growth, agents, voice,
 * Store and future Cossa surfaces.
 */
export function buildCossaContextPlan(input: CossaContextPlanInput): CossaContextPlan {
  const decision = decideCossaIntelligenceSources(input.message);
  const priority = input.priorityOverride ?? decision.priority;
  const groqMode = getGroqCapacityMode(input.groqCapacity ?? {});
  const deferProviderCall = shouldDeferBackgroundWork(priority, groqMode);
  const memoryGrounding = buildMemoryGroundingBlock(
    input.conversationMemory,
    input.recentMessages ?? [],
  );

  const instructions = [
    "Consult durable Cossa memory before external providers.",
    "Consult verified Cossa knowledge before external providers.",
  ];

  if (decision.sources.includes("operational")) {
    instructions.push("Consult authorised live Cossa operational data before external providers.");
  }

  if (decision.needsExternalResearch) {
    instructions.push(
      "Use external research only after internal evidence is checked and only for facts that genuinely require freshness.",
    );
  } else {
    instructions.push("Do not perform external research by default for this request.");
  }

  if (deferProviderCall) {
    instructions.push(
      "Groq capacity is protected: defer non-critical provider work and preserve capacity for CEO, customer and operationally important requests.",
    );
  }

  return {
    groundingOrder: ["memory", "knowledge", "operational", "external"],
    requestedSources: decision.sources,
    memoryGrounding,
    needsExternalResearch: decision.needsExternalResearch,
    priority,
    groqMode,
    deferProviderCall,
    instructions,
  };
}
