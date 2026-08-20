import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileUp, Loader2, ShieldCheck } from "lucide-react";

import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import {
  loadGrowthSubscriptionOptions,
  startGrowthEftPayment,
  submitGrowthEftProof,
  type EftPaymentDetail,
  type SubscriptionOptions,
} from "@/lib/eft-payments";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "GROWTH subscription | Cossa Nexus Holdings" },
      { name: "description", content: "Manage a GROWTH subscription payment by secure EFT." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <AuthGate><SubscriptionPage /></AuthGate>,
});

function formatZar(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-growth-eft`;
}

function SubscriptionPage() {
  const [options, setOptions] = useState<SubscriptionOptions | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "business">("starter");
  const [organisationId, setOrganisationId] = useState("");
  const [payment, setPayment] = useState<EftPaymentDetail | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [payerNote, setPayerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(newRequestId);

  useEffect(() => {
    void loadGrowthSubscriptionOptions()
      .then((next) => {
        setOptions(next);
        if (next.organisations[0]?.id) setOrganisationId(next.organisations[0].id);
        if (next.plans.some((plan) => plan.code === "starter")) setSelectedPlan("starter");
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Subscription options could not be loaded."));
  }, []);

  async function startPayment() {
    if (!organisationId) return;
    setBusy(true);
    setError(null);
    try {
      setPayment(await startGrowthEftPayment({ planCode: selectedPlan, organisationId, clientRequestId: requestId }));
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Your subscription payment request could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof(event: React.FormEvent) {
    event.preventDefault();
    if (!payment || !proof) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitGrowthEftProof({ paymentId: payment.payment.id, proof, payerNote });
      setPayment((current) => current ? { ...current, payment: { ...current.payment, ...result.payment } } : current);
      setProof(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Proof of payment could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-primary/30 bg-card/80 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GROWTH billing</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Subscribe by secure EFT</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">The exact amount and unique payment reference are fixed before you transfer. Upload a PDF, JPG or PNG proof of payment; your plan becomes active only after Cossa approves it.</p>
          </div>
        </div>

        {error ? <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        {!options ? <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading subscription options…</div> : null}

        {options && options.organisations.length === 0 ? <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm leading-6">Your account does not yet have an active GROWTH organisation owner or administrator membership. Ask Cossa to create or assign your organisation before starting a subscription payment.</div> : null}

        {options && options.organisations.length > 0 && !payment ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-border/70 bg-background/30 p-5">
              <label className="block text-sm font-medium">Organisation<select value={organisationId} onChange={(event) => setOrganisationId(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">{options.organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}</select></label>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Only an active owner or administrator can initiate the organisation’s subscription payment.</p>
            </section>
            <section className="grid gap-3 sm:grid-cols-3">
              {options.plans.map((plan) => <button type="button" key={plan.code} onClick={() => setSelectedPlan(plan.code)} className={`rounded-2xl border p-4 text-left transition ${selectedPlan === plan.code ? "border-primary bg-primary/10 shadow-[0_12px_34px_rgba(212,175,55,0.14)]" : "border-border/70 bg-background/30 hover:border-primary/50"}`}><span className="block font-display text-lg font-semibold">{plan.name}</span><span className="mt-2 block text-xl font-bold text-primary">{formatZar(plan.monthly_price_zar)}<span className="text-xs font-normal text-muted-foreground">/mo</span></span></button>)}
            </section>
            <div className="lg:col-span-2"><Button size="lg" disabled={busy} onClick={() => void startPayment()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{busy ? "Preparing secure payment…" : "Create EFT payment request"}</Button></div>
          </div>
        ) : null}

        {payment ? <div className="mt-8 space-y-5"><section className="rounded-2xl border border-primary/35 bg-primary/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Payment instructions</p><h2 className="mt-2 font-display text-2xl font-semibold">Transfer {formatZar(payment.instructions.exactAmount)} exactly</h2><p className="mt-2 text-sm text-muted-foreground">{payment.instructions.instruction}</p><dl className="mt-5 grid gap-3 rounded-xl border border-border bg-background/50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Bank</dt><dd className="mt-1 font-medium">{payment.instructions.bankName}</dd></div><div><dt className="text-xs text-muted-foreground">Account holder</dt><dd className="mt-1 font-medium">{payment.instructions.accountHolder}</dd></div><div><dt className="text-xs text-muted-foreground">Account type</dt><dd className="mt-1 font-medium">{payment.instructions.accountType}</dd></div><div><dt className="text-xs text-muted-foreground">Account number</dt><dd className="mt-1 break-all font-medium">{payment.instructions.accountNumber}</dd></div><div><dt className="text-xs text-muted-foreground">Branch code</dt><dd className="mt-1 font-medium">{payment.instructions.branchCode}</dd></div><div><dt className="text-xs text-muted-foreground">Unique reference</dt><dd className="mt-1 break-all font-semibold text-primary">{payment.instructions.reference}</dd></div></dl></section>
          {payment.payment.status === "proof_submitted" ? <p className="flex items-start gap-2 rounded-xl border border-primary/35 bg-primary/5 p-4 text-sm"><Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />Proof received. Cossa is reviewing it before your plan is activated.</p> : null}
          {payment.payment.status === "approved" ? <p className="flex items-start gap-2 rounded-xl border border-primary/35 bg-primary/5 p-4 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Payment approved. Your GROWTH subscription is active.</p> : null}
          {["awaiting_payment", "rejected"].includes(payment.payment.status) ? <form onSubmit={submitProof} className="rounded-2xl border border-border bg-background/30 p-5"><h2 className="font-display text-xl font-semibold">Upload proof of payment</h2><p className="mt-2 text-sm text-muted-foreground">PDF, JPG or PNG only; maximum 10 MB.</p><label className="mt-4 block text-sm font-medium">Proof of payment<input type="file" required accept="application/pdf,image/jpeg,image/png" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-muted-foreground" /></label><label className="mt-4 block text-sm font-medium">Optional reviewer note<input value={payerNote} maxLength={1000} onChange={(event) => setPayerNote(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Payment account name, if different" /></label>{payment.payment.reviewerNote ? <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{payment.payment.reviewerNote}</p> : null}<Button type="submit" className="mt-5" disabled={busy || !proof}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}{busy ? "Submitting proof…" : "Submit proof of payment"}</Button></form> : null}</div> : null}
      </div>
    </main>
  );
}
