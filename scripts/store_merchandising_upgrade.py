from pathlib import Path

route_path = Path("src/routes/businesses.store-inventory.tsx")
route = route_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global route
    if new in route:
        return
    count = route.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    route = route.replace(old, new, 1)


replace_once(
    '''import {
  CANONICAL_STORE_DEPARTMENTS,
  canonicalDepartmentFor,
  classifySupplierCategory,
  isCanonicalStoreDepartment,
} from "@/lib/store-taxonomy";
''',
    '''import {
  CANONICAL_STORE_DEPARTMENTS,
  canonicalDepartmentFor,
  classifySupplierCategory,
  isCanonicalStoreDepartment,
} from "@/lib/store-taxonomy";
import {
  STORE_MERCHANDISING_TAGS,
  buildCompetitivePricingNotes,
  normaliseAdditionalDepartments,
  normaliseFeatureLines,
  normaliseMerchandisingTags,
} from "@/lib/store-merchandising";
''',
    "merchandising imports",
)

replace_once(
    '''  category: string | null;
  brand: string | null;
  image_urls: string[];
''',
    '''  category: string | null;
  additional_categories: unknown;
  featured: boolean;
  merchandising_tags: unknown;
  brand: string | null;
  image_urls: string[];
''',
    "ProductSource merchandising fields",
)

replace_once(
    '''  supplierCategory: string;
  category: string;
  brand: string;
''',
    '''  supplierCategory: string;
  category: string;
  additionalCategories: string[];
  featured: boolean;
  merchandisingTags: string[];
  brand: string;
''',
    "IntakeForm merchandising fields",
)

replace_once(
    '''    supplierCategory: "",
    category: "",
    brand: "",
''',
    '''    supplierCategory: "",
    category: "",
    additionalCategories: [],
    featured: false,
    merchandisingTags: [],
    brand: "",
''',
    "empty merchandising fields",
)

replace_once(
    '''      features: strings(source.features).join("\\n"),
      variants: importedVariantRows(source.variants),
      supplierCategory: source.supplier_category ?? "",
      category: product.category ?? "",
      brand: product.brand ?? "",
''',
    '''      features: normaliseFeatureLines(source.features).join("\\n"),
      variants: importedVariantRows(source.variants),
      supplierCategory: source.supplier_category ?? "",
      category: product.category ?? "",
      additionalCategories: normaliseAdditionalDepartments(
        product.category ?? "",
        source.additional_categories,
      ),
      featured: Boolean(source.featured),
      merchandisingTags: normaliseMerchandisingTags(source.merchandising_tags),
      brand: product.brand ?? "",
''',
    "load merchandising fields",
)

replace_once(
    '''      specifications: form.specifications.trim() || null,
      features: form.features
        .split("\\n")
        .map((value) => value.trim())
        .filter(Boolean),
      variants: form.variants,
''',
    '''      specifications: form.specifications.trim() || null,
      features: normaliseFeatureLines(form.features),
      additional_categories: normaliseAdditionalDepartments(form.category, form.additionalCategories),
      featured: form.featured,
      merchandising_tags: normaliseMerchandisingTags(form.merchandisingTags),
      variants: form.variants,
''',
    "save merchandising fields",
)

replace_once(
    '''      market_price: num(form.marketPrice),
      market_price_source_url: form.marketPriceSourceUrl.trim() || null,
      market_price_notes: form.marketPriceNotes.trim() || null,
''',
    '''      market_price: num(form.marketPrice),
      market_price_source_url: form.marketPriceSourceUrl.trim() || null,
      market_price_notes:
        buildCompetitivePricingNotes({
          cossaPrice: sellingPrice,
          marketPrice: num(form.marketPrice),
          marketPriceSourceUrl: form.marketPriceSourceUrl,
          existingNotes: form.marketPriceNotes,
        }) || null,
''',
    "competitive notes persistence",
)

replace_once(
    '''              <p className="mt-1 text-xs text-muted-foreground">
                Only active Cossa Store departments are selectable. Historical product category text
                is never added here.
              </p>
            </Field>
            <Field label="Supplier category / product type">
''',
    '''              <p className="mt-1 text-xs text-muted-foreground">
                Only active Cossa Store departments are selectable. Historical product category text
                is never added here.
              </p>
            </Field>
            <Field label="Additional departments / collections" className="sm:col-span-2">
              <div className="grid gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {CANONICAL_STORE_DEPARTMENTS.filter((department) => department.slug !== form.category).map(
                  (department) => {
                    const checked = form.additionalCategories.includes(department.slug);
                    return (
                      <label key={department.slug} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            update(
                              "additionalCategories",
                              checked
                                ? form.additionalCategories.filter((slug) => slug !== department.slug)
                                : [...form.additionalCategories, department.slug],
                            )
                          }
                        />
                        <span>{department.name}</span>
                      </label>
                    );
                  },
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                One primary department remains the reporting source of truth. Additional placements improve discovery without duplicating the SKU.
              </p>
            </Field>
            <Field label="Merchandising & featuring" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3 rounded-xl border border-border/70 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => update("featured", event.target.checked)}
                  />
                  Featured
                </label>
                {STORE_MERCHANDISING_TAGS.map((tag) => {
                  const checked = form.merchandisingTags.includes(tag);
                  const label = tag.replace(/_/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase());
                  return (
                    <label key={tag} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          update(
                            "merchandisingTags",
                            checked
                              ? form.merchandisingTags.filter((value) => value !== tag)
                              : [...form.merchandisingTags, tag],
                          )
                        }
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Supplier category / product type">
''',
    "multi-department UI",
)

replace_once(
    '''              <Field label="Competitive pricing notes" className="sm:col-span-2">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={form.marketPriceNotes}
                  onChange={(event) => update("marketPriceNotes", event.target.value)}
                  placeholder="Why this price is fair and competitive before the product is published"
''',
    '''              <Field label="Competitive pricing notes" className="sm:col-span-2">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={form.marketPriceNotes}
                  onChange={(event) => update("marketPriceNotes", event.target.value)}
                  onBlur={() => {
                    if (form.marketPriceNotes.trim()) return;
                    const generated = buildCompetitivePricingNotes({
                      cossaPrice: sellingPrice,
                      marketPrice: num(form.marketPrice),
                      marketPriceSourceUrl: form.marketPriceSourceUrl,
                    });
                    if (generated) update("marketPriceNotes", generated);
                  }}
                  placeholder="Add notes or leave blank and the recorded benchmark will generate a factual comparison"
''',
    "competitive notes UI",
)

route_path.write_text(route)

importer_path = Path("src/lib/store-product-import.server.ts")
importer = importer_path.read_text()

old_signature = '''function extractedFeatures(description: string | null): string[] {
  const features: string[] = [];
  const text = description ?? "";
'''
new_signature = '''function extractedFeatures(description: string | null, rawDescription?: string | null): string[] {
  const features: string[] = [];
  const text = description ?? "";
  if (rawDescription) {
    for (const match of rawDescription.matchAll(/<li\\b[^>]*>([\\s\\S]*?)<\\/li>/gi)) {
      const feature = cleanText(match[1]);
      if (!feature || feature.length < 3 || feature.length > 500) continue;
      addUnique(features, feature);
      if (features.length >= 24) break;
    }
  }
'''
if new_signature not in importer:
    count = importer.count(old_signature)
    if count != 1:
        raise SystemExit(f"feature extractor: expected 1 match, found {count}")
    importer = importer.replace(old_signature, new_signature, 1)

old_call = '  const features = extractedFeatures(description);\n'
new_call = '''  const features = extractedFeatures(
    description,
    typeof shopify?.description === "string" ? shopify.description : null,
  );
'''
if new_call not in importer:
    count = importer.count(old_call)
    if count != 1:
        raise SystemExit(f"feature call: expected 1 match, found {count}")
    importer = importer.replace(old_call, new_call, 1)

importer_path.write_text(importer)
