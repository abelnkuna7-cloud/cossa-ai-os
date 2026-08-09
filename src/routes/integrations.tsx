import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  ExternalLink,
  FileSearch,
  KeyRound,
  Mail,
  Megaphone,
  Plug,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import type { ModuleStatus } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  component: Integrations,
  head: () => ({
    meta: [
      { title: "Integration Center — Cossa AI" },
      {
        name: "description",
        content:
          "Cossa's verified information sources and a truthful, approval-based integration activation catalogue.",
      },
    ],
  }),
});

type Group = "All" | "AI" | "Data" | "Productivity" | "Communication" | "Payments" | "Marketing";

type IntegrationRoute =
  | "/ai/cossa"
  | "/ai/knowledge"
  | "/ai/memory"
  | "/operations/business-intelligence";

interface CossaSource {
  name: string;
  description: string;
  status: ModuleStatus;
  to?: IntegrationRoute;
  href?: string;
  icon: typeof BrainCircuit;
}

interface Integration {
  name: string;
  group: Exclude<Group, "All">;
  blurb: string;
  short: string;
  activation: string;
  safeguards: string[];
}

const cossaSources: CossaSource[] = [
  {
    name: "Cossa AI",
    description:
      "Cossa's AI workspace. Guidance is reviewed by people before any commercial, legal, financial or customer-facing use.",
    status: "Testing",
    to: "/ai/cossa",
    icon: BrainCircuit,
  },
  {
    name: "Knowledge Base",
    description:
      "The Cossa-approved information store used to ground answers in reviewed business knowledge and cited sources.",
    status: "Live",
    to: "/ai/knowledge",
    icon: FileSearch,
  },
  {
    name: "AI Memory",
    description:
      "The workspace for reviewing retained Cossa operational context. It must never be treated as a source of unverified facts.",
    status: "Testing",
    to: "/ai/memory",
    icon: BrainCircuit,
  },
  {
    name: "Supabase operational data",
    description:
      "The configured application data layer for Cossa records. The current white-label access-control upgrade is still being prepared.",
    status: "Testing",
    to: "/operations/business-intelligence",
    icon: Database,
  },
  {
    name: "Groq inference",
    description:
      "Server-side model inference for supported Cossa AI work. Provider credentials stay outside the browser and usage remains credit-conscious.",
    status: "Testing",
    to: "/ai/cossa",
    icon: BrainCircuit,
  },
  {
    name: "Cossa Nexus Holdings website",
    description:
      "The official public Cossa reference. It is opened as a source; the platform does not silently copy or fabricate website content.",
    status: "Live",
    href: "https://cossanexusholdings.co.za",
    icon: ExternalLink,
  },
];

const integrations: Integration[] = [
  {
    name: "OpenAI",
    group: "AI",
    blurb: "Additional model-provider capability for a future authorised Cossa deployment.",
    short: "AI",
    activation:
      "Requires an approved Cossa provider account, a server-side implementation and a documented data-use scope.",
    safeguards: ["No browser API key", "Human review of output", "Approved data scope"],
  },
  {
    name: "Grok",
    group: "AI",
    blurb: "Additional model-provider capability for a future authorised Cossa deployment.",
    short: "GK",
    activation:
      "Requires an approved Cossa provider account, a server-side implementation and a documented data-use scope.",
    safeguards: ["No browser API key", "Human review of output", "Approved data scope"],
  },
  {
    name: "Anthropic",
    group: "AI",
    blurb: "Additional model-provider capability for a future authorised Cossa deployment.",
    short: "AN",
    activation:
      "Requires an approved Cossa provider account, a server-side implementation and a documented data-use scope.",
    safeguards: ["No browser API key", "Human review of output", "Approved data scope"],
  },
  {
    name: "Google Gemini",
    group: "AI",
    blurb: "Additional model-provider capability for a future authorised Cossa deployment.",
    short: "GG",
    activation:
      "Requires an approved Cossa provider account, a server-side implementation and a documented data-use scope.",
    safeguards: ["No browser API key", "Human review of output", "Approved data scope"],
  },
  {
    name: "Google Drive",
    group: "Data",
    blurb: "Future controlled import of authorised Cossa documents into the knowledge workflow.",
    short: "GD",
    activation:
      "Requires the data owner to approve specific folders, a scoped server-side connection and a documented retention rule.",
    safeguards: [
      "Owner-approved folders only",
      "Source attribution",
      "No automatic public sharing",
    ],
  },
  {
    name: "OneDrive",
    group: "Data",
    blurb:
      "Future controlled import of authorised Microsoft 365 documents into the knowledge workflow.",
    short: "OD",
    activation:
      "Requires the data owner to approve specific folders, a scoped server-side connection and a documented retention rule.",
    safeguards: [
      "Owner-approved folders only",
      "Source attribution",
      "No automatic public sharing",
    ],
  },
  {
    name: "Google Workspace",
    group: "Productivity",
    blurb: "Future access to authorised Cossa mail, calendar and document workflows.",
    short: "GW",
    activation:
      "Requires organisation approval, a limited permission scope and a server-side audit trail before any sync is built.",
    safeguards: ["Least-privilege access", "Audit trail", "No automatic sending"],
  },
  {
    name: "Microsoft 365",
    group: "Productivity",
    blurb: "Future access to authorised Cossa Outlook, Teams and OneDrive workflows.",
    short: "M3",
    activation:
      "Requires organisation approval, a limited permission scope and a server-side audit trail before any sync is built.",
    safeguards: ["Least-privilege access", "Audit trail", "No automatic sending"],
  },
  {
    name: "Google Calendar",
    group: "Productivity",
    blurb: "Future calendar visibility and appointment support after organisation approval.",
    short: "GC",
    activation:
      "Requires an authorised calendar account, a limited permission scope and a confirmed booking workflow.",
    safeguards: ["Consent before access", "No booking without approval", "Auditable activity"],
  },
  {
    name: "WhatsApp Business",
    group: "Communication",
    blurb: "Future approved customer-service and follow-up channel — not a bulk-message switch.",
    short: "WA",
    activation:
      "Requires a verified business channel, approved messaging process, valid contact consent and a server-side implementation.",
    safeguards: ["Consent-based messaging", "Human approval", "Respectful outreach"],
  },
  {
    name: "Meta (Facebook & Instagram)",
    group: "Communication",
    blurb: "Future authorised access to business pages and customer conversations.",
    short: "MT",
    activation:
      "Requires ownership approval, a scoped authorised connection and an approved customer-response process.",
    safeguards: ["Business-owner approval", "No unsolicited outreach", "Auditable activity"],
  },
  {
    name: "SMS",
    group: "Communication",
    blurb: "Future opt-in operational and customer communication channel.",
    short: "SM",
    activation:
      "Requires a Cossa-approved provider, sender identity, explicit contact consent and an approved messaging process.",
    safeguards: ["Consent-based messaging", "Opt-out support", "Human approval"],
  },
  {
    name: "Stripe",
    group: "Payments",
    blurb: "Future authorised payment capability for an approved Cossa merchant account.",
    short: "ST",
    activation:
      "Requires a verified merchant account, server-side payment implementation, test validation and finance approval.",
    safeguards: ["No card data in Cossa AI", "Test before production", "Finance approval"],
  },
  {
    name: "PayFast",
    group: "Payments",
    blurb: "Future authorised South African payment capability for an approved merchant account.",
    short: "PF",
    activation:
      "Requires a verified merchant account, server-side payment implementation, test validation and finance approval.",
    safeguards: ["No card data in Cossa AI", "Test before production", "Finance approval"],
  },
  {
    name: "Ozow",
    group: "Payments",
    blurb: "Future authorised instant-payment capability for an approved merchant account.",
    short: "OZ",
    activation:
      "Requires a verified merchant account, server-side payment implementation, test validation and finance approval.",
    safeguards: ["No payment credential in browser", "Test before production", "Finance approval"],
  },
  {
    name: "Yoco",
    group: "Payments",
    blurb: "Future authorised payment capability for an approved merchant account.",
    short: "YO",
    activation:
      "Requires a verified merchant account, server-side payment implementation, test validation and finance approval.",
    safeguards: ["No payment credential in browser", "Test before production", "Finance approval"],
  },
  {
    name: "Google Ads",
    group: "Marketing",
    blurb:
      "Future approved reporting and campaign management for an authorised advertiser account.",
    short: "GA",
    activation:
      "Requires advertiser ownership approval, a restricted data scope, a spend-control process and a server-side implementation.",
    safeguards: ["No spend without approval", "Budget guardrails", "Human campaign review"],
  },
  {
    name: "Google Analytics",
    group: "Marketing",
    blurb: "Future approved reporting for an authorised web-property account.",
    short: "G4",
    activation:
      "Requires property-owner approval, a restricted reporting scope and a server-side implementation.",
    safeguards: ["Read-only first", "Source-labelled reporting", "No fabricated metrics"],
  },
  {
    name: "Meta Ads",
    group: "Marketing",
    blurb:
      "Future approved reporting and campaign management for an authorised advertiser account.",
    short: "MA",
    activation:
      "Requires advertiser ownership approval, a restricted data scope, a spend-control process and a server-side implementation.",
    safeguards: ["No spend without approval", "Budget guardrails", "Human campaign review"],
  },
];

const GROUPS: Group[] = [
  "All",
  "AI",
  "Data",
  "Productivity",
  "Communication",
  "Payments",
  "Marketing",
];

const groupIcons = {
  AI: BrainCircuit,
  Data: Database,
  Productivity: KeyRound,
  Communication: Mail,
  Payments: WalletCards,
  Marketing: Megaphone,
} as const;

function Integrations() {
  const [group, setGroup] = useState<Group>("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    return integrations.filter((integration) => {
      const groupMatches = group === "All" || integration.group === group;
      const searchMatches =
        !query ||
        `${integration.name} ${integration.group} ${integration.blurb}`
          .toLowerCase()
          .includes(query);
      return groupMatches && searchMatches;
    });
  }, [group, search]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Plug className="h-4 w-4" />
              </div>
              <StatusBadge status="Development" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Integration <span className="text-gradient-gold">Center</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Cossa's approved information sources and external-connection roadmap. A provider is
              never described as connected until its authorised account, secure server-side link and
              required safeguards are active.
            </p>
          </div>
          <label className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
              placeholder="Search integrations"
            />
          </label>
        </div>
      </section>

      <section className="glass-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Verified Cossa sources
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              What the platform may use as Cossa context
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Open a source to review it. Cossa AI must distinguish recorded facts from analysis and
            ask when the required information is not available.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cossaSources.map((source) => (
            <CossaSourceCard key={source.name} source={source} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              External activation catalogue
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Not connected until verified
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            These cards are interactive activation checklists, not connection claims. Connecting any
            provider needs an authorised Cossa decision and implementation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GROUPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGroup(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                group === item
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="glass-card p-6 text-sm text-muted-foreground">
            No external integration matches that search.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((integration) => (
              <IntegrationCard
                key={integration.name}
                integration={integration}
                expanded={expanded === integration.name}
                onToggle={() =>
                  setExpanded((current) => (current === integration.name ? null : integration.name))
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CossaSourceCard({ source }: { source: CossaSource }) {
  const Icon = source.icon;
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{source.name}</h3>
          <StatusBadge status={source.status} className="text-[10px]" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{source.description}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
    </>
  );

  const className = "glass-card flex min-h-36 gap-3 p-4 transition-colors hover:border-primary/40";

  if (source.href) {
    return (
      <a href={source.href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={source.to!} className={className}>
      {content}
    </Link>
  );
}

function IntegrationCard({
  integration,
  expanded,
  onToggle,
}: {
  integration: Integration;
  expanded: boolean;
  onToggle: () => void;
}) {
  const GroupIcon = groupIcons[integration.group];
  const detailsId = `integration-${integration.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <article className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-sm font-semibold text-primary gold-glow">
          {integration.short}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{integration.name}</h3>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <GroupIcon className="h-3 w-3" />
            {integration.group}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{integration.blurb}</p>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
          <KeyRound className="h-3 w-3" /> Not connected
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={onToggle}
          className="shrink-0 border-primary/40 text-primary hover:bg-primary/10"
        >
          {expanded ? "Hide requirements" : "View requirements"}
          <ArrowRight
            className={cn("ml-1 h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
        </Button>
      </div>
      {expanded ? (
        <div
          id={detailsId}
          className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground"
        >
          <p className="font-medium text-foreground">Activation requirement</p>
          <p className="mt-1 leading-relaxed">{integration.activation}</p>
          <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{integration.safeguards.join(" · ")}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
