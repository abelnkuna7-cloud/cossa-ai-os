import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  Mail,
  Search,
  ShieldCheck,
  UserRound,
  Workflow,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { loadRelationshipWorkspace } from "@/lib/crm-relationships";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/sales/relationships")({
  component: RelationshipWorkspacePage,
});

function label(value: string | null | undefined) {
  return value?.replace(/_/g, " ") ?? "Not set";
}

function date(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not scheduled"
    : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-primary">
      {children}
    </span>
  );
}

function RelationshipWorkspacePage() {
  const workspace = useQuery({
    queryKey: ["crm-relationship-workspace"],
    queryFn: loadRelationshipWorkspace,
    refetchInterval: 60_000,
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = workspace.data;

  const companies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.companies ?? []).filter(
      (company) =>
        !term ||
        [
          company.trading_name,
          company.legal_name,
          company.domain,
          company.general_email,
          company.city,
          company.country,
        ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [data?.companies, search]);

  useEffect(() => {
    if (!selectedId && companies[0]) setSelectedId(companies[0].id);
    if (selectedId && !companies.some((company) => company.id === selectedId))
      setSelectedId(companies[0]?.id ?? null);
  }, [companies, selectedId]);

  const company = companies.find((item) => item.id === selectedId) ?? null;
  const related =
    company && data
      ? {
          contacts: data.contacts.filter((item) => item.company_id === company.id),
          relationships: data.relationships.filter((item) => item.company_id === company.id),
          opportunities: data.opportunities.filter((item) => item.company_id === company.id),
          communications: data.communications.filter((item) => item.company_id === company.id),
          followUps: data.followUps.filter((item) => item.company_id === company.id),
          dueDiligence: data.dueDiligence.filter((item) => item.company_id === company.id),
        }
      : null;
  const unitName = (id: string | null) =>
    data?.businessUnits.find((item) => item.id === id)?.name ?? "Group / unassigned";
  const pending = (data?.followUps ?? []).filter(
    (item) => !["done", "skipped"].includes(item.status),
  );
  const overdue = pending.filter((item) => new Date(item.due_at).getTime() < Date.now());

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <StatusBadge status={workspaceRuntimeStatus()} />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
          Business Relationships
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          One company record, every contact, relationship, opportunity, communication, due-diligence
          check and follow-up.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Organisations", data?.companies.length ?? 0, Building2],
          ["Active relationships", data?.relationships.length ?? 0, Workflow],
          ["Pending follow-ups", pending.length, CalendarClock],
          ["Overdue", overdue.length, ShieldCheck],
        ].map(([name, value, Icon]) => {
          const C = Icon as typeof Building2;
          return (
            <div key={String(name)} className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <C className="h-4 w-4" />
                {String(name)}
              </div>
              <div className="mt-2 font-display text-3xl font-semibold">{String(value)}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass-card overflow-hidden">
          <div className="border-b border-border/60 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search company, domain or city"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[720px] divide-y divide-border/60 overflow-y-auto">
            {workspace.isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading relationships…</p>
            ) : companies.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No matching organisation.</p>
            ) : (
              companies.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full p-4 text-left transition ${selectedId === item.id ? "bg-primary/10" : "hover:bg-muted/40"}`}
                >
                  <div className="font-medium">{item.trading_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.domain ||
                      [item.city, item.country].filter(Boolean).join(", ") ||
                      "Details not completed"}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          {company && related ? (
            <>
              <section className="glass-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Pill>{label(company.verification_status)}</Pill>
                      <Pill>{label(company.relationship_health)}</Pill>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-semibold">
                      {company.trading_name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[company.city, company.country, company.domain].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {company.general_email ? (
                      <a
                        className="rounded-lg border border-border px-3 py-2"
                        href={`mailto:${company.general_email}`}
                      >
                        <Mail className="mr-1 inline h-3.5 w-3.5" />
                        Email
                      </a>
                    ) : null}
                    {company.website ? (
                      <a
                        className="rounded-lg border border-border px-3 py-2"
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Website
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="glass-card p-5">
                  <h3 className="font-display text-lg font-semibold">Contacts</h3>
                  <div className="mt-4 space-y-3">
                    {related.contacts.length ? (
                      related.contacts.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3">
                          <div className="flex items-center gap-2 font-medium">
                            <UserRound className="h-4 w-4 text-primary" />
                            {item.full_name || "Unnamed contact"}
                            {item.is_primary ? <Pill>Primary</Pill> : null}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {[item.job_title, item.email, item.phone].filter(Boolean).join(" · ") ||
                              "No contact details"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No contact linked.</p>
                    )}
                  </div>
                </div>
                <div className="glass-card p-5">
                  <h3 className="font-display text-lg font-semibold">Relationship roles</h3>
                  <div className="mt-4 space-y-3">
                    {related.relationships.length ? (
                      related.relationships.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3">
                          <div className="flex flex-wrap gap-2">
                            <Pill>{label(item.relationship_type_key)}</Pill>
                            <Pill>{label(item.status_key)}</Pill>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {unitName(item.business_unit_id)} · {label(item.priority)} priority
                          </div>
                          {item.next_action ? (
                            <p className="mt-2 text-sm">Next: {item.next_action}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No relationship role linked.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">Opportunities</h3>
                  <Link to="/sales/pipeline" className="text-xs text-primary">
                    Open pipeline
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {related.opportunities.length ? (
                    related.opportunities.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{item.organization_name}</strong>
                          <Pill>{label(item.opportunity_type)}</Pill>
                          <Pill>{label(item.stage_key || item.status)}</Pill>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {unitName(item.business_unit_id)} · {item.probability}% probability · R
                          {Number(item.estimated_value || 0).toLocaleString("en-ZA")}
                        </div>
                        {item.next_action ? (
                          <p className="mt-2 text-sm">Next: {item.next_action}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No opportunity linked.</p>
                  )}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Follow-ups</h3>
                    <Link to="/sales/follow-ups" className="text-xs text-primary">
                      Open center
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {related.followUps.length ? (
                      related.followUps.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3">
                          <div className="font-medium">{item.subject}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {date(item.due_at)} · {label(item.status)} · {label(item.priority)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No follow-up linked.</p>
                    )}
                  </div>
                </div>
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Due diligence</h3>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {related.dueDiligence.length ? (
                      related.dueDiligence.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3">
                          <div className="font-medium">{label(item.check_type)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {label(item.status)} · Risk: {label(item.risk_level)} · Review:{" "}
                            {date(item.review_due_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No due-diligence checks recorded.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">Communication timeline</h3>
                  <Link to="/sales/communications" className="text-xs text-primary">
                    Open communications
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {related.communications.length ? (
                    related.communications.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex flex-wrap gap-2">
                          <strong>{item.subject || "Business communication"}</strong>
                          <Pill>{label(item.channel)}</Pill>
                          <Pill>{label(item.status)}</Pill>
                        </div>
                        {item.summary ? (
                          <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                        ) : null}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {date(item.occurred_at)}
                          {item.requires_action ? ` · Review ${date(item.next_review_at)}` : ""}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No communication linked.</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="glass-card p-10 text-center text-sm text-muted-foreground">
              Select an organisation to view its complete relationship.
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
