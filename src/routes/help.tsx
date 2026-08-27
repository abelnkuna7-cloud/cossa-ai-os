import { createFileRoute, Link } from "@tanstack/react-router";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileText,
  HardHat,
  Lightbulb,
  Megaphone,
  Network,
  PackageSearch,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/help")({
  component: HelpCentre,

  head: () => ({
    meta: [
      {
        title: "Help Centre — GROWTH",
      },
      {
        name: "description",
        content:
          "GROWTH Help Centre for Cossa Nexus Holdings. Learn how to use the company command centre, business workspaces, AI workforce, AI tools, workflows, integrations and operational controls.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface HelpSection {
  title: string;
  description: string;
  icon: LucideIcon;
  items: readonly string[];
}

interface QuickLink {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

/* -------------------------------------------------------------------------- */
/* HELP CONTENT                                                               */
/* -------------------------------------------------------------------------- */

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "1. Getting started",
    description: "Start from the company level before opening individual AI tools.",
    icon: Sparkles,

    items: [
      "Open the Command Center to see the overall company operating environment.",
      "Use the left sidebar to move between businesses, revenue functions, operations and platform controls.",
      "Use the top company navigation for departments, employees, workflows, activity and integrations.",
      "Use Ask Cossa AI when you need general business assistance.",
      "Use AI CEO when you want to delegate an outcome instead of manually choosing each employee.",
    ],
  },

  {
    title: "2. Company navigation",
    description: "GROWTH separates company structure from individual AI capabilities.",
    icon: Building2,

    items: [
      "Company opens the group-wide Command Center.",
      "Departments opens the organisational structure inside AI Workforce.",
      "Employees opens the AI employee directory.",
      "Workflows opens coordinated workforce execution.",
      "Activity shows recorded employee work status.",
      "Integrations manages authorised external systems and connected services.",
    ],
  },

  {
    title: "3. Business workspaces",
    description:
      "Each operating business should have its own command centre instead of dumping everything into one page.",
    icon: Store,

    items: [
      "Cossa Store manages products, suppliers, merchandising, dropshipping, marketing and ecommerce operations.",
      "Cossa Tech manages websites, software, automation and technical delivery.",
      "Cossa Construction manages leads, quotations, projects, tenders, documents and construction operations.",
      "Facility Services manages customers, quotations, recurring services, leads and service delivery.",
      "NexDocs manages document workflows, proposals, quotations, contracts and document production.",
    ],
  },

  {
    title: "4. AI Workforce",
    description: "AI Workforce is the group-wide employee operating system.",
    icon: UsersRound,

    items: [
      "Use Command Centre to delegate objectives to the AI CEO.",
      "Use Departments to find the correct operating team.",
      "Use Employees to search by name, responsibility or normal business language.",
      "Use Workflows to inspect and run coordinated missions.",
      "Use Activity to see which employees are working, assigned, available or need attention.",
      "Use Control Room for workforce synchronisation, safeguards and audit history.",
    ],
  },

  {
    title: "5. AI CEO",
    description:
      "AI CEO should be used when the outcome matters more than manually choosing the employee sequence.",
    icon: BrainCircuit,

    items: [
      "Describe the business result you want.",
      "Include the business, target market, location and important restrictions.",
      "Let the CEO coordinate the appropriate workforce stages.",
      "Review saved employee outputs before external execution.",
      "Escalate real owner decisions only when necessary.",
    ],
  },

  {
    title: "6. AI tools",
    description: "Use specialised AI tools when you already know the capability you need.",
    icon: Bot,

    items: [
      "Cossa AI handles general company assistance.",
      "AI Business Consultant handles strategy and diagnosis.",
      "AI Sales Assistant supports sales and conversion activity.",
      "AI Customer Support assists customer-service work.",
      "AI CRM Specialist supports leads and pipeline management.",
      "AI Automation handles repeatable processes.",
      "AI Project Manager assists project planning and coordination.",
      "Knowledge Base, Prompt Library and AI Memory manage reusable company knowledge.",
      "Finance and HR assistants support administration.",
    ],
  },

  {
    title: "7. Workflows",
    description: "There are two different workflow concepts in GROWTH.",
    icon: Workflow,

    items: [
      "AI Workforce Workflows run coordinated employee missions.",
      "Workflow Builder is the advanced workflow-design tool.",
      "Do not skip blocked employee stages.",
      "Automatic execution should stop when a genuine approval checkpoint is reached.",
      "Saved outputs should remain reviewable after each completed stage.",
    ],
  },

  {
    title: "8. Marketing and growth",
    description:
      "Use Marketing & Growth for campaigns, SEO, content, social media and advertising planning.",
    icon: Megaphone,

    items: [
      "Website intelligence should use verified website information.",
      "Content production should not invent products, prices, customers or results.",
      "Creative work should include clear production requirements when asset-generation capability is unavailable.",
      "Paid-media recommendations should not spend money without owner approval.",
      "Publishing should only be claimed when a real authorised integration executed it.",
    ],
  },

  {
    title: "9. Integrations",
    description: "Integrations are what turn internal AI planning into verified external actions.",
    icon: Network,

    items: [
      "Connect only authorised business accounts.",
      "Do not give AI tools unrestricted credentials when limited permissions are sufficient.",
      "A missing integration must be reported instead of simulated.",
      "Publishing, messaging, payments and account changes should only be reported as completed when the integration confirms execution.",
    ],
  },

  {
    title: "10. Owner approval and safety",
    description: "Routine internal work should move quickly. High-risk actions remain controlled.",
    icon: ShieldCheck,

    items: [
      "Normal research, analysis, drafting, planning and internal handoffs can proceed without unnecessary approval.",
      "Spending money requires owner control.",
      "Supplier orders require owner control.",
      "Contracts and binding legal commitments require owner control.",
      "Credentials and sensitive access changes require owner control.",
      "Destructive or irreversible changes require owner control.",
      "Sensitive external communications should be reviewed when the consequences are significant.",
    ],
  },

  {
    title: "11. Troubleshooting",
    description:
      "When something does not work, identify whether the problem is navigation, workforce state, provider execution or missing integration.",
    icon: AlertTriangle,

    items: [
      "Refresh the page and workforce data first.",
      "Check whether the required employee is active.",
      "Check whether an earlier workflow stage is still pending or accepted.",
      "Review the latest recorded failure instead of relying only on historical failure counts.",
      "Check integrations when external execution is missing.",
      "Check provider or rate-limit errors when an AI employee fails to produce an output.",
      "Do not bypass recorded workflow state by manually pretending a stage completed.",
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/* QUICK LINKS                                                                */
/* -------------------------------------------------------------------------- */

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Command Center",
    description: "Open the group-wide operating overview.",
    to: "/command-center",
    icon: Building2,
  },

  {
    title: "AI Workforce",
    description: "Departments, employees, missions and execution.",
    to: "/ai/workforce",
    icon: UsersRound,
  },

  {
    title: "AI CEO",
    description: "Delegate a result to the company AI leadership layer.",
    to: "/ai/ceo",
    icon: BrainCircuit,
  },

  {
    title: "Workflow Builder",
    description: "Design advanced repeatable workflows.",
    to: "/ai/workflow",
    icon: Workflow,
  },

  {
    title: "Integrations",
    description: "Manage connected systems and authorised accounts.",
    to: "/integrations",
    icon: Network,
  },

  {
    title: "Marketing & Growth",
    description: "Open campaigns, SEO, social and growth tools.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* BUSINESS LINKS                                                             */
/* -------------------------------------------------------------------------- */

const BUSINESS_LINKS: QuickLink[] = [
  {
    title: "Cossa Store",
    description: "Products, suppliers, merchandising, dropshipping and ecommerce.",
    to: "/businesses/store",
    icon: Store,
  },

  {
    title: "Cossa Tech",
    description: "Websites, software, automation and technical delivery.",
    to: "/businesses/tech",
    icon: PackageSearch,
  },

  {
    title: "Cossa Construction",
    description: "Construction leads, quotations, projects and tenders.",
    to: "/businesses/construction",
    icon: HardHat,
  },

  {
    title: "Facility Services",
    description: "Service customers, quotations, jobs and recurring operations.",
    to: "/businesses/facility-services",
    icon: Wrench,
  },

  {
    title: "NexDocs",
    description: "Document production, proposals, quotations and document workflows.",
    to: "/businesses/nexdocs",
    icon: FileText,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function HelpCentre() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <CircleHelp className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            GROWTH operating guide
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Help <span className="text-gradient-gold">Centre</span>
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Learn how to operate GROWTH as the Cossa Nexus Holdings business operating system. This
            guide explains where to work, when to use AI employees, when to use specialised AI
            tools, how workflows work and which actions remain owner-controlled.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/command-center">
                <Building2 className="mr-1.5 h-4 w-4" />
                Open Command Center
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link
                to="/ai/workforce"
                search={{
                  view: "command",
                  department: "all",
                }}
              >
                <UsersRound className="mr-1.5 h-4 w-4" />
                Open AI Workforce
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FIRST STEPS                                                        */}
      {/* ------------------------------------------------------------------ */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Recommended starting point
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Use GROWTH from company level down
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              Do not start by opening random AI tools. Start with the business objective, then move
              to the correct business workspace, department or AI employee.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StepCard
            number="1"
            title="Choose the business"
            description="Decide whether the work belongs to Store, Tech, Construction, Facility Services, NexDocs or group-wide operations."
          />

          <StepCard
            number="2"
            title="Define the outcome"
            description="State the result you need instead of only naming a tool."
          />

          <StepCard
            number="3"
            title="Delegate correctly"
            description="Use AI CEO for coordinated outcomes or a specialist tool for focused work."
          />

          <StepCard
            number="4"
            title="Review execution"
            description="Check outputs, approvals, integrations and recorded completion before relying on the result."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* QUICK LINKS                                                        */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Quick access
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">Main GROWTH controls</h2>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <HelpLinkCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BUSINESS WORKSPACES                                                */}
      {/* ------------------------------------------------------------------ */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 h-5 w-5 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Businesses
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Open the correct company workspace
            </h2>

            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
              Business workspaces organise the tools relevant to each subsidiary so normal
              operations do not become mixed together.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BUSINESS_LINKS.map((item) => (
            <HelpLinkCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DETAILED GUIDE                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Full operating guide
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">How to use GROWTH</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {HELP_SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
                className="rounded-2xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold">{section.title}</h3>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* OPERATING PRINCIPLE                                                */}
      {/* ------------------------------------------------------------------ */}

      <section className="glass-card border-primary/20 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Core operating principle
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Plan fast. Verify facts. Control real-world risk.
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              GROWTH should automate ordinary internal work aggressively, but it must never pretend
              an external action happened. Research, drafting, analysis, planning and coordination
              should move quickly. Money, contracts, credentials, supplier commitments, destructive
              changes and irreversible external actions remain controlled.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SUPPORT ACTIONS                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Still unsure?
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Ask the system instead of guessing
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              If you do not know which employee, department or workflow should handle a task,
              delegate the outcome through Cossa AI or the AI CEO.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link to="/ai/cossa">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Ask Cossa AI
              </Link>
            </Button>

            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/ai/ceo">
                <BrainCircuit className="mr-1.5 h-4 w-4" />
                Ask AI CEO
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
        {number}
      </div>

      <h3 className="mt-3 text-sm font-semibold">{title}</h3>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function HelpLinkCard({ item }: { item: QuickLink }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
    </Link>
  );
}
