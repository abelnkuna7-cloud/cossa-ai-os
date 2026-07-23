// Client-side CRUD for Sales + Operations core.
// Tables live in Supabase; policies are open in private dev.
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (t: string) => any };

// ================= Types =================
export interface SalesCompany {
  id: string; name: string; industry: string | null; website: string | null;
  phone: string | null; notes: string | null; created_at: string; updated_at: string;
}
export interface SalesCustomer {
  id: string; name: string; email: string | null; phone: string | null;
  company_id: string | null; status: string; notes: string | null;
  created_at: string; updated_at: string;
}
export interface SalesLead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; source: string | null; status: string; score: number;
  notes: string | null; created_at: string; updated_at: string;
}
export interface SalesOpportunity {
  id: string; title: string; customer_id: string | null; value: number;
  stage: string; probability: number; expected_close: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface SalesQuotation {
  id: string; number: string; customer_id: string | null; opportunity_id: string | null;
  amount: number; status: string; valid_until: string | null; notes: string | null;
  created_at: string; updated_at: string;
}
export interface SalesAppointment {
  id: string; title: string; customer_id: string | null; starts_at: string;
  ends_at: string | null; location: string | null; notes: string | null;
  created_at: string; updated_at: string;
}
export interface SalesFollowUp {
  id: string; subject: string; customer_id: string | null; due_at: string;
  status: string; notes: string | null; created_at: string; updated_at: string;
}
export interface OpsProject {
  id: string; name: string; customer_id: string | null; status: string;
  priority: string; progress: number; start_date: string | null; due_date: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface OpsTask {
  id: string; title: string; project_id: string | null; status: string;
  priority: string; assignee: string | null; due_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface OpsDocument {
  id: string; title: string; category: string | null; url: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

// ================= Generic helpers =================
function list<T>(table: string, orderBy = "created_at", ascending = false) {
  return async (): Promise<T[]> => {
    const { data, error } = await db.from(table).select("*").order(orderBy, { ascending });
    if (error) throw error;
    return (data ?? []) as T[];
  };
}
function create<T>(table: string) {
  return async (payload: Partial<T>): Promise<T> => {
    const { data, error } = await db.from(table).insert(payload).select("*").single();
    if (error) throw error;
    return data as T;
  };
}
function update<T>(table: string) {
  return async (id: string, patch: Partial<T>): Promise<void> => {
    const { error } = await db.from(table).update(patch).eq("id", id);
    if (error) throw error;
  };
}
function remove(table: string) {
  return async (id: string): Promise<void> => {
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) throw error;
  };
}

// ================= API surface =================
export const salesCompanies = {
  list: list<SalesCompany>("sales_companies"),
  create: create<SalesCompany>("sales_companies"),
  update: update<SalesCompany>("sales_companies"),
  remove: remove("sales_companies"),
};
export const salesCustomers = {
  list: list<SalesCustomer>("sales_customers"),
  create: create<SalesCustomer>("sales_customers"),
  update: update<SalesCustomer>("sales_customers"),
  remove: remove("sales_customers"),
};
export const salesLeads = {
  list: list<SalesLead>("sales_leads"),
  create: create<SalesLead>("sales_leads"),
  update: update<SalesLead>("sales_leads"),
  remove: remove("sales_leads"),
};
export const salesOpportunities = {
  list: list<SalesOpportunity>("sales_opportunities"),
  create: create<SalesOpportunity>("sales_opportunities"),
  update: update<SalesOpportunity>("sales_opportunities"),
  remove: remove("sales_opportunities"),
};
export const salesQuotations = {
  list: list<SalesQuotation>("sales_quotations"),
  create: create<SalesQuotation>("sales_quotations"),
  update: update<SalesQuotation>("sales_quotations"),
  remove: remove("sales_quotations"),
};
export const salesAppointments = {
  list: list<SalesAppointment>("sales_appointments", "starts_at", true),
  create: create<SalesAppointment>("sales_appointments"),
  update: update<SalesAppointment>("sales_appointments"),
  remove: remove("sales_appointments"),
};
export const salesFollowUps = {
  list: list<SalesFollowUp>("sales_follow_ups", "due_at", true),
  create: create<SalesFollowUp>("sales_follow_ups"),
  update: update<SalesFollowUp>("sales_follow_ups"),
  remove: remove("sales_follow_ups"),
};
export const opsProjects = {
  list: list<OpsProject>("ops_projects"),
  create: create<OpsProject>("ops_projects"),
  update: update<OpsProject>("ops_projects"),
  remove: remove("ops_projects"),
};
export const opsTasks = {
  list: list<OpsTask>("ops_tasks"),
  create: create<OpsTask>("ops_tasks"),
  update: update<OpsTask>("ops_tasks"),
  remove: remove("ops_tasks"),
};
export const opsDocuments = {
  list: list<OpsDocument>("ops_documents"),
  create: create<OpsDocument>("ops_documents"),
  update: update<OpsDocument>("ops_documents"),
  remove: remove("ops_documents"),
};

// ================= Dashboard aggregates =================
export async function dashboardStats() {
  const [leads, opps, quotes, projects, tasks, customers] = await Promise.all([
    db.from("sales_leads").select("id, status, score, created_at"),
    db.from("sales_opportunities").select("id, value, stage, probability"),
    db.from("sales_quotations").select("id, amount, status"),
    db.from("ops_projects").select("id, status, progress"),
    db.from("ops_tasks").select("id, status, due_at"),
    db.from("sales_customers").select("id"),
  ]);
  const oppsRows = (opps.data ?? []) as SalesOpportunity[];
  const quoteRows = (quotes.data ?? []) as SalesQuotation[];
  const leadRows = (leads.data ?? []) as SalesLead[];
  const projectRows = (projects.data ?? []) as OpsProject[];
  const taskRows = (tasks.data ?? []) as OpsTask[];
  const pipelineValue = oppsRows
    .filter((o) => !["won", "lost"].includes(o.stage))
    .reduce((sum, o) => sum + Number(o.value ?? 0), 0);
  const wonValue = oppsRows.filter((o) => o.stage === "won").reduce((s, o) => s + Number(o.value ?? 0), 0);
  const acceptedRevenue = quoteRows.filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.amount ?? 0), 0);
  const stages = ["prospect", "qualified", "proposal", "negotiation", "won"] as const;
  const pipelineByStage = stages.map((stage) => {
    const rows = oppsRows.filter((o) => o.stage === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((s, o) => s + Number(o.value ?? 0), 0),
    };
  });
  const now = Date.now();
  const overdueTasks = taskRows.filter(
    (t) => t.status !== "done" && t.due_at && new Date(t.due_at).getTime() < now,
  ).length;
  const newLeads = leadRows.filter((l) => {
    const created = new Date(l.created_at).getTime();
    return now - created < 7 * 24 * 60 * 60 * 1000;
  }).length;
  return {
    revenueMTD: wonValue + acceptedRevenue,
    newLeads,
    totalLeads: leadRows.length,
    pipelineValue,
    pipelineByStage,
    customers: (customers.data ?? []).length,
    activeProjects: projectRows.filter((p) => p.status !== "done" && p.status !== "archived").length,
    projectCount: projectRows.length,
    openTasks: taskRows.filter((t) => t.status !== "done").length,
    overdueTasks,
    quotesOpen: quoteRows.filter((q) => ["draft", "sent"].includes(q.status)).length,
  };
}
