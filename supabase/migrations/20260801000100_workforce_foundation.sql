-- Cossa AI owned production foundation.
-- Adds organisation tenancy, AI workforce execution, approvals, evidence and
-- immutable audit records. Existing CRM/operations tables are intentionally
-- left unchanged in this migration so the current application keeps working
-- until authentication and record ownership are migrated together.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add only the fields the production OS needs but the current Growth schema
-- does not yet store. Existing rows and public website workflows are retained.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0
  CHECK (score BETWEEN 0 AND 100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS probability integer NOT NULL DEFAULT 20
  CHECK (probability BETWEEN 0 AND 100);
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS expected_close date;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trading_name text,
  registration_number text,
  tax_reference text,
  bbbee_level text,
  bbbee_recognition text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'planned', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, slug)
);

CREATE TABLE public.organisation_members (
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);

CREATE TABLE public.sales_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  name text NOT NULL,
  industry text,
  website text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_organisation_member(target_organisation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members member
    WHERE member.organisation_id = target_organisation_id
      AND member.user_id = auth.uid()
      AND member.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_organisation_role(target_organisation_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members member
    WHERE member.organisation_id = target_organisation_id
      AND member.user_id = auth.uid()
      AND member.status = 'active'
      AND member.role = ANY (allowed_roles)
  );
$$;

CREATE TABLE public.ai_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  employee_key text NOT NULL,
  name text NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  mission text NOT NULL,
  responsibilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prohibited_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_instructions text NOT NULL DEFAULT '',
  requires_approval_by_default boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, employee_key)
);

CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  assigned_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  parent_mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  title text NOT NULL,
  instruction text NOT NULL,
  objective text NOT NULL,
  target_market text,
  target_location text,
  target_service text,
  required_result_count integer CHECK (required_result_count IS NULL OR required_result_count > 0),
  constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  prohibited_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mission_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  model_provider text,
  model_name text,
  model_request_id text,
  knowledge_version_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error_code text,
  error_message text,
  prompt_tokens integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  estimated_cost numeric(14,6) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.mission_runs(id) ON DELETE SET NULL,
  from_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  to_employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  retained_record_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  requested_by_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'executed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_reason text,
  executed_at timestamptz,
  CHECK (mission_id IS NOT NULL OR run_id IS NOT NULL)
);

CREATE TABLE public.evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('url', 'document', 'database_record', 'user_input', 'system_result', 'other')),
  source_title text,
  source_url text,
  source_record_type text,
  source_record_id text,
  excerpt text,
  content_hash text,
  verified_status text NOT NULL DEFAULT 'unverified' CHECK (verified_status IN ('unverified', 'verified', 'rejected', 'expired')),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'ai_employee', 'system', 'integration')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  request_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Internal Cossa AI data. These tables are intentionally separate from the
-- public website's chatbot_conversations/chatbot_messages tables.
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New conversation',
  category text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content text NOT NULL,
  run_id uuid REFERENCES public.mission_runs(id) ON DELETE SET NULL,
  evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  source text,
  source_url text,
  confidentiality text NOT NULL DEFAULT 'internal' CHECK (confidentiality IN ('public', 'internal', 'confidential', 'restricted')),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'expired')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  effective_at timestamptz,
  review_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  subject text NOT NULL,
  channel text CHECK (channel IS NULL OR channel IN ('phone', 'email', 'whatsapp', 'sms', 'meeting', 'other')),
  due_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'skipped')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(subject) > 0)
);

CREATE TABLE public.ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'blocked', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  assignee text,
  due_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ops_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  nexdocs_document_id text,
  title text NOT NULL,
  category text,
  storage_path text,
  source_url text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'issued', 'archived')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_units_organisation ON public.business_units(organisation_id);
CREATE INDEX idx_sales_companies_organisation ON public.sales_companies(organisation_id, name);
CREATE INDEX idx_ai_employees_organisation ON public.ai_employees(organisation_id, status);
CREATE INDEX idx_missions_organisation_status ON public.missions(organisation_id, status, created_at DESC);
CREATE INDEX idx_mission_runs_mission ON public.mission_runs(mission_id, created_at DESC);
CREATE INDEX idx_handoffs_mission ON public.employee_handoffs(mission_id, created_at DESC);
CREATE INDEX idx_approvals_pending ON public.approvals(organisation_id, status, requested_at DESC);
CREATE INDEX idx_evidence_run ON public.evidence_records(run_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_events(organisation_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_request ON public.audit_events(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_ai_conversations_owner ON public.ai_conversations(organisation_id, user_id, updated_at DESC);
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_prompts_organisation ON public.ai_prompts(organisation_id, status, updated_at DESC);
CREATE INDEX idx_ai_knowledge_organisation ON public.ai_knowledge_documents(organisation_id, verification_status, updated_at DESC);
CREATE INDEX idx_sales_follow_ups_due ON public.sales_follow_ups(organisation_id, status, due_at);
CREATE INDEX idx_ops_tasks_due ON public.ops_tasks(organisation_id, status, due_at);
CREATE INDEX idx_ops_documents_project ON public.ops_documents(organisation_id, project_id, created_at DESC);

-- The official Cossa group is seeded so imported Base44 records have a stable
-- owned destination. Membership is created only after a real Supabase user is
-- authenticated; no guessed user IDs or public ownership shortcuts are used.
INSERT INTO public.organisations (
  id, legal_name, trading_name, registration_number, tax_reference, bbbee_level, bbbee_recognition
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Cossa Nexus Holdings (Pty) Ltd',
  'Cossa Nexus Holdings',
  'K2026504313',
  '9466437234',
  'Level 1',
  '135%'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_units (organisation_id, name, slug, status) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Cossa Nexus Construction', 'cossa-nexus-construction', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa Facility Services', 'cossa-facility-services', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa Store', 'cossa-store', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa Tech', 'cossa-tech', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa Logistics', 'cossa-logistics', 'planned'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa Cuisine', 'cossa-cuisine', 'planned'),
  ('00000000-0000-4000-8000-000000000001', 'NexDocs', 'nexdocs', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Cossa AI', 'cossa-ai', 'active')
ON CONFLICT (organisation_id, slug) DO NOTHING;

-- Bind the verified Cossa company login to the seeded organisation. The query
-- resolves the existing Supabase Auth UUID at migration time rather than
-- hard-coding or guessing an identity value.
INSERT INTO public.organisation_members (organisation_id, user_id, role, status)
SELECT
  '00000000-0000-4000-8000-000000000001',
  auth_user.id,
  'owner',
  'active'
FROM auth.users AS auth_user
WHERE lower(auth_user.email) = 'cossa@cossanexusholdings.co.za'
ON CONFLICT (organisation_id, user_id)
DO UPDATE SET role = 'owner', status = 'active', updated_at = now();

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read organisations" ON public.organisations
  FOR SELECT TO authenticated USING (public.is_organisation_member(id));
CREATE POLICY "owners manage organisations" ON public.organisations
  FOR UPDATE TO authenticated USING (public.has_organisation_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_organisation_role(id, ARRAY['owner', 'admin']));

CREATE POLICY "members read business units" ON public.business_units
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "admins manage business units" ON public.business_units
  FOR ALL TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "members read own membership" ON public.organisation_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_organisation_role(organisation_id, ARRAY['owner', 'admin']));
CREATE POLICY "admins manage members" ON public.organisation_members
  FOR ALL TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "members manage sales companies" ON public.sales_companies
  FOR ALL TO authenticated
  USING (public.is_organisation_member(organisation_id))
  WITH CHECK (public.is_organisation_member(organisation_id));

CREATE POLICY "members read employees" ON public.ai_employees
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "managers manage employees" ON public.ai_employees
  FOR ALL TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read missions" ON public.missions
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "members create missions" ON public.missions
  FOR INSERT TO authenticated WITH CHECK (public.is_organisation_member(organisation_id) AND created_by = auth.uid());
CREATE POLICY "managers update missions" ON public.missions
  FOR UPDATE TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read mission runs" ON public.mission_runs
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "managers manage mission runs" ON public.mission_runs
  FOR ALL TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read handoffs" ON public.employee_handoffs
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "managers manage handoffs" ON public.employee_handoffs
  FOR ALL TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read approvals" ON public.approvals
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "members request approvals" ON public.approvals
  FOR INSERT TO authenticated WITH CHECK (public.is_organisation_member(organisation_id) AND status = 'pending');
CREATE POLICY "managers decide approvals" ON public.approvals
  FOR UPDATE TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read evidence" ON public.evidence_records
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "members add evidence" ON public.evidence_records
  FOR INSERT TO authenticated WITH CHECK (public.is_organisation_member(organisation_id));
CREATE POLICY "managers verify evidence" ON public.evidence_records
  FOR UPDATE TO authenticated USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "members read audit" ON public.audit_events
  FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id));
CREATE POLICY "members append audit" ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (public.is_organisation_member(organisation_id));

CREATE POLICY "users manage own conversations" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (public.is_organisation_member(organisation_id) AND user_id = auth.uid())
  WITH CHECK (public.is_organisation_member(organisation_id) AND user_id = auth.uid());
CREATE POLICY "users manage conversation messages" ON public.ai_messages
  FOR ALL TO authenticated
  USING (
    public.is_organisation_member(organisation_id)
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations conversation
      WHERE conversation.id = conversation_id AND conversation.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_organisation_member(organisation_id)
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations conversation
      WHERE conversation.id = conversation_id AND conversation.user_id = auth.uid()
    )
  );
CREATE POLICY "members read approved prompts" ON public.ai_prompts
  FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY "managers manage prompts" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));
CREATE POLICY "members read knowledge" ON public.ai_knowledge_documents
  FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY "managers manage knowledge" ON public.ai_knowledge_documents
  FOR ALL TO authenticated
  USING (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']));
CREATE POLICY "members manage follow ups" ON public.sales_follow_ups
  FOR ALL TO authenticated
  USING (public.is_organisation_member(organisation_id))
  WITH CHECK (public.is_organisation_member(organisation_id));
CREATE POLICY "members manage tasks" ON public.ops_tasks
  FOR ALL TO authenticated
  USING (public.is_organisation_member(organisation_id))
  WITH CHECK (public.is_organisation_member(organisation_id));
CREATE POLICY "members manage document records" ON public.ops_documents
  FOR ALL TO authenticated
  USING (public.is_organisation_member(organisation_id))
  WITH CHECK (public.is_organisation_member(organisation_id));

-- Audit records are append-only, including for authenticated application users.
REVOKE UPDATE, DELETE ON public.audit_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_handoffs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_records TO authenticated;
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_follow_ups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_documents TO authenticated;
GRANT ALL ON public.organisations, public.business_units, public.organisation_members, public.sales_companies,
  public.ai_employees, public.missions, public.mission_runs, public.employee_handoffs,
  public.approvals, public.evidence_records, public.audit_events, public.ai_conversations,
  public.ai_messages, public.ai_prompts, public.ai_knowledge_documents,
  public.sales_follow_ups, public.ops_tasks, public.ops_documents TO service_role;
