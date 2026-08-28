import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { salesLeads, type SalesLead } from "@/lib/business-data";
import { salesJourney } from "@/lib/sales-journey";

export const Route = createFileRoute("/sales/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Leads — Cossa AI" },
      {
        name: "description",
        content: "Capture, score and manage every sales lead in one workspace.",
      },
      { property: "og:title", content: "Leads — Cossa AI" },
      { property: "og:description", content: "Live lead management for Cossa AI." },
    ],
  }),
});

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const SOURCES = [
  "website",
  "referral",
  "google",
  "meta",
  "whatsapp",
  "email",
  "cold outbound",
  "event",
];

function Stats({ rows }: { rows: SalesLead[] }) {
  const hot = rows.filter((r) => r.score >= 70).length;
  const newLeads = rows.filter((r) => r.status === "new").length;
  const qualified = rows.filter((r) => r.status === "qualified").length;
  const converted = rows.filter((r) => r.status === "converted").length;
  const stats = [
    { label: "Total leads", value: rows.length },
    { label: "Hot (score ≥70)", value: hot },
    { label: "New", value: newLeads },
    { label: "Qualified", value: qualified },
    { label: "Converted", value: converted },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const journeyMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "qualify" | "convert" }) => {
      if (action === "qualify") {
        await salesJourney.qualifyLead(id);
        return { action };
      }
      return { action, ...(await salesJourney.convertLeadToOpportunity(id)) };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-opportunities"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);
      if (result.action === "qualify") {
        toast.success("Lead qualified", {
          description: "The lead remains in the Lead Funnel until you convert it.",
        });
      } else {
        toast.success(result.created ? "Opportunity created" : "Existing opportunity opened", {
          description:
            "The source lead and organisation context are retained in the journey evidence.",
        });
      }
    },
    onError: (error) => {
      toast.error("Sales transition needs attention", {
        description: error instanceof Error ? error.message : "The transition was not completed.",
      });
    },
  });

  return (
    <CrudWorkspace<SalesLead>
      title="Leads"
      tagline="Never miss a hot lead"
      description="Every lead from every channel — scored, prioritised and ready to work."
      icon={UserPlus}
      queryKey="sales-leads"
      fetch={salesLeads.list}
      create={salesLeads.create}
      update={salesLeads.update}
      remove={salesLeads.remove}
      singular="lead"
      Stats={Stats}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "company", label: "Company" },
        { key: "source", label: "Source", type: "select", options: SOURCES },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "new" },
        { key: "score", label: "Score (0–100)", type: "number", defaultValue: 0 },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "name",
          label: "Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "company", label: "Company" },
        {
          key: "email",
          label: "Contact",
          render: (r) => (
            <div className="text-xs">
              {r.email && <div>{r.email}</div>}
              {r.phone && <div className="text-muted-foreground">{r.phone}</div>}
            </div>
          ),
        },
        { key: "source", label: "Source" },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {r.status}
            </span>
          ),
        },
        {
          key: "score",
          label: "Score",
          render: (r) => (
            <span
              className={
                r.score >= 70
                  ? "text-success font-semibold"
                  : r.score >= 40
                    ? "text-primary"
                    : "text-muted-foreground"
              }
            >
              {r.score}
            </span>
          ),
        },
        { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["name", "email", "company", "source", "status"]}
      emptyHint="Add your first lead to start building pipeline."
      rowActions={(lead) => {
        const status = lead.status.toLowerCase();
        const convertedOpportunityId = lead.notes?.match(
          /\[cossa_journey_opportunityId:([^\]\s]+)\]/i,
        )?.[1];
        return (
          <>
            {status !== "qualified" && status !== "converted" && status !== "lost" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-primary/40 px-2 text-xs text-primary hover:bg-primary/10"
                disabled={journeyMutation.isPending}
                onClick={() => journeyMutation.mutate({ id: lead.id, action: "qualify" })}
              >
                <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                Qualify
              </Button>
            ) : null}
            {status === "qualified" ? (
              <Button
                type="button"
                size="sm"
                className="h-8 bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/90"
                disabled={journeyMutation.isPending}
                onClick={() => journeyMutation.mutate({ id: lead.id, action: "convert" })}
              >
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                Convert
              </Button>
            ) : null}
            {convertedOpportunityId ? (
              <Link to="/sales/opportunities">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-primary"
                >
                  Opportunity {convertedOpportunityId.slice(0, 8)}
                </Button>
              </Link>
            ) : null}
          </>
        );
      }}
      extra={
        <section className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Connected sales journey</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Qualify before conversion. Conversion preserves the source lead, company, contact,
              service, value and organisation context; it never creates a duplicate lead.
            </p>
          </div>
          <Link to="/sales/pipeline">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Open Opportunity Pipeline
            </Button>
          </Link>
        </section>
      }
    />
  );
}
