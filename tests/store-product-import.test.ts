import assert from "node:assert/strict";
import test from "node:test";

import {
  ProductImportError,
  importSupplierProduct,
  parseDmcWholesaleProductPage,
  parseGenericProductPage,
} from "../src/lib/store-product-import.server.ts";

test("DMC price rule preserves its real wholesale cost separately from RRP", () => {
  // Captured public DMC product-page fields for DM8363. The fixture deliberately
  // contains both values so this test fails if R109 is ever treated as cost.
  const result = parseDmcWholesaleProductPage({
    sourceUrl: "https://dmcwholesale.co.za/products/portable-small-gadget-bag",
    html: `
      <html><head>
        <meta property="og:description" content="Big capacity accessory bag size L 28 x W 21 x H 9 cm, 3 layer design, suitable for traveling." />
        <meta property="product:price:amount" content="109.00" />
        <meta property="product:price:currency" content="ZAR" />
        <!-- Dedicated product price tags -->
        <meta property="product:price:amount" content="87.20" />
        <script>Samita.Wholesale.product={"title":"Portable Small Gadget Bag","description":"Big capacity accessory bag size L 28 x W 21 x H 9 cm. Travel Electronics Organiser Waterproof -- The gray travel cable organiser bag is made of cationic waterproof material with a soft touch. The storage bag also used double zipper. The top has elasticated straps and mesh pockets. Three adjustable cushion dividers allow you to freely adjust the position and size. Three layer design waterproof electronics accessories travel organiser.","vendor":"L1","type":"Ladies","price":10900,"available":true,"variants":[{"id":45857502757092,"title":"Default Title","sku":"DM8363","available":true,"price":10900}],"images":["//dmcwholesale.co.za/cdn/shop/files/71fvrLjKufL._AC_SX522.jpg?v=1756994653","//dmcwholesale.co.za/cdn/shop/files/61VfG94pSRL._AC_SX569.jpg?v=1756994655"]};</script>
      </head></html>`,
  });

  assert.equal(result.title, "Portable Small Gadget Bag");
  assert.equal(result.supplierProductRef, "DM8363");
  assert.equal(result.supplierCost, 87.2);
  assert.equal(result.supplierCostConfidence, "high");
  assert.equal(result.supplierRrp, 109);
  assert.notEqual(result.supplierCost, result.supplierRrp);
  assert.equal(result.stockStatus, "available");
  assert.equal(result.supplierCategory, "Ladies");
  assert.ok(result.shortDescription?.includes("28 x W 21 x H 9 cm"));
  assert.ok(result.specifications.includes("Size: 28 × 21 × 9 cm"));
  assert.ok(result.specifications.includes("Design: 3-layer"));
  assert.ok(result.specifications.includes("Closure: Double zipper"));
  assert.ok(
    result.specifications.some((value) =>
      value.startsWith("Material: Cationic waterproof material"),
    ),
  );
  assert.deepEqual(result.features, [
    "3-layer design",
    "Double zipper",
    "Mesh pockets",
    "Elastic straps",
    "Adjustable dividers",
    "Travel electronics organisation",
  ]);
  assert.equal(result.imageUrls.length, 2);
  assert.ok(result.fieldsRequiringConfirmation.includes("supplier cost confirmation"));
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
  assert.equal(result.supplierCost, null);
  assert.equal(result.supplierCostConfidence, "unconfirmed");
  assert.equal(result.stockStatus, "unknown");
  assert.equal(result.importStatus, "partial");
  assert.ok(result.fieldsRequiringConfirmation.includes("product images"));
  assert.ok(result.fieldsRequiringConfirmation.includes("supplier SKU/product ID"));
  assert.ok(result.fieldsRequiringConfirmation.includes("supplier cost confirmation"));
});

test("generic wholesale and RRP labels remain independently classified", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/products/gadget-bag",
    html: `
      <html><head><meta property="og:image" content="/images/gadget-bag.jpg" />
      <script type="application/ld+json">{"@type":"Product","name":"Gadget Bag","sku":"G-1","description":"A compact organiser.","image":["/images/gadget-bag.jpg"],"offers":{"@type":"Offer","availability":"https://schema.org/InStock"}}</script>
      </head><body><p>Wholesale Price: R87.20. Suggested Retail Price: R109.00.</p></body></html>`,
  });

  assert.equal(result.supplierCost, 87.2);
  assert.equal(result.supplierRrp, 109);
  assert.equal(result.supplierSalePrice, null);
  assert.equal(result.supplierCostConfidence, "high");
  assert.equal(result.stockStatus, "available");
});

test("sale and regular prices never become supplier cost without a cost label", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/products/sale-item",
    html: "<html><head><title>Sale item</title></head><body><p>Regular Price: R180.00. Sale Price: R120.00.</p></body></html>",
  });

  assert.equal(result.supplierCost, null);
  assert.equal(result.supplierCostConfidence, "unconfirmed");
  assert.equal(result.supplierSalePrice, 120);
});

test("a single structured price remains unconfirmed as supplier cost", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/products/single-price",
    html: '<script type="application/ld+json">{"@type":"Product","name":"Supplier item","offers":{"@type":"Offer","price":"120.00","priceCurrency":"ZAR"}}</script>',
  });

  assert.equal(result.supplierCost, null);
  assert.equal(result.supplierCostConfidence, "unconfirmed");
  assert.equal(result.supplierSalePrice, 120);
  assert.ok(result.warnings.includes("Supplier cost requires manual confirmation."));
});

test("ambiguous prices remain unconfirmed", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://supplier.example/products/ambiguous",
    html: "<html><head><title>Supplier item</title></head><body>R89 or R99 depending on options</body></html>",
  });

  assert.equal(result.supplierCost, null);
  assert.equal(result.supplierSalePrice, null);
  assert.equal(result.importStatus, "partial");
});

test("invalid URLs are rejected before any supplier request", async () => {
  await assert.rejects(
    importSupplierProduct({ sourceUrl: "not a valid URL" }),
    (error: unknown) => error instanceof ProductImportError && error.code === "invalid_source_url",
  );
});

test("affiliate-style product metadata keeps product fields separate from merchant chrome", () => {
  const result = parseGenericProductPage({
    sourceUrl: "https://merchant.example/products/travel-organiser?aff=partner-123",
    html: `
      <html>
        <head>
          <meta property="og:image" content="https://cdn.merchant.example/assets/logo.png" />
          <meta property="product:price:amount" content="159.00" />
          <meta property="product:price:currency" content="ZAR" />
          <script type="application/ld+json">
            {
              "@context":"https://schema.org",
              "@type":"Product",
              "name":"Waterproof Travel Cable Organiser",
              "sku":"MERCH-TRAVEL-42",
              "brand":{"@type":"Brand","name":"Cossa Travel"},
              "category":"Travel & Luggage",
              "description":"A compact waterproof organiser for cables, chargers and travel accessories.",
              "image":["https://cdn.merchant.example/products/travel-organiser-main.jpg"],
              "offers":{"@type":"Offer","price":"159.00","priceCurrency":"ZAR","availability":"https://schema.org/InStock"}
            }
          </script>
        </head>
      </html>`,
  });

  assert.equal(result.title, "Waterproof Travel Cable Organiser");
  assert.equal(result.supplierProductRef, "MERCH-TRAVEL-42");
  assert.equal(result.brand, "Cossa Travel");
  assert.equal(result.supplierCategory, "Travel & Luggage");
  assert.equal(result.supplierSalePrice, 159);
  assert.equal(result.currency, "ZAR");
  assert.equal(result.stockStatus, "available");
  assert.deepEqual(result.imageUrls, [
    "https://cdn.merchant.example/products/travel-organiser-main.jpg",
  ]);
  assert.match(result.description ?? "", /waterproof organiser/i);
});

test("DM3762 stays evidence-bound: it has no inferred brand, dimensions or market price", () => {
  const result = parseDmcWholesaleProductPage({
    sourceUrl: "https://dmcwholesale.co.za/products/dm3762",
    html: `
      <html><head>
        <meta property="product:price:amount" content="99.00" />
        <meta property="product:price:currency" content="ZAR" />
        <!-- Dedicated product price tags -->
        <meta property="product:price:amount" content="79.20" />
        <script>Samita.Wholesale.product={"title":"Self Care Organiser","description":"A compact organiser for daily essentials.","vendor":"M1","type":"Self Care - Organising","price":9900,"available":true,"variants":[{"id":1,"title":"Default Title","sku":"DM3762","available":true,"price":9900}],"images":["https://dmcwholesale.co.za/cdn/shop/files/dm3762.jpg?v=1","https://dmcwholesale.co.za/cdn/shop/files/dm3762.jpg?v=2"]};</script>
      </head></html>`,
  });

  assert.equal(result.supplierProductRef, "DM3762");
  assert.equal(result.supplierCategory, "Self Care - Organising");
  assert.equal(result.brand, null);
  assert.equal(result.supplierCost, 79.2);
  assert.equal(result.supplierRrp, 99);
  assert.equal(result.imageUrls.length, 1);
  assert.equal(
    result.specifications.some((item) => /^Size:/i.test(item)),
    false,
  );
});
