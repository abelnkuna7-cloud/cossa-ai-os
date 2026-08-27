import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  ImageIcon,
  LibraryBig,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createShowcaseItem,
  listShowcaseItems,
  updateShowcaseItem,
  type ShowcaseApprovalStatus,
  type ShowcaseClassification,
  type ShowcaseItem,
  type ShowcaseItemInput,
  type ShowcasePublicationStatus,
} from "@/lib/showcase-data";

export const Route = createFileRoute("/marketing/showcase-library")({
  component: ShowcaseLibraryPage,
  head: () => ({
    meta: [
      { title: "Showcase Library — Cossa Growth" },
      {
        name: "description",
        content: "Cossa's evidence-led library of systems, approved work and capability samples.",
      },
    ],
  }),
});

const assetTypes = [
  "website",
  "landing_page",
  "ecommerce",
  "local_seo",
  "company_profile",
  "brochure",
  "flyer",
  "brand_identity",
  "social_campaign",
  "crm_dashboard",
  "ai_assistant",
  "automation",
  "integration",
  "analytics_dashboard",
  "document_workflow",
  "customer_journey",
  "video",
  "other",
] as const;

const inputClass =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

type FormState = {
  title: string;
  description: string;
  business_name: string;
  capability: string;
  industry: string;
  classification: ShowcaseClassification;
  asset_type: string;
  tags: string;
  platform_channels: string;
  destination_url: string;
  demo_url: string;
  video_url: string;
  thumbnail_url: string;
  cta_label: string;
  publication_status: ShowcasePublicationStatus;
  approval_status: ShowcaseApprovalStatus;
  approval_note: string;
  client_authorisation_reference: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  business_name: "Cossa Nexus Holdings",
  capability: "",
  industry: "",
  classification: "capability_sample",
  asset_type: "website",
  tags: "",
  platform_channels: "",
  destination_url: "",
  demo_url: "",
  video_url: "",
  thumbnail_url: "",
  cta_label: "View sample",
  publication_status: "draft",
  approval_status: "pending",
  approval_note: "",
  client_authorisation_reference: "",
};

function humanise(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(item: ShowcaseItem): FormState {
  return {
    title: item.title,
    description: item.description,
    business_name: item.business_name,
    capability: item.capability,
    industry: item.industry ?? "",
    classification: item.classification,
    asset_type: item.asset_type,
    tags: item.tags.join(", "),
    platform_channels: item.platform_channels.join(", "),
    destination_url: item.destination_url ?? "",
    demo_url: item.demo_url ?? "",
    video_url: item.video_url ?? "",
    thumbnail_url: item.thumbnail_url ?? "",
    cta_label: item.cta_label ?? "",
    publication_status: item.publication_status,
    approval_status: item.approval_status,
    approval_note: item.approval_note ?? "",
    client_authorisation_reference: item.client_authorisation_reference ?? "",
  };
}

function fromForm(form: FormState): ShowcaseItemInput {
  return {
    ...form,
    tags: parseList(form.tags),
    platform_channels: parseList(form.platform_channels),
  };
}

function canOpenUrl(value: string | null): value is string {
  return Boolean(value && (/^https?:\/\//.test(value) || value.startsWith("/")));
}

function statusTone(status: string): string {
  if (status === "approved" || status === "published")
    return "border-success/40 bg-success/10 text-success";
  if (status === "pending" || status === "internal")
    return "border-primary/40 bg-primary/10 text-primary";
  if (status === "rejected" || status === "archived")
    return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function ShowcaseLibraryPage() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: ["showcase-library"],
    queryFn: listShowcaseItems,
    staleTime: 30_000,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateShowcaseItem(editingId, fromForm(form));
      } else {
        await createShowcaseItem(fromForm(form));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["showcase-library"] });
      setEditingId(null);
      setForm(emptyForm);
      setFormOpen(false);
    },
  });

  const items = itemsQuery.data ?? [];
  const counts = useMemo(
    () => ({
      live: items.filter((item) => item.classification === "live_cossa_system").length,
      samples: items.filter((item) => item.classification === "capability_sample").length,
      client: items.filter((item) => item.classification === "verified_client_work").length,
      published: items.filter((item) => item.publication_status === "published").length,
    }),
    [items],
  );

  function beginCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function beginEdit(item: ShowcaseItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setFormOpen(true);
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const clientReferenceRequired = form.classification === "verified_client_work";
  const publicApprovalRequired = form.publication_status === "published";
  const formBlocked =
    !form.title.trim() ||
    !form.description.trim() ||
    !form.business_name.trim() ||
    !form.capability.trim() ||
    (clientReferenceRequired && !form.client_authorisation_reference.trim()) ||
    (publicApprovalRequired && form.approval_status !== "approved");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
              <LibraryBig className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Customer acquisition proof
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
                Showcase Library
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A managed, evidence-led asset library for Cossa Nexus Holdings. Live Cossa systems,
                capability samples, and authorised client work are deliberately kept distinct.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void itemsQuery.refetch()}
              disabled={itemsQuery.isFetching}
            >
              <RefreshCw
                className={itemsQuery.isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
              />
              Refresh
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={beginCreate}
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              Add showcase record
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LibraryStat
          label="Live Cossa systems"
          value={itemsQuery.isLoading ? "Loading" : String(counts.live)}
        />
        <LibraryStat
          label="Capability samples"
          value={itemsQuery.isLoading ? "Loading" : String(counts.samples)}
        />
        <LibraryStat
          label="Authorised client work"
          value={itemsQuery.isLoading ? "Loading" : String(counts.client)}
        />
        <LibraryStat
          label="Publicly approved"
          value={itemsQuery.isLoading ? "Loading" : String(counts.published)}
        />
      </section>

      {itemsQuery.isError ? (
        <section role="alert" className="glass-card flex gap-3 border-destructive/40 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold">The Showcase Library could not be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing has been changed. Check your authenticated access and refresh.
            </p>
          </div>
        </section>
      ) : null}

      {formOpen ? (
        <section className="glass-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {editingId ? "Edit showcase record" : "Create showcase record"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Publication stays internal unless an approved record is deliberately marked public.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className={inputClass}
                maxLength={180}
                required
              />
            </Field>
            <Field label="Cossa business">
              <input
                value={form.business_name}
                onChange={(event) => updateField("business_name", event.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Capability / service">
              <input
                value={form.capability}
                onChange={(event) => updateField("capability", event.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                onChange={(event) => updateField("industry", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Classification">
              <select
                value={form.classification}
                onChange={(event) =>
                  updateField("classification", event.target.value as ShowcaseClassification)
                }
                className={inputClass}
              >
                <option value="capability_sample">Capability sample</option>
                <option value="live_cossa_system">Live Cossa system</option>
                <option value="verified_client_work">Verified client work</option>
              </select>
            </Field>
            <Field label="Asset type">
              <select
                value={form.asset_type}
                onChange={(event) => updateField("asset_type", event.target.value)}
                className={inputClass}
              >
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {humanise(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags (comma-separated)">
              <input
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
                className={inputClass}
                placeholder="CRM, automation, sales"
              />
            </Field>
            <Field label="Platforms / channels (comma-separated)">
              <input
                value={form.platform_channels}
                onChange={(event) => updateField("platform_channels", event.target.value)}
                className={inputClass}
                placeholder="Website, LinkedIn, video"
              />
            </Field>
            <Field label="Destination URL">
              <input
                value={form.destination_url}
                onChange={(event) => updateField("destination_url", event.target.value)}
                className={inputClass}
                placeholder="/businesses/tech or https://…"
              />
            </Field>
            <Field label="CTA label">
              <input
                value={form.cta_label}
                onChange={(event) => updateField("cta_label", event.target.value)}
                className={inputClass}
                placeholder="View sample"
              />
            </Field>
            <Field label="Thumbnail URL">
              <input
                value={form.thumbnail_url}
                onChange={(event) => updateField("thumbnail_url", event.target.value)}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <Field label="Video URL">
              <input
                value={form.video_url}
                onChange={(event) => updateField("video_url", event.target.value)}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <Field label="Publication status">
              <select
                value={form.publication_status}
                onChange={(event) =>
                  updateField("publication_status", event.target.value as ShowcasePublicationStatus)
                }
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="internal">Internal</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Approval status">
              <select
                value={form.approval_status}
                onChange={(event) =>
                  updateField("approval_status", event.target.value as ShowcaseApprovalStatus)
                }
                className={inputClass}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="not_required">Not required</option>
              </select>
            </Field>
            {clientReferenceRequired ? (
              <Field label="Client authorisation reference">
                <input
                  value={form.client_authorisation_reference}
                  onChange={(event) =>
                    updateField("client_authorisation_reference", event.target.value)
                  }
                  className={inputClass}
                  required
                />
                <p className="mt-1 text-xs text-warning">
                  Required before a record can be labelled verified client work.
                </p>
              </Field>
            ) : null}
            <Field label="Approval note">
              <input
                value={form.approval_note}
                onChange={(event) => updateField("approval_note", event.target.value)}
                className={inputClass}
                placeholder="Evidence or publication decision"
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className={`${inputClass} min-h-28`}
                maxLength={2000}
                required
              />
            </Field>
          </div>
          {clientReferenceRequired || publicApprovalRequired ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-warning" />
              {clientReferenceRequired
                ? "Client work needs an authorisation reference."
                : "A public record must be approved before it can be saved."}
            </div>
          ) : null}
          {mutation.isError ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => mutation.mutate()}
              disabled={formBlocked || mutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {mutation.isPending ? "Saving…" : editingId ? "Save changes" : "Create record"}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="glass-card p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">Controlled proof assets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No customer results, performance metrics, or client work are implied by an empty record.
            Public views and analytics are added only after a content owner approves them.
          </p>
        </div>
        {itemsQuery.isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading showcase records…</p>
        ) : items.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No showcase record has been created yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <ShowcaseCard key={item.id} item={item} onEdit={() => beginEdit(item)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LibraryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ShowcaseCard({ item, onEdit }: { item: ShowcaseItem; onEdit: () => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      {item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt="" className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-28 items-center gap-3 border-b border-border/60 bg-gradient-to-br from-primary/15 via-card to-background px-5">
          <ImageIcon className="h-6 w-6 text-primary" />
          <p className="text-xs text-muted-foreground">No thumbnail has been approved yet</p>
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {item.business_name} · {humanise(item.asset_type)}
            </p>
            <h3 className="mt-1 font-semibold">{item.title}</h3>
          </div>
          <div className="flex flex-wrap gap-1">
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(item.publication_status)}`}
            >
              {humanise(item.publication_status)}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(item.approval_status)}`}
            >
              {humanise(item.approval_status)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 px-2 py-1 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          {canOpenUrl(item.destination_url) ? (
            <a href={item.destination_url}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {item.cta_label || "Open"}
              </Button>
            </a>
          ) : null}
          {canOpenUrl(item.video_url) ? (
            <a href={item.video_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Video className="mr-1.5 h-3.5 w-3.5" />
                Video
              </Button>
            </a>
          ) : null}
          {item.classification === "verified_client_work" ? (
            <span className="ml-auto inline-flex items-center text-xs text-success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Authorisation recorded
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
