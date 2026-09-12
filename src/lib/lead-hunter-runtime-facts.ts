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
 */
export function buildLeadHunterRuntimeResearchFacts(
  hunt: LeadHunterSearchResponse,
): LeadHunterRuntimeResearchFacts {
  const fullProspects = hunt.prospects;
  const bundles = buildLeadHunterFactBundles(fullProspects);

  return {
    fullProspects,
    modelBriefs: leadHunterModelBriefs(bundles),
    verifiedForAutomatedUseIds: bundles
      .filter((bundle) => bundle.verified_for_automated_use)
      .map((bundle) => bundle.full_record.id),
  };
}
