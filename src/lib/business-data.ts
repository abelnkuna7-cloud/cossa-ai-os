// Production CRM + Operations data access.
// The UI model is translated to the existing Growth schema so current website
// records remain the source of truth and no duplicate sales tables are needed.
import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as { from: (table: string) => any };

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

type Adapter<T> = {
  table: string;
  organisationScoped?: boolean;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
  fromRow: (row: any) => T;
  toRow: (value: Partial<T>) => Record<string, unknown>;
};

const lower = (value: unknown, fallback: string) =>
  typeof value === "string" && value ? value.toLowerCase() : fallback;

function adaptedCrud<T>(adapter: Adapter<T>) {
  return {
    list: async (): Promise<T[]> => {
      let query = db.from(adapter.table).select(adapter.select ?? "*");
      if (adapter.organisationScoped) query = query.eq("organisation_id", COSSA_ORGANISATION_ID);
      const { data, error } = await query.order(adapter.orderBy ?? "created_at", {
        ascending: adapter.ascending ?? false,
      });
      if (error) throw error;
      return (data ?? []).map(adapter.fromRow);
    },
    create: async (payload: Partial<T>): Promise<T> => {
      const row = adapter.toRow(payload);
      if (adapter.organisationScoped) row.organisation_id = COSSA_ORGANISATION_ID;
      const { data, error } = await db
        .from(adapter.table)
        .insert(row)
        .select(adapter.select ?? "*")
        .single();
      if (error) throw error;
      return adapter.fromRow(data);
    },
    update: async (id: string, patch: Partial<T>): Promise<void> => {
      const { error } = await db.from(adapter.table).update(adapter.toRow(patch)).eq("id", id);
      if (error) throw error;
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await db.from(adapter.table).delete().eq("id", id);
      if (error) throw error;
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
    toRow: (value) => value,
  });
}

export const salesCompanies = plainCrud<SalesCompany>("sales_companies", "created_at", false, true);

export const salesCustomers = adaptedCrud<SalesCustomer>({
  table: "customers",
  fromRow: (r) => ({ ...r, status: lower(r.status, "active"), company_id: null }),
  toRow: (v) => ({
    ...(v.name !== undefined && { name: v.name }),
    ...(v.email !== undefined && { email: v.email }),
    ...(v.phone !== undefined && { phone: v.phone }),
    ...(v.status !== undefined && { status: v.status }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const salesLeads = adaptedCrud<SalesLead>({
  table: "leads",
  fromRow: (r) => ({
    ...r,
    name: r.name ?? r.full_name ?? "Unnamed lead",
    status: lower(r.stage ?? r.status, "new"),
    score: r.score ?? 0,
  }),
  toRow: (v) => ({
    ...(v.name !== undefined && { name: v.name, full_name: v.name }),
    ...(v.email !== undefined && { email: v.email }),
    ...(v.phone !== undefined && { phone: v.phone }),
    ...(v.company !== undefined && { company: v.company }),
    ...(v.source !== undefined && { source: v.source }),
    ...(v.status !== undefined && { status: v.status, stage: v.status }),
    ...(v.score !== undefined && { score: v.score }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const salesOpportunities = adaptedCrud<SalesOpportunity>({
  table: "opportunities",
  fromRow: (r) => ({
    ...r,
    title: r.organization_name,
    value: Number(r.estimated_value ?? 0),
    stage: lower(r.status, "prospect"),
    probability: r.probability ?? 20,
    expected_close: r.expected_close ?? null,
    customer_id: null,
  }),
  toRow: (v) => ({
    ...(v.title !== undefined && { organization_name: v.title, opportunity_type: "general" }),
    ...(v.value !== undefined && { estimated_value: v.value }),
    ...(v.stage !== undefined && { status: v.stage }),
    ...(v.probability !== undefined && { probability: v.probability }),
    ...(v.expected_close !== undefined && { expected_close: v.expected_close }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const salesQuotations = adaptedCrud<SalesQuotation>({
  table: "quotations",
  fromRow: (r) => ({
    ...r,
    number: r.quote_number ?? "Unnumbered",
    status: lower(r.status, "draft"),
    opportunity_id: null,
  }),
  toRow: (v) => ({
    ...(v.number !== undefined && { quote_number: v.number }),
    ...(v.customer_id !== undefined && { customer_id: v.customer_id }),
    ...(v.amount !== undefined && { amount: v.amount }),
    ...(v.status !== undefined && { status: v.status }),
    ...(v.valid_until !== undefined && { valid_until: v.valid_until }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const salesAppointments = adaptedCrud<SalesAppointment>({
  table: "appointments",
  orderBy: "scheduled_at",
  ascending: true,
  fromRow: (r) => ({
    ...r,
    title: r.title ?? r.service ?? "Appointment",
    starts_at: r.scheduled_at ?? r.appointment_date,
    ends_at: r.ends_at ?? null,
  }),
  toRow: (v) => ({
    ...(v.title !== undefined && { title: v.title }),
    ...(v.customer_id !== undefined && { customer_id: v.customer_id }),
    ...(v.starts_at !== undefined && { scheduled_at: v.starts_at, appointment_date: v.starts_at }),
    ...(v.ends_at !== undefined && { ends_at: v.ends_at }),
    ...(v.location !== undefined && { location: v.location }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const salesFollowUps = plainCrud<SalesFollowUp>("sales_follow_ups", "due_at", true, true);

export const opsProjects = adaptedCrud<OpsProject>({
  table: "projects",
  fromRow: (r) => ({
    ...r,
    name: r.name ?? r.project_name ?? "Unnamed project",
    status: lower(r.status, "planning"),
    priority: r.priority ?? "medium",
    progress: r.progress ?? 0,
    due_date: r.end_date ?? null,
  }),
  toRow: (v) => ({
    ...(v.name !== undefined && { name: v.name, project_name: v.name }),
    ...(v.customer_id !== undefined && { customer_id: v.customer_id }),
    ...(v.status !== undefined && { status: v.status }),
    ...(v.priority !== undefined && { priority: v.priority }),
    ...(v.progress !== undefined && { progress: v.progress }),
    ...(v.start_date !== undefined && { start_date: v.start_date }),
    ...(v.due_date !== undefined && { end_date: v.due_date }),
    ...(v.notes !== undefined && { notes: v.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export const opsTasks = plainCrud<OpsTask>("ops_tasks", "due_at", true, true);
export const opsDocuments = adaptedCrud<OpsDocument>({
  table: "ops_documents",
  organisationScoped: true,
  fromRow: (row) => ({ ...row, url: row.source_url ?? null }),
  toRow: (value) => ({
    ...(value.title !== undefined && { title: value.title }),
    ...(value.category !== undefined && { category: value.category }),
    ...(value.url !== undefined && { source_url: value.url }),
    ...(value.notes !== undefined && { notes: value.notes }),
    updated_at: new Date().toISOString(),
  }),
});

export async function dashboardStats() {
  const [leads, opps, quotes, projects, tasks, customers] = await Promise.all([
    salesLeads.list(),
    salesOpportunities.list(),
    salesQuotations.list(),
    opsProjects.list(),
    opsTasks.list(),
    salesCustomers.list(),
  ]);
  const pipelineValue = opps
    .filter((o) => !["won", "lost"].includes(o.stage))
    .reduce((sum, o) => sum + Number(o.value ?? 0), 0);
  const wonValue = opps
    .filter((o) => o.stage === "won")
    .reduce((sum, o) => sum + Number(o.value ?? 0), 0);
  const acceptedRevenue = quotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + Number(q.amount ?? 0), 0);
  const stages = ["prospect", "qualified", "proposal", "negotiation", "won"] as const;
  const pipelineByStage = stages.map((stage) => {
    const rows = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((sum, o) => sum + Number(o.value ?? 0), 0),
    };
  });
  const now = Date.now();
  return {
    revenueMTD: wonValue + acceptedRevenue,
    newLeads: leads.filter((lead) => now - new Date(lead.created_at).getTime() < 7 * 86_400_000)
      .length,
    totalLeads: leads.length,
    pipelineValue,
    pipelineByStage,
    customers: customers.length,
    activeProjects: projects.filter((project) => !["done", "archived"].includes(project.status))
      .length,
    projectCount: projects.length,
    openTasks: tasks.filter((task) => task.status !== "done").length,
    overdueTasks: tasks.filter(
      (task) => task.status !== "done" && task.due_at && new Date(task.due_at).getTime() < now,
    ).length,
    quotesOpen: quotes.filter((quote) => ["draft", "sent"].includes(quote.status)).length,
  };
}
