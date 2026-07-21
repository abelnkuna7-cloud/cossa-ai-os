import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Factory, HardHat, Building2, Sparkles, ShoppingBag, UtensilsCrossed, Home,
  Stethoscope, GraduationCap, Truck, Briefcase, ArrowRight, BarChart3, Bot,
  FileText, Workflow, LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/industries")({
  component: Industries,
  head: () => ({
    meta: [
      { title: "Industry Intelligence — Cossa AI" },
      { name: "description", content: "Cossa AI, tuned to your industry — with KPIs, dashboards, templates, prompts and workflows per vertical." },
      { property: "og:title", content: "Industry Intelligence — Cossa AI" },
    ],
  }),
});

const industries = [
  { id: "construction", icon: HardHat, name: "Construction", tag: "Sites & margin", kpis: ["Project margin", "RFI turnaround", "Snag closure"] },
  { id: "facility", icon: Building2, name: "Facility Management", tag: "SLA & compliance", kpis: ["SLA adherence", "Ticket TAT", "Site audits"] },
  { id: "cleaning", icon: Sparkles, name: "Cleaning", tag: "Contracts & routing", kpis: ["Contract retention", "Route density", "Quality score"] },
  { id: "retail", icon: ShoppingBag, name: "Retail", tag: "Footfall & basket", kpis: ["Basket size", "Footfall", "Stock turn"] },
  { id: "restaurants", icon: UtensilsCrossed, name: "Restaurants", tag: "Covers & reviews", kpis: ["Covers/day", "Table turn", "Reviews"] },
  { id: "real-estate", icon: Home, name: "Real Estate", tag: "Pipeline & listings", kpis: ["Time on market", "Listings", "Lead → viewing"] },
  { id: "healthcare", icon: Stethoscope, name: "Healthcare", tag: "Patient flow", kpis: ["Bookings", "No-shows", "Recall"] },
  { id: "education", icon: GraduationCap, name: "Education", tag: "Enrolment", kpis: ["Enrolment", "Retention", "NPS"] },
  { id: "logistics", icon: Truck, name: "Logistics", tag: "Fleet & OTIF", kpis: ["OTIF", "Cost/km", "Utilisation"] },
  { id: "professional", icon: Briefcase, name: "Professional Services", tag: "Billable & utilisation", kpis: ["Utilisation", "Realisation", "WIP"] },
];

const capabilities = [
  { icon: BarChart3, title: "KPIs & dashboards", desc: "Pre-built KPIs and executive dashboards for the vertical." },
  { icon: LayoutTemplate, title: "Vertical templates", desc: "Quotes, contracts, proposals and SOPs tuned to the industry." },
  { icon: Bot, title: "Prompt packs", desc: "Curated AI prompts for the tasks that matter in your sector." },
  { icon: Workflow, title: "Recommended workflows", desc: "Automations proven to work in your industry." },
  { icon: FileText, title: "Reports", desc: "Board-ready reports that reflect industry standards." },
  { icon: Factory, title: "Benchmarks", desc: "Anonymous benchmarks vs your industry peers (coming)." },
];

function Industries() {
  const [active, setActive] = useState("construction");
  const chosen = industries.find((i) => i.id === active)!;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Factory className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Industry <span className="text-gradient-gold">Intelligence</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Generic AI is a starting point. Cossa AI ships with industry-specific KPIs, templates, prompts and workflows so it speaks your language on day one.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="glass-card p-3">
          <ul className="space-y-1">
            {industries.map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => setActive(i.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                    active === i.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-transparent hover:border-primary/30 hover:bg-primary/5",
                  )}
                >
                  <div className={cn("grid h-8 w-8 place-items-center rounded-lg", active === i.id ? "bg-primary/15 text-primary" : "bg-card/60 text-muted-foreground")}>
                    <i.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.tag}</div>
                  </div>
                  <ArrowRight className={cn("h-3.5 w-3.5", active === i.id ? "text-primary" : "text-muted-foreground")} />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <chosen.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{chosen.name}</h2>
                <p className="text-xs text-muted-foreground">{chosen.tag}</p>
              </div>
              <Button className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                Enable this pack
              </Button>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Core KPIs</div>
              <div className="flex flex-wrap gap-2">
                {chosen.kpis.map((k) => (
                  <span key={k} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">{k}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.title} className="glass-card p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold">{c.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
