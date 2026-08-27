import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCopy,
  ExternalLink,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Save,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

interface ReviewRequest {
  id: string;
  token: string;
  customer_name: string;
  customer_phone: string | null;
  project_title: string | null;
  sent_via: string;
  sent_at: string;
  clicked_at: string | null;
  click_count: number;
  delivery_status: string;
  prepared_at: string;
  delivered_at: string | null;
  delivery_evidence: string | null;
}

interface ReviewData {
  placeId: string;
  businessName: string;
  requests: ReviewRequest[];
}

export const Route = createFileRoute("/marketing/reviews")({
  component: ReviewsPage,
  head: () => ({
    meta: [
      { title: "Google Reviews — Cossa AI" },
      {
        name: "description",
        content: "Prepare review invites, track review-link clicks and preserve delivery truth.",
      },
    ],
  }),
});

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function makeToken(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function reviewUrl(token: string): string {
  if (typeof window === "undefined") return `/api/public/r/${token}`;
  return `${window.location.origin}/api/public/r/${token}`;
}

function whatsappUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

async function loadReviews(): Promise<ReviewData> {
  const [settingsResult, requestsResult] = await Promise.all([
    db
      .from("app_settings")
      .select("key,value")
      .in("key", ["google_place_id", "google_business_name"]),
    db
      .from("review_requests")
      .select(
        "id,token,customer_name,customer_phone,project_title,sent_via,sent_at,clicked_at,click_count,delivery_status,prepared_at,delivered_at,delivery_evidence",
      )
      .order("prepared_at", { ascending: false })
      .limit(100),
  ]);

  if (settingsResult.error)
    throw new Error(`Unable to load review settings: ${settingsResult.error.message}`);
  if (requestsResult.error)
    throw new Error(`Unable to load review requests: ${requestsResult.error.message}`);

  const settings = (settingsResult.data ?? []) as Array<{ key: string; value: string | null }>;

  return {
    placeId: settings.find((item) => item.key === "google_place_id")?.value?.trim() ?? "",
    businessName:
      settings.find((item) => item.key === "google_business_name")?.value?.trim() ||
      "Cossa Nexus Holdings",
    requests: ((requestsResult.data ?? []) as ReviewRequest[]).map((request) => ({
      ...request,
      delivery_status: request.delivery_status || "unknown",
      click_count: Number(request.click_count ?? 0),
    })),
  };
}

async function saveReviewSettings(payload: {
  placeId: string;
  businessName: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("app_settings").upsert(
    [
      { key: "google_place_id", value: payload.placeId.trim(), updated_at: now },
      {
        key: "google_business_name",
        value: payload.businessName.trim() || "Cossa Nexus Holdings",
        updated_at: now,
      },
    ],
    { onConflict: "key" },
  );
  if (error) throw new Error(`Unable to save Google review settings: ${error.message}`);
}

async function prepareInvite(payload: {
  customerName: string;
  customerPhone: string;
  projectTitle: string;
}): Promise<ReviewRequest> {
  const customerName = payload.customerName.trim();
  if (!customerName) throw new Error("Customer name is required.");

  const { data: auth } = await supabase.auth.getUser();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("review_requests")
    .insert({
      token: makeToken(),
      customer_name: customerName,
      customer_phone: clean(payload.customerPhone),
      project_title: clean(payload.projectTitle),
      sent_via: "link",
      delivery_status: "prepared",
      prepared_at: now,
      created_by: auth.user?.id ?? null,
    })
    .select(
      "id,token,customer_name,customer_phone,project_title,sent_via,sent_at,clicked_at,click_count,delivery_status,prepared_at,delivered_at,delivery_evidence",
    )
    .single();

  if (error) throw new Error(`Unable to prepare the review invite: ${error.message}`);
  return data as ReviewRequest;
}

async function markDeliveryOpened(id: string, channel: string): Promise<void> {
  const { data, error } = await db
    .from("review_requests")
    .update({
      sent_via: channel,
      delivery_status: "delivery_opened",
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Unable to record the delivery attempt: ${error.message}`);
  if (!data) throw new Error("Review request not found or access denied.");
}

async function markDelivered(id: string, evidence: string): Promise<void> {
  const proof = evidence.trim();
  if (!proof)
    throw new Error("Delivery evidence/reference is required before marking an invite delivered.");

  const { data, error } = await db
    .from("review_requests")
    .update({
      delivery_status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_evidence: proof,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Unable to record delivery evidence: ${error.message}`);
  if (!data) throw new Error("Review request not found or access denied.");
}

function ReviewsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["growth-review-operations"], queryFn: loadReviews });

  const settingsMutation = useMutation({
    mutationFn: saveReviewSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growth-review-operations"] });
      toast.success("Review settings saved");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Settings could not be saved"),
  });

  const prepareMutation = useMutation({
    mutationFn: prepareInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growth-review-operations"] });
      toast.success("Review invite prepared", {
        description: "It is not marked delivered until delivery evidence exists.",
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Invite could not be prepared"),
  });

  const openedMutation = useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: string }) =>
      markDeliveryOpened(id, channel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["growth-review-operations"] }),
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Delivery attempt could not be recorded",
      ),
  });

  const deliveredMutation = useMutation({
    mutationFn: ({ id, evidence }: { id: string; evidence: string }) => markDelivered(id, evidence),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growth-review-operations"] });
      toast.success("Delivery evidence recorded");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Delivery evidence could not be recorded",
      ),
  });

  if (query.isLoading || !query.data) {
    return (
      <div className="glass-card mx-auto flex max-w-6xl items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading review operations…
      </div>
    );
  }

  const data = query.data;
  const prepared = data.requests.filter((request) => request.delivery_status === "prepared").length;
  const opened = data.requests.filter(
    (request) => request.delivery_status === "delivery_opened",
  ).length;
  const delivered = data.requests.filter(
    (request) => request.delivery_status === "delivered",
  ).length;
  const clicked = data.requests.filter((request) => request.click_count > 0).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <Star className="h-5 w-5" />
            </div>
            <StatusBadge status={workspaceRuntimeStatus()} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Google Reviews</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Prepare review invites, track review-link clicks, and distinguish an opened delivery
            channel from verified message delivery. Growth never claims a review was sent or
            completed without evidence.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Prepared", prepared],
          ["Delivery channel opened", opened],
          ["Delivered with evidence", delivered],
          ["Review links clicked", clicked],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-card p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold">
          Google Business Profile review target
        </h2>
        <SettingsForm
          placeId={data.placeId}
          businessName={data.businessName}
          saving={settingsMutation.isPending}
          onSave={(placeId, businessName) => settingsMutation.mutate({ placeId, businessName })}
        />
      </section>

      <section className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold">Prepare a review invite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preparing creates a tracked link only. It does not claim WhatsApp, SMS or email delivery
          occurred.
        </p>
        <PrepareForm
          busy={prepareMutation.isPending}
          onPrepare={(customerName, customerPhone, projectTitle) =>
            prepareMutation.mutate({ customerName, customerPhone, projectTitle })
          }
        />
      </section>

      <section className="glass-card overflow-hidden">
        <header className="border-b border-border/60 p-5">
          <h2 className="font-display text-lg font-semibold">Review invite evidence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest 100 prepared review links and their actual evidence state.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-3">Customer</th>
                <th className="px-3 py-3">State</th>
                <th className="px-3 py-3">Clicks</th>
                <th className="px-3 py-3">Prepared</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((request) => (
                <tr key={request.id} className="border-b border-border/40 align-top">
                  <td className="px-5 py-4">
                    <div className="font-medium">{request.customer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.project_title || request.customer_phone || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-widest text-primary">
                      {request.delivery_status.replaceAll("_", " ")}
                    </span>
                    {request.delivery_evidence ? (
                      <div className="mt-1 max-w-56 text-xs text-muted-foreground">
                        Evidence: {request.delivery_evidence}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-4">{request.click_count}</td>
                  <td className="px-3 py-4 text-xs text-muted-foreground">
                    {new Date(request.prepared_at || request.sent_at).toLocaleString("en-ZA")}
                  </td>
                  <td className="px-3 py-4">
                    <ReviewActions
                      request={request}
                      businessName={data.businessName}
                      busy={openedMutation.isPending || deliveredMutation.isPending}
                      onOpen={(channel) => openedMutation.mutate({ id: request.id, channel })}
                      onDelivered={(evidence) =>
                        deliveredMutation.mutate({ id: request.id, evidence })
                      }
                    />
                  </td>
                </tr>
              ))}
              {data.requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No review invites have been prepared yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SettingsForm({
  placeId,
  businessName,
  saving,
  onSave,
}: {
  placeId: string;
  businessName: string;
  saving: boolean;
  onSave: (placeId: string, businessName: string) => void;
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(String(form.get("place_id") ?? ""), String(form.get("business_name") ?? ""));
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        Business name
        <Input name="business_name" defaultValue={businessName} required />
      </label>
      <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        Google Place ID
        <Input name="place_id" defaultValue={placeId} placeholder="ChIJ…" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save review target
        </Button>
      </div>
    </form>
  );
}

function PrepareForm({
  busy,
  onPrepare,
}: {
  busy: boolean;
  onPrepare: (customerName: string, customerPhone: string, projectTitle: string) => void;
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPrepare(
      String(form.get("customer_name") ?? ""),
      String(form.get("customer_phone") ?? ""),
      String(form.get("project_title") ?? ""),
    );
    event.currentTarget.reset();
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        Customer name
        <Input name="customer_name" required />
      </label>
      <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        Customer phone
        <Input name="customer_phone" placeholder="2782…" />
      </label>
      <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground sm:col-span-2">
        Project / job
        <Input name="project_title" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Star className="mr-2 h-4 w-4" />
          )}
          Prepare tracked invite
        </Button>
      </div>
    </form>
  );
}

function ReviewActions({
  request,
  businessName,
  busy,
  onOpen,
  onDelivered,
}: {
  request: ReviewRequest;
  businessName: string;
  busy: boolean;
  onOpen: (channel: string) => void;
  onDelivered: (evidence: string) => void;
}) {
  const url = reviewUrl(request.token);
  const message = `Hi ${request.customer_name.split(" ")[0]}, thank you for trusting ${businessName}${request.project_title ? ` with ${request.project_title}` : ""}. If we did a great job, would you leave us a quick Google review? ${url}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Review invite copied", {
        description: "Still recorded as prepared until delivery evidence exists.",
      });
    } catch {
      toast.error("Clipboard access failed");
    }
  }

  async function openWhatsApp() {
    if (!request.customer_phone) {
      toast.error("No customer phone is recorded for this invite.");
      return;
    }
    onOpen("whatsapp");
    window.open(whatsappUrl(request.customer_phone, message), "_blank", "noopener,noreferrer");
  }

  function confirmDelivered() {
    const evidence = window.prompt(
      "Enter delivery evidence/reference (for example: verified message ID, delivery receipt reference, or a concise manual verification note):",
    );
    if (!evidence?.trim()) return;
    onDelivered(evidence);
  }

  return (
    <div className="flex min-w-56 flex-wrap gap-1">
      <Button size="sm" variant="outline" onClick={copyInvite}>
        <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
        Copy
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={openWhatsApp}
        disabled={busy || !request.customer_phone}
      >
        <MessageCircle className="mr-1 h-3.5 w-3.5" />
        WhatsApp
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Test link
        </a>
      </Button>
      {request.delivery_status !== "delivered" ? (
        <Button size="sm" variant="outline" onClick={confirmDelivered} disabled={busy}>
          <MousePointerClick className="mr-1 h-3.5 w-3.5" />
          Verify delivered
        </Button>
      ) : null}
    </div>
  );
}
