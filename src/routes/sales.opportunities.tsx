import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Loader2, Pencil, Plus, Radar, Search, Settings2, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtCurrency, fmtDate } from "@/components/crud-workspace";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";
import { crmOptions, type CrmOption } from "@/lib/crm-config";
import { configurableOpportunities, type ConfigurableOpportunity } from "@/lib/configurable-opportunities";

export const Route = createFileRoute("/sales/opportunities")({
  component: OpportunitiesPage,
  head: () => ({
    meta: [
      { title: "Opportunities — Cossa AI" },
      { name: "description", content: "Configurable sales opportunity workspace for Cossa AI." },
    ],
  }),
});

type FormState = {
  title: string;
  type: string;
  stage: string;
  value: string;
  probability: string;
  expected_close: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  location: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  type: "procurement",
  stage: "prospect",
  value: "0",
  probability: "20",
  expected_close: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  location: "",
  notes: "",
};

function labelFor(options: CrmOption[], key: string) {
  return options.find((option) => option.key === key)?.label ?? key.replaceAll("_", " ");
}

function OpportunitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const opportunitiesQuery = useQuery({
    queryKey: ["sales-opportunities"],
    queryFn: configurableOpportunities.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const typesQuery = useQuery({
    queryKey: ["crm-options", "opportunity_type"],
    queryFn: () => crmOptions.list("opportunity_type", false),
  });

  const stagesQuery = useQuery({
    queryKey: ["crm-options", "opportunity_stage"],
    queryFn: () => crmOptions.list("opportunity_stage", false),
  });

  const types = typesQuery.data ?? [];
  const stages = stagesQuery.data ?? [];

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sales-opportunities"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: configurableOpportunities.create,
    onSuccess: async () => {
      await refresh();
      toast.success("Opportunity created");
      closeForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create opportunity"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ConfigurableOpportunity> }) =>
      configurableOpportunities.update(id, payload),
    onSuccess: async () => {
      await refresh();
      toast.success("Opportunity updated");
      closeForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update opportunity"),
  });

  const deleteMutation = useMutation({
    mutationFn: configurableOpportunities.remove,
    onSuccess: async () => {
      await refresh();
      toast.success("Opportunity deleted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to delete opportunity"),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return opportunitiesQuery.data ?? [];
    return (opportunitiesQuery.data ?? []).filter((item) =>
      [item.title, item.type, item.stage, item.contact_name, item.contact_phone, item.contact_email, item.notes]
        .some((value) => String(value ?? "").toLowerCase().includes(q)),
    );
  }, [opportunitiesQuery.data, search]);

  const all = opportunitiesQuery.data ?? [];
  const open = all.filter((item) => !["won", "lost"].includes(item.storage_status));
  const openValue = open.reduce((total, item) => total + item.value, 0);
  const weightedValue = open.reduce((total, item) => total + item.value * (item.probability / 100), 0);
  const wonValue = all.filter((item) => item.storage_status === "won").reduce((total, item) => total + item.value, 0);

  const pending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      type: types[0]?.key ?? "procurement",
      stage: stages[0]?.key ?? "prospect",
    });
    setShowForm(true);
  }

  function openEditForm(item: ConfigurableOpportunity) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      type: item.type,
      stage: item.stage,
      value: String(item.value),
      probability: String(item.probability),
      expected_close: item.expected_close ?? "",
      contact_name: item.contact_name ?? "",
      contact_phone: item.contact_phone ?? "",
      contact_email: item.contact_email ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    if (pending) return;
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const stageOption = stages.find((option) => option.key === form.stage);
    const storageStatus = stageOption?.semantic_status ?? "prospect";
    const payload: Partial<ConfigurableOpportunity> = {
      title: form.title.trim(),
      type: form.type,
      stage: form.stage,
      storage_status: storageStatus,
      value: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      expected_close: form.expected_close || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      location: form.location || null,
      notes: form.notes || null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><Radar className="h-5 w-5" /></div><StatusBadge status={workspaceRuntimeStatus()} /></div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Opportunities</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Opportunity types and pipeline stages are now controlled from CRM Settings instead of application code.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/sales/crm-settings"><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />CRM settings</Button></Link>
            <Link to="/sales/pipeline"><Button variant="outline"><GitBranch className="mr-2 h-4 w-4" />Open pipeline</Button></Link>
            <Button onClick={openCreateForm}><Plus className="mr-2 h-4 w-4" />New opportunity</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open deals" value={String(open.length)} />
        <Stat label="Open value" value={fmtCurrency(openValue)} />
        <Stat label="Weighted value" value={fmtCurrency(weightedValue)} />
        <Stat label="Won value" value={fmtCurrency(wonValue)} />
      </section>

      {showForm ? (
        <section className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 p-5"><div><h2 className="font-display text-xl font-semibold">{editingId ? "Edit opportunity" : "Create opportunity"}</h2><p className="mt-1 text-xs text-muted-foreground">No code change is required to add new opportunity types or stages.</p></div><Button size="icon" variant="ghost" onClick={closeForm}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={submit} className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="Opportunity title"><Input required value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} /></Field>
            <Field label="Opportunity type"><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value }))}>{types.map((option) => <option key={option.id} value={option.key}>{option.label}</option>)}</select></Field>
            <Field label="Pipeline stage"><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.stage} onChange={(e) => setForm((v) => ({ ...v, stage: e.target.value }))}>{stages.map((option) => <option key={option.id} value={option.key}>{option.label}</option>)}</select></Field>
            <Field label="Estimated value (R)"><Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm((v) => ({ ...v, value: e.target.value }))} /></Field>
            <Field label="Win probability %"><Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((v) => ({ ...v, probability: e.target.value }))} /></Field>
            <Field label="Expected close date"><Input type="date" value={form.expected_close} onChange={(e) => setForm((v) => ({ ...v, expected_close: e.target.value }))} /></Field>
            <Field label="Contact name"><Input value={form.contact_name} onChange={(e) => setForm((v) => ({ ...v, contact_name: e.target.value }))} /></Field>
            <Field label="Contact phone"><Input value={form.contact_phone} onChange={(e) => setForm((v) => ({ ...v, contact_phone: e.target.value }))} /></Field>
            <Field label="Contact email"><Input type="email" value={form.contact_email} onChange={(e) => setForm((v) => ({ ...v, contact_email: e.target.value }))} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))} /></Field>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save opportunity</Button></div>
          </form>
        </section>
      ) : null}

      <section className="glass-card p-5">
        <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search opportunities…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground"><th className="px-3 py-2">Opportunity</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Close</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="border-b border-border/40"><td className="px-3 py-3 font-medium">{item.title}</td><td className="px-3 py-3">{labelFor(types, item.type)}</td><td className="px-3 py-3">{labelFor(stages, item.stage)}</td><td className="px-3 py-3 text-xs">{item.contact_name ?? "—"}{item.contact_phone ? <div className="text-muted-foreground">{item.contact_phone}</div> : null}</td><td className="px-3 py-3">{fmtCurrency(item.value)}</td><td className="px-3 py-3">{item.expected_close ? fmtDate(item.expected_close) : "—"}</td><td className="px-3 py-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEditForm(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete ${item.title}?`)) deleteMutation.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody>
          </table>
          {!opportunitiesQuery.isLoading && rows.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No matching opportunities.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-1 font-display text-2xl font-semibold">{value}</div></div>;
}
