import type { ModuleStatus } from "@/lib/modules";
import { cn } from "@/lib/utils";

const styles: Record<ModuleStatus, string> = {
  Planning: "bg-muted/40 text-muted-foreground border-border",
  Design: "bg-info/15 text-info border-info/40",
  Development: "bg-warning/15 text-warning border-warning/40",
  Testing: "bg-chart-5/15 text-chart-5 border-chart-5/40",
  Preview: "bg-warning/15 text-warning border-warning/40",
  Live: "bg-success/15 text-success border-success/40",
  Production: "bg-success/15 text-success border-success/40",
};

export function StatusBadge({ status, className }: { status: ModuleStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
