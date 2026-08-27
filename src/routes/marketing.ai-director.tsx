import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Megaphone,
  MessageSquareText,
  Search,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { SpecialistChat } from "@/components/specialist-chat";
import { StatusBadge } from "@/components/status-badge";
import { consolidatedGrowthIntelligence } from "@/lib/consolidated-growth-intelligence";
import { getModule } from "@/lib/modules";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

const TO = "/marketing/ai-director";
const mod = getModule(TO)!;

export const Route = createFileRoute("/marketing/ai-director")({
  component: MarketingGrowthHub,
  head: () => ({
    meta: [
      { title: `${mod.title} — Cossa AI` },
      { name: "description", content: mod.description },
      { property: "og:title", content: `${mod.title} — Cossa AI` },
      { property: "og:description", content: mod.description },
    ],
  }),
});

const operationalTools = [
  {
    title: "Content Calendar",
    description:
      "Plan and schedule real content-calendar records without claiming publication occurred.",
    to: "/marketing/content-calendar" as const,
    icon: CalendarClock,
    countKey: "contentItems" as const,
  },
  {
    title: "Social Media",
    description: "Manage real social-post records, publication evidence and performance metrics.",
    to: "/marketing/social" as const,
    icon: MessageSquareText,
    countKey: "socialPosts" as const,
  },
  {
    title: "Referrals",
    description: "Track referrers, referred customers, conversion and recorded commissions.",
    to: "/marketing/referrals" as const,
    icon: UsersRound,
    countKey: "referrals" as const,
  },
  {
    title: "Google Reviews",
    description: "Prepare tracked review invites and preserve truthful delivery/click evidence.",
    to: "/marketing/reviews" as const,
    icon: Star,
    countKey: "reviewRequests" as const,
  },
];

const growthTools = [
  { title: "Campaigns", to: "/marketing/campaigns" as const, icon: Megaphone },
  { title: "Content Studio", to: "/marketing/content-studio" as const, icon: Sparkles },
  { title: "SEO", to: "/marketing/seo" as const, icon: Search },
];

function MarketingGrowthHub() {
  const intelligence = useQuery({
    queryKey: ["consolidated-growth-intelligence"],
    queryFn: consolidatedGrowthIntelligence,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const counts = intelligence.data?.marketingOperations;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Megaphone className="h-5 w-5" />
            </div>
            <StatusBadge status={workspaceRuntimeStatus()} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Marketing & Growth
          </h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            One operating hub for the restored Growth marketing records and the newer Cossa AI
            strategy layer. Real records remain separate from AI recommendations and external
            publication claims.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationalTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              to={tool.to}
              className="glass-card group block p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-display text-2xl font-semibold">
                  {counts ? counts[tool.countKey] : "—"}
                </span>
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold">{tool.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
              <div className="mt-4 text-xs font-medium text-primary">Open live records →</div>
            </Link>
          );
        })}
      </section>

      <section className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="font-display text-lg font-semibold">Growth tools</h2>
            <p className="text-sm text-muted-foreground">
              Campaign, content and search strategy workspaces.
            </p>
          </div>
          {growthTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                to={tool.to}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon className="h-4 w-4 text-primary" />
                {tool.title}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            AI Director
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold">
            Reason over the marketing operation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cossa AI remains the strategy and reasoning interface. It does not replace the
            operational records above.
          </p>
        </div>
        <SpecialistChat to={TO} />
      </section>
    </div>
  );
}
