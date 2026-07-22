import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked, Plus, Search, Pin, Trash2, Copy, Play, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  listPrompts, upsertPrompt, deletePrompt, incrementPromptUsage, type AiPrompt,
} from "@/lib/ai-data";

export const Route = createFileRoute("/ai/prompts")({
  component: PromptLibrary,
  head: () => ({
    meta: [
      { title: "Prompt Library — Cossa AI" },
      { name: "description", content: "Save, organise and reuse your best AI prompts across marketing, sales and operations." },
      { property: "og:title", content: "Prompt Library — Cossa AI" },
      { property: "og:description", content: "A living library of proven prompts for Cossa AI." },
    ],
  }),
});

const CATEGORIES = ["Marketing", "Sales", "Operations", "Finance", "Strategy", "People"];

function PromptLibrary() {
  const qc = useQueryClient();
  const { data: prompts, isLoading } = useQuery({ queryKey: ["ai-prompts"], queryFn: listPrompts });

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<AiPrompt> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (prompts ?? []).filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
    });
  }, [prompts, search, cat]);

  async function handleSave() {
    if (!editing?.title?.trim() || !editing.body?.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      await upsertPrompt({
        id: editing.id,
        title: editing.title.trim(),
        body: editing.body.trim(),
        category: editing.category ?? null,
        tags: editing.tags ?? [],
        pinned: editing.pinned ?? false,
      });
      toast.success(editing.id ? "Prompt updated" : "Prompt saved");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["ai-prompts"] });
    } catch (e) {
      toast.error("Save failed", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this prompt?")) return;
    try {
      await deletePrompt(id);
      await qc.invalidateQueries({ queryKey: ["ai-prompts"] });
    } catch (e) {
      toast.error("Delete failed", { description: (e as Error).message });
    }
  }

  async function handleCopy(p: AiPrompt) {
    try {
      await navigator.clipboard.writeText(p.body);
      await incrementPromptUsage(p.id, p.usage_count);
      await qc.invalidateQueries({ queryKey: ["ai-prompts"] });
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error("Copy failed", { description: (e as Error).message });
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
                <BookMarked className="h-4 w-4" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Prompt <span className="text-gradient-gold">Library</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Save your best prompts once. Reuse them everywhere. Track what actually works.
            </p>
          </div>
          <Button
            onClick={() => setEditing({ title: "", body: "", category: null, tags: [], pinned: false })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New prompt
          </Button>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts"
            className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={() => setCat(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            !cat ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c === cat ? null : c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              c === cat ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading prompts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 font-display text-lg font-semibold">No prompts yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Save prompts you find yourself typing more than once. They'll be one click away in every module.
          </p>
          <Button
            onClick={() => setEditing({ title: "", body: "", category: null, tags: [], pinned: false })}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create your first prompt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <article key={p.id} className="glass-card flex flex-col p-4">
              <header className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold">{p.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.category && <span>{p.category}</span>}
                    <span>Used {p.usage_count}×</span>
                  </div>
                </div>
                {p.pinned && <Pin className="h-3.5 w-3.5 fill-primary text-primary" />}
              </header>
              <p className="line-clamp-4 flex-1 text-xs text-muted-foreground">{p.body}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" onClick={() => handleCopy(p)}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button asChild size="sm" variant="outline" className="border-border/60">
                  <Link to="/ai/cossa"><Play className="mr-1 h-3 w-3" /> Run</Link>
                </Button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    aria-label="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !saving && setEditing(null)}>
          <div
            className="glass-card w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-semibold">{editing.id ? "Edit prompt" : "New prompt"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Title"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <textarea
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Prompt body — write it exactly as you'd send it to the AI."
                rows={8}
                className="w-full resize-none rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, category: editing.category === c ? null : c })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      editing.category === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60",
                    )}
                  >
                    {c}
                  </button>
                ))}
                <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!editing.pinned}
                    onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })}
                  />
                  Pin
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save prompt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
