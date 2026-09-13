import assert from "node:assert/strict";
import test from "node:test";

import {
  filterLeadHunterProspectsByEvidence,
  validateLeadHunterProspectEvidence,
} from "../src/lib/lead-hunter-evidence-guard.ts";
import type { LeadHunterProspect } from "../src/lib/lead-hunter-data.ts";

function prospect(overrides: Partial<LeadHunterProspect> = {}): LeadHunterProspect {
  const source = "https://buyer.example.org/rfq-123";
  return {
    id: "p-1",
    organisation_name: "Verified Buyer",
    trading_name: null,
    sector: "private",
    industry: "Property",
    organisation_type: "Property manager",
    website: "https://buyer.example.org",
    public_phone: null,
    public_email: null,
    contact_page_url: null,
    contact_name: null,
    contact_title: null,
    decision_maker_route: null,
    address: null,
    suburb: null,
    city: "Pretoria",
    province: "Gauteng",
    country: "South Africa",
    recommended_company: "cossa_nexus_construction",
    recommended_service: "property_maintenance",
    service_fit_reason: "Official evidence shows a matching maintenance requirement.",
    opportunity_summary: "Verified maintenance opportunity.",
    opportunity_size: "small",
    estimated_value: null,
    classification: "active_opportunity",
    verification_status: "verified",
    fit_score: 85,
    intent_score: 85,
    evidence_score: 90,
    timing_score: 80,
    contactability_score: 50,
    total_score: 84,
    revenue_potential_score: 75,
    ease_to_close_score: 70,
    recurring_revenue_score: 60,
    geographic_fit_score: 95,
    sales_priority: "hot",
    why_contact: ["Current maintenance requirement is evidenced by the official source."],
    signals: [
      {
        type: "maintenance_need",
        title: "Maintenance requirement",
        explanation: "Official buyer notice",
        evidence_url: source,
        detected_at: "2026-09-12T12:00:00Z",
        confidence: 90,
      },
    ],
    evidence: [
      {
        type: "official_website",
        title: "Buyer maintenance notice",
        url: source,
        publisher: "Verified Buyer",
        published_at: "2026-09-12T09:00:00Z",
        checked_at: "2026-09-12T12:00:00Z",
        excerpt: "The organisation is requesting maintenance services.",
        supports: ["maintenance requirement"],
        is_official_source: true,
      },
    ],
    primary_source_url: source,
    date_verified: "2026-09-12T12:00:00Z",
    next_action: "Human review before outreach.",
    outreach_angle: null,
    duplicate_status: "clear",
    duplicate_lead_id: null,
    rejection_reasons: [],
    raw_provider_name: "Tavily",
    raw_provider_result_id: null,
    procurement: null,
    website_audit: [],
    ai_interpretation: null,
    ...overrides,
  };
}

test("accepts a prospect backed by usable public evidence", () => {
  const result = validateLeadHunterProspectEvidence(prospect());
  assert.equal(result.valid, true);
  assert.deepEqual(result.failures, []);
});

test("fails closed when a verified-looking prospect has no source evidence", () => {
  const result = validateLeadHunterProspectEvidence(
    prospect({ primary_source_url: "", evidence: [] }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.failures.includes("MISSING_PRIMARY_SOURCE"));
  assert.ok(result.failures.includes("MISSING_EVIDENCE"));
});

test("rejects expired or unofficial tender claims", () => {
  const result = validateLeadHunterProspectEvidence(
    prospect({
      classification: "tender",
      signals: [
        {
          type: "active_tender",
          title: "Tender",
          explanation: "Tender notice",
          evidence_url: "https://example.org/tender",
          detected_at: "2026-09-12T12:00:00Z",
          confidence: 90,
        },
      ],
      procurement: {
        reference_number: "RFQ-001",
        closing_date: "2026-09-01",
        briefing_date: null,
        issuing_body: "Buyer",
        submission_method: null,
        source_is_official: false,
        service_match_verified: true,
        current_status: "expired",
      },
    }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.failures.includes("UNVERIFIED_PROCUREMENT"));
  assert.ok(result.failures.includes("EXPIRED_PROCUREMENT"));
});

test("does not allow an unsupported estimated value to become a fact", () => {
  const result = validateLeadHunterProspectEvidence(
    prospect({ estimated_value: 500_000, why_contact: ["Good company fit"] }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.failures.includes("UNSUPPORTED_ESTIMATED_VALUE"));
});

test("filter returns only evidence-safe prospects and reports why others were rejected", () => {
  const valid = prospect({ id: "valid" });
  const invalid = prospect({ id: "invalid", evidence: [] });
  const result = filterLeadHunterProspectsByEvidence([valid, invalid]);
  assert.deepEqual(result.accepted.map((item) => item.id), ["valid"]);
  assert.equal(result.rejected[0]?.prospect.id, "invalid");
  assert.ok(result.rejected[0]?.failures.includes("MISSING_EVIDENCE"));
});
