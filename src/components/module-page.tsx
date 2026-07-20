import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { getModule, type ModuleItem } from "@/lib/modules";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

interface Props {
  to: string;
  children?: ReactNode;
}

export function ModulePage({ to, children }: Props) {
  const mod = getModule(to) as ModuleItem | undefined;
  if (!mod) return <div className="text-muted-foreground">Module not found.</div>;
  const Icon = mod.icon;
  const isLive = mod.status === "Live";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="glass-card relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Icon className="h-5 w-5" />
            </div>
            <StatusBadge status={mod.status} />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">{mod.title}</h1>
            <p className="mt-2 text-lg text-primary/90">{mod.tagline}</p>
          </div>
          <p className="max-w-3xl text-muted-foreground">{mod.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
              {isLive ? "Open" : "Notify me when ready"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              View roadmap
            </Button>
          </div>
        </div>
      </section>

      {!isLive && (
        <section className="glass-card flex items-start gap-4 border-warning/40 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">🚧 Coming Soon</h3>
              <StatusBadge status={mod.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This module is on the Cossa AI roadmap. When shipped, it will {mod.description.replace(/^./, (c) => c.toLowerCase())}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <section className="glass-card p-6 md:col-span-1">
          <h3 className="font-display text-lg font-semibold">Business value</h3>
          <p className="mt-2 text-sm text-muted-foreground">{mod.value}</p>
        </section>
        <section className="glass-card p-6 md:col-span-2">
          <h3 className="font-display text-lg font-semibold">Key benefits</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {mod.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="glass-card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Future roadmap</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {mod.roadmap.map((r, i) => (
            <div key={r} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-widest text-primary/80">Milestone {i + 1}</div>
              <div className="mt-1 text-sm font-medium">{r}</div>
            </div>
          ))}
        </div>
      </section>

      {children}
    </div>
  );
}
