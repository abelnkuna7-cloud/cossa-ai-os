import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_STORE_DEPARTMENTS,
  canonicalDepartmentFor,
  classifySupplierCategory,
} from "../src/lib/store-taxonomy.ts";

test("the Intake taxonomy is the audited 23-department Store contract, never product category rows", () => {
  assert.equal(CANONICAL_STORE_DEPARTMENTS.length, 23);
  assert.deepEqual(
    CANONICAL_STORE_DEPARTMENTS.map((department) => department.name),
    [
      "Construction & DIY",
      "Home & Living",
      "Cleaning Products",
      "Technology",
      "Women",
      "Men",
      "Kids & Baby",
      "Cars & Automotive",
      "Office & Business",
      "Tools & Industrial",
      "Security & Smart Home",
      "Beauty & Grooming",
      "Health & Personal Care",
      "Sports & Fitness",
      "Outdoor & Garden",
      "Pet Supplies",
      "Travel & Luggage",
      "Digital Products",
      "Print on Demand",
      "Mobile Accessories",
      "Gaming & Entertainment",
      "School & Education",
      "Gifts & Personalised",
    ],
  );
  assert.equal(canonicalDepartmentFor("kittcken"), null);
  assert.equal(canonicalDepartmentFor("tools"), null);
});

test("only explicit historical aliases normalise to an approved department", () => {
  assert.equal(canonicalDepartmentFor("home & living")?.slug, "home-living");
  assert.equal(canonicalDepartmentFor("home-living")?.slug, "home-living");
  assert.equal(canonicalDepartmentFor("MEN")?.slug, "men");
  assert.equal(canonicalDepartmentFor("woman")?.slug, "women");
  assert.equal(canonicalDepartmentFor("home&kitchen"), null);
  assert.equal(canonicalDepartmentFor("tools & industries"), null);
});

test("DM3762 stays review-only and can never inherit Travel & Tech from a stale mapping", () => {
  const result = classifySupplierCategory({
    supplierCategory: "Self Care - Organising",
    productTitle: "Rotating Acrylic Jewellery Storage Box",
    mappedDepartment: "Travel & Tech",
  });

  assert.equal(result.action, "VERIFY");
  assert.equal(result.departmentSlug, "home-living");
  assert.equal(result.departmentName, "Home & Living");
  assert.notEqual(result.departmentSlug, "travel-luggage");
});

test("DM0375 points toward the real Cars & Automotive hierarchy without creating Vehicle", () => {
  const result = classifySupplierCategory({
    supplierCategory: "Vehicle",
    productTitle: "Portable High Power Car Vacuum Cleaner",
  });

  assert.equal(result.action, "VERIFY");
  assert.equal(result.departmentSlug, "automotive");
  assert.equal(result.departmentName, "Cars & Automotive");
  assert.equal(result.subcategory, "Car cleaning & detailing");
});

test("Kitchen and mobile evidence use the audited hierarchy without silently creating supplier categories", () => {
  const kitchen = classifySupplierCategory({
    supplierCategory: "Kitchen",
    productTitle: "Stainless Steel Kitchen Tool Set",
  });
  assert.equal(kitchen.action, "VERIFY");
  assert.equal(kitchen.departmentSlug, "home-living");
  assert.equal(kitchen.subcategory, "Kitchen");

  const mobile = classifySupplierCategory({
    supplierCategory: "Mobile Accessories",
    productTitle: "USB-C Phone Charger",
  });
  assert.equal(mobile.action, "AUTO_SELECT");
  assert.equal(mobile.departmentSlug, "mobile-accessories");
});

test("unsupported or misspelled supplier categories require proposal and never become canonical", () => {
  const result = classifySupplierCategory({
    supplierCategory: "kittcken",
    productTitle: "Unknown item",
  });
  assert.equal(result.action, "PROPOSE_CATEGORY");
  assert.equal(result.departmentSlug, null);
});
