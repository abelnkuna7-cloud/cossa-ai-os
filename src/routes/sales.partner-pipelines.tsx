import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Handshake, RefreshCw, Store, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { salesLeads, type SalesLead } from "@/lib/business-data";

export const Route = createFileRoute("/sales/partner-pipelines")({
  component: PartnerPipelinesPage,
  head: () => ({
    meta: [
      { title: "Referral & Merchant Pipelines — GROWTH" },
      {
        name: "description",
        content:
          "Manage referral opportunities and Cossa Store merchant applications from public intake through verification, qualification and conversion.",
      },
    ],
  }),
});

const REFERRAL_SOURCE = "careers_referral_opportunity";
const MERCHANT_SOURCE = "store_merchant_opportunity";
const STAGES = ["new", "verification", "qualified", "contacted", "converted", "rejected"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  new: "New",
  verification: "Verification",
  qualified: "Qualified",
  contacted: "Contacted",
  converted: "Converted",
  rejected: "Rejected",
};

const STAGE_MARKER =
  /\[cossa_partner_stage:(new|verification|qualified|contacted|converted|rejected)\]/i;
const REWARD_MARKER = /\[cossa_referral_reward_status:([^\]]+)\]/i;
const REWARD_AMOUNT_MARKER = /\[cossa_referral_reward_amount:([^\]]+)\]/i;
const ACTUAL_VALUE_MARKER = /\[cossa_actual_value:([^\]]+)\]/i;
const ASSIGNED_UNIT_MARKER = /\[cossa_assigned_unit:([^\]]+)\]/i;
const MERCHANT_APPROVAL_MARKER = /\[cossa_merchant_approval:([^\]]+)\]/i;

function readMarker(notes: string | null, pattern: RegExp, fallback = ""): string {
  return notes?.match(pattern)?.[1]?.trim() || fallback;
}

function cleanMarkers(notes: string | null): string {
  return (notes || "")
    .replace(STAGE_MARKER, "")
    .replace(REWARD_MARKER, "")
    .replace(REWARD_AMOUNT_MARKER, "")
    .replace(ACTUAL_VALUE_MARKER, "")
    .replace(ASSIGNED_UNIT_MARKER, "")
    .replace(MERCHANT_APPROVAL_MARKER, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stageFor(lead: SalesLead): Stage {
  const explicit = readMarker(lead.notes, STAGE_MARKER) as Stage;
  if (STAGES.includes(explicit)) return explicit;
  if (lead.status === "converted") return "converted";
  if (lead.status === "lost") return "rejected";
  if (lead.status === "qualified") return "qualified";
  if (lead.status === "contacted") return "contacted";
  return "new";
}

function databaseStatus(stage: Stage): string {
  if (stage === "verification") return "new";
  if (stage === "rejected") return "lost";
  return stage;
}

function extractLine(notes: string | null, label: string): string {
  const line = (notes || "")
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(label.toLowerCase()));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function PartnerPipelinesPage() {
  const queryClient = useQueryClient();
  const leads = useQuery({
    queryKey: ["sales-leads"],
    queryFn: salesLeads.list,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  const update = useMutation({
    mutationFn: async ({ lead, patch }: { lead: SalesLead; patch: Partial<SalesLead> }) => {
      await salesLeads.update(lead.id, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      toast.success("Pipeline record updated");
    },
    onError: (error) => {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "The record could not be updated.",
      });
    },
  });

  const rows = leads.data ?? [];
  const referrals = rows.filter((lead) => lead.source === REFERRAL_SOURCE);
  const merchants = rows.filter((lead) => lead.source === MERCHANT_SOURCE);

  function saveStage(lead: SalesLead, stage: Stage) {
    const clean = cleanMarkers(lead.notes);
    const notes = [`[cossa_partner_stage:${stage}]`, clean].filter(Boolean).join("\n\n");
    update.mutate({ lead, patch: { status: databaseStatus(stage), notes } });
  }

  function saveCommercialMeta(
    lead: SalesLead,
    fields: {
      rewardStatus?: string;
      rewardAmount?: string;
      actualValue?: string;
      assignedUnit?: string;
      merchantApproval?: string;
    },
  ) {
    const clean = cleanMarkers(lead.notes);
    const markers = [
      fields.rewardStatus ? `[cossa_referral_reward_status:${fields.rewardStatus}]` : null,
      fields.rewardAmount ? `[cossa_referral_reward_amount:${fields.rewardAmount}]` : null,
      fields.actualValue ? `[cossa_actual_value:${fields.actualValue}]` : null,
      fields.assignedUnit ? `[cossa_assigned_unit:${fields.assignedUnit}]` : null,
      fields.merchantApproval ? `[cossa_merchant_approval:${fields.merchantApproval}]` : null,
      `[cossa_partner_stage:${stageFor(lead)}]`,
    ].filter(Boolean);

    update.mutate({ lead, patch: { notes: [...markers, clean].filter(Boolean).join("\n\n") } });
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Handshake className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Revenue partnerships
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Referral & Merchant Pipelines
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Operationalise website referrals and Cossa Store merchant applications without mixing
              them into the ordinary lead queue. Records remain in the existing CRM source of truth.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => leads.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link to="/sales/leads">
              <Button variant="outline">All leads</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Referral opportunities" value={referrals.length} icon={UsersRound} />
        <Metric label="Merchant applications" value={merchants.length} icon={Store} />
        <Metric
          label="Open referrals"
          value={referrals.filter((x) => !["converted", "rejected"].includes(stageFor(x))).length}
          icon={Handshake}
        />
        <Metric
          label="Converted partnerships"
          value={[...referrals, ...merchants].filter((x) => stageFor(x) === "converted").length}
          icon={BadgeDollarSign}
        />
      </section>

      <Pipeline
        title="Referral opportunities"
        description="Track the introduction, verification, business-unit ownership, commercial conversion and referral reward."
        rows={referrals}
        kind="referral"
        busy={update.isPending}
        onStage={saveStage}
        onMeta={saveCommercialMeta}
      />
      <Pipeline
        title="Cossa Store merchant applications"
        description="Track supplier/product-owner applications through verification, approval and activation."
        rows={merchants}
        kind="merchant"
        busy={update.isPending}
        onStage={saveStage}
        onMeta={saveCommercialMeta}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Pipeline({
  title,
  description,
  rows,
  kind,
  busy,
  onStage,
  onMeta,
}: {
  title: string;
  description: string;
  rows: SalesLead[];
  kind: "referral" | "merchant";
  busy: boolean;
  onStage: (lead: SalesLead, stage: Stage) => void;
  onMeta: (
    lead: SalesLead,
    fields: {
      rewardStatus?: string;
      rewardAmount?: string;
      actualValue?: string;
      assignedUnit?: string;
      merchantApproval?: string;
    },
  ) => void;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-sm text-muted-foreground">
          No matching records yet. New website submissions will appear here automatically.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border bg-muted/20 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3">Contact / organisation</th>
                <th className="p-3">Opportunity context</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Assigned unit</th>
                <th className="p-3">Commercial control</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <PipelineRow
                  key={lead.id}
                  lead={lead}
                  kind={kind}
                  busy={busy}
                  onStage={onStage}
                  onMeta={onMeta}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PipelineRow({
  lead,
  kind,
  busy,
  onStage,
  onMeta,
}: {
  lead: SalesLead;
  kind: "referral" | "merchant";
  busy: boolean;
  onStage: (lead: SalesLead, stage: Stage) => void;
  onMeta: (
    lead: SalesLead,
    fields: {
      rewardStatus?: string;
      rewardAmount?: string;
      actualValue?: string;
      assignedUnit?: string;
      merchantApproval?: string;
    },
  ) => void;
}) {
  const stage = stageFor(lead);
  const assigned = readMarker(
    lead.notes,
    ASSIGNED_UNIT_MARKER,
    extractLine(lead.notes, "Business unit"),
  );
  const rewardStatus = readMarker(lead.notes, REWARD_MARKER, "not assessed");
  const rewardAmount = readMarker(lead.notes, REWARD_AMOUNT_MARKER, "");
  const actualValue = readMarker(lead.notes, ACTUAL_VALUE_MARKER, "");
  const merchantApproval = readMarker(lead.notes, MERCHANT_APPROVAL_MARKER, "pending");

  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="p-3">
        <div className="font-semibold">{lead.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {lead.company ||
            extractLine(
              lead.notes,
              kind === "referral" ? "Prospect / organisation" : "Business / brand",
            ) ||
            "—"}
        </div>
        <div className="mt-1 text-xs">{lead.phone || lead.email || "No contact"}</div>
      </td>
      <td className="max-w-[340px] p-3">
        <div className="text-xs leading-5 text-muted-foreground">
          {extractLine(
            lead.notes,
            kind === "referral" ? "Estimated opportunity value" : "Product categories",
          ) ||
            cleanMarkers(lead.notes).slice(0, 220) ||
            "No structured context"}
        </div>
      </td>
      <td className="p-3">
        <select
          value={stage}
          disabled={busy}
          onChange={(e) => onStage(lead, e.target.value as Stage)}
          className="rounded-md border border-border bg-background px-2 py-2 text-xs"
        >
          {STAGES.map((item) => (
            <option key={item} value={item}>
              {STAGE_LABELS[item]}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3">
        <input
          defaultValue={assigned}
          placeholder="Assign business"
          className="w-48 rounded-md border border-border bg-background px-2 py-2 text-xs"
          onBlur={(e) =>
            e.target.value.trim() !== assigned &&
            onMeta(lead, { assignedUnit: e.target.value.trim() })
          }
        />
      </td>
      <td className="p-3">
        {kind === "referral" ? (
          <div className="space-y-2">
            <select
              defaultValue={rewardStatus}
              className="w-44 rounded-md border border-border bg-background px-2 py-2 text-xs"
              onChange={(e) => onMeta(lead, { rewardStatus: e.target.value })}
            >
              <option value="not assessed">Reward: not assessed</option>
              <option value="eligible">Reward: eligible</option>
              <option value="approved">Reward: approved</option>
              <option value="paid">Reward: paid</option>
              <option value="not eligible">Reward: not eligible</option>
            </select>
            <input
              defaultValue={rewardAmount}
              placeholder="Reward amount R"
              className="w-44 rounded-md border border-border bg-background px-2 py-2 text-xs"
              onBlur={(e) => onMeta(lead, { rewardAmount: e.target.value.trim() })}
            />
          </div>
        ) : (
          <select
            defaultValue={merchantApproval}
            className="w-44 rounded-md border border-border bg-background px-2 py-2 text-xs"
            onChange={(e) => onMeta(lead, { merchantApproval: e.target.value })}
          >
            <option value="pending">Approval: pending</option>
            <option value="documents required">Documents required</option>
            <option value="approved">Approved</option>
            <option value="activated">Activated</option>
            <option value="rejected">Rejected</option>
          </select>
        )}
      </td>
      <td className="p-3">
        <input
          defaultValue={actualValue}
          placeholder="Actual value R"
          className="w-36 rounded-md border border-border bg-background px-2 py-2 text-xs"
          onBlur={(e) => onMeta(lead, { actualValue: e.target.value.trim() })}
        />
        <div className="mt-2 text-[10px] text-muted-foreground">
          Updated {new Date(lead.updated_at).toLocaleDateString("en-ZA")}
        </div>
      </td>
    </tr>
  );
}
