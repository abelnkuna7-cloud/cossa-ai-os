import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Plus, Pencil, Power, Trash2, ArrowLeft } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { crmOptions, type CrmOption } from "@/lib/crm-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/sales/crm-settings")({ component: CrmSettingsPage });

const STATUS_OPTIONS = ["", "prospect", "qualified", "engaged", "won", "lost"] as const;

type FormState = {
  category: string;
  key: string;
  label: string;
  semantic_status: string;
  sort_order: string;
};

const EMPTY: FormState = { category: "opportunity_type", key: "", label: "", semantic_status: "", sort_order: "100" };

function CrmSettingsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<CrmOption | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const query = useQuery({ queryKey: ["crm-options"], queryFn: () => crmOptions.list(undefined, true) });
  const categories = useMemo(
    () => Array.from(new Set((query.data ?? []).map((item) => item.category))).sort(),
    [query.data],
  );
  const rows = (query.data ?? []).filter((item) => filter === "all" || item.category === filter);

  const refresh = async () => qc.invalidateQueries({ queryKey: ["crm-options"] });

  const save = useMutation({
    mutationFn: async () => {
      const payload: Partial<CrmOption> = {
        category: form.category,
        key: form.key,
        label: form.label,
        semantic_status: (form.semantic_status || null) as CrmOption["semantic_status"],
        sort_order: Number(form.sort_order) || 100,
        is_active: editing?.is_active ?? true,
      };
      if (editing) return crmOptions.update(editing.id, payload);
      return crmOptions.create(payload);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(editing ? "CRM option updated" : "CRM option created");
      cancelEdit();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save CRM option"),
  });

  const toggle = useMutation({
    mutationFn: (item: CrmOption) => crmOptions.update(item.id, { is_active: !item.is_active }),
    onSuccess: refresh,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update option"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => crmOptions.remove(id),
    onSuccess: async () => {
      await refresh();
      toast.success("CRM option deleted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to delete option"),
  });

  function startEdit(item: CrmOption) {
    setEditing(item);
    setForm({
      category: item.category,
      key: item.key,
      label: item.label,
      semantic_status: item.semantic_status ?? "",
      sort_order: String(item.sort_order),
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.category.trim() || !form.key.trim() || !form.label.trim()) {
      toast.error("Category, key and label are required");
      return;
    }
    save.mutate();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary"><Settings2 className="h-5 w-5" /><span className="text-xs uppercase tracking-widest">No-code configuration</span></div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">CRM Settings</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Change CRM option lists without changing application code. Opportunity types, pipeline stages, lead sources and future categories all use this registry.</p>
          </div>
          <Link to="/sales/opportunities"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to opportunities</Button></Link>
        </div>
      </section>

      <section className="glass-card p-5">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-6">
          <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} placeholder="opportunity_type" /></div>
          <div className="space-y-2"><Label>Key</Label><Input value={form.key} onChange={(e) => setForm((v) => ({ ...v, key: e.target.value }))} placeholder="procurement" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm((v) => ({ ...v, label: e.target.value }))} placeholder="Procurement" /></div>
          <div className="space-y-2"><Label>Semantic status</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.semantic_status} onChange={(e) => setForm((v) => ({ ...v, semantic_status: e.target.value }))}>{STATUS_OPTIONS.map((status) => <option key={status || "none"} value={status}>{status || "None"}</option>)}</select></div>
          <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((v) => ({ ...v, sort_order: e.target.value }))} /></div>
          <div className="flex gap-2 md:col-span-6"><Button type="submit" disabled={save.isPending}>{editing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{editing ? "Save changes" : "Add option"}</Button>{editing ? <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button> : null}</div>
        </form>
      </section>

      <section className="glass-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          {categories.map((category) => <Button key={category} size="sm" variant={filter === category ? "default" : "outline"} onClick={() => setFilter(category)}>{category.replaceAll("_", " ")}</Button>)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground"><th className="px-3 py-2">Category</th><th className="px-3 py-2">Label</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Semantic</th><th className="px-3 py-2">Order</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="border-b border-border/40"><td className="px-3 py-3">{item.category}</td><td className="px-3 py-3 font-medium">{item.label}</td><td className="px-3 py-3 text-muted-foreground">{item.key}</td><td className="px-3 py-3">{item.semantic_status ?? "—"}</td><td className="px-3 py-3">{item.sort_order}</td><td className="px-3 py-3">{item.is_active ? "Active" : "Inactive"}</td><td className="px-3 py-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => toggle.mutate(item)}><Power className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete ${item.label}?`)) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody>
          </table>
          {!query.isLoading && rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No CRM options in this category.</p> : null}
        </div>
      </section>
    </div>
  );
}
