import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CheckCircle2, ExternalLink, Mail, MessageCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { crmOptions } from "@/lib/crm-config";
import { crmCommunications, communicationEmailComposeUrl, communicationWhatsAppUrl, type CrmCommunication } from "@/lib/crm-communications";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/sales/communications")({ component: CommunicationsHub });

function formatDate(value: string | null) {
  if (!value) return "No review date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function labelFor(options: { key: string; label: string }[], key: string) { return options.find((item) => item.key === key)?.label ?? key.replace(/_/g, " "); }
function isDue(item: CrmCommunication) { return Boolean(item.requires_action && item.next_review_at && new Date(item.next_review_at).getTime() <= Date.now()); }

const EMPTY_FORM: Partial<CrmCommunication> = { channel: "email", direction: "inbound", category: "other", status: "open", priority: "normal", requires_action: true };

function CommunicationsHub() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Partial<CrmCommunication>>(EMPTY_FORM);
  const communications = useQuery({ queryKey: ["crm-communications"], queryFn: crmCommunications.list, refetchInterval: 60_000 });
  const categories = useQuery({ queryKey: ["crm-options", "communication_category"], queryFn: () => crmOptions.list("communication_category", false) });
  const statuses = useQuery({ queryKey: ["crm-options", "communication_status"], queryFn: () => crmOptions.list("communication_status", false) });

  const update = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<CrmCommunication> }) => crmCommunications.update(id, patch), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["crm-communications"] }); toast.success("Communication record updated"); }, onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed") });
  const create = useMutation({
    mutationFn: crmCommunications.create,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["crm-communications"] }); setAddOpen(false); setForm(EMPTY_FORM); toast.success("Important communication added"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to add communication"),
  });
  const rows = communications.data ?? [];
  const actionRequired = rows.filter((item) => item.requires_action && !["resolved", "rejected"].includes(item.status));
  const overdue = actionRequired.filter(isDue);
  const paymentItems = rows.filter((item) => item.category === "payment_provider" && !["resolved", "rejected"].includes(item.status));
  const set = (key: keyof CrmCommunication, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

  return <div className="mx-auto flex max-w-7xl flex-col gap-6">
    <section className="glass-card relative overflow-hidden p-6 md:p-8"><div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><MessageCircle className="h-5 w-5" /></div><StatusBadge status={workspaceRuntimeStatus()} /></div><h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Important Communications</h1><p className="mt-1 max-w-3xl text-muted-foreground">Keep only the business highlight and a link to the original Gmail, WhatsApp or other source. Do not copy full conversations into Growth.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => communications.refetch()}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button><Button onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add communication</Button></div></div></section>
    <section className="grid gap-4 sm:grid-cols-3">{[["Needs action", actionRequired.length, Bell],["Due / overdue", overdue.length, CalendarClock],["Payment providers open", paymentItems.length, ShieldCheck]].map(([label,value,Icon]) => { const C = Icon as typeof Bell; return <div key={String(label)} className="glass-card p-5"><div className="flex items-center gap-2 text-muted-foreground"><C className="h-4 w-4" />{String(label)}</div><div className="mt-2 font-display text-3xl font-semibold">{String(value)}</div></div>; })}</section>
    <section className="glass-card overflow-hidden"><div className="border-b border-border/60 p-5"><h2 className="font-display text-xl font-semibold">Tracked conversations</h2><p className="mt-1 text-sm text-muted-foreground">The highlight tells us why it matters. Open source takes us back to the original message.</p></div>{communications.isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading communications…</div> : rows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No important communications have been recorded yet.</div> : <div className="divide-y divide-border/60">{rows.map((item) => { const emailUrl=communicationEmailComposeUrl(item.contact_email); const whatsappUrl=communicationWhatsAppUrl(item.contact_phone); const closed=["resolved","rejected"].includes(item.status); return <article key={item.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] uppercase text-primary">{labelFor(categories.data ?? [], item.category)}</span><span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase text-muted-foreground">{item.channel}</span><span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase text-muted-foreground">{labelFor(statuses.data ?? [], item.status)}</span></div><h3 className="mt-3 font-display text-lg font-semibold">{item.subject || item.contact_name || item.company_name || "Business communication"}</h3><p className="mt-1 text-sm text-muted-foreground">{[item.contact_name,item.company_name,item.contact_email].filter(Boolean).join(" · ")}</p>{item.summary ? <p className="mt-3 max-w-4xl text-sm text-muted-foreground">{item.summary}</p> : null}<div className="mt-3 text-xs text-muted-foreground">Activity: {formatDate(item.occurred_at)} · Next review: {formatDate(item.next_review_at)}</div></div><div className="flex shrink-0 flex-wrap gap-2">{item.external_url ? <a href={item.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" />Open source</a> : null}{emailUrl ? <a href={emailUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs"><Mail className="h-3.5 w-3.5" />Email</a> : null}{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a> : null}{!closed ? <button type="button" onClick={() => update.mutate({id:item.id,patch:{status:"resolved",requires_action:false,next_review_at:null}})} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button> : null}</div></div></article>; })}</div>}</section>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add important communication</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Save the highlight, not the full message. Add the original-message link whenever available.</p><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Contact name" value={form.contact_name ?? ""} onChange={(e)=>set("contact_name",e.target.value)} /><Input placeholder="Company" value={form.company_name ?? ""} onChange={(e)=>set("company_name",e.target.value)} /><Input placeholder="Email" value={form.contact_email ?? ""} onChange={(e)=>set("contact_email",e.target.value)} /><Input placeholder="Phone / WhatsApp" value={form.contact_phone ?? ""} onChange={(e)=>set("contact_phone",e.target.value)} /><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.channel ?? "email"} onChange={(e)=>set("channel",e.target.value)}>{["email","whatsapp","phone","website","other"].map(v=><option key={v} value={v}>{v}</option>)}</select><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category ?? "other"} onChange={(e)=>set("category",e.target.value)}>{(categories.data ?? [{key:"other",label:"Other"}]).map(v=><option key={v.key} value={v.key}>{v.label}</option>)}</select><Input className="sm:col-span-2" placeholder="Subject" value={form.subject ?? ""} onChange={(e)=>set("subject",e.target.value)} /><Textarea className="sm:col-span-2" maxLength={500} placeholder="Short highlight — what happened, why it matters, and what we need to do next (max 500 characters)" value={form.summary ?? ""} onChange={(e)=>set("summary",e.target.value)} /><Input className="sm:col-span-2" type="url" placeholder="Original Gmail / WhatsApp / source message link" value={form.external_url ?? ""} onChange={(e)=>set("external_url",e.target.value)} /><Input type="datetime-local" value={form.next_review_at ?? ""} onChange={(e)=>set("next_review_at",e.target.value || null)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.requires_action)} onChange={(e)=>set("requires_action",e.target.checked)} />Requires follow-up/action</label></div><DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={create.isPending} onClick={()=>create.mutate(form)}>Save communication</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
