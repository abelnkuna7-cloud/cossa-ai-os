export type SupplierRegistryStatus = "candidate" | "pending" | "active" | "paused" | "rejected";

export type SupplierRegistryInput = {
  organisationId: string;
  name: string;
  code: string;
  businessModel: string;
  registryStatus: SupplierRegistryStatus;
  stockOrigin: string;
  websiteUrl: string;
  recognisedDomains: string;
  contactInformation: string;
  accountReference: string;
  skuTerminology: string;
  defaultFulfilmentProfileCode: string;
  defaultDeliveryPayer: "customer" | "cossa" | "conditional" | "not_applicable";
  defaultFreeShippingEligible: boolean;
  syncMethod: string;
  returnsNotes: string;
  warrantyNotes: string;
  operationalNotes: string;
  pricingImportNotes: string;
  agreementPolicyReference: string;
};

export type DomainRegisteredSupplier = {
  id: string;
  name?: string;
  source_url: string | null;
  recognised_domains?: unknown;
};

function nullable(value: string): string | null {
  return value.trim() || null;
}

export function normaliseSupplierDomains(value: string, websiteUrl = ""): string[] {
  const values = [...value.split(/[\n,\s]+/), websiteUrl]
    .map((item) => item.trim())
    .filter(Boolean);
  const domains = new Set<string>();
  for (const value of values) {
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      if (url.protocol === "http:" || url.protocol === "https:")
        domains.add(url.hostname.replace(/^www\./, "").toLowerCase());
    } catch {
      // Invalid values are ignored here and rejected by the UI before saving.
    }
  }
  return [...domains];
}

export function normaliseSupplierName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function storedDomains(supplier: DomainRegisteredSupplier): string[] {
  const configured = Array.isArray(supplier.recognised_domains)
    ? supplier.recognised_domains.filter((item): item is string => typeof item === "string")
    : [];
  return normaliseSupplierDomains(configured.join(","), supplier.source_url ?? "");
}

export function findPotentialSupplierDuplicate<T extends DomainRegisteredSupplier>(
  suppliers: T[],
  candidate: { name: string; recognisedDomains: string; websiteUrl?: string },
): T | null {
  const candidateName = normaliseSupplierName(candidate.name);
  const candidateDomains = normaliseSupplierDomains(
    candidate.recognisedDomains,
    candidate.websiteUrl ?? "",
  );
  return (
    suppliers.find((supplier) => {
      const hasMatchingName =
        Boolean(candidateName) &&
        Boolean(supplier.name) &&
        normaliseSupplierName(supplier.name ?? "") === candidateName;
      const hasMatchingDomain = candidateDomains.some((domain) =>
        storedDomains(supplier).includes(domain),
      );
      return hasMatchingName || hasMatchingDomain;
    }) ?? null
  );
}

export function supplierForSourceUrl<T extends DomainRegisteredSupplier>(
  suppliers: T[],
  sourceUrl: string,
): T | null {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    return (
      suppliers.find((supplier) =>
        storedDomains(supplier).some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        ),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export function supplierRegistryPayload(input: SupplierRegistryInput): Record<string, unknown> {
  const partnerType =
    input.businessModel === "cossa_stock"
      ? "other"
      : input.businessModel === "dropship"
        ? "dropship"
        : input.businessModel;
  const businessModel = input.businessModel === "fulfilment" ? "other" : input.businessModel;
  return {
    organisation_id: input.organisationId,
    name: input.name.trim(),
    code: input.code.trim(),
    partner_type: partnerType,
    business_model: businessModel,
    // The original supplier table does not contain a candidate state. Preserve
    // backwards compatibility while retaining the richer operational stage.
    status: input.registryStatus === "candidate" ? "pending" : input.registryStatus,
    registry_status: input.registryStatus,
    stock_origin: nullable(input.stockOrigin),
    source_url: nullable(input.websiteUrl),
    recognised_domains: normaliseSupplierDomains(input.recognisedDomains, input.websiteUrl),
    contact_information: nullable(input.contactInformation),
    account_reference: nullable(input.accountReference),
    sku_terminology: nullable(input.skuTerminology),
    default_fulfilment_profile_code: nullable(input.defaultFulfilmentProfileCode),
    default_delivery_payer: input.defaultDeliveryPayer,
    default_free_shipping_eligible: input.defaultFreeShippingEligible,
    sync_method: nullable(input.syncMethod),
    returns_notes: nullable(input.returnsNotes),
    warranty_notes: nullable(input.warrantyNotes),
    operational_notes: nullable(input.operationalNotes),
    pricing_import_notes: nullable(input.pricingImportNotes),
    agreement_policy_reference: nullable(input.agreementPolicyReference),
  };
}
