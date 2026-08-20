import { createFileRoute, Link } from "@tanstack/react-router";

import {
  BarChart3,
  BrainCircuit,
  Megaphone,
  PackagePlus,
  PackageSearch,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

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
    title: "Product Manager",
    description:
      "Add real products, change prices, upload images and digital files, publish, archive and manage the live Store catalogue.",
    to: "/businesses/store-products",
    icon: PackagePlus,
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
    description:
      "Research products, demand opportunities, merchandising ideas and catalogue gaps.",
    to: "/ai/workforce",
    icon: Search,
  },

  {
    title: "Supplier Sourcing",
    description:
      "Research supplier candidates and prepare evidence-backed sourcing comparisons.",
    to: "/ai/workforce",
    icon: PackageSearch,
  },

  {
    title: "Store Marketing",
    description:
      "Create campaigns, product promotions, social content and ecommerce growth plans.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },

  {
    title: "Social Media",
    description:
      "Plan Cossa Store social posts, content calendars and channel activity.",
    to: "/marketing/social",
    icon: Megaphone,
  },

  {
    title: "Content Studio",
    description:
      "Create product copy, promotional content, banners and campaign material.",
    to: "/marketing/content-studio",
    icon: BrainCircuit,
  },

  {
    title: "Store Leads & Customers",
    description:
      "Manage prospects, customer opportunities and Cossa Store sales activity.",
    to: "/sales/crm",
    icon: TrendingUp,
  },

  {
    title: "Sales Analytics",
    description:
      "Review sales and commercial performance using available Growth records.",
    to: "/sales/analytics",
    icon: BarChart3,
  },

  {
    title: "Store Workflows",
    description:
      "Design and manage repeatable Store automation and operating workflows.",
    to: "/ai/workflow",
    icon: ShoppingCart,
  },
] as const;

function CossaStoreWorkspace() {
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
            Cossa{" "}
            <span className="text-gradient-gold">
              Store
            </span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One operating workspace for Cossa Store. Products, suppliers,
            catalogue work, marketing, sales, AI employees and workflows are
            organised here instead of being scattered across the platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/businesses/store-products">
                <PackagePlus className="mr-1.5 h-4 w-4" />
                Manage Products
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/ai/workforce">
                <UsersRound className="mr-1.5 h-4 w-4" />
                Open Store AI Team
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Store command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Everything Cossa Store needs
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            These tools already exist in GROWTH. This page groups the relevant
            ones around the Store business instead of duplicating them.
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

                <h3 className="mt-4 text-base font-semibold">
                  {tool.title}
                </h3>

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
