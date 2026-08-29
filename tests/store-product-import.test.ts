import assert from "node:assert/strict";
import test from "node:test";

import {
  ProductImportError,
  importSupplierProduct,
  parseGenericProductPage,
} from "../src/lib/store-product-import.server.ts";

test("product-page parsing preserves real structured data and flags a visible page price for confirmation", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/products/gadget-bag",
    html: `
      <html><head>
        <meta property="og:image" content="/images/gadget-bag.jpg" />
        <script type="application/ld+json">{
          "@context":"https://schema.org",
          "@type":"Product",
          "name":"Portable Small Gadget Bag",
          "sku":"DM8363",
          "description":"A compact organiser for cables and small gadgets.",
          "image":["/images/gadget-bag.jpg"],
          "additionalProperty":[{"name":"Material","value":"Water-resistant fabric"}],
          "offers":{"@type":"Offer","price":"87.20","priceCurrency":"ZAR","availability":"https://schema.org/InStock"}
        }</script>
      </head></html>`,
  });

  assert.equal(result.title, "Portable Small Gadget Bag");
  assert.equal(result.supplierProductRef, "DM8363");
  assert.equal(result.pagePrice, 87.2);
  assert.equal(result.currency, "ZAR");
  assert.equal(result.stockStatus, "available");
  assert.deepEqual(result.imageUrls, ["https://supplier.example/images/gadget-bag.jpg"]);
  assert.deepEqual(result.specifications, ["Material: Water-resistant fabric"]);
  assert.ok(
    result.fieldsRequiringConfirmation.includes(
      "confirm that the visible page price is your supplier cost",
    ),
  );
  assert.ok(result.fieldsRequiringConfirmation.includes("current supplier stock before approval"));
});

test("incomplete pages remain partial and never fabricate product details", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/product/unknown",
    html: "<html><head><title>Supplier item</title></head><body></body></html>",
  });

  assert.equal(result.title, "Supplier item");
  assert.equal(result.description, null);
  assert.equal(result.supplierProductRef, null);
  assert.equal(result.pagePrice, null);
  assert.equal(result.stockStatus, "unknown");
  assert.equal(result.importStatus, "partial");
  assert.ok(result.fieldsRequiringConfirmation.includes("product images"));
  assert.ok(result.fieldsRequiringConfirmation.includes("supplier SKU/product ID"));
  assert.ok(result.fieldsRequiringConfirmation.includes("supplier cost"));
});

test("invalid URLs are rejected before any supplier request", async () => {
  await assert.rejects(
    importSupplierProduct({ sourceUrl: "not a valid URL" }),
    (error: unknown) => error instanceof ProductImportError && error.code === "invalid_source_url",
  );
});
