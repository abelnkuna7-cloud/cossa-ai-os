import { createFileRoute, Link } from "@tanstack/react-router";

import {
  BrainCircuit,
  FileCheck2,
  FilePenLine,
  FileSignature,
  FileStack,
  FileText,
  FolderKanban,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/businesses/nexdocs")({
  component: NexDocsWorkspace,

  head: () => ({
    meta: [
      {
        title: "NexDocs — GROWTH",
      },
      {
        name: "description",
        content:
          "NexDocs operating workspace for proposals, quotations, contracts, document production, document workflows, AI assistance and business document management.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* NEXDOCS TOOLS                                                              */
/* -------------------------------------------------------------------------- */

const NEXDOCS_TOOLS = [
  {
    title: "NexDocs Platform",
    description:
      "Open the existing NexDocs workspace for proposals, contracts, quotations and document activity.",
    to: "/operations/nexdocs",
    icon: FileStack,
  },

  {
    title: "AI Document Assistant",
    description:
      "Draft, review, summarise and work with business documents using the dedicated document AI.",
    to: "/ai/document-assistant",
    icon: BrainCircuit,
  },

  {
    title: "Quotations",
    description:
      "Prepare and manage professional customer quotations using the existing sales quotation tools.",
    to: "/sales/quotations",
    icon: FileText,
  },

  {
    title: "Business Documents",
    description:
      "Create and manage operational documents, templates and internal business records.",
    to: "/operations/documents",
    icon: FilePenLine,
  },

  {
    title: "Content Studio",
    description:
      "Prepare polished copy for proposals, brochures, company profiles and customer-facing documents.",
    to: "/marketing/content-studio",
    icon: Sparkles,
  },

  {
    title: "Knowledge Base",
    description:
      "Use verified company knowledge and approved information when preparing document content.",
    to: "/ai/knowledge",
    icon: Library,
  },

  {
    title: "Document Workflows",
    description:
      "Build repeatable document processes for drafting, review, approvals, handoffs and completion.",
    to: "/ai/workflow",
    icon: Workflow,
  },

  {
    title: "NexDocs AI Team",
    description:
      "Access the broader Cossa AI workforce when document work needs sales, executive, content or operational support.",
    to: "/ai/workforce",
    icon: UsersRound,
  },

  {
    title: "Projects",
    description:
      "Coordinate larger proposal, tender, contract and client-document jobs as structured projects.",
    to: "/operations/projects",
    icon: FolderKanban,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function NexDocsWorkspace() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* -------------------------------------------------------------------- */}
      {/* HERO                                                                 */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
            <FileStack className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Cossa Nexus Holdings
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            <span className="text-gradient-gold">
              NexDocs
            </span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The document operating centre for proposals, quotations, contracts,
            company profiles, business documents and AI-assisted document
            production. Everything related to NexDocs is organised here instead
            of being scattered across GROWTH.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              <Link to="/operations/nexdocs">
                <FileStack className="mr-1.5 h-4 w-4" />
                Open NexDocs
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/ai/document-assistant">
                <BrainCircuit className="mr-1.5 h-4 w-4" />
                AI Document Assistant
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Link to="/sales/quotations">
                <FileText className="mr-1.5 h-4 w-4" />
                Quotations
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* CORE AREAS                                                           */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperatingArea
          title="Create"
          description="Produce professional proposals, quotations, profiles, agreements and business documents."
          icon={FilePenLine}
        />

        <OperatingArea
          title="Review"
          description="Check structure, wording, completeness and consistency before documents move forward."
          icon={Search}
        />

        <OperatingArea
          title="Approve"
          description="Keep important commercial, legal and owner-controlled decisions properly reviewed."
          icon={FileCheck2}
        />

        <OperatingArea
          title="Deliver"
          description="Move approved documents through the correct business process without losing context."
          icon={FileSignature}
        />
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* COMMAND CENTRE                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            NexDocs command centre
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Everything needed to produce business documents
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            NexDocs should act as the document business layer across Cossa.
            Construction quotations, Facility Services proposals, Store
            supplier documents, Tech proposals and group-level documents can
            all use the same document capabilities without duplicating tools.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {NEXDOCS_TOOLS.map((tool) => {
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
      {/* DOCUMENT TYPES                                                       */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileStack className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Document production
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              One document engine for every Cossa business
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              NexDocs becomes more valuable when it is treated as shared
              infrastructure rather than a separate isolated tool.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DocumentType
            title="Proposals"
            description="Professional customer and commercial proposals for service and project opportunities."
          />

          <DocumentType
            title="Quotations"
            description="Structured pricing and scope documents linked to real sales opportunities."
          />

          <DocumentType
            title="Contracts"
            description="Draft and review contract-related documentation while legal commitments remain controlled."
          />

          <DocumentType
            title="Company Profiles"
            description="Professional company and capability documents for customers, suppliers and partners."
          />

          <DocumentType
            title="Tender Documents"
            description="Organise supporting documentation required for tender and procurement opportunities."
          />

          <DocumentType
            title="Service Documents"
            description="Scopes of work, service descriptions, reports and operational customer documents."
          />

          <DocumentType
            title="Marketing Documents"
            description="Brochures, capability packs, product sheets and other business development material."
          />

          <DocumentType
            title="Internal Documents"
            description="Policies, reports, plans, procedures and internal management documents."
          />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* DOCUMENT FLOW                                                        */}
      {/* -------------------------------------------------------------------- */}

      <section>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Standard workflow
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            A controlled document lifecycle
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <ProcessStep
            number="01"
            title="Request"
            description="Identify the document, customer, business purpose and required outcome."
          />

          <ProcessStep
            number="02"
            title="Gather"
            description="Collect verified company, customer, project and commercial information."
          />

          <ProcessStep
            number="03"
            title="Draft"
            description="Prepare the document using the appropriate template and business context."
          />

          <ProcessStep
            number="04"
            title="Review"
            description="Check wording, completeness, calculations and supporting information."
          />

          <ProcessStep
            number="05"
            title="Approve"
            description="Escalate legal, pricing, contractual or other controlled decisions where required."
          />

          <ProcessStep
            number="06"
            title="Complete"
            description="Finalise the approved document and retain its business record."
          />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* CONTROL                                                              */}
      {/* -------------------------------------------------------------------- */}

      <section className="grid gap-4 lg:grid-cols-3">
        <PriorityCard
          title="Verified Information"
          description="Document quality depends on accurate company, customer and commercial information. Missing information should be identified, not invented."
          icon={FileCheck2}
        />

        <PriorityCard
          title="Reusable Templates"
          description="Build reusable document structures so quotations, proposals and company documents become faster and more consistent."
          icon={FileStack}
        />

        <PriorityCard
          title="Owner-Controlled Commitments"
          description="Contracts, signatures, binding commercial terms and other high-risk commitments must remain properly authorised."
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
  icon: typeof FileStack;
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

function DocumentType({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <FileText className="h-4 w-4 text-primary" />

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
  icon: typeof FileStack;
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
