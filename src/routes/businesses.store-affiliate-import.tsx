import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  PlayCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

export const Route = createFileRoute("/businesses/store-affiliate-import")({
  component: AffiliateSmartImport,
  head: () => ({
    meta: [
      { title: "Smart Affiliate Import — GROWTH" },
      {
        name: "description",
        content:
          "Paste an authorised affiliate product link and let GROWTH prepare a complete Cossa Store draft from the merchant page.",
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
  videoUrls: string[];
  mediaWarnings: string[];
  retrievalMethod?: "direct" | "rendered";
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
  videoUrls: string[];
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
  const [importError, setImportError] = useState<string | null>(null);
  const [lastImportedUrl, setLastImportedUrl] = useState("");
  const autoTimer = useRef<number | null>(null);

  const validUrl = useMemo(() => {
    try {
      const parsed = new URL(sourceUrl.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, [sourceUrl]);

  async function analyse(targetUrl = sourceUrl.trim()) {
    if (!targetUrl) return;
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      setImportError("Paste a complete http or https affiliate product URL first.");
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setImportError("Paste a complete http or https affiliate product URL first.");
      return;
    }

    // Mark the URL as attempted before the request starts. This prevents the auto-import
    // effect from retrying the same failed URL every time `importing` returns to false.
    // A manual click on Smart import can still retry the same URL after configuration changes.
    setLastImportedUrl(targetUrl);
    setImporting(true);
    setCandidate(null);
    setDraft(null);
    setImportError(null);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Your GROWTH session has expired. Sign in again, then retry Smart Import.");
      }

      const response = await fetch("/api/store-affiliate-smart-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({ sourceUrl: targetUrl }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (ImportCandidate & { error?: string; code?: string })
        | null;
      if (!response.ok || !payload || payload.error) {
        const message = payload?.error || `Import failed with status ${response.status}.`;
        throw new Error(message);
      }

      const imported = payload as ImportCandidate;
      const merchant = merchantName(imported.sourceUrl || targetUrl);
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
        sourceUrl: imported.sourceUrl || targetUrl,
        affiliateUrl: targetUrl,
        merchant,
        name,
        sku: internalSku(imported.sourceUrl || targetUrl, imported.supplierProductRef),
        supplierProductRef: imported.supplierProductRef || "",
        brand: imported.brand || "",
        category: imported.supplierCategory || "",
        shortDescription: imported.shortDescription || "",
        description,
        price: moneyValue(price),
        compareAtPrice: moneyValue(compareAt),
        imageUrls: imported.imageUrls || [],
        videoUrls: imported.videoUrls || [],
        seoTitle: name ? `${name} | Cossa Store` : "",
        seoDescription: (imported.shortDescription || description || "").slice(0, 160),
        warnings: [...(imported.warnings || []), ...(imported.mediaWarnings || [])],
        fieldsRequiringConfirmation: imported.fieldsRequiringConfirmation || [],
        importTrace: imported.importTrace || [],
      });
      toast.success(
        `Product analysed: ${imported.imageUrls?.length ?? 0} image(s), ${imported.videoUrls?.length ?? 0} video(s).`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not analyse this product link.";
      setImportError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    if (autoTimer.current != null) window.clearTimeout(autoTimer.current);
    const targetUrl = sourceUrl.trim();
    if (!validUrl || importing || targetUrl === lastImportedUrl) return;
    autoTimer.current = window.setTimeout(() => {
      void analyse(targetUrl);
    }, 700);
    return () => {
      if (autoTimer.current != null) window.clearTimeout(autoTimer.current);
    };
  }, [sourceUrl, validUrl, importing, lastImportedUrl]);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function removeImage(index: number) {
    setDraft((current) => {
      if (!current) return current;
      const nextImages = current.imageUrls.filter((_, imageIndex) => imageIndex !== index);
      return { ...current, imageUrls: nextImages };
    });
    toast.success("Image removed from this Cossa Store draft.");
  }

  async function saveMediaRegistry(productId: string, current: Draft) {
    const rows = [
      ...current.imageUrls.map((url, index) => ({
        store_product_id: productId,
        media_type: "image",
        source_url: url,
        position: index,
        source_kind: "affiliate_import",
      })),
      ...current.videoUrls.map((url, index) => ({
        store_product_id: productId,
        media_type: "video",
        source_url: url,
        position: index,
        source_kind: "affiliate_import",
      })),
    ];
    if (!rows.length) return true;
    const { error } = await db.from("store_product_media").insert(rows);
    if (error) {
      console.warn("Affiliate media registry unavailable:", error.message);
      return false;
    }
    return true;
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Product name is still missing.");
    if (!draft.affiliateUrl.trim()) return toast.error("Affiliate URL is required.");
    if (!draft.merchant.trim()) return toast.error("Affiliate partner/merchant is required.");
    if (!draft.imageUrls.length)
      return toast.error("At least one product image is required before saving.");

    const parsedPrice = Number(draft.price || 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0)
      return toast.error("Product price is invalid.");

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

      const { data, error } = await db.from("store_products").insert(payload).select("id").single();
      if (error) throw error;

      const mediaSaved = await saveMediaRegistry(String(data.id), draft);
      if (mediaSaved) {
        toast.success("Affiliate product and imported media saved as a Cossa Store draft.");
      } else {
        toast.warning(
          "Product draft saved. The media registry migration still needs to be applied before videos can be retained permanently.",
        );
      }
      setSourceUrl("");
      setLastImportedUrl("");
      setCandidate(null);
      setDraft(null);
      setImportError(null);
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
        <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
          Paste one authorised affiliate product link. GROWTH starts automatically and reads the
          merchant page for the product name, advertised price, brand, merchant product ID/SKU when
          exposed, category, descriptions, variants, product images and accessible product videos.
        </p>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Paste affiliate product link</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          No extra form is required. Paste a complete product URL and Smart Import starts after a short delay.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className={inputClass}
            value={sourceUrl}
            onChange={(event) => {
              setSourceUrl(event.target.value);
              setImportError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !importing) void analyse(sourceUrl.trim());
            }}
            placeholder="https://www.temu.com/... or another approved affiliate product URL"
          />
          <Button
            onClick={() => void analyse(sourceUrl.trim())}
            disabled={!validUrl || importing}
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {importing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {importing ? "Reading product…" : "Smart import"}
          </Button>
        </div>

        {importing ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>GROWTH is reading the merchant page and collecting product data and media…</span>
          </div>
        ) : null}

        {importError ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Smart Import could not complete this product.</p>
              <p className="mt-1">{importError}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 p-3">
            <ShieldCheck className="mb-2 h-4 w-4 text-primary" />
            Affiliate products never enter Cossa-owned stock or dropshipping fulfilment.
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <ImageIcon className="mb-2 h-4 w-4 text-primary" />
            Imported images can be reviewed and removed before the Cossa Store draft is saved.
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <PlayCircle className="mb-2 h-4 w-4 text-primary" />
            Product video URLs are captured when the merchant exposes them to the page reader.
          </div>
        </div>
      </section>

      {draft ? (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Imported affiliate draft</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                GROWTH filled what the merchant exposed. Review flagged fields before publication.
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {candidate?.importStatus || "partial"}
              {candidate?.retrievalMethod ? ` · ${candidate.retrievalMethod}` : ""}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Stat label="Images" value={draft.imageUrls.length} />
            <Stat label="Videos" value={draft.videoUrls.length} />
            <Stat label="Variants" value={candidate?.variants?.length ?? 0} />
            <Stat label="Product ID/SKU" value={draft.supplierProductRef ? 1 : 0} />
          </div>

          {(draft.warnings.length > 0 || draft.fieldsRequiringConfirmation.length > 0) && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              {draft.warnings.map((warning) => (
                <p key={warning}>• {warning}</p>
              ))}
              {draft.fieldsRequiringConfirmation.length > 0 && (
                <p className="mt-2 font-medium">
                  Confirm before publishing: {draft.fieldsRequiringConfirmation.join(", ")}.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Product name" span>
              <input className={inputClass} value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
            </Field>
            <Field label="Merchant / affiliate partner">
              <input className={inputClass} value={draft.merchant} onChange={(e) => updateDraft("merchant", e.target.value)} />
            </Field>
            <Field label="Cossa SKU">
              <input className={inputClass} value={draft.sku} onChange={(e) => updateDraft("sku", e.target.value)} />
            </Field>
            <Field label="Merchant product ID / SKU">
              <input className={inputClass} value={draft.supplierProductRef} onChange={(e) => updateDraft("supplierProductRef", e.target.value)} />
            </Field>
            <Field label="Brand">
              <input className={inputClass} value={draft.brand} onChange={(e) => updateDraft("brand", e.target.value)} />
            </Field>
            <Field label="Category">
              <input className={inputClass} value={draft.category} onChange={(e) => updateDraft("category", e.target.value)} />
            </Field>
            <Field label="Current advertised price (ZAR)">
              <input className={inputClass} type="number" min="0" step="0.01" value={draft.price} onChange={(e) => updateDraft("price", e.target.value)} />
            </Field>
            <Field label="Compare-at price">
              <input className={inputClass} type="number" min="0" step="0.01" value={draft.compareAtPrice} onChange={(e) => updateDraft("compareAtPrice", e.target.value)} />
            </Field>
            <Field label="Affiliate tracking URL" span>
              <input className={inputClass} value={draft.affiliateUrl} onChange={(e) => updateDraft("affiliateUrl", e.target.value)} />
            </Field>
            <Field label="Short description" span>
              <textarea className={`${inputClass} min-h-20`} value={draft.shortDescription} onChange={(e) => updateDraft("shortDescription", e.target.value)} />
            </Field>
            <Field label="Description" span>
              <textarea className={`${inputClass} min-h-36`} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} />
            </Field>
          </div>

          {candidate?.variants?.length ? (
            <div className="mt-5">
              <p className="text-sm font-medium">Imported variants ({candidate.variants.length})</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {candidate.variants.map((variant, index) => (
                  <div key={`${variant.supplierVariantId || variant.supplierSku || variant.name}-${index}`} className="rounded-xl border border-border/60 p-3 text-xs">
                    <p className="font-medium">{variant.name}</p>
                    <p className="mt-1 text-muted-foreground">SKU: {variant.supplierSku || "not exposed"} · {variant.availability}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {draft.imageUrls.length > 0 ? (
            <div className="mt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">Imported product images ({draft.imageUrls.length})</p>
                <p className="text-xs text-muted-foreground">Remove anything you do not want displayed before saving.</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {draft.imageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-border/60 bg-background">
                    <img src={url} alt={`Imported product ${index + 1}`} className="aspect-square w-full object-contain" />
                    <span className="absolute bottom-2 right-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px]">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-background/95 px-2 py-1.5 text-[11px] font-medium text-destructive shadow-sm transition hover:bg-destructive hover:text-destructive-foreground"
                      aria-label={`Remove imported image ${index + 1}`}
                      title="Remove this image from the draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              All imported images were removed. Keep at least one genuine product image before saving the draft.
            </div>
          )}

          {draft.videoUrls.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-medium">Imported product videos ({draft.videoUrls.length})</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {draft.videoUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="rounded-xl border border-border/60 p-3">
                    <video controls preload="metadata" className="w-full rounded-lg bg-black" src={url}>
                      Your browser does not support this product video.
                    </video>
                    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary hover:underline">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open source video
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => void saveDraft()} disabled={saving || draft.imageUrls.length === 0} className="bg-primary text-primary-foreground hover:bg-primary/90">
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

function Field({ label, span = false, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={`${span ? "sm:col-span-2 " : ""}text-sm`}>
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
