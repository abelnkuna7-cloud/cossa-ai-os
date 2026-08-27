import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";

import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { loadEftReviewQueue, reviewEftPayment, type ReviewPayment } from "@/lib/eft-payments";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [{ title: "Payment review | GROWTH" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AuthGate>
      <PaymentReviewPage />
    </AuthGate>
  ),
});

function formatZar(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

function PaymentReviewPage() {
  const [payments, setPayments] = useState<ReviewPayment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await loadEftReviewQueue();
      setPayments(result.payments);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The payment review queue could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(payment: ReviewPayment, approved: boolean) {
    setBusyId(payment.id);
    setError(null);
    try {
      await reviewEftPayment({
        paymentId: payment.id,
        reviewerNote: notes[payment.id] ?? "",
        approved,
      });
      await load();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "The payment could not be reviewed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Finance control
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">EFT proof review</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Approve only after confirming the amount, unique reference and funds received in the
            business bank account. Approval triggers secure digital delivery or activates the
            requested subscription.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh queue
        </Button>
      </div>
      {error ? (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payment proofs…
        </div>
      ) : payments.length ? (
        <div className="mt-8 grid gap-5">
          {payments.map((payment) => (
            <article
              key={payment.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="font-display text-xl font-semibold">
                    {payment.order
                      ? `Store order ${payment.order.orderNumber}`
                      : payment.purpose === "nexdocs_subscription"
                        ? "NexDocs Monthly"
                        : "GROWTH subscription"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {payment.payerEmail} · submitted{" "}
                    {payment.submittedAt
                      ? new Date(payment.submittedAt).toLocaleString("en-ZA")
                      : "now"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-bold text-primary">{formatZar(payment.amount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reference{" "}
                    <span className="font-semibold text-primary">{payment.reference}</span>
                  </p>
                </div>
              </div>
              {payment.order ? (
                <ul className="mt-4 rounded-xl border border-border bg-background/40 p-3 text-sm">
                  {payment.order.items.map((item) => (
                    <li
                      key={`${item.sku ?? item.productName}-${item.quantity}`}
                      className="flex justify-between gap-3 py-1"
                    >
                      <span>
                        {item.quantity} × {item.productName}
                      </span>
                      <span>{formatZar(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm">
                  <p className="font-medium">Submitted proof</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {payment.proofFileName ?? "No file name"} ·{" "}
                    {payment.proofContentType ?? "Unknown type"}
                  </p>
                  {payment.payerNote ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Customer note: {payment.payerNote}
                    </p>
                  ) : null}
                  {payment.proofUrl ? (
                    <a
                      href={payment.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
                    >
                      Open private proof <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-destructive">
                      Proof preview could not be created.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Reviewer note (required when rejecting)
                    <textarea
                      value={notes[payment.id] ?? ""}
                      maxLength={2000}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [payment.id]: event.target.value }))
                      }
                      className="mt-2 min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Internal reason or customer-facing correction instruction"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      disabled={busyId === payment.id}
                      onClick={() => void review(payment, true)}
                    >
                      {busyId === payment.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve payment
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId === payment.id}
                      onClick={() => void review(payment, false)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject proof
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-sm">
          <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
          No submitted EFT proofs are awaiting review.
        </div>
      )}
    </main>
  );
}
