import type { LeadHunterProspect, LeadHunterSearchResponse } from "./lead-hunter-data.ts";
import { buildLeadHunterFactBundles, leadHunterModelBriefs } from "./lead-hunter-facts.ts";

export type LeadHunterRuntimeResearchFacts = {
  fullProspects: LeadHunterProspect[];
  modelBriefs: ReturnType<typeof leadHunterModelBriefs>;
  verifiedForAutomatedUseIds: string[];
};

/**
 * Keeps the complete structured Lead Hunter records for operational use while
 * producing a separate compact factual projection for model stages.
 *
 * Only prospects that passed the final evidence guard are exposed to model
 * qualification/outreach stages. Partially verified records remain available in
 * fullProspects for human review, diagnostics and history, but cannot silently
 * enter automated commercial messaging.
 */
export function buildLeadHunterRuntimeResearchFacts(
  hunt: LeadHunterSearchResponse,
): LeadHunterRuntimeResearchFacts {
  const fullProspects = hunt.prospects;
  const bundles = buildLeadHunterFactBundles(fullProspects);
  const verifiedBundles = bundles.filter((bundle) => bundle.verified_for_automated_use);

  return {
    fullProspects,
    modelBriefs: leadHunterModelBriefs(verifiedBundles),
    verifiedForAutomatedUseIds: verifiedBundles.map((bundle) => bundle.full_record.id),
  };
}
