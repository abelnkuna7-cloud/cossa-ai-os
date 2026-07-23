import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { GitBranch, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { salesOpportunities, type SalesOpportunity } from "@/lib/business-data";
import { fmtCurrency, fmtDate } from "@/components/crud-workspace";

export const Route = createFileRoute("/sales/pipeline")({
  component: PipelinePage,
  head: () => ({
    meta: [
      { title: "Sales Pipeline — Cossa AI" },
      { name: "description", content: "Kanban view of every open opportunity, with drag-forward stage moves." },
      { property: "og:title", content: "Sales Pipeline — Cossa AI" },
      { property: "og:description", content: "Cossa AI sales pipeline." },
    ],
  }),
});

const STAGES = ["prospect", "qualified", "proposal", "negotiation", "won", "lost"] as const;

function PipelinePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["sales-opportunities"], queryFn: salesOpportunities.list });
  const rows = data ?? [];
  const mut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => salesOpportunities.update(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-opportunities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Stage updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byStage = STAGES.map((stage) => ({
    stage,
    rows: rows.filter((r) => r.stage === stage),
    value: rows.filter((r) => r.stage === stage).reduce((s, o) => s + Number(o.value ?? 0), 0),
  }));

  function advance(o: SalesOpportunity) {
    const idx = STAGES.indexOf(o.stage as typeof STAGES[number]);
    if (idx < 0 || idx >= STAGES.length - 2) return;
    mut.mutate({ id: o.id, stage: STAGES[idx + 1] });
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <GitBranch className="h-5 w-5" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Sales Pipeline</h1>
            <p className="mt-1 text-muted-foreground text-sm">Move deals forward stage by stage.</p>
          </div>
          <Link to="/sales/opportunities">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              Manage opportunities
            </Button>
          </Link>
        </div>
      </section>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted-foreground">Loading pipeline…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {byStage.map((col) => (
            <div key={col.stage} className="glass-card flex min-h-[420px] flex-col p-3">
              <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-primary">{col.stage}</div>
                <div className="text-[10px] text-muted-foreground">{col.rows.length} · {fmtCurrency(col.value)}</div>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {col.rows.length === 0 ? (
                  <div className="mt-4 text-center text-xs text-muted-foreground">No deals</div>
                ) : col.rows.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="font-medium">{o.title}</div>
                    <div className="mt-1 text-xs text-primary">{fmtCurrency(o.value)} · {o.probability}%</div>
                    {o.expected_close && <div className="text-[10px] text-muted-foreground">Close {fmtDate(o.expected_close)}</div>}
                    {col.stage !== "won" && col.stage !== "lost" && (
                      <Button
                        onClick={() => advance(o)} size="sm" variant="ghost"
                        className="mt-2 h-7 w-full justify-center text-primary hover:bg-primary/10"
                      >
                        Advance <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
