/**
 * Cossa Store's approved customer-facing department contract.
 *
 * The source was audited against the live Store department configuration
 * (`cossa-store` CATEGORIES) on 2026-09-02. Product rows are deliberately
 * not an input: historical category text is evidence for cleanup only, never
 * a way to create another selectable Store category.
 *
 * `category` on the current Store product model holds the department slug.
 * The public Store has subcategory navigation, but the Growth intake schema
 * does not yet persist a separate subcategory field. This module therefore
 * carries only verified hierarchy hints needed by Intake classification. The
 * public Store remains the owner of its complete navigation tree until a
 * separately approved shared-taxonomy migration is introduced; Intake does
 * not invent a subcategory persistence field that the catalogue cannot use.
 */

export type CanonicalStoreDepartment = {
  slug: string;
  name: string;
  subcategories: readonly string[];
};

export type TaxonomyClassification = {
  action: "AUTO_SELECT" | "VERIFY" | "PROPOSE_CATEGORY";
  departmentSlug: string | null;
  departmentName: string | null;
  subcategory: string | null;
  reason: string;
  alternatives: string[];
};

export const CANONICAL_STORE_DEPARTMENTS: readonly CanonicalStoreDepartment[] = [
  {
    slug: "construction-diy",
    name: "Construction & DIY",
    subcategories: ["Tools & accessories", "Hardware", "Storage & organisation"],
  },
  {
    slug: "home-living",
    name: "Home & Living",
    subcategories: ["Kitchen", "Cookware", "Storage & organisation", "Small appliances"],
  },
  {
    slug: "cleaning-household",
    name: "Cleaning Products",
    subcategories: ["Cleaning tools", "Cleaning chemicals", "Cleaning equipment"],
  },
  {
    slug: "technology-electronics",
    name: "Technology",
    subcategories: ["Computers", "Networking & Wi-Fi", "Power & charging", "Cables & adapters"],
  },
  {
    slug: "women",
    name: "Women",
    subcategories: ["Clothing", "Jewellery", "Handbags & bags", "Accessories"],
  },
  {
    slug: "men",
    name: "Men",
    subcategories: ["Clothing", "Workwear", "Bags & backpacks", "Accessories"],
  },
  {
    slug: "kids-baby",
    name: "Kids & Baby",
    subcategories: ["Baby care", "Toys", "School essentials"],
  },
  {
    slug: "automotive",
    name: "Cars & Automotive",
    subcategories: [
      "Car cleaning & detailing",
      "Vehicle care",
      "Automotive tools",
      "Car accessories",
    ],
  },
  {
    slug: "office-business",
    name: "Office & Business",
    subcategories: ["Stationery", "Office supplies", "Office technology"],
  },
  {
    slug: "tools-industrial",
    name: "Tools & Industrial",
    subcategories: ["Hand tools", "Power tools", "Industrial supplies"],
  },
  {
    slug: "security-smart-home",
    name: "Security & Smart Home",
    subcategories: ["CCTV cameras", "Security systems", "Smart devices"],
  },
  {
    slug: "beauty-grooming",
    name: "Beauty & Grooming",
    subcategories: ["Skincare", "Haircare", "Beauty tools"],
  },
  {
    slug: "health-personal-care",
    name: "Health & Personal Care",
    subcategories: ["Personal hygiene", "Body care", "Wellness accessories"],
  },
  {
    slug: "sports-fitness",
    name: "Sports & Fitness",
    subcategories: ["Fitness equipment", "Cycling", "Sports accessories"],
  },
  {
    slug: "outdoor-garden",
    name: "Outdoor & Garden",
    subcategories: ["Garden tools", "Camping", "Outdoor furniture"],
  },
  {
    slug: "pet-supplies",
    name: "Pet Supplies",
    subcategories: ["Dog supplies", "Cat supplies", "Pet grooming"],
  },
  {
    slug: "travel-luggage",
    name: "Travel & Luggage",
    subcategories: ["Travel bags", "Travel organisers", "Travel electronics"],
  },
  {
    slug: "digital-products",
    name: "Digital Products",
    subcategories: ["Document templates", "Spreadsheets", "eBooks & guides"],
  },
  {
    slug: "print-on-demand",
    name: "Print on Demand",
    subcategories: ["T-shirts", "Mugs", "Phone cases"],
  },
  {
    slug: "mobile-accessories",
    name: "Mobile Accessories",
    subcategories: ["Phone cases", "Chargers", "Charging cables", "Wireless chargers"],
  },
  {
    slug: "gaming-entertainment",
    name: "Gaming & Entertainment",
    subcategories: ["Gaming accessories", "Controllers", "Gaming headsets"],
  },
  {
    slug: "school-education",
    name: "School & Education",
    subcategories: ["School stationery", "Learning resources", "Art supplies"],
  },
  {
    slug: "gifts-personalised",
    name: "Gifts & Personalised",
    subcategories: ["Personalised gifts", "Corporate gifts", "Gift sets"],
  },
] as const;

function text(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function key(value: string | null | undefined): string {
  return text(value)
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const departmentBySlug = new Map(CANONICAL_STORE_DEPARTMENTS.map((item) => [item.slug, item]));

/** Explicit aliases are based on the approved Store taxonomy, not fuzzy text. */
const DEPARTMENT_ALIASES: Readonly<Record<string, string>> = {
  "construction diy": "construction-diy",
  "home living": "home-living",
  "cleaning products": "cleaning-household",
  "cleaning household": "cleaning-household",
  technology: "technology-electronics",
  "technology electronics": "technology-electronics",
  women: "women",
  woman: "women",
  men: "men",
  "kids baby": "kids-baby",
  automotive: "automotive",
  "cars automotive": "automotive",
  "office business": "office-business",
  "tools industrial": "tools-industrial",
  "security smart home": "security-smart-home",
  "beauty grooming": "beauty-grooming",
  "health personal care": "health-personal-care",
  "sports fitness": "sports-fitness",
  "outdoor garden": "outdoor-garden",
  "pet supplies": "pet-supplies",
  "travel luggage": "travel-luggage",
  "travel tech": "travel-luggage",
  "digital products": "digital-products",
  "print on demand": "print-on-demand",
  "mobile accessories": "mobile-accessories",
  "gaming entertainment": "gaming-entertainment",
  "school education": "school-education",
  "gifts personalised": "gifts-personalised",
};

export function canonicalDepartmentFor(
  value: string | null | undefined,
): CanonicalStoreDepartment | null {
  const raw = text(value);
  if (!raw) return null;
  return (
    departmentBySlug.get(raw) ?? departmentBySlug.get(DEPARTMENT_ALIASES[key(raw)] ?? "") ?? null
  );
}

export function isCanonicalStoreDepartment(value: string | null | undefined): boolean {
  return Boolean(canonicalDepartmentFor(value));
}

export function canonicalStoreDepartmentOptions(): readonly CanonicalStoreDepartment[] {
  return CANONICAL_STORE_DEPARTMENTS;
}

function names(slugs: readonly string[]): string[] {
  return slugs
    .map((slug) => departmentBySlug.get(slug)?.name)
    .filter((name): name is string => Boolean(name));
}

/**
 * Returns only an evidence-backed department. A supplier label can request a
 * review but cannot create a department, nor can a past Store product teach
 * the classifier a new category.
 */
export function classifySupplierCategory(input: {
  supplierCategory: string | null | undefined;
  productTitle?: string | null | undefined;
  mappedDepartment?: string | null | undefined;
}): TaxonomyClassification {
  const supplierCategory = text(input.supplierCategory);
  const direct = canonicalDepartmentFor(supplierCategory);
  if (direct) {
    return {
      action: "AUTO_SELECT",
      departmentSlug: direct.slug,
      departmentName: direct.name,
      subcategory: null,
      reason:
        "The supplier category is an approved Cossa Store department or an explicit approved alias.",
      alternatives: [],
    };
  }

  const mapped = canonicalDepartmentFor(input.mappedDepartment);
  if (mapped && key(supplierCategory) === key(input.mappedDepartment)) {
    return {
      action: "AUTO_SELECT",
      departmentSlug: mapped.slug,
      departmentName: mapped.name,
      subcategory: null,
      reason: "A saved mapping names the same approved Cossa Store department.",
      alternatives: [],
    };
  }

  const combined = key(`${supplierCategory} ${text(input.productTitle)}`);
  if (/\b(vehicle|car|automotive)\b/.test(combined)) {
    return {
      action: "VERIFY",
      departmentSlug: "automotive",
      departmentName: "Cars & Automotive",
      subcategory: /vacuum|clean/.test(combined) ? "Car cleaning & detailing" : null,
      reason:
        "Product evidence points to Cars & Automotive, but supplier wording is not itself an approved department.",
      alternatives: names(["automotive", "tools-industrial"]),
    };
  }
  if (/\b(kitchen|cookware|home kitchen)\b/.test(combined)) {
    return {
      action: "VERIFY",
      departmentSlug: "home-living",
      departmentName: "Home & Living",
      subcategory: "Kitchen",
      reason:
        "The public Store hierarchy contains Kitchen under Home & Living; confirm the product belongs there before saving.",
      alternatives: names(["home-living", "cleaning-household"]),
    };
  }
  if (/\b(phone|mobile|charger|charging|usb c)\b/.test(combined)) {
    return {
      action: "VERIFY",
      departmentSlug: "mobile-accessories",
      departmentName: "Mobile Accessories",
      subcategory: /charger|charging/.test(combined) ? "Chargers" : null,
      reason: "Product evidence suggests Mobile Accessories; confirm the department before saving.",
      alternatives: names(["mobile-accessories", "technology-electronics"]),
    };
  }
  if (/\b(jewell?ery|organis|storage box)\b/.test(combined)) {
    return {
      action: "VERIFY",
      departmentSlug: "home-living",
      departmentName: "Home & Living",
      subcategory: "Storage & organisation",
      reason:
        "Product evidence suggests Home & Living storage; it is not a Travel & Luggage classification.",
      alternatives: names(["home-living", "women"]),
    };
  }

  return {
    action: "PROPOSE_CATEGORY",
    departmentSlug: null,
    departmentName: null,
    subcategory: null,
    reason: supplierCategory
      ? "No approved Cossa Store department can be assigned safely from this supplier category. Propose it for review; do not create it."
      : "The supplier did not expose a category. Choose an approved Cossa Store department during review.",
    alternatives: [],
  };
}
