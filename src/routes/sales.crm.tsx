import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  FileText,
  GitBranch,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import {
  salesCompanies,
  salesCustomers,
  salesLeads,
  salesOpportunities,
} from "@/lib/business-data";
import { supabase } from "@/integrations/supabase/client";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

// The generated Supabase types lag behind the existing production tables.
// Keep this narrowly-scoped adapter until the types are regenerated from the
// linked project; runtime data remains validated by the query and UI model.
const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export const Route = createFileRoute("/sales/crm")({
  component: CrmHub,
  head: () => ({
    meta: [
      { title: "CRM — Cossa AI" },
      {
        name: "description",
        content:
          "Manage website enquiries, leads, customers, companies, opportunities and sales activity in Cossa AI.",
      },
      {
        property: "og:title",
        content: "CRM — Cossa AI",
      },
      {
        property: "og:description",
        content: "Cossa AI CRM for enquiries, leads and customer relationships.",
      },
    ],
  }),
});

interface QuoteRequest {
  id: string;
  full_name: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  location: string | null;
  project_details: string | null;
  message: string | null;
  budget: string | null;
  timeline: string | null;
  created_at: string | null;
}

interface CrmTile {
  title: string;
  to: string;
  icon: typeof Users;
  count: number | null;
  description: string;
}

async function listQuoteRequests(): Promise<QuoteRequest[]> {
  const { data, error } = await db
    .from("quote_requests")
    .select(
      [
        "id",
        "full_name",
        "name",
        "phone",
        "email",
        "service",
        "location",
        "project_details",
        "message",
        "budget",
        "timeline",
        "created_at",
      ].join(","),
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Unable to load website quote requests: ${error.message}`);
  }

  return (data ?? []) as QuoteRequest[];
}

function getRequesterName(request: QuoteRequest): string {
  return request.full_name?.trim() || request.name?.trim() || "Unnamed enquiry";
}

function getRequestDescription(request: QuoteRequest): string {
  return (
    request.project_details?.trim() ||
    request.message?.trim() ||
    "No project details were provided."
  );
}

function formatSubmittedDate(value: string | null): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function CrmHub() {
  const leads = useQuery({
    queryKey: ["sales-leads"],
    queryFn: salesLeads.list,
  });

  const customers = useQuery({
    queryKey: ["sales-customers"],
    queryFn: salesCustomers.list,
  });

  const companies = useQuery({
    queryKey: ["sales-companies"],
    queryFn: salesCompanies.list,
  });

  const opportunities = useQuery({
    queryKey: ["sales-opportunities"],
    queryFn: salesOpportunities.list,
  });

  const quoteRequests = useQuery({
    queryKey: ["website-quote-requests"],
    queryFn: listQuoteRequests,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const openOpportunityCount = (opportunities.data ?? []).filter(
    (opportunity) => !["won", "lost"].includes(String(opportunity.stage ?? "").toLowerCase()),
  ).length;

  const tiles: CrmTile[] = [
    {
      title: "Leads",
      to: "/sales/leads",
      icon: UserPlus,
      count: leads.data?.length ?? 0,
      description: "Qualified prospects and sales opportunities.",
    },
    {
      title: "Customers",
      to: "/sales/customers",
      icon: Users,
      count: customers.data?.length ?? 0,
      description: "Every active customer relationship in one place.",
    },
    {
      title: "Companies",
      to: "/sales/companies",
      icon: Building2,
      count: companies.data?.length ?? 0,
      description: "Business accounts and decision-maker intelligence.",
    },
    {
      title: "Pipeline",
      to: "/sales/pipeline",
      icon: GitBranch,
      count: openOpportunityCount,
      description: "Track opportunities from prospect to close.",
    },
    {
      title: "Quotations",
      to: "/sales/quotations",
      icon: FileText,
      count: null,
      description: "Prepare, issue and track formal quotations.",
    },
    {
      title: "Follow-ups",
      to: "/sales/follow-ups",
      icon: Bell,
      count: null,
      description: "Manage calls, messages, meetings and next actions.",
    },
  ];

  const latestQuoteRequests = (quoteRequests.data ?? []).slice(0, 5);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Users className="h-5 w-5" />
            </div>

            <StatusBadge status={workspaceRuntimeStatus()} />
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Customer Relationship Management
          </h1>

          <p className="mt-1 max-w-3xl text-muted-foreground">
            Manage website enquiries, qualified leads, customers, companies, quotations,
            opportunities and follow-up activity from one connected workspace.
          </p>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />

              <h2 className="font-display text-xl font-semibold">Website enquiries</h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Quote requests submitted through growth.cossanexusholdings.co.za.
            </p>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-right">
            <div className="font-display text-2xl font-semibold text-primary">
              {quoteRequests.data?.length ?? 0}
            </div>

            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              total enquiries
            </div>
          </div>
        </div>

        {quoteRequests.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading website enquiries…
          </div>
        ) : quoteRequests.isError ? (
          <div className="m-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Website enquiries could not be loaded
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {quoteRequests.error instanceof Error
                  ? quoteRequests.error.message
                  : "An unknown Supabase error occurred."}
              </p>

              <button
                type="button"
                onClick={() => quoteRequests.refetch()}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : latestQuoteRequests.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />

            <h3 className="mt-3 font-display text-lg font-semibold">No website enquiries yet</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              New quote requests from the Growth landing page will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {latestQuoteRequests.map((request) => (
              <article key={request.id} className="p-5 transition-colors hover:bg-muted/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold">
                        {getRequesterName(request)}
                      </h3>

                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                        Website enquiry
                      </span>

                      {request.service && (
                        <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground">
                          {request.service}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-muted-foreground">
                      {getRequestDescription(request)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      {request.phone && (
                        <a
                          href={`tel:${request.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {request.phone}
                        </a>
                      )}

                      {request.email && (
                        <a
                          href={`mailto:${request.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-primary"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {request.email}
                        </a>
                      )}

                      {request.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {request.location}
                        </span>
                      )}
                    </div>

                    {(request.budget || request.timeline) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {request.budget && (
                          <span className="rounded border border-border/70 px-2 py-1 text-muted-foreground">
                            Budget: {request.budget}
                          </span>
                        )}

                        {request.timeline && (
                          <span className="rounded border border-border/70 px-2 py-1 text-muted-foreground">
                            Timeline: {request.timeline}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatSubmittedDate(request.created_at)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="glass-card group flex flex-col gap-3 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                  <Icon className="h-5 w-5" />
                </div>

                {tile.count !== null && (
                  <div className="text-right">
                    <div className="font-display text-2xl font-semibold">{tile.count}</div>

                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      records
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold">{tile.title}</h3>

                <p className="mt-1 text-xs text-muted-foreground">{tile.description}</p>
              </div>

              <div className="mt-auto inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                Open
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
