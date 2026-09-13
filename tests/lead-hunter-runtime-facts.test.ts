import assert from "node:assert/strict";
import test from "node:test";

import { buildLeadHunterRuntimeResearchFacts } from "../src/lib/lead-hunter-runtime-facts.ts";
import type { LeadHunterSearchResponse } from "../src/lib/lead-hunter-data.ts";

const prospect = {
  id: "p-1",
  organisation_name: "Verified Buyer",
  trading_name: null,
  sector: "private",
  industry: null,
  organisation_type: null,
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
  recommended_company: "cossa_facility_services",
  recommended_service: "commercial_cleaning",
  service_fit_reason: "Verified fit.",
  opportunity_summary: "Official source shows an active cleaning requirement.",
  opportunity_size: "small",
  estimated_value: null,
  classification: "active_opportunity",
  verification_status: "verified",
  fit_score: 80,
  intent_score: 80,
  evidence_score: 90,
  timing_score: 80,
  contactability_score: 40,
  total_score: 82,
  revenue_potential_score: 70,
  ease_to_close_score: 60,
  recurring_revenue_score: 70,
  geographic_fit_score: 90,
  sales_priority: "hot",
  why_contact: ["Official source supports an active requirement."],
  signals: [],
  evidence: [{
    type: "official_website",
    title: "Official requirement",
    url: "https://buyer.example.org/need",
    publisher: "Verified Buyer",
    published_at: null,
    checked_at: "2026-09-12T19:00:00.000Z",
    excerpt: "Active commercial cleaning requirement.",
    supports: ["commercial cleaning requirement"],
    is_official_source: true,
  }],
  primary_source_url: "https://buyer.example.org/need",
  date_verified: "2026-09-12T19:00:00.000Z",
  next_action: "Human review.",
  outreach_angle: null,
  duplicate_status: "clear",
  duplicate_lead_id: null,
  rejection_reasons: [],
  raw_provider_name: "Tavily",
  raw_provider_result_id: null,
  procurement: null,
  website_audit: [],
  ai_interpretation: null,
} as const;

function hunt(): LeadHunterSearchResponse {
  return {
    hunt_id: "11111111-1111-4111-8111-111111111111",
    status: "SUCCESS_WITH_RESULTS",
    searched_at: "2026-09-12T19:00:00.000Z",
    completed_at: "2026-09-12T19:00:02.000Z",
    request: {
      sector: "private",
      companies: ["cossa_facility_services"],
      services: ["commercial_cleaning"],
      locations: ["Gauteng"],
      industries: [],
      organisation_types: [],
      keywords: [],
      opportunity_signals: [],
      result_count: 10,
      minimum_score: 60,
      minimum_evidence_sources: 1,
      include_private_sector: true,
      include_government_sector: false,
      include_nonprofits: false,
      include_small_projects: true,
      include_large_projects: true,
      require_public_phone_or_email: false,
      require_opportunity_signal: true,
      verified_sources_only: true,
      exclude_existing_crm_leads: true,
      notes: null,
    },
    prospects: [prospect as LeadHunterSearchResponse["prospects"][number]],
    source_count: 1,
    accepted_count: 1,
    rejected_count: 0,
    warnings: [],
    providers_used: ["Tavily"],
    provider_diagnostics: [],
  };
}

test("runtime facts preserve full records and keep verified model input compact", () => {
  const source = hunt();
  const facts = buildLeadHunterRuntimeResearchFacts(source);
  assert.equal(facts.fullProspects[0], source.prospects[0]);
  assert.equal(facts.modelBriefs.length, 1);
  assert.equal(facts.modelBriefs[0]?.organisation_name, "Verified Buyer");
  assert.equal("evidence" in (facts.modelBriefs[0] as object), false);
  assert.deepEqual(facts.verifiedForAutomatedUseIds, ["p-1"]);
});

test("partial records stay available for review but cannot enter model outreach stages", () => {
  const source = hunt();
  source.prospects.push({
    ...prospect,
    id: "p-2",
    organisation_name: "Partially Verified Buyer",
    verification_status: "partially_verified",
    sales_priority: "warm",
  } as LeadHunterSearchResponse["prospects"][number]);

  const facts = buildLeadHunterRuntimeResearchFacts(source);
  assert.equal(facts.fullProspects.length, 2);
  assert.equal(facts.fullProspects[1]?.verification_status, "partially_verified");
  assert.equal(facts.modelBriefs.length, 1);
  assert.equal(facts.modelBriefs.some((brief) => brief.id === "p-2"), false);
  assert.deepEqual(facts.verifiedForAutomatedUseIds, ["p-1"]);
});
