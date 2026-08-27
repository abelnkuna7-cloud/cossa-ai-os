import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ExternalLink,
  FileDown,
  ImagePlus,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

export const Route = createFileRoute("/businesses/store-products")({
  component: StoreProductManager,
  head: () => ({
    meta: [
      { title: "Store Products â€” GROWTH" },
      {
        name: "description",
        content: "Manage Cossa Store products, pricing, stock, images and digital files.",
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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

function defaultFulfilment(type: ProductType): FulfilmentModel {
  switch (type) {
    case "digital":
      return "digital";
    case "affiliate":
      return "affiliate";
    case "pod":
      return "print_on_demand";
    case "dropshipping":
      return "local_dropshipping";
    case "physical":
      return "cossa_stock";
  }
}

function publicationIssues(form: ProductForm): string[] {
  const issues: string[] = [];
  if (!form.category.trim()) issues.push("category");
  if (!form.description.trim()) issues.push("description");
  if (form.image_urls.length === 0) issues.push("product image");
  if (form.product_type !== "affiliate" && !form.sku.trim()) issues.push("SKU");
  if (form.product_type !== "affiliate" && Number(form.price) <= 0) issues.push("selling price");

  if (form.product_type === "digital" && !form.digital_file_path.trim())
    issues.push("digital file");
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
    if (!form.supplier_product_ref.trim() && !form.supplier_url.trim())
      issues.push("supplier reference or URL");
  }
  if (
    form.product_type === "physical" &&
    form.fulfilment_model === "cossa_stock" &&
    form.track_inventory &&
    !form.unlimited_stock &&
    Number(form.stock_quantity) <= 0
  ) {
    issues.push("available stock quantity");
  }
  return issues;
}

function rowToForm(row: StoreProduct): ProductForm {
  return {
    id: row.id,
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
    digital_download_limit:
      row.digital_download_limit == null ? "" : String(row.digital_download_limit),
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesSearch =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle) ||
        (product.sku ?? "").toLowerCase().includes(needle) ||
        (product.category ?? "").toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [products, query, statusFilter]);

  const margin = useMemo(() => {
    const price = Number(form.price || 0);
    const cost = Number(form.cost_price || 0);
    if (price <= 0) return null;
    return {
      amount: price - cost,
      percent: ((price - cost) / price) * 100,
    };
  }, [form.price, form.cost_price]);

  const readinessIssues = useMemo(() => publicationIssues(form), [form]);
  const tracksInventory =
    form.product_type === "physical" && form.fulfilment_model === "cossa_stock";

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await db
      .from("store_products")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error(`Could not load Store products: ${error.message}`);
      setProducts([]);
    } else {
      setProducts((data ?? []) as StoreProduct[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function newProduct(type: ProductType = "digital") {
    setForm({
      ...EMPTY_FORM,
      product_type: type,
      fulfilment_model: defaultFulfilment(type),
      category: type === "digital" ? "digital-products" : "",
      unlimited_stock: type !== "physical",
      track_inventory: type === "physical",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editProduct(product: StoreProduct) {
    setForm(rowToForm(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadProductImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large. Use a file under 8 MB.");
      return;
    }

    setUploadingImage(true);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await db.storage
      .from("store-product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
      toast.error(`Image upload failed: ${error.message}`);
      setUploadingImage(false);
      return;
    }

    const { data } = db.storage.from("store-product-images").getPublicUrl(path);
    update("image_urls", [...form.image_urls, data.publicUrl]);
    toast.success("Product image uploaded.");
    setUploadingImage(false);
  }

  async function uploadDigitalFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Digital file is too large. Use a file under 50 MB for now.");
      return;
    }

    setUploadingDigital(true);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await db.storage.from("store-digital-products").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (error) {
      toast.error(`Digital file upload failed: ${error.message}`);
      setUploadingDigital(false);
      return;
    }

    setForm((current) => ({
      ...current,
      digital_file_path: path,
      digital_file_name: file.name,
    }));
    toast.success("Digital product file uploaded securely.");
    setUploadingDigital(false);
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
    if (!Number.isFinite(costPrice) || costPrice < 0)
      return toast.error("Enter a valid cost price.");
    if (compareAt != null && compareAt < price) {
      return toast.error("Compare-at price must be equal to or higher than the selling price.");
    }
    if (status === "active" && readinessIssues.length > 0) {
      return toast.error(`Complete before publishing: ${readinessIssues.join(", ")}.`);
    }

    setSaving(true);

    const payload = {
      name,
      slug,
      sku: form.sku.trim() || null,
      product_type: form.product_type,
      fulfilment_model: form.fulfilment_model,
      status,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      supplier_name: form.supplier_name.trim() || null,
      supplier_product_ref: form.supplier_product_ref.trim() || null,
      supplier_url: form.supplier_url.trim() || null,
      affiliate_url: form.affiliate_url.trim() || null,
      currency: "ZAR",
      cost_price: costPrice,
      price,
      compare_at_price: compareAt,
      track_inventory: tracksInventory ? form.track_inventory : false,
      stock_quantity: tracksInventory ? Math.max(0, Number(form.stock_quantity || 0)) : 0,
      unlimited_stock: tracksInventory ? form.unlimited_stock : form.product_type !== "physical",
      inventory_ownership: form.inventory_ownership,
      inventory_source_status: form.inventory_source_status,
      inventory_source_reference: form.inventory_source_reference.trim() || null,
      featured: form.featured,
      image_urls: form.image_urls,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      digital_file_path: form.product_type === "digital" ? form.digital_file_path || null : null,
      digital_file_name: form.product_type === "digital" ? form.digital_file_name || null : null,
      digital_download_limit:
        form.product_type === "digital" ? toNullableNumber(form.digital_download_limit) : null,
      digital_access_days:
        form.product_type === "digital" ? toNullableNumber(form.digital_access_days) : null,
      updated_at: new Date().toISOString(),
    };

    const operation = form.id
      ? db.from("store_products").update(payload).eq("id", form.id).select("*").single()
      : db.from("store_products").insert(payload).select("*").single();

    const { data, error } = await operation;
    setSaving(false);

    if (error) {
      toast.error(`Could not save product: ${error.message}`);
      return;
    }

    toast.success(status === "active" ? "Product published to Cossa Store." : "Product saved.");
    setForm(rowToForm(data as StoreProduct));
    await loadProducts();
  }

  async function archiveProduct(product: StoreProduct) {
    const { error } = await db
      .from("store_products")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) return toast.error(`Could not archive product: ${error.message}`);
    toast.success("Product archived and removed from the public Store.");
    if (form.id === product.id) update("status", "archived");
    await loadProducts();
  }

  async function deleteProduct(product: StoreProduct) {
    if (product.status === "active") {
      toast.error("Archive an active product before deleting it.");
      return;
    }
    if (!window.confirm(`Permanently delete â€œ${product.name}â€? This cannot be undone.`)) return;

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
            <Link
              to="/businesses/store"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Cossa Store
            </Link>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Cossa Store control centre
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Product Manager</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Add, price, publish, archive and manage real Cossa Store products without editing code
              or opening Supabase.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadProducts()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={() => newProduct()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <PackagePlus className="mr-1.5 h-4 w-4" /> Add product
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {form.id ? "Edit product" : "New product"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Draft first, then publish when product data and files are complete.
              </p>
            </div>
            {form.id ? (
              <Button variant="ghost" size="sm" onClick={() => newProduct()}>
                <X className="mr-1 h-4 w-4" /> Close editor
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Product name" className="sm:col-span-2">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: current.id || current.slug ? current.slug : slugify(name),
                  }));
                }}
                placeholder="e.g. Small Business Quotation & Invoice Toolkit"
              />
            </Field>

            <Field label="Product type">
              <select
                className={inputClass}
                value={form.product_type}
                onChange={(event) => {
                  const productType = event.target.value as ProductType;
                  setForm((current) => ({
                    ...current,
                    product_type: productType,
                    fulfilment_model: defaultFulfilment(productType),
                    category:
                      productType === "digital" && !current.category
                        ? "digital-products"
                        : current.category,
                    unlimited_stock: productType === "physical" ? current.unlimited_stock : true,
                    track_inventory: productType === "physical" ? current.track_inventory : false,
                  }));
                }}
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            {form.product_type === "physical" ? (
              <Field label="Fulfilment">
                <select
                  className={inputClass}
                  value={form.fulfilment_model}
                  onChange={(event) => {
                    const fulfilment = event.target.value as FulfilmentModel;
                    setForm((current) => ({
                      ...current,
                      fulfilment_model: fulfilment,
                      track_inventory:
                        fulfilment === "cossa_stock" ? current.track_inventory : false,
                      unlimited_stock:
                        fulfilment === "cossa_stock" ? current.unlimited_stock : false,
                    }));
                  }}
                >
                  <option value="cossa_stock">Cossa-owned stock</option>
                  <option value="local_supplier">Local supplier</option>
                </select>
              </Field>
            ) : form.product_type === "dropshipping" ? (
              <Field label="Dropshipping location">
                <select
                  className={inputClass}
                  value={form.fulfilment_model}
                  onChange={(event) =>
                    update("fulfilment_model", event.target.value as FulfilmentModel)
                  }
                >
                  <option value="local_dropshipping">South African / local supplier</option>
                  <option value="international_dropshipping">International supplier</option>
                </select>
              </Field>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                Fulfilment is set automatically for this product type.
              </div>
            )}

            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(event) => update("status", event.target.value as ProductStatus)}
              >
                <option value="draft">Draft</option>
                <option value="active">Active / published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>

            <Field label="Slug">
              <input
                className={inputClass}
                value={form.slug}
                onChange={(event) => update("slug", slugify(event.target.value))}
                placeholder="product-url-name"
              />
            </Field>

            <Field label="SKU">
              <input
                className={inputClass}
                value={form.sku}
                onChange={(event) => update("sku", event.target.value)}
                placeholder="COS-DIG-001"
              />
            </Field>

            <Field label="Category">
              <input
                className={inputClass}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="digital-products"
              />
            </Field>

            <Field label="Brand">
              <input
                className={inputClass}
                value={form.brand}
                onChange={(event) => update("brand", event.target.value)}
                placeholder="Cossa Store"
              />
            </Field>

            <Field label="Short description" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-20`}
                value={form.short_description}
                onChange={(event) => update("short_description", event.target.value)}
                placeholder="Short customer-facing value proposition"
              />
            </Field>

            <Field label="Full description" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-36`}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Explain what the customer receives, who it is for and the key benefits."
              />
            </Field>
          </div>

          <div className="mt-7 border-t border-border/60 pt-6">
            <h3 className="font-semibold">Pricing</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Cost price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.cost_price}
                  onChange={(event) => update("cost_price", event.target.value)}
                />
              </Field>
              <Field label="Selling price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="199"
                />
              </Field>
              <Field label="Compare-at price (R)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.compare_at_price}
                  onChange={(event) => update("compare_at_price", event.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
            {margin ? (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                Estimated gross margin: <strong>R{margin.amount.toFixed(2)}</strong> (
                {margin.percent.toFixed(1)}%)
              </div>
            ) : null}
          </div>

          {tracksInventory ? (
            <div className="mt-7 border-t border-border/60 pt-6">
              <h3 className="font-semibold">Inventory</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Stock quantity">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.stock_quantity}
                    onChange={(event) => update("stock_quantity", event.target.value)}
                  />
                </Field>
                <div className="flex flex-col justify-end gap-3 rounded-xl border border-border/60 p-3">
                  <Toggle
                    label="Track inventory"
                    checked={form.track_inventory}
                    onChange={(checked) => update("track_inventory", checked)}
                  />
                  <Toggle
                    label="Unlimited stock"
                    checked={form.unlimited_stock}
                    onChange={(checked) => update("unlimited_stock", checked)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-7 border-t border-border/60 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Product images</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  The first image becomes the main Store image.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5">
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {uploadingImage ? "Uploadingâ€¦" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadProductImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {form.image_urls.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.image_urls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-border/60 bg-card"
                  >
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow"
                      onClick={() =>
                        update(
                          "image_urls",
                          form.image_urls.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label="Remove image from product"
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
              <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No product image uploaded yet.
              </div>
            )}
          </div>

          {form.product_type === "digital" ? (
            <div className="mt-7 border-t border-border/60 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Secure digital file</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored privately. Customers should receive access only after confirmed payment.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5">
                  <Upload className="mr-1.5 h-4 w-4" />
                  {uploadingDigital
                    ? "Uploadingâ€¦"
                    : form.digital_file_path
                      ? "Replace file"
                      : "Upload file"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingDigital}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadDigitalFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {form.digital_file_path ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <FileDown className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {form.digital_file_name || "Digital file"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Private storage: {form.digital_file_path}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Download limit">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.digital_download_limit}
                    onChange={(event) => update("digital_download_limit", event.target.value)}
                    placeholder="5"
                  />
                </Field>
                <Field label="Access period (days)">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.digital_access_days}
                    onChange={(event) => update("digital_access_days", event.target.value)}
                    placeholder="30"
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {form.product_type === "affiliate" ||
          form.product_type === "dropshipping" ||
          form.product_type === "pod" ? (
            <div className="mt-7 border-t border-border/60 pt-6">
              <h3 className="font-semibold">Supplier / partner information</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Supplier / partner name">
                  <input
                    className={inputClass}
                    value={form.supplier_name}
                    onChange={(event) => update("supplier_name", event.target.value)}
                  />
                </Field>
                <Field label="Supplier product reference">
                  <input
                    className={inputClass}
                    value={form.supplier_product_ref}
                    onChange={(event) => update("supplier_product_ref", event.target.value)}
                  />
                </Field>
                <Field label="Supplier URL" className="sm:col-span-2">
                  <input
                    className={inputClass}
                    type="url"
                    value={form.supplier_url}
                    onChange={(event) => update("supplier_url", event.target.value)}
                    placeholder="https://"
                  />
                </Field>
                {form.product_type === "affiliate" ? (
                  <Field label="Affiliate tracking URL" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      type="url"
                      value={form.affiliate_url}
                      onChange={(event) => update("affiliate_url", event.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-7 border-t border-border/60 pt-6">
            <h3 className="font-semibold">Inventory provenance</h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              A quantity is not proof that Cossa owns stock. Record who owns or fulfils it and how
              that information was checked. “Unknown” is kept visible until a real source is
              recorded.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Inventory ownership">
                <select
                  className={inputClass}
                  value={form.inventory_ownership}
                  onChange={(event) =>
                    update("inventory_ownership", event.target.value as InventoryOwnership)
                  }
                >
                  <option value="unknown">Unknown — not yet verified</option>
                  <option value="cossa_owned">Cossa-owned stock</option>
                  <option value="supplier_managed">Supplier-managed availability</option>
                  <option value="pod_managed">Print-on-demand provider</option>
                  <option value="affiliate_merchant">Affiliate merchant</option>
                  <option value="digital">Digital delivery</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </Field>
              <Field label="Source status">
                <select
                  className={inputClass}
                  value={form.inventory_source_status}
                  onChange={(event) =>
                    update("inventory_source_status", event.target.value as InventorySourceStatus)
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="verified">Verified from a current source</option>
                  <option value="manual">Manually recorded</option>
                  <option value="stale">Source needs re-checking</option>
                  <option value="not_connected">No live source connected</option>
                  <option value="failed">Last source check failed</option>
                </select>
              </Field>
              <Field label="Evidence or source reference" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={form.inventory_source_reference}
                  onChange={(event) => update("inventory_source_reference", event.target.value)}
                  placeholder="Supplier portal reference, stock count date, or approved internal record"
                />
              </Field>
            </div>
          </div>

          <div className="mt-7 border-t border-border/60 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Search & merchandising</h3>
              <Toggle
                label="Featured product"
                checked={form.featured}
                onChange={(checked) => update("featured", checked)}
              />
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="SEO title">
                <input
                  className={inputClass}
                  value={form.seo_title}
                  onChange={(event) => update("seo_title", event.target.value)}
                  placeholder="Optional; defaults to product name"
                />
              </Field>
              <Field label="SEO description">
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={form.seo_description}
                  onChange={(event) => update("seo_description", event.target.value)}
                  placeholder="Short search-engine description"
                />
              </Field>
            </div>
          </div>

          <section
            className={`mt-7 rounded-xl border p-4 ${readinessIssues.length ? "border-warning/50 bg-warning/5" : "border-primary/40 bg-primary/5"}`}
          >
            <h3 className="font-semibold">Publication readiness</h3>
            {readinessIssues.length ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep this product as a draft until every item is completed.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {readinessIssues.map((issue) => (
                    <li key={issue}>Missing {issue}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                This product is ready for the publication checks enforced by the database.
              </p>
            )}
          </section>

          <div className="mt-7 flex flex-wrap gap-2 border-t border-border/60 pt-6">
            <Button variant="outline" onClick={() => void saveProduct("draft")} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" /> {saving ? "Savingâ€¦" : "Save draft"}
            </Button>
            <Button
              onClick={() => void saveProduct("active")}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" /> Publish to Store
            </Button>
          </div>
        </div>

        <div className="glass-card h-fit p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Catalogue</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {products.length} product{products.length === 1 ? "" : "s"} in the database.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputClass} pl-9`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search productsâ€¦"
              />
            </label>
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
                Loading catalogueâ€¦
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No products match this view.
              </div>
            ) : (
              filtered.map((product) => (
                <article
                  key={product.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-3"
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                      {product.image_urls?.[0] ? (
                        <img
                          src={product.image_urls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {product.product_type} Â· {product.status} Â·{" "}
                            {product.inventory_ownership.replaceAll("_", " ")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-primary">
                          R{Number(product.price).toFixed(2)}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {product.sku || product.slug}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => editProduct(product)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    {product.status !== "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void archiveProduct(product)}
                      >
                        <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                      </Button>
                    ) : null}
                    {product.status !== "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void deleteProduct(product)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
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
