import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  GripVertical,
  ImagePlus,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";
import {
  nextAvailableStoreSku,
  preflightSummary,
  runStoreProductPreflight,
  type StoreProductPreflightResult,
} from "@/lib/store-product-intelligence";

export const Route = createFileRoute("/businesses/store-products")({
  component: StoreProductManager,
  head: () => ({
    meta: [
      { title: "Store Products — GROWTH" },
      {
        name: "description",
        content: "Manage Cossa Store products, pricing, stock, images and digital customer files.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);

type ProductType = "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
type ProductStatus = "draft" | "active" | "archived";
type FulfilmentModel =
  | "cossa_stock"
  | "local_supplier"
  | "local_dropshipping"
  | "international_dropshipping"
  | "print_on_demand"
  | "affiliate"
  | "digital";
type InventoryOwnership =
  | "cossa_owned"
  | "supplier_managed"
  | "pod_managed"
  | "affiliate_merchant"
  | "digital"
  | "not_applicable"
  | "unknown";
type InventorySourceStatus =
  | "verified"
  | "manual"
  | "stale"
  | "not_connected"
  | "failed"
  | "unknown";

type StoreProduct = {
  id: string;
  organisation_id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: ProductType;
  fulfilment_model: FulfilmentModel;
  status: ProductStatus;
  short_description: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  supplier_name: string | null;
  supplier_product_ref: string | null;
  supplier_url: string | null;
  affiliate_url: string | null;
  currency: "ZAR";
  cost_price: number | string;
  price: number | string;
  compare_at_price: number | string | null;
  track_inventory: boolean;
  stock_quantity: number;
  unlimited_stock: boolean;
  inventory_ownership: InventoryOwnership;
  inventory_source_status: InventorySourceStatus;
  inventory_source_reference: string | null;
  featured: boolean;
  image_urls: string[];
  seo_title: string | null;
  seo_description: string | null;
  digital_file_path: string | null;
  digital_file_name: string | null;
  digital_download_limit: number | null;
  digital_access_days: number | null;
  created_at: string;
  updated_at: string;
};

type ProductForm = {
  id?: string;
  organisation_id?: string;
  name: string;
  slug: string;
  sku: string;
  product_type: ProductType;
  fulfilment_model: FulfilmentModel;
  status: ProductStatus;
  short_description: string;
  description: string;
  category: string;
  brand: string;
  supplier_name: string;
  supplier_product_ref: string;
  supplier_url: string;
  affiliate_url: string;
  cost_price: string;
  price: string;
  compare_at_price: string;
  track_inventory: boolean;
  stock_quantity: string;
  unlimited_stock: boolean;
  inventory_ownership: InventoryOwnership;
  inventory_source_status: InventorySourceStatus;
  inventory_source_reference: string;
  featured: boolean;
  image_urls: string[];
  seo_title: string;
  seo_description: string;
  digital_file_path: string;
  digital_file_name: string;
  digital_download_limit: string;
  digital_access_days: string;
};

type Deliverable = {
  id: string;
  product_id: string;
  organisation_id: string;
  label: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  position: number;
  is_primary: boolean;
  is_customer_visible: boolean;
  created_at: string;
};

type PortfolioIntelligence = {
  health?: Record<string, number>;
  critical_count?: number;
  warning_count?: number;
  stale_supplier_inventory?: number;
  negative_margin_products?: number;
  active_digital_missing_file?: number;
  low_stock?: number;
  out_of_stock?: number;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  slug: "",
  sku: "",
  product_type: "digital",
  fulfilment_model: "digital",
  status: "draft",
  short_description: "",
  description: "",
  category: "digital-products",
  brand: "Cossa Store",
  supplier_name: "",
  supplier_product_ref: "",
  supplier_url: "",
  affiliate_url: "",
  cost_price: "0",
  price: "",
  compare_at_price: "",
  track_inventory: false,
  stock_quantity: "0",
  unlimited_stock: true,
  inventory_ownership: "unknown",
  inventory_source_status: "unknown",
  inventory_source_reference: "",
  featured: false,
  image_urls: [],
  seo_title: "",
  seo_description: "",
  digital_file_path: "",
  digital_file_name: "",
  digital_download_limit: "5",
  digital_access_days: "30",
};

const PRODUCT_TYPES: Array<{ value: ProductType; label: string }> = [
  { value: "digital", label: "Digital product" },
  { value: "physical", label: "Physical product" },
  { value: "affiliate", label: "Affiliate product" },
  { value: "pod", label: "Print on demand" },
  { value: "dropshipping", label: "Dropshipping" },
];

const inputClass =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function formatBytes(value: number | null) {
  if (!value || value < 1) return "Size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultFulfilment(type: ProductType): FulfilmentModel {
  switch (type) {
    case "digital": return "digital";
    case "affiliate": return "affiliate";
    case "pod": return "print_on_demand";
    case "dropshipping": return "local_dropshipping";
    case "physical": return "cossa_stock";
  }
}

function skuPrefix(type: ProductType) {
  if (type === "digital") return "COS-DIG-AI-";
  if (type === "physical") return "COS-PHY-";
  if (type === "pod") return "COS-POD-";
  if (type === "dropshipping") return "COS-DS-";
  return "COS-AFF-";
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function publicationIssues(form: ProductForm): string[] {
  const issues: string[] = [];
  if (!form.category.trim()) issues.push("category");
  if (!form.description.trim()) issues.push("description");
  if (form.image_urls.length === 0) issues.push("product image");
  if (form.product_type !== "affiliate" && !form.sku.trim()) issues.push("SKU");
  if (form.product_type !== "affiliate" && Number(form.price) <= 0) issues.push("selling price");
  if (form.product_type === "digital" && !form.digital_file_path.trim()) issues.push("primary ZIP/file");
  if (form.product_type === "affiliate") {
    if (!form.supplier_name.trim()) issues.push("partner or merchant name");
    if (!/^https?:\/\//i.test(form.affiliate_url.trim())) issues.push("legitimate affiliate URL");
  }
  if (form.product_type === "pod") {
    if (!form.supplier_name.trim()) issues.push("POD provider");
    if (!form.supplier_product_ref.trim()) issues.push("provider product reference");
  }
  if (form.product_type === "dropshipping") {
    if (!form.supplier_name.trim()) issues.push("supplier");
    if (!form.supplier_product_ref.trim() && !form.supplier_url.trim()) issues.push("supplier reference or URL");
  }
  if (form.product_type === "physical" && form.fulfilment_model === "cossa_stock" && form.track_inventory && !form.unlimited_stock && Number(form.stock_quantity) <= 0) issues.push("available stock quantity");
  return issues;
}

function rowToForm(row: StoreProduct): ProductForm {
  return {
    id: row.id,
    organisation_id: row.organisation_id,
    name: row.name,
    slug: row.slug,
    sku: row.sku ?? "",
    product_type: row.product_type,
    fulfilment_model: row.fulfilment_model ?? defaultFulfilment(row.product_type),
    status: row.status,
    short_description: row.short_description ?? "",
    description: row.description ?? "",
    category: row.category ?? "",
    brand: row.brand ?? "",
    supplier_name: row.supplier_name ?? "",
    supplier_product_ref: row.supplier_product_ref ?? "",
    supplier_url: row.supplier_url ?? "",
    affiliate_url: row.affiliate_url ?? "",
    cost_price: String(row.cost_price ?? 0),
    price: String(row.price ?? ""),
    compare_at_price: row.compare_at_price == null ? "" : String(row.compare_at_price),
    track_inventory: row.track_inventory,
    stock_quantity: String(row.stock_quantity ?? 0),
    unlimited_stock: row.unlimited_stock,
    inventory_ownership: row.inventory_ownership ?? "unknown",
    inventory_source_status: row.inventory_source_status ?? "unknown",
    inventory_source_reference: row.inventory_source_reference ?? "",
    featured: row.featured,
    image_urls: row.image_urls ?? [],
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    digital_file_path: row.digital_file_path ?? "",
    digital_file_name: row.digital_file_name ?? "",
    digital_download_limit: row.digital_download_limit == null ? "" : String(row.digital_download_limit),
    digital_access_days: row.digital_access_days == null ? "" : String(row.digital_access_days),
  };
}

function StoreProductManager() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [uploadingDeliverables, setUploadingDeliverables] = useState(false);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [deliverableLabel, setDeliverableLabel] = useState("");
  const [customerVisible, setCustomerVisible] = useState(true);
  const [makeDeliverablePrimary, setMakeDeliverablePrimary] = useState(false);
  const [deliverableUploadError, setDeliverableUploadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [preflight, setPreflight] = useState<StoreProductPreflightResult | null>(null);
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [portfolioIntel, setPortfolioIntel] = useState<PortfolioIntelligence | null>(null);
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const [draggingDeliverableId, setDraggingDeliverableId] = useState<string | null>(null);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editingDeliverableLabel, setEditingDeliverableLabel] = useState("");
  const [reorderingDeliverables, setReorderingDeliverables] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesSearch = !needle || product.name.toLowerCase().includes(needle) || product.slug.toLowerCase().includes(needle) || (product.sku ?? "").toLowerCase().includes(needle) || (product.category ?? "").toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [products, query, statusFilter]);

  const margin = useMemo(() => {
    const price = Number(form.price || 0);
    const cost = Number(form.cost_price || 0);
    if (price <= 0) return null;
    return { amount: price - cost, percent: ((price - cost) / price) * 100 };
  }, [form.price, form.cost_price]);

  const readinessIssues = useMemo(() => publicationIssues(form), [form]);
  const tracksInventory = form.product_type === "physical" && form.fulfilment_model === "cossa_stock";

  const packageSignals = useMemo(() => {
    const searchable = deliverables.map((item) => `${item.label} ${item.file_name}`.toLowerCase());
    return {
      hasCoursePdf: searchable.some((value) => value.includes("course") && value.includes(".pdf")),
      hasStartHere: searchable.some((value) => value.includes("start here") || value.includes("start-here")),
      hasWorkbook: searchable.some((value) => value.includes("workbook")),
      visibleFiles: deliverables.filter((item) => item.is_customer_visible).length,
    };
  }, [deliverables]);

  async function loadPortfolioIntelligence() {
    const { data, error } = await db.rpc("store_product_manager_intelligence");
    if (!error && data) setPortfolioIntel(data as PortfolioIntelligence);
  }

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await db.from("store_products").select("*").order("updated_at", { ascending: false });
    if (error) { toast.error(`Could not load Store products: ${error.message}`); setProducts([]); }
    else setProducts((data ?? []) as StoreProduct[]);
    setLoading(false);
    void loadPortfolioIntelligence();
  }

  async function loadDeliverables(productId?: string) {
    if (!productId) { setDeliverables([]); return; }
    setLoadingDeliverables(true);
    const { data, error } = await db.from("store_product_digital_deliverables").select("*").eq("product_id", productId).order("position", { ascending: true }).order("created_at", { ascending: true });
    if (error) { toast.error(`Could not load customer files: ${error.message}`); setDeliverables([]); }
    else setDeliverables((data ?? []) as Deliverable[]);
    setLoadingDeliverables(false);
  }

  useEffect(() => { void loadProducts(); }, []);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreflight(null);
  }

  function newProduct(type: ProductType = "digital") {
    setForm({ ...EMPTY_FORM, product_type: type, fulfilment_model: defaultFulfilment(type), category: type === "digital" ? "digital-products" : "", unlimited_stock: type !== "physical", track_inventory: type === "physical" });
    setDeliverables([]);
    setDeliverableUploadError(null);
    setPreflight(null);
    setEditingDeliverableId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editProduct(product: StoreProduct) {
    setForm(rowToForm(product));
    setDeliverableUploadError(null);
    setPreflight(null);
    setEditingDeliverableId(null);
    void loadDeliverables(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function generateSku() {
    setGeneratingSku(true);
    try {
      const next = await nextAvailableStoreSku(skuPrefix(form.product_type), 1);
      update("sku", next);
      toast.success(`Next available SKU: ${next}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate SKU."); }
    finally { setGeneratingSku(false); }
  }

  async function persistImageOrder(nextUrls: string[]) {
    update("image_urls", nextUrls);
    if (!form.id) return;
    const { error } = await db.from("store_products").update({ image_urls: nextUrls, updated_at: new Date().toISOString() }).eq("id", form.id);
    if (error) {
      toast.error(`Could not save image order: ${error.message}`);
      return;
    }
    setProducts((current) => current.map((product) => product.id === form.id ? { ...product, image_urls: nextUrls } : product));
  }

  async function moveImage(from: number, to: number) {
    const next = moveItem(form.image_urls, from, to);
    if (next === form.image_urls) return;
    await persistImageOrder(next);
  }

  async function uploadProductImage(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image is too large. Use a file under 8 MB.");
    setUploadingImage(true);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await db.storage.from("store-product-images").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) { toast.error(`Image upload failed: ${error.message}`); setUploadingImage(false); return; }
    const { data } = db.storage.from("store-product-images").getPublicUrl(path);
    update("image_urls", [...form.image_urls, data.publicUrl]);
    toast.success("Product image uploaded.");
    setUploadingImage(false);
  }

  async function uploadDigitalFile(file: File) {
    if (file.size > 50 * 1024 * 1024) return toast.error("Digital file is too large. Use a file under 50 MB for now.");
    setUploadingDigital(true);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await db.storage.from("store-digital-products").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });
    if (error) { toast.error(`Digital file upload failed: ${error.message}`); setUploadingDigital(false); return; }
    setForm((current) => ({ ...current, digital_file_path: path, digital_file_name: file.name }));
    setPreflight(null);
    toast.success("Primary secure package uploaded.");
    setUploadingDigital(false);
  }

  async function resolveOrganisationId(productId: string) {
    const fromForm = form.organisation_id?.trim();
    if (fromForm) return fromForm;
    const fromCatalogue = products.find((product) => product.id === productId)?.organisation_id?.trim();
    if (fromCatalogue) return fromCatalogue;
    const { data, error } = await db.from("store_products").select("organisation_id").eq("id", productId).single();
    if (error) throw new Error(`Could not resolve product organisation: ${error.message}`);
    const organisationId = (data as { organisation_id?: string } | null)?.organisation_id?.trim();
    if (!organisationId) throw new Error("This product is missing its organisation link. Refresh the Product Manager and try again.");
    setForm((current) => ({ ...current, organisation_id: organisationId }));
    return organisationId;
  }

  async function uploadCustomerFiles(files: FileList | File[]) {
    if (!form.id) {
      const message = "Save this product as a draft first, then add customer files here.";
      setDeliverableUploadError(message);
      toast.error(message);
      return;
    }
    const items = Array.from(files);
    if (!items.length) return;
    const oversized = items.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) {
      const message = `${oversized.name} is over the 50 MB file limit.`;
      setDeliverableUploadError(message);
      toast.error(message);
      return;
    }

    setUploadingDeliverables(true);
    setDeliverableUploadError(null);
    const uploadedPaths: string[] = [];
    try {
      const organisationId = await resolveOrganisationId(form.id);
      let nextPosition = deliverables.length ? Math.max(...deliverables.map((item) => item.position)) + 1 : 0;
      let primaryRequested = makeDeliverablePrimary;

      for (const file of items) {
        const path = `${new Date().toISOString().slice(0, 10)}/${form.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage.from("store-digital-products").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });
        if (uploadError) throw new Error(`Storage upload failed for ${file.name}: ${uploadError.message}`);
        uploadedPaths.push(path);

        if (primaryRequested) {
          const { error: clearError } = await db.from("store_product_digital_deliverables").update({ is_primary: false }).eq("product_id", form.id).eq("is_primary", true);
          if (clearError) throw new Error(`Could not update the primary deliverable: ${clearError.message}`);
        }

        const { error: insertError } = await db.from("store_product_digital_deliverables").insert({
          product_id: form.id,
          organisation_id: organisationId,
          label: deliverableLabel.trim() || file.name.replace(/\.[^.]+$/, ""),
          file_name: file.name,
          file_path: path,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          position: nextPosition,
          is_primary: primaryRequested,
          is_customer_visible: customerVisible,
        });
        if (insertError) throw new Error(`Could not attach ${file.name} to the product: ${insertError.message}`);
        nextPosition += 1;
        primaryRequested = false;
      }

      toast.success(`${items.length} customer file${items.length === 1 ? "" : "s"} uploaded securely.`);
      setDeliverableLabel("");
      setMakeDeliverablePrimary(false);
      setDeliverableUploadError(null);
      await loadDeliverables(form.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      setDeliverableUploadError(message);
      toast.error(`Customer-file upload failed: ${message}`);
      if (uploadedPaths.length) await db.storage.from("store-digital-products").remove(uploadedPaths);
    } finally {
      setUploadingDeliverables(false);
    }
  }

  async function setPrimaryDeliverable(deliverable: Deliverable) {
    if (!form.id) return;
    const { error: clearError } = await db.from("store_product_digital_deliverables").update({ is_primary: false }).eq("product_id", form.id).eq("is_primary", true);
    if (clearError) return toast.error(`Could not change primary file: ${clearError.message}`);
    const { error } = await db.from("store_product_digital_deliverables").update({ is_primary: true }).eq("id", deliverable.id);
    if (error) return toast.error(`Could not change primary file: ${error.message}`);
    await loadDeliverables(form.id);
  }

  async function toggleDeliverableVisibility(deliverable: Deliverable) {
    const { error } = await db.from("store_product_digital_deliverables").update({ is_customer_visible: !deliverable.is_customer_visible }).eq("id", deliverable.id);
    if (error) return toast.error(`Could not update file visibility: ${error.message}`);
    await loadDeliverables(deliverable.product_id);
  }

  function beginRenameDeliverable(deliverable: Deliverable) {
    setEditingDeliverableId(deliverable.id);
    setEditingDeliverableLabel(deliverable.label);
  }

  async function saveDeliverableLabel(deliverable: Deliverable) {
    const label = editingDeliverableLabel.trim();
    if (!label) return toast.error("Customer-file label cannot be empty.");
    const { error } = await db.from("store_product_digital_deliverables").update({ label }).eq("id", deliverable.id);
    if (error) return toast.error(`Could not rename customer file: ${error.message}`);
    setEditingDeliverableId(null);
    setEditingDeliverableLabel("");
    toast.success("Customer-file label updated.");
    await loadDeliverables(deliverable.product_id);
  }

  async function persistDeliverableOrder(next: Deliverable[]) {
    if (!form.id || reorderingDeliverables) return;
    const normalised = next.map((item, index) => ({ ...item, position: index }));
    const previous = deliverables;
    setDeliverables(normalised);
    setReorderingDeliverables(true);
    try {
      for (let index = 0; index < normalised.length; index += 1) {
        const item = normalised[index];
        const { error } = await db.from("store_product_digital_deliverables").update({ position: index }).eq("id", item.id).eq("product_id", form.id);
        if (error) throw new Error(error.message);
      }
      toast.success("Customer-file order saved.");
    } catch (error) {
      setDeliverables(previous);
      toast.error(`Could not save customer-file order: ${error instanceof Error ? error.message : "Unknown error"}`);
      await loadDeliverables(form.id);
    } finally {
      setReorderingDeliverables(false);
    }
  }

  async function moveDeliverable(from: number, to: number) {
    const next = moveItem(deliverables, from, to);
    if (next === deliverables) return;
    await persistDeliverableOrder(next);
  }

  async function removeDeliverable(deliverable: Deliverable) {
    if (!window.confirm(`Remove ${deliverable.file_name} from this product?`)) return;
    const { error: rowError } = await db.from("store_product_digital_deliverables").delete().eq("id", deliverable.id);
    if (rowError) return toast.error(`Could not remove customer file: ${rowError.message}`);
    const { error: storageError } = await db.storage.from("store-digital-products").remove([deliverable.file_path]);
    if (storageError) toast.warning("File record removed, but the private storage object could not be deleted."); else toast.success("Customer file removed.");
    await loadDeliverables(deliverable.product_id);
  }

  function preflightInput() {
    return { productId: form.id ?? null, name: form.name, slug: slugify(form.slug || form.name), sku: form.sku, productType: form.product_type, fulfilmentModel: form.fulfilment_model, category: form.category, description: form.description, price: Number(form.price || 0), imageUrls: form.image_urls, digitalFilePath: form.digital_file_path, supplierName: form.supplier_name, supplierProductRef: form.supplier_product_ref, supplierUrl: form.supplier_url, affiliateUrl: form.affiliate_url, trackInventory: form.track_inventory, unlimitedStock: form.unlimited_stock, stockQuantity: Number(form.stock_quantity || 0) };
  }

  async function runPreflight() {
    setCheckingPreflight(true);
    try {
      const result = await runStoreProductPreflight(preflightInput());
      setPreflight(result);
      if (result.ready) toast.success("Publication preflight passed."); else toast.warning(preflightSummary(result));
      return result;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Publication preflight failed."); return null; }
    finally { setCheckingPreflight(false); }
  }

  async function saveProduct(nextStatus?: ProductStatus) {
    const name = form.name.trim();
    const slug = slugify(form.slug || form.name);
    const price = Number(form.price);
    const costPrice = Number(form.cost_price || 0);
    const compareAt = toNullableNumber(form.compare_at_price);
    const status = nextStatus ?? form.status;
    if (!name) return toast.error("Product name is required.");
    if (!slug) return toast.error("A valid product slug is required.");
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid selling price.");
    if (!Number.isFinite(costPrice) || costPrice < 0) return toast.error("Enter a valid cost price.");
    if (compareAt != null && compareAt < price) return toast.error("Compare-at price must be equal to or higher than the selling price.");
    if (status === "active" && readinessIssues.length > 0) return toast.error(`Complete before publishing: ${readinessIssues.join(", ")}.`);
    if (status === "active") { const result = await runPreflight(); if (!result?.ready) return; }
    setSaving(true);
    const payload = {
      name, slug, sku: form.sku.trim() || null, product_type: form.product_type, fulfilment_model: form.fulfilment_model, status,
      short_description: form.short_description.trim() || null, description: form.description.trim() || null, category: form.category.trim() || null,
      brand: form.brand.trim() || null, supplier_name: form.supplier_name.trim() || null, supplier_product_ref: form.supplier_product_ref.trim() || null,
      supplier_url: form.supplier_url.trim() || null, affiliate_url: form.affiliate_url.trim() || null, currency: "ZAR", cost_price: costPrice, price,
      compare_at_price: compareAt, track_inventory: tracksInventory ? form.track_inventory : false,
      stock_quantity: tracksInventory ? Math.max(0, Number(form.stock_quantity || 0)) : 0,
      unlimited_stock: tracksInventory ? form.unlimited_stock : form.product_type !== "physical",
      inventory_ownership: form.inventory_ownership, inventory_source_status: form.inventory_source_status,
      inventory_source_reference: form.inventory_source_reference.trim() || null, featured: form.featured, image_urls: form.image_urls,
      seo_title: form.seo_title.trim() || null, seo_description: form.seo_description.trim() || null,
      digital_file_path: form.product_type === "digital" ? form.digital_file_path || null : null,
      digital_file_name: form.product_type === "digital" ? form.digital_file_name || null : null,
      digital_download_limit: form.product_type === "digital" ? toNullableNumber(form.digital_download_limit) : null,
      digital_access_days: form.product_type === "digital" ? toNullableNumber(form.digital_access_days) : null,
      updated_at: new Date().toISOString(),
    };
    const operation = form.id ? db.from("store_products").update(payload).eq("id", form.id).select("*").single() : db.from("store_products").insert(payload).select("*").single();
    const { data, error } = await operation;
    setSaving(false);
    if (error) return toast.error(`Could not save product: ${error.message}`);
    const saved = data as StoreProduct;
    toast.success(status === "active" ? "Product published to Cossa Store." : "Product saved.");
    setForm(rowToForm(saved));
    setDeliverableUploadError(null);
    if (saved.product_type === "digital") await loadDeliverables(saved.id);
    await loadProducts();
  }

  async function archiveProduct(product: StoreProduct) {
    const { error } = await db.from("store_products").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", product.id);
    if (error) return toast.error(`Could not archive product: ${error.message}`);
    toast.success("Product archived and removed from the public Store.");
    if (form.id === product.id) update("status", "archived");
    await loadProducts();
  }

  async function deleteProduct(product: StoreProduct) {
    if (product.status === "active") return toast.error("Archive an active product before deleting it.");
    if (!window.confirm(`Permanently delete “${product.name}”? This cannot be undone.`)) return;
    const { error } = await db.from("store_products").delete().eq("id", product.id);
    if (error) return toast.error(`Could not delete product: ${error.message}`);
    toast.success("Product permanently deleted.");
    if (form.id === product.id) newProduct();
    await loadProducts();
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 pb-12">
      <section className="glass-card p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/businesses/store" className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Cossa Store</Link>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">Cossa Store control centre</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Product Manager</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Create, price, package, check and publish Cossa Store products from one workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void loadProducts()} disabled={loading}><RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button><Button onClick={() => newProduct()} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"><PackagePlus className="mr-1.5 h-4 w-4" /> Add product</Button></div>
        </div>
      </section>

      {portfolioIntel ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Critical alerts" value={portfolioIntel.critical_count ?? 0} /><Metric label="Warnings" value={portfolioIntel.warning_count ?? 0} /><Metric label="Stale supplier stock" value={portfolioIntel.stale_supplier_inventory ?? 0} /><Metric label="Negative margins" value={portfolioIntel.negative_margin_products ?? 0} /><Metric label="Digital files missing" value={portfolioIntel.active_digital_missing_file ?? 0} /></section> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-semibold">{form.id ? "Edit product" : "New product"}</h2><p className="mt-1 text-xs text-muted-foreground">One screen for product data, Store images, secure customer files and publication checks.</p></div>{form.id ? <Button variant="ghost" size="sm" onClick={() => newProduct()}><X className="mr-1 h-4 w-4" /> Close editor</Button> : null}</div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Product name" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(event) => { const name = event.target.value; setForm((current) => ({ ...current, name, slug: current.id || current.slug ? current.slug : slugify(name) })); setPreflight(null); }} placeholder="e.g. AI Workflow Automation for Small Business" /></Field>
            <Field label="Product type"><select className={inputClass} value={form.product_type} onChange={(event) => { const productType = event.target.value as ProductType; setForm((current) => ({ ...current, product_type: productType, fulfilment_model: defaultFulfilment(productType), category: productType === "digital" && !current.category ? "digital-products" : current.category, unlimited_stock: productType === "physical" ? current.unlimited_stock : true, track_inventory: productType === "physical" ? current.track_inventory : false })); setPreflight(null); }}>{PRODUCT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
            {form.product_type === "physical" ? <Field label="Fulfilment"><select className={inputClass} value={form.fulfilment_model} onChange={(event) => { const fulfilment = event.target.value as FulfilmentModel; setForm((current) => ({ ...current, fulfilment_model: fulfilment, track_inventory: fulfilment === "cossa_stock" ? current.track_inventory : false, unlimited_stock: fulfilment === "cossa_stock" ? current.unlimited_stock : false })); setPreflight(null); }}><option value="cossa_stock">Cossa-owned stock</option><option value="local_supplier">Local supplier</option></select></Field> : form.product_type === "dropshipping" ? <Field label="Dropshipping location"><select className={inputClass} value={form.fulfilment_model} onChange={(event) => update("fulfilment_model", event.target.value as FulfilmentModel)}><option value="local_dropshipping">South African / local supplier</option><option value="international_dropshipping">International supplier</option></select></Field> : <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">Fulfilment is set automatically for this product type.</div>}
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value as ProductStatus)}><option value="draft">Draft</option><option value="active">Active / published</option><option value="archived">Archived</option></select></Field>
            <Field label="Slug"><input className={inputClass} value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} placeholder="product-url-name" /></Field>
            <Field label="SKU"><div className="flex gap-2"><input className={inputClass} value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="COS-DIG-AI-020" /><Button type="button" variant="outline" onClick={() => void generateSku()} disabled={generatingSku}><Sparkles className="h-4 w-4" /><span className="sr-only">Generate SKU</span></Button></div></Field>
            <Field label="Category"><input className={inputClass} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="digital-products" /></Field>
            <Field label="Brand"><input className={inputClass} value={form.brand} onChange={(event) => update("brand", event.target.value)} placeholder="Cossa Store" /></Field>
            <Field label="Short description" className="sm:col-span-2"><textarea className={`${inputClass} min-h-20`} value={form.short_description} onChange={(event) => update("short_description", event.target.value)} placeholder="Short customer-facing value proposition" /></Field>
            <Field label="Full description" className="sm:col-span-2"><textarea className={`${inputClass} min-h-36`} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Explain what the customer receives, who it is for and the key benefits." /></Field>
          </div>

          <div className="mt-7 border-t border-border/60 pt-6"><h3 className="font-semibold">Pricing</h3><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Cost price (R)"><input className={inputClass} inputMode="decimal" value={form.cost_price} onChange={(event) => update("cost_price", event.target.value)} /></Field><Field label="Selling price (R)"><input className={inputClass} inputMode="decimal" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="199" /></Field><Field label="Compare-at price (R)"><input className={inputClass} inputMode="decimal" value={form.compare_at_price} onChange={(event) => update("compare_at_price", event.target.value)} placeholder="Optional" /></Field></div>{margin ? <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">Estimated gross margin: <strong>R{margin.amount.toFixed(2)}</strong> ({margin.percent.toFixed(1)}%)</div> : null}</div>

          {tracksInventory ? <div className="mt-7 border-t border-border/60 pt-6"><h3 className="font-semibold">Inventory</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Stock quantity"><input className={inputClass} inputMode="numeric" value={form.stock_quantity} onChange={(event) => update("stock_quantity", event.target.value)} /></Field><div className="flex flex-col justify-end gap-3 rounded-xl border border-border/60 p-3"><Toggle label="Track inventory" checked={form.track_inventory} onChange={(checked) => update("track_inventory", checked)} /><Toggle label="Unlimited stock" checked={form.unlimited_stock} onChange={(checked) => update("unlimited_stock", checked)} /></div></div></div> : null}

          <div className="mt-7 border-t border-border/60 pt-6">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Store images</h3><p className="mt-1 text-xs text-muted-foreground">Drag images into order. Image #1 is the Store main image.</p></div><label className="inline-flex cursor-pointer items-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5"><ImagePlus className="mr-1.5 h-4 w-4" />{uploadingImage ? "Uploading…" : "Upload image"}<input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProductImage(file); event.currentTarget.value = ""; }} /></label></div>
            {form.image_urls.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{form.image_urls.map((url, index) => <div key={`${url}-${index}`} draggable onDragStart={() => setDraggingImageIndex(index)} onDragEnd={() => setDraggingImageIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = draggingImageIndex; setDraggingImageIndex(null); if (from != null && from !== index) void moveImage(from, index); }} className={`relative overflow-hidden rounded-xl border bg-card ${draggingImageIndex === index ? "border-primary/70 opacity-70" : "border-border/60"}`}><img src={url} alt="" className="aspect-square w-full object-cover" /><div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-background/90 p-1 shadow"><GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" /><span className="px-1 text-[10px] font-semibold">#{index + 1}</span></div><button type="button" className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow" onClick={() => update("image_urls", form.image_urls.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove image from product"><X className="h-3.5 w-3.5" /></button><div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1"><div>{index === 0 ? <span className="rounded bg-background/90 px-2 py-1 text-[10px] font-medium">Main image</span> : null}</div><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => void moveImage(index, index - 1)} className="rounded bg-background/90 p-1.5 shadow disabled:opacity-40" aria-label="Move image earlier"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={index === form.image_urls.length - 1} onClick={() => void moveImage(index, index + 1)} className="rounded bg-background/90 p-1.5 shadow disabled:opacity-40" aria-label="Move image later"><ArrowDown className="h-3.5 w-3.5" /></button></div></div></div>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No Store image uploaded yet.</div>}
          </div>

          {form.product_type === "digital" ? <div className="mt-7 border-t border-border/60 pt-6"><div><h3 className="font-semibold">Digital customer package</h3><p className="mt-1 text-xs text-muted-foreground">Manage the primary ZIP and all extra customer PDFs/resources here. No need to leave Product Manager.</p></div><div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Primary secure ZIP / package</p><p className="mt-1 text-xs text-muted-foreground">Required for backward-compatible one-click delivery.</p></div><label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5"><Upload className="mr-1.5 h-4 w-4" />{uploadingDigital ? "Uploading…" : form.digital_file_path ? "Replace primary file" : "Upload primary file"}<input type="file" className="hidden" disabled={uploadingDigital} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDigitalFile(file); event.currentTarget.value = ""; }} /></label></div>{form.digital_file_path ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-background/60 p-3"><FileDown className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{form.digital_file_name || "Digital file"}</p><p className="truncate text-[11px] text-muted-foreground">Private storage: {form.digital_file_path}</p></div></div> : null}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Download limit"><input className={inputClass} inputMode="numeric" value={form.digital_download_limit} onChange={(event) => update("digital_download_limit", event.target.value)} placeholder="5" /></Field><Field label="Access period (days)"><input className={inputClass} inputMode="numeric" value={form.digital_access_days} onChange={(event) => update("digital_access_days", event.target.value)} placeholder="30" /></Field></div><div className="mt-5 rounded-2xl border border-border/70 p-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Extra customer files</p><p className="mt-1 text-xs text-muted-foreground">Rename or drag files into the exact customer download order. Position #1 appears first.</p></div></div>{!form.id ? <div className="mt-4 rounded-xl border border-dashed border-warning/50 bg-warning/5 p-4 text-xs text-muted-foreground">Save this product as a draft once. Extra file upload will unlock here on the same screen.</div> : <><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Optional label" className="sm:col-span-2"><input className={inputClass} value={deliverableLabel} onChange={(event) => setDeliverableLabel(event.target.value)} placeholder="e.g. Complete Course PDF" /></Field><Toggle label="Mark first upload as primary deliverable" checked={makeDeliverablePrimary} onChange={setMakeDeliverablePrimary} /><Toggle label="Show to customer after confirmed payment" checked={customerVisible} onChange={setCustomerVisible} /></div><label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 px-4 py-5 text-sm font-medium text-primary hover:bg-primary/5"><Upload className="mr-2 h-5 w-5" />{uploadingDeliverables ? "Uploading customer files…" : "Upload one or multiple customer files"}<input type="file" multiple className="hidden" disabled={uploadingDeliverables} accept=".zip,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,application/zip,application/pdf" onChange={(event) => { const files = event.target.files ? Array.from(event.target.files) : []; event.currentTarget.value = ""; if (files.length) void uploadCustomerFiles(files); }} /></label>{deliverableUploadError ? <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">Upload failed: {deliverableUploadError}</div> : null}</>}
            <div className="mt-5 space-y-2">{loadingDeliverables ? <div className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">Loading customer files…</div> : deliverables.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">No extra customer files attached yet.</div> : deliverables.map((item, index) => <article key={item.id} draggable={!reorderingDeliverables && editingDeliverableId !== item.id} onDragStart={() => setDraggingDeliverableId(item.id)} onDragEnd={() => setDraggingDeliverableId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = deliverables.findIndex((candidate) => candidate.id === draggingDeliverableId); setDraggingDeliverableId(null); if (from >= 0 && from !== index) void moveDeliverable(from, index); }} className={`rounded-xl border bg-card/40 p-3 ${draggingDeliverableId === item.id ? "border-primary/70 opacity-70" : "border-border/60"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><div className="flex shrink-0 items-start gap-1 pt-0.5"><GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" /><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">#{index + 1}</span></div><FileDown className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1">{editingDeliverableId === item.id ? <div className="flex flex-col gap-2 sm:flex-row"><input autoFocus className={`${inputClass} py-1.5`} value={editingDeliverableLabel} onChange={(event) => setEditingDeliverableLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveDeliverableLabel(item); } if (event.key === "Escape") { setEditingDeliverableId(null); setEditingDeliverableLabel(""); } }} /><div className="flex gap-1"><Button size="sm" type="button" onClick={() => void saveDeliverableLabel(item)}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button><Button size="sm" type="button" variant="outline" onClick={() => { setEditingDeliverableId(null); setEditingDeliverableLabel(""); }}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button></div></div> : <><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{item.label}</p>{item.is_primary ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Primary</span> : null}{item.is_customer_visible ? <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">Customer visible</span> : <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Hidden</span>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{item.file_name} · {formatBytes(item.file_size_bytes)}</p></>}</div></div><div className="flex flex-wrap gap-1.5">{editingDeliverableId !== item.id ? <Button size="sm" variant="outline" onClick={() => beginRenameDeliverable(item)}><Pencil className="mr-1 h-3.5 w-3.5" /> Rename</Button> : null}<Button size="sm" variant="outline" disabled={index === 0 || reorderingDeliverables} onClick={() => void moveDeliverable(index, index - 1)} aria-label="Move file earlier"><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" disabled={index === deliverables.length - 1 || reorderingDeliverables} onClick={() => void moveDeliverable(index, index + 1)} aria-label="Move file later"><ArrowDown className="h-3.5 w-3.5" /></Button>{!item.is_primary ? <Button size="sm" variant="outline" onClick={() => void setPrimaryDeliverable(item)}><Star className="mr-1 h-3.5 w-3.5" /> Primary</Button> : null}<Button size="sm" variant="outline" onClick={() => void toggleDeliverableVisibility(item)}>{item.is_customer_visible ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}{item.is_customer_visible ? "Hide" : "Show"}</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void removeDeliverable(item)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</Button></div></div></article>)}</div>
            </div><div className="mt-5 rounded-2xl border border-border/70 bg-muted/10 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h4 className="font-semibold">Customer package intelligence</h4></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><PackageCheck label="Primary ZIP attached" ok={Boolean(form.digital_file_path)} detail={form.digital_file_name || undefined} /><PackageCheck label={`${form.image_urls.length} Store image${form.image_urls.length === 1 ? "" : "s"} attached`} ok={form.image_urls.length > 0} /><PackageCheck label="Course PDF attached" ok={packageSignals.hasCoursePdf} optional /><PackageCheck label="START HERE attached" ok={packageSignals.hasStartHere} optional /><PackageCheck label="Workbook attached" ok={packageSignals.hasWorkbook} optional /><PackageCheck label={`${packageSignals.visibleFiles} customer-visible extra file${packageSignals.visibleFiles === 1 ? "" : "s"}`} ok={packageSignals.visibleFiles > 0} optional /></div></div></div> : null}

          {(form.product_type === "affiliate" || form.product_type === "dropshipping" || form.product_type === "pod") ? <div className="mt-7 border-t border-border/60 pt-6"><h3 className="font-semibold">Supplier / partner information</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Supplier / partner name"><input className={inputClass} value={form.supplier_name} onChange={(event) => update("supplier_name", event.target.value)} /></Field><Field label="Supplier product reference"><input className={inputClass} value={form.supplier_product_ref} onChange={(event) => update("supplier_product_ref", event.target.value)} /></Field><Field label="Supplier URL" className="sm:col-span-2"><input className={inputClass} type="url" value={form.supplier_url} onChange={(event) => update("supplier_url", event.target.value)} placeholder="https://" /></Field>{form.product_type === "affiliate" ? <Field label="Affiliate tracking URL" className="sm:col-span-2"><input className={inputClass} type="url" value={form.affiliate_url} onChange={(event) => update("affiliate_url", event.target.value)} placeholder="https://" /></Field> : null}</div></div> : null}

          <div className="mt-7 border-t border-border/60 pt-6"><h3 className="font-semibold">Inventory provenance</h3><p className="mt-1 max-w-2xl text-xs text-muted-foreground">A quantity is not proof that Cossa owns stock. Record who owns or fulfils it and how that information was checked.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Inventory ownership"><select className={inputClass} value={form.inventory_ownership} onChange={(event) => update("inventory_ownership", event.target.value as InventoryOwnership)}><option value="unknown">Unknown — not yet verified</option><option value="cossa_owned">Cossa-owned stock</option><option value="supplier_managed">Supplier-managed availability</option><option value="pod_managed">Print-on-demand provider</option><option value="affiliate_merchant">Affiliate merchant</option><option value="digital">Digital delivery</option><option value="not_applicable">Not applicable</option></select></Field><Field label="Source status"><select className={inputClass} value={form.inventory_source_status} onChange={(event) => update("inventory_source_status", event.target.value as InventorySourceStatus)}><option value="unknown">Unknown</option><option value="verified">Verified from a current source</option><option value="manual">Manually recorded</option><option value="stale">Source needs re-checking</option><option value="not_connected">No live source connected</option><option value="failed">Last source check failed</option></select></Field><Field label="Evidence or source reference" className="sm:col-span-2"><input className={inputClass} value={form.inventory_source_reference} onChange={(event) => update("inventory_source_reference", event.target.value)} placeholder="Supplier portal reference, stock count date, or approved internal record" /></Field></div></div>

          <div className="mt-7 border-t border-border/60 pt-6"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Search & merchandising</h3><Toggle label="Featured product" checked={form.featured} onChange={(checked) => update("featured", checked)} /></div><div className="mt-4 grid gap-4"><Field label="SEO title"><input className={inputClass} value={form.seo_title} onChange={(event) => update("seo_title", event.target.value)} placeholder="Optional; defaults to product name" /></Field><Field label="SEO description"><textarea className={`${inputClass} min-h-24`} value={form.seo_description} onChange={(event) => update("seo_description", event.target.value)} placeholder="Short search-engine description" /></Field></div></div>

          <section className={`mt-7 rounded-xl border p-4 ${readinessIssues.length || (preflight && !preflight.ready) ? "border-warning/50 bg-warning/5" : "border-primary/40 bg-primary/5"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Publication intelligence</h3><p className="mt-1 text-xs text-muted-foreground">Local checks plus the same server rules used by the production database.</p></div><Button type="button" size="sm" variant="outline" onClick={() => void runPreflight()} disabled={checkingPreflight}>{checkingPreflight ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1 h-3.5 w-3.5" />}Check now</Button></div>{readinessIssues.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{readinessIssues.map((issue) => <li key={issue}>Missing {issue}</li>)}</ul> : <p className="mt-3 text-sm text-primary">Basic product checks passed.</p>}{preflight ? <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-3 text-sm"><div className="flex items-center gap-2">{preflight.ready ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-warning" />}<strong>{preflight.ready ? "SAFE TO PUBLISH" : "HOLD — FIX ITEMS FIRST"}</strong></div>{preflight.issues.length ? <p className="mt-2 text-xs text-muted-foreground">Issues: {preflight.issues.join(", ")}</p> : null}{preflight.warnings.length ? <p className="mt-1 text-xs text-muted-foreground">Warnings: {preflight.warnings.join(" ")}</p> : null}{preflight.suggested_sku && preflight.suggested_sku !== form.sku ? <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs">Suggested SKU: <strong>{preflight.suggested_sku}</strong></span><Button type="button" size="sm" variant="outline" onClick={() => update("sku", preflight.suggested_sku || form.sku)}>Use suggested SKU</Button></div> : null}{form.product_type === "digital" ? <p className="mt-2 text-xs text-muted-foreground">Secure primary file: {preflight.digital_file_verified ? "Verified" : "Not verified"}</p> : null}</div> : null}</section>

          <div className="mt-7 flex flex-wrap gap-2 border-t border-border/60 pt-6"><Button variant="outline" onClick={() => void saveProduct("draft")} disabled={saving}><Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving…" : "Save draft"}</Button><Button onClick={() => void saveProduct("active")} disabled={saving || checkingPreflight} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"><ExternalLink className="mr-1.5 h-4 w-4" /> Publish to Store</Button></div>
        </div>

        <div className="glass-card h-fit p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Catalogue</h2><p className="mt-1 text-xs text-muted-foreground">{products.length} product{products.length === 1 ? "" : "s"} in the database.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" /></label><select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div><div className="mt-4 space-y-3">{loading ? <div className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">Loading catalogue…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No products match this view.</div> : filtered.map((product) => <article key={product.id} className="rounded-xl border border-border/60 bg-card/40 p-3"><div className="flex gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">{product.image_urls?.[0] ? <img src={product.image_urls[0]} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3><p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{product.product_type} · {product.status} · {product.inventory_ownership.replaceAll("_", " ")}</p></div><p className="shrink-0 text-sm font-semibold text-primary">R{Number(product.price).toFixed(2)}</p></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{product.sku || product.slug}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5"><Button size="sm" variant="outline" onClick={() => editProduct(product)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>{product.status !== "archived" ? <Button size="sm" variant="outline" onClick={() => void archiveProduct(product)}><Archive className="mr-1 h-3.5 w-3.5" /> Archive</Button> : null}{product.status !== "active" ? <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteProduct(product)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button> : null}</div></article>)}</div></div>
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" /><span>{label}</span></label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="glass-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function PackageCheck({ label, ok, detail, optional = false }: { label: string; ok: boolean; detail?: string; optional?: boolean }) {
  return <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/50 p-3">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<div><p className="text-xs font-medium">{label}</p>{detail ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p> : !ok && optional ? <p className="mt-0.5 text-[11px] text-muted-foreground">Not detected — add if this product includes it.</p> : null}</div></div>;
}
