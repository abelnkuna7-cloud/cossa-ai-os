import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, FileText, Loader2, Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { listKnowledge, type AiKnowledgeDoc } from "@/lib/ai-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playbooks")({
  component: Playbooks,
  head: () => ({
    meta: [
      { title: "Business Playbooks — Cossa AI" },
      {
        name: "description",
        content: "Owner-approved Cossa operating playbooks drawn from the shared Knowledge Base.",
      },
      { property: "og:title", content: "Business Playbooks — Cossa AI" },
    ],
  }),
});

function isPlaybook(document: AiKnowledgeDoc): boolean {
  return document.category?.trim().toLowerCase() === "playbooks" ||
    document.tags.some((tag) => tag.trim().toLowerCase() === "playbook");
}

function Playbooks() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [preview, setPreview] = useState<AiKnowledgeDoc | null>(null);
  const knowledge = useQuery({ queryKey: ["ai-knowledge"], queryFn: listKnowledge });

  const playbooks = useMemo(
    () => (knowledge.data ?? []).filter(isPlaybook),
    [knowledge.data],
  );

  const tags = useMemo(
    () => [
      "All",
      ...[...new Set(playbooks.flatMap((playbook) => playbook.tags))]
        .filter((tag) => tag !== "company-wide")
        .sort((a, b) => a.localeCompare(b)),
    ],
    [playbooks],
  );

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();

    return playbooks.filter((playbook) => {
      const matchesTag = selectedTag === "All" || playbook.tags.includes(selectedTag);
      const searchable = `${playbook.title} ${playbook.body} ${playbook.tags.join(" ")}`.toLowerCase();
      return matchesTag && (!query || searchable.includes(query));
    });
  }, [playbooks, search, selectedTag]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                <BookOpen className="h-4 w-4" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
              Business <span className="text-gradient-gold">Playbooks</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Owner-approved Cossa operating guides. Add or change a playbook in the Knowledge Base once; Cossa AI and every specialist can use it as verified context.
            </p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
            <Link to="/ai/knowledge">
              <Plus className="mr-1.5 h-4 w-4" /> Add or update a playbook
            </Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selectedTag === tag
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 bg-transparent outline-none"
            placeholder="Search approved playbooks"
          />
        </label>
      </section>

      {knowledge.isLoading ? (
        <section className="glass-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading approved playbooks...
        </section>
      ) : shown.length === 0 ? (
        <section className="glass-card p-10 text-center">
          <FileText className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 font-display text-lg font-semibold">No approved playbooks yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            This page never invents ratings, outcomes or timelines. Create a Knowledge Base document with the category “Playbooks” or the tag “playbook” to add a real Cossa guide here.
          </p>
          <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
            <Link to="/ai/knowledge"><Plus className="mr-1.5 h-4 w-4" /> Create a playbook</Link>
          </Button>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((playbook) => (
            <article key={playbook.id} className="glass-card group flex flex-col p-5 transition-all hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-success">Verified</span>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{playbook.title}</h3>
              <p className="mt-1 line-clamp-5 flex-1 text-xs text-muted-foreground">{playbook.body}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {playbook.tags.filter((tag) => tag !== "company-wide").map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Tag className="h-2.5 w-2.5" /> {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10" onClick={() => setPreview(playbook)}>
                  Preview
                </Button>
                <Button asChild size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
                  <Link to="/ai/cossa">Ask Cossa AI <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <article className="glass-card w-full max-w-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Verified Cossa playbook</p>
                <h2 className="mt-1 font-display text-xl font-semibold">{preview.title}</h2>
              </div>
              <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{preview.body}</div>
            {preview.source ? <p className="mt-4 text-xs text-muted-foreground">Source: {preview.source}</p> : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}
