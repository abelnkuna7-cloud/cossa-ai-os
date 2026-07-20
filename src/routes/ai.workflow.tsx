import { createFileRoute } from "@tanstack/react-router";
import {
  GitFork, Zap, GitBranch, Play, Bell, Users, MessageCircle, Mail,
  FileText, BarChart3, CheckCircle2, ArrowDown, Plus, Sparkles, Bot, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai/workflow")({
  component: WorkflowBuilder,
  head: () => ({
    meta: [
      { title: "Automation Center — Cossa AI" },
      { name: "description", content: "Visual drag-and-drop workflow builder for AI-powered automations across your business." },
    ],
  }),
});

const palette = [
  { group: "Triggers", tone: "text-info", items: [
    { icon: Play, label: "Form submitted" },
    { icon: Bell, label: "Schedule" },
    { icon: Users, label: "New lead" },
    { icon: MessageCircle, label: "WhatsApp received" },
  ]},
  { group: "Conditions", tone: "text-warning", items: [
    { icon: GitBranch, label: "If / Else" },
    { icon: CheckCircle2, label: "Field equals" },
  ]},
  { group: "Actions", tone: "text-primary", items: [
    { icon: Users, label: "CRM update" },
    { icon: Mail, label: "Send email" },
    { icon: MessageCircle, label: "Send WhatsApp" },
    { icon: FileText, label: "Create document" },
    { icon: Bell, label: "Notify team" },
  ]},
  { group: "AI", tone: "text-primary", items: [
    { icon: Bot, label: "AI step" },
    { icon: Sparkles, label: "AI decision" },
  ]},
  { group: "Approvals", tone: "text-success", items: [
    { icon: CheckCircle2, label: "Human approval" },
  ]},
];

const flow = [
  { kind: "Trigger", icon: Users, title: "New lead captured", detail: "From landing page form", tone: "border-info/40 bg-info/5" },
  { kind: "AI", icon: Bot, title: "AI score & enrich", detail: "Adds company data, scores fit & intent", tone: "border-primary/40 bg-primary/5" },
  { kind: "Condition", icon: GitBranch, title: "If score ≥ 80", detail: "Hot lead branch", tone: "border-warning/40 bg-warning/5" },
  { kind: "Action", icon: MessageCircle, title: "Send WhatsApp", detail: "Using 'Hot Lead Intro' template", tone: "border-primary/40 bg-primary/5" },
  { kind: "Approval", icon: CheckCircle2, title: "Rep review", detail: "Approve or edit before follow-up", tone: "border-success/40 bg-success/5" },
  { kind: "Action", icon: BarChart3, title: "Log to reports", detail: "Update pipeline & analytics", tone: "border-primary/40 bg-primary/5" },
];

function WorkflowBuilder() {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <GitFork className="h-4 w-4" />
              </div>
              <StatusBadge status="Planning" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Automation <span className="text-gradient-gold">Center</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Drag-and-drop workflows with triggers, conditions, actions, AI steps and approvals — connected to every module of Cossa AI.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              <Save className="mr-1.5 h-4 w-4" /> Save draft
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              <Zap className="mr-1.5 h-4 w-4" /> Publish
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Node palette */}
        <aside className="glass-card flex flex-col gap-5 p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Blocks</div>
            <p className="mt-1 text-xs text-muted-foreground">Drag any block into the canvas.</p>
          </div>
          {palette.map((p) => (
            <div key={p.group}>
              <div className={cn("mb-2 text-[10px] font-semibold uppercase tracking-widest", p.tone)}>{p.group}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {p.items.map((it) => (
                  <button key={it.label} className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-2 py-2 text-[11px] hover:border-primary/40 hover:bg-primary/5">
                    <it.icon className="h-3 w-3 text-primary" />
                    <span className="truncate">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <section className="glass-card min-h-[600px] p-6 md:p-10 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
            {flow.map((n, i) => (
              <div key={i} className="flex w-full flex-col items-center">
                <div className={cn("w-full rounded-xl border p-4 backdrop-blur-sm", n.tone)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 text-primary">
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{n.kind}</div>
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{n.detail}</div>
                    </div>
                  </div>
                </div>
                {i < flow.length - 1 && (
                  <ArrowDown className="my-1 h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </div>
            ))}
            <button className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10">
              <Plus className="h-3 w-3" /> Add step
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
