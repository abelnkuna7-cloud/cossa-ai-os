import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ASTRUM_EXPECTED_COUNTS,
  ASTRUM_EXPECTED_PACKAGE_HASH,
  ASTRUM_EXPECTED_SOURCE_HASH,
} from "../src/lib/store-astrum-validated-package.ts";

test("Astrum production package constants preserve the approved snapshot", () => {
  assert.equal(ASTRUM_EXPECTED_SOURCE_HASH, "9dcdfd55d985aafcc42337e2fa1b7d81951807605a84f6aead94ccb5ce38a056");
  assert.equal(ASTRUM_EXPECTED_PACKAGE_HASH, "f28f1c37723dbdb6d5f4c6f2200dec4348a18895724d1d2a0a13c3fba257db19");
  assert.deepEqual(ASTRUM_EXPECTED_COUNTS, {
    sourceRows: 699,
    acceptedRows: 675,
    rejectedRows: 24,
    newSkus: 675,
    updatedSkus: 0,
    unchangedSkus: 0,
    availableSkus: 542,
    unavailableSkus: 133,
    supplierAvailableUnits: 36012,
    stockChanges: 0,
    costChanges: 0,
    rrpChanges: 0,
    newlyUnavailable: 0,
    backInStock: 0,
    missingFromSource: 0,
  });
});

test("Astrum import endpoint keeps identity and production authority server-side", () => {
  const source = readFileSync("src/routes/api.store-astrum-catalogue-import.ts", "utf8");
  assert.match(source, /requireRuntimeMember\(request, \["owner", "admin", "manager"\]\)/);
  assert.match(source, /verification_status !== "VERIFIED"/);
  assert.match(source, /supplier\.status !== "active"/);
  assert.match(source, /actor\.organisationId/);
  assert.match(source, /p_created_by: actor\.userId/);
  assert.match(source, /persist_supplier_catalogue_import/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("Astrum intake page requires explicit approval and never claims publication", () => {
  const source = readFileSync("src/routes/businesses.store-astrum-csv-intake.tsx", "utf8");
  assert.match(source, /Execute controlled Astrum import/);
  assert.match(source, /No product publication is authorised by this action/);
  assert.match(source, /disabled=\{!payload \|\| !expectedPreview \|\| !confirmed \|\| running\}/);
});
