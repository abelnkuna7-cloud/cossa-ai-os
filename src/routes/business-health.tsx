import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, BookOpenCheck, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/business-health")({
  component: BusinessHealth,
  head: () => ({
    meta: [
      { title: "Business Health — Cossa AI" },
      {
        name: "description",
        content: "Verified-data business health analysis for Cossa Nexus Holdings.",
      },
    ],
  }),
});

function BusinessHealth() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
              <Activity className="h-5 w-5" />
            </div>
            <StatusBadge status="Development" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
            Business Health <span className="text-gradient-gold">will be evidence-led</span>
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            No score is shown yet because Cossa AI must never present assumptions as company facts.
            This module will calculate health only from approved knowledge, CRM, operations, finance
            and marketing evidence.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Connected data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Leads, customers, quotes, appointments and projects are the first operational sources.
          </p>
        </div>
        <div className="glass-card p-5">
          <BookOpenCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Verified knowledge</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Company facts require a source, owner and verification status before they reach Nexus
            Brain.
          </p>
        </div>
        <div className="glass-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Auditable output</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each future score and recommendation will retain evidence references and approval
            history.
          </p>
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold">
          What must be complete before scoring starts
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Approve the Cossa Nexus knowledge documents and sources.</li>
          <li>Confirm CRM field definitions and remove duplicate legacy fields.</li>
          <li>Connect approved finance, marketing and website analytics sources.</li>
          <li>Define score rules, evidence thresholds and human approval controls.</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/ai/knowledge">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Open verified knowledge <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/sales/leads">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Review CRM data
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
