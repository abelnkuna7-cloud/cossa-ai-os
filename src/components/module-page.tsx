import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Wrench,
  BarChart3,
  Bot,
  Database,
  Gauge,
  Layers,
  LineChart,
  MessageSquare,
  Plug,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { getModule, type ModuleItem } from "@/lib/modules";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PreviewGrid } from "@/components/widgets";

interface Props {
  to: string;
  children?: ReactNode;
}

const CATEGORY_PREVIEWS: Record<
  string,
  { icon: typeof Bot; title: string; description: string }[]
> = {
  marketing: [
    {
      icon: Sparkles,
      title: "AI content engine",
      description: "On-brand copy, images and videos generated in seconds.",
    },
    {
      icon: BarChart3,
      title: "Campaign analytics",
      description: "Cross-channel performance with attribution.",
    },
    {
      icon: Workflow,
      title: "Automations",
      description: "Trigger workflows from opens, clicks and replies.",
    },
    {
      icon: Users,
      title: "Audience builder",
      description: "Segments powered by AI intent signals.",
    },
    {
      icon: Plug,
      title: "Integrations",
      description: "Google, Meta, WhatsApp Business, email and SMS.",
    },
    {
      icon: ShieldCheck,
      title: "Brand safety",
      description: "AI checks every asset against brand guidelines.",
    },
  ],
  sales: [
    {
      icon: Users,
      title: "Unified contacts",
      description: "One record per person, enriched automatically.",
    },
    {
      icon: LineChart,
      title: "Pipeline & forecast",
      description: "AI-weighted deals and revenue prediction.",
    },
    {
      icon: MessageSquare,
      title: "Conversation intel",
      description: "Call notes, follow-ups and objection handling.",
    },
    {
      icon: Zap,
      title: "Next-best-action",
      description: "The AI tells reps what to do next, per deal.",
    },
    {
      icon: BarChart3,
      title: "Sales analytics",
      description: "Activity, conversion and velocity dashboards.",
    },
    { icon: Plug, title: "CRM sync", description: "Two-way sync with email, calendar and phone." },
  ],
  ai: [
    {
      icon: Bot,
      title: "Contextual chat",
      description: "Agents grounded in your data, docs and history.",
    },
    {
      icon: Database,
      title: "Memory & knowledge",
      description: "Shared long-term memory across every agent.",
    },
    {
      icon: Workflow,
      title: "Tool use",
      description: "Agents call Cossa modules and third-party APIs.",
    },
    {
      icon: ShieldCheck,
      title: "Guardrails",
      description: "Policy, PII redaction and approval flows.",
    },
    { icon: Zap, title: "Automations", description: "Turn any chat into a repeatable workflow." },
    {
      icon: Plug,
      title: "Model choice",
      description: "OpenAI, Grok and open models via one gateway.",
    },
  ],
  operations: [
    {
      icon: Layers,
      title: "Unified workspaces",
      description: "Projects, tasks, docs and files in one place.",
    },
    { icon: Gauge, title: "Live analytics", description: "Cross-module KPIs with AI diagnostics." },
    { icon: Workflow, title: "Automations", description: "Rule-based and AI-powered flows." },
    { icon: BarChart3, title: "Reports", description: "Scheduled, white-labelled and shareable." },
    { icon: Plug, title: "Integrations", description: "Google Workspace, Microsoft 365 and more." },
    {
      icon: ShieldCheck,
      title: "Audit trails",
      description: "Every action recorded for compliance.",
    },
  ],
  default: [
    {
      icon: Sparkles,
      title: "AI-native experience",
      description: "Built around Cossa AI from day one.",
    },
    { icon: Gauge, title: "Live insights", description: "Real-time metrics and diagnostics." },
    { icon: Workflow, title: "Automations", description: "Automate repetitive work end-to-end." },
    { icon: Plug, title: "Integrations", description: "Connects to the tools you already use." },
    {
      icon: ShieldCheck,
      title: "Enterprise-grade",
      description: "POPIA-ready, secure and auditable.",
    },
    { icon: BarChart3, title: "Analytics", description: "Dashboards and reports out of the box." },
  ],
};

function previewFor(to: string) {
  const key = to.split("/")[1] ?? "default";
  return CATEGORY_PREVIEWS[key] ?? CATEGORY_PREVIEWS.default;
}

export function ModulePage({ to, children }: Props) {
  const mod = getModule(to) as ModuleItem | undefined;
  if (!mod) return <div className="text-muted-foreground">Module not found.</div>;
  const Icon = mod.icon;
  const isLive = mod.status === "Live";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="glass-card relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Icon className="h-5 w-5" />
            </div>
            <StatusBadge status={mod.status} />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
              {mod.title}
            </h1>
            <p className="mt-2 text-lg text-primary/90">{mod.tagline}</p>
          </div>
          <p className="max-w-3xl text-muted-foreground">{mod.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              {isLive ? "Open" : "Notify me when ready"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              View roadmap
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <section className="glass-card p-6 md:col-span-1">
          <h3 className="font-display text-lg font-semibold">Business value</h3>
          <p className="mt-2 text-sm text-muted-foreground">{mod.value}</p>
        </section>
        <section className="glass-card p-6 md:col-span-2">
          <h3 className="font-display text-lg font-semibold">Key benefits</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {mod.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="glass-card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Future roadmap</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {mod.roadmap.map((r, i) => (
            <div key={r} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-widest text-primary/80">
                Milestone {i + 1}
              </div>
              <div className="mt-1 text-sm font-medium">{r}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">What you'll get</h3>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
            Preview
          </span>
        </div>
        <div className="mt-4">
          <PreviewGrid items={previewFor(mod.to)} />
        </div>
      </section>

      {children}
    </div>
  );
}
