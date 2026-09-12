import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, PackageOpen, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

export const Route = createFileRoute("/businesses/store-product-files")({
  component: StoreProductFilesManager,
  head: () => ({
    meta: [
      { title: "Digital Deliverables - Cossa Store" },
      {
        name: "description",
        content: "Manage multiple secure customer files for Cossa Store digital products.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);
const inputClass =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

type DigitalProduct = {
  id: string;
  organisation_id: string;
  name: string;
  sku: string | null;
  status: "draft" | "active" | "archived";
  digital_file_name: string | null;
  digital_file_path: string | null;
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

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

function formatBytes(value: number | null) {
  if (!value || value < 1) return "Size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function StoreProductFilesManager() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [customerVisible, setCustomerVisible] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId],
  );

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await db
      .from("store_products")
      .select("id, organisation_id, name, sku, status, digital_file_name, digital_file_path")
      .eq("product_type", "digital")
      .neq("status", "archived")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error(`Could not load digital products: ${error.message}`);
      setProducts([]);
    } else {
      const rows = (data ?? []) as DigitalProduct[];
      setProducts(rows);
      setProductId((current) => current || rows[0]?.id || "");
    }
    setLoading(false);
  }

  async function loadDeliverables(nextProductId = productId) {
    if (!nextProductId) {
      setDeliverables([]);
      return;
    }
    setLoadingFiles(true);
    const { data, error } = await db
      .from("store_product_digital_deliverables")
      .select("*")
      .eq("product_id", nextProductId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(`Could not load customer files: ${error.message}`);
      setDeliverables([]);
    } else {
      setDeliverables((data ?? []) as Deliverable[]);
    }
    setLoadingFiles(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    void loadDeliverables(productId);
  }, [productId]);

  async function uploadFiles(files: FileList | File[]) {
    if (!selectedProduct) return toast.error("Select a digital product first.");
    const items = Array.from(files);
    if (!items.length) return;
    const oversized = items.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) return toast.error(`${oversized.name} is over the 50 MB file limit.`);

    setUploading(true);
    try {
      let nextPosition = deliverables.length
        ? Math.max(...deliverables.map((item) => item.position)) + 1
        : 0;
      let primaryRequested = makePrimary;

      for (const file of items) {
        const path = `${new Date().toISOString().slice(0, 10)}/${selectedProduct.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage.from("store-digital-products").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (uploadError) throw uploadError;

        if (primaryRequested) {
          const { error: clearPrimaryError } = await db
            .from("store_product_digital_deliverables")
            .update({ is_primary: false })
            .eq("product_id", selectedProduct.id)
            .eq("is_primary", true);
          if (clearPrimaryError) throw clearPrimaryError;
        }

        const { error: insertError } = await db.from("store_product_digital_deliverables").insert({
          product_id: selectedProduct.id,
          organisation_id: selectedProduct.organisation_id,
          label: label.trim() || file.name.replace(/\.[^.]+$/, ""),
          file_name: file.name,
          file_path: path,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          position: nextPosition,
          is_primary: primaryRequested,
          is_customer_visible: customerVisible,
        });
        if (insertError) throw insertError;

        nextPosition += 1;
        primaryRequested = false;
      }

      toast.success(`${items.length} customer file${items.length === 1 ? "" : "s"} uploaded securely.`);
      setLabel("");
      setMakePrimary(false);
      await loadDeliverables(selectedProduct.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      toast.error(`Customer-file upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(deliverable: Deliverable) {
    if (!selectedProduct) return;
    const { error: clearError } = await db
      .from("store_product_digital_deliverables")
      .update({ is_primary: false })
      .eq("product_id", selectedProduct.id)
      .eq("is_primary", true);
    if (clearError) return toast.error(`Could not change primary file: ${clearError.message}`);

    const { error } = await db
      .from("store_product_digital_deliverables")
      .update({ is_primary: true })
      .eq("id", deliverable.id);
    if (error) return toast.error(`Could not change primary file: ${error.message}`);

    toast.success("Primary customer file updated.");
    await loadDeliverables(selectedProduct.id);
  }

  async function toggleVisibility(deliverable: Deliverable) {
    const { error } = await db
      .from("store_product_digital_deliverables")
      .update({ is_customer_visible: !deliverable.is_customer_visible })
      .eq("id", deliverable.id);
    if (error) return toast.error(`Could not update file visibility: ${error.message}`);
    await loadDeliverables(deliverable.product_id);
  }

  async function removeDeliverable(deliverable: Deliverable) {
    if (!window.confirm(`Remove ${deliverable.file_name} from this product?`)) return;

    const { error: rowError } = await db
      .from("store_product_digital_deliverables")
      .delete()
      .eq("id", deliverable.id);
    if (rowError) return toast.error(`Could not remove customer file: ${rowError.message}`);

    const { error: storageError } = await db.storage
      .from("store-digital-products")
      .remove([deliverable.file_path]);
    if (storageError) {
      toast.warning("File record removed, but the private storage object could not be deleted.");
    } else {
      toast.success("Customer file removed.");
    }
    await loadDeliverables(deliverable.product_id);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-12">
      <section className="glass-card p-5 sm:p-7">
        <Link
          to="/businesses/store-products"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Product Manager
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Cossa Store control centre
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Digital Deliverables</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Attach multiple private customer files to a digital product. The existing primary ZIP remains backward-compatible while PDFs, workbooks, templates and other resources can be managed individually.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadProducts()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Digital product</span>
            <select
              className={inputClass}
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={loading}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku ? `${product.sku} - ` : ""}{product.name} ({product.status})
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {selectedProduct?.digital_file_path
              ? `Primary package: ${selectedProduct.digital_file_name || "secure file"}`
              : "Primary package not uploaded yet"}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <PackageOpen className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Customer delivery package</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep the ZIP in Product Manager as the primary one-click package. Use this area for the individual course PDF, START HERE, workbook, templates or other customer resources.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Optional label</span>
            <input
              className={inputClass}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Complete course PDF (leave blank to use file name)"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={makePrimary}
              onChange={(event) => setMakePrimary(event.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Mark first uploaded file as primary deliverable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={customerVisible}
              onChange={(event) => setCustomerVisible(event.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Show to customer after confirmed payment
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 px-4 py-6 text-sm font-medium text-primary hover:bg-primary/5">
          <Upload className="mr-2 h-5 w-5" />
          {uploading ? "Uploading customer files..." : "Upload one or multiple customer files"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading || !selectedProduct}
            accept=".zip,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,application/zip,application/pdf"
            onChange={(event) => {
              const files = event.target.files;
              if (files?.length) void uploadFiles(files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Attached customer files</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {deliverables.length} additional deliverable{deliverables.length === 1 ? "" : "s"} for this product.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loadingFiles ? (
            <div className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">Loading files...</div>
          ) : deliverables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No additional customer files attached yet.
            </div>
          ) : (
            deliverables.map((item) => (
              <article key={item.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <FileDown className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{item.label}</p>
                        {item.is_primary ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Primary</span>
                        ) : null}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${item.is_customer_visible ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>
                          {item.is_customer_visible ? "Customer visible" : "Internal only"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.file_name} - {formatBytes(item.file_size_bytes)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.is_primary ? (
                      <Button size="sm" variant="outline" onClick={() => void setPrimary(item)}>
                        <Star className="mr-1 h-3.5 w-3.5" /> Make primary
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => void toggleVisibility(item)}>
                      {item.is_customer_visible ? "Make internal" : "Show to customer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void removeDeliverable(item)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
