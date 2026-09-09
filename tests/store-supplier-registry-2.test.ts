import assert from "node:assert/strict";
import test from "node:test";
import {
  changedSupplierFields,
  supplierDeletionEligibility,
  supplierVerificationTransition,
} from "../src/lib/store-supplier-registry-2.ts";
import { classifySupplierEvidence } from "../src/lib/store-knowledge-policy.ts";
test("typed URL remains unverified and verification does not activate", () => {
  const evidence = classifySupplierEvidence({
    websiteUrl: "https://astrum.co.za",
    contactInformation: null,
    policyReference: null,
    sourceProductUrl: null,
    conflictingDomain: false,
  });
  assert.equal(evidence.entries[0]?.classification, "UNVERIFIED");
  assert.equal(
    supplierVerificationTransition({
      outcome: evidence.outcome,
      activate: false,
      conflictingDomain: false,
    }).canActivate,
    false,
  );
});
test("conflicting identity blocks activation", () =>
  assert.equal(
    supplierVerificationTransition({ outcome: "VERIFIED", activate: true, conflictingDomain: true })
      .canActivate,
    false,
  ));
test("dependent supplier is archived instead of deleted", () =>
  assert.match(
    supplierDeletionEligibility({
      intakes: 675,
      importBatches: 1,
      importEvents: 1374,
      fulfilmentProfiles: 0,
      orders: 0,
      pricingAudit: 0,
    }).reason ?? "",
    /Archive instead/,
  ));
test("contact update is auditable and marks only affected evidence", () => {
  const changes = changedSupplierFields(
    { contact_information: "old", operational_notes: "same" },
    { contact_information: "new", operational_notes: "same" },
  );
  assert.deepEqual(changes, [
    {
      field: "contact_information",
      oldValue: "old",
      newValue: "new",
      requiresReverification: true,
    },
  ]);
});
test("zero dependency supplier is eligible only after explicit UI confirmation", () =>
  assert.equal(
    supplierDeletionEligibility({
      intakes: 0,
      importBatches: 0,
      importEvents: 0,
      fulfilmentProfiles: 0,
      orders: 0,
      pricingAudit: 0,
    }).allowed,
    true,
  ));
