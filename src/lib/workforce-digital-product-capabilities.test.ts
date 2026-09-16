import assert from "node:assert/strict";
import test from "node:test";

import {
  DIGITAL_PRODUCT_WORKFORCE_UPGRADES,
  composeDigitalProductWorkforceProfiles,
} from "./workforce-digital-product-capabilities.ts";

const profiles: Array<{
  employee_key: string;
  capabilities: readonly string[];
  system_instructions: string;
}> = [
  {
    employee_key: "product-intelligence-analyst",
    capabilities: ["existing product research"],
    system_instructions: "Existing Product Intelligence safety rules.",
  },
  {
    employee_key: "store-operations-manager",
    capabilities: ["existing catalogue coordination"],
    system_instructions: "Existing Store Operations safety rules.",
  },
  {
    employee_key: "supplier-sourcing-analyst",
    capabilities: ["existing sourcing"],
    system_instructions: "Existing sourcing rules.",
  },
];

test("composes digital capabilities into the two existing workers without creating duplicates", () => {
  const composed = composeDigitalProductWorkforceProfiles(profiles);
  assert.equal(composed.length, profiles.length);
  assert.deepEqual(
    composed.map((profile) => profile.employee_key),
    profiles.map((profile) => profile.employee_key),
  );

  const productIntelligence = composed.find(
    (profile) => profile.employee_key === "product-intelligence-analyst",
  );
  const storeOperations = composed.find(
    (profile) => profile.employee_key === "store-operations-manager",
  );
  assert.ok(productIntelligence?.capabilities.includes("existing product research"));
  assert.ok(
    productIntelligence?.capabilities.includes(
      DIGITAL_PRODUCT_WORKFORCE_UPGRADES["product-intelligence-analyst"].capabilities[0],
    ),
  );
  assert.ok(storeOperations?.capabilities.includes("existing catalogue coordination"));
  assert.ok(
    storeOperations?.capabilities.includes(
      DIGITAL_PRODUCT_WORKFORCE_UPGRADES["store-operations-manager"].capabilities[0],
    ),
  );
});

test("composition is idempotent and leaves unrelated employees unchanged", () => {
  const once = composeDigitalProductWorkforceProfiles(profiles);
  const twice = composeDigitalProductWorkforceProfiles(once);
  assert.deepEqual(twice, once);
  assert.deepEqual(twice[2], profiles[2]);
});
