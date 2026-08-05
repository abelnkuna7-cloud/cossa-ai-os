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
      }

      if (value.value !== undefined) {
        const amount = safeNumber(
          value.value,
          0,
        );

        if (amount < 0) {
          throw new Error(
            "Opportunity value cannot be negative.",
          );
        }

        row.estimated_value =
          amount;
      }

      if (value.stage !== undefined) {
        const stage = lower(
          value.stage,
          "prospect",
        );

        if (
          !OPPORTUNITY_STAGES.includes(
            stage as
              (typeof OPPORTUNITY_STAGES)[number],
          )
        ) {
          throw new Error(
            `Unsupported opportunity stage: ${stage}.`,
          );
        }

        row.status = stage;
      }

      if (
        value.probability !== undefined
      ) {
        row.probability =
          clampProbability(
            value.probability,
          );
      }

      if (
        value.expected_close !==
        undefined
      ) {
        row.expected_close =
          value.expected_close || null;
      }

      if (value.notes !== undefined) {
        row.notes =
          optionalText(value.notes);
      }

      return row;
    },
  });

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
        notes: optionalText(value.notes),
      }),

      updated_at: new Date().toISOString(),
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
        location:
          optionalText(value.location),
      }),

      ...(value.notes !== undefined && {
        notes: optionalText(value.notes),
      }),

      updated_at: new Date().toISOString(),
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

    fromRow: (row) => ({
      id: row.id,
      name:
        row.project_name ??
        row.name ??
        "Unnamed project",
      customer_id:
        row.customer_id ?? null,
      status: lower(
        row.status,
        "planning",
      ),
      priority:
        lower(
          row.priority,
          "medium",
        ),
      progress: safeNumber(
        row.progress,
        0,
      ),
      start_date:
        row.start_date ?? null,
      due_date:
        row.end_date ?? null,
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

      if (value.name !== undefined) {
        const projectName =
          requiredText(
            value.name,
            "Project name",
          );

        row.name = projectName;
        row.project_name =
          projectName;
      }

      if (
        value.customer_id !== undefined
      ) {
        row.customer_id =
          value.customer_id;
      }

      if (value.status !== undefined) {
        row.status = lower(
          value.status,
          "planning",
        );
      }

      if (value.priority !== undefined) {
        row.priority = lower(
          value.priority,
          "medium",
        );
      }

      if (value.progress !== undefined) {
        row.progress = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              safeNumber(
                value.progress,
                0,
              ),
            ),
          ),
        );
      }

      if (
        value.start_date !== undefined
      ) {
        row.start_date =
          value.start_date || null;
      }

      if (
        value.due_date !== undefined
      ) {
        row.end_date =
          value.due_date || null;
      }

      if (value.notes !== undefined) {
        row.notes =
          optionalText(value.notes);
      }

      return row;
    },
  });

export const opsTasks =
  plainCrud<OpsTask>(
    "ops_tasks",
    "due_at",
    true,
    true,
  );

export const opsDocuments =
  adaptedCrud<OpsDocument>({
    table: "ops_documents",
    organisationScoped: true,

    fromRow: (row) => ({
      ...row,
      url:
        row.source_url ?? null,
    }),

    toRow: (value) => ({
      ...(value.title !== undefined && {
        title: requiredText(
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

      ...(value.url !== undefined && {
        source_url:
          optionalText(value.url),
      }),

      ...(value.notes !== undefined && {
        notes:
          optionalText(value.notes),
      }),

      updated_at: new Date().toISOString(),
    }),
  });

/**
 * Creates a project from a won opportunity.
 *
 * This function is not called automatically merely because it exists.
 * The Pipeline page must call it after the user confirms a Won stage.
 *
 * A marker is stored in project notes to prevent accidental duplicates.
 */
export async function createProjectFromOpportunity(
  opportunity: SalesOpportunity,
): Promise<OpsProject> {
  if (
    lower(
      opportunity.stage,
      "prospect",
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

  const { data: existingProjects, error:
      existingProjectError } =
    await db
      .from("projects")
      .select(
        "id,customer_id,project_name,name,status,priority,progress,start_date,end_date,notes,created_at,updated_at",
      )
      .ilike(
        "notes",
        `%${sourceMarker}%`,
      )
      .limit(1);

  if (existingProjectError) {
    throw databaseError(
      "Unable to check for an existing project",
      existingProjectError,
    );
  }

  if (
    Array.isArray(existingProjects) &&
    existingProjects.length > 0
  ) {
    return opsProjects
      .list()
      .then((projects) => {
        const existing =
          projects.find(
            (project) =>
              project.id ===
              existingProjects[0].id,
          );

        if (!existing) {
          throw new Error(
            "The project already exists but could not be reloaded.",
          );
        }

        return existing;
      });
  }

  const projectNotes = [
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

  const { data, error } = await db
    .from("projects")
    .insert({
      name: projectName,
      project_name:
        projectName,
      budget: safeNumber(
        opportunity.value,
        0,
      ),
      status: "planning",
      priority: "high",
      progress: 0,
      start_date: null,
      end_date: null,
      notes: projectNotes,
      updated_at:
        new Date().toISOString(),
    })
    .select(
      "id,customer_id,project_name,name,status,priority,progress,start_date,end_date,notes,created_at,updated_at",
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

  return opsProjects
    .list()
    .then((projects) => {
      const created =
        projects.find(
          (project) =>
            project.id === data.id,
        );

      if (!created) {
        throw new Error(
          "The project was created but could not be reloaded.",
        );
      }

      return created;
    });
}

export async function dashboardStats() {
  const [
    leads,
    opportunities,
    quotations,
    projects,
    tasks,
    customers,
  ] = await Promise.all([
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
        (opportunity) =>
          !["won", "lost"].includes(
            lower(
              opportunity.stage,
              "prospect",
            ),
          ),
      )
      .reduce(
        (total, opportunity) =>
          total +
          safeNumber(
            opportunity.value,
            0,
          ),
        0,
      );

  const wonValue =
    opportunities
      .filter(
        (opportunity) =>
          lower(
            opportunity.stage,
            "prospect",
          ) === "won",
      )
      .reduce(
        (total, opportunity) =>
          total +
          safeNumber(
            opportunity.value,
            0,
          ),
        0,
      );

  const acceptedRevenue =
    quotations
      .filter(
        (quotation) =>
          lower(
            quotation.status,
            "draft",
          ) === "accepted",
      )
      .reduce(
        (total, quotation) =>
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
    stages.map((stage) => {
      const stageRows =
        opportunities.filter(
          (opportunity) =>
            lower(
              opportunity.stage,
              "prospect",
            ) === stage,
        );

      return {
        stage,
        count: stageRows.length,
        value: stageRows.reduce(
          (total, opportunity) =>
            total +
            safeNumber(
              opportunity.value,
              0,
            ),
          0,
        ),
      };
    });

  const now = Date.now();

  return {
    revenueMTD:
      wonValue +
      acceptedRevenue,

    newLeads: leads.filter(
      (lead) => {
        const createdAt =
          new Date(
            lead.created_at,
          ).getTime();

        return (
          Number.isFinite(createdAt) &&
          now - createdAt <
            7 * 86_400_000
        );
      },
    ).length,

    totalLeads: leads.length,

    pipelineValue,

    pipelineByStage,

    customers:
      customers.length,

    activeProjects:
      projects.filter(
        (project) =>
          !["done", "archived"].includes(
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
          lower(
            task.status,
            "open",
          ) !== "done",
      ).length,

    overdueTasks:
      tasks.filter((task) => {
        if (
          lower(
            task.status,
            "open",
          ) === "done" ||
          !task.due_at
        ) {
          return false;
        }

        const dueAt =
          new Date(
            task.due_at,
          ).getTime();

        return (
          Number.isFinite(dueAt) &&
          dueAt < now
        );
      }).length,

    quotesOpen:
      quotations.filter(
        (quotation) =>
          ["draft", "sent"].includes(
            lower(
              quotation.status,
              "draft",
            ),
          ),
      ).length,
  };
}