import type { LeadHunterProspect } from "./lead-hunter-data.ts";
import { validateLeadHunterProspectEvidence } from "./lead-hunter-evidence-guard.ts";

export type LeadHunterFactBundle = {
  full_record: LeadHunterProspect;
  model_brief: LeadHunterModelFactBrief;
  verified_for_automated_use: boolean;
};

export type LeadHunterModelFactBrief = {
  id: string;
  organisation_name: string;
  location: string | null;
  recommended_company: string;
  recommended_service: string;
  classification: string;
  verification_status: string;
  sales_priority: string;
  total_score: number;
  opportunity_summary: string;
  primary_source_url: string;
  public_email: string | null;
  public_phone: string | null;
  procurement_reference: string | null;
  procurement_closing_date: string | null;
  procurement_status: string | null;
  evidence_urls: string[];
};

function clip(value: string, max = 360): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 1))}…`;
}

function locationFor(prospect: LeadHunterProspect): string | null {
  const parts = [prospect.suburb, prospect.city, prospect.province, prospect.country]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? [...new Set(parts)].join(", ") : null;
}

/**
 * Converts one full evidence-backed prospect into a compact factual model brief
 * without discarding the original structured record.
 *
 * The brief deliberately excludes long evidence excerpts, website-audit detail,
 * AI interpretation, reasoning prose and other token-heavy fields. Those facts
 * remain available on full_record for history, CRM, UI and verification paths.
 */
export function buildLeadHunterFactBundle(
  prospect: LeadHunterProspect,
): LeadHunterFactBundle {
  const guard = validateLeadHunterProspectEvidence(prospect);

  return {
    full_record: prospect,
    verified_for_automated_use:
      prospect.verification_status === "verified" && guard.valid,
    model_brief: {
      id: prospect.id,
      organisation_name: prospect.organisation_name,
      location: locationFor(prospect),
      recommended_company: prospect.recommended_company,
      recommended_service: prospect.recommended_service,
      classification: prospect.classification,
      verification_status: prospect.verification_status,
      sales_priority: prospect.sales_priority,
      total_score: prospect.total_score,
      opportunity_summary: clip(prospect.opportunity_summary),
      primary_source_url: prospect.primary_source_url,
      public_email: prospect.public_email,
      public_phone: prospect.public_phone,
      procurement_reference: prospect.procurement?.reference_number ?? null,
      procurement_closing_date: prospect.procurement?.closing_date ?? null,
      procurement_status: prospect.procurement?.current_status ?? null,
      evidence_urls: [
        ...new Set(
          prospect.evidence
            .map((item) => item.url?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ].slice(0, 3),
    },
  };
}

export function buildLeadHunterFactBundles(
  prospects: readonly LeadHunterProspect[],
): LeadHunterFactBundle[] {
  return prospects.map(buildLeadHunterFactBundle);
}

/**
 * Gives model stages only short factual inputs. Unverified records remain in
 * full_record but are not marked safe for automated CRM/outreach use.
 */
export function leadHunterModelBriefs(
  bundles: readonly LeadHunterFactBundle[],
): LeadHunterModelFactBrief[] {
  return bundles.map((bundle) => bundle.model_brief);
}
