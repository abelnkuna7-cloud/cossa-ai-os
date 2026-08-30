import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Megaphone,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadStoreIntelligence } from "@/lib/store-intelligence";

export const Route = createFileRoute("/businesses/store")({
  component: CossaStoreWorkspace,

  head: () => ({
    meta: [
      {
        title: "Cossa Store — GROWTH",
      },
      {
        name: "description",
        content:
          "Cossa Store operating workspace for products, suppliers, catalogue management, ecommerce growth, marketing, sales and AI workforce tools.",
      },
    ],
  }),
});

const STORE_TOOLS = [
  {
    title: "Smart Affiliate Import",
    description:
      "Paste an approved affiliate product link. GROWTH reads the merchant page, prepares product data and media, generates a Cossa SKU and saves a reviewable affiliate draft.",
    to: "/businesses/store-affiliate-import",
    icon: Sparkles,
  },
  {
    title: "Inventory & Product Intake",
    description:
      "Paste a supplier product link, review real data, record source and fulfilment rules, then approve before publication.",
    to: "/businesses/store-inventory",
    icon: PackagePlus,
  },
  {
    title: "Product Manager",
    description:
      "Add real products, change prices, upload images and digital files, publish, archive and manage the live Store catalogue.",
    to: "/businesses/store-products",
    icon: PackagePlus,
  },
  {
    title: "EFT Payment Review",
    description:
      "Review customer proof of payment before digital delivery, store fulfilment or subscription activation.",
    to: "/payments",
    icon: ShoppingCart,
  },
  {
    title: "Store AI Team",
    description:
      "Open the AI employees responsible for Store operations, products, suppliers, creative work and growth.",
    to: "/ai/workforce",
    icon: UsersRound,
  },
  {
    title: "Product Intelligence",
    description: "Research products, demand opportunities, merchandising ideas and catalogue gaps.",
    to: "/ai/workforce",
    icon: Search,
  },
  {
    title: "Supplier Sourcing",
    description: "Research supplier candidates and prepare evidence-backed sourcing comparisons.",
    to: "/ai/workforce",
    icon: PackageSearch,
  },
  {
    title: "Store Marketing",
    description: "Create campaigns, product promotions, social content and ecommerce growth plans.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },
  {
    title: "Social Media",
    description: "Plan Cossa Store social posts, content calendars and channel activity.",
    to: "/marketing/social",
    icon: Megaphone,
  },
  {
    title: "Content Studio",
    description: "Create product copy, promotional content, banners and campaign material.",
    to: "/marketing/content-studio",
    icon: BrainCircuit,
  },
  {
    title: "Store Leads & Customers",
    description: "Manage prospects, customer opportunities and Cossa Store sales activity.",
    to: "/sales/crm",
    icon: TrendingUp,
  },
  {
    title: "Sales Analytics",
    description: "Review sales and commercial performance using available Growth records.",
    to: "/sales/analytics",
    icon: BarChart3,
  },
  {
    title: "Store Workflows",
    description: "Design and manage repeatable Store automation and operating workflows.",
    to: "/ai/workflow",
    icon: ShoppingCart,
  },
] as const;

function metricLabel(value: number | null, suffix = "") {
  if (value == null) return "Unknown";
  return `${value.toLocaleString("en-ZA")}${suffix}`;
}

function zar(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function CossaStoreWorkspace() {
  const intelligence = useQuery({
    queryKey: ["cossa-store-intelligence"],
    queryFn: loadStoreIntelligence,
    staleTime: 30_000,
    retry: false,
  });

  const snapshot = intelligence.data;
  const attentionCount = snapshot
    ? snapshot.staleInventory +
      snapshot.unknownInventory +
      snapshot.outOfStockCossaOwned +
      snapshot.incompleteDrafts +
      snapshot.pricingReview
    : 0;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <Store className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Cossa Nexus Holdings
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Cossa <span className="text-gradient-gold">Store</span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One operating workspace for Cossa Store. Catalogue intelligence below is calculated from
            the real Store product records; supplier availability is never represented as
            Cossa-owned stock.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/businesses/store-affiliate-import">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Smart Affiliate Import
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link to="/businesses/store-inventory">
                <PackagePlus className="mr-1.5 h-4 w-4" />
                Add supplier product
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="border-primary/40 text-primary"
              disabled={intelligence.isFetching}
              onClick={() => void intelligence.refetch()}
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${intelligence.isFetching ? "animate-spin" : ""}`}
              />
              {intelligence.isFetching ? "Refreshing…" : "Refresh intelligence"}
            </Button>

            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link
                to="/ai/workforce"
                search={{
                  view: "command",
                  department: "all",
                }}
              >
                <UsersRound className="mr-1.5 h-4 w-4" />
                Open Store AI Team
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Live catalogue intelligence
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Commercial and inventory truth
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Counts come from the current Store catalogue. Unknown or stale supplier inventory
              stays visible until a verified source is recorded.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {snapshot
              ? `Calculated ${new Date(snapshot.generatedAt).toLocaleString("en-ZA")}`
              : intelligence.isError
                ? "Intelligence unavailable"
                : "Loading catalogue…"}
          </div>
        </div>

        {intelligence.isError ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {intelligence.error instanceof Error
                ? intelligence.error.message
                : "Unable to load Store intelligence."}
            </span>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <Metric label="Catalogue" value={snapshot?.total ?? null} />
              <Metric label="Published" value={snapshot?.active ?? null} />
              <Metric label="Drafts" value={snapshot?.draft ?? null} />
              <Metric label="Dropshipping" value={snapshot?.byType.dropshipping ?? null} />
              <Metric label="Affiliate" value={snapshot?.byType.affiliate ?? null} />
              <Metric label="Digital" value={snapshot?.byType.digital ?? null} />
              <Metric label="POD" value={snapshot?.byType.pod ?? null} />
              <Metric label="Cossa-owned" value={snapshot?.byOwnership.cossa_owned ?? null} />
              <Metric label="Supplier-managed" value={snapshot?.supplierManaged ?? null} />
              <Metric label="Inventory verified" value={snapshot?.verifiedInventory ?? null} />
              <Metric
                label="Inventory unknown"
                value={snapshot?.unknownInventory ?? null}
                attention={(snapshot?.unknownInventory ?? 0) > 0}
              />
              <Metric
                label="Variants available"
                value={snapshot?.variantIntelligenceAvailable ? snapshot.variants.available : null}
              />
              <Metric
                label="Variants unavailable"
                value={
                  snapshot?.variantIntelligenceAvailable ? snapshot.variants.unavailable : null
                }
                attention={(snapshot?.variants.unavailable ?? 0) > 0}
              />
              <Metric
                label="No available variants"
                value={
                  snapshot?.variantIntelligenceAvailable
                    ? snapshot.productsWithNoAvailableVariants
                    : null
                }
                attention={(snapshot?.productsWithNoAvailableVariants ?? 0) > 0}
              />
              <Metric
                label="Paid orders"
                value={snapshot?.orderIntelligenceAvailable ? snapshot.paidOrderCount : null}
              />
              <Metric
                label="No-sale products"
                value={snapshot?.orderIntelligenceAvailable ? snapshot.noSaleProducts : null}
                attention={(snapshot?.noSaleProducts ?? 0) > 0}
              />
              <Metric
                label="Oldest product age"
                value={snapshot?.oldestProductAgeDays ?? null}
                suffix="d"
              />
              <Metric
                label="Known avg margin"
                value={
                  snapshot?.averageKnownGrossMarginPercent == null
                    ? null
                    : Math.round(snapshot.averageKnownGrossMarginPercent)
                }
                suffix="%"
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Inventory ownership</h3>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <TruthRow
                    label="Cossa-owned stock records"
                    value={snapshot?.byOwnership.cossa_owned ?? null}
                  />
                  <TruthRow
                    label="Supplier-managed availability"
                    value={snapshot?.byOwnership.supplier_managed ?? null}
                  />
                  <TruthRow
                    label="Print-on-demand provider"
                    value={snapshot?.byOwnership.pod_managed ?? null}
                  />
                  <TruthRow
                    label="Affiliate merchant"
                    value={snapshot?.byOwnership.affiliate_merchant ?? null}
                  />
                  <TruthRow
                    label="Digital delivery"
                    value={snapshot?.byOwnership.digital ?? null}
                  />
                  <TruthRow
                    label="Unknown ownership"
                    value={snapshot?.byOwnership.unknown ?? null}
                    attention={(snapshot?.byOwnership.unknown ?? 0) > 0}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Needs attention</h3>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <TruthRow
                    label="Stale or failed inventory sources"
                    value={snapshot?.staleInventory ?? null}
                    attention={(snapshot?.staleInventory ?? 0) > 0}
                  />
                  <TruthRow
                    label="Unknown / disconnected inventory"
                    value={snapshot?.unknownInventory ?? null}
                    attention={(snapshot?.unknownInventory ?? 0) > 0}
                  />
                  <TruthRow
                    label="Cossa-owned products out of stock"
                    value={snapshot?.outOfStockCossaOwned ?? null}
                    attention={(snapshot?.outOfStockCossaOwned ?? 0) > 0}
                  />
                  <TruthRow
                    label="Incomplete drafts"
                    value={snapshot?.incompleteDrafts ?? null}
                    attention={(snapshot?.incompleteDrafts ?? 0) > 0}
                  />
                  <TruthRow
                    label="Pricing / margin review"
                    value={snapshot?.pricingReview ?? null}
                    attention={(snapshot?.pricingReview ?? 0) > 0}
                  />
                  <TruthRow
                    label="Total catalogue attention signals"
                    value={snapshot ? attentionCount : null}
                    attention={attentionCount > 0}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <h3 className="font-semibold">Paid-order performance</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only orders recorded as paid, processing or completed are counted.
                </p>
                <p className="mt-4 font-display text-2xl font-semibold text-primary">
                  {snapshot?.orderIntelligenceAvailable ? zar(snapshot.paidRevenue) : "Unavailable"}
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  {(snapshot?.productRevenue ?? []).slice(0, 5).map((product) => (
                    <div
                      key={`${product.productId ?? product.name}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="truncate text-muted-foreground">
                        {product.name} · {product.quantity} sold
                      </span>
                      <span>{zar(product.revenue)}</span>
                    </div>
                  ))}
                  {snapshot?.orderIntelligenceAvailable && snapshot.productRevenue.length === 0 ? (
                    <p className="text-muted-foreground">
                      No payment-confirmed product sales recorded.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <h3 className="font-semibold">Movement and freshness</h3>
                <div className="mt-4 grid gap-2 text-sm">
                  <TruthRow
                    label="Variant freshness unknown"
                    value={
                      snapshot?.variantIntelligenceAvailable
                        ? snapshot.variants.unknownFreshness
                        : null
                    }
                    attention={(snapshot?.variants.unknownFreshness ?? 0) > 0}
                  />
                  <TruthRow
                    label="Variant sync stale / failed"
                    value={
                      snapshot?.variantIntelligenceAvailable
                        ? snapshot.variants.staleOrFailed
                        : null
                    }
                    attention={(snapshot?.variants.staleOrFailed ?? 0) > 0}
                  />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  <strong className="text-foreground">Fast movers:</strong>{" "}
                  {snapshot?.fastMovers.length
                    ? snapshot.fastMovers.join(", ")
                    : "No paid-order evidence."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">Slow movers:</strong>{" "}
                  {snapshot?.slowMovers.length
                    ? snapshot.slowMovers.join(", ")
                    : "No paid-order evidence."}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <h3 className="font-semibold">Recommendations</h3>
                <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                  {(snapshot?.unknownInventory ?? 0) > 0 ? (
                    <li>
                      Connect or manually verify inventory sources before promising availability.
                    </li>
                  ) : null}
                  {(snapshot?.pricingReview ?? 0) > 0 ? (
                    <li>
                      Review products with missing cost data, invalid pricing or margin below 10%.
                    </li>
                  ) : null}
                  {(snapshot?.noSaleProducts ?? 0) > 0 ? (
                    <li>
                      Review published products with no payment-confirmed sales before expanding the
                      catalogue.
                    </li>
                  ) : null}
                  {(snapshot?.productsWithNoAvailableVariants ?? 0) > 0 ? (
                    <li>Hide or correct products whose recorded variants are all unavailable.</li>
                  ) : null}
                  <li>
                    Supplier cost movement is unavailable: no historical supplier-cost ledger is
                    connected.
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </section>

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Store command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">Everything Cossa Store needs</h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            These tools already exist in GROWTH. This page groups the relevant ones around the Store
            business instead of duplicating them.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STORE_TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                to={tool.to}
                className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-base font-semibold">{tool.title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>

                <span className="mt-4 inline-flex text-xs font-medium text-primary">
                  Open tool →
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix = "",
  attention = false,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  attention?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${attention ? "border-warning/40 bg-warning/5" : "border-border/60 bg-card/40"}`}
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${attention ? "text-warning" : ""}`}>
        {metricLabel(value, suffix)}
      </p>
    </div>
  );
}

function TruthRow({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number | null;
  attention?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${attention ? "text-warning" : "text-foreground"}`}>
        {value == null ? "Unknown" : value.toLocaleString("en-ZA")}
      </span>
    </div>
  );
}
