import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Map, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import type { ModuleStatus } from "@/lib/modules";

export const Route = createFileRoute("/roadmap")({
  component: RoadmapPage,
  head: () => ({
    meta: [
      { title: "Cossa AI Development Roadmap" },
      { name: "description", content: "The nine-phase delivery roadmap for the Cossa AI Business Operating System." },
      { property: "og:title", content: "Cossa AI Development Roadmap" },
      { property: "og:description", content: "Nine phases of delivery for the AI Business Operating System built for South African SMEs." },
    ],
  }),
});

interface Phase {
  id: number;
  name: string;
  status: ModuleStatus;
  progress: number;
  timeline: string;
  summary: string;
  deliverables: string[];
}

const phases: Phase[] = [
  { id: 1, name: "Platform Foundation", status: "Live", progress: 100, timeline: "Q1 — Q2 2026",
    summary: "Design system, workspace shell, module architecture, roadmap, reusable components, notifications, quick actions and settings.",
    deliverables: ["Design system & tokens", "Workspace shell + sidebar", "Notifications & quick actions", "Settings & brand"] },
  { id: 2, name: "CRM Intelligence", status: "Live", progress: 95, timeline: "Q2 2026",
    summary: "AI-native CRM: leads, pipeline, customers, companies, appointments, quotations, forecast and lead scoring — all live on Supabase.",
    deliverables: ["Contacts & companies", "Pipeline & deals", "Appointments & quotes", "Forecast & lead scoring"] },
  { id: 3, name: "Marketing AI", status: "Live", progress: 80, timeline: "Q3 2026",
    summary: "AI Marketing Director plus streaming AI specialists for SEO, Google Ads, Meta Ads, social, email, WhatsApp, content, landing pages, brand, competitors, trends, keywords and monitoring.",
    deliverables: ["AI Marketing Director", "SEO & Ads specialists", "Content & landing pages", "Brand & competitor intel"] },
  { id: 4, name: "Sales AI", status: "Live", progress: 90, timeline: "Q3 — Q4 2026",
    summary: "AI Sales Assistant, sales coaching, win-probability advisor and lead finder — plus live CRM analytics and forecasting.",
    deliverables: ["AI Sales Assistant", "Sales coaching", "Win probability", "Forecast & analytics"] },
  { id: 5, name: "Automation Engine", status: "Live", progress: 70, timeline: "Q4 2026",
    summary: "Workflow builder specialist, prompt library, knowledge base, AI automations advisor and cross-module orchestration foundations.",
    deliverables: ["Workflow builder", "Prompt library", "Knowledge base", "Ops automation"] },
  { id: 6, name: "NexDocs AI", status: "Planning", progress: 0, timeline: "Q1 2027",
    summary: "The Cossa document engine — proposals, quotes, contracts and e-sign, powered by AI drafting.",
    deliverables: ["Doc templates", "AI drafting", "E-sign", "Payments"] },
  { id: 7, name: "Marketplace", status: "Planning", progress: 0, timeline: "Q2 2027",
    summary: "Third-party apps, templates and industry packs. Extend the platform with vertical solutions.",
    deliverables: ["App directory", "Templates", "Industry packs", "Developer program"] },
  { id: 8, name: "Voice AI", status: "Planning", progress: 0, timeline: "Q3 2027",
    summary: "Hands-free voice interface, inbound/outbound voice agents and real-time transcription.",
    deliverables: ["Voice mode", "Inbound agents", "Transcription", "Real-time translation"] },
  { id: 9, name: "Enterprise", status: "Planning", progress: 0, timeline: "2028",
    summary: "SSO, roles, audit, multi-workspace, industry-specific compliance and Cossa Nexus ecosystem integrations.",
    deliverables: ["SSO & roles", "Audit & compliance", "Multi-workspace", "Ecosystem APIs"] },
];

function RoadmapPage() {
  const overall = Math.round(phases.reduce((a, p) => a + p.progress, 0) / phases.length);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="glass-card relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Map className="h-5 w-5" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold">Cossa AI Development Roadmap</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              We're building the AI Business Operating System that South African SMEs will rely on every day. Nine phases, one platform.
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 gold-glow">
            <div className="text-[10px] uppercase tracking-widest text-primary/90">Overall Progress</div>
            <div className="mt-1 font-display text-3xl font-semibold text-gradient-gold">{overall}%</div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" aria-hidden />
        <ol className="flex flex-col gap-5">
          {phases.map((p) => {
            const done = p.progress === 100;
            return (
              <li key={p.id} className="relative pl-12">
                <div className="absolute left-0 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-background gold-glow">
                  {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-primary" />}
                </div>
                <div className="glass-card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-primary/80">Phase {p.id}</span>
                    <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                    <StatusBadge status={p.status} />
                    <span className="ml-auto text-xs text-muted-foreground">{p.timeline}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={p.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-primary tabular-nums w-10 text-right">{p.progress}%</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.deliverables.map((d) => (
                      <span key={d} className="rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="glass-card flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Rocket className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold">Built for the next decade, not the next update.</div>
          <p className="text-sm text-muted-foreground">
            Every module is architected to plug into Supabase, OpenAI, Grok, Google, Meta, WhatsApp Business, PayFast, Ozow and Yoco without a redesign.
          </p>
        </div>
      </section>
    </div>
  );
}
