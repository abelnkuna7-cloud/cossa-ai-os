import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Bot,
  BrainCircuit,
  Code2,
  FileText,
  Globe2,
  Megaphone,
  Search,
  Settings2,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/businesses/tech")({
  component: CossaTechWorkspace,

  head: () => ({
    meta: [
      {
        title: "Cossa Tech — GROWTH",
      },
      {
        name: "description",
        content:
          "Cossa Tech operating workspace for websites, software, automation, technical delivery, AI workforce, marketing, projects and technology operations.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* TECH TOOLS                                                                 */
/* -------------------------------------------------------------------------- */

const TECH_TOOLS = [
  {
    title: "Cossa Tech AI Team",
    description:
      "Open the AI employees responsible for technology solutions, website delivery, content, SEO, creative production and executive coordination.",
    to: "/ai/workforce",
    icon: BrainCircuit,
  },

  {
    title: "Website Delivery",
    description:
      "Coordinate website builds, landing pages, client websites, implementation planning and technical delivery.",
    to: "/ai/workforce",
    icon: Globe2,
  },

  {
    title: "Technology Solutions",
    description:
      "Use the Cossa Tech workforce for software, systems, automation and technical solution planning.",
    to: "/ai/workforce",
    icon: Code2,
  },

  {
    title: "SEO Center",
    description:
      "Research keywords, review website SEO and prepare improvements for Cossa Tech and client web projects.",
    to: "/marketing/seo",
    icon: Search,
  },

  {
    title: "Content Studio",
    description:
      "Prepare website copy, service descriptions, landing-page content, technical marketing content and campaign material.",
    to: "/marketing/content-studio",
    icon: FileText,
  },

  {
    title: "Tech Marketing",
    description:
      "Plan campaigns for Cossa Tech services including websites, automation, software and digital solutions.",
    to: "/marketing/ai-director",
    icon: Megaphone,
  },

  {
    title: "AI Automation",
    description:
      "Design AI-supported automations for internal Cossa Tech work and controlled customer solutions.",
    to: "/ai/automation",
    icon: Bot,
  },

  {
    title: "Workflow Builder",
    description:
      "Build repeatable technical workflows, conditions, AI steps and operating processes.",
    to: "/ai/workflow",
    icon: Workflow,
  },

  {
    title: "Projects",
    description:
      "Manage website builds, implementation projects, client delivery work, tasks and technical execution.",
    to: "/operations/projects",
    icon: Wrench,
  },

  {
    title: "Documents",
    description:
      "Prepare project documents, specifications, technical proposals and supporting business documentation.",
    to: "/operations/documents",
    icon: FileText,
  },

  {
    title: "Business Intelligence",
    description:
      "Review available Cossa operational, marketing and business performance information from one intelligence workspace.",
    to: "/operations/business-intelligence",
    icon: Sparkles,
  },

  {
    title: "Integrations",
    description:
      "Manage authorised external systems and connections required by Cossa Tech solutions.",
    to: "/integrations",
    icon: Settings2,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function CossaTechWorkspace() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* -------------------------------------------------------------------- */}
      {/* HERO                                                                 */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <Code2 className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Cossa Nexus Holdings
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Cossa{" "}
            <span className="text-gradient-gold">
              Tech
            </span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            One operating workspace for Cossa Tech. Website delivery,
            software, automation, AI employees, marketing, projects and
            technical operations are organised here so you do not have to
            search across the entire GROWTH platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/ai/workforce">
                <BrainCircuit className="mr-1.5 h-4 w-4" />
                Open Tech AI Team
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/operations/projects">
                <Wrench className="mr-1.5 h-4 w-4" />
                Open Tech Projects
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/marketing/ai-director">
                <Megaphone className="mr-1.5 h-4 w-4" />
                Grow Cossa Tech
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* OPERATING AREAS                                                      */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TechArea
          title="Websites"
          description="Website design, development, landing pages, SEO and client delivery."
          icon={Globe2}
        />

        <TechArea
          title="Software"
          description="Software solutions, systems planning and technical implementation."
          icon={Code2}
        />

        <TechArea
          title="Automation"
          description="Business automation, AI workflows and connected processes."
          icon={Workflow}
        />

        <TechArea
          title="Delivery"
          description="Projects, specifications, documentation and implementation control."
          icon={Wrench}
        />
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* COMMAND CENTRE                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Cossa Tech command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Everything Cossa Tech needs
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            These are existing GROWTH capabilities grouped around Cossa Tech.
            Shared tools remain shared across the platform, but this workspace
            gives the Tech business one clear starting point.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TECH_TOOLS.map((tool) => {
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
      {/* WORKFLOW                                                             */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Workflow className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Recommended operating flow
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              From opportunity to delivery
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Cossa Tech should use a consistent path: identify the customer
              requirement, scope the solution, prepare the proposal, plan the
              project, execute the technical work and then monitor the result.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ProcessStep
            number="01"
            title="Discover"
            description="Understand the customer, website or technology requirement."
          />

          <ProcessStep
            number="02"
            title="Scope"
            description="Define the solution, requirements, risks and expected deliverables."
          />

          <ProcessStep
            number="03"
            title="Propose"
            description="Prepare professional content, documentation and commercial material."
          />

          <ProcessStep
            number="04"
            title="Deliver"
            description="Manage implementation through the Cossa Tech project workflow."
          />

          <ProcessStep
            number="05"
            title="Grow"
            description="Use SEO, marketing, automation and analytics to improve the result."
          />
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUPPORT COMPONENTS                                                         */
/* -------------------------------------------------------------------------- */

function TechArea({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Code2;
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
