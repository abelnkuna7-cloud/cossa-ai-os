// Production CRM + Operations data access.
//
// The UI models below are translated into the existing Growth Supabase schema.
// Existing production tables remain the source of truth. This file does not
// create duplicate sales or operations tables.

import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as {
  from: (table: string) => any;
};

export interface SalesCompany {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOpportunity {
  id: string;
  title: string;
  customer_id: string | null;
  value: number;
  stage: string;
  probability: number;
  expected_close: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesQuotation {
  id: string;
  number: string;
  customer_id: string | null;
  opportunity_id: string | null;
  amount: number;
  status: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesAppointment {
  id: string;
  title: string;
  customer_id: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesFollowUp {
  id: string;
  subject: string;
  customer_id: string | null;
  due_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsProject {
  id: string;
  name: string;
  customer_id: string | null;
  status: string;
  priority: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsTask {
  id: string;
  title: string;
  project_id: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsDocument {
  id: string;
  title: string;
  category: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type DatabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

type Adapter<T> = {
  table: string;
  organisationScoped?: boolean;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
  fromRow: (row: any) => T;
  toRow: (value: Partial<T>) => Record<string, unknown>;
};

const UI_OPPORTUNITY_STAGES = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

type UiOpportunityStage =
  (typeof UI_OPPORTUNITY_STAGES)[number];

const DATABASE_OPPORTUNITY_STATUSES = [
  "prospect",
  "qualified",
  "engaged",
  "won",
  "lost",
] as const;

type DatabaseOpportunityStatus =
  (typeof DATABASE_OPPORTUNITY_STATUSES)[number];

const DATABASE_OPPORTUNITY_TYPES = [
  "property_manager",
  "school",
  "church",
  "office_park",
  "shopping_centre",
  "estate_agent",
] as const;

type DatabaseOpportunityType =
  (typeof DATABASE_OPPORTUNITY_TYPES)[number];

const UI_STAGE_MARKER_PATTERN =
  /cossa_ui_stage:(prospect|qualified|proposal|negotiation|won|lost)/i;

const OPPORTUNITY_SELECT = [
  "id",
  "organization_name",
  "opportunity_type",
  "contact_name",
  "contact_phone",
  "contact_email",
  "location",
  "estimated_value",
  "status",
  "last_contact_date",
  "notes",
  "probability",
  "expected_close",
  "created_at",
  "updated_at",
].join(",");

function lower(
  value: unknown,
  fallback: string,
): string {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : fallback;
}

function optionalText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function requiredText(
  value: unknown,
  fieldName: string,
): string {
  const cleaned = optionalText(value);

  if (!cleaned) {
    throw new Error(`${fieldName} is required.`);
  }

  return cleaned;
}

function safeNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function clampProbability(
  value: unknown,
): number {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(safeNumber(value, 20)),
    ),
  );
}

function databaseError(
  operation: string,
  error: unknown,
): Error {
  if (error instanceof Error) {
    return new Error(
      `${operation}: ${error.message}`,
    );
  }

  const typedError =
    error as DatabaseErrorLike | null;

  if (typedError?.message) {
    const details = [
      typedError.details,
      typedError.hint,
      typedError.code
        ? `Code: ${typedError.code}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return new Error(
      `${operation}: ${typedError.message}${
        details ? ` ${details}` : ""
      }`,
    );
  }

  return new Error(
    `${operation}: Unknown Supabase error.`,
  );
}

function normaliseUiOpportunityStage(
  value: unknown,
): UiOpportunityStage {
  const stage = lower(value, "prospect");

  if (
    UI_OPPORTUNITY_STAGES.includes(
      stage as UiOpportunityStage,
    )
  ) {
    return stage as UiOpportunityStage;
  }

  if (stage === "engaged") {
    return "proposal";
  }

  return "prospect";
}

function toDatabaseOpportunityStatus(
  stage: UiOpportunityStage,
): DatabaseOpportunityStatus {
  switch (stage) {
    case "proposal":
    case "negotiation":
      return "engaged";

    case "prospect":
    case "qualified":
    case "won":
    case "lost":
      return stage;
  }
}

function readUiStageFromNotes(
  notes: unknown,
  databaseStatus: unknown,
): UiOpportunityStage {
  const text =
    typeof notes === "string" ? notes : "";

  const match =
    text.match(UI_STAGE_MARKER_PATTERN);

  if (match?.[1]) {
    return normaliseUiOpportunityStage(
      match[1],
    );
  }

  return normaliseUiOpportunityStage(
    databaseStatus,
  );
}

function removeUiStageMarker(
  notes: unknown,
): string | null {
  if (typeof notes !== "string") {
    return null;
  }

  const cleaned = notes
    .replace(UI_STAGE_MARKER_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}

function addUiStageMarker(
  notes: unknown,
  stage: UiOpportunityStage,
): string {
  const cleanNotes =
    removeUiStageMarker(notes);

  return [
    `[cossa_ui_stage:${stage}]`,
    cleanNotes,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function inferOpportunityType(
  title: unknown,
  notes: unknown,
): DatabaseOpportunityType {
  const searchable =
    `${String(title ?? "")} ${String(
      notes ?? "",
    )}`.toLowerCase();

  if (
    searchable.includes("school") ||
    searchable.includes("college") ||
    searchable.includes("academy")
  ) {
    return "school";
  }

  if (
    searchable.includes("church") ||
    searchable.includes("ministry") ||
    searchable.includes("congregation")
  ) {
    return "church";
  }

  if (
    searchable.includes("shopping centre") ||
    searchable.includes("shopping center") ||
    searchable.includes("mall") ||
    searchable.includes("retail centre") ||
    searchable.includes("retail center")
  ) {
    return "shopping_centre";
  }

  if (
    searchable.includes("estate agent") ||
    searchable.includes("real estate") ||
    searchable.includes("property agency")
  ) {
    return "estate_agent";
  }

  if (
    searchable.includes("office") ||
    searchable.includes("business park") ||
    searchable.includes("corporate")
  ) {
    return "office_park";
  }

  return "property_manager";
}

function mapOpportunityRow(
  row: any,
): SalesOpportunity {
  return {
    id: row.id,
    title:
      row.organization_name ??
      "Untitled opportunity",
    customer_id: null,
    value: safeNumber(
      row.estimated_value,
      0,
    ),
    stage: readUiStageFromNotes(
      row.notes,
      row.status,
    ),
    probability: clampProbability(
      row.probability,
    ),
    expected_close:
      row.expected_close ?? null,
    notes: removeUiStageMarker(
      row.notes,
    ),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function adaptedCrud<T>(
  adapter: Adapter<T>,
) {
  return {
    list: async (): Promise<T[]> => {
      let query = db
        .from(adapter.table)
        .select(adapter.select ?? "*");

      if (adapter.organisationScoped) {
        query = query.eq(
          "organisation_id",
          COSSA_ORGANISATION_ID,
        );
      }

      const { data, error } =
        await query.order(
          adapter.orderBy ?? "created_at",
          {
            ascending:
              adapter.ascending ?? false,
          },
        );

      if (error) {
        throw databaseError(
          `Unable to load ${adapter.table}`,
          error,
        );
      }

      return (data ?? []).map(
        adapter.fromRow,
      );
    },

    create: async (
      payload: Partial<T>,
    ): Promise<T> => {
      const row = adapter.toRow(payload);

      if (adapter.organisationScoped) {
        row.organisation_id =
          COSSA_ORGANISATION_ID;
      }

      const { data, error } = await db
        .from(adapter.table)
        .insert(row)
        .select(adapter.select ?? "*")
        .single();

      if (error) {
        throw databaseError(
          `Unable to create ${adapter.table} record`,
          error,
        );
      }

      if (!data) {
        throw new Error(
          `Unable to create ${adapter.table} record: Supabase returned no saved row.`,
        );
      }

      return adapter.fromRow(data);
    },

    update: async (
      id: string,
      patch: Partial<T>,
    ): Promise<void> => {
      const cleanId = requiredText(
        id,
        "Record ID",
      );

      const row = adapter.toRow(patch);

      const { data, error } = await db
        .from(adapter.table)
        .update(row)
        .eq("id", cleanId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw databaseError(
          `Unable to update ${adapter.table} record`,
          error,
        );
      }

      if (!data) {
        throw new Error(
          `Unable to update ${adapter.table} record: the row was not found or access was denied.`,
        );
      }
    },

    remove: async (
      id: string,
    ): Promise<void> => {
      const cleanId = requiredText(
        id,
        "Record ID",
      );

      const { data, error } = await db
        .from(adapter.table)
        .delete()
        .eq("id", cleanId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw databaseError(
          `Unable to delete ${adapter.table} record`,
          error,
        );
      }

      if (!data) {
        throw new Error(
          `Unable to delete ${adapter.table} record: the row was not found or access was denied.`,
        );
      }
    },
  };
}

function plainCrud<T>(
  table: string,
  orderBy = "created_at",
  ascending = false,
  organisationScoped = false,
) {
  return adaptedCrud<T>({
    table,
    orderBy,
    ascending,
    organisationScoped,

    fromRow: (row) => row as T,

    toRow: (value) => ({
      ...value,
      updated_at:
        new Date().toISOString(),
    }),
  });
}

export const salesCompanies =
  plainCrud<SalesCompany>(
    "sales_companies",
    "created_at",
    false,
    true,
  );

export const salesCustomers =
  adaptedCrud<SalesCustomer>({
    table: "customers",

    fromRow: (row) => ({
      ...row,
      name:
        row.name ??
        row.full_name ??
        "Unnamed customer",
      status: lower(
        row.status,
        "active",
      ),
      company_id: null,
    }),

    toRow: (value) => ({
      ...(value.name !== undefined && {
        name: requiredText(
          value.name,
          "Customer name",
        ),
      }),

      ...(value.email !== undefined && {
        email: optionalText(value.email),
      }),

      ...(value.phone !== undefined && {
        phone: optionalText(value.phone),
      }),

      ...(value.status !== undefined && {
        status: lower(
          value.status,
          "active",
        ),
      }),

      ...(value.notes !== undefined && {
        notes: optionalText(value.notes),
      }),

      updated_at:
        new Date().toISOString(),
    }),
  });

export const salesLeads =
  adaptedCrud<SalesLead>({
    table: "leads",

    fromRow: (row) => ({
      ...row,
      name:
        row.name ??
        row.full_name ??
        "Unnamed lead",
      status: lower(
        row.stage ?? row.status,
        "new",
      ),
      score: safeNumber(
        row.score,
        0,
      ),
    }),

    toRow: (value) => ({
      ...(value.name !== undefined && {
        name: requiredText(
          value.name,
          "Lead name",
        ),
        full_name: requiredText(
          value.name,
          "Lead name",
        ),
      }),

      ...(value.email !== undefined && {
        email: optionalText(value.email),
      }),

      ...(value.phone !== undefined && {
        phone: optionalText(value.phone),
      }),

      ...(value.company !== undefined && {
        company: optionalText(
          value.company,
        ),
      }),

      ...(value.source !== undefined && {
        source: optionalText(
          value.source,
        ),
      }),

      ...(value.status !== undefined && {
        status: lower(
          value.status,
          "new",
        ),
        stage: lower(
          value.status,
          "new",
        ),
      }),

      ...(value.score !== undefined && {
        score: safeNumber(
          value.score,
          0,
        ),
      }),

      ...(value.notes !== undefined && {
        notes: optionalText(
          value.notes,
        ),
      }),

      updated_at:
        new Date().toISOString(),
    }),
  });

/**
 * The existing opportunities table only supports:
 *
 * Database status:
 * prospect, qualified, engaged, won, lost
 *
 * The UI needs:
 * prospect, qualified, proposal, negotiation, won, lost
 *
 * Proposal and Negotiation are therefore stored as database status "engaged".
 * Their detailed UI stage is preserved in a controlled marker inside notes.
 */
export const salesOpportunities = {
  list: async (): Promise<
    SalesOpportunity[]
  > => {
    const { data, error } = await db
      .from("opportunities")
      .select(OPPORTUNITY_SELECT)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw databaseError(
        "Unable to load opportunities",
        error,
      );
    }

    return (data ?? []).map(
      mapOpportunityRow,
    );
  },

  create: async (
    payload: Partial<SalesOpportunity>,
  ): Promise<SalesOpportunity> => {
    const title = requiredText(
      payload.title,
      "Opportunity title",
    );

    const value = safeNumber(
      payload.value,
      0,
    );

    if (value < 0) {
      throw new Error(
        "Opportunity value cannot be negative.",
      );
    }

    const stage =
      normaliseUiOpportunityStage(
        payload.stage,
      );

    const cleanNotes =
      optionalText(payload.notes);

    const row = {
      organization_name: title,

      opportunity_type:
        inferOpportunityType(
          title,
          cleanNotes,
        ),

      estimated_value: value,

      status:
        toDatabaseOpportunityStatus(
          stage,
        ),

      probability:
        clampProbability(
          payload.probability,
        ),

      expected_close:
        payload.expected_close || null,

      notes: addUiStageMarker(
        cleanNotes,
        stage,
      ),

      updated_at:
        new Date().toISOString(),
    };

    const { data, error } = await db
      .from("opportunities")
      .insert(row)
      .select(OPPORTUNITY_SELECT)
      .single();

    if (error) {
      throw databaseError(
        "Unable to create opportunity",
        error,
      );
    }

    if (!data) {
      throw new Error(
        "Unable to create opportunity: Supabase returned no saved record.",
      );
    }

    return mapOpportunityRow(data);
  },

  update: async (
    id: string,
    patch: Partial<SalesOpportunity>,
  ): Promise<void> => {
    const cleanId = requiredText(
      id,
      "Opportunity ID",
    );

    const {
      data: existing,
      error: existingError,
    } = await db
      .from("opportunities")
      .select(OPPORTUNITY_SELECT)
      .eq("id", cleanId)
      .maybeSingle();

    if (existingError) {
      throw databaseError(
        "Unable to load the opportunity before updating",
        existingError,
      );
    }

    if (!existing) {
      throw new Error(
        "The opportunity was not found or access was denied.",
      );
    }

    const current =
      mapOpportunityRow(existing);

    const nextTitle =
      patch.title !== undefined
        ? requiredText(
            patch.title,
            "Opportunity title",
          )
        : current.title;

    const nextStage =
      patch.stage !== undefined
        ? normaliseUiOpportunityStage(
            patch.stage,
          )
        : normaliseUiOpportunityStage(
            current.stage,
          );

    const nextNotes =
      patch.notes !== undefined
        ? optionalText(patch.notes)
        : current.notes;

    const updateRow: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };

    if (patch.title !== undefined) {
      updateRow.organization_name =
        nextTitle;

      updateRow.opportunity_type =
        inferOpportunityType(
          nextTitle,
          nextNotes,
        );
    }

    if (patch.value !== undefined) {
      const amount = safeNumber(
        patch.value,
        0,
      );

      if (amount < 0) {
        throw new Error(
          "Opportunity value cannot be negative.",
        );
      }

      updateRow.estimated_value =
        amount;
    }

    if (patch.stage !== undefined) {
      updateRow.status =
        toDatabaseOpportunityStatus(
          nextStage,
        );
    }

    if (
      patch.probability !== undefined
    ) {
      updateRow.probability =
        clampProbability(
          patch.probability,
        );
    }

    if (
      patch.expected_close !==
      undefined
    ) {
      updateRow.expected_close =
        patch.expected_close || null;
    }

    if (
      patch.notes !== undefined ||
      patch.stage !== undefined
    ) {
      updateRow.notes =
        addUiStageMarker(
          nextNotes,
          nextStage,
        );
    }

    const { data, error } = await db
      .from("opportunities")
      .update(updateRow)
      .eq("id", cleanId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw databaseError(
        "Unable to update opportunity",
        error,
      );
    }

    if (!data) {
      throw new Error(
        "Unable to update opportunity: the row was not found or access was denied.",
      );
    }
  },

  remove: async (
    id: string,
  ): Promise<void> => {
    const cleanId = requiredText(
      id,
      "Opportunity ID",
    );

    const { data, error } = await db
      .from("opportunities")
      .delete()
      .eq("id", cleanId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw databaseError(
        "Unable to delete opportunity",
        error,
      );
    }

    if (!data) {
      throw new Error(
        "Unable to delete opportunity: the row was not found or access was denied.",
      );
    }
  },
};

export const salesQuotations =
  adaptedCrud<SalesQuotation>({
    table: "quotations",

    fromRow: (row) => ({
      ...row,
      number:
        row.quote_number ??
        "Unnumbered",
      status: lower(
        row.status,
        "draft",
      ),
      opportunity_id: null,
    }),

    toRow: (value) => ({
      ...(value.number !== undefined && {
        quote_number:
          requiredText(
            value.number,
            "Quotation number",
          ),
      }),

      ...(value.customer_id !==
        undefined && {
        customer_id:
          value.customer_id,
      }),

      ...(value.amount !== undefined && {
        amount: safeNumber(
          value.amount,
          0,
        ),
      }),

      ...(value.status !== undefined && {
        status: lower(
          value.status,
          "draft",
        ),
      }),

      ...(value.valid_until !==
        undefined && {
        valid_until:
          value.valid_until || null,
      }),

      ...(value.notes !== undefined && {
        notes: optionalText(
          value.notes,
        ),
      }),

      updated_at:
        new Date().toISOString(),
    }),
  });

export const salesAppointments =
  adaptedCrud<SalesAppointment>({
    table: "appointments",
    orderBy: "scheduled_at",
    ascending: true,

    fromRow: (row) => ({
      ...row,
      title:
        row.title ??
        row.service ??
        "Appointment",
      starts_at:
        row.scheduled_at ??
        row.appointment_date,
      ends_at:
        row.ends_at ?? null,
    }),

    toRow: (value) => ({
      ...(value.title !== undefined && {
        title: requiredText(
          value.title,
          "Appointment title",
        ),
      }),

      ...(value.customer_id !==
        undefined && {
        customer_id:
          value.customer_id,
      }),

      ...(value.starts_at !==
        undefined && {
        scheduled_at:
          value.starts_at,
        appointment_date:
          value.starts_at,
      }),

      ...(value.ends_at !== undefined && {
        ends_at:
          value.ends_at,
      }),

      ...(value.location !== undefined && {
        location: optionalText(
          value.location,
        ),
      }),

      ...(value.notes !== undefined && {
        notes: optionalText(
          value.notes,
        ),
      }),

      updated_at:
        new Date().toISOString(),
    }),
  });

export const salesFollowUps =
  plainCrud<SalesFollowUp>(
    "sales_follow_ups",
    "due_at",
    true,
    true,
  );

export const opsProjects =
  adaptedCrud<OpsProject>({
    table: "projects",

    select: [
      "id",
      "customer_id",
      "project_name",
      "name",
      "service",
      "location