import { createFileRoute, Link } from "@tanstack/react-router";

import {
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
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

export const Route = createFileRoute("/businesses/facility-services")({
  component: CossaFacilityServicesWorkspace,

  head: () => ({
    meta: [
      {
        title: "Cossa Facility Services — GROWTH",
      },
      {
        name: "description",
        content:
          "Cossa Facility Services operating workspace for leads, customers, quotations, service operations, projects, documents, marketing, AI workforce and business growth.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* OPERATING TOOLS                                                            */
/* -------------------------------------------------------------------------- */

const FACILITY_TOOLS = [
  {
    title: "Facility Services AI Team",
    description:
      "Open the AI workforce supporting customer acquisition, marketing, documents, sales, operations and company coordination.",
    to: "/ai/workforce",
    icon: UsersRound,
  },

  {
    title: "Find Customers",
    description:
      "Research potential commercial, residential and organisational customers that may need facility services.",
    to: "/sales/lead-finder",
    icon: Target,
  },

  {
    title: "CRM & Customers",
    description:
      "Manage enquiries, prospects, existing customers, follow-ups and commercial opportunities.",
    to: "/sales/crm",
    icon: TrendingUp,
  },

  {
    title: "Quotations",
    description:
      "Prepare and manage quotations for facility-management and maintenance service opportunities.",
    to: "/sales/quotations",
    icon: FileText,
  },

  {
    title: "Service Projects",
    description:
      "Coordinate customer work, maintenance projects, operational tasks and service delivery.",
    to: "/operations/projects",
    icon: Wrench,
  },

  {
    title: "Tasks",
    description:
      "Track operational actions, customer work, follow-ups and internal responsibilities.",
    to: "/operations/tasks",
    icon: ClipboardCheck,
  },

  {
    title: "Calendar",
    description:
      "Coordinate scheduled work, customer appointments, operational deadlines and service activities.",
    to: "/operations/calendar",
    icon: CalendarDays,
  },

  {
    title: "Documents",
    description:
      "Prepare proposals, service scopes, customer documents, reports and supporting business documentation.",
    to: "/operations/documents",
    icon: FileText,
  },

  {
    title: "Facility Marketing",
    description:
      "Create customer-acquisition campaigns and promote Cossa Facility Services professionally.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },

  {
    title: "SEO & Search",
    description:
      "Improve search visibility for facility, maintenance and related services in target markets.",
    to: "/marketing/seo",
    icon: Search,
  },

  {
    title: "Content Studio",
    description:
      "Create service descriptions, promotional content, social copy and customer-facing marketing material.",
    to: "/marketing/content-studio",
    icon: BrainCircuit,
  },

  {
    title: "Sales Analytics",
    description: "Review available pipeline, customer and sales performance information.",
    to: "/sales/analytics",
    icon: BarChart3,
  },

  {
    title: "Service Workflows",
    description:
      "Build repeatable workflows for enquiries, quotations, customer onboarding, service delivery and follow-up.",
    to: "/ai/workflow",
    icon: Workflow,
  },

  {
    title: "Business Intelligence",
    description:
      "Review available operational and commercial intelligence to identify problems and growth opportunities.",
    to: "/operations/business-intelligence",
    icon: Sparkles,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function CossaFacilityServicesWorkspace() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* -------------------------------------------------------------------- */}
      {/* HERO                                                                 */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <Building2 className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Cossa Nexus Holdings
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Cossa <span className="text-gradient-gold">Facility Services</span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One operating workspace for Cossa Facility Services. Customer acquisition, quotations,
            service delivery, projects, marketing, documents and AI support are organised around the
            complete customer lifecycle.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/sales/lead-finder">
                <Target className="mr-1.5 h-4 w-4" />
                Find Customers
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link to="/sales/quotations">
                <FileText className="mr-1.5 h-4 w-4" />
                Create Quotation
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-primary/40 text-primary">
              <Link to="/operations/projects">
                <Wrench className="mr-1.5 h-4 w-4" />
                Service Operations
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* BUSINESS MODEL                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperatingArea
          title="Acquire"
          description="Find businesses, organisations and customers that need reliable facility services."
          icon={Target}
        />

        <OperatingArea
          title="Convert"
          description="Qualify requirements, prepare quotations and convert opportunities into customers."
          icon={TrendingUp}
        />

        <OperatingArea
          title="Deliver"
          description="Coordinate service work, maintenance tasks, projects and customer requirements."
          icon={Wrench}
        />

        <OperatingArea
          title="Retain"
          description="Maintain customer relationships and build recurring service revenue."
          icon={ShieldCheck}
        />
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* COMMAND CENTRE                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Facility Services command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Run the business from one workspace
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The tools below connect customer acquisition with service delivery. The goal is not only
            to win individual jobs, but to build long-term customer relationships and recurring
            facility-service revenue.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FACILITY_TOOLS.map((tool) => {
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

                <h3 className="mt-4 text-base font-semibold">{tool.title}</h3>

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
      {/* CUSTOMER LIFECYCLE                                                   */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Workflow className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Customer lifecycle
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              From prospect to recurring customer
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Facility Services becomes stronger when every enquiry follows a repeatable commercial
              and operational process instead of being handled as an isolated job.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <ProcessStep
            number="01"
            title="Find"
            description="Identify organisations and customers with a facility-service need."
          />

          <ProcessStep
            number="02"
            title="Qualify"
            description="Understand the property, service requirement, urgency and commercial opportunity."
          />

          <ProcessStep
            number="03"
            title="Quote"
            description="Prepare a clear service scope and professional quotation."
          />

          <ProcessStep
            number="04"
            title="Schedule"
            description="Plan approved service work, responsibilities and required resources."
          />

          <ProcessStep
            number="05"
            title="Deliver"
            description="Complete and record the service work professionally."
          />

          <ProcessStep
            number="06"
            title="Retain"
            description="Follow up and convert suitable customers into repeat or recurring contracts."
          />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* REVENUE PRIORITIES                                                   */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-4 lg:grid-cols-3">
        <PriorityCard
          title="Recurring Revenue"
          description="Where appropriate, move beyond once-off work toward scheduled maintenance and recurring facility-service relationships."
          icon={TrendingUp}
        />

        <PriorityCard
          title="Fast Response"
          description="Facility-service leads can become urgent quickly. Enquiries, quotations and follow-ups need clear ownership and fast movement."
          icon={ClipboardCheck}
        />

        <PriorityCard
          title="Service Quality"
          description="Winning the first job matters, but reliable delivery, documentation and follow-up are what create repeat customers."
          icon={ShieldCheck}
        />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUPPORT COMPONENTS                                                         */
/* -------------------------------------------------------------------------- */

function OperatingArea({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Wrench;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <h3 className="mt-3 text-sm font-semibold">{title}</h3>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
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

      <h3 className="mt-2 text-sm font-semibold">{title}</h3>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
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
  icon: typeof Wrench;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-base font-semibold">{title}</h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
