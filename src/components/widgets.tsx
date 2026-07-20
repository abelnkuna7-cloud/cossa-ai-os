import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import type { ModuleStatus } from "@/lib/modules";

/* ------------------------------ StatCard ------------------------------ */
interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  tone?: string;
}
export function StatCard({ label, value, delta, trend = "up", icon: Icon, tone = "text-primary" }: StatCardProps) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  const trendTone = trend === "down" ? "text-destructive" : "text-success";
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10", tone)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-semibold">{value}</div>
      {delta && (
        <div className={cn("mt-1 inline-flex items-center gap-1 text-xs", trendTone)}>
          <TrendIcon className="h-3 w-3" />
          {delta}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- FeatureCard ---------------------------- */
interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}
export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/* --------------------------- ProgressStat --------------------------- */
export function ProgressStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-primary">{value}%</span>
      </div>
      <Progress value={value} className="mt-1.5 h-1.5" />
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ----------------------------- Timeline ----------------------------- */
export interface TimelineItem {
  title: string;
  time: string;
  description?: string;
  icon?: LucideIcon;
}
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative flex flex-col gap-4 pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/15 to-transparent" aria-hidden />
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <li key={i} className="relative">
            <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-background">
              {Icon ? <Icon className="h-2.5 w-2.5 text-primary" /> : <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{it.title}</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{it.time}</div>
            </div>
            {it.description && <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------- DataTable ---------------------------- */
export interface Column<T> {
  key: keyof T & string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}
export function DataTable<T extends Record<string, unknown>>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full text-sm">
        <thead className="bg-card/60">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-2.5 text-left text-[11px] uppercase tracking-widest text-muted-foreground", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-card/40">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-2.5 align-middle", c.className)}>
                  {c.render ? c.render(r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------- SparkBars ---------------------------- */
export function SparkBars({ data, height = 48 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary/20"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ----------------------------- Widget ----------------------------- */
interface WidgetProps {
  title: string;
  icon?: LucideIcon;
  status?: ModuleStatus;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function Widget({ title, icon: Icon, status, action, children, className }: WidgetProps) {
  return (
    <section className={cn("glass-card flex flex-col gap-4 p-6", className)}>
      <header className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {status && <StatusBadge status={status} />}
        <div className="ml-auto">{action}</div>
      </header>
      {children}
    </section>
  );
}

/* --------------------------- PreviewGrid --------------------------- */
/** Placeholder grid used inside "Coming Soon" module pages to show what the
 * final feature will contain, without any interactive controls. */
export function PreviewGrid({ items }: { items: { icon: LucideIcon; title: string; description: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => {
        const Icon = f.icon as ComponentType<{ className?: string }>;
        return (
          <div key={f.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-sm font-semibold">{f.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
          </div>
        );
      })}
    </div>
  );
}
