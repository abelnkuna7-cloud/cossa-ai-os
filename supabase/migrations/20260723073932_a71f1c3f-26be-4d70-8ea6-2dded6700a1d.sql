
-- Shared updated_at trigger uses existing public.set_updated_at()

-- =========================== SALES ===========================
CREATE TABLE public.sales_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  website text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_companies TO anon, authenticated;
GRANT ALL ON public.sales_companies TO service_role;
ALTER TABLE public.sales_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies open (dev)" ON public.sales_companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_companies_updated BEFORE UPDATE ON public.sales_companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company_id uuid REFERENCES public.sales_companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_customers TO anon, authenticated;
GRANT ALL ON public.sales_customers TO service_role;
ALTER TABLE public.sales_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers open (dev)" ON public.sales_customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_customers_updated BEFORE UPDATE ON public.sales_customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  source text,
  status text NOT NULL DEFAULT 'new',
  score integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_leads TO anon, authenticated;
GRANT ALL ON public.sales_leads TO service_role;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads open (dev)" ON public.sales_leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_leads_updated BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  customer_id uuid REFERENCES public.sales_customers(id) ON DELETE SET NULL,
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'prospect',
  probability integer NOT NULL DEFAULT 20,
  expected_close date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_opportunities TO anon, authenticated;
GRANT ALL ON public.sales_opportunities TO service_role;
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities open (dev)" ON public.sales_opportunities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_opportunities_updated BEFORE UPDATE ON public.sales_opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  customer_id uuid REFERENCES public.sales_customers(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.sales_opportunities(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_quotations TO anon, authenticated;
GRANT ALL ON public.sales_quotations TO service_role;
ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotations open (dev)" ON public.sales_quotations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_quotations_updated BEFORE UPDATE ON public.sales_quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  customer_id uuid REFERENCES public.sales_customers(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_appointments TO anon, authenticated;
GRANT ALL ON public.sales_appointments TO service_role;
ALTER TABLE public.sales_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments open (dev)" ON public.sales_appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_appointments_updated BEFORE UPDATE ON public.sales_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  customer_id uuid REFERENCES public.sales_customers(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_follow_ups TO anon, authenticated;
GRANT ALL ON public.sales_follow_ups TO service_role;
ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_ups open (dev)" ON public.sales_follow_ups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_follow_ups_updated BEFORE UPDATE ON public.sales_follow_ups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================== OPERATIONS ===========================
CREATE TABLE public.ops_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_id uuid REFERENCES public.sales_customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planning',
  priority text NOT NULL DEFAULT 'medium',
  progress integer NOT NULL DEFAULT 0,
  start_date date,
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_projects TO anon, authenticated;
GRANT ALL ON public.ops_projects TO service_role;
ALTER TABLE public.ops_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects open (dev)" ON public.ops_projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ops_projects_updated BEFORE UPDATE ON public.ops_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  project_id uuid REFERENCES public.ops_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignee text,
  due_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_tasks TO anon, authenticated;
GRANT ALL ON public.ops_tasks TO service_role;
ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks open (dev)" ON public.ops_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ops_tasks_updated BEFORE UPDATE ON public.ops_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ops_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_documents TO anon, authenticated;
GRANT ALL ON public.ops_documents TO service_role;
ALTER TABLE public.ops_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents open (dev)" ON public.ops_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ops_documents_updated BEFORE UPDATE ON public.ops_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
