import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  PackageSearch,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

export const Route = createFileRoute("/businesses/store-supplier-csv")({
  component: SupplierCsvIntaker,
  head: () => ({
    meta: [
      { title: "Astrum CSV Stock Intaker — GROWTH" },
      {
        name: "description",
        content:
          "Preview and safely intake Astrum supplier stock from CSV into the internal Cossa Store review workflow.",
      },
    ],
  }),
});

const db = asDynamicSupabaseClient(supabase);

type Supplier = {
  id: string;
  code: string;
  name: string;
  status: string;
  registry_status: string | null;
  verification_status: string | null;
  source_url: string | null;
};

type Counts = {
  sourceRows: number;
  acceptedRows: number;
  rejectedRows: number;
  newSkus: number;
  updatedSkus: number;
  unchangedSkus: number;
  availableSkus: number;
  unavailableSkus: number;
  supplierAvailableUnits: number;
  stockChanges: number;
  costChanges: number;
  rrpChanges: number;
  newlyUnavailable: number;
  backInStock: number;
  missingFromSource: number;
};

type PreviewItem = {
  sku: string;
  name: string;
  stockStatus: "available" | "unavailable";
  category: string;
};

type PreviewResult = {
  dryRun: true;
  contentHash: string;
  counts: Counts;
  preview: PreviewItem[];
};

type ImportResult = {
  batchId: string;
  idempotent: boolean;
  status: string;
};

function SupplierCsvIntaker() {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState(true);
  const [fileName, setFileName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceObservedAt, setSourceObservedAt] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readySupplier =
    supplier?.code === "astrum" &&
    supplier.status === "active" &&
    supplier.registry_status === "active" &&
    supplier.verification_status === "VERIFIED";

  const expectedSnapshot = useMemo(
    () =>
      preview
        ? preview.counts.sourceRows === 699 &&
          preview.counts.acceptedRows === 675 &&
          preview.counts.rejectedRows === 24 &&
          preview.counts.availableSkus === 542 &&
          preview.counts.unavailableSkus === 133 &&
          preview.counts.supplierAvailableUnits === 36012
        : false,
    [preview],
  );

  useEffect(() => {
    void loadAstrum();
  }, []);

  async function loadAstrum() {
    setLoadingSupplier(true);
    const { data, error: supplierError } = await db
      .from<Supplier>("store_suppliers")
      .select("id,code,name,status,registry_status,verification_status,source_url")
      .eq("code", "astrum")
      .maybeSingle();
    setLoadingSupplier(false);
    if (supplierError || !data) {
      const message = supplierError?.message ?? "Astrum is not present in the Supplier Registry.";
      setError(message);
      return;
    }
    setSupplier(data);
  }

  async function authorisedRequest(confirmWrite: boolean) {
    if (!supplier || !sourceText || !fileName) throw new Error("Choose the Astrum CSV first.");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token)
      throw new Error("Your GROWTH session has expired. Sign in again and retry.");

    const response = await fetch("/api/store-supplier-catalogue-import", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        supplierId: supplier.id,
        sourceType: "csv",
        sourceFileName: fileName,
        sourceUrl: supplier.source_url || "https://www.astrum.co.za/",
        sourceObservedAt,
        sourceText,
        confirmWrite,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | PreviewResult
      | ImportResult
      | { error?: string }
      | null;
    if (!response.ok || !payload || "error" in payload)
      throw new Error(
        (payload && "error" in payload && payload.error) ||
          `Astrum CSV request failed with status ${response.status}.`,
      );
    return payload;
  }

  async function chooseFile(file: File | null) {
    setPreview(null);
    setResult(null);
    setError(null);
    if (!file) {
      setFileName("");
      setSourceText("");
      setSourceObservedAt("");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose the Astrum .csv catalogue file, not XLSX or another format.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("CSV is too large for this controlled intake. Use a file under 5 MB.");
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setError("The selected CSV is empty.");
      return;
    }
    setFileName(file.name);
    setSourceText(text);
    setSourceObservedAt(new Date(file.lastModified || Date.now()).toISOString());
    toast.success("Astrum CSV loaded locally. No production data has been changed.");
  }

  async function runPreview() {
    if (!readySupplier) {
      setError("Astrum must remain ACTIVE and VERIFIED before stock intake can continue.");
      return;
    }
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const payload = await authorisedRequest(false);
      if (!("dryRun" in payload) || payload.dryRun !== true)
        throw new Error("The server did not return a dry-run preview.");
      setPreview(payload);
      toast.success("CSV validated. This was preview-only; nothing was imported.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Astrum CSV preview failed.";
      setError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    if (!window.confirm(
      `Import ${preview.counts.acceptedRows} Astrum supplier records into internal review? This will not publish products, set Cossa selling prices, or create Cossa-owned stock.`,
    )) return;
    setWorking(true);
    setError(null);
    try {
      const payload = await authorisedRequest(true);
      if (!("batchId" in payload)) throw new Error("The server did not return an import batch.");
      setResult(payload);
      toast.success(
        payload.idempotent
          ? "This exact Astrum CSV was already imported; no duplicate batch was created."
          : "Astrum supplier catalogue imported into internal review.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Astrum CSV import failed.";
      setError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/businesses/store-inventory"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Store Operations Book
          </Link>
          <h1 className="text-2xl font-semibold">Astrum Smart CSV Stock Intaker</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Controlled supplier-stock intake: preview first, explicit confirmation second, internal review only.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm">
          {loadingSupplier ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking Astrum</span>
          ) : readySupplier ? (
            <span className="inline-flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Astrum ACTIVE · VERIFIED</span>
          ) : (
            <span className="inline-flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Astrum not ready</span>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="font-semibold">Safety boundary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Supplier stock stays supplier-owned. Cost and supplier RRP stay internal. This tool does not set Cossa selling prices, create Cossa on-hand stock, or publish products.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <h2 className="font-semibold">1. Load Astrum CSV</h2>
          </div>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center hover:bg-muted/30">
            <Upload className="mb-3 h-7 w-7" />
            <span className="font-medium">Choose Astrum CSV</span>
            <span className="mt-1 text-xs text-muted-foreground">The file is read locally first. No write occurs on selection.</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {fileName ? (
            <div className="mt-3 rounded-xl bg-muted/40 p-3 text-sm">
              <div className="font-medium">{fileName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{sourceText.length.toLocaleString()} characters loaded</div>
            </div>
          ) : null}
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={!sourceText || !readySupplier || working}
            onClick={() => void runPreview()}
          >
            {working && !preview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageSearch className="mr-2 h-4 w-4" />}
            Preview & validate CSV
          </Button>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="font-semibold">2. Review import plan</h2>
          {!preview ? (
            <p className="mt-3 text-sm text-muted-foreground">Load the CSV and run the preview. Production remains unchanged until the final confirmation.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Source rows", preview.counts.sourceRows],
                  ["Accepted", preview.counts.acceptedRows],
                  ["Rejected", preview.counts.rejectedRows],
                  ["Available", preview.counts.availableSkus],
                  ["Unavailable", preview.counts.unavailableSkus],
                  ["Supplier units", preview.counts.supplierAvailableUnits],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-border/60 p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 text-xl font-semibold">{Number(value).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl border p-3 text-sm ${expectedSnapshot ? "border-border/70" : "border-amber-500/60"}`}>
                {expectedSnapshot ? (
                  <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Matches the prepared Astrum snapshot: 699 / 675 / 24 / 542 / 133 / 36,012.</span>
                ) : (
                  <span className="inline-flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Counts differ from the prepared snapshot. Do not import until the source change is intentionally reviewed.</span>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sample accepted rows</div>
                <div className="max-h-64 overflow-auto rounded-xl border border-border/60">
                  {preview.preview.map((item) => (
                    <div key={item.sku} className="border-b border-border/50 px-3 py-2 text-sm last:border-b-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.sku} · {item.stockStatus} · {item.category || "Unmapped category"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!expectedSnapshot || working || Boolean(result && result.status === "completed")}
                onClick={() => void confirmImport()}
              >
                {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Confirm internal Astrum import
              </Button>
            </div>
          )}
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-500/50 bg-card p-4 text-sm">
          <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>
        </section>
      ) : null}

      {result ? (
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="font-semibold">Import {result.status}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Batch {result.batchId}. {result.idempotent ? "The source was already processed, so duplicate rows were not created." : "The accepted supplier records were sent to internal review."}
              </p>
              <Link to="/businesses/store-inventory" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
                Return to Store Operations Book
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
