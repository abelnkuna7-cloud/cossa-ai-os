import assert from "node:assert/strict";
import test from "node:test";

import { inferLeadHunterCommandIntent } from "../src/lib/lead-hunter-command-intent.ts";

test("commercial cleaning routes to Facility Services", () => {
  const intent = inferLeadHunterCommandIntent(
    "Find verified commercial cleaning opportunities in Centurion with active RFQs and public contact details.",
  );

  assert.equal(intent.confident, true);
  assert.equal(intent.targetCompany, "cossa_facility_services");
  assert.equal(intent.targetService, "commercial_cleaning");
  assert.equal(intent.targetLocation, "Centurion");
});

test("subcontracting does not get misread as NexDocs contracts", () => {
  const intent = inferLeadHunterCommandIntent(
    "Find verified revenue opportunities for Cossa in Gauteng including supplier or subcontracting routes.",
  );

  assert.equal(intent.confident, false);
  assert.equal(intent.targetCompany, null);
  assert.equal(intent.targetService, null);
  assert.equal(intent.targetLocation, "Gauteng");
});

test("explicit contracts route to NexDocs", () => {
  const intent = inferLeadHunterCommandIntent(
    "Find businesses in Gauteng that need business contracts and document support.",
  );

  assert.equal(intent.confident, true);
  assert.equal(intent.targetCompany, "nexdocs");
  assert.equal(intent.targetService, "contracts");
});

test("construction quick wins route to Construction", () => {
  const intent = inferLeadHunterCommandIntent(
    "Find construction opportunities in Pretoria with current buying evidence.",
  );

  assert.equal(intent.confident, true);
  assert.equal(intent.targetCompany, "cossa_nexus_construction");
  assert.equal(intent.targetService, "construction");
  assert.equal(intent.targetLocation, "Pretoria");
});

test("empty command fails closed", () => {
  const intent = inferLeadHunterCommandIntent("");

  assert.equal(intent.confident, false);
  assert.match(intent.reason ?? "", /write a mission/i);
});
