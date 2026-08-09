import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Map, Rocket } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { ModuleStatus } from "@/lib/modules";

export const Route = createFileRoute("/roadmap")({
  component: RoadmapPage,
  head: () => ({
    meta: [
      { title: "Cossa AI Development Roadmap" },
      { name: "description", content: "A factual delivery roadmap for the Cossa AI Business Operating System." },
      { property: "og:title", content: "Cossa AI Development Roadmap" },
      { property: "og:description", content: "Recorded Cossa AI capabilities, dependencies and next delivery work." },
    ],
  }),
});

interface Phase {
  id: number;
  name: string;
  status: ModuleStatus;
  timeline: string;
  summary: string;
  availableNow: string[];
  nextDependency: string;
}

const phases: Phase[] = [
  {
    id: 1,
    name: "Platform Foundation",
    status: "Live",
    timeline: "Current",
    summary: "The workspace shell, navigation, design system, notifications and settings are available in the live application.",
    availableNow: ["Workspace shell and sidebar", "Settings and brand controls", "Notifications and quick actions"],
    nextDependency: "Continue accessibility, reliability and visual quality checks as individual modules change.",
  },
  {
    id: 2,
    name: "CRM Intelligence",
    status: "Live",
    timeline: "Current",
    summary: "Cossa CRM records are stored in Supabase with organisation ownership and can be read by authorised Cossa AI workflows.",
    availableNow: ["Leads, customers and companies", "Pipeline, appointments and quotations", "Recorded CRM signals and analytics"],
    nextDependency: "Continue validating data quality and access controls before expanding white-label workspaces.",
  },
  {
    id: 3,
    name: "Marketing AI",
    status: "Testing",
    timeline: "Controlled rollout",
    summary: "Marketing specialists can prepare grounded drafts and planning briefs. Public profiles are listed, but account analytics, publishing and advertising remain disabled until authorised connections exist.",
    availableNow: ["AI Marketing Director", "Draft content and planning workflows", "Owner-reviewed social profile directory"],
    nextDependency: "Connect approved Meta, Google and other accounts with scoped server-side OAuth before any monitoring, publishing or spend.",
  },
  {
    id: 4,
    name: "Sales AI",
    status: "Testing",
    timeline: "Controlled rollout",
    summary: "Cossa AI can analyse authorised CRM records and Lead Hunter uses evidence rules, but every prospect and commercial decision still needs human verification.",
    availableNow: ["Sales Assistant and CRM analysis", "Lead Finder with buyer-fit controls", "Sales coaching and win-probability guidance"],
    nextDependency: "Run representative Lead Hunter checks and owner review before treating any research result as an outreach target.",
  },
  {
    id: 5,
    name: "Automation Engine",
    status: "Testing",
    timeline: "Controlled rollout",
    summary: "The Knowledge Base, prompt library, workflow planning and AI workforce handoffs are available as internal controlled records.",
    availableNow: ["Owner-editable shared Knowledge Base", "AI workforce handoff plans", "Prompt and workflow planning"],
    nextDependency: "Add approved integrations and audited execution controls before automating external changes.",
  },
  {
    id: 6,
    name: "NexDocs AI",
    status: "Planning",
    timeline: "Future phase",
    summary: "A proposed Cossa document workflow for drafting and controlled approval of quotes, proposals and contracts.",
    availableNow: [],
    nextDependency: "Approve document templates, retention rules, e-sign provider and payment requirements.",
  },
  {
    id: 7,
    name: "Marketplace",
    status: "Planning",
    timeline: "Future phase",
    summary: "A proposed catalogue for approved apps, templates and industry packs.",
    availableNow: [],
    nextDependency: "Define owner governance, third-party review and white-label tenancy requirements.",
  },
  {
    id: 8,
    name: "Voice AI",
    status: "Planning",
    timeline: "Future phase",
    summary: "A proposed voice capability. No live inbound or outbound voice agent is connected.",
    availableNow: [],
    nextDependency: "Approve consent, call recording, transcription, language and escalation policies.",
  },
  {
    id: 9,
    name: "Enterprise",
    status: "Planning",
    timeline: "Future phase",
    summary: "A proposed expansion for stronger roles, audit controls, multi-workspace access and ecosystem integrations.",
    availableNow: [],
    nextDependency: "Complete the current single Cossa workspace controls and document white-label compliance requirements.",
  },
];

function RoadmapPage() {
  const liveCount = phases.filter((phase) => phase.status === "Live").length;
  const controlledCount = phases.filter((phase) => phase.status === "Testing").length;

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
              A factual delivery view for Cossa Nexus Holdings. It shows what is live, what is in controlled testing and what still needs an approved connection or build — never invented percentages.
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 gold-glow">
            <div className="text-[10px] uppercase tracking-widest text-primary/90">Recorded status</div>
            <div className="mt-1 font-display text-2xl font-semibold text-gradient-gold">{liveCount} live / {controlledCount} controlled</div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" aria-hidden />
        <ol className="flex flex-col gap-5">
          {phases.map((phase) => {
            const live = phase.status === "Live";

            return (
              <li key={phase.id} className="relative pl-12">
                <div className="absolute left-0 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-background gold-glow">
                  {live ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-primary" />}
                </div>
                <article className="glass-card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-primary/80">Phase {phase.id}</span>
                    <h2 className="font-display text-xl font-semibold">{phase.name}</h2>
                    <StatusBadge status={phase.status} />
                    <span className="ml-auto text-xs text-muted-foreground">{phase.timeline}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{phase.summary}</p>
                  {phase.availableNow.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Available now</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {phase.availableNow.map((item) => (
                          <span key={item} className="rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-xs text-muted-foreground">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Next dependency: </span>{phase.nextDependency}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="glass-card flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Rocket className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold">Built for sustainable, controlled growth.</div>
          <p className="text-sm text-muted-foreground">
            Cossa only describes a provider or action as live after its authorised account, secure server-side connection and required controls are actually in place.
          </p>
        </div>
      </section>
    </div>
  );
}
