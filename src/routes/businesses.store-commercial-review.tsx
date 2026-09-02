import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Search,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadStoreCommercialReviews } from "@/lib/store-commercial-review.client";
import {
  MINIMUM_COMMERCIAL_MARGIN_PERCENT,
  type CommercialReviewItem,
} from "@/lib/store-commercial-review";

export const Route = createFileRoute("/businesses/store-commercial-review")({
  component: StoreCommercialReview,
  head: () => ({
    meta: [
      { title: "Commercial Competitiveness Review — GROWTH" },
      {
        name: "description",
        content:
          "Evidence-led South African commercial review for published Cossa Store products. Recommendations never change a product automatically.",
      },
    ],
  }),
});

function zar(value: number | null) {
  return value == null
    ? "Needs evidence"
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

function outcomeStyle(outcome: CommercialReviewItem["review"]["outcome"]) {
  switch (outcome) {
    case "KEEP":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "REPRICE":
      return "border-primary/30 bg-primary/10 text-primary";
    case "LOCAL_SOURCE_OPPORTUNITY":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "ARCHIVE_CANDIDATE":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-warning/30 bg-warning/10 text-warning";
  }
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function StoreCommercialReview() {
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<CommercialReviewItem["review"]["outcome"] | "ALL">("ALL");
  const commercialReview = useQuery({
    queryKey: ["store-commercial-competitiveness"],
    queryFn: loadStoreCommercialReviews,
    staleTime: 30_000,
    retry: false,
  });
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (commercialReview.data ?? []).filter((item) => {
      if (outcome !== "ALL" && item.review.outcome !== outcome) return false;
      return (
        !needle ||
        `${item.name} ${item.sku ?? ""} ${item.supplierName ?? ""}`.toLowerCase().includes(needle)
      );
    });
  }, [commercialReview.data, outcome, search]);
  const counts = useMemo(
    () =>
      (commercialReview.data ?? []).reduce<Record<string, number>>((current, item) => {
        current[item.review.outcome] = (current[item.review.outcome] ?? 0) + 1;
        return current;
      }, {}),
    [commercialReview.data],
  );
  const evidenceCounts = useMemo(
    () =>
      (commercialReview.data ?? []).reduce(
        (current, item) => {
          if (item.review.evidenceDecisionState === "SUFFICIENT") current.sufficient += 1;
          else current.missing += 1;
          return current;
        },
        { sufficient: 0, missing: 0 },
      ),
    [commercialReview.data],
  );
  const cjPortfolio = useMemo(
    () =>
      (commercialReview.data ?? []).filter(
        (item) => item.supplierPriority === "INTERNATIONAL_DROPSHIPPING",
      ),
    [commercialReview.data],
  );
  const cjCounts = useMemo(
    () =>
      cjPortfolio.reduce<Record<string, number>>((current, item) => {
        current[item.review.outcome] = (current[item.review.outcome] ?? 0) + 1;
        return current;
      }, {}),
    [cjPortfolio],
  );

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <section className="glass-card p-6 sm:p-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/businesses/store">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Cossa Store
          </Link>
        </Button>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Review only · no catalogue writes
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">
              South Africa commercial <span className="text-gradient-gold">competitiveness</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Product priority remains Cossa/local stock, approved South African suppliers, other
              verified local suppliers, international dropshipping, then affiliate/partner models.
              This review makes recommendations from evidence; it never reprices, archives, changes
              sources, changes Google visibility or publishes a product.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">Current review threshold</p>
            <p className="mt-1 text-muted-foreground">
              Minimum sustainable gross margin: {MINIMUM_COMMERCIAL_MARGIN_PERCENT}%
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-warning/30 bg-warning/5 p-5 text-sm text-muted-foreground">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-foreground">
              Evidence is required before a commercial decision.
            </p>
            <p className="mt-1 leading-relaxed">
              Supplier price alone is never treated as profitability. International freight, FX,
              duties/taxes, configured operating costs, availability and an actually comparable
              South African benchmark must be evidenced. A title-only local match is a research
              lead, not an identical product. Existing SEO/indexability remains unchanged while a
              Merchant/search warning is shown here for incomplete or uncompetitive products.
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">Published product audit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {commercialReview.data?.length ?? 0} published Store product
              {(commercialReview.data?.length ?? 0) === 1 ? "" : "s"} loaded from the current
              catalogue. No review result writes to production data.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-primary/40 text-primary"
            onClick={() => void commercialReview.refetch()}
            disabled={commercialReview.isFetching}
          >
            {commercialReview.isFetching ? "Refreshing…" : "Refresh saved evidence"}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(
            ["HOLD", "REPRICE", "LOCAL_SOURCE_OPPORTUNITY", "ARCHIVE_CANDIDATE", "KEEP"] as const
          ).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setOutcome((current) => (current === item ? "ALL" : item))}
              className={`rounded-xl border p-4 text-left transition ${
                outcome === item
                  ? outcomeStyle(item)
                  : "border-border/60 bg-card/40 hover:border-primary/30"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest">
                {item.replaceAll("_", " ")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">{counts[item] ?? 0}</p>
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Sufficient decision evidence
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{evidenceCounts.sufficient}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete cost, availability and credible comparable evidence.
            </p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Blocked by missing evidence
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{evidenceCounts.missing}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              HOLD is an evidence state, not a verdict against the product.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
            CJ / international portfolio intelligence
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cjPortfolio.length} active international product{cjPortfolio.length === 1 ? "" : "s"} ·{" "}
            KEEP {cjCounts.KEEP ?? 0} · REPRICE {cjCounts.REPRICE ?? 0} · LOCAL SOURCE{" "}
            {cjCounts.LOCAL_SOURCE_OPPORTUNITY ?? 0} · HOLD {cjCounts.HOLD ?? 0} · ARCHIVE{" "}
            {cjCounts.ARCHIVE_CANDIDATE ?? 0}
          </p>
        </div>

        <label className="mt-5 flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by product, SKU or supplier"
          />
        </label>

        {commercialReview.isError ? (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {commercialReview.error instanceof Error
              ? commercialReview.error.message
              : "The commercial review could not be loaded."}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          {rows.map((item) => (
            <CommercialReviewCard key={item.id} item={item} />
          ))}
          {!commercialReview.isLoading && !rows.length ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No published products match this review filter.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CommercialReviewCard({ item }: { item: CommercialReviewItem }) {
  const review = item.review;
  const benchmarkUrl = safeExternalUrl(item.marketEvidence.sourceUrl);
  return (
    <article className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{item.name}</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${outcomeStyle(review.outcome)}`}
            >
              {review.outcome.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.sku ?? "No SKU"} · {item.supplierName ?? "Supplier not recorded"} ·{" "}
            {item.supplierPriority.replaceAll("_", " ")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Customer price used for review{" "}
          <strong className="text-foreground">{zar(item.currentSellingPriceZar)}</strong>
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Fact
          label="Decision evidence"
          value={review.evidenceDecisionState.replaceAll("_", " ")}
          note={item.reviewedVariant?.title ? `Variant: ${item.reviewedVariant.title}` : undefined}
        />
        <Fact
          label="Recorded landed cost"
          value={zar(review.totalLandedCostZar)}
          note={review.totalLandedCostEvidence}
        />
        <Fact label="Gross profit" value={zar(review.grossProfitZar)} />
        <Fact
          label="Gross margin"
          value={
            review.grossMarginPercent == null
              ? "Needs evidence"
              : `${review.grossMarginPercent.toFixed(1)}%`
          }
        />
        <Fact label="Sustainable floor" value={zar(review.minimumSustainableSellingPriceZar)} />
        <Fact label="Recommended price" value={zar(review.recommendedCompetitiveSellingPriceZar)} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <EvidenceList
          title="Decision and evidence needed"
          entries={[...review.rationale, ...review.requirements]}
          empty="No additional requirements."
        />
        <EvidenceList
          title="Merchant/search warnings"
          entries={review.merchantWarnings}
          empty="No commercial warning from the current review."
        />
      </div>

      <EvidenceLedger entries={review.evidence} />

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>
          SA benchmark:{" "}
          {item.marketEvidence.sourceUrl
            ? `${item.marketEvidence.matchStrength.replaceAll("_", " ")} ${
                item.marketEvidence.confidencePercent != null
                  ? `(${item.marketEvidence.confidencePercent}% confidence)`
                  : ""
              }`
            : "Not recorded — add reviewed source, match and confidence in Inventory notes"}
        </span>
        {benchmarkUrl ? (
          <a
            className="inline-flex items-center gap-1 text-primary hover:underline"
            href={benchmarkUrl}
            target="_blank"
            rel="noreferrer"
          >
            Review source <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {review.localSourceMatch ? (
          <span>Local source: {review.localSourceMatch.matchStrength.replaceAll("_", " ")}</span>
        ) : (
          <span>Local source: no verified equivalent recorded</span>
        )}
        <span>
          Inventory:{" "}
          {item.inventoryLastVerifiedAt
            ? `last verified ${new Date(item.inventoryLastVerifiedAt).toLocaleDateString("en-ZA")}`
            : "not verified"}
        </span>
      </div>
    </article>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
      {note ? <p className="mt-1 text-[10px] capitalize text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function EvidenceList({
  title,
  entries,
  empty,
}: {
  title: string;
  entries: string[];
  empty: string;
}) {
  const Icon = entries.length ? TrendingDown : ShieldCheck;
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${entries.length ? "text-warning" : "text-emerald-500"}`} />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {entries.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function EvidenceLedger({ entries }: { entries: CommercialReviewItem["review"]["evidence"] }) {
  return (
    <section className="mt-5 rounded-xl border border-border/60 bg-background/50 p-4">
      <div>
        <h4 className="text-sm font-semibold">Evidence ledger</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Each item preserves the available source and check time. Missing evidence stays explicit
          and cannot be converted into a price recommendation.
        </p>
        <p className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Decision-grade market note: [commercial-match: EXACT_MATCH or STRONG_COMPARABLE]
          {"\n"}[commercial-confidence: 80–100] [commercial-comparison: model/specification
          evidence]
        </p>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {entries.map((entry) => {
          const sourceUrl = safeExternalUrl(entry.sourceUrl);
          return (
            <div
              key={`${entry.kind}-${entry.sourceLabel}`}
              className="rounded-lg border border-border/60 bg-card/35 px-3 py-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.kind.replaceAll("_", " ")}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    entry.state === "verified"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-warning/30 bg-warning/10 text-warning"
                  }`}
                >
                  {entry.state.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{entry.sourceLabel}</p>
              <p className="mt-1 text-muted-foreground">
                {entry.valueZar == null ? "No amount recorded" : zar(entry.valueZar)}
                {entry.matchStrength ? ` · ${entry.matchStrength.replaceAll("_", " ")}` : ""}
                {entry.observedAt
                  ? ` · checked ${new Date(entry.observedAt).toLocaleDateString("en-ZA")}`
                  : ""}
              </p>
              {entry.note ? (
                <p className="mt-1 leading-relaxed text-muted-foreground">{entry.note}</p>
              ) : null}
              {sourceUrl ? (
                <a
                  className="mt-1.5 inline-flex items-center gap-1 text-primary hover:underline"
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Evidence source <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
