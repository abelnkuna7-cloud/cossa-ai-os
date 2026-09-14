import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Bell, Settings2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { salesFollowUps, salesLeads, type SalesLead } from "@/lib/business-data";
import { salesJourney } from "@/lib/sales-journey";
import { crmOptions } from "@/lib/crm-config";

export const Route = createFileRoute("/sales/leads")({ component: LeadsPage });

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

function Stats({ rows }: { rows: SalesLead[] }) {
  const stats = [
    { label: "Total leads", value: rows.length },
    { label: "Hot (score ≥70)", value: rows.filter((r) => r.score >= 70).length },
    { label: "New", value: rows.filter((r) => r.status === "new").length },
    { label: "Qualified", value: rows.filter((r) => r.status === "qualified").length },
    { label: "Converted", value: rows.filter((r) => r.status === "converted").length },
  ];
  return <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map((s) => <div key={s.label} className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div><div className="mt-1 font-display text-2xl font-semibold">{s.value}</div></div>)}</section>;
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const sourceQuery = useQuery({
    queryKey: ["crm-options", "lead_source"],
    queryFn: () => crmOptions.list("lead_source", false),
  });
  const sources = (sourceQuery.data ?? []).map((option) => option.key);

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
      toast.success(result.action === "qualify" ? "Lead qualified" : result.created ? "Opportunity created" : "Existing opportunity opened");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Sales transition failed"),
  });

  const followUpMutation = useMutation({
    mutationFn: async (lead: SalesLead) => salesFollowUps.create({
      subject: `Follow up with ${lead.name}`,
      lead_id: lead.id,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      notes: "Created from the canonical lead record. No outreach has been sent.",
    }),
    onSuccess: () => toast.success("Follow-up scheduled", { description: "Due in 24 hours. No outreach was sent." }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Follow-up could not be created"),
  });

  return (
    <CrudWorkspace<SalesLead>
      title="Leads"
      tagline="Never miss a hot lead"
      description="Every lead from every channel — scored, prioritised and ready to work. Lead sources are managed in CRM Settings, not code."
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
        { key: "source", label: "Source", type: "select", options: sources },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "new" },
        { key: "score", label: "Score (0–100)", type: "number", defaultValue: 0 },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "company", label: "Company" },
        { key: "email", label: "Contact", render: (r) => <div className="text-xs">{r.email ? <div>{r.email}</div> : null}{r.phone ? <div className="text-muted-foreground">{r.phone}</div> : null}</div> },
        { key: "source", label: "Source" },
        { key: "status", label: "Status" },
        { key: "score", label: "Score" },
        { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["name", "email", "company", "source", "status"]}
      emptyHint="Add your first lead to start building pipeline."
      rowActions={(lead) => {
        const status = lead.status.toLowerCase();
        const convertedOpportunityId = lead.notes?.match(/\[cossa_journey_opportunityId:([^\]\s]+)\]/i)?.[1];
        return <>
          {status !== "lost" && status !== "converted" ? <Button type="button" size="sm" variant="ghost" disabled={followUpMutation.isPending} onClick={() => followUpMutation.mutate(lead)}><Bell className="mr-1 h-3.5 w-3.5" />Follow up</Button> : null}
          {status !== "qualified" && status !== "converted" && status !== "lost" ? <Button type="button" size="sm" variant="outline" disabled={journeyMutation.isPending} onClick={() => journeyMutation.mutate({ id: lead.id, action: "qualify" })}><BadgeCheck className="mr-1 h-3.5 w-3.5" />Qualify</Button> : null}
          {status === "qualified" ? <Button type="button" size="sm" disabled={journeyMutation.isPending} onClick={() => journeyMutation.mutate({ id: lead.id, action: "convert" })}><ArrowRight className="mr-1 h-3.5 w-3.5" />Convert</Button> : null}
          {convertedOpportunityId ? <Link to="/sales/opportunities"><Button type="button" size="sm" variant="ghost">Opportunity {convertedOpportunityId.slice(0, 8)}</Button></Link> : null}
        </>;
      }}
      extra={<section className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-semibold">Connected sales journey</h2><p className="mt-1 text-sm text-muted-foreground">Qualify before conversion. Source lead and organisation context remain linked.</p></div><div className="flex gap-2"><Link to="/sales/crm-settings"><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />CRM settings</Button></Link><Link to="/sales/pipeline"><Button variant="outline">Open pipeline</Button></Link></div></section>}
    />
  );
}
