import assert from "node:assert/strict";
import test from "node:test";

import {
  normaliseSupplierDomains,
  supplierForSourceUrl,
  supplierRegistryPayload,
} from "../src/lib/store-supplier-registry.ts";

test("supplier registry creates a candidate with non-secret operational fields", () => {
  const payload = supplierRegistryPayload({
    organisationId: "org-1",
    name: "Example Wholesale",
    code: "example-wholesale",
    businessModel: "wholesale",
    registryStatus: "candidate",
    stockOrigin: "South Africa",
    websiteUrl: "https://supplier.example",
    recognisedDomains: "cdn.supplier.example, supplier.example",
    contactInformation: "Operations desk",
    accountReference: "Account ref only",
    skuTerminology: "Supplier SKU",
    defaultFulfilmentProfileCode: "example-customer-paid",
    defaultDeliveryPayer: "customer",
    defaultFreeShippingEligible: false,
    syncMethod: "manual CSV",
    returnsNotes: "Confirm per item",
    warrantyNotes: "Supplier policy reference required",
    operationalNotes: "Fixture only",
    pricingImportNotes: "Confirm wholesale price",
    agreementPolicyReference: "Internal policy link",
  });

  assert.equal(payload.status, "pending");
  assert.equal(payload.registry_status, "candidate");
  assert.deepEqual(payload.recognised_domains, ["cdn.supplier.example", "supplier.example"]);
  assert.equal("password" in payload, false);
  assert.equal("api_key" in payload, false);
});

test("registered domains select the right supplier and inherit its defaults", () => {
  const supplier = supplierForSourceUrl(
    [
      {
        id: "dmc",
        source_url: "https://dmcwholesale.co.za",
        recognised_domains: ["dmcwholesale.co.za"],
      },
    ],
    "https://dmcwholesale.co.za/products/portable-small-gadget-bag",
  );

  assert.equal(supplier?.id, "dmc");
  assert.equal(
    supplierForSourceUrl(
      [{ id: "dmc", source_url: null, recognised_domains: ["dmcwholesale.co.za"] }],
      "https://other.example/product",
    ),
    null,
  );
  assert.deepEqual(normaliseSupplierDomains("www.dmcwholesale.co.za"), ["dmcwholesale.co.za"]);
});

test("a supplier can be moved to paused without a secret field", () => {
  const payload = supplierRegistryPayload({
    organisationId: "org-1",
    name: "Example",
    code: "example",
    businessModel: "dropship",
    registryStatus: "paused",
    stockOrigin: "",
    websiteUrl: "",
    recognisedDomains: "",
    contactInformation: "",
    accountReference: "",
    skuTerminology: "",
    defaultFulfilmentProfileCode: "",
    defaultDeliveryPayer: "customer",
    defaultFreeShippingEligible: false,
    syncMethod: "",
    returnsNotes: "",
    warrantyNotes: "",
    operationalNotes: "",
    pricingImportNotes: "",
    agreementPolicyReference: "",
  });
  assert.equal(payload.status, "paused");
  assert.equal(payload.registry_status, "paused");
});
