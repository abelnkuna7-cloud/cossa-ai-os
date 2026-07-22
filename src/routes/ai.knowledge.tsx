import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Library, Plus, Search, Trash2, Loader2, FileText, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  listKnowledge, upsertKnowledge, deleteKnowledge, type AiKnowledgeDoc,
} from "@/lib/ai-data";

export const Route = createFileRoute("/ai/knowledge")({
  component: KnowledgeBase,
  head: () => ({
    meta: [
      { title: "Knowledge Base — Cossa AI" },
      { name: "description", content: "Store the facts about your business so Cossa AI can reference them in every answer." },
      { property: "og:title", content: "Knowledge Base — Cossa AI" },
      { property: "og:description", content: "Products, pricing, policies, playbooks — your AI's long-term memory." },
    ],
  }),
});

const CATEGORIES = ["Company", "Products", "Pricing", "Policies", "Customers", "Playbooks"];

function KnowledgeBase() {
  const qc = useQueryClient();
  const { data: docs, isLoading } = useQuery({ queryKey: ["ai-knowledge"], queryFn: listKnowledge });
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<AiKnowledgeDoc> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (docs ?? []).filter((d) => {
      if (cat && d.category !== cat) return false;
      if (!q) return true;
      return d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q);
    });
  }, [docs, search, cat]);

  async function handleSave() {
    if (!editing?.title?.trim() || !editing.body?.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      await upsertKnowledge({
        id: editing.id,
        title: editing.title.trim(),
        body: editing.body.trim(),
        category: editing.category ?? null,
        tags: editing.tags ?? [],
        source: editing.source ?? null,
      });
      toast.success(editing.id ? "Document updated" : "Document saved");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["ai-knowledge"] });
    } catch (e) {
      toast.error("Save failed", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteKnowledge(id);
      await qc.invalidateQueries({ queryKey: ["ai-knowledge"] });
    } catch (e) {
      toast.error("Delete failed", { description: (e as Error).message });
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <Library className="h-4 w-4" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Knowledge <span className="text-gradient-gold">Base</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              The single source of truth about your business. Cossa AI reads from here so answers always match reality.
            </p>
          </div>
          <Button
            onClick={() => setEditing({ title: "", body: "", category: null, tags: [], source: null })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add document
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge"
            className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={() => setCat(null)}
          className={cn("rounded-full border px-3 py-1 text-xs", !cat ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c === cat ? null : c)}
            className={cn("rounded-full border px-3 py-1 text-xs", c === cat ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40")}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading knowledge…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <FileText className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 font-display text-lg font-semibold">No documents yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Start with the essentials: company description, product list, pricing, ideal customer, and top FAQs.
          </p>
          <Button
            onClick={() => setEditing({ title: "", body: "", category: "Company", tags: [], source: null })}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add your first document
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <article key={d.id} className="glass-card flex flex-col p-4">
              <header className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold">{d.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {d.category && <span>{d.category}</span>}
                    <span>{new Date(d.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </header>
              <p className="line-clamp-5 flex-1 text-xs text-muted-foreground">{d.body}</p>
              {d.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" />{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-end gap-1">
                <button
                  onClick={() => setEditing(d)}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-card/60 hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="glass-card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold">{editing.id ? "Edit document" : "New document"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Title (e.g. 'Company overview' or 'Product pricing 2026')"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <textarea
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Body — write facts. Cossa AI will read this."
                rows={10}
                className="w-full resize-none rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <input
                value={editing.source ?? ""}
                onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                placeholder="Source (optional) — URL or document reference"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, category: editing.category === c ? null : c })}
                    className={cn("rounded-full border px-3 py-1 text-xs", editing.category === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
