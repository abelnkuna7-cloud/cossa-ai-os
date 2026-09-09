from pathlib import Path

PATH = Path("src/routes/businesses.store-inventory.tsx")
text = PATH.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global text
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected Store intake source text not found: {old[:140]!r}")
    text = text.replace(old, new, 1)


replace_once(
    '  );\n}\n\nfunction StoreInventoryIntake() {',
    '''  );\n}\n\nfunction readinessStageLabel(\n  id: string,\n  requiredBefore: "draft" | "approval" | null,\n): string {\n  if (id === "source-url" || id === "supplier") return "Required before Save for Review";\n  if (requiredBefore === "approval") return "Required before Approval";\n  if (requiredBefore === "draft") return "Required before Draft";\n  return "Required before Publish";\n}\n\nfunction readinessTargetId(id: string): string {\n  const targetByRequirement: Record<string, string> = {\n    "delivery-rule": "fulfilment-profile",\n    "supplier-cost-confirmation": "review-confirmations",\n    "stock-confirmation": "review-confirmations",\n  };\n  return `intake-field-${targetByRequirement[id] ?? id}`;\n}\n\nfunction StoreInventoryIntake() {''',
)

replace_once(
    '''      sellingPrice,\n    ],\n  );\n  const snapshotComparison = useMemo(() => {''',
    '''      sellingPrice,\n    ],\n  );\n  const missingById = useMemo(\n    () => new Map(readiness.items.filter((item) => !item.satisfied).map((item) => [item.id, item])),\n    [readiness.items],\n  );\n  const snapshotComparison = useMemo(() => {''',
)

replace_once(
    '''                  {readiness.draftMissing.map((item) => (\n                    <li key={item.id}>{item.label}</li>\n                  ))}''',
    '''                  {readiness.draftMissing.map((item) => (\n                    <li key={item.id}>\n                      <a\n                        className="font-medium underline decoration-destructive/40 underline-offset-2 hover:decoration-destructive"\n                        href={`#${readinessTargetId(item.id)}`}\n                      >\n                        {readinessStageLabel(item.id, item.requiredBefore)}: {item.label}\n                      </a>\n                    </li>\n                  ))}''',
)

replace_once(
    '<Field label="Supplier product URL" className="flex-1">',
    '''<Field\n                label="Supplier product URL"\n                className="flex-1"\n                fieldId={readinessTargetId("source-url")}\n                issue={missingById.get("source-url")?.label}\n                issueStage={readinessStageLabel(\n                  "source-url",\n                  missingById.get("source-url")?.requiredBefore ?? null,\n                )}\n              >''',
)

replacements = {
    '<Field label="Product title" className="sm:col-span-2">': '''<Field\n              label="Product title"\n              className="sm:col-span-2"\n              fieldId={readinessTargetId("title")}\n              issue={missingById.get("title")?.label}\n              issueStage={readinessStageLabel("title", missingById.get("title")?.requiredBefore ?? null)}\n            >''',
    '<Field label="Supplier SKU / product ID">': '''<Field\n              label="Supplier SKU / product ID"\n              fieldId={readinessTargetId("supplier-sku")}\n              issue={missingById.get("supplier-sku")?.label}\n              issueStage={readinessStageLabel(\n                "supplier-sku",\n                missingById.get("supplier-sku")?.requiredBefore ?? null,\n              )}\n            >''',
    '<Field label="Cossa Store department">': '''<Field\n              label="Cossa Store department"\n              fieldId={readinessTargetId("category")}\n              issue={missingById.get("category")?.label}\n              issueStage={readinessStageLabel(\n                "category",\n                missingById.get("category")?.requiredBefore ?? null,\n              )}\n            >''',
    '<Field label="Supplier / partner">': '''<Field\n              label="Supplier / partner"\n              fieldId={readinessTargetId("supplier")}\n              issue={missingById.get("supplier")?.label}\n              issueStage={readinessStageLabel(\n                "supplier",\n                missingById.get("supplier")?.requiredBefore ?? null,\n              )}\n            >''',
    '<Field label="Short customer description" className="sm:col-span-2">': '''<Field\n              label="Short customer description"\n              className="sm:col-span-2"\n              fieldId={readinessTargetId("short-description")}\n              issue={missingById.get("short-description")?.label}\n              issueStage={readinessStageLabel(\n                "short-description",\n                missingById.get("short-description")?.requiredBefore ?? null,\n              )}\n            >''',
    '<Field label="Full customer description" className="sm:col-span-2">': '''<Field\n              label="Full customer description"\n              className="sm:col-span-2"\n              fieldId={readinessTargetId("description")}\n              issue={missingById.get("description")?.label}\n              issueStage={readinessStageLabel(\n                "description",\n                missingById.get("description")?.requiredBefore ?? null,\n              )}\n            >''',
    '<Field label="Override selling price (R)">': '''<Field\n                label="Override selling price (R)"\n                fieldId={readinessTargetId("final-price")}\n                issue={missingById.get("final-price")?.label}\n                issueStage={readinessStageLabel(\n                  "final-price",\n                  missingById.get("final-price")?.requiredBefore ?? null,\n                )}\n              >''',
    '<Field label="Fulfilment profile">': '''<Field\n                  label="Fulfilment profile"\n                  fieldId={readinessTargetId("fulfilment-profile")}\n                  issue={missingById.get("fulfilment-profile")?.label ?? missingById.get("delivery-rule")?.label}\n                  issueStage={readinessStageLabel(\n                    missingById.get("fulfilment-profile") ? "fulfilment-profile" : "delivery-rule",\n                    missingById.get("fulfilment-profile")?.requiredBefore ??\n                      missingById.get("delivery-rule")?.requiredBefore ??\n                      null,\n                  )}\n                >''',
    '<Field label="Stock origin">': '''<Field\n                  label="Stock origin"\n                  fieldId={readinessTargetId("stock-origin")}\n                  issue={missingById.get("stock-origin")?.label}\n                  issueStage={readinessStageLabel(\n                    "stock-origin",\n                    missingById.get("stock-origin")?.requiredBefore ?? null,\n                  )}\n                >''',
    '<Field label="Supplier stock / availability">': '''<Field\n                  label="Supplier stock / availability"\n                  fieldId={readinessTargetId("stock-status")}\n                  issue={missingById.get("stock-status")?.label}\n                  issueStage={readinessStageLabel(\n                    "stock-status",\n                    missingById.get("stock-status")?.requiredBefore ?? null,\n                  )}\n                >''',
}

for old, new in replacements.items():
    replace_once(old, new)

replace_once(
    '''              <Field\n                label={\n                  form.businessModel === "affiliate" || form.businessModel === "marketplace"\n                    ? "Supplier price / cost context (R)"\n                    : "Confirmed supplier cost (R)"\n                }\n              >''',
    '''              <Field\n                label={\n                  form.businessModel === "affiliate" || form.businessModel === "marketplace"\n                    ? "Supplier price / cost context (R)"\n                    : "Confirmed supplier cost (R)"\n                }\n                fieldId={readinessTargetId("supplier-cost")}\n                issue={missingById.get("supplier-cost")?.label}\n                issueStage={readinessStageLabel(\n                  "supplier-cost",\n                  missingById.get("supplier-cost")?.requiredBefore ?? null,\n                )}\n              >''',
)

replace_once(
    '<h3 className="font-semibold">Product images</h3>',
    '<h3 id={readinessTargetId("images")} className="scroll-mt-24 font-semibold">Product images</h3>',
)

replace_once(
    '''                <p className="mt-1 text-xs text-muted-foreground">\n                  Use a supplier-provided image URL or upload a permitted image file. The first\n                  image becomes the Store image.\n                </p>''',
    '''                <p className="mt-1 text-xs text-muted-foreground">\n                  Use a supplier-provided image URL or upload a permitted image file. The first\n                  image becomes the Store image.\n                </p>\n                {missingById.get("images") ? (\n                  <p className="mt-2 text-xs font-semibold text-destructive">\n                    {readinessStageLabel(\n                      "images",\n                      missingById.get("images")?.requiredBefore ?? null,\n                    )}: {missingById.get("images")?.label}\n                  </p>\n                ) : null}''',
)

replace_once(
    '<div className="mt-4 rounded-xl border border-warning/40 bg-warning/5 p-4">',
    '<div id={readinessTargetId("supplier-cost-confirmation")} className="mt-4 scroll-mt-24 rounded-xl border border-warning/40 bg-warning/5 p-4">',
)

replace_once(
    '''                  <p className="mt-1 text-xs text-muted-foreground">\n                    These actions record a trusted server timestamp. They never publish the product.\n                  </p>''',
    '''                  <p className="mt-1 text-xs text-muted-foreground">\n                    These actions record a trusted server timestamp. They never publish the product.\n                  </p>\n                  {missingById.get("supplier-cost-confirmation") ||\n                  missingById.get("stock-confirmation") ? (\n                    <p className="mt-2 text-xs font-semibold text-destructive">\n                      Required before Approval: {\n                        [\n                          missingById.get("supplier-cost-confirmation")?.label,\n                          missingById.get("stock-confirmation")?.label,\n                        ]\n                          .filter(Boolean)\n                          .join(" · ")\n                      }\n                    </p>\n                  ) : null}''',
)

replace_once(
    '<li key={blocker.code}>{blocker.message}</li>',
    '<li key={blocker.code}>Required before Publish: {blocker.message}</li>',
)

replace_once(
    '''function Field({\n  label,\n  children,\n  className = "",\n}: {\n  label: string;\n  children: React.ReactNode;\n  className?: string;\n}) {\n  return (\n    <label className={`block ${className}`}>\n      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>\n      {children}\n    </label>\n  );\n}''',
    '''function Field({\n  label,\n  children,\n  className = "",\n  issue,\n  issueStage,\n  fieldId,\n}: {\n  label: string;\n  children: React.ReactNode;\n  className?: string;\n  issue?: string;\n  issueStage?: string;\n  fieldId?: string;\n}) {\n  return (\n    <label\n      id={fieldId}\n      className={`block scroll-mt-24 ${\n        issue ? "rounded-xl border border-destructive/45 bg-destructive/5 p-2" : ""\n      } ${className}`}\n    >\n      <span\n        className={`mb-1.5 block text-xs font-medium ${\n          issue ? "text-destructive" : "text-muted-foreground"\n        }`}\n      >\n        {label}\n      </span>\n      {children}\n      {issue ? (\n        <span className="mt-1.5 block text-[11px] font-semibold text-destructive">\n          {issueStage ? `${issueStage}: ` : ""}\n          {issue}\n        </span>\n      ) : null}\n    </label>\n  );\n}''',
)

PATH.write_text(text, encoding="utf-8")
print("Store intake missing-field guidance patch applied.")
