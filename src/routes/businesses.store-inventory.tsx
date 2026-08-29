import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  PackagePlus,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Store,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import {
  calculatePricing,
  compareWithMarket,
  inheritSupplierDefaults,
  validNonNegativeNumber,
} from "@/lib/store-inventory-pricing";
import {
  compareCatalogueSnapshots,
  type CatalogueSnapshotItem,
} from "@/lib/store-catalogue-snapshot";
import {
  supplierForSourceUrl,
  supplierRegistryPayload,
  type SupplierRegistryStatus,
} from "@/lib/store-supplier-registry";
import type {
  ImportConfidence,
  ImportedVariant,
  ImportTrace,
} from "@/lib/store-product-import.server";

export const Route = createFileRoute("/businesses/store-inventory")({
  component: StoreInventoryIntake,
  head: () => ({
    meta: [
      { title: "Store Inventory Intake — GROWTH" },
      {
        name: "description",
        content:
          "Import, review and approve Cossa Store products with supplier, fulfilment and pricing controls.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);
const DEFAULT_MARKUP_PERCENT = 25;
const MARKUP_PRESETS = [20, 25, 30, 35, 40] as const;

type BusinessModel =
  | "dropship"
  | "affiliate"
  | "wholesale"
  | "pod"
  | "marketplace"
  | "cossa_stock"
  | "other";
type IntakeStatus = "imported" | "review" | "draft" | "approved" | "published" | "paused";
type ImportStatus = "manual" | "imported" | "partial" | "blocked" | "failed";
type StockStatus = "available" | "unavailable" | "preorder" | "unknown" | "not_checked";
type SyncStatus = "verified" | "manual" | "stale" | "not_connected" | "failed" | "unknown";
type DeliveryPayer = "customer" | "cossa" | "conditional" | "not_applicable";

type StoreSupplier = {
  id: string;
  organisation_id: string;
  code: string;
  name: string;
  partner_type: string;
  business_model: BusinessModel;
  status: "active" | "pending" | "paused" | "rejected";
  registry_status: SupplierRegistryStatus | null;
  stock_origin: string | null;
  source_url: string | null;
  recognised_domains: unknown;
  contact_information: string | null;
  account_reference: string | null;
  sku_terminology: string | null;
  default_fulfilment_profile_code: string | null;
  default_delivery_payer: DeliveryPayer | null;
  default_free_shipping_eligible: boolean;
  sync_method: string | null;
  returns_notes: string | null;
  warranty_notes: string | null;
  pricing_import_notes: string | null;
  agreement_policy_reference: string | null;
  operational_notes: string | null;
  last_verified_at: string | null;
};

type FulfilmentProfile = {
  id: string;
  organisation_id: string;
  supplier_id: string;
  profile_code: string;
  name: string;
  fulfilment_method: string;
  delivery_payer: DeliveryPayer;
  delivery_method: string | null;
  delivery_rule: string | null;
  free_shipping_eligible: boolean;
  customer_delivery_notice: string | null;
  customer_returns_notice: string | null;
  customer_warranty_notice: string | null;
  returns_profile_code: string | null;
  warranty_profile_code: string | null;
  is_active: boolean;
};

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
  fulfilment_model: string;
  status: "draft" | "active" | "archived";
  short_description: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  supplier_name: string | null;
  supplier_product_ref: string | null;
  supplier_url: string | null;
  affiliate_url: string | null;
  cost_price: number | string;
  price: number | string;
  compare_at_price: number | string | null;
  image_urls: string[];
};

type ProductSource = {
  id: string;
  organisation_id: string;
  supplier_id: string;
  fulfilment_profile_id: string | null;
  name: string;
  cossa_sku: string | null;
  short_description: string | null;
  description: string | null;
  specifications: string | null;
  category: string | null;
  brand: string | null;
  image_urls: string[];
  affiliate_url: string | null;
  business_model: BusinessModel;
  supplier_product_ref: string | null;
  stock_origin: string | null;
  source_url: string;
  import_status: ImportStatus;
  fields_requiring_confirmation: unknown;
  stock_status: StockStatus;
  sync_status: SyncStatus;
  supplier_cost: number | string | null;
  supplier_cost_confidence: ImportConfidence;
  supplier_cost_source_label: string | null;
  supplier_rrp: number | string | null;
  supplier_rrp_source_label: string | null;
  supplier_sale_price: number | string | null;
  supplier_sale_price_source_label: string | null;
  supplier_category: string | null;
  features: unknown;
  variants: unknown;
  import_trace: unknown;
  markup_percent: number | string | null;
  calculated_selling_price: number | string | null;
  selling_price_override: number | string | null;
  compare_at_price: number | string | null;
  affiliate_commission_percent: number | string | null;
  affiliate_commission_note: string | null;
  delivery_payer_override: DeliveryPayer | null;
  delivery_method_override: string | null;
  delivery_rule_override: string | null;
  free_shipping_override: boolean | null;
  returns_profile_override: string | null;
  warranty_profile_override: string | null;
  market_price: number | string | null;
  market_price_source_url: string | null;
  market_price_notes: string | null;
  approval_status: IntakeStatus;
  last_price_checked_at: string | null;
  last_stock_checked_at: string | null;
  operational_notes: string | null;
};

type SupplierCategoryMapping = {
  id: string;
  organisation_id: string;
  supplier_id: string;
  supplier_category: string;
  cossa_category: string;
};

type CatalogueSnapshot = {
  id: string;
  created_at: string;
  source_total_count: number;
  active_count: number;
  draft_count: number;
  archived_count: number;
  public_catalogue_count: number;
  integrity_status: "match" | "mismatch";
};

type CatalogueCountRow = { id: string; status: "active" | "draft" | "archived" };

function productFromIntake(source: ProductSource): StoreProduct {
  return {
    id: source.id,
    name: source.name,
    slug: slugify(source.name),
    sku: source.cossa_sku,
    product_type: productType(source.business_model),
    fulfilment_model: fulfilmentModel(source.business_model, source.stock_origin ?? ""),
    status: "draft",
    short_description: source.short_description,
    description: source.description,
    category: source.category,
    brand: source.brand,
    supplier_name: null,
    supplier_product_ref: source.supplier_product_ref,
    supplier_url: source.source_url,
    affiliate_url: source.affiliate_url,
    cost_price: source.supplier_cost ?? 0,
    price: source.selling_price_override ?? source.calculated_selling_price ?? 0,
    compare_at_price: source.compare_at_price,
    image_urls: source.image_urls ?? [],
  };
}

type IntakeForm = {
  productId?: string;
  sourceId?: string;
  lifecycle: IntakeStatus;
  importStatus: ImportStatus;
  sourceUrl: string;
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  specifications: string;
  features: string;
  variants: ImportedVariant[];
  supplierCategory: string;
  category: string;
  brand: string;
  imageUrls: string[];
  manualImageUrl: string;
  supplierId: string;
  fulfilmentProfileId: string;
  businessModel: BusinessModel;
  stockOrigin: string;
  stockStatus: StockStatus;
  syncStatus: SyncStatus;
  supplierCost: string;
  supplierCostConfidence: ImportConfidence;
  supplierCostSourceLabel: string;
  supplierRrp: string;
  supplierRrpSourceLabel: string;
  supplierSalePrice: string;
  supplierSalePriceSourceLabel: string;
  markupPercent: string;
  priceOverride: string;
  compareAtPrice: string;
  marketPrice: string;
  marketPriceSourceUrl: string;
  marketPriceNotes: string;
  affiliateUrl: string;
  affiliateCommissionPercent: string;
  affiliateCommissionNote: string;
  deliveryPayerOverride: "inherit" | DeliveryPayer;
  deliveryMethodOverride: string;
  deliveryRuleOverride: string;
  freeShippingOverride: "inherit" | "yes" | "no";
  returnsProfileOverride: string;
  warrantyProfileOverride: string;
  lastPriceCheckedAt: string;
  lastStockCheckedAt: string;
  operationalNotes: string;
  fieldsRequiringConfirmation: string[];
  confirmedFields: string[];
  importTrace: ImportTrace[];
};

type SupplierDraft = {
  name: string;
  code: string;
  businessModel: BusinessModel | "fulfilment";
  registryStatus: SupplierRegistryStatus;
  stockOrigin: string;
  websiteUrl: string;
  recognisedDomains: string;
  contactInformation: string;
  accountReference: string;
  skuTerminology: string;
  defaultFulfilmentProfileCode: string;
  defaultDeliveryPayer: DeliveryPayer;
  defaultFreeShippingEligible: boolean;
  syncMethod: string;
  returnsNotes: string;
  warrantyNotes: string;
  operationalNotes: string;
  pricingImportNotes: string;
  agreementPolicyReference: string;
};

type ProfileDraft = {
  name: string;
  code: string;
  fulfilmentMethod: string;
  deliveryPayer: DeliveryPayer;
  deliveryMethod: string;
  deliveryRule: string;
  freeShippingEligible: boolean;
  customerDeliveryNotice: string;
  customerReturnsNotice: string;
  customerWarrantyNotice: string;
  returnsProfileCode: string;
  warrantyProfileCode: string;
};

const inputClass =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

const EMPTY_SUPPLIER: SupplierDraft = {
  name: "",
  code: "",
  businessModel: "dropship",
  registryStatus: "candidate",
  stockOrigin: "",
  websiteUrl: "",
  recognisedDomains: "",
  contactInformation: "",
  accountReference: "",
  skuTerminology: "",
  defaultFulfilmentProfileCode: "",
  defaultDeliveryPayer: "customer",
  defaultFreeShippingEligible: false,
  syncMethod: "manual supplier-page check",
  returnsNotes: "",
  warrantyNotes: "",
  operationalNotes: "",
  pricingImportNotes: "",
  agreementPolicyReference: "",
};

const EMPTY_PROFILE: ProfileDraft = {
  name: "",
  code: "",
  fulfilmentMethod: "Supplier direct-to-customer",
  deliveryPayer: "customer",
  deliveryMethod: "",
  deliveryRule: "",
  freeShippingEligible: false,
  customerDeliveryNotice: "",
  customerReturnsNotice: "",
  customerWarrantyNotice: "",
  returnsProfileCode: "",
  warrantyProfileCode: "",
};

function emptyForm(supplier?: StoreSupplier, profile?: FulfilmentProfile): IntakeForm {
  return {
    lifecycle: "imported",
    importStatus: "manual",
    sourceUrl: "",
    name: "",
    sku: "",
    shortDescription: "",
    description: "",
    specifications: "",
    features: "",
    variants: [],
    supplierCategory: "",
    category: "",
    brand: "Cossa Store",
    imageUrls: [],
    manualImageUrl: "",
    supplierId: supplier?.id ?? "",
    fulfilmentProfileId: profile?.id ?? "",
    businessModel: supplier?.business_model ?? "dropship",
    stockOrigin: supplier?.stock_origin ?? "",
    stockStatus: "not_checked",
    syncStatus: "not_connected",
    supplierCost: "",
    supplierCostConfidence: "unconfirmed",
    supplierCostSourceLabel: "",
    supplierRrp: "",
    supplierRrpSourceLabel: "",
    supplierSalePrice: "",
    supplierSalePriceSourceLabel: "",
    markupPercent: String(DEFAULT_MARKUP_PERCENT),
    priceOverride: "",
    compareAtPrice: "",
    marketPrice: "",
    marketPriceSourceUrl: "",
    marketPriceNotes: "",
    affiliateUrl: "",
    affiliateCommissionPercent: "",
    affiliateCommissionNote: "",
    deliveryPayerOverride: "inherit",
    deliveryMethodOverride: "",
    deliveryRuleOverride: "",
    freeShippingOverride: "inherit",
    returnsProfileOverride: "",
    warrantyProfileOverride: "",
    lastPriceCheckedAt: "",
    lastStockCheckedAt: "",
    operationalNotes: "",
    fieldsRequiringConfirmation: [
      "supplier cost confirmation",
      "current supplier stock before approval",
    ],
    confirmedFields: [],
    importTrace: [],
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function num(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function importedVariantRows(value: unknown): ImportedVariant[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is ImportedVariant =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as ImportedVariant).name === "string",
      )
    : [];
}

function importTraceRows(value: unknown): ImportTrace[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is ImportTrace =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as ImportTrace).field === "string" &&
          typeof (item as ImportTrace).sourceLabel === "string",
      )
    : [];
}

function productType(model: BusinessModel): StoreProduct["product_type"] {
  if (model === "affiliate" || model === "marketplace") return "affiliate";
  if (model === "pod") return "pod";
  if (model === "dropship") return "dropshipping";
  return "physical";
}

function fulfilmentModel(model: BusinessModel, origin: string): string {
  if (model === "affiliate" || model === "marketplace") return "affiliate";
  if (model === "pod") return "print_on_demand";
  if (model === "dropship") {
    return /south africa|local|sa\b/i.test(origin)
      ? "local_dropshipping"
      : "international_dropshipping";
  }
  if (model === "cossa_stock") return "cossa_stock";
  return "local_supplier";
}

function money(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function lifecycleCopy(status: IntakeStatus): string {
  switch (status) {
    case "imported":
      return "Import";
    case "review":
      return "Review";
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "published":
      return "Published";
    case "paused":
      return "Paused";
  }
}

function StoreInventoryIntake() {
  const [organisationId, setOrganisationId] = useState("");
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([]);
  const [profiles, setProfiles] = useState<FulfilmentProfile[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<SupplierCategoryMapping[]>([]);
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [form, setForm] = useState<IntakeForm>(() => emptyForm());
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(EMPTY_SUPPLIER);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [snapshots, setSnapshots] = useState<CatalogueSnapshot[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<
    (CatalogueSnapshotItem & { snapshot_id: string })[]
  >([]);
  const [snapshotting, setSnapshotting] = useState(false);
  const [supplierRecognitionMessage, setSupplierRecognitionMessage] = useState<string | null>(null);
  const [catalogueCounts, setCatalogueCounts] = useState({
    source: 0,
    active: 0,
    draft: 0,
    archived: 0,
    publicCount: 0,
  });

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );
  const supplierProfiles = useMemo(
    () =>
      profiles.filter((profile) => profile.supplier_id === form.supplierId && profile.is_active),
    [form.supplierId, profiles],
  );
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === form.fulfilmentProfileId) ?? null,
    [form.fulfilmentProfileId, profiles],
  );
  const pricing = useMemo(
    () =>
      calculatePricing({
        supplierCost: num(form.supplierCost),
        markupPercent: num(form.markupPercent),
        sellingPriceOverride: num(form.priceOverride),
      }),
    [form.markupPercent, form.priceOverride, form.supplierCost],
  );
  const calculatedPrice = pricing.calculatedSellingPrice;
  const sellingPrice = pricing.sellingPrice;
  const grossProfit = pricing.grossProfit;
  const grossMargin = pricing.grossMarginPercent;
  const competitorComparison = useMemo(
    () =>
      compareWithMarket({
        cossaPrice: sellingPrice,
        marketPrice: num(form.marketPrice),
        grossMarginPercent: grossMargin,
      }),
    [form.marketPrice, grossMargin, sellingPrice],
  );
  const unconfirmedFields = form.fieldsRequiringConfirmation.filter(
    (field) => !form.confirmedFields.includes(field),
  );
  const effectiveDeliveryPayer =
    form.deliveryPayerOverride === "inherit"
      ? (selectedProfile?.delivery_payer ?? selectedSupplier?.default_delivery_payer ?? "customer")
      : form.deliveryPayerOverride;
  const effectiveFreeShipping =
    form.freeShippingOverride === "inherit"
      ? (selectedProfile?.free_shipping_eligible ??
        selectedSupplier?.default_free_shipping_eligible ??
        false)
      : form.freeShippingOverride === "yes";
  const snapshotComparison = useMemo(() => {
    if (snapshots.length < 2) return null;
    const [latest, previous] = snapshots;
    return compareCatalogueSnapshots(
      snapshotItems.filter((item) => item.snapshot_id === previous.id),
      snapshotItems.filter((item) => item.snapshot_id === latest.id),
    );
  }, [snapshotItems, snapshots]);

  useEffect(() => {
    void loadOperationsBook();
  }, []);

  function update<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applySupplier(supplier: StoreSupplier | null) {
    const defaultProfile =
      profiles.find(
        (profile) =>
          profile.supplier_id === supplier?.id &&
          profile.is_active &&
          profile.profile_code === supplier?.default_fulfilment_profile_code,
      ) ?? profiles.find((profile) => profile.supplier_id === supplier?.id && profile.is_active);
    setForm((current) =>
      inheritSupplierDefaults({
        current,
        supplier: supplier
          ? {
              id: supplier.id,
              businessModel: supplier.business_model,
              stockOrigin: supplier.stock_origin,
            }
          : null,
        profileId: defaultProfile?.id ?? null,
      }),
    );
  }

  async function loadOperationsBook() {
    setLoading(true);
    try {
      const [
        organisationResult,
        supplierResult,
        profileResult,
        categoryMappingResult,
        sourceResult,
        sourceCatalogueResult,
        publicCatalogueResult,
        snapshotResult,
      ] = await Promise.all([
        db.from<{ id: string }>("organisations").select("id").limit(1),
        db.from<StoreSupplier>("store_suppliers").select("*").order("name"),
        db.from<FulfilmentProfile>("store_fulfilment_profiles").select("*").order("name"),
        db
          .from<SupplierCategoryMapping>("store_supplier_category_mappings")
          .select("*")
          .order("supplier_category"),
        db
          .from<ProductSource>("store_inventory_intakes")
          .select("*")
          .order("created_at", { ascending: false }),
        db.from<CatalogueCountRow>("store_products").select("id,status"),
        db.from<{ id: string }>("store_public_products").select("id"),
        db
          .from<CatalogueSnapshot>("store_catalogue_snapshots")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

      const error =
        organisationResult.error ??
        supplierResult.error ??
        profileResult.error ??
        categoryMappingResult.error ??
        sourceResult.error ??
        sourceCatalogueResult.error ??
        publicCatalogueResult.error ??
        snapshotResult.error;
      if (error) {
        toast.error(
          `Could not load Store Operations Book: ${error.message}. Apply the intake migration before using this section.`,
        );
        return;
      }

      const nextSuppliers = supplierResult.data ?? [];
      const nextProfiles = profileResult.data ?? [];
      setOrganisationId(organisationResult.data?.[0]?.id ?? "");
      setSuppliers(nextSuppliers);
      setProfiles(nextProfiles);
      setCategoryMappings(categoryMappingResult.data ?? []);
      const nextSources = sourceResult.data ?? [];
      setSources(nextSources);
      const sourceCatalogue = sourceCatalogueResult.data ?? [];
      setCatalogueCounts({
        source: sourceCatalogue.length,
        active: sourceCatalogue.filter((product) => product.status === "active").length,
        draft: sourceCatalogue.filter((product) => product.status === "draft").length,
        archived: sourceCatalogue.filter((product) => product.status === "archived").length,
        publicCount: (publicCatalogueResult.data ?? []).length,
      });
      const nextSnapshots = snapshotResult.data ?? [];
      setSnapshots(nextSnapshots);
      if (nextSnapshots.length) {
        const { data: items, error: itemError } = await db
          .from<CatalogueSnapshotItem & { snapshot_id: string }>("store_catalogue_snapshot_items")
          .select("snapshot_id,product_id,sku,slug,source_status,public_present")
          .in(
            "snapshot_id",
            nextSnapshots.map((snapshot) => snapshot.id),
          );
        if (itemError) throw new Error(itemError.message);
        setSnapshotItems(items ?? []);
      } else {
        setSnapshotItems([]);
      }
      setForm((current) => {
        if (current.supplierId || !nextSuppliers.length) return current;
        const dmc =
          nextSuppliers.find((supplier) => supplier.code === "dmc-wholesale") ?? nextSuppliers[0];
        return emptyForm(
          dmc,
          nextProfiles.find((profile) => profile.supplier_id === dmc.id && profile.is_active),
        );
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Store Operations Book is unavailable: ${error.message}`
          : "Store Operations Book is unavailable. Check the browser configuration and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCatalogueSnapshot() {
    setSnapshotting(true);
    try {
      const { error } = await db.rpc("create_store_catalogue_snapshot", { p_reason: "manual" });
      if (error) throw new Error(error.message);
      await loadOperationsBook();
      toast.success("Catalogue snapshot saved. No product records were changed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Snapshot could not be created: ${error.message}`
          : "Snapshot could not be created.",
      );
    } finally {
      setSnapshotting(false);
    }
  }

  function startNewIntake() {
    const dmc = suppliers.find((supplier) => supplier.code === "dmc-wholesale") ?? suppliers[0];
    setForm(
      emptyForm(
        dmc,
        profiles.find((profile) => profile.supplier_id === dmc?.id && profile.is_active),
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startDmcImport() {
    const dmc = suppliers.find((supplier) => supplier.code === "dmc-wholesale");
    const profile = profiles.find((item) => item.supplier_id === dmc?.id && item.is_active);
    setForm({
      ...emptyForm(dmc, profile),
      sourceUrl: "https://dmcwholesale.co.za/products/portable-small-gadget-bag",
    });
    setSupplierRecognitionMessage(
      "DMC Wholesale selected. Import the public supplier page to populate verified fields.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function importFromUrl() {
    if (!form.sourceUrl.trim()) {
      toast.error("Paste a supplier product URL first.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      toast.error("Sign in again before importing a supplier product.");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/store-product-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          sourceUrl: form.sourceUrl.trim(),
          supplierCode: supplierForSourceUrl(suppliers, form.sourceUrl)?.code ?? null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        sourceUrl: string;
        title: string | null;
        shortDescription: string | null;
        description: string | null;
        supplierCategory: string | null;
        brand: string | null;
        features: string[];
        specifications: string[];
        variants: ImportedVariant[];
        imageUrls: string[];
        supplierProductRef: string | null;
        supplierCost: number | null;
        supplierCostConfidence: ImportConfidence;
        supplierCostSourceLabel: string | null;
        supplierRrp: number | null;
        supplierRrpSourceLabel: string | null;
        supplierSalePrice: number | null;
        supplierSalePriceSourceLabel: string | null;
        stockStatus: StockStatus;
        stockAvailabilityText: string | null;
        importTrace: ImportTrace[];
        importStatus: ImportStatus;
        fieldsRequiringConfirmation: string[];
        warnings: string[];
      } | null;
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload?.error || "The product page could not be imported.");
      }

      const identifiedSupplier = supplierForSourceUrl(suppliers, payload.sourceUrl);
      const matchedCategory = categoryMappings.find(
        (mapping) =>
          mapping.supplier_id === identifiedSupplier?.id &&
          mapping.supplier_category.trim().toLowerCase() ===
            (payload.supplierCategory ?? "").trim().toLowerCase(),
      );
      setSupplierRecognitionMessage(
        identifiedSupplier
          ? `${identifiedSupplier.name} recognised from its configured domain. Defaults were inherited.`
          : "Supplier not recognised. Select an existing supplier or add a supplier / partner before approval.",
      );

      setForm((current) => ({
        ...(() => {
          const defaultProfile =
            profiles.find(
              (profile) =>
                profile.supplier_id === identifiedSupplier?.id &&
                profile.is_active &&
                profile.profile_code === identifiedSupplier?.default_fulfilment_profile_code,
            ) ??
            profiles.find(
              (profile) => profile.supplier_id === identifiedSupplier?.id && profile.is_active,
            );
          return inheritSupplierDefaults({
            current,
            supplier: identifiedSupplier
              ? {
                  id: identifiedSupplier.id,
                  businessModel: identifiedSupplier.business_model,
                  stockOrigin: identifiedSupplier.stock_origin,
                }
              : null,
            profileId: defaultProfile?.id ?? null,
          });
        })(),
        ...(identifiedSupplier
          ? {}
          : {
              supplierId: "",
              fulfilmentProfileId: "",
              businessModel: "dropship" as BusinessModel,
            }),
        lifecycle: "review",
        importStatus: payload.importStatus,
        sourceUrl: payload.sourceUrl,
        name: payload.title ?? current.name,
        sku: payload.supplierProductRef ?? current.sku,
        shortDescription: payload.shortDescription ?? current.shortDescription,
        description: payload.description ?? current.description,
        supplierCategory: payload.supplierCategory ?? current.supplierCategory,
        category: matchedCategory?.cossa_category ?? current.category,
        brand: payload.brand ?? current.brand,
        features: payload.features.length > 0 ? payload.features.join("\n") : current.features,
        specifications:
          payload.specifications.length > 0
            ? payload.specifications.join("\n")
            : current.specifications,
        variants: payload.variants.length > 0 ? payload.variants : current.variants,
        imageUrls: payload.imageUrls.length > 0 ? payload.imageUrls : current.imageUrls,
        supplierCost:
          payload.supplierCost == null ? current.supplierCost : String(payload.supplierCost),
        supplierCostConfidence: payload.supplierCostConfidence,
        supplierCostSourceLabel: payload.supplierCostSourceLabel ?? "",
        supplierRrp:
          payload.supplierRrp == null ? current.supplierRrp : String(payload.supplierRrp),
        supplierRrpSourceLabel: payload.supplierRrpSourceLabel ?? "",
        supplierSalePrice:
          payload.supplierSalePrice == null
            ? current.supplierSalePrice
            : String(payload.supplierSalePrice),
        supplierSalePriceSourceLabel: payload.supplierSalePriceSourceLabel ?? "",
        stockStatus: payload.stockStatus === "unknown" ? current.stockStatus : payload.stockStatus,
        syncStatus: payload.stockStatus === "unknown" ? current.syncStatus : "manual",
        importTrace: payload.importTrace,
        fieldsRequiringConfirmation: Array.from(
          new Set([...current.fieldsRequiringConfirmation, ...payload.fieldsRequiringConfirmation]),
        ),
        confirmedFields: current.confirmedFields.filter(
          (field) => !payload.fieldsRequiringConfirmation.includes(field),
        ),
        operationalNotes: [
          current.operationalNotes,
          payload.stockAvailabilityText
            ? `Supplier page availability: ${payload.stockAvailabilityText}.`
            : "",
          ...payload.warnings,
        ]
          .filter(Boolean)
          .join("\n"),
      }));
      toast.success(
        "Available page details were added for review. Confirm every flagged field before approval.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The product page could not be imported.",
      );
    } finally {
      setImporting(false);
    }
  }

  function addManualImageUrl() {
    const url = form.manualImageUrl.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      if (form.imageUrls.includes(parsed.toString())) {
        toast.error("That image is already attached.");
        return;
      }
      update("imageUrls", [...form.imageUrls, parsed.toString()]);
      update("manualImageUrl", "");
    } catch {
      toast.error("Enter a complete http or https image URL.");
    }
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large. Use a file under 8 MB.");
      return;
    }
    setUploadingImage(true);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await db.storage
      .from("store-product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) {
      toast.error(`Image upload failed: ${error.message}`);
      setUploadingImage(false);
      return;
    }
    const { data } = db.storage.from("store-product-images").getPublicUrl(path);
    update("imageUrls", [...form.imageUrls, data.publicUrl]);
    setUploadingImage(false);
    toast.success("Manual product image attached.");
  }

  async function saveSupplier() {
    if (!organisationId) return toast.error("Your Cossa organisation could not be identified.");
    const name = supplierDraft.name.trim();
    const code = slugify(supplierDraft.code || name);
    if (!name || !code) return toast.error("Enter a supplier/partner name and code.");
    if (supplierDraft.websiteUrl.trim()) {
      try {
        const website = new URL(supplierDraft.websiteUrl);
        if (website.protocol !== "http:" && website.protocol !== "https:") throw new Error();
      } catch {
        return toast.error("Use a complete http or https supplier website URL.");
      }
    }
    setSavingSupplier(true);
    const { data, error } = await db
      .from<StoreSupplier>("store_suppliers")
      .insert(
        supplierRegistryPayload({
          organisationId,
          name,
          code,
          businessModel: supplierDraft.businessModel,
          registryStatus: supplierDraft.registryStatus,
          stockOrigin: supplierDraft.stockOrigin,
          websiteUrl: supplierDraft.websiteUrl,
          recognisedDomains: supplierDraft.recognisedDomains,
          contactInformation: supplierDraft.contactInformation,
          accountReference: supplierDraft.accountReference,
          skuTerminology: supplierDraft.skuTerminology,
          defaultFulfilmentProfileCode: supplierDraft.defaultFulfilmentProfileCode,
          defaultDeliveryPayer: supplierDraft.defaultDeliveryPayer,
          defaultFreeShippingEligible: supplierDraft.defaultFreeShippingEligible,
          syncMethod: supplierDraft.syncMethod,
          returnsNotes: supplierDraft.returnsNotes,
          warrantyNotes: supplierDraft.warrantyNotes,
          operationalNotes: supplierDraft.operationalNotes,
          pricingImportNotes: supplierDraft.pricingImportNotes,
          agreementPolicyReference: supplierDraft.agreementPolicyReference,
        }),
      )
      .select("*")
      .single();
    setSavingSupplier(false);
    if (error || !data)
      return toast.error(`Could not add supplier: ${error?.message ?? "Unknown error"}`);
    setSuppliers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setSupplierDraft(EMPTY_SUPPLIER);
    setForm((current) => ({
      ...current,
      supplierId: data.id,
      businessModel: data.business_model,
      stockOrigin: data.stock_origin ?? current.stockOrigin,
      fulfilmentProfileId: "",
    }));
    toast.success(
      "Supplier added to the Store Operations Book. Add its fulfilment profile before approving a product.",
    );
  }

  async function saveCategoryMapping() {
    if (
      !organisationId ||
      !form.supplierId ||
      !form.supplierCategory.trim() ||
      !form.category.trim()
    ) {
      toast.error("Choose a supplier category and Cossa category before saving a mapping.");
      return;
    }
    const { data, error } = await db
      .from<SupplierCategoryMapping>("store_supplier_category_mappings")
      .upsert(
        {
          organisation_id: organisationId,
          supplier_id: form.supplierId,
          supplier_category: form.supplierCategory.trim(),
          cossa_category: form.category.trim(),
        },
        { onConflict: "organisation_id,supplier_id,supplier_category" },
      )
      .select("*")
      .single();
    if (error || !data) {
      toast.error(`Could not save category mapping: ${error?.message ?? "Unknown error"}`);
      return;
    }
    setCategoryMappings((current) => [
      ...current.filter((mapping) => mapping.id !== data.id),
      data,
    ]);
    toast.success("Supplier category mapping saved for future imports.");
  }

  async function updateSupplierStatus(supplier: StoreSupplier, status: SupplierRegistryStatus) {
    const legacyStatus = status === "candidate" ? "pending" : status;
    const { data, error } = await db
      .from<StoreSupplier>("store_suppliers")
      .update({ status: legacyStatus, registry_status: status })
      .eq("id", supplier.id)
      .select("*")
      .single();
    if (error || !data) {
      toast.error(`Could not update supplier status: ${error?.message ?? "Unknown error"}`);
      return;
    }
    setSuppliers((current) => current.map((item) => (item.id === data.id ? data : item)));
    toast.success(`${data.name} is now ${status}.`);
  }

  async function saveProfile() {
    if (!organisationId || !form.supplierId) {
      toast.error("Select a supplier before adding its fulfilment profile.");
      return;
    }
    const name = profileDraft.name.trim();
    const code = slugify(profileDraft.code || name);
    if (!name || !code || !profileDraft.fulfilmentMethod.trim()) {
      toast.error("Enter a profile name, code and fulfilment method.");
      return;
    }
    setSavingProfile(true);
    const { data, error } = await db
      .from<FulfilmentProfile>("store_fulfilment_profiles")
      .insert({
        organisation_id: organisationId,
        supplier_id: form.supplierId,
        profile_code: code,
        name,
        fulfilment_method: profileDraft.fulfilmentMethod.trim(),
        delivery_payer: profileDraft.deliveryPayer,
        delivery_method: profileDraft.deliveryMethod.trim() || null,
        delivery_rule: profileDraft.deliveryRule.trim() || null,
        free_shipping_eligible: profileDraft.freeShippingEligible,
        customer_delivery_notice: profileDraft.customerDeliveryNotice.trim() || null,
        customer_returns_notice: profileDraft.customerReturnsNotice.trim() || null,
        customer_warranty_notice: profileDraft.customerWarrantyNotice.trim() || null,
        returns_profile_code: profileDraft.returnsProfileCode.trim() || null,
        warranty_profile_code: profileDraft.warrantyProfileCode.trim() || null,
      })
      .select("*")
      .single();
    setSavingProfile(false);
    if (error || !data)
      return toast.error(`Could not add fulfilment profile: ${error?.message ?? "Unknown error"}`);
    setProfiles((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setProfileDraft(EMPTY_PROFILE);
    update("fulfilmentProfileId", data.id);
    toast.success(
      "Fulfilment profile saved. Its Cossa-facing notices will be available when catalogue integration is reviewed.",
    );
  }

  function sourcePayload(status: IntakeStatus, fieldsRequiringConfirmation: string[]) {
    const markup = num(form.markupPercent) ?? DEFAULT_MARKUP_PERCENT;
    return {
      organisation_id: organisationId,
      supplier_id: form.supplierId,
      fulfilment_profile_id: form.fulfilmentProfileId || null,
      name: form.name.trim(),
      cossa_sku: null,
      short_description: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      features: form.features
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      variants: form.variants,
      supplier_category: form.supplierCategory.trim() || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || "Cossa Store",
      image_urls: form.imageUrls,
      affiliate_url:
        form.businessModel === "affiliate" || form.businessModel === "marketplace"
          ? form.affiliateUrl.trim() || null
          : null,
      business_model: form.businessModel,
      supplier_product_ref: form.sku.trim() || null,
      stock_origin: form.stockOrigin.trim() || null,
      source_url: form.sourceUrl.trim(),
      import_status: form.importStatus,
      fields_requiring_confirmation: fieldsRequiringConfirmation,
      stock_status: form.stockStatus,
      sync_status: form.syncStatus,
      supplier_cost: num(form.supplierCost),
      supplier_cost_confidence: form.supplierCostConfidence,
      supplier_cost_source_label: form.supplierCostSourceLabel.trim() || null,
      supplier_rrp: num(form.supplierRrp),
      supplier_rrp_source_label: form.supplierRrpSourceLabel.trim() || null,
      supplier_sale_price: num(form.supplierSalePrice),
      supplier_sale_price_source_label: form.supplierSalePriceSourceLabel.trim() || null,
      import_trace: form.importTrace,
      markup_percent: markup,
      calculated_selling_price: calculatedPrice,
      selling_price_override: num(form.priceOverride),
      compare_at_price: num(form.compareAtPrice),
      affiliate_commission_percent: num(form.affiliateCommissionPercent),
      affiliate_commission_note: form.affiliateCommissionNote.trim() || null,
      delivery_payer_override:
        form.deliveryPayerOverride === "inherit" ? null : form.deliveryPayerOverride,
      delivery_method_override: form.deliveryMethodOverride.trim() || null,
      delivery_rule_override: form.deliveryRuleOverride.trim() || null,
      free_shipping_override:
        form.freeShippingOverride === "inherit" ? null : form.freeShippingOverride === "yes",
      returns_profile_override: form.returnsProfileOverride.trim() || null,
      warranty_profile_override: form.warrantyProfileOverride.trim() || null,
      market_price: num(form.marketPrice),
      market_price_source_url: form.marketPriceSourceUrl.trim() || null,
      market_price_notes: form.marketPriceNotes.trim() || null,
      approval_status: status,
      last_price_checked_at: toIso(form.lastPriceCheckedAt),
      last_stock_checked_at: toIso(form.lastStockCheckedAt),
      operational_notes: form.operationalNotes.trim() || null,
      ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}),
    };
  }

  function validateFor(status: IntakeStatus): string | null {
    if (!organisationId) return "Your Cossa organisation could not be identified.";
    if (!form.name.trim()) return "Product title is required.";
    if (!form.sourceUrl.trim()) return "A real supplier product URL is required.";
    try {
      const url = new URL(form.sourceUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      return "Use a complete http or https supplier product URL.";
    }
    if (!form.supplierId) return "Select the product's supplier or partner.";
    if (!form.fulfilmentProfileId) return "Select or create a supplier fulfilment profile.";
    if (num(form.supplierCost) == null && form.businessModel !== "affiliate") {
      return "Enter the confirmed supplier cost.";
    }
    if (!validNonNegativeNumber(num(form.markupPercent))) {
      return "Enter a valid markup percentage of zero or more.";
    }
    if (status === "approved" && unconfirmedFields.length > 0) {
      return "Confirm every flagged field before approval.";
    }
    if (status === "approved" && !form.confirmedFields.includes("supplier cost confirmation")) {
      return "Supplier cost requires manual confirmation before approval.";
    }
    if (status === "published") {
      return "Publishing integration pending production catalogue review.";
    }
    return null;
  }

  async function saveIntake(status: IntakeStatus) {
    const invalid = validateFor(status);
    if (invalid) return toast.error(invalid);
    setSaving(true);
    try {
      const remainingFields = status === "approved" ? [] : form.fieldsRequiringConfirmation;
      const payload = sourcePayload(status, remainingFields);
      let sourceId = form.sourceId;
      if (sourceId) {
        const { error } = await db
          .from("store_inventory_intakes")
          .update(payload)
          .eq("id", sourceId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await db
          .from<ProductSource>("store_inventory_intakes")
          .insert(payload)
          .select("*")
          .single();
        if (error || !data) throw new Error(error?.message || "Could not save the intake record.");
        sourceId = data.id;
      }

      setForm((current) => ({
        ...current,
        productId: sourceId,
        sourceId,
        lifecycle: status,
        fieldsRequiringConfirmation: remainingFields,
      }));
      await loadOperationsBook();
      toast.success(
        status === "review"
          ? "Product saved for review. It is not public."
          : status === "draft"
            ? "Product moved to draft. It is not public."
            : status === "approved"
              ? "Product approved. Publishing integration pending production catalogue review."
              : "Product saved.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Could not save intake: ${error.message}`
          : "Could not save intake.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openSource(source: ProductSource) {
    const product = productFromIntake(source);
    setForm({
      productId: source.id,
      sourceId: source.id,
      lifecycle: source.approval_status,
      importStatus: source.import_status,
      sourceUrl: source.source_url,
      name: product.name,
      sku: source.supplier_product_ref ?? product.supplier_product_ref ?? product.sku ?? "",
      shortDescription: product.short_description ?? "",
      description: product.description ?? "",
      specifications: source.specifications ?? "",
      features: strings(source.features).join("\n"),
      variants: importedVariantRows(source.variants),
      supplierCategory: source.supplier_category ?? "",
      category: product.category ?? "",
      brand: product.brand ?? "Cossa Store",
      imageUrls: product.image_urls ?? [],
      manualImageUrl: "",
      supplierId: source.supplier_id,
      fulfilmentProfileId: source.fulfilment_profile_id ?? "",
      businessModel: source.business_model,
      stockOrigin: source.stock_origin ?? "",
      stockStatus: source.stock_status,
      syncStatus: source.sync_status,
      supplierCost: source.supplier_cost == null ? "" : String(source.supplier_cost),
      supplierCostConfidence: source.supplier_cost_confidence ?? "unconfirmed",
      supplierCostSourceLabel: source.supplier_cost_source_label ?? "",
      supplierRrp: source.supplier_rrp == null ? "" : String(source.supplier_rrp),
      supplierRrpSourceLabel: source.supplier_rrp_source_label ?? "",
      supplierSalePrice:
        source.supplier_sale_price == null ? "" : String(source.supplier_sale_price),
      supplierSalePriceSourceLabel: source.supplier_sale_price_source_label ?? "",
      markupPercent:
        source.markup_percent == null
          ? String(DEFAULT_MARKUP_PERCENT)
          : String(source.markup_percent),
      priceOverride:
        source.selling_price_override == null ? "" : String(source.selling_price_override),
      compareAtPrice: product.compare_at_price == null ? "" : String(product.compare_at_price),
      marketPrice: source.market_price == null ? "" : String(source.market_price),
      marketPriceSourceUrl: source.market_price_source_url ?? "",
      marketPriceNotes: source.market_price_notes ?? "",
      affiliateUrl: product.affiliate_url ?? "",
      affiliateCommissionPercent:
        source.affiliate_commission_percent == null
          ? ""
          : String(source.affiliate_commission_percent),
      affiliateCommissionNote: source.affiliate_commission_note ?? "",
      deliveryPayerOverride: source.delivery_payer_override ?? "inherit",
      deliveryMethodOverride: source.delivery_method_override ?? "",
      deliveryRuleOverride: source.delivery_rule_override ?? "",
      freeShippingOverride:
        source.free_shipping_override == null
          ? "inherit"
          : source.free_shipping_override
            ? "yes"
            : "no",
      returnsProfileOverride: source.returns_profile_override ?? "",
      warrantyProfileOverride: source.warranty_profile_override ?? "",
      lastPriceCheckedAt: dateTimeInput(source.last_price_checked_at),
      lastStockCheckedAt: dateTimeInput(source.last_stock_checked_at),
      operationalNotes: source.operational_notes ?? "",
      fieldsRequiringConfirmation: strings(source.fields_requiring_confirmation),
      confirmedFields: [],
      importTrace: importTraceRows(source.import_trace),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto flex max-w-[1550px] flex-col gap-5 pb-12">
      <section className="glass-card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to="/businesses/store"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Cossa Store
            </Link>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Cossa Store Operations Book
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">
              Inventory &amp; Product Intake
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Paste a real supplier product link, review only the information the page actually
              exposes, then move the product through review, draft, approval and publication.
              Supplier identity and internal costs stay out of customer-facing product data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadOperationsBook()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={startDmcImport} disabled={loading}>
              <PackageSearch className="mr-1.5 h-4 w-4" /> Start DMC import DM8363
            </Button>
            <Button
              onClick={startNewIntake}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <PackagePlus className="mr-1.5 h-4 w-4" /> New intake
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {(["imported", "review", "draft", "approved", "published"] as IntakeStatus[]).map(
          (stage, index) => (
            <div
              key={stage}
              className={`rounded-xl border p-3 ${form.lifecycle === stage ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card/40"}`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold">{lifecycleCopy(stage)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {stage === "imported"
                  ? "Nothing is live."
                  : stage === "review"
                    ? "Confirm imported data."
                    : stage === "draft"
                      ? "Prepare customer copy."
                      : stage === "approved"
                        ? "CEO-ready, still private."
                        : "Customer-facing catalogue."}
              </p>
            </div>
          ),
        )}
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Read-only catalogue audit
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">Catalogue snapshots</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Captures product IDs, SKUs, slugs, status and public presence for later comparison. It
              cannot publish, edit or remove products.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void createCatalogueSnapshot()}
            disabled={snapshotting || loading}
          >
            {snapshotting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Create Catalogue Snapshot
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Source", catalogueCounts.source],
            ["Active", catalogueCounts.active],
            ["Draft", catalogueCounts.draft],
            ["Archived", catalogueCounts.archived],
            ["Public", catalogueCounts.publicCount],
          ].map(([label, count]) => (
            <div key={String(label)} className="rounded-lg border border-border/60 bg-card/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{count}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {snapshots[0]
            ? `Latest snapshot: ${new Date(snapshots[0].created_at).toLocaleString("en-ZA")} · integrity ${snapshots[0].integrity_status.toUpperCase()}.`
            : "No previous snapshot available for comparison."}
        </p>
        {snapshotComparison && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:grid-cols-7">
            {[
              ["Added", snapshotComparison.added.length],
              ["Removed", snapshotComparison.removed.length],
              ["Activated", snapshotComparison.activated.length],
              ["Archived", snapshotComparison.archived.length],
              ["Drafted", snapshotComparison.drafted.length],
              ["Public +", snapshotComparison.publicAdditions.length],
              ["Public −", snapshotComparison.publicRemovals.length],
            ].map(([label, count]) => (
              <div key={String(label)} className="rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground">{label}</p>
                <p className="mt-1 text-base font-semibold">{count}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {form.productId ? "Continue intake" : "Start a product intake"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                URL imports never publish. This internal workflow ends at approval while the
                customer catalogue integration is under separate production review.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Internal operational data
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Supplier product URL" className="flex-1">
                <input
                  className={inputClass}
                  type="url"
                  value={form.sourceUrl}
                  onChange={(event) => update("sourceUrl", event.target.value)}
                  placeholder="https://supplier.example/product/..."
                />
              </Field>
              <Button
                type="button"
                onClick={() => void importFromUrl()}
                disabled={importing}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {importing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1.5 h-4 w-4" />
                )}
                {importing ? "Reading page…" : "Import what is available"}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The importer reads public product-page metadata, structured product data and images
              only. It does not guess missing details, bypass supplier logins or create a live
              product.
            </p>
            {supplierRecognitionMessage ? (
              <p className="mt-3 rounded-lg border border-primary/20 bg-background/70 p-3 text-xs text-muted-foreground">
                {supplierRecognitionMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Product title" className="sm:col-span-2">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Customer-facing product title"
              />
            </Field>
            <Field label="Supplier SKU / product ID">
              <input
                className={inputClass}
                value={form.sku}
                onChange={(event) => update("sku", event.target.value)}
                placeholder="e.g. DM8363"
              />
            </Field>
            <Field label="Cossa Store category">
              <input
                className={inputClass}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="e.g. Travel & Tech"
              />
            </Field>
            <Field label="Supplier category / product type">
              <input
                className={inputClass}
                value={form.supplierCategory}
                onChange={(event) => update("supplierCategory", event.target.value)}
                placeholder="Imported supplier taxonomy"
              />
            </Field>
            {form.supplierCategory.trim() && form.category.trim() && form.supplierId ? (
              <div className="-mt-2 sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void saveCategoryMapping()}
                >
                  Save this supplier-to-Cossa category mapping
                </Button>
              </div>
            ) : null}
            <Field label="Brand">
              <input
                className={inputClass}
                value={form.brand}
                onChange={(event) => update("brand", event.target.value)}
              />
            </Field>
            <Field label="Supplier / partner">
              <select
                className={inputClass}
                value={form.supplierId}
                onChange={(event) =>
                  applySupplier(
                    suppliers.find((supplier) => supplier.id === event.target.value) ?? null,
                  )
                }
              >
                <option value="">Select supplier / partner</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} — {supplier.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Short customer description" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-20`}
                value={form.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
                placeholder="A short, clear customer-facing value statement"
              />
            </Field>
            <Field label="Full customer description" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-32`}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Only use supplier information that you have checked and are entitled to use."
              />
            </Field>
            <Field label="Specifications (one per line)" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.specifications}
                onChange={(event) => update("specifications", event.target.value)}
                placeholder="Size: ...&#10;Material: ...&#10;What is included: ..."
              />
            </Field>
            <Field label="Features (one per line)" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-24`}
                value={form.features}
                onChange={(event) => update("features", event.target.value)}
                placeholder="Only source-backed product features"
              />
            </Field>
          </div>

          {form.variants.length ? (
            <div className="mt-4 rounded-xl border border-border/60 p-4">
              <p className="text-sm font-semibold">Supplier variants</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Imported only where the supplier page exposes actual variants. You may remove a
                variant that is not appropriate for review.
              </p>
              <div className="mt-3 space-y-2">
                {form.variants.map((variant, index) => (
                  <div
                    key={`${variant.supplierVariantId ?? variant.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-xs"
                  >
                    <div className="grid flex-1 gap-2 sm:grid-cols-4">
                      {(["name", "supplierSku", "colour", "size"] as const).map((key) => (
                        <input
                          key={key}
                          className="rounded border border-border/60 bg-background px-2 py-1"
                          value={variant[key] ?? ""}
                          placeholder={key === "supplierSku" ? "Supplier SKU" : key}
                          onChange={(event) =>
                            update(
                              "variants",
                              form.variants.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, [key]: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        update(
                          "variants",
                          form.variants.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedSupplier ? (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
              <p className="font-semibold text-primary">Inherited from {selectedSupplier.name}</p>
              <p className="mt-1 text-muted-foreground">
                {selectedSupplier.business_model.replace(/_/g, " ")} ·{" "}
                {selectedSupplier.stock_origin || "Stock origin needs confirmation"}
                {selectedProfile
                  ? ` · ${selectedProfile.name} · ${selectedProfile.delivery_payer === "customer" ? "customer pays delivery" : `${selectedProfile.delivery_payer} delivery`}`
                  : " · fulfilment profile still needs selection"}
              </p>
            </div>
          ) : null}

          <div className="mt-7 border-t border-border/60 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Product images</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use a supplier-provided image URL or upload a permitted image file. The first
                  image becomes the Store image.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5">
                <Upload className="mr-1.5 h-4 w-4" />{" "}
                {uploadingImage ? "Uploading…" : "Upload image file"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={inputClass}
                type="url"
                value={form.manualImageUrl}
                onChange={(event) => update("manualImageUrl", event.target.value)}
                placeholder="Paste a permitted image URL"
              />
              <Button type="button" variant="outline" onClick={addManualImageUrl}>
                <ImagePlus className="mr-1.5 h-4 w-4" /> Add image URL
              </Button>
            </div>
            {form.imageUrls.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.imageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-border/60 bg-card"
                  >
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
                      onClick={() =>
                        update(
                          "imageUrls",
                          form.imageUrls.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label="Remove product image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {index === 0 ? (
                      <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[10px] font-medium">
                        Main image
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[10px] font-medium hover:text-primary"
                        onClick={() =>
                          update("imageUrls", [
                            url,
                            ...form.imageUrls.filter((item) => item !== url),
                          ])
                        }
                      >
                        Set as main
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                No product image yet. Add one manually if the supplier page does not expose it.
              </div>
            )}
          </div>

          <div className="mt-7 border-t border-border/60 pt-6">
            <h3 className="font-semibold">Pricing &amp; competitive check</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a competitive starting point or type any valid markup. Markup and gross margin
              are shown separately.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label={
                  form.businessModel === "affiliate" || form.businessModel === "marketplace"
                    ? "Supplier price / cost context (R)"
                    : "Confirmed supplier cost (R)"
                }
              >
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.supplierCost}
                  onChange={(event) => update("supplierCost", event.target.value)}
                  placeholder="0.00"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {form.supplierCostSourceLabel
                    ? `${form.supplierCostSourceLabel} · ${form.supplierCostConfidence} confidence`
                    : "Supplier cost requires manual confirmation."}
                </p>
              </Field>
              <Field label="Supplier RRP / suggested retail (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.supplierRrp}
                  onChange={(event) => update("supplierRrp", event.target.value)}
                  placeholder="Optional"
                />
                {form.supplierRrpSourceLabel ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {form.supplierRrpSourceLabel}
                  </p>
                ) : null}
              </Field>
              <Field label="Supplier sale price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.supplierSalePrice}
                  onChange={(event) => update("supplierSalePrice", event.target.value)}
                  placeholder="Only when source labels it as sale"
                />
                {form.supplierSalePriceSourceLabel ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {form.supplierSalePriceSourceLabel}
                  </p>
                ) : null}
              </Field>
              <Field label="Markup percentage">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.markupPercent}
                  onChange={(event) => update("markupPercent", event.target.value)}
                  placeholder={String(DEFAULT_MARKUP_PERCENT)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MARKUP_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => update("markupPercent", String(preset))}
                      className={`rounded-md border px-2 py-1 text-[11px] ${num(form.markupPercent) === preset ? "border-primary/50 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:border-primary/40"}`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Override selling price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.priceOverride}
                  onChange={(event) => update("priceOverride", event.target.value)}
                  placeholder={
                    calculatedPrice == null ? "Enter cost first" : calculatedPrice.toFixed(2)
                  }
                />
              </Field>
              <Field label="Compare-at price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  onChange={(event) => update("compareAtPrice", event.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Calculated selling price</p>
                <p className="mt-1 font-semibold">{money(calculatedPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross product profit</p>
                <p className="mt-1 font-semibold">{money(grossProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross margin</p>
                <p className="mt-1 font-semibold">
                  {grossMargin == null ? "—" : `${grossMargin.toFixed(1)}%`}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Payment fee not configured. Gross product profit excludes payment fees. Customer-paid
              delivery remains separate.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Market / competitor price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.marketPrice}
                  onChange={(event) => update("marketPrice", event.target.value)}
                  placeholder="Optional competitive benchmark"
                />
              </Field>
              <Field label="Competitor price source URL">
                <input
                  className={inputClass}
                  type="url"
                  value={form.marketPriceSourceUrl}
                  onChange={(event) => update("marketPriceSourceUrl", event.target.value)}
                  placeholder="https://"
                />
              </Field>
              <Field label="Competitive pricing notes" className="sm:col-span-2">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={form.marketPriceNotes}
                  onChange={(event) => update("marketPriceNotes", event.target.value)}
                  placeholder="Why this price is fair and competitive before the product is published"
                />
              </Field>
            </div>
            <div className="mt-3 rounded-xl border border-border/60 bg-card/50 p-3 text-xs">
              {competitorComparison.differenceRand == null ? (
                <p className="text-muted-foreground">Competitor benchmark not checked.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">
                    {money(Math.abs(competitorComparison.differenceRand))}{" "}
                    {competitorComparison.label.replace(/^.*?\s/, "")}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.abs(competitorComparison.differencePercent ?? 0).toFixed(1)}%{" "}
                    {competitorComparison.differencePercent &&
                    competitorComparison.differencePercent > 0
                      ? "below benchmark"
                      : competitorComparison.differencePercent === 0
                        ? "at benchmark"
                        : "above benchmark"}
                  </span>
                  {competitorComparison.status ? (
                    <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 font-medium text-primary">
                      {competitorComparison.status}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <details className="mt-7 border-t border-border/60 pt-6">
            <summary className="cursor-pointer list-none rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/35">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Advanced / Operational Details</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supplier defaults, fulfilment rules and product-specific overrides. These remain
                    internal.
                  </p>
                </div>
                <span className="text-xs text-primary">Expand only when this product differs</span>
              </div>
            </summary>
            <div className="pt-4">
              {form.importTrace.length ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs">
                  <p className="font-semibold">Import source details</p>
                  <p className="mt-1 text-muted-foreground">
                    Internal traceability only. Review this evidence; it is never customer-facing.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {form.importTrace.map((trace) => (
                      <p key={`${trace.field}-${trace.sourceLabel}`}>
                        <strong>{trace.field}:</strong> {trace.sourceLabel} · {trace.confidence}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Business model">
                  <select
                    className={inputClass}
                    value={form.businessModel}
                    onChange={(event) =>
                      update("businessModel", event.target.value as BusinessModel)
                    }
                  >
                    <option value="dropship">Dropshipping</option>
                    <option value="affiliate">Affiliate</option>
                    <option value="wholesale">Wholesale / local supplier</option>
                    <option value="pod">Print on demand</option>
                    <option value="marketplace">Marketplace / referral</option>
                    <option value="cossa_stock">Cossa-owned stock</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Fulfilment profile">
                  <select
                    className={inputClass}
                    value={form.fulfilmentProfileId}
                    onChange={(event) => update("fulfilmentProfileId", event.target.value)}
                  >
                    <option value="">Select fulfilment profile</option>
                    {supplierProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Stock origin">
                  <input
                    className={inputClass}
                    value={form.stockOrigin}
                    onChange={(event) => update("stockOrigin", event.target.value)}
                    placeholder="e.g. South Africa"
                  />
                </Field>
                <Field label="Supplier stock / availability">
                  <select
                    className={inputClass}
                    value={form.stockStatus}
                    onChange={(event) => update("stockStatus", event.target.value as StockStatus)}
                  >
                    <option value="not_checked">Not checked</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="preorder">Preorder</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>
                <Field label="Price check date &amp; time">
                  <input
                    className={inputClass}
                    type="datetime-local"
                    value={form.lastPriceCheckedAt}
                    onChange={(event) => update("lastPriceCheckedAt", event.target.value)}
                  />
                </Field>
                <Field label="Stock check date &amp; time">
                  <input
                    className={inputClass}
                    type="datetime-local"
                    value={form.lastStockCheckedAt}
                    onChange={(event) => update("lastStockCheckedAt", event.target.value)}
                  />
                </Field>
                <Field label="Stock / sync status" className="sm:col-span-2">
                  <select
                    className={inputClass}
                    value={form.syncStatus}
                    onChange={(event) => update("syncStatus", event.target.value as SyncStatus)}
                  >
                    <option value="not_connected">Not connected — manual check required</option>
                    <option value="manual">Manually recorded</option>
                    <option value="verified">Verified from a current source</option>
                    <option value="stale">Needs re-checking</option>
                    <option value="failed">Last check failed</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>
              </div>

              {selectedProfile ? (
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                  <p className="font-medium">Inherited from {selectedProfile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedProfile.customer_delivery_notice ||
                      "No customer delivery notice recorded yet."}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Delivery payer">
                  <select
                    className={inputClass}
                    value={form.deliveryPayerOverride}
                    onChange={(event) =>
                      update(
                        "deliveryPayerOverride",
                        event.target.value as IntakeForm["deliveryPayerOverride"],
                      )
                    }
                  >
                    <option value="inherit">
                      Inherit profile ({selectedProfile?.delivery_payer ?? "customer"})
                    </option>
                    <option value="customer">Customer pays delivery</option>
                    <option value="cossa">Cossa pays delivery</option>
                    <option value="conditional">Conditional delivery rule</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </Field>
                <Field label="Free-shipping eligibility">
                  <select
                    className={inputClass}
                    value={form.freeShippingOverride}
                    onChange={(event) =>
                      update(
                        "freeShippingOverride",
                        event.target.value as IntakeForm["freeShippingOverride"],
                      )
                    }
                  >
                    <option value="inherit">
                      Inherit profile (
                      {selectedProfile?.free_shipping_eligible ? "eligible" : "not eligible"})
                    </option>
                    <option value="yes">Eligible</option>
                    <option value="no">Not eligible</option>
                  </select>
                </Field>
                <Field label="Delivery method override">
                  <input
                    className={inputClass}
                    value={form.deliveryMethodOverride}
                    onChange={(event) => update("deliveryMethodOverride", event.target.value)}
                    placeholder={
                      selectedProfile?.delivery_method ?? "Only when product differs from profile"
                    }
                  />
                </Field>
                <Field label="Delivery rule override">
                  <input
                    className={inputClass}
                    value={form.deliveryRuleOverride}
                    onChange={(event) => update("deliveryRuleOverride", event.target.value)}
                    placeholder={
                      selectedProfile?.delivery_rule ?? "Only when product differs from profile"
                    }
                  />
                </Field>
                <Field label="Returns profile override">
                  <input
                    className={inputClass}
                    value={form.returnsProfileOverride}
                    onChange={(event) => update("returnsProfileOverride", event.target.value)}
                    placeholder={
                      selectedProfile?.returns_profile_code ?? "Inherit Cossa-facing profile"
                    }
                  />
                </Field>
                <Field label="Warranty profile override">
                  <input
                    className={inputClass}
                    value={form.warrantyProfileOverride}
                    onChange={(event) => update("warrantyProfileOverride", event.target.value)}
                    placeholder={
                      selectedProfile?.warranty_profile_code ?? "Inherit Cossa-facing profile"
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Effective delivery payer:{" "}
                <strong className="text-foreground">{effectiveDeliveryPayer}</strong>. Free
                shipping:{" "}
                <strong className="text-foreground">
                  {effectiveFreeShipping ? "eligible" : "not eligible"}
                </strong>
                . Supplier rules support Cossa operations; Cossa customer terms remain separate.
              </div>
            </div>
          </details>

          {form.businessModel === "affiliate" || form.businessModel === "marketplace" ? (
            <div className="mt-7 border-t border-border/60 pt-6">
              <h3 className="font-semibold">Affiliate attribution</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Affiliate tracking URL" className="sm:col-span-2">
                  <input
                    className={inputClass}
                    type="url"
                    value={form.affiliateUrl}
                    onChange={(event) => update("affiliateUrl", event.target.value)}
                    placeholder="https://"
                  />
                </Field>
                <Field label="Commission percentage">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={form.affiliateCommissionPercent}
                    onChange={(event) => update("affiliateCommissionPercent", event.target.value)}
                    placeholder="e.g. 8"
                  />
                </Field>
                <Field label="Commission notes">
                  <input
                    className={inputClass}
                    value={form.affiliateCommissionNote}
                    onChange={(event) => update("affiliateCommissionNote", event.target.value)}
                    placeholder="Caps, attribution, payout conditions"
                  />
                </Field>
              </div>
            </div>
          ) : null}

          <div className="mt-7 border-t border-border/60 pt-6">
            <h3 className="font-semibold">Review notes &amp; confirmations</h3>
            <Field label="Operational notes" className="mt-4">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.operationalNotes}
                onChange={(event) => update("operationalNotes", event.target.value)}
                placeholder="Record supplier constraints, delivery checks, licence notes, colour/variant limitations or a review decision."
              />
            </Field>
            {form.fieldsRequiringConfirmation.length ? (
              <div className="mt-4 rounded-xl border border-warning/40 bg-warning/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-semibold">Manual confirmation required</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Check each item only after you have verified it. Approval stays blocked while
                      any item remains unchecked.
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {form.fieldsRequiringConfirmation.map((field) => (
                    <label key={field} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={form.confirmedFields.includes(field)}
                        onChange={(event) =>
                          update(
                            "confirmedFields",
                            event.target.checked
                              ? [...form.confirmedFields, field]
                              : form.confirmedFields.filter((item) => item !== field),
                          )
                        }
                      />
                      <span>{field}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" /> No outstanding import
                confirmations.
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-2 border-t border-border/60 pt-6">
            <Button variant="outline" disabled={saving} onClick={() => void saveIntake("review")}>
              <Save className="mr-1.5 h-4 w-4" /> Save for review
            </Button>
            <Button
              variant="outline"
              disabled={saving || !form.sourceId}
              onClick={() => void saveIntake("draft")}
            >
              <ChevronRight className="mr-1.5 h-4 w-4" /> Move to draft
            </Button>
            <Button
              variant="outline"
              disabled={saving || !form.sourceId || unconfirmedFields.length > 0}
              onClick={() => void saveIntake("approved")}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
            </Button>
            <div className="flex flex-col gap-1">
              <Button disabled className="bg-muted text-muted-foreground">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Publish to Store
              </Button>
              <p className="text-xs text-muted-foreground">
                Publishing integration pending production catalogue review.
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="glass-card p-5">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Supplier &amp; Partner Registry
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suppliers.length} internal partner record{suppliers.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading registry…</p>
              ) : suppliers.length ? (
                suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`w-full rounded-xl border p-3 text-left transition ${form.supplierId === supplier.id ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/30"}`}
                  >
                    <p className="text-sm font-semibold">{supplier.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {supplier.business_model} · {supplier.registry_status ?? supplier.status} ·{" "}
                      {supplier.stock_origin || "origin not recorded"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applySupplier(supplier)}
                      >
                        Use supplier
                      </Button>
                      {supplier.registry_status !== "paused" && supplier.status !== "paused" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void updateSupplierStatus(supplier, "paused")}
                        >
                          Pause
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  No supplier registry records are available. Apply the Store intake migration, then
                  refresh.
                </p>
              )}
            </div>
            <details className="mt-4 rounded-xl border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Add supplier / partner
              </summary>
              <div className="mt-3 space-y-3">
                <input
                  className={inputClass}
                  value={supplierDraft.name}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Company name"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.code}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="Internal code (optional)"
                />
                <select
                  className={inputClass}
                  value={supplierDraft.businessModel}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      businessModel: event.target.value as SupplierDraft["businessModel"],
                    }))
                  }
                >
                  <option value="dropship">Dropshipping</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="pod">Print on demand</option>
                  <option value="fulfilment">Fulfilment partner</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="other">Other</option>
                </select>
                <select
                  className={inputClass}
                  value={supplierDraft.registryStatus}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      registryStatus: event.target.value as SupplierRegistryStatus,
                    }))
                  }
                >
                  <option value="candidate">Candidate</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="rejected">Rejected</option>
                </select>
                <input
                  className={inputClass}
                  value={supplierDraft.stockOrigin}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, stockOrigin: event.target.value }))
                  }
                  placeholder="Stock origin"
                />
                <input
                  className={inputClass}
                  type="url"
                  value={supplierDraft.websiteUrl}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, websiteUrl: event.target.value }))
                  }
                  placeholder="Supplier website / portal URL"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.recognisedDomains}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      recognisedDomains: event.target.value,
                    }))
                  }
                  placeholder="Recognised source domains, comma-separated"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.contactInformation}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      contactInformation: event.target.value,
                    }))
                  }
                  placeholder="Contact information (non-secret)"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.accountReference}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      accountReference: event.target.value,
                    }))
                  }
                  placeholder="Account/reference information (non-secret)"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.skuTerminology}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      skuTerminology: event.target.value,
                    }))
                  }
                  placeholder="Supplier SKU terminology (optional)"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.defaultFulfilmentProfileCode}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      defaultFulfilmentProfileCode: event.target.value,
                    }))
                  }
                  placeholder="Default fulfilment profile code (optional)"
                />
                <select
                  className={inputClass}
                  value={supplierDraft.defaultDeliveryPayer}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      defaultDeliveryPayer: event.target.value as DeliveryPayer,
                    }))
                  }
                >
                  <option value="customer">Customer pays delivery</option>
                  <option value="cossa">Cossa pays delivery</option>
                  <option value="conditional">Conditional delivery</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={supplierDraft.defaultFreeShippingEligible}
                    onChange={(event) =>
                      setSupplierDraft((current) => ({
                        ...current,
                        defaultFreeShippingEligible: event.target.checked,
                      }))
                    }
                  />
                  Eligible for free shipping by default
                </label>
                <input
                  className={inputClass}
                  value={supplierDraft.syncMethod}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, syncMethod: event.target.value }))
                  }
                  placeholder="Stock / sync method"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={supplierDraft.returnsNotes}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      returnsNotes: event.target.value,
                    }))
                  }
                  placeholder="Supplier returns notes"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={supplierDraft.warrantyNotes}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      warrantyNotes: event.target.value,
                    }))
                  }
                  placeholder="Supplier warranty notes"
                />
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={supplierDraft.operationalNotes}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      operationalNotes: event.target.value,
                    }))
                  }
                  placeholder="Internal operational notes"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={supplierDraft.pricingImportNotes}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      pricingImportNotes: event.target.value,
                    }))
                  }
                  placeholder="Pricing / import notes"
                />
                <input
                  className={inputClass}
                  value={supplierDraft.agreementPolicyReference}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({
                      ...current,
                      agreementPolicyReference: event.target.value,
                    }))
                  }
                  placeholder="Agreement or policy reference (non-secret)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Never enter passwords, API keys, private keys or payment credentials here.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingSupplier}
                  onClick={() => void saveSupplier()}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />{" "}
                  {savingSupplier ? "Saving…" : "Add to registry"}
                </Button>
              </div>
            </details>
          </section>

          <section className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">Fulfilment &amp; Policy Profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              One profile can guide many internal intake records. Catalogue projection is pending
              review.
            </p>
            {selectedProfile ? (
              <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3">
                <p className="text-sm font-semibold">{selectedProfile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedProfile.fulfilment_method} · {selectedProfile.delivery_payer} pays · free
                  shipping {selectedProfile.free_shipping_eligible ? "eligible" : "not eligible"}
                </p>
              </div>
            ) : null}
            <details className="mt-4 rounded-xl border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Add fulfilment profile
              </summary>
              <div className="mt-3 space-y-3">
                <input
                  className={inputClass}
                  value={profileDraft.name}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Profile name"
                />
                <input
                  className={inputClass}
                  value={profileDraft.code}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="Profile code (optional)"
                />
                <input
                  className={inputClass}
                  value={profileDraft.fulfilmentMethod}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      fulfilmentMethod: event.target.value,
                    }))
                  }
                  placeholder="Fulfilment method"
                />
                <select
                  className={inputClass}
                  value={profileDraft.deliveryPayer}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      deliveryPayer: event.target.value as DeliveryPayer,
                    }))
                  }
                >
                  <option value="customer">Customer pays delivery</option>
                  <option value="cossa">Cossa pays delivery</option>
                  <option value="conditional">Conditional</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
                <input
                  className={inputClass}
                  value={profileDraft.deliveryMethod}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      deliveryMethod: event.target.value,
                    }))
                  }
                  placeholder="Delivery method"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={profileDraft.deliveryRule}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, deliveryRule: event.target.value }))
                  }
                  placeholder="Internal delivery rule — do not invent timings"
                />
                <Toggle
                  label="Free shipping eligible"
                  checked={profileDraft.freeShippingEligible}
                  onChange={(checked) =>
                    setProfileDraft((current) => ({ ...current, freeShippingEligible: checked }))
                  }
                />
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={profileDraft.customerDeliveryNotice}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      customerDeliveryNotice: event.target.value,
                    }))
                  }
                  placeholder="Customer-facing delivery notice (no supplier name)"
                />
                <input
                  className={inputClass}
                  value={profileDraft.returnsProfileCode}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      returnsProfileCode: event.target.value,
                    }))
                  }
                  placeholder="Internal returns profile code"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={profileDraft.customerReturnsNotice}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      customerReturnsNotice: event.target.value,
                    }))
                  }
                  placeholder="Customer-facing returns notice"
                />
                <input
                  className={inputClass}
                  value={profileDraft.warrantyProfileCode}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      warrantyProfileCode: event.target.value,
                    }))
                  }
                  placeholder="Internal warranty profile code"
                />
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={profileDraft.customerWarrantyNotice}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      customerWarrantyNotice: event.target.value,
                    }))
                  }
                  placeholder="Customer-facing warranty notice"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingProfile}
                  onClick={() => void saveProfile()}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {savingProfile ? "Saving…" : "Add profile"}
                </Button>
              </div>
            </details>
          </section>

          <section className="glass-card p-5">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">Recent intake records</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open any saved record to continue its workflow.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {sources.slice(0, 8).map((source) => {
                return (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => openSource(source)}
                    className="w-full rounded-xl border border-border/60 p-3 text-left hover:border-primary/30"
                  >
                    <p className="line-clamp-2 text-sm font-semibold">{source.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {lifecycleCopy(source.approval_status)} · {source.business_model} ·{" "}
                      {source.stock_status}
                    </p>
                  </button>
                );
              })}
              {!sources.length && !loading ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  No intake records yet. Imported details remain in this form until you save the
                  review record.
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>{label}</span>
    </label>
  );
}
