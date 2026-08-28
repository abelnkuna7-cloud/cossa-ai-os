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
const DEFAULT_MARKUP_PERCENT = 35;

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
  stock_origin: string | null;
  source_url: string | null;
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
  product_id: string;
  supplier_id: string;
  fulfilment_profile_id: string | null;
  business_model: BusinessModel;
  supplier_product_ref: string | null;
  stock_origin: string | null;
  source_url: string;
  import_status: ImportStatus;
  fields_requiring_confirmation: unknown;
  stock_status: StockStatus;
  sync_status: SyncStatus;
  supplier_cost: number | string | null;
  markup_percent: number | string | null;
  calculated_selling_price: number | string | null;
  selling_price_override: number | string | null;
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
};

type SupplierDraft = {
  name: string;
  code: string;
  businessModel: BusinessModel;
  stockOrigin: string;
  sourceUrl: string;
  operationalNotes: string;
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
  stockOrigin: "",
  sourceUrl: "",
  operationalNotes: "",
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
    fieldsRequiringConfirmation: [],
    confirmedFields: [],
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

function ownership(model: BusinessModel): string {
  if (model === "affiliate" || model === "marketplace") return "affiliate_merchant";
  if (model === "pod") return "pod_managed";
  if (model === "cossa_stock") return "cossa_owned";
  return "supplier_managed";
}

function syncToInventoryStatus(value: SyncStatus): string {
  return value === "verified" || value === "manual" || value === "stale" || value === "failed"
    ? value
    : value === "not_connected"
      ? "not_connected"
      : "unknown";
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
  const [products, setProducts] = useState<StoreProduct[]>([]);
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
  const sourceByProductId = useMemo(
    () => new Map(sources.map((source) => [source.product_id, source])),
    [sources],
  );
  const calculatedPrice = useMemo(() => {
    const cost = num(form.supplierCost) ?? 0;
    const markup = num(form.markupPercent) ?? 0;
    return cost > 0 ? Math.round(cost * (1 + markup / 100) * 100) / 100 : null;
  }, [form.markupPercent, form.supplierCost]);
  const sellingPrice = num(form.priceOverride) ?? calculatedPrice;
  const grossProfit = sellingPrice != null ? sellingPrice - (num(form.supplierCost) ?? 0) : null;
  const grossMargin =
    sellingPrice && grossProfit != null ? (grossProfit / sellingPrice) * 100 : null;
  const unconfirmedFields = form.fieldsRequiringConfirmation.filter(
    (field) => !form.confirmedFields.includes(field),
  );
  const effectiveDeliveryPayer =
    form.deliveryPayerOverride === "inherit"
      ? (selectedProfile?.delivery_payer ?? "customer")
      : form.deliveryPayerOverride;
  const effectiveFreeShipping =
    form.freeShippingOverride === "inherit"
      ? (selectedProfile?.free_shipping_eligible ?? false)
      : form.freeShippingOverride === "yes";

  useEffect(() => {
    void loadOperationsBook();
  }, []);

  function update<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function loadOperationsBook() {
    setLoading(true);
    try {
      const [organisationResult, supplierResult, profileResult, productResult, sourceResult] =
        await Promise.all([
          db.from<{ id: string }>("organisations").select("id").limit(1),
          db.from<StoreSupplier>("store_suppliers").select("*").order("name"),
          db.from<FulfilmentProfile>("store_fulfilment_profiles").select("*").order("name"),
          db
            .from<StoreProduct>("store_products")
            .select("*")
            .order("updated_at", { ascending: false }),
          db
            .from<ProductSource>("store_product_sources")
            .select("*")
            .order("updated_at", { ascending: false }),
        ]);

      const error =
        organisationResult.error ??
        supplierResult.error ??
        profileResult.error ??
        productResult.error ??
        sourceResult.error;
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
      setProducts(productResult.data ?? []);
      setSources(sourceResult.data ?? []);
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

  function useKnownDmcCandidate() {
    const dmc = suppliers.find((supplier) => supplier.code === "dmc-wholesale");
    const profile = profiles.find((item) => item.supplier_id === dmc?.id && item.is_active);
    setForm({
      ...emptyForm(dmc, profile),
      lifecycle: "review",
      name: "Portable Small Gadget Bag",
      sku: "DM8363",
      supplierCost: "87.20",
      stockOrigin: "South Africa",
      fieldsRequiringConfirmation: [
        "supplier product URL",
        "description or specifications",
        "product images",
        "current supplier stock before approval",
      ],
      operationalNotes:
        "Known DMC candidate DM8363. Cost R87.20 was recorded during sourcing; confirm the live supplier page, images, details and availability before approval.",
    });
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
          supplierCode: selectedSupplier?.code ?? null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        sourceUrl: string;
        title: string | null;
        description: string | null;
        specifications: string[];
        imageUrls: string[];
        supplierProductRef: string | null;
        pagePrice: number | null;
        stockStatus: StockStatus;
        stockAvailabilityText: string | null;
        importStatus: ImportStatus;
        fieldsRequiringConfirmation: string[];
        warnings: string[];
      } | null;
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload?.error || "The product page could not be imported.");
      }

      setForm((current) => ({
        ...current,
        lifecycle: "review",
        importStatus: payload.importStatus,
        sourceUrl: payload.sourceUrl,
        name: payload.title ?? current.name,
        sku: payload.supplierProductRef ?? current.sku,
        description: payload.description ?? current.description,
        specifications:
          payload.specifications.length > 0
            ? payload.specifications.join("\n")
            : current.specifications,
        imageUrls: payload.imageUrls.length > 0 ? payload.imageUrls : current.imageUrls,
        supplierCost: payload.pagePrice == null ? current.supplierCost : String(payload.pagePrice),
        stockStatus: payload.stockStatus === "unknown" ? current.stockStatus : payload.stockStatus,
        syncStatus: payload.stockStatus === "unknown" ? current.syncStatus : "manual",
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
    setSavingSupplier(true);
    const { data, error } = await db
      .from<StoreSupplier>("store_suppliers")
      .insert({
        organisation_id: organisationId,
        name,
        code,
        partner_type: supplierDraft.businessModel === "pod" ? "pod" : supplierDraft.businessModel,
        business_model: supplierDraft.businessModel,
        status: "pending",
        stock_origin: supplierDraft.stockOrigin.trim() || null,
        source_url: supplierDraft.sourceUrl.trim() || null,
        operational_notes: supplierDraft.operationalNotes.trim() || null,
      })
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
      "Fulfilment profile saved. Its Cossa-facing notices will inherit to linked products.",
    );
  }

  function productPayload(status: StoreProduct["status"]) {
    const supplierName = selectedSupplier?.name ?? null;
    const sourceDescription = [form.description.trim(), form.specifications.trim()]
      .filter(Boolean)
      .join(form.description.trim() && form.specifications.trim() ? "\n\nSpecifications\n" : "");
    const salePrice = sellingPrice ?? 0;
    return {
      name: form.name.trim(),
      slug: slugify(form.name),
      sku: form.sku.trim() || null,
      product_type: productType(form.businessModel),
      fulfilment_model: fulfilmentModel(form.businessModel, form.stockOrigin),
      status,
      short_description: form.shortDescription.trim() || null,
      description: sourceDescription || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || "Cossa Store",
      supplier_name: supplierName,
      supplier_product_ref: form.sku.trim() || null,
      supplier_url: form.sourceUrl.trim() || null,
      affiliate_url:
        form.businessModel === "affiliate" || form.businessModel === "marketplace"
          ? form.affiliateUrl.trim() || null
          : null,
      currency: "ZAR",
      cost_price: num(form.supplierCost) ?? 0,
      price: salePrice,
      compare_at_price: num(form.compareAtPrice),
      track_inventory: false,
      stock_quantity: 0,
      unlimited_stock: false,
      inventory_ownership: ownership(form.businessModel),
      inventory_source_status: syncToInventoryStatus(form.syncStatus),
      inventory_source_reference: form.sourceUrl.trim() || null,
      image_urls: form.imageUrls,
      featured: false,
      seo_title: null,
      seo_description: null,
    };
  }

  function sourcePayload(status: IntakeStatus, fieldsRequiringConfirmation: string[]) {
    const markup = num(form.markupPercent) ?? DEFAULT_MARKUP_PERCENT;
    return {
      organisation_id: organisationId,
      supplier_id: form.supplierId,
      fulfilment_profile_id: form.fulfilmentProfileId || null,
      business_model: form.businessModel,
      supplier_product_ref: form.sku.trim() || null,
      stock_origin: form.stockOrigin.trim() || null,
      source_url: form.sourceUrl.trim(),
      import_status: form.importStatus,
      fields_requiring_confirmation: fieldsRequiringConfirmation,
      stock_status: form.stockStatus,
      sync_status: form.syncStatus,
      supplier_cost: num(form.supplierCost),
      markup_percent: markup,
      calculated_selling_price: calculatedPrice,
      selling_price_override: num(form.priceOverride),
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
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
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
    if (status === "approved" && unconfirmedFields.length > 0) {
      return "Confirm every flagged field before approval.";
    }
    if (status === "published") {
      if (form.lifecycle !== "approved") return "Approve this product before publishing it.";
      if (!form.category.trim() || !form.description.trim()) {
        return "Add a customer-facing category and description before publishing.";
      }
      if (!form.imageUrls.length || !form.sku.trim()) {
        return "Add at least one product image and supplier SKU/product ID before publishing.";
      }
      if (!sellingPrice || sellingPrice <= 0) return "Set a valid selling price before publishing.";
      if (
        (form.businessModel === "affiliate" || form.businessModel === "marketplace") &&
        !/^https?:\/\//i.test(form.affiliateUrl.trim())
      ) {
        return "Affiliate products need a legitimate tracking URL before publication.";
      }
    }
    return null;
  }

  async function saveIntake(status: IntakeStatus) {
    const invalid = validateFor(status);
    if (invalid) return toast.error(invalid);
    setSaving(true);
    try {
      const productStatus: StoreProduct["status"] = status === "published" ? "active" : "draft";
      const sourceStatus = status;
      let productId = form.productId;

      if (productId) {
        const { error } = await db
          .from("store_products")
          .update(productPayload(productStatus))
          .eq("id", productId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await db
          .from<StoreProduct>("store_products")
          .insert(productPayload("draft"))
          .select("*")
          .single();
        if (error || !data)
          throw new Error(error?.message || "Could not create the draft product.");
        productId = data.id;
      }

      const remainingFields =
        status === "approved" || status === "published" ? [] : form.fieldsRequiringConfirmation;
      const payload = { ...sourcePayload(sourceStatus, remainingFields), product_id: productId };
      let sourceId = form.sourceId;
      if (sourceId) {
        const { error } = await db.from("store_product_sources").update(payload).eq("id", sourceId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await db
          .from<ProductSource>("store_product_sources")
          .insert(payload)
          .select("*")
          .single();
        if (error || !data) throw new Error(error?.message || "Could not save the source record.");
        sourceId = data.id;
      }

      setForm((current) => ({
        ...current,
        productId,
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
              ? "Product approved. It is still not public until you publish it."
              : "Product published to Cossa Store.",
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
    const product = products.find((item) => item.id === source.product_id);
    if (!product) return toast.error("The linked product could not be loaded.");
    setForm({
      productId: product.id,
      sourceId: source.id,
      lifecycle: source.approval_status,
      importStatus: source.import_status,
      sourceUrl: source.source_url,
      name: product.name,
      sku: source.supplier_product_ref ?? product.supplier_product_ref ?? product.sku ?? "",
      shortDescription: product.short_description ?? "",
      description: product.description ?? "",
      specifications: "",
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
            <Button variant="outline" onClick={useKnownDmcCandidate} disabled={loading}>
              <PackageSearch className="mr-1.5 h-4 w-4" /> Use DMC candidate DM8363
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {form.productId ? "Continue intake" : "Start a product intake"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                URL imports never publish. If a page blocks extraction, use the same form to enter
                verified data manually.
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
            <Field label="Category">
              <input
                className={inputClass}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="e.g. Travel & Tech"
              />
            </Field>
            <Field label="Brand">
              <input
                className={inputClass}
                value={form.brand}
                onChange={(event) => update("brand", event.target.value)}
              />
            </Field>
            <Field label="Business model">
              <select
                className={inputClass}
                value={form.businessModel}
                onChange={(event) => update("businessModel", event.target.value as BusinessModel)}
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
          </div>

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
                    ) : null}
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
              The default 35% markup is deliberately modest. You stay in control of it per product.
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
              </Field>
              <Field label="Markup percentage">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.markupPercent}
                  onChange={(event) => update("markupPercent", event.target.value)}
                  placeholder={String(DEFAULT_MARKUP_PERCENT)}
                />
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
                <p className="text-xs text-muted-foreground">Gross profit before fees</p>
                <p className="mt-1 font-semibold">{money(grossProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross margin before fees</p>
                <p className="mt-1 font-semibold">
                  {grossMargin == null ? "—" : `${grossMargin.toFixed(1)}%`}
                </p>
              </div>
            </div>
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
          </div>

          <div className="mt-7 border-t border-border/60 pt-6">
            <h3 className="font-semibold">Supplier source &amp; fulfilment</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              These are internal records. The customer sees Cossa-facing fulfilment notices, not
              your supplier identity.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Supplier / partner registry">
                <select
                  className={inputClass}
                  value={form.supplierId}
                  onChange={(event) => {
                    const supplier = suppliers.find((item) => item.id === event.target.value);
                    const profile = profiles.find(
                      (item) => item.supplier_id === supplier?.id && item.is_active,
                    );
                    setForm((current) => ({
                      ...current,
                      supplierId: supplier?.id ?? "",
                      businessModel: supplier?.business_model ?? current.businessModel,
                      stockOrigin: supplier?.stock_origin ?? current.stockOrigin,
                      fulfilmentProfileId: profile?.id ?? "",
                    }));
                  }}
                >
                  <option value="">Select supplier / partner</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} — {supplier.status}
                    </option>
                  ))}
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
              <strong className="text-foreground">{effectiveDeliveryPayer}</strong>. Free shipping:{" "}
              <strong className="text-foreground">
                {effectiveFreeShipping ? "eligible" : "not eligible"}
              </strong>
              . Supplier rules support Cossa operations; Cossa customer terms remain separate.
            </div>
          </div>

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
            <Button
              disabled={saving || form.lifecycle !== "approved"}
              onClick={() => {
                if (
                  window.confirm(
                    "Publish this approved product to the customer-facing Cossa Store now?",
                  )
                )
                  void saveIntake("published");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" /> Publish to Store
            </Button>
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
                  <button
                    type="button"
                    key={supplier.id}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        supplierId: supplier.id,
                        businessModel: supplier.business_model,
                        stockOrigin: supplier.stock_origin ?? current.stockOrigin,
                        fulfilmentProfileId:
                          profiles.find(
                            (profile) => profile.supplier_id === supplier.id && profile.is_active,
                          )?.id ?? "",
                      }))
                    }
                    className={`w-full rounded-xl border p-3 text-left transition ${form.supplierId === supplier.id ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/30"}`}
                  >
                    <p className="text-sm font-semibold">{supplier.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {supplier.business_model} · {supplier.status} ·{" "}
                      {supplier.stock_origin || "origin not recorded"}
                    </p>
                  </button>
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
                      businessModel: event.target.value as BusinessModel,
                    }))
                  }
                >
                  <option value="dropship">Dropshipping</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="pod">Print on demand</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="other">Other</option>
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
                  value={supplierDraft.sourceUrl}
                  onChange={(event) =>
                    setSupplierDraft((current) => ({ ...current, sourceUrl: event.target.value }))
                  }
                  placeholder="Supplier website / portal URL"
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
              One profile can guide many products. It projects only customer-safe Cossa notices.
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
                const product = products.find((item) => item.id === source.product_id);
                return (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => openSource(source)}
                    className="w-full rounded-xl border border-border/60 p-3 text-left hover:border-primary/30"
                  >
                    <p className="line-clamp-2 text-sm font-semibold">
                      {product?.name ?? "Product record"}
                    </p>
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
