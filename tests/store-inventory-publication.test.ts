import assert from "node:assert/strict";
import test from "node:test";

import {
  normalisePublicationPreflight,
  previewHasNoInternalFields,
  selectedFinalPrice,
  validCompareAtPrice,
} from "../src/lib/store-inventory-publication.ts";

const dm8363CustomerPreview = {
  ready: true,
  blockers: [],
  customer: {
    name: "Portable Small Gadget Bag",
    slug: "portable-small-gadget-bag-cossa-a1b2c3d4e5",
    sku: "COS-A1B2C3D4E5F6",
    category: "Travel & Tech",
    brand: null,
    shortDescription: "Keep your small electronics organised.",
    description: "A compact travel organiser for cables and accessories.",
    features: ["3-layer design", "Double zipper"],
    specifications: "Size: 28 × 21 × 9 cm",
    imageUrls: ["https://images.example.test/main.jpg", "https://images.example.test/inside.jpg"],
    availability: "Available",
    fulfilmentLabel: "Local SA fulfilment",
    deliveryNotice:
      "Delivery is charged separately. The delivery estimate shown at checkout applies.",
    returnsNotice: "Cossa Store customer terms apply.",
    warrantyNotice: null,
    freeShippingEligible: false,
    price: 159,
    compareAtPrice: null,
    productType: "dropshipping",
    fulfilmentModel: "local_dropshipping",
  },
};

test("publication preview keeps the final override price and a blank invalid compare-at price", () => {
  assert.equal(selectedFinalPrice({ sellingPriceOverride: 159, calculatedSellingPrice: 109 }), 159);
  assert.equal(validCompareAtPrice(null, 159), true);
  assert.equal(validCompareAtPrice(109, 159), false);
});

test("DM8363 customer preview maps category, images and local customer-paid delivery safely", () => {
  const preview = normalisePublicationPreflight(dm8363CustomerPreview);
  assert.equal(preview.ready, true);
  assert.equal(preview.customer?.category, "Travel & Tech");
  assert.equal(preview.customer?.price, 159);
  assert.equal(preview.customer?.compareAtPrice, null);
  assert.equal(preview.customer?.imageUrls.length, 2);
  assert.equal(preview.customer?.fulfilmentLabel, "Local SA fulfilment");
  assert.equal(preview.customer?.freeShippingEligible, false);
  assert.equal(preview.customer?.brand, null);
});

test("customer preview has a strict internal-data firewall", () => {
  assert.equal(previewHasNoInternalFields(dm8363CustomerPreview), true);
  assert.equal(previewHasNoInternalFields({ ...dm8363CustomerPreview, supplierCost: 87.2 }), false);
  assert.equal(
    previewHasNoInternalFields({
      customer: { ...dm8363CustomerPreview.customer, grossMargin: 45 },
    }),
    false,
  );
});

test("preflight presents exact blockers without inventing customer information", () => {
  const preview = normalisePublicationPreflight({
    ready: false,
    blockers: [
      { code: "main_image_missing", message: "Add a valid main product image." },
      {
        code: "delivery_notice_missing",
        message: "Add an active customer-facing delivery notice.",
      },
    ],
    customer: { name: "Portable Small Gadget Bag", price: 159, imageUrls: [] },
  });
  assert.equal(preview.ready, false);
  assert.deepEqual(
    preview.blockers.map((blocker) => blocker.code),
    ["main_image_missing", "delivery_notice_missing"],
  );
  assert.equal(preview.customer?.availability, null);
});
