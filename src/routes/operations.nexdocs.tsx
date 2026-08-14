import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

type NexDocsActivity = {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

const db = supabase as unknown as {
  from: (table: string) => any;
};

async function loadNexDocsActivity(): Promise<NexDocsActivity[]> {
  const { data, error } = await db
    .from("ops_documents")
    .select("id, title, category, status, notes, created_at")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .not("nexdocs_document_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const Route = createFileRoute("/operations/nexdocs")({
  component: NexDocsOperations,
  head: () => ({
    meta: [
      { title: "NexDocs documents — Cossa Growth" },
      {
        name: "description",
        content:
          "Private NexDocs document activity for the Cossa Growth operations workspace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function NexDocsOperations() {
  const activity = useQuery({
    queryKey: ["nexdocs-document-activity"],
    queryFn: loadNexDocsActivity,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="glass-card overflow-hidden p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <FileText className="h-4 w-4" />
              Private operations feed
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">
              NexDocs document activity
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Documents created in the Cossa administrator workspace appear here for operational visibility. Visitor and white-label workspaces remain private and are never added to this feed.
            </p>
          </div>
          <a
            href="https://nexdocs.cossanexusholdings.co.za/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground gold-glow"
          >
            Open NexDocs workspace
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          This is an internal activity view. It contains no customer documents or visitor account data.
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent generated documents</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.data ? `${activity.data.length} document${activity.data.length === 1 ? "" : "s"} visible` : "Loading document activity"}
            </p>
          </div>
        </div>

        {activity.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading NexDocs activity…
          </div>
        ) : activity.isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-destructive">The private document activity could not be loaded.</p>
            <button
              type="button"
              onClick={() => void activity.refetch()}
              className="mt-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50"
            >
              Try again
            </button>
          </div>
        ) : activity.data?.length ? (
          <ul className="divide-y divide-border/50">
            {activity.data.map((document) => (
              <li key={document.id} className="px-5 py-4 transition-colors hover:bg-card/40">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{document.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {document.category ? <span>{document.category}</span> : null}
                      <span>{new Date(document.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {document.status ?? "draft"}
                  </span>
                </div>
                {document.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{document.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-16 text-center">
            <FileText className="mx-auto h-8 w-8 text-primary/60" />
            <h3 className="mt-3 font-display text-lg">No Cossa documents yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Generate a document in the NexDocs administrator workspace and it will appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
