import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Loader2, Pencil, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "url"
  | "email";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
}

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface CrudWorkspaceProps<T extends { id: string }> {
  title: string;
  tagline?: string;
  description?: string;
  icon: LucideIcon;
  queryKey: string;
  fetch: () => Promise<T[]>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string, patch: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  searchKeys?: (keyof T)[];
  emptyHint?: string;
  Stats?: ComponentType<{ rows: T[] }>;
  extra?: ReactNode;
  singular?: string;
  initialRecordId?: string | null;
}

function toFormValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function fromFormValue(v: string, type: FieldType | undefined) {
  if (v === "" || v === undefined) return null;
  if (type === "number") return Number(v);
  return v;
}

export function CrudWorkspace<T extends { id: string; created_at?: string; updated_at?: string }>(
  props: CrudWorkspaceProps<T>,
) {
  const {
    title,
    tagline,
    description,
    icon: Icon,
    queryKey,
    fetch,
    create,
    update,
    remove,
    fields,
    columns,
    searchKeys,
    emptyHint,
    Stats,
    extra,
    singular = "item",
    initialRecordId = null,
  } = props;

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetch });
  const rows = data ?? [];

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const openedInitialRecordRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialRecordId || isLoading || openedInitialRecordRef.current === initialRecordId) return;
    const row = rows.find((candidate) => candidate.id === initialRecordId);
    if (!row) return;
    openedInitialRecordRef.current = initialRecordId;
    setEditing({ ...row });
    setOpen(true);
  }, [initialRecordId, isLoading, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const keys = searchKeys ?? (columns.map((c) => c.key) as (keyof T)[]);
    return rows.filter((r) =>
      keys.some((k) => {
        const v = (r as Record<string, unknown>)[k as string];
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, searchKeys, columns]);

  const createMut = useMutation({
    mutationFn: (payload: Partial<T>) =>
      editing?.id ? update(editing.id, payload).then(() => ({}) as T) : create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(editing?.id ? `${singular} updated` : `${singular} created`);
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(`${singular} deleted`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    const seed: Record<string, unknown> = {};
    for (const f of fields) if (f.defaultValue !== undefined) seed[f.key] = f.defaultValue;
    setEditing(seed as Partial<T>);
    setOpen(true);
  }
  function openEdit(row: T) {
    setEditing({ ...row });
    setOpen(true);
  }

  function handleSave() {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && !toFormValue((editing as Record<string, unknown>)[f.key]).trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = (editing as Record<string, unknown>)[f.key];
      payload[f.key] = fromFormValue(toFormValue(v), f.type);
    }
    createMut.mutate(payload as Partial<T>);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Icon className="h-5 w-5" />
              </div>
              <StatusBadge status="Live" />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">{title}</h1>
            {tagline && <p className="mt-1 text-primary/90">{tagline}</p>}
            {description && (
              <p className="mt-2 max-w-2xl text-muted-foreground text-sm">{description}</p>
            )}
          </div>
          <Button
            onClick={openCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New {singular}
          </Button>
        </div>
      </section>

      {Stats && <Stats rows={rows} />}

      <section className="glass-card p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${singular}s…`}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} of ${rows.length}`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Inbox className="h-6 w-6" />
              </div>
              <div className="font-medium">No {singular}s yet</div>
              <p className="max-w-sm text-sm text-muted-foreground">
                {emptyHint ?? `Create your first ${singular} to get started.`}
              </p>
              <Button
                onClick={openCreate}
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus className="mr-1.5 h-4 w-4" /> New {singular}
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border/60">
                  {columns.map((c) => (
                    <th
                      key={String(c.key)}
                      className={cn("px-3 py-2 text-left font-medium", c.className)}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 hover:bg-primary/5">
                    {columns.map((c) => (
                      <td key={String(c.key)} className={cn("px-3 py-3 align-top", c.className)}>
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key as string] ?? "—")}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete this ${singular}?`)) deleteMut.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {extra}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${singular}` : `New ${singular}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {fields.map((f) => {
              const value = toFormValue((editing as Record<string, unknown> | null)?.[f.key]);
              const setValue = (v: string) =>
                setEditing((prev) => ({ ...(prev ?? {}), [f.key]: v }) as Partial<T>);
              return (
                <div key={f.key} className="grid gap-1.5">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {f.label}
                    {f.required && <span className="text-primary"> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={f.placeholder}
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">—</option>
                      {[
                        ...(value && !(f.options ?? []).includes(value) ? [value] : []),
                        ...(f.options ?? []),
                      ].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : f.type === "datetime"
                              ? "datetime-local"
                              : f.type === "email"
                                ? "email"
                                : f.type === "url"
                                  ? "url"
                                  : "text"
                      }
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
            >
              {createMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {editing?.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function fmtCurrency(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return "R " + v.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}
export function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
