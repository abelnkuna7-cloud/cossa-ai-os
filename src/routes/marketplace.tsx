import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  Building2,
  FileStack,
  Gauge,
  Megaphone,
  Radar,
  Search,
  Sparkles,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ModuleStatus } from "@/lib/modules";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Cossa Marketplace — Cossa AI" },
      {
        name: "description",
        content:
          "The verified Cossa workspace catalogue: live tools, AI guidance and clearly marked future capabilities.",
      },
    ],
  }),
});

type Category =
  | "All"
  | "Sales"
  | "Marketing"
  | "Knowledge"
  | "Industry"
  | "Automation"
  | "NexDocs"
  | "Agency";

type MarketplaceRoute =
  | "/sales/lead-finder"
  | "/sales/customers"
  | "/opportunity-radar"
  | "/sales/forecast"
  | "/ai/prompts"
  | "/ai/knowledge"
  | "/marketing/ai-director"
  | "/construction-growth"
  | "/operations/nexdocs"
  | "/integrations";

interface Item {
  title: string;
  category: Exclude<Category, "All">;
  description: string;
  status: ModuleStatus;
  availability: string;
  to: MarketplaceRoute;
  icon: typeof Megaphone;
  featured?: boolean;
}

/**
 * This is an internal Cossa catalogue, not a public app store. Every item is
 * tied to an existing workspace route; ratings and install figures are omitted
 * until a real publishing and installation system exists.
 */
const items: Item[] = [
  {
    title: "Lead Hunter",
    category: "Sales",
    description:
      "Research buyer-fit organisations with service, sector, evidence and duplicate protection.",
    status: "Production",
    availability: "Live research workspace",
    to: "/sales/lead-finder",
    icon: Radar,
    featured: true,
  },
  {
    title: "Revenue Recovery Queue",
    category: "Sales",
    description:
      "Review only CRM-backed overdue follow-ups, quotations, opportunities and high-scoring new leads.",
    status: "Production",
    availability: "Verified CRM signals",
    to: "/opportunity-radar",
    icon: Gauge,
    featured: true,
  },
  {
    title: "Sales Forecast",
    category: "Sales",
    description:
      "Review open pipeline and probability-weighted value from current opportunity records.",
    status: "Live",
    availability: "Live CRM workspace",
    to: "/sales/forecast",
    icon: BarChart3,
  },
  {
    title: "Cossa Prompt Library",
    category: "Knowledge",
    description:
      "Create, approve and reuse operational prompts grounded in the Cossa business context.",
    status: "Live",
    availability: "Live knowledge workspace",
    to: "/ai/prompts",
    icon: Sparkles,
    featured: true,
  },
  {
    title: "Verified Knowledge Base",
    category: "Knowledge",
    description:
      "Store Cossa-approved facts and sources for use by Cossa AI. Human review remains required.",
    status: "Live",
    availability: "Live knowledge workspace",
    to: "/ai/knowledge",
    icon: BookOpenCheck,
  },
  {
    title: "AI Marketing Director",
    category: "Marketing",
    description:
      "Use Groq-powered strategy guidance. It does not publish, spend advertising budget or message customers without a connected account and approval.",
    status: "Production",
    availability: "AI guidance workspace",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },
  {
    title: "Construction Growth Workspace",
    category: "Industry",
    description:
      "Open the Cossa Nexus Construction growth solution and route prospective work into the CRM.",
    status: "Live",
    availability: "Cossa solution workspace",
    to: "/construction-growth",
    icon: Building2,
  },
  {
    title: "NexDocs AI Guidance",
    category: "NexDocs",
    description:
      "Use the document specialist for drafting guidance. E-signature, payment and document-template automation remain separate activation work.",
    status: "Production",
    availability: "AI guidance workspace",
    to: "/operations/nexdocs",
    icon: FileStack,
  },
  {
    title: "White-label Workspace Foundation",
    category: "Agency",
    description:
      "Organisation isolation, customer memberships and authorised provider connections for future client workspaces.",
    status: "Development",
    availability: "Foundation upgrade in progress",
    to: "/integrations",
    icon: Briefcase,
  },
  {
    title: "Workflow Guidance",
    category: "Automation",
    description:
      "Plan safe, approval-based automation steps before an external message, spend or data-changing action is permitted.",
    status: "Production",
    availability: "AI guidance workspace",
    to: "/integrations",
    icon: Workflow,
  },
  {
    title: "Customer Relationship Workspace",
    category: "Sales",
    description:
      "Review and manage customer records, then use real follow-up and quotation workflows.",
    status: "Live",
    availability: "Live CRM workspace",
    to: "/sales/customers",
    icon: Users,
  },
];

const CATEGORIES: Category[] = [
  "All",
  "Sales",
  "Marketing",
  "Knowledge",
  "Industry",
  "Automation",
  "NexDocs",
  "Agency",
];

function Marketplace() {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatches = category === "All" || item.category === category;
      const searchMatches =
        !query ||
        `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query);
      return categoryMatches && searchMatches;
    });
  }, [category, search]);
  const featured = list.filter((item) => item.featured);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Store className="h-4 w-4" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Cossa <span className="text-gradient-gold">Marketplace</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              The real Cossa workspace catalogue. Every item opens its matching tool; availability
              describes what it can do today.
            </p>
          </div>
          <label className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
              placeholder="Search available tools"
            />
          </label>
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Featured workspaces</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((item) => (
              <MarketplaceCard key={item.title} item={item} featured />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              category === item
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="glass-card p-6 text-sm text-muted-foreground">
          No verified Cossa workspace matches that search.
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <MarketplaceCard key={item.title} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}

function MarketplaceCard({ item, featured = false }: { item: Item; featured?: boolean }) {
  const Icon = item.icon;
  return (
    <article
      className={cn("glass-card flex flex-col gap-3 p-5", featured && "relative overflow-hidden")}
    >
      {featured && (
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      )}
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {item.category}
            </div>
            <StatusBadge status={item.status} className="text-[10px]" />
          </div>
          <h3 className="mt-1 font-semibold">{item.title}</h3>
        </div>
      </div>
      <p className="relative text-sm text-muted-foreground">{item.description}</p>
      <div className="relative mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-primary">{item.availability}</span>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 border-primary/40 text-primary hover:bg-primary/10"
        >
          <Link to={item.to}>
            Open <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
