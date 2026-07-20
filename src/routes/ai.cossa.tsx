import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain, Send, Paperclip, Mic, Sparkles, Plus, Search, Pin, Star, History,
  Folder, Zap, FileText, TrendingUp, Users, Megaphone, Handshake, Workflow,
  MessageSquare, Bot, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai/cossa")({
  component: AiChatWorkspace,
  head: () => ({
    meta: [
      { title: "Cossa AI — AI Chat Workspace" },
      { name: "description", content: "Chat with Cossa AI — the AI co-pilot for your business, with memory, tools and full context." },
      { property: "og:title", content: "Cossa AI — AI Chat Workspace" },
    ],
  }),
});

const categories = [
  { label: "Strategy", icon: Brain, count: 12 },
  { label: "Marketing", icon: Megaphone, count: 28 },
  { label: "Sales", icon: Handshake, count: 34 },
  { label: "Operations", icon: Workflow, count: 15 },
  { label: "Finance", icon: TrendingUp, count: 9 },
  { label: "People", icon: Users, count: 6 },
];

const pinned = [
  { title: "Q3 Growth Strategy", when: "Yesterday", cat: "Strategy" },
  { title: "Winter Campaign Brief", when: "2 days ago", cat: "Marketing" },
  { title: "Enterprise Pricing Model", when: "1 week ago", cat: "Sales" },
];

const recent = [
  { title: "Draft proposal — Kruger Logistics", when: "12 min ago" },
  { title: "Analyse last month's ad spend", when: "1 hr ago" },
  { title: "Weekly leadership report", when: "3 hr ago" },
  { title: "Follow-up sequence: dormant customers", when: "Yesterday" },
  { title: "Job spec: Senior Sales Rep", when: "2 days ago" },
  { title: "SEO plan for landing pages", when: "3 days ago" },
];

const suggested = [
  { icon: TrendingUp, prompt: "Summarise this week's business performance and top 3 risks." },
  { icon: Handshake, prompt: "Draft follow-up emails for every deal in Proposal stage." },
  { icon: Megaphone, prompt: "Propose 5 marketing campaigns for the next 90 days." },
  { icon: FileText, prompt: "Turn my last customer call into a proposal." },
  { icon: Users, prompt: "Which customers are at risk of churning and why?" },
  { icon: Workflow, prompt: "Build an automation for overdue invoice reminders." },
];

const workflows = [
  { title: "Daily Business Briefing", desc: "Overnight scan + morning briefing on WhatsApp." },
  { title: "Lead Follow-up Autopilot", desc: "AI drafts and sends follow-ups for every new lead." },
  { title: "Weekly Board Pack", desc: "Auto-generated leadership review every Monday." },
];

const quickActions = [
  { label: "New Chat", icon: Plus },
  { label: "Upload Files", icon: Paperclip },
  { label: "Voice Mode", icon: Mic },
  { label: "Browse Prompts", icon: Sparkles },
];

function AiChatWorkspace() {
  const [input, setInput] = useState("");
  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[280px_1fr_320px]">
      {/* LEFT: History + categories */}
      <aside className="glass-card flex h-[calc(100vh-9rem)] min-h-[640px] flex-col p-4">
        <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> <span>Search conversations…</span>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Folder className="h-3 w-3" /> Categories
          </div>
          <ul className="space-y-0.5">
            {categories.map((c) => (
              <li key={c.label}>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-primary/10">
                  <c.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className="text-[10px] text-muted-foreground">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Pin className="h-3 w-3" /> Pinned
          </div>
          <ul className="space-y-1">
            {pinned.map((p) => (
              <li key={p.title} className="rounded-md border border-border/60 bg-card/40 px-2.5 py-2 text-xs">
                <div className="truncate font-medium">{p.title}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{p.cat}</span><span>{p.when}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 min-h-0 flex-1">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <History className="h-3 w-3" /> Recent
          </div>
          <ul className="space-y-0.5 overflow-y-auto pr-1">
            {recent.map((r) => (
              <li key={r.title}>
                <button className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-primary/10">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* CENTER: Chat surface */}
      <section className="glass-card flex h-[calc(100vh-9rem)] min-h-[640px] flex-col">
        <header className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
            <Brain className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-semibold">Cossa AI</h1>
              <StatusBadge status="Development" />
            </div>
            <p className="text-xs text-muted-foreground">Context: Cossa Nexus Holdings · Business memory active</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Bot className="h-3 w-3 text-primary" /> Model: Cossa-Gold
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">
              How can I help run your business today?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask about revenue, marketing, sales, operations or people. Attach files, upload data, or run a saved workflow.
            </p>

            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              {suggested.map((s) => (
                <button key={s.prompt} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-foreground/90">{s.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickActions.map((q) => (
                <button key={q.label} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary">
                  <q.icon className="h-3 w-3" /> {q.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card/60 p-2 focus-within:border-primary/50">
              <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Attach">
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Cossa AI…  (functionality coming soon)"
                rows={1}
                className="min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Voice">
                <Mic className="h-4 w-4" />
              </button>
              <Button size="icon" className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Cossa AI can access your business data, files and integrations. Guardrails and approvals coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT: Business context + workflows */}
      <aside className="glass-card flex h-[calc(100vh-9rem)] min-h-[640px] flex-col gap-5 p-5">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Business Context</div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-sm font-semibold">Cossa Nexus Holdings</div>
            <p className="mt-1 text-xs text-muted-foreground">
              South African SME · Multi-brand · 42 team members · R48M ARR target · Growth stage.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {["Strategy", "Marketing", "Sales", "Ops"].map((t) => (
                <span key={t} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Zap className="h-3 w-3" /> Recommended Workflows
          </div>
          <ul className="space-y-2">
            {workflows.map((w) => (
              <li key={w.title} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{w.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{w.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Star className="h-3 w-3" /> Recent AI Tasks
          </div>
          <ul className="space-y-1.5 text-xs">
            <li className={cn("rounded-lg border border-border/60 bg-card/40 p-2")}>
              <div className="flex items-center justify-between"><span>Drafted 12 follow-up emails</span><span className="text-success">Done</span></div>
            </li>
            <li className="rounded-lg border border-border/60 bg-card/40 p-2">
              <div className="flex items-center justify-between"><span>Analysed Q2 ad performance</span><span className="text-success">Done</span></div>
            </li>
            <li className="rounded-lg border border-border/60 bg-card/40 p-2">
              <div className="flex items-center justify-between"><span>Generated 5 landing page variants</span><span className="text-primary">Review</span></div>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
