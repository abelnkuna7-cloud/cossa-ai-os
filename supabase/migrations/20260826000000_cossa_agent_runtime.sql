-- Durable Cossa agent runtime.
--
-- This extends the existing Workforce foundation. It does not replace Growth,
-- Store, NexDocs, CRM, payments, POD, affiliate data, or existing employees.
-- Provider credentials are deliberately absent from this schema: they belong in
-- protected server/worker secrets only.

BEGIN;

CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  agent_key text NOT NULL,
  name text NOT NULL,
  purpose text NOT NULL,
  system_instructions text NOT NULL DEFAULT '',
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, agent_key),
  UNIQUE (id, organisation_id),
  FOREIGN KEY (employee_id, organisation_id)
    REFERENCES public.ai_employees(id, organisation_id) ON DELETE RESTRICT
);

CREATE TABLE public.agent_tool_adapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tool_key text NOT NULL,
  name text NOT NULL,
  provider text NOT NULL,
  capability text NOT NULL,
  connection_state text NOT NULL DEFAULT 'prepared'
    CHECK (connection_state IN ('disabled', 'prepared', 'connected', 'degraded')),
  risk_level text NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_approval boolean NOT NULL DEFAULT false,
  secret_environment_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, tool_key),
  UNIQUE (id, organisation_id)
);

CREATE TABLE public.agent_permission_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  agent_id uuid,
  action_key text NOT NULL,
  permission_class text NOT NULL CHECK (permission_class IN (
    'READ', 'SEARCH', 'ANALYZE', 'DRAFT', 'WRITE_INTERNAL', 'WRITE_EXTERNAL',
    'SEND', 'PUBLISH', 'DELETE', 'DEPLOY', 'FINANCIAL', 'PAYMENT',
    'DNS_CHANGE', 'SECURITY_CHANGE', 'PRODUCTION_CHANGE'
  )),
  decision text NOT NULL CHECK (decision IN ('allow', 'require_approval', 'deny')),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  rationale text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, agent_id, action_key),
  FOREIGN KEY (agent_id, organisation_id)
    REFERENCES public.ai_agents(id, organisation_id) ON DELETE CASCADE
);

CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  mission_id uuid,
  run_id uuid,
  agent_id uuid,
  parent_task_id uuid REFERENCES public.agent_tasks(id) ON DELETE RESTRICT,
  depends_on_task_id uuid REFERENCES public.agent_tasks(id) ON DELETE RESTRICT,
  approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  action_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'retry_scheduled', 'blocked_approval', 'completed', 'failed', 'cancelled')),
  priority integer NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error_code text,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  run_after timestamptz NOT NULL DEFAULT now(),
  leased_by uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, idempotency_key),
  FOREIGN KEY (mission_id, organisation_id)
    REFERENCES public.missions(id, organisation_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, organisation_id)
    REFERENCES public.mission_runs(id, organisation_id) ON DELETE SET NULL,
  FOREIGN KEY (agent_id, organisation_id)
    REFERENCES public.ai_agents(id, organisation_id) ON DELETE RESTRICT
);

CREATE TABLE public.agent_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'schedule', 'event')),
  status text NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'retired')),
  interval_minutes integer CHECK (interval_minutes IS NULL OR interval_minutes BETWEEN 5 AND 10080),
  next_run_at timestamptz,
  last_fired_at timestamptz,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (trigger_type <> 'schedule')
    OR (interval_minutes IS NOT NULL AND next_run_at IS NOT NULL)
  ),
  FOREIGN KEY (employee_id, organisation_id)
    REFERENCES public.ai_employees(id, organisation_id) ON DELETE RESTRICT,
  FOREIGN KEY (agent_id, organisation_id)
    REFERENCES public.ai_agents(id, organisation_id) ON DELETE RESTRICT
);

CREATE TABLE public.agent_circuit_breakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  component_type text NOT NULL CHECK (component_type IN ('provider', 'tool')),
  component_key text NOT NULL,
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  opened_at timestamptz,
  open_until timestamptz,
  last_error_code text,
  last_error_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, component_type, component_key)
);

CREATE TABLE public.agent_execution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.mission_runs(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error')),
  request_id text,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_tasks_claim_idx
  ON public.agent_tasks (organisation_id, status, run_after, priority DESC, created_at)
  WHERE status IN ('queued', 'retry_scheduled', 'running');
CREATE INDEX agent_tasks_dependency_idx ON public.agent_tasks (depends_on_task_id);
CREATE INDEX agent_tasks_mission_idx ON public.agent_tasks (organisation_id, mission_id, created_at DESC);
CREATE UNIQUE INDEX agent_permission_policies_scope_action_idx
  ON public.agent_permission_policies (
    organisation_id,
    COALESCE(agent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    action_key
  );
CREATE INDEX agent_triggers_due_idx
  ON public.agent_triggers (organisation_id, next_run_at)
  WHERE status = 'active';
CREATE INDEX agent_execution_events_mission_idx
  ON public.agent_execution_events (organisation_id, mission_id, created_at DESC);
CREATE INDEX agent_execution_events_task_idx
  ON public.agent_execution_events (task_id, created_at DESC);

-- A source identity makes CRM persistence idempotent even if a worker dies
-- after the insert but before it can mark the durable task as complete.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS cossa_source_identity text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_organisation_cossa_source_identity_key
  ON public.leads (organisation_id, cossa_source_identity);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER set_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_agent_tool_adapters_updated_at BEFORE UPDATE ON public.agent_tool_adapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_agent_permission_policies_updated_at BEFORE UPDATE ON public.agent_permission_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_agent_tasks_updated_at BEFORE UPDATE ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_agent_triggers_updated_at BEFORE UPDATE ON public.agent_triggers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.reject_agent_execution_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Agent execution events are immutable';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_agent_execution_event_mutation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER protect_agent_execution_events
  BEFORE UPDATE OR DELETE ON public.agent_execution_events
  FOR EACH ROW EXECUTE FUNCTION private.reject_agent_execution_event_mutation();

-- Claim a small batch atomically. A task can be reclaimed only after its lease
-- expires, which prevents two hosted workers from executing the same task.
CREATE OR REPLACE FUNCTION public.claim_agent_tasks(
  p_organisation_id uuid,
  p_worker_id uuid,
  p_limit integer DEFAULT 4,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF public.agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_organisation_id IS NULL OR p_worker_id IS NULL OR p_limit < 1 OR p_limit > 20 OR p_lease_seconds < 30 OR p_lease_seconds > 1800 THEN
    RAISE EXCEPTION 'Invalid agent task claim parameters';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT task.id
    FROM public.agent_tasks AS task
    LEFT JOIN public.agent_tasks AS dependency ON dependency.id = task.depends_on_task_id
    LEFT JOIN public.approvals AS approval ON approval.id = task.approval_id
    WHERE (
      (task.status IN ('queued', 'retry_scheduled') AND task.run_after <= now())
      OR (task.status = 'running' AND task.lease_expires_at IS NOT NULL AND task.lease_expires_at < now())
    )
      AND task.organisation_id = p_organisation_id
      AND task.attempt_count < task.max_attempts
      AND (task.depends_on_task_id IS NULL OR dependency.status = 'completed')
      AND (task.approval_id IS NULL OR approval.status = 'approved')
    ORDER BY task.priority DESC, task.run_after ASC, task.created_at ASC
    FOR UPDATE OF task SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.agent_tasks AS task
    SET
      status = 'running',
      attempt_count = task.attempt_count + 1,
      leased_by = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = COALESCE(task.started_at, now()),
      error_code = NULL,
      error_message = NULL,
      updated_at = now()
    FROM eligible
    WHERE task.id = eligible.id
    RETURNING task.*
  )
  SELECT * FROM claimed;
END;
$$;

-- Promote approved tasks without trusting a browser to write task state.
CREATE OR REPLACE FUNCTION public.reactivate_approved_agent_tasks(p_organisation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_count integer;
BEGIN
  IF p_organisation_id IS NULL THEN
    RAISE EXCEPTION 'Organisation is required';
  END IF;

  UPDATE public.agent_tasks AS task
  SET
    status = 'queued',
    run_after = now(),
    lease_token = NULL,
    lease_expires_at = NULL,
    updated_at = now()
  FROM public.approvals AS approval
  WHERE task.approval_id = approval.id
    AND task.organisation_id = p_organisation_id
    AND task.status = 'blocked_approval'
    AND approval.status = 'approved';

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END;
$$;

-- A scheduled trigger only adds a durable queue item. The runtime later creates
-- the mission through the normal server validation path, keeping schedules from
-- directly sending messages or modifying external systems.
CREATE OR REPLACE FUNCTION public.enqueue_due_agent_triggers(
  p_organisation_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS SETOF public.agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_organisation_id IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Invalid trigger batch size';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT trigger.id, trigger.organisation_id, trigger.agent_id, trigger.configuration, trigger.name
    FROM public.agent_triggers AS trigger
    WHERE trigger.organisation_id = p_organisation_id
      AND trigger.status = 'active'
      AND trigger.trigger_type = 'schedule'
      AND trigger.next_run_at <= now()
    ORDER BY trigger.next_run_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), advanced AS (
    UPDATE public.agent_triggers AS trigger
    SET
      last_fired_at = now(),
      next_run_at = now() + make_interval(mins => trigger.interval_minutes),
      updated_at = now()
    FROM due
    WHERE trigger.id = due.id
    RETURNING trigger.id, trigger.organisation_id, trigger.agent_id, trigger.configuration, trigger.name, trigger.last_fired_at
  ), created AS (
    INSERT INTO public.agent_tasks (
      organisation_id,
      agent_id,
      task_type,
      action_key,
      priority,
      payload,
      idempotency_key
    )
    SELECT
      advanced.organisation_id,
      advanced.agent_id,
      'scheduled_lead_hunter_trigger',
      'trigger_lead_hunter',
      35,
      jsonb_build_object('trigger_id', advanced.id, 'trigger_name', advanced.name, 'configuration', advanced.configuration),
      format('trigger:%s:%s', advanced.id, extract(epoch FROM advanced.last_fired_at)::bigint)
    FROM advanced
    ON CONFLICT (organisation_id, idempotency_key) DO NOTHING
    RETURNING *
  )
  SELECT * FROM created;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_agent_tasks(uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reactivate_approved_agent_tasks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_due_agent_triggers(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_tasks(uuid, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_approved_agent_tasks(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_due_agent_triggers(uuid, integer) TO service_role;

-- Seed the operating model without overwriting an existing Cossa choice.
INSERT INTO public.ai_employees (
  organisation_id, employee_key, name, title, department, mission,
  responsibilities, kpis, capabilities, allowed_actions, prohibited_actions,
  system_instructions, requires_approval_by_default, status
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'cossa-orchestrator',
  'Cossa Orchestrator',
  'Cossa AI Orchestrator',
  'Cossa AI Workforce',
  'Route missions to the right employee and specialist agent, enforce permissions and approvals, and retain an auditable execution trail.',
  '["Select the correct employee and specialist agent", "Apply permission and approval policy", "Route safe tasks through durable workers", "Escalate high-risk actions", "Report exceptions and evidence"]'::jsonb,
  '["No unapproved external actions", "Every task traceable to a mission", "Provider failures fail over or are recorded", "No secret exposure"]'::jsonb,
  '["mission routing", "permission evaluation", "approval orchestration", "provider routing", "tool routing", "task recovery"]'::jsonb,
  '["create internal tasks", "route safe research", "request owner approval", "record audit events"]'::jsonb,
  '["send external communication without approval", "make payments", "change banking", "change DNS", "deploy production", "delete production data"]'::jsonb,
  'You are the Cossa Orchestrator. Delegate work to the correct specialist agent. Preserve evidence and stable Cossa record IDs. Never treat a draft as a sent action and never bypass approval rules.',
  true,
  'active'
)
ON CONFLICT (organisation_id, employee_key) DO NOTHING;

-- This function may be called after an organisation activates its existing
-- Workforce profiles, so the runtime does not depend on migration timing.
CREATE OR REPLACE FUNCTION public.install_cossa_agent_runtime_profiles(p_organisation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.ai_agents (
    organisation_id, employee_id, agent_key, name, purpose, system_instructions,
    capabilities, allowed_tools, model_policy, status
  )
  SELECT
    employee.organisation_id,
    employee.id,
    seed.agent_key,
    seed.name,
    seed.purpose,
    seed.system_instructions,
    seed.capabilities::jsonb,
    seed.allowed_tools::jsonb,
    seed.model_policy::jsonb,
    'active'
  FROM public.ai_employees AS employee
  JOIN (
    VALUES
      ('cossa-orchestrator', 'cossa-orchestrator-agent', 'Cossa Orchestrator Agent', 'Plans and supervises safe multi-agent missions.', 'Delegate safely and preserve approval boundaries.', '["mission_planning", "task_routing", "risk_evaluation"]', '["cossa-lead-hunter"]', '{"provider_order":["groq","openai","gemini"]}'),
      ('lead-hunter', 'lead-research-agent', 'Lead Research Agent', 'Runs the existing Cossa evidence-validated Lead Hunter engine.', 'Use only the authorised Lead Hunter search route. Never invent a prospect.', '["public_research", "evidence_validation"]', '["cossa-lead-hunter","firecrawl"]', '{"provider_order":[]}'),
      ('lead-intake-coordinator', 'lead-enrichment-agent', 'Lead Enrichment Agent', 'Adds permitted public enrichment and preserves source evidence.', 'Use public evidence only. Do not contact anyone.', '["contact_enrichment", "source_preservation"]', '["hunter","firecrawl"]', '{"provider_order":[]}'),
      ('sales-conversion-specialist', 'lead-qualification-agent', 'Lead Qualification Agent', 'Produces source-labelled commercial qualification summaries.', 'Do not invent need, budget, consent or buying intent.', '["lead_qualification", "commercial_scoring"]', '["cossa-lead-hunter"]', '{"provider_order":["groq","openai","gemini"]}'),
      ('lead-intake-coordinator', 'crm-safe-save-agent', 'CRM Safe Save Agent', 'Saves only verified, deduplicated prospects into the existing Growth CRM.', 'Never create a duplicate or overwrite an existing CRM record.', '["crm_deduplication", "crm_save"]', '["cossa-crm"]', '{"provider_order":[]}'),
      ('sales-conversion-specialist', 'outreach-draft-agent', 'Outreach Drafting Agent', 'Creates reviewable outreach drafts from verified prospect evidence.', 'Draft only. Never send an email, WhatsApp, message or proposal.', '["outreach_drafting", "sales_preparation"]', '["composio","agentmail"]', '{"provider_order":["groq","openai","gemini"]}')
  ) AS seed(employee_key, agent_key, name, purpose, system_instructions, capabilities, allowed_tools, model_policy)
    ON employee.organisation_id = p_organisation_id
   AND employee.employee_key = seed.employee_key
  ON CONFLICT (organisation_id, agent_key) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.install_cossa_agent_runtime_profiles(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.install_cossa_agent_runtime_profiles(uuid) TO service_role;

SELECT public.install_cossa_agent_runtime_profiles('00000000-0000-4000-8000-000000000001');

INSERT INTO public.agent_tool_adapters (
  organisation_id, tool_key, name, provider, capability, connection_state,
  risk_level, requires_approval, secret_environment_keys, configuration
)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'cossa-lead-hunter', 'Cossa Lead Hunter', 'Cossa Growth', 'Evidence-validated public prospect research', 'prepared', 'medium', false, '["AGENT_RUNTIME_WORKER_TOKEN","SUPABASE_SERVICE_ROLE_KEY"]'::jsonb, '{"route":"/api/lead-hunter/search","sends_external_messages":false}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'cossa-crm', 'Cossa Growth CRM', 'Cossa Growth', 'Duplicate-protected verified lead save', 'prepared', 'medium', false, '[]'::jsonb, '{"mode":"verified_leads_only","sends_external_messages":false}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'firecrawl', 'Firecrawl', 'Firecrawl', 'Web search, crawl and page extraction', 'prepared', 'medium', false, '["FIRECRAWL_API_KEY"]'::jsonb, '{"mode":"read_only_until_approved"}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'hunter', 'Hunter', 'Hunter.io', 'Company and professional contact enrichment', 'prepared', 'medium', false, '["HUNTER_API_KEY"]'::jsonb, '{"mode":"research_only"}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'composio', 'Composio', 'Composio', 'OAuth-connected business application actions', 'prepared', 'high', true, '["COMPOSIO_API_KEY"]'::jsonb, '{"default":"approval_required"}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'e2b', 'E2B', 'E2B', 'Isolated code and data sandbox', 'prepared', 'medium', false, '["E2B_API_KEY"]'::jsonb, '{"production_access":false}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'browserbase', 'Browserbase', 'Browserbase', 'Controlled cloud browser automation', 'prepared', 'high', true, '["BROWSERBASE_API_KEY","BROWSERBASE_PROJECT_ID"]'::jsonb, '{"default":"read_only_and_approval_gated"}'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'agentmail', 'AgentMail', 'AgentMail', 'Dedicated agent mailboxes', 'disabled', 'critical', true, '["AGENTMAIL_API_KEY"]'::jsonb, '{"activation":"after_email_migration_and_owner_approval"}'::jsonb)
ON CONFLICT (organisation_id, tool_key) DO NOTHING;

INSERT INTO public.agent_permission_policies (
  organisation_id, agent_id, action_key, permission_class, decision, risk_level, rationale
)
VALUES
  ('00000000-0000-4000-8000-000000000001', NULL, 'trigger_lead_hunter', 'SEARCH', 'allow', 'medium', 'A schedule may queue the same safe Lead Hunter workflow, but never send outreach.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'research_public_web', 'SEARCH', 'allow', 'low', 'Public research is allowed when it respects source and rate limits.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'enrich_public_contact', 'SEARCH', 'allow', 'medium', 'Use only lawful public business information and retain source evidence.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'qualify_lead', 'ANALYZE', 'allow', 'low', 'Internal qualification is safe when it remains evidence-labelled.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'save_verified_crm_lead', 'WRITE_INTERNAL', 'allow', 'medium', 'Only verified prospects pass existing duplicate checks into the existing CRM.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'draft_outreach', 'DRAFT', 'allow', 'medium', 'Drafting is internal and must never claim that a message was sent.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'send_external_message', 'SEND', 'require_approval', 'high', 'Every customer, prospect, supplier or public message requires an explicit approval record.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'publish_external_content', 'PUBLISH', 'require_approval', 'high', 'Publishing must remain owner-controlled until separately promoted.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'production_deploy', 'DEPLOY', 'require_approval', 'critical', 'Production deployments require explicit owner approval.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'dns_change', 'DNS_CHANGE', 'require_approval', 'critical', 'DNS changes require explicit owner approval.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'payment_execute', 'PAYMENT', 'require_approval', 'critical', 'Payments are never autonomous.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'banking_change', 'FINANCIAL', 'deny', 'critical', 'Banking changes are prohibited for agents.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'delete_production_data', 'DELETE', 'deny', 'critical', 'Destructive production data actions are prohibited for agents.')
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_triggers (
  organisation_id, employee_id, agent_id, name, trigger_type, status,
  interval_minutes, next_run_at, configuration
)
SELECT
  employee.organisation_id,
  employee.id,
  agent.id,
  'Lead Hunter scheduled research',
  'schedule',
  'paused',
  1440,
  now() + interval '1 day',
  '{"objective":"Find evidence-backed revenue opportunities.","targetCompany":"cossa_facility_services","targetService":"commercial_cleaning","targetLocation":"Gauteng","resultCount":10}'::jsonb
FROM public.ai_employees AS employee
JOIN public.ai_agents AS agent
  ON agent.organisation_id = employee.organisation_id
 AND agent.agent_key = 'cossa-orchestrator-agent'
WHERE employee.organisation_id = '00000000-0000-4000-8000-000000000001'
  AND employee.employee_key = 'cossa-orchestrator'
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_triggers AS existing
    WHERE existing.organisation_id = employee.organisation_id
      AND existing.name = 'Lead Hunter scheduled research'
  );

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_permission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read agents" ON public.ai_agents
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "managers manage agents" ON public.ai_agents
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );

CREATE POLICY "members read agent tool adapters" ON public.agent_tool_adapters
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "managers manage agent tool adapters" ON public.agent_tool_adapters
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );

CREATE POLICY "members read agent permissions" ON public.agent_permission_policies
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "owners manage agent permissions" ON public.agent_permission_policies
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin'])) );

CREATE POLICY "members read agent tasks" ON public.agent_tasks
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "members read agent triggers" ON public.agent_triggers
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "managers manage agent triggers" ON public.agent_triggers
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );
CREATE POLICY "members read agent circuits" ON public.agent_circuit_breakers
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "members read agent execution events" ON public.agent_execution_events
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));

-- Browser clients may inspect their organisation's runtime state, but may not
-- mutate task leases, policies, agents, adapter configuration, circuits or
-- audit records directly. All privileged changes go through authenticated
-- server routes using the service role after role and approval checks.
DROP POLICY IF EXISTS "managers manage agents" ON public.ai_agents;
DROP POLICY IF EXISTS "managers manage agent tool adapters" ON public.agent_tool_adapters;
DROP POLICY IF EXISTS "owners manage agent permissions" ON public.agent_permission_policies;
DROP POLICY IF EXISTS "managers manage agent triggers" ON public.agent_triggers;

REVOKE ALL ON TABLE public.ai_agents, public.agent_tool_adapters,
  public.agent_permission_policies, public.agent_tasks, public.agent_triggers,
  public.agent_circuit_breakers, public.agent_execution_events
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.ai_agents, public.agent_tool_adapters, public.agent_permission_policies,
  public.agent_tasks, public.agent_triggers, public.agent_circuit_breakers,
  public.agent_execution_events TO authenticated;

COMMIT;
