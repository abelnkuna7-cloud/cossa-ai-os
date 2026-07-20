import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plug, CheckCircle2, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  component: Integrations,
  head: () => ({
    meta: [
      { title: "Integrations — Cossa AI" },
      { name: "description", content: "Native integrations for the tools SMEs already use — from Google Workspace to WhatsApp Business and every major payment gateway." },
    ],
  }),
});

type Group = "All" | "AI" | "Data" | "Productivity" | "Communication" | "Payments" | "Marketing";
interface Integration { name: string; group: Exclude<Group, "All">; blurb: string; short: string; }

const integrations: Integration[] = [
  { name: "OpenAI", group: "AI", blurb: "GPT models via the Cossa AI Gateway.", short: "AI" },
  { name: "Grok", group: "AI", blurb: "xAI Grok models for real-time reasoning.", short: "GK" },
  { name: "Anthropic", group: "AI", blurb: "Claude models for long-context work.", short: "AN" },
  { name: "Google Gemini", group: "AI", blurb: "Gemini models for multimodal AI.", short: "GG" },

  { name: "Supabase", group: "Data", blurb: "Managed Postgres, auth and storage for Cossa AI.", short: "SB" },
  { name: "Google Drive", group: "Data", blurb: "Sync documents and folders into Cossa AI Knowledge.", short: "GD" },
  { name: "OneDrive", group: "Data", blurb: "Sync files from Microsoft 365 into Cossa AI.", short: "OD" },

  { name: "Google Workspace", group: "Productivity", blurb: "Gmail, Calendar, Drive, Docs and Contacts.", short: "GW" },
  { name: "Microsoft 365", group: "Productivity", blurb: "Outlook, Teams, OneDrive and Office.", short: "M3" },
  { name: "Google Calendar", group: "Productivity", blurb: "Two-way calendar sync and booking.", short: "GC" },
  { name: "Outlook", group: "Productivity", blurb: "Two-way calendar and email sync.", short: "OL" },
  { name: "Gmail", group: "Productivity", blurb: "Send and log email conversations.", short: "GM" },
  { name: "Google Business Profile", group: "Productivity", blurb: "Local presence, posts and reviews.", short: "GB" },

  { name: "WhatsApp Business", group: "Communication", blurb: "Campaigns, broadcasts and AI-assisted replies.", short: "WA" },
  { name: "Meta (Facebook & Instagram)", group: "Communication", blurb: "Ads, messages and page management.", short: "MT" },
  { name: "SMS Portal", group: "Communication", blurb: "Bulk SMS for SA carriers.", short: "SM" },

  { name: "Stripe", group: "Payments", blurb: "Global card payments and subscriptions.", short: "ST" },
  { name: "PayFast", group: "Payments", blurb: "South African payment gateway.", short: "PF" },
  { name: "Ozow", group: "Payments", blurb: "Instant EFT payments for SA.", short: "OZ" },
  { name: "Yoco", group: "Payments", blurb: "Card & online payments for SMEs.", short: "YO" },

  { name: "Google Ads", group: "Marketing", blurb: "Manage and optimise Google Ads.", short: "GA" },
  { name: "Google Analytics", group: "Marketing", blurb: "GA4 reporting inside Cossa AI.", short: "G4" },
  { name: "Meta Ads", group: "Marketing", blurb: "Facebook & Instagram Ads Manager.", short: "MA" },
];

const GROUPS: Group[] = ["All", "AI", "Data", "Productivity", "Communication", "Payments", "Marketing"];

function Integrations() {
  const [g, setG] = useState<Group>("All");
  const list = g === "All" ? integrations : integrations.filter((i) => i.group === g);

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
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Integration <span className="text-gradient-gold">Center</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              One AI brain, connected to everything. Cossa AI plugs into the tools your business already runs on.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground w-full max-w-xs">
            <Search className="h-4 w-4" /><span className="flex-1 truncate">Search integrations…</span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((x) => (
          <button
            key={x}
            onClick={() => setG(x)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              g === x
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {x}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((i) => (
          <article key={i.name} className="glass-card flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-sm font-semibold text-primary gold-glow">
                {i.short}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{i.name}</h3>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.group}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{i.blurb}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                <CheckCircle2 className="h-3 w-3" /> Integration Ready
              </span>
              <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                Connect <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
