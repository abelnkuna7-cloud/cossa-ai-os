import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  changedSupplierFields,
  supplierActivationEligibility,
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

const verifiedActivation = {
  verificationStatus: "VERIFIED" as const,
  hasAcceptableEvidence: true,
  hasUnresolvedConflict: false,
  isArchived: false,
  isRejected: false,
  isAuthorisedLeader: true,
  confirmed: true,
};

test("unverified and needs-more-evidence suppliers cannot activate", () => {
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, verificationStatus: "NEEDS_MORE_EVIDENCE" }).allowed, false);
});
test("high-risk and rejected suppliers cannot activate", () => {
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, verificationStatus: "HIGH_RISK" }).allowed, false);
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, verificationStatus: "REJECTED" }).allowed, false);
});
test("unresolved conflicting evidence blocks activation", () =>
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, hasUnresolvedConflict: true }).allowed, false));
test("provisional verification cannot use normal activation", () =>
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, verificationStatus: "PROVISIONALLY_VERIFIED" }).allowed, false));
test("verified supplier with recorded acceptable evidence can activate", () =>
  assert.equal(supplierActivationEligibility(verifiedActivation).allowed, true));
test("unauthorised caller and missing confirmation cannot activate", () => {
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, isAuthorisedLeader: false }).allowed, false);
  assert.equal(supplierActivationEligibility({ ...verifiedActivation, confirmed: false }).allowed, false);
});
test("activation policy leaves products, inventory and pricing outside its scope", () => {
  const result = supplierActivationEligibility(verifiedActivation);
  assert.equal(result.allowed, true);
  assert.equal(Object.hasOwn(result, "product"), false);
  assert.equal(Object.hasOwn(result, "inventory"), false);
  assert.equal(Object.hasOwn(result, "price"), false);
});
test("activation RPC records approver, time and verified status server-side", () => {
  const migration = readFileSync("supabase/migrations/20260909190000_supplier_registry_2.sql", "utf8");
  assert.match(migration, /create or replace function public\.activate_store_supplier/);
  assert.match(migration, /activation_approved_by = auth\.uid\(\)/);
  assert.match(migration, /activation_approved_at = now\(\)/);
  assert.match(migration, /activation_verification_status = v_supplier\.verification_status/);
  assert.match(migration, /Unresolved conflicting supplier evidence blocks activation/);
});
