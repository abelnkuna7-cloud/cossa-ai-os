import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Code2,
  FileStack,
  HardHat,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  Network,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
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
  component: GrowthHelpGuide,

  head: () => ({
    meta: [
      {
        title: "GROWTH User Guide — Cossa Nexus Holdings",
      },
      {
        name: "description",
        content:
          "Official GROWTH operating guide for Cossa Nexus Holdings, including company workspaces, AI employees, workflows, approvals, business separation and daily operating procedures.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface GuideLink {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
}

/* -------------------------------------------------------------------------- */
/* BUSINESS WORKSPACES                                                        */
/* -------------------------------------------------------------------------- */

const BUSINESS_WORKSPACES: GuideLink[] = [
  {
    title: "Cossa Store",
    description:
      "Products, suppliers, catalogue operations, dropshipping, affiliate marketing, ecommerce growth and Store AI tools.",
    to: "/businesses/store",
    icon: Store,
  },
  {
    title: "Cossa Tech",
    description:
      "Websites, software, automation, systems, technical solutions and technology delivery.",
    to: "/businesses/tech",
    icon: Code2,
  },
  {
    title: "Cossa Construction",
    description:
      "Construction leads, quotations, projects, tenders, documents, suppliers and construction operations.",
    to: "/businesses/construction",
    icon: HardHat,
  },
  {
    title: "Facility Services",
    description:
      "Facility-service leads, quotations, cleaning, maintenance, customers, schedules and service delivery.",
    to: "/businesses/facility-services",
    icon: Wrench,
  },
  {
    title: "NexDocs",
    description:
      "Professional documents, quotations, proposals, contracts, reports, templates and document workflows.",
    to: "/businesses/nexdocs",
    icon: FileStack,
  },
];

/* -------------------------------------------------------------------------- */
/* CORE PLATFORM LINKS                                                        */
/* -------------------------------------------------------------------------- */

const CORE_PLATFORM_LINKS: GuideLink[] = [
  {
    title: "Command Center",
    description:
      "Start here for the group-wide overview, priorities, opportunities, health and executive operating information.",
    to: "/command-center",
    icon: LayoutDashboard,
  },
  {
    title: "AI Company",
    description:
      "Manage AI departments, employees, missions, execution and workforce coordination.",
    to: "/ai/workforce",
    icon: Building2,
  },
  {
    title: "AI CEO",
    description:
      "Delegate an outcome when several employees or departments need to work together.",
    to: "/ai/ceo",
    icon: BrainCircuit,
  },
  {
    title: "Marketing & Growth",
    description:
      "Group-wide marketing strategy, campaigns, content, SEO, social media and advertising.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },
  {
    title: "Sales & Revenue",
    description:
      "CRM, leads, customers, opportunities, pipeline and revenue activity.",
    to: "/sales/crm",
    icon: TrendingUp,
  },
  {
    title: "Workflows",
    description:
      "Design repeatable business processes and coordinate cross-company execution.",
    to: "/ai/workflow",
    icon: Workflow,
  },
  {
    title: "Integrations",
    description:
      "Manage authorised external systems, accounts, publishing channels and connected services.",
    to: "/integrations",
    icon: Network,
  },
];

/* -------------------------------------------------------------------------- */
/* GUIDE SECTIONS                                                             */
/* -------------------------------------------------------------------------- */

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "structure",
    title: "How GROWTH is organised",
    description:
      "Use the platform from the company level down to the exact business capability you need.",
    icon: Building2,
    items: [
      "Company level is for group-wide management and executive control.",
      "Business workspaces are for subsidiary-specific work.",
      "Departments organise capabilities such as marketing, sales, operations and technology.",
      "AI employees perform defined specialist responsibilities.",
      "Workflows coordinate multiple stages when one task requires several capabilities.",
      "The owner remains in control of genuinely high-risk actions.",
    ],
  },
  {
    id: "business-rule",
    title: "Business separation rule",
    description:
      "Every piece of work should clearly belong to the correct Cossa business.",
    icon: CheckCircle2,
    items: [
      "Product sourcing and ecommerce operations belong primarily to Cossa Store.",
      "Website development and technical solutions belong primarily to Cossa Tech.",
      "Construction quotations, tenders and construction projects belong to Cossa Construction.",
      "Cleaning, maintenance and facility-service delivery belong to Facility Services.",
      "Professional document production belongs primarily to NexDocs.",
      "Marketing can support every business, but it must know which business it is promoting.",
      "Sales can support every business, but every lead and opportunity should have a clear business owner.",
    ],
  },
  {
    id: "ai-ceo",
    title: "When to use the AI CEO",
    description:
      "Use the AI CEO when you know the result you need but do not want to manually choose every employee.",
    icon: BrainCircuit,
    items: [
      "Give the AI CEO the business objective, target market and location where relevant.",
      "The AI CEO should identify the correct business, department and employees.",
      "The AI CEO should coordinate handoffs instead of making you manage every internal step.",
      "The AI CEO should escalate only genuine owner decisions.",
      "The AI CEO must not pretend an external action happened when no authorised execution exists.",
    ],
  },
  {
    id: "employees",
    title: "How to use AI employees",
    description:
      "Use the employee directory when you already know the capability you need.",
    icon: UsersRound,
    items: [
      'Search normal business language such as "flyer", "SEO", "supplier", "tender", "Facebook", "website", "product", "lead" or "advertising".',
      "Open an employee to see responsibilities, current task, status and recorded activity.",
      "Use specialists for focused work and the AI CEO for coordinated multi-employee work.",
      "Do not expect one employee to own unrelated business functions.",
    ],
  },
  {
    id: "workflows",
    title: "How workflows should work",
    description:
      "Use workflows for repeatable multi-step business processes.",
    icon: Workflow,
    items: [
      "Marketing workflows can move from research to strategy, content, creative, scheduling, publishing preparation and analysis.",
      "Store workflows can move from product research to supplier sourcing, pricing, merchandising, marketing and sales analysis.",
      "Construction workflows can move from lead intake to quotation, approval, project setup, delivery and follow-up.",
      "Facility Services workflows can move from enquiry to qualification, quotation, scheduling, service delivery and customer follow-up.",
      "Required workflow stages should not be silently skipped.",
    ],
  },
  {
    id: "approvals",
    title: "Owner approvals",
    description:
      "Normal internal work should continue without creating unnecessary approval bottlenecks.",
    icon: ShieldCheck,
    items: [
      "Research, analysis, drafting, planning and internal recommendations normally do not require approval.",
      "Content drafts, visual briefs and workflow planning normally do not require approval.",
      "Spending money requires owner control.",
      "Supplier orders require owner control.",
      "Contracts, legal commitments and signatures require owner control.",
      "Credentials, destructive actions and irreversible account changes require owner control.",
      "Sensitive external communication may require owner approval.",
    ],
  },
  {
    id: "integrity",
    title: "Data and execution integrity",
    description:
      "GROWTH must distinguish between recommendations, drafts, internal work and real external actions.",
    icon: ShieldCheck,
    items: [
      "Never invent customers.",
      "Never invent suppliers.",
      "Never invent prices or sales results.",
      "Never claim account access that has not been verified.",
      "Never claim publishing occurred unless an authorised integration performed it.",
      "Never claim money was spent unless the transaction actually happened.",
      "If an integration or information source is missing, state what is missing.",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* DAILY OPERATING STEPS                                                      */
/* -------------------------------------------------------------------------- */

const DAILY_STEPS = [
  {
    number: "01",
    title: "Open Command Center",
    description:
      "Review priorities, alerts, opportunities, current work and company status.",
  },
  {
    number: "02",
    title: "Choose the business",
    description:
      "Open Store, Tech, Construction, Facility Services or NexDocs before starting subsidiary-specific work.",
  },
  {
    number: "03",
    title: "Choose the capability",
    description:
      "Open the relevant AI employee, marketing tool, sales tool, workflow, document tool or operations area.",
  },
  {
    number: "04",
    title: "Delegate complex work",
    description:
      "Use the AI CEO when the result requires several employees or departments.",
  },
  {
    number: "05",
    title: "Review the output",
    description:
      "Check completed work, missing information, recommendations, approvals and the next action.",
  },
  {
    number: "06",
    title: "Approve only high-risk actions",
    description:
      "Keep normal safe internal work moving while retaining control over money, legal and irreversible actions.",
  },
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function GrowthHelpGuide() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
      {/* HERO */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
                <BookOpen className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                  Official operating guide
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Cossa Nexus Holdings
                </p>
              </div>
            </div>

            <h1 className="mt-5 font-display text-3xl font-semibold md:text-5xl">
              How to use{" "}
              <span className="text-gradient-gold">
                GROWTH
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              GROWTH is the operating platform for coordinating Cossa Nexus
              Holdings. Start with the business you want to work on, then open
              the relevant department, AI employee, tool or workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/command-center">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Open Command Center
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/ai/ceo">
                <BrainCircuit className="mr-1.5 h-4 w-4" />
                Ask AI CEO
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CORE PRINCIPLE */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Core operating principle
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Business → Capability → Execution
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              GROWTH should answer three questions quickly: which business are
              you working on, which capability do you need, and what is the next
              action?
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PrincipleCard
            number="1"
            title="Choose the business"
            description="Start with the subsidiary or group-wide function that owns the work."
          />

          <PrincipleCard
            number="2"
            title="Choose the capability"
            description="Open the relevant employee, department, tool or workflow."
          />

          <PrincipleCard
            number="3"
            title="Execute and review"
            description="Complete the safe work, review outputs and escalate only genuine owner decisions."
          />
        </div>
      </section>

      {/* BUSINESSES */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Business workspaces
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Start with the company you are working on
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Each operating business has its own workspace so its tools and AI
            capabilities do not become mixed with unrelated businesses.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BUSINESS_WORKSPACES.map((business) => (
            <GuideLinkCard
              key={business.to}
              item={business}
              actionLabel="Open business"
            />
          ))}
        </div>
      </section>

      {/* PLATFORM */}

      <section className="glass-card p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Group-wide platform
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Shared Cossa capabilities
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            These areas operate across the group and can support more than one
            business.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CORE_PLATFORM_LINKS.map((item) => (
            <GuideLinkCard
              key={item.to}
              item={item}
              actionLabel="Open"
              compact
            />
          ))}
        </div>
      </section>

      {/* DAILY WORKFLOW */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Recommended daily method
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Operate GROWTH in six steps
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAILY_STEPS.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-border/60 bg-card/40 p-5"
            >
              <span className="text-xs font-semibold tracking-[0.18em] text-primary">
                {step.number}
              </span>

              <h3 className="mt-3 text-base font-semibold">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* GUIDE DETAILS */}

      <section className="glass-card p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Operating guidelines
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Rules for using GROWTH correctly
          </h2>
        </div>

        <div className="mt-6 space-y-4">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">
                      {section.title}
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {section.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl border border-border/50 bg-background/30 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SEARCH EXAMPLES */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Search className="mt-1 h-5 w-5 text-primary" />

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Employee search
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Search using normal business language
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              You do not need to remember employee names.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "flyer",
            "SEO",
            "supplier",
            "tender",
            "Facebook",
            "website",
            "product",
            "lead",
            "advertising",
            "customer follow-up",
            "content",
            "automation",
          ].map((term) => (
            <span
              key={term}
              className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary"
            >
              {term}
            </span>
          ))}
        </div>

        <Button
          asChild
          variant="outline"
          className="mt-5 border-primary/40 text-primary"
        >
          <Link to="/ai/workforce">
            <UsersRound className="mr-1.5 h-4 w-4" />
            Open Employee Directory
          </Link>
        </Button>
      </section>

      {/* FINAL PRINCIPLE */}

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          GROWTH standard
        </p>

        <h2 className="mt-2 font-display text-2xl font-semibold">
          The platform should reduce searching, confusion and duplicate work.
        </h2>

        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">
          If a Store task requires hunting through Construction, or a
          Construction quotation requires searching unrelated Store tools, the
          organisation should be improved. Every important function should be
          reachable from the business that owns it.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/command-center">
              Start using GROWTH
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-primary/40 text-primary"
          >
            <Link to="/ai/workforce">
              Open AI Company
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function GuideLinkCard({
  item,
  actionLabel,
  compact = false,
}: {
  item: GuideLink;
  actionLabel: string;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={
        compact
          ? "group rounded-xl border border-border/60 bg-background/30 p-4 transition hover:border-primary/40 hover:bg-primary/5"
          : "group rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-primary/5"
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-base font-semibold">
        {item.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function PrincipleCard({
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
        {number}
      </div>

      <h3 className="mt-3 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
