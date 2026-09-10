import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileJson, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/businesses/store-astrum-csv-intake")({
  component: AstrumCsvIntake,
  head: () => ({
    meta: [
      { title: "Astrum CSV Intake — GROWTH" },
      {
        name: "description",
        content: "Controlled execution of the independently validated Astrum supplier catalogue package.",
      },
    ],
  }),
});

type ImportPackage = Record<string, unknown> & {
  p_rows?: unknown[];
  p_events?: unknown[];
  p_counts?: Record<string, unknown>;
  p_source_file_name?: string;
  p_source_content_hash?: string;
};

type ImportResult = {
  ok?: boolean;
  error?: string;
  code?: string;
  counts?: Record<string, number>;
  result?: { batchId?: string; status?: string; idempotent?: boolean };
};

function AstrumCsvIntake() {
  const [payload, setPayload] = useState<ImportPackage | null>(null);
  const [fileName, setFileName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const summary = useMemo(() => {
    const counts = payload?.p_counts ?? {};
    return {
      sourceRows: Number(counts.sourceRows ?? 0),
      acceptedRows: Number(counts.acceptedRows ?? 0),
      rejectedRows: Number(counts.rejectedRows ?? 0),
      availableSkus: Number(counts.availableSkus ?? 0),
      unavailableSkus: Number(counts.unavailableSkus ?? 0),
      supplierAvailableUnits: Number(counts.supplierAvailableUnits ?? 0),
      rows: Array.isArray(payload?.p_rows) ? payload.p_rows.length : 0,
      events: Array.isArray(payload?.p_events) ? payload.p_events.length : 0,
    };
  }, [payload]);

  const expectedPreview =
    summary.sourceRows === 699 &&
    summary.acceptedRows === 675 &&
    summary.rejectedRows === 24 &&
    summary.availableSkus === 542 &&
    summary.unavailableSkus === 133 &&
    summary.supplierAvailableUnits === 36012 &&
    summary.rows === 675 &&
    summary.events === 1374;

  async function chooseFile(file: File | null) {
    setPayload(null);
    setResult(null);
    setConfirmed(false);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error("Choose the validated Astrum JSON import package.");
      return;
    }
    if (file.size > 1_000_000) {
      toast.error("The package is unexpectedly large. Use the approved Astrum package only.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as ImportPackage;
      setPayload(parsed);
      toast.success("Package loaded for preflight. No supplier data has been changed yet.");
    } catch {
      toast.error("The selected file is not valid JSON.");
    }
  }

  async function executeImport() {
    if (!payload || !expectedPreview || !confirmed) return;
    setRunning(true);
    setResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your authenticated Growth session is required.");
      const response = await fetch("/api/store-astrum-catalogue-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ package: payload }),
      });
      const body = (await response.json().catch(() => ({}))) as ImportResult;
      setResult(body);
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Astrum catalogue import failed.");
      toast.success(
        body.result?.idempotent
          ? "This approved Astrum snapshot was already imported; no duplicate import was created."
          : "Astrum catalogue import completed. Products remain in internal review.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Astrum catalogue import failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Cossa Store · Supplier Stock · Controlled Intake</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Astrum CSV Intake</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Execute only the independently validated Astrum catalogue package. This intake records supplier availability and cost evidence for review; it does not publish products, create Cossa-owned stock or set Cossa selling prices.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/businesses/store-inventory"><ArrowLeft className="mr-2 h-4 w-4" />Store Inventory</Link>
        </Button>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="font-medium">Validated production gate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The server independently checks the exact approved source hash, package hash, counts, SKU uniqueness, supplier status and your authorised Growth identity before persistence.
            </p>
          </div>
        </div>

        <label className="mt-5 block rounded-xl border border-dashed p-5 text-sm">
          <span className="mb-2 flex items-center gap-2 font-medium"><FileJson className="h-4 w-4" />Validated Astrum package</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {fileName ? <span className="mt-2 block text-muted-foreground">{fileName}</span> : null}
        </label>

        {payload ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Source rows", summary.sourceRows],
              ["Accepted", summary.acceptedRows],
              ["Rejected", summary.rejectedRows],
              ["Import events", summary.events],
              ["Available SKUs", summary.availableSkus],
              ["Unavailable SKUs", summary.unavailableSkus],
              ["Supplier units", summary.supplierAvailableUnits.toLocaleString()],
              ["Accepted payload rows", summary.rows],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border bg-background p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {payload ? (
          <div className={`mt-5 rounded-xl border p-4 text-sm ${expectedPreview ? "" : "border-destructive/50"}`}>
            <div className="flex items-center gap-2 font-medium">
              {expectedPreview ? <CheckCircle2 className="h-4 w-4" /> : null}
              {expectedPreview ? "Preflight counts match the approved Astrum snapshot." : "Preflight counts do not match the approved Astrum snapshot."}
            </div>
            <p className="mt-1 text-muted-foreground">
              Final cryptographic and authorisation checks run on the server. A matching preview alone cannot execute an altered package.
            </p>
          </div>
        ) : null}

        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!expectedPreview || running}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>I approve this controlled Astrum supplier-catalogue intake into internal review. No product publication is authorised by this action.</span>
        </label>

        <Button className="mt-5" disabled={!payload || !expectedPreview || !confirmed || running} onClick={() => void executeImport()}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          {running ? "Executing validated intake…" : "Execute controlled Astrum import"}
        </Button>

        {result ? (
          <div className="mt-5 rounded-xl border bg-background p-4 text-sm">
            <div className="font-medium">Execution result</div>
            {result.ok ? (
              <p className="mt-1 text-muted-foreground">
                Status: {result.result?.status ?? "completed"} · Batch: {result.result?.batchId ?? "recorded"} · Idempotent replay: {result.result?.idempotent ? "yes" : "no"}
              </p>
            ) : (
              <p className="mt-1 text-destructive">{result.error ?? "The server rejected the package."}</p>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
