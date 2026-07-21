import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen, Users, TrendingUp, Search, Facebook, Handshake, Repeat, Cog,
  Heart, ArrowRight, Play, Clock, Star, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playbooks")({
  component: Playbooks,
  head: () => ({
    meta: [
      { title: "Business Playbooks — Cossa AI" },
      { name: "description", content: "Proven business playbooks — from first 100 customers to full automation — every one wired into Cossa AI." },
      { property: "og:title", content: "Business Playbooks — Cossa AI" },
    ],
  }),
});

const categories = ["All", "Growth", "Sales", "Marketing", "Automation", "Service"];

const playbooks = [
  { icon: Users, cat: "Growth", title: "How to Get Your First 100 Customers", steps: 12, time: "30 days", rating: 4.9, desc: "A field-tested playbook for reaching your first 100 paying customers." },
  { icon: Handshake, cat: "Sales", title: "How to Build a Sales System", steps: 18, time: "60 days", rating: 4.8, desc: "Pipeline, cadences, forecasting and coaching — end to end." },
  { icon: Search, cat: "Marketing", title: "How to Grow on Google", steps: 14, time: "90 days", rating: 4.7, desc: "SEO fundamentals, content briefs, and a publishing rhythm." },
  { icon: Facebook, cat: "Marketing", title: "How to Launch Facebook Ads", steps: 9, time: "14 days", rating: 4.6, desc: "From pixel setup to your first profitable campaign." },
  { icon: TrendingUp, cat: "Sales", title: "How to Close More Deals", steps: 11, time: "45 days", rating: 4.9, desc: "Discovery, objection handling and a closer's checklist." },
  { icon: Repeat, cat: "Growth", title: "How to Build a Referral Machine", steps: 8, time: "30 days", rating: 4.8, desc: "Systematic referral requests without feeling awkward." },
  { icon: Cog, cat: "Automation", title: "How to Automate Your Business", steps: 15, time: "60 days", rating: 4.7, desc: "Identify, prioritise and ship your first 10 automations." },
  { icon: Heart, cat: "Service", title: "How to Improve Customer Service", steps: 10, time: "30 days", rating: 4.8, desc: "SLA design, review flow and a repeatable service standard." },
];

function Playbooks() {
  const [cat, setCat] = useState("All");
  const shown = cat === "All" ? playbooks : playbooks.filter((p) => p.cat === cat);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <BookOpen className="h-4 w-4" />
              </div>
              <StatusBadge status="Design" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Business <span className="text-gradient-gold">Playbooks</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Proven step-by-step plays for growing your business — every one wired directly into Cossa AI so you can run it, not just read it.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              <Filter className="mr-1.5 h-4 w-4" /> Filter
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              Suggest a playbook
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <article key={p.title} className="glass-card group flex flex-col p-5 transition-all hover:border-primary/40">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <p.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{p.cat}</span>
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">{p.title}</h3>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{p.desc}</p>

            <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Play className="h-3 w-3" /> {p.steps} steps</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.time}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-primary"><Star className="h-3 w-3" /> {p.rating}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10">
                Preview
              </Button>
              <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                Run <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
