import { supabase } from "@/integrations/supabase/client";
import {
  isActiveSalesPipelineStage,
  leadConversionMayCreateOpportunity,
} from "@/lib/operational-truth";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

/**
 * The production CRM predates formal foreign keys between its lead, opportunity
 * and quotation tables.  These concise, namespaced markers provide a
 * backwards-compatible relationship ledger while the immutable audit_events
 * table supplies the evidence trail.  They are intentionally not shown as
 * customer-facing copy.
 */
const MARKER_PREFIX = "cossa_journey";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type Row = Record<string, unknown>;

export type SalesJourneyStage =
  | "lead"
  | "prospect"
  | "qualified"
  | "opportunity"
  | "quotation"
  | "negotiation"
  | "won"
  | "lost"
  | "customer"
  | "project";

export interface JourneyLinks {
  leadId: string | null;
  opportunityId: string | null;
  quotationId: string | null;
  customerId: string | null;
  projectId: string | null;
}

export interface JourneyConversionResult {
  opportunityId: string;
  created: boolean;
}

export interface WonJourneyResult {
  customerId: string;
  projectId: string;
  customerCreated: boolean;
  projectCreated: boolean;
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function required(value: unknown, label: string): string {
  const output = clean(value);
  if (!output) throw new Error(`${label} is required.`);
  return output;
}

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function recordError(operation: string, error: unknown): Error {
  const typed = error as { message?: string; details?: string; hint?: string } | null;
  const detail = [typed?.message, typed?.details, typed?.hint].filter(Boolean).join(" ");
  return new Error(`${operation}${detail ? `: ${detail}` : "."}`);
}

export function journeyMarker(kind: keyof JourneyLinks, id: string): string {
  return `[${MARKER_PREFIX}_${kind}:${id}]`;
}

export function readJourneyLinks(notes: unknown): JourneyLinks {
  const text = typeof notes === "string" ? notes : "";
  const read = (kind: keyof JourneyLinks) => {
    const match = text.match(new RegExp(`\\[${MARKER_PREFIX}_${kind}:([^\\]\\s]+)\\]`, "i"));
    return match?.[1] ?? null;
  };
  return {
    leadId: read("leadId"),
    opportunityId: read("opportunityId"),
    quotationId: read("quotationId"),
    customerId: read("customerId"),
    projectId: read("projectId"),
  };
}

export function appendJourneyLinks(notes: unknown, links: Partial<JourneyLinks>): string {
  const existing = typeof notes === "string" ? notes.trim() : "";
  const markers = (
    Object.entries(links) as Array<[keyof JourneyLinks, string | null | undefined]>
  ).flatMap(([kind, id]) => (id ? [journeyMarker(kind, id)] : []));
  return [existing, ...markers].filter(Boolean).join("\n");
}

export function isActivePipelineStage(stage: unknown): boolean {
  return isActiveSalesPipelineStage(stage);
}

export function workingSalesTransitionIsAllowed(
  from: SalesJourneyStage,
  to: SalesJourneyStage,
): boolean {
  const allowed: Record<SalesJourneyStage, readonly SalesJourneyStage[]> = {
    lead: ["prospect", "qualified"],
    prospect: ["qualified", "opportunity", "lost"],
    qualified: ["opportunity", "lost"],
    opportunity: ["quotation", "negotiation", "lost"],
    quotation: ["negotiation", "lost"],
    negotiation: ["won", "lost"],
    won: ["customer", "project"],
    lost: [],
    customer: ["project"],
    project: [],
  };
  return allowed[from].includes(to);
}

async function audit(input: {
  eventType: string;
  entityType: string;
  entityId: string;
  before?: Row | null;
  after?: Row | null;
  metadata?: Row;
}): Promise<void> {
  const actorUserId = await currentAuditActorId();
  const { error } = await db.from("audit_events").insert({
    organisation_id: COSSA_ORGANISATION_ID,
    actor_type: "user",
    actor_user_id: actorUserId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  });
  if (error)
    throw recordError(`Transition evidence could not be recorded for ${input.entityType}`, error);
}

async function currentAuditActorId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) {
    throw new Error("Sign in to perform an auditable sales transition.");
  }
  return user.id;
}

async function one(table: string, id: string, select: string): Promise<Row> {
  const { data, error } = await db
    .from(table)
    .select(select)
    .eq("id", id)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .maybeSingle();
  if (error) throw recordError(`Unable to load ${table} record`, error);
  if (!data) throw new Error(`${table} record was not found or access was denied.`);
  return data as Row;
}

function sourceLeadMarker(id: string) {
  return journeyMarker("leadId", id);
}

function sourceOpportunityMarker(id: string) {
  return journeyMarker("opportunityId", id);
}

function opportunityUiStage(
  notes: unknown,
  status: unknown,
): "prospect" | "qualified" | "proposal" | "negotiation" | "won" | "lost" {
  const marker =
    typeof notes === "string"
      ? notes.match(/\[cossa_ui_stage:(prospect|qualified|proposal|negotiation|won|lost)\]/i)
      : null;
  if (marker?.[1])
    return marker[1].toLowerCase() as
      | "prospect"
      | "qualified"
      | "proposal"
      | "negotiation"
      | "won"
      | "lost";
  const normalised = String(status ?? "prospect").toLowerCase();
  if (normalised === "engaged") return "proposal";
  if (["prospect", "qualified", "won", "lost"].includes(normalised)) {
    return normalised as "prospect" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  }
  return "prospect";
}

function notesWithStage(notes: unknown, stage: string): string {
  const remainder = String(notes ?? "")
    .replace(/\[cossa_ui_stage:[^\]]+\]\s*/i, "")
    .trim();
  return `[cossa_ui_stage:${stage}]${remainder ? `\n${remainder}` : ""}`;
}

async function updateLeadJourneyContext(lead: Row, patch: Row, eventType: string, metadata: Row) {
  const { data, error } = await db
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", lead.id)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .select("*")
    .maybeSingle();
  if (error) throw recordError("Unable to update lead", error);
  if (!data) throw new Error("Lead was not found or access was denied.");
  await audit({
    eventType,
    entityType: "lead",
    entityId: String(lead.id),
    before: lead,
    after: data,
    metadata,
  });
  return data as Row;
}

export const salesJourney = {
  async qualifyLead(leadId: string): Promise<void> {
    await currentAuditActorId();
    const lead = await one(
      "leads",
      required(leadId, "Lead ID"),
      "id,name,full_name,status,stage,notes,organisation_id",
    );
    const status = String(lead.stage ?? lead.status ?? "new").toLowerCase();
    if (status === "converted") throw new Error("A converted lead cannot be qualified again.");
    await updateLeadJourneyContext(
      lead,
      { status: "qualified", stage: "qualified" },
      "sales.lead_qualified",
      { transition: "lead_to_qualified", source_stage: status },
    );
  },

  async convertLeadToOpportunity(leadId: string): Promise<JourneyConversionResult> {
    await currentAuditActorId();
    const lead = await one(
      "leads",
      required(leadId, "Lead ID"),
      "id,name,full_name,email,phone,company,service,location,source,stage,status,notes,value,estimated_value,organisation_id",
    );
    const status = String(lead.stage ?? lead.status ?? "new").toLowerCase();
    if (status !== "qualified" && status !== "converted") {
      throw new Error("Qualify the lead before converting it to an opportunity.");
    }

    const marker = sourceLeadMarker(String(lead.id));
    const { data: existing, error: existingError } = await db
      .from("opportunities")
      .select("id,notes")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .ilike("notes", `%${marker}%`)
      .limit(1);
    if (existingError) throw recordError("Unable to check lead conversion", existingError);
    const existingId = Array.isArray(existing) ? clean(existing[0]?.id) : null;
    if (existingId) return { opportunityId: existingId, created: false };
    if (!leadConversionMayCreateOpportunity({ leadStage: status })) {
      throw new Error("Only a qualified lead without a downstream opportunity may be converted.");
    }

    const now = new Date().toISOString();
    const leadName = clean(lead.name) ?? clean(lead.full_name) ?? "Unnamed lead";
    const opportunityNotes = appendJourneyLinks(lead.notes, { leadId: String(lead.id) });
    const { data: opportunity, error } = await db
      .from("opportunities")
      .insert({
        organisation_id: COSSA_ORGANISATION_ID,
        organization_name: clean(lead.company) ?? leadName,
        opportunity_type: "office_park",
        contact_name: leadName,
        contact_email: clean(lead.email),
        contact_phone: clean(lead.phone),
        location: clean(lead.location),
        estimated_value: safeNumber(lead.estimated_value ?? lead.value),
        status: "prospect",
        probability: 20,
        notes: [
          "[cossa_ui_stage:prospect]",
          opportunityNotes,
          `Converted from qualified lead at ${now}.`,
          clean(lead.service) ? `Service: ${clean(lead.service)}` : null,
          clean(lead.source) ? `Source: ${clean(lead.source)}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw recordError("Unable to create opportunity from qualified lead", error);
    if (!opportunity) throw new Error("Opportunity conversion returned no saved record.");

    const opportunityId = String((opportunity as Row).id);
    await audit({
      eventType: "sales.lead_converted_to_opportunity",
      entityType: "opportunity",
      entityId: opportunityId,
      after: opportunity as Row,
      metadata: {
        transition: "qualified_to_opportunity",
        lead_id: String(lead.id),
        converted_at: now,
      },
    });
    await updateLeadJourneyContext(
      lead,
      {
        status: "converted",
        stage: "converted",
        notes: appendJourneyLinks(lead.notes, { opportunityId }),
      },
      "sales.lead_conversion_recorded",
      { transition: "qualified_to_opportunity", opportunity_id: opportunityId, converted_at: now },
    );
    return { opportunityId, created: true };
  },

  async createQuotation(opportunityId: string): Promise<{ quotationId: string; created: boolean }> {
    await currentAuditActorId();
    const opportunity = await one(
      "opportunities",
      required(opportunityId, "Opportunity ID"),
      "id,organization_name,contact_name,contact_email,contact_phone,estimated_value,status,notes,organisation_id",
    );
    if (!isActivePipelineStage(opportunity.status)) {
      throw new Error("A quotation can only be created for an active opportunity.");
    }
    const marker = sourceOpportunityMarker(String(opportunity.id));
    const { data: existing, error: existingError } = await db
      .from("quotations")
      .select("id")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .ilike("notes", `%${marker}%`)
      .limit(1);
    if (existingError) throw recordError("Unable to check opportunity quotation", existingError);
    const existingId = Array.isArray(existing) ? clean(existing[0]?.id) : null;
    if (existingId) return { quotationId: existingId, created: false };

    const now = new Date().toISOString();
    const quoteNumber = `QT-${now.slice(0, 10).replaceAll("-", "")}-${String(opportunity.id).slice(0, 6).toUpperCase()}`;
    const { data: quotation, error } = await db
      .from("quotations")
      .insert({
        organisation_id: COSSA_ORGANISATION_ID,
        quote_number: quoteNumber,
        // Keep this payload within the established quotations adapter contract.
        // The production table uses description/service rather than a title column.
        description: `Quotation — ${clean(opportunity.organization_name) ?? "Opportunity"}`,
        customer: clean(opportunity.organization_name) ?? clean(opportunity.contact_name),
        opportunity_id: String(opportunity.id),
        amount: safeNumber(opportunity.estimated_value),
        status: "draft",
        notes: appendJourneyLinks(opportunity.notes, {
          opportunityId: String(opportunity.id),
          leadId: readJourneyLinks(opportunity.notes).leadId,
        }),
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw recordError("Unable to create quotation", error);
    if (!quotation) throw new Error("Quotation creation returned no saved record.");
    const quotationId = String((quotation as Row).id);
    await audit({
      eventType: "sales.quotation_created",
      entityType: "quotation",
      entityId: quotationId,
      after: quotation as Row,
      metadata: { transition: "opportunity_to_quotation", opportunity_id: String(opportunity.id) },
    });
    const { data: linkedOpportunity, error: linkError } = await db
      .from("opportunities")
      .update({
        notes: appendJourneyLinks(opportunity.notes, { quotationId }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity.id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .select("*")
      .maybeSingle();
    if (linkError) throw recordError("Unable to record quotation relationship", linkError);
    if (!linkedOpportunity) {
      throw new Error("Opportunity was not found while recording quotation evidence.");
    }
    await audit({
      eventType: "sales.quotation_linked_to_opportunity",
      entityType: "opportunity",
      entityId: String(opportunity.id),
      before: opportunity,
      after: linkedOpportunity,
      metadata: { quotation_id: quotationId, transition: "opportunity_to_quotation" },
    });
    return { quotationId, created: true };
  },

  async moveToNegotiation(opportunityId: string): Promise<void> {
    await currentAuditActorId();
    const opportunity = await one(
      "opportunities",
      required(opportunityId, "Opportunity ID"),
      "id,status,notes,organisation_id",
    );
    if (!isActivePipelineStage(opportunity.status))
      throw new Error("Closed opportunities cannot enter negotiation.");
    const nextNotes = notesWithStage(opportunity.notes, "negotiation");
    const { data, error } = await db
      .from("opportunities")
      .update({ status: "engaged", notes: nextNotes, updated_at: new Date().toISOString() })
      .eq("id", opportunity.id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .select("*")
      .maybeSingle();
    if (error) throw recordError("Unable to move opportunity to negotiation", error);
    if (!data) throw new Error("Opportunity was not found or access was denied.");
    await audit({
      eventType: "sales.opportunity_moved_to_negotiation",
      entityType: "opportunity",
      entityId: String(opportunity.id),
      before: opportunity,
      after: data,
      metadata: { transition: "opportunity_to_negotiation" },
    });
  },

  async moveOpportunityStage(
    opportunityId: string,
    target: "prospect" | "qualified" | "proposal" | "negotiation",
  ): Promise<void> {
    await currentAuditActorId();
    const opportunity = await one(
      "opportunities",
      required(opportunityId, "Opportunity ID"),
      "id,status,notes,organisation_id",
    );
    const previous = opportunityUiStage(opportunity.notes, opportunity.status);
    if (["won", "lost"].includes(previous) && target !== "negotiation") {
      throw new Error("Closed opportunities can only be explicitly reopened into negotiation.");
    }
    const status = target === "proposal" || target === "negotiation" ? "engaged" : target;
    const { data, error } = await db
      .from("opportunities")
      .update({
        status,
        notes: notesWithStage(opportunity.notes, target),
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity.id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .select("*")
      .maybeSingle();
    if (error) throw recordError("Unable to update opportunity stage", error);
    if (!data) throw new Error("Opportunity was not found or access was denied.");
    await audit({
      eventType: "sales.opportunity_stage_moved",
      entityType: "opportunity",
      entityId: String(opportunity.id),
      before: opportunity,
      after: data,
      metadata: {
        transition: `${previous}_to_${target}`,
        source_stage: previous,
        target_stage: target,
      },
    });
  },

  async markLost(opportunityId: string): Promise<void> {
    await currentAuditActorId();
    const opportunity = await one(
      "opportunities",
      required(opportunityId, "Opportunity ID"),
      "id,status,notes,organisation_id",
    );
    if (String(opportunity.status).toLowerCase() === "won")
      throw new Error("A won opportunity cannot be marked lost.");
    const nextNotes = notesWithStage(opportunity.notes, "lost");
    const { data, error } = await db
      .from("opportunities")
      .update({ status: "lost", notes: nextNotes, updated_at: new Date().toISOString() })
      .eq("id", opportunity.id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .select("*")
      .maybeSingle();
    if (error) throw recordError("Unable to mark opportunity lost", error);
    if (!data) throw new Error("Opportunity was not found or access was denied.");
    await audit({
      eventType: "sales.opportunity_marked_lost",
      entityType: "opportunity",
      entityId: String(opportunity.id),
      before: opportunity,
      after: data,
      metadata: { transition: "opportunity_to_lost" },
    });
  },

  async markWonAndCreateCustomerProject(opportunityId: string): Promise<WonJourneyResult> {
    await currentAuditActorId();
    const opportunity = await one(
      "opportunities",
      required(opportunityId, "Opportunity ID"),
      "id,organization_name,contact_name,contact_email,contact_phone,estimated_value,status,notes,organisation_id",
    );
    if (String(opportunity.status).toLowerCase() === "lost")
      throw new Error("A lost opportunity must be reopened before it can be won.");
    const sourceMarker = sourceOpportunityMarker(String(opportunity.id));
    const [customerCheck, projectCheck] = await Promise.all([
      db
        .from("customers")
        .select("id")
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .ilike("notes", `%${sourceMarker}%`)
        .limit(1),
      db
        .from("projects")
        .select("id")
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .ilike("notes", `%${sourceMarker}%`)
        .limit(1),
    ]);
    if (customerCheck.error)
      throw recordError("Unable to check customer conversion", customerCheck.error);
    if (projectCheck.error)
      throw recordError("Unable to check project conversion", projectCheck.error);

    let customerId = Array.isArray(customerCheck.data) ? clean(customerCheck.data[0]?.id) : null;
    let customerCreated = false;
    const now = new Date().toISOString();
    if (!customerId) {
      const customerName =
        clean(opportunity.contact_name) ?? clean(opportunity.organization_name) ?? "Customer";
      const { data, error } = await db
        .from("customers")
        .insert({
          organisation_id: COSSA_ORGANISATION_ID,
          name: customerName,
          email: clean(opportunity.contact_email),
          phone: clean(opportunity.contact_phone),
          status: "active",
          notes: appendJourneyLinks(opportunity.notes, { opportunityId: String(opportunity.id) }),
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) throw recordError("Unable to create customer from won opportunity", error);
      if (!data) throw new Error("Customer creation returned no saved record.");
      customerId = String((data as Row).id);
      customerCreated = true;
      await audit({
        eventType: "sales.customer_created_from_won_opportunity",
        entityType: "customer",
        entityId: customerId,
        after: data as Row,
        metadata: { transition: "won_to_customer", opportunity_id: String(opportunity.id) },
      });
    }

    let projectId = Array.isArray(projectCheck.data) ? clean(projectCheck.data[0]?.id) : null;
    let projectCreated = false;
    if (!projectId) {
      const name =
        clean(opportunity.organization_name) ??
        clean(opportunity.contact_name) ??
        "Customer project";
      const { data, error } = await db
        .from("projects")
        .insert({
          organisation_id: COSSA_ORGANISATION_ID,
          customer_id: customerId,
          name,
          project_name: name,
          budget: safeNumber(opportunity.estimated_value),
          status: "planning",
          priority: "high",
          progress: 0,
          notes: appendJourneyLinks(opportunity.notes, {
            opportunityId: String(opportunity.id),
            customerId,
            leadId: readJourneyLinks(opportunity.notes).leadId,
          }),
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) throw recordError("Unable to create project from won opportunity", error);
      if (!data) throw new Error("Project creation returned no saved record.");
      projectId = String((data as Row).id);
      projectCreated = true;
      await audit({
        eventType: "sales.project_created_from_won_opportunity",
        entityType: "project",
        entityId: projectId,
        after: data as Row,
        metadata: {
          transition: "won_to_project",
          opportunity_id: String(opportunity.id),
          customer_id: customerId,
        },
      });
    }

    const nextNotes = appendJourneyLinks(notesWithStage(opportunity.notes, "won"), {
      customerId,
      projectId,
    });
    const { data: won, error: wonError } = await db
      .from("opportunities")
      .update({ status: "won", notes: nextNotes, updated_at: now })
      .eq("id", opportunity.id)
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .select("*")
      .maybeSingle();
    if (wonError) throw recordError("Unable to mark opportunity won", wonError);
    if (!won) throw new Error("Opportunity was not found or access was denied.");
    await audit({
      eventType: "sales.opportunity_marked_won",
      entityType: "opportunity",
      entityId: String(opportunity.id),
      before: opportunity,
      after: won,
      metadata: {
        transition: "negotiation_to_won",
        customer_id: customerId,
        project_id: projectId,
        commercial_commitment_only: true,
        cash_received: null,
      },
    });
    return {
      customerId,
      projectId: required(projectId, "Project ID"),
      customerCreated,
      projectCreated,
    };
  },
};
