import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Store, Megaphone, Users, Building2, Sparkles, Workflow, FileStack,
  Briefcase, Download, Star, ArrowRight, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Marketplace — Cossa AI" },
      { name: "description", content: "Templates, industry packs, prompts and automations to extend Cossa AI." },
    ],
  }),
});

type Category = "All" | "Marketing" | "CRM" | "Industry" | "Prompts" | "Automations" | "Business" | "NexDocs" | "Agency";

interface Item {
  title: string;
  category: Exclude<Category, "All">;
  description: string;
  installs: string;
  rating: number;
  icon: typeof Megaphone;
  featured?: boolean;
}

const items: Item[] = [
  { title: "SME Marketing Playbook", category: "Marketing", description: "12 campaigns, 40 templates and 3 automations for South African SMEs.", installs: "1.2k", rating: 4.9, icon: Megaphone, featured: true },
  { title: "Modern CRM Starter", category: "CRM", description: "Pipeline, stages, activities and dashboards pre-configured.", installs: "980", rating: 4.8, icon: Users },
  { title: "Construction Industry Pack", category: "Industry", description: "Quotes, projects, safety docs and site reports for construction SMEs.", installs: "410", rating: 4.7, icon: Building2 },
  { title: "AI Prompt Vault", category: "Prompts", description: "200+ curated prompts across sales, marketing and ops.", installs: "3.4k", rating: 4.9, icon: Sparkles, featured: true },
  { title: "Overdue Invoice Autopilot", category: "Automations", description: "3-step reminder cadence with WhatsApp and email.", installs: "760", rating: 4.8, icon: Workflow },
  { title: "NexDocs Proposal Templates", category: "NexDocs", description: "12 winning proposal templates with e-sign.", installs: "540", rating: 4.7, icon: FileStack },
  { title: "Agency Client Reporting", category: "Agency", description: "White-label monthly reports for agency retainers.", installs: "320", rating: 4.6, icon: Briefcase },
  { title: "Business Health Baseline", category: "Business", description: "Pre-built scoring, dashboards and improvement plans.", installs: "660", rating: 4.8, icon: Star },
  { title: "Retail Industry Pack", category: "Industry", description: "POS integrations, inventory dashboards and loyalty flows.", installs: "290", rating: 4.5, icon: Building2 },
  { title: "Winter Campaign Kit", category: "Marketing", description: "Ads, emails, WhatsApp and landing page — ready to launch.", installs: "150", rating: 4.7, icon: Megaphone },
  { title: "Sales Coach Prompt Pack", category: "Prompts", description: "Role-play, objection handling and call reviews.", installs: "820", rating: 4.8, icon: Sparkles },
  { title: "Legal & HR Doc Pack", category: "NexDocs", description: "Contracts, offers and policies compliant with SA law.", installs: "270", rating: 4.6, icon: FileStack },
];

const CATS: Category[] = ["All", "Marketing", "CRM", "Industry", "Prompts", "Automations", "Business", "NexDocs", "Agency"];

function Marketplace() {
  const [cat, setCat] = useState<Category>("All");
  const list = cat === "All" ? items : items.filter((i) => i.category === cat);
  const featured = items.filter((i) => i.featured);

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
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Cossa <span className="text-gradient-gold">Marketplace</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Templates, industry packs, prompt packs and automations — curated to extend Cossa AI for your business.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground w-full max-w-xs">
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate">Search the marketplace…</span>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Featured</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {featured.map((f) => (
            <article key={f.title} className="glass-card relative overflow-hidden p-6">
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-primary/90">{f.category}</div>
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-primary"><Star className="h-3 w-3 fill-primary" /> {f.rating}</span>
                    <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> {f.installs}</span>
                  </div>
                </div>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                  Install <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              cat === c
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <article key={i.title} className="glass-card flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.category}</div>
                <h3 className="font-semibold">{i.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{i.description}</p>
            <div className="mt-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary"><Star className="h-3 w-3 fill-primary" /> {i.rating}</span>
                <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> {i.installs}</span>
              </div>
              <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                View
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
