// Production CRM + Operations data access.
//
// This file is deliberately DATA-ONLY.
// Do not place React components, route definitions, JSX, forms or page UI here.
//
// Existing production Supabase tables remain the source of truth.
// This adapter translates the existing Growth/Cossa database schema into the
// stable UI models used throughout the Cossa AI operating system.

import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

/* -------------------------------------------------------------------------- */
/* DATABASE CLIENT                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Temporary compatibility wrapper.
 *
 * Remove this cast when generated Supabase types contain every production
 * Growth/Cossa CRM and operations table.
 */
const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

/* -------------------------------------------------------------------------- */
/* SALES TYPES                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* OPERATIONS TYPES                                                           */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromRow: (row: any) => T;

  toRow: (
    value: Partial<T>,
  ) => Record<string, unknown>;

  /**
   * Values required only when a record originates inside this workspace.
   * They are not applied on update, so imported/source-system ownership
   * remains unchanged.
   */
  createDefaults?: Record<string, unknown>;
};

/* -------------------------------------------------------------------------- */
/* OPPORTUNITY STAGES                                                         */
/* -------------------------------------------------------------------------- */

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

/**
 * Existing production opportunities currently collapse both UI stages
 * "proposal" and "negotiation" into database status "engaged".
 *
 * This marker preserves the richer UI stage without creating a duplicate
 * opportunity table or changing the production enum.
 */
const UI_STAGE_MARKER_PATTERN =
  /\[cossa_ui_stage:(prospect|qualified|proposal|negotiation|won|lost)\]/i;

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

/* -------------------------------------------------------------------------- */
/* BASIC HELPERS                                                              */
/* -------------------------------------------------------------------------- */

function lower(
  value: unknown,
  fallback: string,
): string {
  return typeof value === "string" &&
    value.trim()
    ? value
        .trim()
        .toLowerCase()
    : fallback;
}

function optionalText(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned || null;
}

function requiredText(
  value: unknown,
  fieldName: string,
): string {
  const cleaned =
    optionalText(
      value,
    );

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return cleaned;
}

function safeNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
}

function clampPercentage(
  value: unknown,
  fallback = 0,
): number {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        safeNumber(
          value,
          fallback,
        ),
      ),
    ),
  );
}

function clampProbability(
  value: unknown,
): number {
  return clampPercentage(
    value,
    20,
  );
}

/* -------------------------------------------------------------------------- */
/* DATABASE ERROR                                                             */
/* -------------------------------------------------------------------------- */

function databaseError(
  operation: string,
  error: unknown,
): Error {
  if (
    error instanceof
    Error
  ) {
    return new Error(
      `${operation}: ${error.message}`,
    );
  }

  const typedError =
    error as DatabaseErrorLike | null;

  if (
    typedError?.message
  ) {
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
        details
          ? ` ${details}`
          : ""
      }`,
    );
  }

  return new Error(
    `${operation}: Unknown Supabase error.`,
  );
}

/* -------------------------------------------------------------------------- */
/* OPPORTUNITY HELPERS                                                        */
/* -------------------------------------------------------------------------- */

function normaliseUiOpportunityStage(
  value: unknown,
): UiOpportunityStage {
  const stage =
    lower(
      value,
      "prospect",
    );

  if (
    UI_OPPORTUNITY_STAGES.includes(
      stage as UiOpportunityStage,
    )
  ) {
    return stage as UiOpportunityStage;
  }

  if (
    stage ===
    "engaged"
  ) {
    return "proposal";
  }

  return "prospect";
}

function toDatabaseOpportunityStatus(
  stage:
    UiOpportunityStage,
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
    typeof notes ===
    "string"
      ? notes
      : "";

  const match =
    text.match(
      UI_STAGE_MARKER_PATTERN,
    );

  if (
    match?.[1]
  ) {
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
  if (
    typeof notes !==
    "string"
  ) {
    return null;
  }

  const cleaned =
    notes
      .replace(
        UI_STAGE_MARKER_PATTERN,
        "",
      )
      .replace(
        /\n{3,}/g,
        "\n\n",
      )
      .trim();

  return cleaned || null;
}

function addUiStageMarker(
  notes: unknown,
  stage:
    UiOpportunityStage,
): string {
  const cleanNotes =
    removeUiStageMarker(
      notes,
    );

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
    `${String(
      title ?? "",
    )} ${String(
      notes ?? "",
    )}`.toLowerCase();

  if (
    searchable.includes(
      "school",
    ) ||
    searchable.includes(
      "college",
    ) ||
    searchable.includes(
      "academy",
    )
  ) {
    return "school";
  }

  if (
    searchable.includes(
      "church",
    ) ||
    searchable.includes(
      "ministry",
    ) ||
    searchable.includes(
      "congregation",
    )
  ) {
    return "church";
  }

  if (
    searchable.includes(
      "shopping centre",
    ) ||
    searchable.includes(
      "shopping center",
    ) ||
    searchable.includes(
      "mall",
    ) ||
    searchable.includes(
      "retail centre",
    ) ||
    searchable.includes(
      "retail center",
    )
  ) {
    return "shopping_centre";
  }

  if (
    searchable.includes(
      "estate agent",
    ) ||
    searchable.includes(
      "real estate",
    ) ||
    searchable.includes(
      "property agency",
    )
  ) {
    return "estate_agent";
  }

  if (
    searchable.includes(
      "office",
    ) ||
    searchable.includes(
      "business park",
    ) ||
    searchable.includes(
      "corporate",
    )
  ) {
    return "office_park";
  }

  return "property_manager";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOpportunityRow(
  row: any,
): SalesOpportunity {
  return {
    id:
      row.id,

    title:
      row.organization_name ??
      "Untitled opportunity",

    /*
     * Current opportunities records do not yet expose the CRM customer_id
     * relationship required by this UI model.
     */
    customer_id:
      null,

    value:
      safeNumber(
        row.estimated_value,
        0,
      ),

    stage:
      readUiStageFromNotes(
        row.notes,
        row.status,
      ),

    probability:
      clampProbability(
        row.probability,
      ),

    expected_close:
      row.expected_close ??
      null,

    notes:
      removeUiStageMarker(
        row.notes,
      ),

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/* GENERIC CRUD ADAPTER                                                       */
/* -------------------------------------------------------------------------- */

function adaptedCrud<T>(
  adapter:
    Adapter<T>,
) {
  return {
    list:
      async (): Promise<
        T[]
      > => {
        let query =
          db
            .from(
              adapter.table,
            )
            .select(
              adapter.select ??
                "*",
            );

        if (
          adapter.organisationScoped
        ) {
          query =
            query.eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            );
        }

        const {
          data,
          error,
        } =
          await query.order(
            adapter.orderBy ??
              "created_at",
            {
              ascending:
                adapter.ascending ??
                false,
            },
          );

        if (error) {
          throw databaseError(
            `Unable to load ${adapter.table}`,
            error,
          );
        }

        return (
          data ?? []
        ).map(
          adapter.fromRow,
        );
      },

    create:
      async (
        payload:
          Partial<T>,
      ): Promise<T> => {
        const row = {
          ...(adapter.createDefaults ?? {}),
          ...adapter.toRow(
            payload,
          ),
        };

        if (
          adapter.organisationScoped
        ) {
          row.organisation_id =
            COSSA_ORGANISATION_ID;
        }

        const {
          data,
          error,
        } =
          await db
            .from(
              adapter.table,
            )
            .insert(
              row,
            )
            .select(
              adapter.select ??
                "*",
            )
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

        return adapter.fromRow(
          data,
        );
      },

    update:
      async (
        id: string,
        patch:
          Partial<T>,
      ): Promise<void> => {
        const cleanId =
          requiredText(
            id,
            "Record ID",
          );

        const row =
          adapter.toRow(
            patch,
          );

        let query =
          db
            .from(
              adapter.table,
            )
            .update(
              row,
            )
            .eq(
              "id",
              cleanId,
            );

        if (
          adapter.organisationScoped
        ) {
          query =
            query.eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            );
        }

        const {
          data,
          error,
        } =
          await query
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

    remove:
      async (
        id: string,
      ): Promise<void> => {
        const cleanId =
          requiredText(
            id,
            "Record ID",
          );

        let query =
          db
            .from(
              adapter.table,
            )
            .delete()
            .eq(
              "id",
              cleanId,
            );

        if (
          adapter.organisationScoped
        ) {
          query =
            query.eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            );
        }

        const {
          data,
          error,
        } =
          await query
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

/* -------------------------------------------------------------------------- */
/* GENERIC PLAIN CRUD                                                         */
/* -------------------------------------------------------------------------- */

function plainCrud<T>(
  table: string,
  orderBy =
    "created_at",
  ascending =
    false,
  organisationScoped =
    false,
) {
  return adaptedCrud<T>({
    table,

    orderBy,

    ascending,

    organisationScoped,

    fromRow:
      (row) =>
        row as T,

    toRow:
      (value) => ({
        ...value,

        updated_at:
          new Date().toISOString(),
      }),
  });
}

/* -------------------------------------------------------------------------- */
/* COMPANIES                                                                  */
/* -------------------------------------------------------------------------- */

export const salesCompanies =
  plainCrud<SalesCompany>(
    "sales_companies",
    "created_at",
    false,
    true,
  );

/* -------------------------------------------------------------------------- */
/* CUSTOMERS                                                                  */
/* -------------------------------------------------------------------------- */

export const salesCustomers =
  adaptedCrud<SalesCustomer>({
    table:
      "customers",

    organisationScoped:
      true,

    fromRow:
      (row) => ({
        ...row,

        name:
          row.name ??
          row.full_name ??
          "Unnamed customer",

        status:
          lower(
            row.status,
            "active",
          ),

        /*
         * Keep the UI field available until a confirmed customer/company
         * relationship column is exposed by the production schema.
         */
        company_id:
          row.company_id ??
          null,
      }),

    toRow:
      (value) => ({
        ...(value.name !==
          undefined && {
          name:
            requiredText(
              value.name,
              "Customer name",
            ),
        }),

        ...(value.email !==
          undefined && {
          email:
            optionalText(
              value.email,
            ),
        }),

        ...(value.phone !==
          undefined && {
          phone:
            optionalText(
              value.phone,
            ),
        }),

        ...(value.status !==
          undefined && {
          status:
            lower(
              value.status,
              "active",
            ),
        }),

        ...(value.notes !==
          undefined && {
          notes:
            optionalText(
              value.notes,
            ),
        }),

        updated_at:
          new Date().toISOString(),
      }),
  });

/* -------------------------------------------------------------------------- */
/* LEADS                                                                      */
/* -------------------------------------------------------------------------- */

export const salesLeads =
  adaptedCrud<SalesLead>({
    table:
      "leads",

    organisationScoped:
      true,

    /*
     * The central lead registry validates its origin. Manual Growth entries
     * are created under Cossa Growth, while updates leave an existing source
     * (website, Store, NexDocs, etc.) intact.
     */
    createDefaults: {
      source_app:
        "cossa_growth",

      source_label:
        "COSSA GROWTH",
    },

    fromRow:
      (row) => ({
        id:
          row.id,

        name:
          row.name ??
          row.full_name ??
          "Unnamed lead",

        email:
          row.email ??
          null,

        phone:
          row.phone ??
          null,

        company:
          row.company ??
          null,

        source:
          row.source ??
          null,

        status:
          lower(
            row.stage ??
              row.status,
            "new",
          ),

        score:
          clampPercentage(
            row.score,
            0,
          ),

        notes:
          row.notes ??
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      }),

    toRow:
      (value) => ({
        ...(value.name !==
          undefined && {
          name:
            requiredText(
              value.name,
              "Lead name",
            ),

          full_name:
            requiredText(
              value.name,
              "Lead name",
            ),
        }),

        ...(value.email !==
          undefined && {
          email:
            optionalText(
              value.email,
            ),
        }),

        ...(value.phone !==
          undefined && {
          phone:
            optionalText(
              value.phone,
            ),
        }),

        ...(value.company !==
          undefined && {
          company:
            optionalText(
              value.company,
            ),
        }),

        ...(value.source !==
          undefined && {
          source:
            optionalText(
              value.source,
            ),
        }),

        ...(value.status !==
          undefined && {
          status:
            lower(
              value.status,
              "new",
            ),

          stage:
            lower(
              value.status,
              "new",
            ),
        }),

        ...(value.score !==
          undefined && {
          score:
            clampPercentage(
              value.score,
              0,
            ),
        }),

        ...(value.notes !==
          undefined && {
          notes:
            optionalText(
              value.notes,
            ),
        }),

        updated_at:
          new Date().toISOString(),
      }),
  });

/* -------------------------------------------------------------------------- */
/* OPPORTUNITIES                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Existing opportunities table supports:
 *
 * Database status:
 * prospect, qualified, engaged, won, lost
 *
 * UI stages:
 * prospect, qualified, proposal, negotiation, won, lost
 *
 * Proposal and Negotiation are persisted as "engaged". Their exact UI stage
 * remains preserved inside the controlled cossa_ui_stage notes marker.
 */
export const salesOpportunities =
  {
    list:
      async (): Promise<
        SalesOpportunity[]
      > => {
        const {
          data,
          error,
        } =
          await db
            .from(
              "opportunities",
            )
            .select(
              OPPORTUNITY_SELECT,
            )
            .eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

        if (error) {
          throw databaseError(
            "Unable to load opportunities",
            error,
          );
        }

        return (
          data ?? []
        ).map(
          mapOpportunityRow,
        );
      },

    create:
      async (
        payload:
          Partial<SalesOpportunity>,
      ): Promise<SalesOpportunity> => {
        const title =
          requiredText(
            payload.title,
            "Opportunity title",
          );

        const value =
          safeNumber(
            payload.value,
            0,
          );

        if (
          value <
          0
        ) {
          throw new Error(
            "Opportunity value cannot be negative.",
          );
        }

        const stage =
          normaliseUiOpportunityStage(
            payload.stage,
          );

        const cleanNotes =
          optionalText(
            payload.notes,
          );

        const row = {
          organisation_id:
            COSSA_ORGANISATION_ID,

          organization_name:
            title,

          opportunity_type:
            inferOpportunityType(
              title,
              cleanNotes,
            ),

          estimated_value:
            value,

          status:
            toDatabaseOpportunityStatus(
              stage,
            ),

          probability:
            clampProbability(
              payload.probability,
            ),

          expected_close:
            payload.expected_close ||
            null,

          notes:
            addUiStageMarker(
              cleanNotes,
              stage,
            ),

          updated_at:
            new Date().toISOString(),
        };

        const {
          data,
          error,
        } =
          await db
            .from(
              "opportunities",
            )
            .insert(
              row,
            )
            .select(
              OPPORTUNITY_SELECT,
            )
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

        return mapOpportunityRow(
          data,
        );
      },

    update:
      async (
        id: string,
        patch:
          Partial<SalesOpportunity>,
      ): Promise<void> => {
        const cleanId =
          requiredText(
            id,
            "Opportunity ID",
          );

        const {
          data:
            existing,

          error:
            existingError,
        } =
          await db
            .from(
              "opportunities",
            )
            .select(
              OPPORTUNITY_SELECT,
            )
            .eq(
              "id",
              cleanId,
            )
            .eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            )
            .maybeSingle();

        if (
          existingError
        ) {
          throw databaseError(
            "Unable to load the opportunity before updating",
            existingError,
          );
        }

        if (
          !existing
        ) {
          throw new Error(
            "The opportunity was not found or access was denied.",
          );
        }

        const current =
          mapOpportunityRow(
            existing,
          );

        const nextTitle =
          patch.title !==
          undefined
            ? requiredText(
                patch.title,
                "Opportunity title",
              )
            : current.title;

        const nextStage =
          patch.stage !==
          undefined
            ? normaliseUiOpportunityStage(
                patch.stage,
              )
            : normaliseUiOpportunityStage(
                current.stage,
              );

        const nextNotes =
          patch.notes !==
          undefined
            ? optionalText(
                patch.notes,
              )
            : current.notes;

        const updateRow:
          Record<
            string,
            unknown
          > = {
          updated_at:
            new Date().toISOString(),
        };

        if (
          patch.title !==
          undefined
        ) {
          updateRow.organization_name =
            nextTitle;

          updateRow.opportunity_type =
            inferOpportunityType(
              nextTitle,
              nextNotes,
            );
        }

        if (
          patch.value !==
          undefined
        ) {
          const amount =
            safeNumber(
              patch.value,
              0,
            );

          if (
            amount <
            0
          ) {
            throw new Error(
              "Opportunity value cannot be negative.",
            );
          }

          updateRow.estimated_value =
            amount;
        }

        if (
          patch.stage !==
          undefined
        ) {
          updateRow.status =
            toDatabaseOpportunityStatus(
              nextStage,
            );
        }

        if (
          patch.probability !==
          undefined
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
            patch.expected_close ||
            null;
        }

        if (
          patch.notes !==
            undefined ||
          patch.stage !==
            undefined
        ) {
          updateRow.notes =
            addUiStageMarker(
              nextNotes,
              nextStage,
            );
        }

        const {
          data,
          error,
        } =
          await db
            .from(
              "opportunities",
            )
            .update(
              updateRow,
            )
            .eq(
              "id",
              cleanId,
            )
            .eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            )
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

    remove:
      async (
        id: string,
      ): Promise<void> => {
        const cleanId =
          requiredText(
            id,
            "Opportunity ID",
          );

        const {
          data,
          error,
        } =
          await db
            .from(
              "opportunities",
            )
            .delete()
            .eq(
              "id",
              cleanId,
            )
            .eq(
              "organisation_id",
              COSSA_ORGANISATION_ID,
            )
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

/* -------------------------------------------------------------------------- */
/* QUOTATIONS                                                                 */
/* -------------------------------------------------------------------------- */

export const salesQuotations =
  adaptedCrud<SalesQuotation>({
    table:
      "quotations",

    organisationScoped:
      true,

    fromRow:
      (row) => ({
        id:
          row.id,

        number:
          row.quote_number ??
          "Unnumbered",

        customer_id:
          row.customer_id ??
          null,

        opportunity_id:
          row.opportunity_id ??
          null,

        amount:
          safeNumber(
            row.amount,
            0,
          ),

        status:
          lower(
            row.status,
            "draft",
          ),

        valid_until:
          row.valid_until ??
          null,

        notes:
          row.notes ??
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      }),

    toRow:
      (value) => ({
        ...(value.number !==
          undefined && {
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

        ...(value.opportunity_id !==
          undefined && {
          opportunity_id:
            value.opportunity_id,
        }),

        ...(value.amount !==
          undefined && {
          amount:
            Math.max(
              0,
              safeNumber(
                value.amount,
                0,
              ),
            ),
        }),

        ...(value.status !==
          undefined && {
          status:
            lower(
              value.status,
              "draft",
            ),
        }),

        ...(value.valid_until !==
          undefined && {
          valid_until:
            value.valid_until ||
            null,
        }),

        ...(value.notes !==
          undefined && {
          notes:
            optionalText(
              value.notes,
            ),
        }),

        updated_at:
          new Date().toISOString(),
      }),
  });

/* -------------------------------------------------------------------------- */
/* APPOINTMENTS                                                               */
/* -------------------------------------------------------------------------- */

export const salesAppointments =
  adaptedCrud<SalesAppointment>({
    table:
      "appointments",

    organisationScoped:
      true,

    orderBy:
      "scheduled_at",

    ascending:
      true,

    fromRow:
      (row) => ({
        id:
          row.id,

        title:
          row.title ??
          row.service ??
          "Appointment",

        customer_id:
          row.customer_id ??
          null,

        starts_at:
          row.scheduled_at ??
          row.appointment_date ??
          "",

        ends_at:
          row.ends_at ??
          null,

        location:
          row.location ??
          null,

        notes:
          row.notes ??
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      }),

    toRow:
      (value) => ({
        ...(value.title !==
          undefined && {
          title:
            requiredText(
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
            requiredText(
              value.starts_at,
              "Appointment start time",
            ),

          appointment_date:
            requiredText(
              value.starts_at,
              "Appointment start time",
            ),
        }),

        ...(value.ends_at !==
          undefined && {
          ends_at:
            value.ends_at ||
            null,
        }),

        ...(value.location !==
          undefined && {
          location:
            optionalText(
              value.location,
            ),
        }),

        ...(value.notes !==
          undefined && {
          notes:
            optionalText(
              value.notes,
            ),
        }),

        updated_at:
          new Date().toISOString(),
      }),
  });

/* -------------------------------------------------------------------------- */
/* FOLLOW UPS                                                                 */
/* -------------------------------------------------------------------------- */

export const salesFollowUps =
  plainCrud<SalesFollowUp>(
    "sales_follow_ups",
    "due_at",
    true,
    true,
  );

/* -------------------------------------------------------------------------- */
/* PROJECTS                                                                   */
/* -------------------------------------------------------------------------- */

export const opsProjects =
  adaptedCrud<OpsProject>({
    table:
      "projects",

    organisationScoped:
      true,

    select: [
      "id",
      "customer_id",
      "project_name",
      "name",
      "service",
      "location",
      "budget",
      "status",
      "priority",
      "progress",
      "start_date",
      "end_date",
      "notes",
      "created_at",
      "updated_at",
    ].join(","),

    fromRow:
      (row) => ({
        id:
          row.id,

        name:
          row.project_name ??
          row.name ??
          "Unnamed project",

        customer_id:
          row.customer_id ??
          null,

        status:
          lower(
            row.status,
            "planning",
          ),

        priority:
          lower(
            row.priority,
            "medium",
          ),

        progress:
          clampPercentage(
            row.progress,
            0,
          ),

        start_date:
          row.start_date ??
          null,

        due_date:
          row.end_date ??
          null,

        notes:
          row.notes ??
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      }),

    toRow:
      (value) => {
        const row:
          Record<
            string,
            unknown
          > = {
          updated_at:
            new Date().toISOString(),
        };

        if (
          value.name !==
          undefined
        ) {
          const projectName =
            requiredText(
              value.name,
              "Project name",
            );

          row.name =
            projectName;

          row.project_name =
            projectName;
        }

        if (
          value.customer_id !==
          undefined
        ) {
          row.customer_id =
            value.customer_id;
        }

        if (
          value.status !==
          undefined
        ) {
          row.status =
            lower(
              value.status,
              "planning",
            );
        }

        if (
          value.priority !==
          undefined
        ) {
          row.priority =
            lower(
              value.priority,
              "medium",
            );
        }

        if (
          value.progress !==
          undefined
        ) {
          row.progress =
            clampPercentage(
              value.progress,
              0,
            );
        }

        if (
          value.start_date !==
          undefined
        ) {
          row.start_date =
            value.start_date ||
            null;
        }

        if (
          value.due_date !==
          undefined
        ) {
          row.end_date =
            value.due_date ||
            null;
        }

        if (
          value.notes !==
          undefined
        ) {
          row.notes =
            optionalText(
              value.notes,
            );
        }

        return row;
      },
  });

/* -------------------------------------------------------------------------- */
/* TASKS                                                                      */
/* -------------------------------------------------------------------------- */

export const opsTasks =
  plainCrud<OpsTask>(
    "ops_tasks",
    "due_at",
    true,
    true,
  );

/* -------------------------------------------------------------------------- */
/* DOCUMENTS                                                                  */
/* -------------------------------------------------------------------------- */

export const opsDocuments =
  adaptedCrud<OpsDocument>({
    table:
      "ops_documents",

    organisationScoped:
      true,

    fromRow:
      (row) => ({
        id:
          row.id,

        title:
          row.title ??
          "Untitled document",

        category:
          row.category ??
          null,

        url:
          row.source_url ??
          null,

        notes:
          row.notes ??
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      }),

    toRow:
      (value) => ({
        ...(value.title !==
          undefined && {
          title:
            requiredText(
              value.title,
              "Document title",
            ),
        }),

        ...(value.category !==
          undefined && {
          category:
            optionalText(
              value.category,
            ),
        }),

        ...(value.url !==
          undefined && {
          source_url:
            optionalText(
              value.url,
            ),
        }),

        ...(value.notes !==
          undefined && {
          notes:
            optionalText(
              value.notes,
            ),
        }),

        updated_at:
          new Date().toISOString(),
      }),
  });

/* -------------------------------------------------------------------------- */
/* OPPORTUNITY -> PROJECT                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Creates an operations project from a WON opportunity.
 *
 * This function is deliberately idempotent:
 * the source opportunity ID is stored in project notes and checked before a
 * second project can be created from the same opportunity.
 *
 * The Pipeline UI should call this only after the user or authorised workflow
 * confirms that the opportunity is genuinely won.
 */
export async function createProjectFromOpportunity(
  opportunity:
    SalesOpportunity,
): Promise<OpsProject> {
  if (
    normaliseUiOpportunityStage(
      opportunity.stage,
    ) !== "won"
  ) {
    throw new Error(
      "Only a won opportunity can be converted into a project.",
    );
  }

  const opportunityId =
    requiredText(
      opportunity.id,
      "Opportunity ID",
    );

  const projectName =
    requiredText(
      opportunity.title,
      "Opportunity title",
    );

  const sourceMarker =
    `[source_opportunity_id:${opportunityId}]`;

  const {
    data:
      existingProjects,

    error:
      existingProjectError,
  } =
    await db
      .from(
        "projects",
      )
      .select(
        [
          "id",
          "customer_id",
          "project_name",
          "name",
          "status",
          "priority",
          "progress",
          "start_date",
          "end_date",
          "notes",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq(
        "organisation_id",
        COSSA_ORGANISATION_ID,
      )
      .ilike(
        "notes",
        `%${sourceMarker}%`,
      )
      .limit(1);

  if (
    existingProjectError
  ) {
    throw databaseError(
      "Unable to check for an existing project",
      existingProjectError,
    );
  }

  if (
    Array.isArray(
      existingProjects,
    ) &&
    existingProjects.length >
      0
  ) {
    const projects =
      await opsProjects.list();

    const existing =
      projects.find(
        (project) =>
          project.id ===
          existingProjects[0]
            .id,
      );

    if (!existing) {
      throw new Error(
        "The project already exists but could not be reloaded.",
      );
    }

    return existing;
  }

  const projectNotes =
    [
      sourceMarker,

      "Created from a won sales opportunity.",

      `Opportunity value: R${safeNumber(
        opportunity.value,
        0,
      ).toFixed(2)}`,

      opportunity.expected_close
        ? `Original expected close: ${opportunity.expected_close}`
        : null,

      opportunity.notes
        ? `Opportunity notes:\n${opportunity.notes}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

  const {
    data,
    error,
  } =
    await db
      .from(
        "projects",
      )
      .insert({
        organisation_id:
          COSSA_ORGANISATION_ID,

        name:
          projectName,

        project_name:
          projectName,

        budget:
          Math.max(
            0,
            safeNumber(
              opportunity.value,
              0,
            ),
          ),

        status:
          "planning",

        priority:
          "high",

        progress:
          0,

        start_date:
          null,

        end_date:
          null,

        notes:
          projectNotes,

        updated_at:
          new Date().toISOString(),
      })
      .select(
        [
          "id",
          "customer_id",
          "project_name",
          "name",
          "status",
          "priority",
          "progress",
          "start_date",
          "end_date",
          "notes",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .single();

  if (error) {
    throw databaseError(
      "Unable to create a project from the won opportunity",
      error,
    );
  }

  if (!data) {
    throw new Error(
      "The project could not be created because Supabase returned no saved record.",
    );
  }

  const projects =
    await opsProjects.list();

  const created =
    projects.find(
      (project) =>
        project.id ===
        data.id,
    );

  if (!created) {
    throw new Error(
      "The project was created but could not be reloaded.",
    );
  }

  return created;
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD                                                                  */
/* -------------------------------------------------------------------------- */

export async function dashboardStats() {
  const [
    leads,
    opportunities,
    quotations,
    projects,
    tasks,
    customers,
  ] =
    await Promise.all([
      salesLeads.list(),

      salesOpportunities.list(),

      salesQuotations.list(),

      opsProjects.list(),

      opsTasks.list(),

      salesCustomers.list(),
    ]);

  const pipelineValue =
    opportunities
      .filter(
        (
          opportunity,
        ) =>
          ![
            "won",
            "lost",
          ].includes(
            normaliseUiOpportunityStage(
              opportunity.stage,
            ),
          ),
      )
      .reduce(
        (
          total,
          opportunity,
        ) =>
          total +
          safeNumber(
            opportunity.value,
            0,
          ),
        0,
      );

  const acceptedQuotationValue =
    quotations
      .filter(
        (
          quotation,
        ) =>
          lower(
            quotation.status,
            "draft",
          ) ===
          "accepted",
      )
      .reduce(
        (
          total,
          quotation,
        ) =>
          total +
          safeNumber(
            quotation.amount,
            0,
          ),
        0,
      );

  const stages = [
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ] as const;

  const pipelineByStage =
    stages.map(
      (stage) => {
        const stageRows =
          opportunities.filter(
            (
              opportunity,
            ) =>
              normaliseUiOpportunityStage(
                opportunity.stage,
              ) ===
              stage,
          );

        return {
          stage,

          count:
            stageRows.length,

          value:
            stageRows.reduce(
              (
                total,
                opportunity,
              ) =>
                total +
                safeNumber(
                  opportunity.value,
                  0,
                ),
              0,
            ),
        };
      },
    );

  const now =
    Date.now();

  const sevenDaysMs =
    7 *
    24 *
    60 *
    60 *
    1_000;

  return {
    /*
     * An accepted quotation is a commercial commitment, not payment-confirmed
     * revenue. Revenue is intentionally withheld until a payment truth source
     * is verified and connected.
     */
    acceptedQuotationValue,

    newLeads:
      leads.filter(
        (lead) => {
          const createdAt =
            new Date(
              lead.created_at,
            ).getTime();

          return (
            Number.isFinite(
              createdAt,
            ) &&
            now -
              createdAt <
              sevenDaysMs
          );
        },
      ).length,

    totalLeads:
      leads.length,

    pipelineValue,

    pipelineByStage,

    customers:
      customers.length,

    activeProjects:
      projects.filter(
        (project) =>
          ![
            "done",
            "completed",
            "archived",
            "cancelled",
          ].includes(
            lower(
              project.status,
              "planning",
            ),
          ),
      ).length,

    projectCount:
      projects.length,

    openTasks:
      tasks.filter(
        (task) =>
          ![
            "done",
            "completed",
            "cancelled",
          ].includes(
            lower(
              task.status,
              "open",
            ),
          ),
      ).length,

    overdueTasks:
      tasks.filter(
        (task) => {
          const status =
            lower(
              task.status,
              "open",
            );

          if (
            [
              "done",
              "completed",
              "cancelled",
            ].includes(
              status,
            ) ||
            !task.due_at
          ) {
            return false;
          }

          const dueAt =
            new Date(
              task.due_at,
            ).getTime();

          return (
            Number.isFinite(
              dueAt,
            ) &&
            dueAt <
              now
          );
        },
      ).length,

    quotesOpen:
      quotations.filter(
        (
          quotation,
        ) =>
          [
            "draft",
            "sent",
          ].includes(
            lower(
              quotation.status,
              "draft",
            ),
          ),
      ).length,
  };
}
