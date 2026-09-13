import type { LeadHunterProspect, ProspectEvidence } from "./lead-hunter-data.ts";

export type LeadHunterEvidenceGuardFailure =
  | "MISSING_PRIMARY_SOURCE"
  | "MISSING_EVIDENCE"
  | "MISSING_VERIFIED_EVIDENCE"
  | "UNVERIFIED_PROCUREMENT"
  | "EXPIRED_PROCUREMENT"
  | "MISSING_CONTACT_EVIDENCE"
  | "UNSUPPORTED_ESTIMATED_VALUE";

export interface LeadHunterEvidenceGuardResult {
  valid: boolean;
  failures: LeadHunterEvidenceGuardFailure[];
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasUsableEvidence(evidence: readonly ProspectEvidence[]): boolean {
  return evidence.some(
    (item) =>
      isHttpUrl(item.url) &&
      typeof item.checked_at === "string" &&
      item.checked_at.trim().length > 0 &&
      typeof item.title === "string" &&
      item.title.trim().length > 0,
  );
}

function contactRouteSupported(prospect: LeadHunterProspect): boolean {
  if (!prospect.public_email && !prospect.public_phone) return true;
  const contactNeedles = [prospect.public_email, prospect.public_phone]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().replace(/\s+/g, ""));

  return prospect.evidence.some((item) => {
    const haystack = `${item.excerpt ?? ""} ${(item.supports ?? []).join(" ")}`
      .toLowerCase()
      .replace(/\s+/g, "");
    return contactNeedles.some((needle) => haystack.includes(needle));
  });
}

/**
 * Final fail-closed evidence guard for Lead Hunter output.
 *
 * It never creates facts. It only decides whether an already-built prospect
 * carries enough evidence to be shown as a verified commercial result.
 */
export function validateLeadHunterProspectEvidence(
  prospect: LeadHunterProspect,
): LeadHunterEvidenceGuardResult {
  const failures: LeadHunterEvidenceGuardFailure[] = [];

  if (!isHttpUrl(prospect.primary_source_url)) failures.push("MISSING_PRIMARY_SOURCE");
  if (!Array.isArray(prospect.evidence) || prospect.evidence.length === 0) {
    failures.push("MISSING_EVIDENCE");
  } else if (!hasUsableEvidence(prospect.evidence)) {
    failures.push("MISSING_VERIFIED_EVIDENCE");
  }

  if (prospect.classification === "tender" || prospect.signals.some((s) => s.type === "active_tender")) {
    const procurement = prospect.procurement;
    if (!procurement || !procurement.source_is_official || !procurement.service_match_verified) {
      failures.push("UNVERIFIED_PROCUREMENT");
    }
    if (procurement?.current_status === "expired") failures.push("EXPIRED_PROCUREMENT");
  }

  if (!contactRouteSupported(prospect)) failures.push("MISSING_CONTACT_EVIDENCE");

  // Estimated values are optional. If present, they must be positive and the
  // prospect must contain evidence/reasoning supporting a commercial estimate.
  if (prospect.estimated_value !== null) {
    const supported =
      Number.isFinite(prospect.estimated_value) &&
      prospect.estimated_value > 0 &&
      prospect.why_contact.some((item) => /value|budget|contract|rfq|tender|project/i.test(item));
    if (!supported) failures.push("UNSUPPORTED_ESTIMATED_VALUE");
  }

  return { valid: failures.length === 0, failures: [...new Set(failures)] };
}

export function filterLeadHunterProspectsByEvidence(
  prospects: readonly LeadHunterProspect[],
): { accepted: LeadHunterProspect[]; rejected: Array<{ prospect: LeadHunterProspect; failures: LeadHunterEvidenceGuardFailure[] }> } {
  const accepted: LeadHunterProspect[] = [];
  const rejected: Array<{ prospect: LeadHunterProspect; failures: LeadHunterEvidenceGuardFailure[] }> = [];

  for (const prospect of prospects) {
    const result = validateLeadHunterProspectEvidence(prospect);
    if (result.valid) accepted.push(prospect);
    else rejected.push({ prospect, failures: result.failures });
  }

  return { accepted, rejected };
}
