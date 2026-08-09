import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  HardHat,
  Megaphone,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mission-control")({
  component: MissionControl,
  head: () => ({
    meta: [
      { title: "Mission Control — Cossa AI" },
      {
        name: "description",
        content:
          "Choose a Cossa business outcome and open the real, guided workspaces needed to pursue it.",
      },
      { property: "og:title", content: "Mission Control — Cossa AI" },
      {
        property: "og:description",
        content:
          "One guided journey to the available Cossa workspaces, with people retaining control of every action.",
      },
    ],
  }),
});

type Step = {
  icon: typeof Rocket;
  label: string;
  detail: string;
  to: string;
};

interface Mission {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  steps: Step[];
}

const missions: Mission[] = [
  {
    id: "leads",
    emoji: "🚀",
    title: "Get More Leads",
    desc: "Find verified buyer-fit organisations, then work the resulting records.",
    steps: [
      {
        icon: Search,
        label: "Define the buyer search",
        detail: "Use Lead Hunter with the exact service, area, sector and evidence rules.",
        to: "/sales/lead-finder",
      },
      {
        icon: Users,
        label: "Review captured leads",
        detail: "Confirm the evidence and contact route before any outreach.",
        to: "/sales/leads",
      },
      {
        icon: BarChart3,
        label: "Work the priority queue",
        detail: "Review only CRM-backed follow-up and opportunity signals.",
        to: "/opportunity-radar",
      },
    ],
  },
  {
    id: "sales",
    emoji: "💰",
    title: "Increase Sales",
    desc: "Focus the existing pipeline before spending on new acquisition.",
    steps: [
      {
        icon: BarChart3,
        label: "Review the live pipeline",
        detail: "Open the current opportunity board and confirm every deal's next step.",
        to: "/sales/pipeline",
      },
      {
        icon: Users,
        label: "Prioritise recovery work",
        detail: "Use the real follow-up and quote signals in the opportunity queue.",
        to: "/opportunity-radar",
      },
      {
        icon: FileText,
        label: "Prepare the right quotation",
        detail: "Draft a quotation only after the scope and decision route are confirmed.",
        to: "/sales/quotations",
      },
    ],
  },
  {
    id: "revenue",
    emoji: "📈",
    title: "Grow Revenue",
    desc: "Review customer records and follow-up work for real expansion opportunities.",
    steps: [
      {
        icon: Users,
        label: "Review current customers",
        detail: "Use recorded customer information, not estimated account value.",
        to: "/sales/customers",
      },
      {
        icon: CalendarDays,
        label: "Plan accountable follow-ups",
        detail: "Record a useful next action, owner and due date.",
        to: "/sales/follow-ups",
      },
      {
        icon: FileText,
        label: "Prepare a verified offer",
        detail: "Move to a quotation when the customer need and scope are evidenced.",
        to: "/sales/quotations",
      },
    ],
  },
  {
    id: "reviews",
    emoji: "⭐",
    title: "Improve Customer Feedback",
    desc: "Plan respectful, consent-aware customer feedback requests.",
    steps: [
      {
        icon: Users,
        label: "Review eligible customers",
        detail: "Confirm the customer relationship and contact permissions first.",
        to: "/sales/customers",
      },
      {
        icon: MessageCircle,
        label: "Draft a WhatsApp approach",
        detail:
          "Use the marketing workspace for approved message guidance; no broadcast is sent here.",
        to: "/marketing/whatsapp",
      },
      {
        icon: Bot,
        label: "Review the response plan",
        detail:
          "Use Cossa AI guidance, then make the human decision before publishing or replying.",
        to: "/ai/cossa",
      },
    ],
  },
  {
    id: "campaign",
    emoji: "📢",
    title: "Plan a Marketing Campaign",
    desc: "Create a controlled plan before any channel, budget or message is activated.",
    steps: [
      {
        icon: Megaphone,
        label: "Set the strategy",
        detail: "Use the Marketing Director to develop and review the campaign approach.",
        to: "/marketing/ai-director",
      },
      {
        icon: FileText,
        label: "Prepare on-brand content",
        detail: "Draft assets for human approval before external publication.",
        to: "/marketing/content-studio",
      },
      {
        icon: CalendarDays,
        label: "Record the campaign plan",
        detail: "Use the campaign workspace to keep the approved plan visible.",
        to: "/marketing/campaigns",
      },
    ],
  },
  {
    id: "automate",
    emoji: "🤖",
    title: "Plan an Automation",
    desc: "Map a safe, approval-based workflow before automation is switched on.",
    steps: [
      {
        icon: Zap,
        label: "Map the intended workflow",
        detail: "Use automation guidance to identify a clear trigger, owner and approval point.",
        to: "/ai/automation",
      },
      {
        icon: Rocket,
        label: "Review provider readiness",
        detail: "Check which authorised external connections are still required.",
        to: "/integrations",
      },
      {
        icon: BarChart3,
        label: "Measure before scaling",
        detail: "Use recorded operational data to evaluate the work after it is implemented.",
        to: "/operations/business-intelligence",
      },
    ],
  },
  {
    id: "seo",
    emoji: "🌐",
    title: "Improve SEO",
    desc: "Use Cossa SEO guidance and approved website information to plan practical work.",
    steps: [
      {
        icon: Search,
        label: "Review SEO priorities",
        detail: "Use the SEO workspace to research and plan; it does not promise rankings.",
        to: "/marketing/seo",
      },
      {
        icon: FileText,
        label: "Develop the content plan",
        detail: "Draft content for review using approved business information.",
        to: "/marketing/content-studio",
      },
      {
        icon: TrendingUp,
        label: "Connect approved measurement",
        detail: "Review Analytics activation requirements before reporting on website performance.",
        to: "/integrations",
      },
    ],
  },
  {
    id: "tenders",
    emoji: "💼",
    title: "Pursue Verified Opportunities",
    desc: "Research relevant work and prepare a response only after human qualification.",
    steps: [
      {
        icon: Search,
        label: "Research buyer-fit opportunities",
        detail: "Run Lead Hunter with strict service and sector requirements.",
        to: "/sales/lead-finder",
      },
      {
        icon: Users,
        label: "Qualify the opportunity",
        detail: "Record the need, expiry and decision route in the CRM before proceeding.",
        to: "/sales/opportunities",
      },
      {
        icon: FileText,
        label: "Prepare a controlled quote",
        detail: "A person verifies commercial terms before sending or submitting anything.",
        to: "/sales/quotations",
      },
    ],
  },
  {
    id: "construction",
    emoji: "🏗",
    title: "Manage Construction Work",
    desc: "Turn confirmed work into accountable project, task and document records.",
    steps: [
      {
        icon: HardHat,
        label: "Open the construction workspace",
        detail:
          "Review Cossa Nexus Construction growth work and route prospective projects responsibly.",
        to: "/construction-growth",
      },
      {
        icon: Rocket,
        label: "Create the project record",
        detail: "Record the approved project scope, owner and customer details.",
        to: "/operations/projects",
      },
      {
        icon: CheckCircle2,
        label: "Manage the work plan",
        detail: "Assign concrete tasks and due dates to the responsible team member.",
        to: "/operations/tasks",
      },
    ],
  },
  {
    id: "cleaning",
    emoji: "🧹",
    title: "Grow Facility Services",
    desc: "Research buyer needs, then manage the practical customer and follow-up work.",
    steps: [
      {
        icon: Search,
        label: "Find buyer-fit organisations",
        detail: "Set Lead Hunter to the exact facility service and practical service area.",
        to: "/sales/lead-finder",
      },
      {
        icon: Users,
        label: "Keep customer records clean",
        detail: "Maintain confirmed contact and service information in the CRM.",
        to: "/sales/customers",
      },
      {
        icon: CalendarDays,
        label: "Plan respectful follow-up",
        detail: "Record human-approved next actions rather than sending automatic messages.",
        to: "/sales/follow-ups",
      },
    ],
  },
  {
    id: "retail",
    emoji: "🏪",
    title: "Grow a Retail Business",
    desc: "Use recorded customer and campaign work to guide approved retail growth actions.",
    steps: [
      {
        icon: Users,
        label: "Review customer records",
        detail: "Use actual relationship data to understand customer-service work.",
        to: "/sales/customers",
      },
      {
        icon: Megaphone,
        label: "Plan the campaign",
        detail: "Create the plan before any advertising or messaging is activated.",
        to: "/marketing/campaigns",
      },
      {
        icon: BarChart3,
        label: "Review outcomes",
        detail: "Work from recorded platform data and connected, approved sources only.",
        to: "/operations/business-intelligence",
      },
    ],
  },
];

function MissionControl() {
  const [activeId, setActiveId] = useState(missions[0].id);
  const activeMission = missions.find((mission) => mission.id === activeId) ?? missions[0];
  const nextStep = activeMission.steps[0];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Rocket className="h-4 w-4" />
              </div>
              <StatusBadge status="Testing" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Mission <span className="text-gradient-gold">Control</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Choose a real business outcome, then open the exact Cossa workspaces for the next
              step. This guide does not automatically message customers, spend money or change
              records.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setActiveId(missions[0].id)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Rocket className="mr-1.5 h-4 w-4" /> Start with lead generation
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="glass-card p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">Choose a business outcome</h2>
            <p className="text-xs text-muted-foreground">
              Each selection creates a clickable, human-controlled route through existing Cossa
              workspaces.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {missions.map((mission) => {
              const isActive = mission.id === activeId;
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => setActiveId(mission.id)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    isActive
                      ? "border-primary/60 bg-primary/10 shadow-[0_0_25px_-5px_var(--gold)]"
                      : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <div className="text-2xl leading-none">{mission.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{mission.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{mission.desc}</p>
                  </div>
                  <ArrowRight
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <aside className="glass-card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Guided route
              </div>
              <h3 className="font-display text-base font-semibold">
                {activeMission.emoji} {activeMission.title}
              </h3>
            </div>
            <StatusBadge status="Testing" />
          </div>

          <ol className="space-y-3">
            {activeMission.steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <li key={step.label} className="relative flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border",
                        index === 0
                          ? "border-primary/60 bg-primary/15 text-primary gold-glow"
                          : "border-border/60 bg-card/40 text-muted-foreground",
                      )}
                    >
                      {index === 0 ? (
                        <StepIcon className="h-4 w-4" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </div>
                    {index < activeMission.steps.length - 1 ? (
                      <div className="mt-1 h-9 w-px bg-border/60" />
                    ) : null}
                  </div>
                  <Link to={step.to} className="group min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-1 text-sm font-medium group-hover:text-primary">
                      {step.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">
                Human-controlled work
              </span>
            </div>
            <p className="mt-1">
              The guide opens real workspaces. Recording a mission, automating handoffs and making
              external actions require the planned workflow and approval controls.
            </p>
          </div>

          <Button
            asChild
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Link to={nextStep.to}>
              <Rocket className="mr-1.5 h-4 w-4" /> Open next step
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
