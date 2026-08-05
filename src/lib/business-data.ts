// Production CRM + Operations data access.
//
// The UI models below are translated into the existing Growth Supabase schema.
// Existing production tables remain the source of truth. This file must not
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

const OPPORTUNITY_STAGES = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

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
    Math.max(0, Math.round(safeNumber(value, 20))),
  );
}

function databaseError(
  operation: string,
  error: unknown,
): Error {
  if (error instanceof Error) {
    return new Error(`${operation}: ${error.message}`);
  }

  const typedError =
    error as DatabaseErrorLike | null;

  if (typedError?.message) {
    const additionalInformation = [
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
        additionalInformation
          ? ` ${additionalInformation}`
          : ""
      }`,
    );
  }

  return new Error(
    `${operation}: Unknown Supabase error.`,
  );
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

      const { data, error } = await query.order(
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
      updated_at: new Date().toISOString(),
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

      updated_at: new Date().toISOString(),
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
        company: optionalText(value.company),
      }),

      ...(value.source !== undefined && {
        source: optionalText(value.source),
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
        notes: optionalText(value.notes),
      }),

      updated_at: new Date().toISOString(),
    }),
  });

/**
 * Opportunities use the existing Growth schema:
 *
 * UI title          → organization_name
 * UI value          → estimated_value
 * UI stage          → status
 * UI probability    → probability
 * UI expected close → expected_close
 */
export const salesOpportunities =
  adaptedCrud<SalesOpportunity>({
    table: "opportunities",

    select: [
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
    ].join(","),

    fromRow: (row) => ({
      id: row.id,
      title:
        row.organization_name ??
        "Untitled opportunity",
      customer_id: null,
      value: safeNumber(
        row.estimated_value,
        0,
      ),
      stage: lower(
        row.status,
        "prospect",
      ),
      probability:
        clampProbability(
          row.probability,
        ),
      expected_close:
        row.expected_close ?? null,
      notes:
        row.notes ?? null,
      created_at:
        row.created_at,
      updated_at:
        row.updated_at,
    }),

    toRow: (value) => {
      const row: Record<
        string,
        unknown
      > = {
        updated_at:
          new Date().toISOString(),
      };

      if (value.title !== undefined) {
        row.organization_name =
          requiredText(
            value.title,
            "Opportunity title",
          );

        // opportunity_type is required in the existing table.
        row.opportunity_type =
          "general";