import { createFileRoute, Link } from "@tanstack/react-router";

import {
  BarChart3,
  BrainCircuit,
  Calculator,
  ClipboardList,
  FileSearch,
  FileText,
  HardHat,
  Megaphone,
  Search,
  Target,
  TrendingUp,
  UsersRound,
  Workflow,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/businesses/construction")({
  component: CossaConstructionWorkspace,

  head: () => ({
    meta: [
      {
        title: "Cossa Construction — GROWTH",
      },
      {
        name: "description",
        content:
          "Cossa Construction operating workspace for leads, quotations, tenders, projects, customers, documents, marketing, AI workforce and construction operations.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* CONSTRUCTION TOOLS                                                         */
/* -------------------------------------------------------------------------- */

const CONSTRUCTION_TOOLS = [
  {
    title: "Construction AI Team",
    description:
      "Open the AI employees supporting construction sales, tender research, quotations, documents, marketing, projects and operations.",
    to: "/ai/workforce",
    icon: UsersRound,
  },

  {
    title: "Lead Hunter",
    description:
      "Research potential construction customers, companies and commercial opportunities for Cossa Construction.",
    to: "/sales/lead-finder",
    icon: Target,
  },

  {
    title: "CRM & Customers",
    description:
      "Manage construction prospects, customers, opportunities, follow-ups and sales activity.",
    to: "/sales/crm",
    icon: TrendingUp,
  },

  {
    title: "Quotations",
    description:
      "Prepare and manage construction quotations, pricing information and customer proposals.",
    to: "/sales/quotations",
    icon: Calculator,
  },

  {
    title: "Tender Research",
    description:
      "Research relevant tender opportunities and prepare information for evaluation before bidding.",
    to: "/ai/workforce",
    icon: FileSearch,
  },

  {
    title: "Construction Documents",
    description:
      "Prepare proposals, project documents, scopes of work, reports and supporting construction documentation.",
    to: "/operations/documents",
    icon: FileText,
  },

  {
    title: "Projects",
    description:
      "Manage construction projects, tasks, responsibilities, deadlines and operational delivery.",
    to: "/operations/projects",
    icon: HardHat,
  },

  {
    title: "Construction Marketing",
    description:
      "Plan campaigns, service promotion and customer acquisition strategies for Cossa Construction.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },

  {
    title: "SEO & Search",
    description:
      "Improve construction service visibility and research search opportunities for customer acquisition.",
    to: "/marketing/seo",
    icon: Search,
  },

  {
    title: "Content Studio",
    description:
      "Create construction service content, website copy, promotional material and campaign assets.",
    to: "/marketing/content-studio",
    icon: BrainCircuit,
  },

  {
    title: "Sales Analytics",
    description:
      "Review available construction sales, pipeline and commercial performance information.",
    to: "/sales/analytics",
    icon: BarChart3,
  },

  {
    title: "Construction Workflows",
    description:
      "Create repeatable workflows for enquiries, quotations, projects, documents and operational execution.",
    to: "/ai/workflow",
    icon: Workflow,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function CossaConstructionWorkspace() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* -------------------------------------------------------------------- */}
      {/* HERO                                                                 */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <HardHat className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Cossa Nexus Holdings
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Cossa{" "}
            <span className="text-gradient-gold">
              Construction
            </span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One operating workspace for Cossa Construction. Find opportunities,
            manage customers, prepare quotations, research tenders, coordinate
            projects, produce documents and grow the construction business from
            one command centre.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/sales/lead-finder">
                <Target className="mr-1.5 h-4 w-4" />
                Find Construction Leads
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/sales/quotations">
                <Calculator className="mr-1.5 h-4 w-4" />
                Create Quotation
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/operations/projects">
                <HardHat className="mr-1.5 h-4 w-4" />
                Open Projects
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* OPERATING AREAS                                                      */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ConstructionArea
          title="Win Work"
          description="Leads, customer acquisition, opportunities and tender research."
          icon={Target}
        />

        <ConstructionArea
          title="Quote"
          description="Scope customer requirements and prepare professional quotations."
          icon={Calculator}
        />

        <ConstructionArea
          title="Deliver"
          description="Manage projects, tasks, documents and construction execution."
          icon={HardHat}
        />

        <ConstructionArea
          title="Grow"
          description="Marketing, SEO, customer relationships and revenue growth."
          icon={TrendingUp}
        />
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* COMMAND CENTRE                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Construction command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Everything Cossa Construction needs
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            This workspace groups the GROWTH tools that matter to the
            construction business. The objective is simple: find work, convert
            opportunities, deliver professionally and build repeat business.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CONSTRUCTION_TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                to={tool.to}
                className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  {tool.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>

                <span className="mt-4 inline-flex text-xs font-medium text-primary">
                  Open tool →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* CONSTRUCTION PIPELINE                                                */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Construction operating pipeline
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              From opportunity to completed project
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Construction opportunities should move through a controlled
              process so leads, quotations and projects do not disappear
              between disconnected tools.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <ProcessStep
            number="01"
            title="Find"
            description="Identify customers, tenders and construction opportunities."
          />

          <ProcessStep
            number="02"
            title="Qualify"
            description="Check the customer requirement, value, feasibility and fit."
          />

          <ProcessStep
            number="03"
            title="Quote"
            description="Prepare scope, pricing and a professional quotation."
          />

          <ProcessStep
            number="04"
            title="Win"
            description="Follow up, negotiate and convert the opportunity into work."
          />

          <ProcessStep
            number="05"
            title="Deliver"
            description="Plan and execute the project with controlled tasks and documentation."
          />

          <ProcessStep
            number="06"
            title="Retain"
            description="Follow up after delivery and pursue repeat or referral business."
          />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* BUSINESS PRIORITIES                                                  */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-4 lg:grid-cols-3">
        <PriorityCard
          title="Revenue First"
          description="Prioritise qualified opportunities that can become paying construction work instead of collecting leads with no commercial path."
          icon={TrendingUp}
        />

        <PriorityCard
          title="Professional Delivery"
          description="Keep quotations, scopes, project records and customer communication organised from enquiry through completion."
          icon={HardHat}
        />

        <PriorityCard
          title="Repeatable Operations"
          description="Turn successful construction processes into workflows so the company can scale without rebuilding the operating method for every project."
          icon={Workflow}
        />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUPPORT COMPONENTS                                                         */
/* -------------------------------------------------------------------------- */

function ConstructionArea({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof HardHat;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
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

function ProcessStep({
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
        {number}
      </span>

      <h3 className="mt-2 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PriorityCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof HardHat;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-base font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
