import assert from "node:assert/strict";
import test from "node:test";

import { buildLeadHunterFactBundle } from "../src/lib/lead-hunter-facts.ts";
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
    public_phone: "+27 12 345 6789",
    public_email: "procurement@buyer.example.org",
    contact_page_url: "https://buyer.example.org/contact",
    contact_name: null,
    contact_title: null,
    decision_maker_route: null,
    address: null,
    suburb: "Centurion",
    city: "Pretoria",
    province: "Gauteng",
    country: "South Africa",
    recommended_company: "cossa_facility_services",
    recommended_service: "commercial_cleaning",
    service_fit_reason: "Official RFQ evidence matches commercial cleaning.",
    opportunity_summary: "Official RFQ requests commercial cleaning services.",
    opportunity_size: "small",
    estimated_value: null,
    classification: "tender",
    verification_status: "verified",
    fit_score: 90,
    intent_score: 92,
    evidence_score: 95,
    timing_score: 90,
    contactability_score: 85,
    total_score: 91,
    revenue_potential_score: 86,
    ease_to_close_score: 72,
    recurring_revenue_score: 80,
    geographic_fit_score: 95,
    sales_priority: "hot",
    why_contact: ["Official RFQ evidence supports an active cleaning requirement."],
    signals: [
      {
        type: "active_tender",
        title: "Cleaning RFQ",
        explanation: "Official RFQ notice",
        evidence_url: source,
        detected_at: "2026-09-12T12:00:00Z",
        confidence: 95,
      },
    ],
    evidence: [
      {
        type: "procurement_notice",
        title: "Cleaning RFQ",
        url: source,
        publisher: "Verified Buyer",
        published_at: "2026-09-12T09:00:00Z",
        checked_at: "2026-09-12T12:00:00Z",
        excerpt: "procurement@buyer.example.org +27 12 345 6789 requests commercial cleaning services.",
        supports: ["active tender", "commercial cleaning"],
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
    verification_meta: {
      independent_source_count: 2,
      corroborating_domains: ["buyer.example.org", "etenders.gov.za"],
      official_source_count: 1,
      source_cluster_id: "cluster-1",
      cross_verified: true,
      verification_notes: ["Cross verified."],
    },
    procurement: {
      reference_number: "RFQ-123",
      closing_date: "2026-09-18T23:59:59.000Z",
      briefing_date: null,
      issuing_body: "Verified Buyer",
      submission_method: "Email submission",
      source_is_official: true,
      service_match_verified: true,
      current_status: "active",
    },
    website_audit: [],
    ai_interpretation: null,
    entity_cluster_id: "cluster-1",
    ...overrides,
  };
}

test("preserves the full structured prospect while producing a short factual model brief", () => {
  const original = prospect();
  const bundle = buildLeadHunterFactBundle(original);

  assert.equal(bundle.full_record, original);
  assert.equal(bundle.verified_for_automated_use, true);
  assert.equal(bundle.model_brief.organisation_name, "Verified Buyer");
  assert.equal(bundle.model_brief.sales_priority, "hot");
  assert.equal(bundle.model_brief.procurement_reference, "RFQ-123");
  assert.equal(bundle.model_brief.procurement_status, "active");
  assert.deepEqual(bundle.model_brief.evidence_urls, ["https://buyer.example.org/rfq-123"]);
  assert.equal("website_audit" in bundle.model_brief, false);
  assert.equal("verification_meta" in bundle.model_brief, false);
  assert.equal("ai_interpretation" in bundle.model_brief, false);
});

test("does not mark partially verified records safe for automated use", () => {
  const bundle = buildLeadHunterFactBundle(
    prospect({ verification_status: "partially_verified", sales_priority: "warm" }),
  );
  assert.equal(bundle.verified_for_automated_use, false);
  assert.equal(bundle.model_brief.verification_status, "partially_verified");
  assert.equal(bundle.model_brief.sales_priority, "warm");
});

test("brief stays factual and clips long opportunity prose", () => {
  const bundle = buildLeadHunterFactBundle(
    prospect({ opportunity_summary: "Fact ".repeat(200) }),
  );
  assert.ok(bundle.model_brief.opportunity_summary.length <= 360);
  assert.match(bundle.model_brief.opportunity_summary, /^Fact/);
});
