import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap, UserPlus, FileText, CalendarDays, Bell, KanbanSquare, ListChecks,
  Users, Radar, MessageCircle, Sparkles, Search, PenTool, BarChart3, Brain,
  Megaphone, Files, GraduationCap,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/quick-actions")({
  component: QuickActionsPage,
  head: () => ({
    meta: [
      { title: "Quick Actions — Cossa AI" },
      { name: "description", content: "Shortcut launcher for the most common actions across Cossa AI." },
      { property: "og:title", content: "Quick Actions — Cossa AI" },
      { property: "og:description", content: "Do more in fewer clicks." },
    ],
  }),
});

interface Action {
  title: string;
  description: string;
  to: string;
  icon: typeof Zap;
}

interface Group {
  label: string;
  actions: Action[];
}

const GROUPS: Group[] = [
  {
    label: "Sales",
    actions: [
      { title: "Add lead", description: "Capture a new lead and score it.", to: "/sales/leads", icon: UserPlus },
      { title: "New opportunity", description: "Open a deal in the pipeline.", to: "/sales/opportunities", icon: Radar },
      { title: "Send quotation", description: "Draft and send a quote.", to: "/sales/quotations", icon: FileText },
      { title: "Book appointment", description: "Schedule a customer meeting.", to: "/sales/appointments", icon: CalendarDays },
      { title: "Log follow-up", description: "Queue a follow-up with SLA.", to: "/sales/follow-ups", icon: Bell },
      { title: "Add customer", description: "Create a customer record.", to: "/sales/customers", icon: Users },
      { title: "View pipeline", description: "Advance deals on the board.", to: "/sales/pipeline", icon: KanbanSquare },
    ],
  },
  {
    label: "Operations",
    actions: [
      { title: "New project", description: "Kick off a project workspace.", to: "/operations/projects", icon: KanbanSquare },
      { title: "Add task", description: "Assign a task with a due date.", to: "/operations/tasks", icon: ListChecks },
      { title: "Store document", description: "File a contract or SOP.", to: "/operations/documents", icon: Files },
      { title: "Open calendar", description: "Unified schedule of everything due.", to: "/operations/calendar", icon: CalendarDays },
      { title: "Business intelligence", description: "Cross-module analytics.", to: "/operations/business-intelligence", icon: BarChart3 },
    ],
  },
  {
    label: "AI",
    actions: [
      { title: "Chat with Cossa AI", description: "Ask your business anything.", to: "/ai/cossa", icon: Brain },
      { title: "AI Business Coach", description: "Daily coaching and focus.", to: "/ai/coach", icon: GraduationCap },
      { title: "Prompt Library", description: "Reuse proven prompts.", to: "/ai/prompts", icon: Sparkles },
      { title: "Knowledge Base", description: "Ground AI in your business.", to: "/ai/knowledge", icon: Search },
    ],
  },
  {
    label: "Marketing",
    actions: [
      { title: "Ask AI Marketing Director", description: "Strategy and channel mix.", to: "/marketing/ai-director", icon: Megaphone },
      { title: "Draft content", description: "Blog, ads, social — on brand.", to: "/marketing/content-studio", icon: PenTool },
      { title: "WhatsApp broadcast", description: "Reach customers on WhatsApp.", to: "/marketing/whatsapp", icon: MessageCircle },
      { title: "SEO center", description: "Keyword and site health.", to: "/marketing/seo", icon: Search },
    ],
  },
];

function QuickActionsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <Zap className="h-5 w-5" />
          </div>
          <StatusBadge status="Live" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Quick Actions</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One-click access to the most common jobs across sales, operations, AI and marketing.
        </p>
      </section>

      {GROUPS.map((g) => (
        <section key={g.label} className="glass-card p-6">
          <h3 className="font-display text-lg font-semibold">{g.label}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to + a.title}
                  to={a.to}
                  className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:gold-glow">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
