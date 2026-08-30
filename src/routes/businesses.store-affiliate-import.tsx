import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Link2, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

export const Route = createFileRoute("/businesses/store-affiliate-import")({
  component: AffiliateSmartImport,
  head: () => ({
    meta: [
      { title: "Affiliate Smart Import — GROWTH" },
      {
        name: "description",
        content: "Paste an authorised affiliate product link and prepare a complete Cossa Store draft.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);
const inputClass =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

type ImportConfidence = "high" | "medium" | "low" | "unconfirmed";
type ImportTrace = { field: string; sourceLabel: string; confidence: ImportConfidence };
type ImportedVariant = {
  name: string;
  supplierVariantId: string | null;
  supplierSku: string | null;
  colour: string | null;
  size: string | null;
  supplierPrice: number | null;
  availability: "available" | "unavailable" | "preorder" | "unknown";
};
type ImportCandidate = {
  adapterKey: string;
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
  currency: string | null;
  stockStatus: "available" | "unavailable" | "preorder" | "unknown";
  stockAvailabilityText: string | null;
  importTrace: ImportTrace[];
  importStatus: "imported" | "partial" | "blocked" | "failed";
  fieldsRequiringConfirmation: string[];
  warnings: string[];
};

type Draft = {
  sourceUrl: string;
  affiliateUrl: string;
  merchant: string;
  name: string;
  sku: string;
  supplierProductRef: string;
  brand: string;
  category: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  imageUrls: string[];
  seoTitle: string;
  seoDescription: string;
  warnings: string[];
  fieldsRequiringConfirmation: string[];
  importTrace: ImportTrace[];
};

function cleanHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function merchantName(url: string) {
  const host = cleanHost(url);
  if (!host) return "Affiliate partner";
  const root = host.split(".")[0] ?? host;
  return root
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function merchantCode(url: string) {
  const host = cleanHost(url);
  const root = (host.split(".")[0] || "partner").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return root.slice(0, 8) || "PARTNER";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function internalSku(url: string, supplierRef: string | null) {
  const ref = (supplierRef || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-12);
  const fallback = Date.now().toString(36).toUpperCase();
  return `COS-AFF-${merchantCode(url)}-${ref || fallback}`.slice(0, 60);
}

function moneyValue(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? String(value) : "";
}

function AffiliateSmartImport() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<ImportCandidate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const validUrl = useMemo(() => {
    try {
      const parsed = new URL(sourceUrl.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, [sourceUrl]);

  async function analyse() {
    if (!validUrl) {
      toast.error("Paste a complete http or https product/affiliate URL first.");
      return;
    }

    setImporting(true);
    setCandidate(null);
    setDraft(null);
    try {
      const response = await fetch("/api/store-product-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sourceUrl: sourceUrl.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (ImportCandidate & { error?: string })
        | null;
      if (!response.ok || !payload || payload.error) {
        throw new Error(payload?.error || `Import failed with status ${response.status}.`);
      }

      const imported = payload as ImportCandidate;
      const merchant = merchantName(imported.sourceUrl || sourceUrl);
      const price = imported.supplierSalePrice ?? imported.supplierRrp ?? imported.supplierCost;
      const compareAt =
        imported.supplierRrp != null && price != null && imported.supplierRrp >= price
          ? imported.supplierRrp
          : null;
      const name = imported.title?.trim() || "";
      const description =
        imported.description?.trim() ||
        [imported.shortDescription, ...imported.features, ...imported.specifications]
          .filter(Boolean)
          .join("\n\n");

      setCandidate(imported);
      setDraft({
        sourceUrl: imported.sourceUrl || sourceUrl.trim(),
        affiliateUrl: sourceUrl.trim(),
        merchant,
        name,
        sku: internalSku(imported.sourceUrl || sourceUrl, imported.supplierProductRef),
        supplierProductRef: imported.supplierProductRef || "",
        brand: imported.brand || "",
        category: imported.supplierCategory || "",
        shortDescription: imported.shortDescription || "",
        description,
        price: moneyValue(price),
        compareAtPrice: moneyValue(compareAt),
        imageUrls: imported.imageUrls || [],
        seoTitle: name ? `${name} | Cossa Store` : "",
        seoDescription: (imported.shortDescription || description || "").slice(0, 160),
        warnings: imported.warnings || [],
        fieldsRequiringConfirmation: imported.fieldsRequiringConfirmation || [],
        importTrace: imported.importTrace || [],
      });
      toast.success("Product analysed. Review the draft before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyse this product link.");
    } finally {
      setImporting(false);
    }
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Product name is still missing.");
    if (!draft.affiliateUrl.trim()) return toast.error("Affiliate URL is required.");
    if (!draft.merchant.trim()) return toast.error("Affiliate partner/merchant is required.");
    if (!draft.imageUrls.length) return toast.error("At least one product image is required before saving.");

    const parsedPrice = Number(draft.price || 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return toast.error("Product price is invalid.");

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.name),
        sku: draft.sku.trim(),
        product_type: "affiliate",
        fulfilment_model: "affiliate",
        status: "draft",
        short_description: draft.shortDescription.trim() || null,
        description: draft.description.trim() || null,
        category: draft.category.trim() || null,
        brand: draft.brand.trim() || null,
        supplier_name: draft.merchant.trim(),
        supplier_product_ref: draft.supplierProductRef.trim() || null,
        supplier_url: draft.sourceUrl.trim(),
        affiliate_url: draft.affiliateUrl.trim(),
        currency: "ZAR",
        cost_price: 0,
        price: parsedPrice,
        compare_at_price: draft.compareAtPrice ? Number(draft.compareAtPrice) : null,
        track_inventory: false,
        stock_quantity: 0,
        unlimited_stock: true,
        inventory_ownership: "affiliate_merchant",
        inventory_source_status: candidate?.importStatus === "imported" ? "verified" : "manual",
        inventory_source_reference: draft.sourceUrl.trim(),
        featured: false,
        image_urls: draft.imageUrls,
        seo_title: draft.seoTitle.trim() || null,
        seo_description: draft.seoDescription.trim() || null,
        digital_file_path: null,
        digital_file_name: null,
        digital_download_limit: null,
        digital_access_days: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("store_products").insert(payload);
      if (error) throw error;
      toast.success("Affiliate product saved as a Cossa Store draft. It is not live yet.");
      setSourceUrl("");
      setCandidate(null);
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the affiliate draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 pb-12">
      <section className="glass-card p-5 sm:p-7">
        <Link
          to="/businesses/store"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Cossa Store
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Cossa Store affiliate engine
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Smart Affiliate Import</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Paste one authorised product or affiliate link. GROWTH extracts the available product data,
          prepares a Cossa Store draft and keeps the merchant as the checkout and fulfilment owner.
        </p>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Paste product link</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className={inputClass}
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !importing) void analyse();
            }}
            placeholder="https://www.temu.com/... or any approved affiliate product URL"
          />
          <Button
            onClick={() => void analyse()}
            disabled={!validUrl || importing}
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {importing ? "Analysing…" : "Analyse product"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 p-3"><ShieldCheck className="mb-2 h-4 w-4 text-primary" />Affiliate products never enter Cossa-owned stock.</div>
          <div className="rounded-xl border border-border/60 p-3"><CheckCircle2 className="mb-2 h-4 w-4 text-primary" />Imported products remain drafts until reviewed.</div>
          <div className="rounded-xl border border-border/60 p-3"><ExternalLink className="mb-2 h-4 w-4 text-primary" />Use the authorised tracking link supplied by the affiliate programme.</div>
        </div>
      </section>

      {draft ? (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Imported product draft</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Review anything the merchant page did not expose clearly. Saving here does not publish it.
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {candidate?.importStatus || "partial"}
            </span>
          </div>

          {(draft.warnings.length > 0 || draft.fieldsRequiringConfirmation.length > 0) && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              {draft.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
              {draft.fieldsRequiringConfirmation.length > 0 && (
                <p className="mt-2 font-medium">Confirm before publishing: {draft.fieldsRequiringConfirmation.join(", ")}.</p>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">Product name<input className={`${inputClass} mt-1.5`} value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} /></label>
            <label className="text-sm">Merchant / affiliate partner<input className={`${inputClass} mt-1.5`} value={draft.merchant} onChange={(e) => updateDraft("merchant", e.target.value)} /></label>
            <label className="text-sm">Cossa SKU<input className={`${inputClass} mt-1.5`} value={draft.sku} onChange={(e) => updateDraft("sku", e.target.value)} /></label>
            <label className="text-sm">Brand<input className={`${inputClass} mt-1.5`} value={draft.brand} onChange={(e) => updateDraft("brand", e.target.value)} /></label>
            <label className="text-sm">Category<input className={`${inputClass} mt-1.5`} value={draft.category} onChange={(e) => updateDraft("category", e.target.value)} /></label>
            <label className="text-sm">Current advertised price (ZAR)<input className={`${inputClass} mt-1.5`} type="number" min="0" step="0.01" value={draft.price} onChange={(e) => updateDraft("price", e.target.value)} /></label>
            <label className="text-sm">Compare-at price<input className={`${inputClass} mt-1.5`} type="number" min="0" step="0.01" value={draft.compareAtPrice} onChange={(e) => updateDraft("compareAtPrice", e.target.value)} /></label>
            <label className="sm:col-span-2 text-sm">Affiliate tracking URL<input className={`${inputClass} mt-1.5`} value={draft.affiliateUrl} onChange={(e) => updateDraft("affiliateUrl", e.target.value)} /></label>
            <label className="sm:col-span-2 text-sm">Short description<textarea className={`${inputClass} mt-1.5 min-h-20`} value={draft.shortDescription} onChange={(e) => updateDraft("shortDescription", e.target.value)} /></label>
            <label className="sm:col-span-2 text-sm">Description<textarea className={`${inputClass} mt-1.5 min-h-36`} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} /></label>
          </div>

          {draft.imageUrls.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium">Imported images ({draft.imageUrls.length})</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {draft.imageUrls.slice(0, 8).map((url) => (
                  <img key={url} src={url} alt="Imported product" className="aspect-square w-full rounded-xl border border-border/60 object-contain bg-background" />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => void saveDraft()} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save Cossa Store draft
            </Button>
            <Button variant="outline" asChild>
              <Link to="/businesses/store-products">Open Product Manager</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
