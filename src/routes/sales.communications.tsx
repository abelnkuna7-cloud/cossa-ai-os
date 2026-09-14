import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { crmOptions } from "@/lib/crm-config";
import {
  crmCommunications,
  communicationEmailComposeUrl,
  communicationWhatsAppUrl,
  type CrmCommunication,
} from "@/lib/crm-communications";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

export const Route = createFileRoute("/sales/communications")({
  component: CommunicationsHub,
  head: () => ({
    meta: [
      { title: "CRM Communications — Cossa AI" },
      {
        name: "description",
        content: "Track important customer, supplier, payment, tender and partner communications.",
      },
    ],
  }),
});

function formatDate(value: string | null) {
  if (!value) return "No review date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function labelFor(options: { key: string; label: string }[], key: string) {
  return options.find((item) => item.key === key)?.label ?? key.replace(/_/g, " ");
}

function isDue(item: CrmCommunication) {
  return Boolean(item.requires_action && item.next_review_at && new Date(item.next_review_at).getTime() <= Date.now());
}

function CommunicationsHub() {
  const queryClient = useQueryClient();
  const communications = useQuery({
    queryKey: ["crm-communications"],
    queryFn: crmCommunications.list,
    refetchInterval: 60_000,
  });
  const categories = useQuery({
    queryKey: ["crm-options", "communication_category"],
    queryFn: () => crmOptions.list("communication_category", false),
  });
  const statuses = useQuery({
    queryKey: ["crm-options", "communication_status"],
    queryFn: () => crmOptions.list("communication_status", false),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CrmCommunication> }) =>
      crmCommunications.update(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-communications"] });
      toast.success("Communication record updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const rows = communications.data ?? [];
  const actionRequired = rows.filter((item) => item.requires_action && !["resolved", "rejected"].includes(item.status));
  const overdue = actionRequired.filter(isDue);
  const paymentItems = rows.filter((item) => item.category === "payment_provider" && !["resolved", "rejected"].includes(item.status));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
                <MessageCircle className="h-5 w-5" />
              </div>
              <StatusBadge status={workspaceRuntimeStatus()} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Important Communications</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              One operational record for important Gmail, WhatsApp and other business conversations. Newsletters and routine promotions stay out of CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => communications.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-primary/40"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground"><Bell className="h-4 w-4" /> Needs action</div>
          <div className="mt-2 font-display text-3xl font-semibold">{actionRequired.length}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground"><CalendarClock className="h-4 w-4" /> Due / overdue</div>
          <div className="mt-2 font-display text-3xl font-semibold">{overdue.length}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Payment providers open</div>
          <div className="mt-2 font-display text-3xl font-semibold">{paymentItems.length}</div>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <h2 className="font-display text-xl font-semibold">Tracked conversations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email and WhatsApp actions use the saved contact channel. Provider links reopen the original source conversation when available.
          </p>
        </div>

        {communications.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading communications…</div>
        ) : communications.isError ? (
          <div className="p-6 text-sm text-destructive">
            {communications.error instanceof Error ? communications.error.message : "Unable to load communications."}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No important communications have been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((item) => {
              const emailUrl = communicationEmailComposeUrl(item.contact_email);
              const whatsappUrl = communicationWhatsAppUrl(item.contact_phone);
              const closed = ["resolved", "rejected"].includes(item.status);
              return (
                <article key={item.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                          {labelFor(categories.data ?? [], item.category)}
                        </span>
                        <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.channel}
                        </span>
                        <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {labelFor(statuses.data ?? [], item.status)}
                        </span>
                        {item.requires_action && !closed ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider">
                            {isDue(item) ? "Due now" : "Action required"}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 font-display text-lg font-semibold">
                        {item.subject || `${item.contact_name || item.company_name || "Business communication"}`}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[item.contact_name, item.company_name, item.contact_email].filter(Boolean).join(" · ")}
                      </p>
                      {item.summary ? <p className="mt-3 max-w-4xl text-sm text-muted-foreground">{item.summary}</p> : null}
                      <div className="mt-3 text-xs text-muted-foreground">
                        Received/activity: {formatDate(item.occurred_at)} · Next review: {formatDate(item.next_review_at)}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.external_url ? (
                        <a href={item.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40">
                          <ExternalLink className="h-3.5 w-3.5" /> Open source
                        </a>
                      ) : null}
                      {emailUrl ? (
                        <a href={emailUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      ) : null}
                      {whatsappUrl ? (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40">
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : null}
                      {!closed ? (
                        <button
                          type="button"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ id: item.id, patch: { status: "resolved", requires_action: false, next_review_at: null } })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
