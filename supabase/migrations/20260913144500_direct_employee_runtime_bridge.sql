-- Bridge direct employee missions into the existing durable agent runtime.
--
-- Safety properties:
-- - additive only; no existing mission/workforce records are rewritten
-- - every normal employee gets a dedicated internal runtime agent
-- - Lead Hunter is NEVER routed through the generic language-model executor
-- - duplicate queue insertion is prevented by the existing
--   (organisation_id, idempotency_key) uniqueness guarantee
-- - generic direct assignments are claimed by a dedicated handler inside the
--   same hosted runtime tick, while all existing agent_tasks continue through
--   the established claim_agent_tasks path
-- - no SEND/PUBLISH/PAYMENT/DEPLOY/DNS/SECURITY permission is granted here

BEGIN;

CREATE OR REPLACE FUNCTION private.ensure_direct_employee_runtime_agent(
  p_employee_id uuid,
  p_organisation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  employee public.ai_employees%ROWTYPE;
  runtime_agent_id uuid;
  runtime_agent_key text;
BEGIN
  SELECT *
  INTO employee
  FROM public.ai_employees
  WHERE id = p_employee_id
    AND organisation_id = p_organisation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Direct employee runtime cannot resolve employee %', p_employee_id;
  END IF;

  IF employee.status <> 'active' THEN
    RAISE EXCEPTION 'Direct employee runtime requires an active employee';
  END IF;

  -- Lead Hunter must stay on the evidence engine and its specialist pipeline.
  IF employee.employee_key = 'lead-hunter' THEN
    RETURN NULL;
  END IF;

  runtime_agent_key := 'employee-runtime-' || employee.employee_key;

  INSERT INTO public.ai_agents (
    organisation_id,
    employee_id,
    agent_key,
    name,
    purpose,
    system_instructions,
    capabilities,
    allowed_tools,
    model_policy,
    status
  )
  VALUES (
    employee.organisation_id,
    employee.id,
    runtime_agent_key,
    employee.name || ' Runtime Agent',
    'Execute safe internal direct assignments for ' || employee.name || ' using the recorded employee profile and Cossa approval boundaries.',
    employee.system_instructions,
    COALESCE(employee.capabilities, '[]'::jsonb),
    '[]'::jsonb,
    jsonb_build_object(
      'mode', 'internal_only',
      'external_actions_enabled', false,
      'lead_hunter_generic_execution_allowed', false
    ),
    'active'
  )
  ON CONFLICT (organisation_id, agent_key)
  DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    name = EXCLUDED.name,
    purpose = EXCLUDED.purpose,
    system_instructions = EXCLUDED.system_instructions,
    capabilities = EXCLUDED.capabilities,
    model_policy = EXCLUDED.model_policy,
    status = CASE
      WHEN public.ai_agents.status = 'retired' THEN public.ai_agents.status
      ELSE EXCLUDED.status
    END,
    updated_at = now()
  RETURNING id INTO runtime_agent_id;

  INSERT INTO public.agent_permission_policies (
    organisation_id,
    agent_id,
    action_key,
    permission_class,
    decision,
    risk_level,
    rationale,
    enabled
  )
  VALUES (
    employee.organisation_id,
    runtime_agent_id,
    'direct_employee_internal',
    'WRITE_INTERNAL',
    'allow',
    'low',
    'Direct employee assignments may produce internal reviewable work only. External sending, publishing, financial, deployment, DNS and security actions remain unavailable.',
    true
  )
  ON CONFLICT (organisation_id, agent_id, action_key)
  DO UPDATE SET
    permission_class = EXCLUDED.permission_class,
    decision = EXCLUDED.decision,
    risk_level = EXCLUDED.risk_level,
    rationale = EXCLUDED.rationale,
    enabled = true,
    updated_at = now();

  RETURN runtime_agent_id;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_direct_employee_runtime_agent(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- Backfill one safe internal runtime agent for every active employee except
-- Lead Hunter. Existing specialist agents are not replaced.
DO $$
DECLARE
  employee_record record;
BEGIN
  FOR employee_record IN
    SELECT id, organisation_id
    FROM public.ai_employees
    WHERE status = 'active'
      AND employee_key <> 'lead-hunter'
  LOOP
    PERFORM private.ensure_direct_employee_runtime_agent(
      employee_record.id,
      employee_record.organisation_id
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.keep_direct_employee_runtime_agent_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.employee_key <> 'lead-hunter' THEN
    PERFORM private.ensure_direct_employee_runtime_agent(NEW.id, NEW.organisation_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.keep_direct_employee_runtime_agent_ready()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS keep_direct_employee_runtime_agent_ready ON public.ai_employees;
CREATE TRIGGER keep_direct_employee_runtime_agent_ready
  AFTER INSERT OR UPDATE OF status, employee_key, system_instructions, capabilities
  ON public.ai_employees
  FOR EACH ROW
  EXECUTE FUNCTION private.keep_direct_employee_runtime_agent_ready();

CREATE OR REPLACE FUNCTION private.bridge_direct_employee_mission_to_runtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  employee public.ai_employees%ROWTYPE;
  generic_agent_id uuid;
  handoff_id uuid;
  stage_agent_ids uuid[];
  stage_task_ids uuid[];
  company_key text;
  service_key text;
  location_value text;
BEGIN
  IF NEW.status <> 'queued'
     OR COALESCE(NEW.output_schema->>'assignment_mode', '') <> 'direct_employee'
     OR NEW.assigned_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO employee
  FROM public.ai_employees
  WHERE id = NEW.assigned_employee_id
    AND organisation_id = NEW.organisation_id;

  IF NOT FOUND OR employee.status <> 'active' THEN
    RAISE EXCEPTION 'Direct employee runtime requires an active assigned employee';
  END IF;

  SELECT id INTO handoff_id
  FROM public.employee_handoffs
  WHERE organisation_id = NEW.organisation_id
    AND mission_id = NEW.id
    AND to_employee_id = NEW.assigned_employee_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF handoff_id IS NULL THEN
    RAISE EXCEPTION 'Direct employee mission % has no pending handoff', NEW.id;
  END IF;

  IF employee.employee_key = 'lead-hunter' THEN
    -- The generic direct executor is intentionally forbidden for Lead Hunter.
    -- Structured Lead Hunter assignments are mapped into the established
    -- evidence-first six-stage pipeline while preserving the original mission.
    company_key := COALESCE(NULLIF(NEW.target_market, ''), '');
    service_key := COALESCE(NULLIF(NEW.target_service, ''), '');
    location_value := COALESCE(NULLIF(NEW.target_location, ''), '');

    IF company_key NOT IN (
      'cossa_nexus_construction', 'cossa_facility_services', 'cossa_tech',
      'cossa_ai_growth', 'nexdocs', 'cossa_store', 'cossa_nexus_holdings'
    ) OR service_key = '' OR location_value = '' THEN
      RAISE EXCEPTION 'Lead Hunter direct assignments require a valid Cossa business in target_market plus target_service and target_location so the verified evidence engine can run safely';
    END IF;

    SELECT ARRAY[
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'cossa-orchestrator-agent' AND status = 'active' LIMIT 1),
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'lead-research-agent' AND status = 'active' LIMIT 1),
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'lead-enrichment-agent' AND status = 'active' LIMIT 1),
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'lead-qualification-agent' AND status = 'active' LIMIT 1),
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'crm-safe-save-agent' AND status = 'active' LIMIT 1),
      (SELECT id FROM public.ai_agents WHERE organisation_id = NEW.organisation_id AND agent_key = 'outreach-draft-agent' AND status = 'active' LIMIT 1)
    ] INTO stage_agent_ids;

    IF array_position(stage_agent_ids, NULL) IS NOT NULL THEN
      RAISE EXCEPTION 'Lead Hunter specialist runtime agents are not fully active';
    END IF;

    stage_task_ids := ARRAY[
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];

    INSERT INTO public.agent_tasks (
      id, organisation_id, mission_id, agent_id, parent_task_id,
      depends_on_task_id, task_type, action_key, priority, payload,
      idempotency_key
    )
    VALUES
      (
        stage_task_ids[1], NEW.organisation_id, NEW.id, stage_agent_ids[1], NULL, NULL,
        'orchestrate_lead_hunt', 'research_public_web', 80,
        jsonb_build_object(
          'objective', NEW.objective,
          'targetCompany', company_key,
          'targetService', service_key,
          'targetLocation', location_value,
          'resultCount', COALESCE(NEW.required_result_count, 10),
          'workflow', 'direct_employee_lead_hunter_v1',
          'stage', 1,
          'handoff_id', handoff_id,
          'history_execution_source', 'workforce'
        ),
        'direct-employee:' || NEW.id::text || ':orchestrate_lead_hunt'
      ),
      (
        stage_task_ids[2], NEW.organisation_id, NEW.id, stage_agent_ids[2], stage_task_ids[1], stage_task_ids[1],
        'lead_research', 'research_public_web', 79,
        jsonb_build_object('objective', NEW.objective, 'targetCompany', company_key, 'targetService', service_key, 'targetLocation', location_value, 'resultCount', COALESCE(NEW.required_result_count, 10), 'workflow', 'direct_employee_lead_hunter_v1', 'stage', 2, 'handoff_id', handoff_id, 'history_execution_source', 'workforce'),
        'direct-employee:' || NEW.id::text || ':lead_research'
      ),
      (
        stage_task_ids[3], NEW.organisation_id, NEW.id, stage_agent_ids[3], stage_task_ids[1], stage_task_ids[2],
        'lead_enrich', 'enrich_public_contact', 78,
        jsonb_build_object('objective', NEW.objective, 'targetCompany', company_key, 'targetService', service_key, 'targetLocation', location_value, 'resultCount', COALESCE(NEW.required_result_count, 10), 'workflow', 'direct_employee_lead_hunter_v1', 'stage', 3, 'handoff_id', handoff_id, 'history_execution_source', 'workforce'),
        'direct-employee:' || NEW.id::text || ':lead_enrich'
      ),
      (
        stage_task_ids[4], NEW.organisation_id, NEW.id, stage_agent_ids[4], stage_task_ids[1], stage_task_ids[3],
        'lead_qualify', 'qualify_lead', 77,
        jsonb_build_object('objective', NEW.objective, 'targetCompany', company_key, 'targetService', service_key, 'targetLocation', location_value, 'resultCount', COALESCE(NEW.required_result_count, 10), 'workflow', 'direct_employee_lead_hunter_v1', 'stage', 4, 'handoff_id', handoff_id, 'history_execution_source', 'workforce'),
        'direct-employee:' || NEW.id::text || ':lead_qualify'
      ),
      (
        stage_task_ids[5], NEW.organisation_id, NEW.id, stage_agent_ids[5], stage_task_ids[1], stage_task_ids[4],
        'lead_crm_save', 'save_verified_crm_lead', 76,
        jsonb_build_object('objective', NEW.objective, 'targetCompany', company_key, 'targetService', service_key, 'targetLocation', location_value, 'resultCount', COALESCE(NEW.required_result_count, 10), 'workflow', 'direct_employee_lead_hunter_v1', 'stage', 5, 'handoff_id', handoff_id, 'history_execution_source', 'workforce'),
        'direct-employee:' || NEW.id::text || ':lead_crm_save'
      ),
      (
        stage_task_ids[6], NEW.organisation_id, NEW.id, stage_agent_ids[6], stage_task_ids[1], stage_task_ids[5],
        'lead_outreach_draft', 'draft_outreach', 75,
        jsonb_build_object('objective', NEW.objective, 'targetCompany', company_key, 'targetService', service_key, 'targetLocation', location_value, 'resultCount', COALESCE(NEW.required_result_count, 10), 'workflow', 'direct_employee_lead_hunter_v1', 'stage', 6, 'handoff_id', handoff_id, 'history_execution_source', 'workforce'),
        'direct-employee:' || NEW.id::text || ':lead_outreach_draft'
      )
    ON CONFLICT (organisation_id, idempotency_key) DO NOTHING;

    RETURN NEW;
  END IF;

  generic_agent_id := private.ensure_direct_employee_runtime_agent(
    NEW.assigned_employee_id,
    NEW.organisation_id
  );

  IF generic_agent_id IS NULL THEN
    RAISE EXCEPTION 'Generic direct employee runtime agent could not be resolved';
  END IF;

  INSERT INTO public.agent_tasks (
    organisation_id,
    mission_id,
    agent_id,
    task_type,
    action_key,
    priority,
    payload,
    idempotency_key
  )
  VALUES (
    NEW.organisation_id,
    NEW.id,
    generic_agent_id,
    'direct_employee_assignment',
    'direct_employee_internal',
    CASE NEW.priority
      WHEN 'urgent' THEN 90
      WHEN 'high' THEN 75
      WHEN 'low' THEN 35
      ELSE 55
    END,
    jsonb_build_object(
      'objective', NEW.objective,
      'instruction', NEW.instruction,
      'employee_id', NEW.assigned_employee_id,
      'employee_key', employee.employee_key,
      'handoff_id', handoff_id,
      'external_actions_enabled', false
    ),
    'direct-employee:' || NEW.id::text || ':internal'
  )
  ON CONFLICT (organisation_id, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.bridge_direct_employee_mission_to_runtime()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bridge_direct_employee_mission_to_runtime ON public.missions;
CREATE TRIGGER bridge_direct_employee_mission_to_runtime
  AFTER INSERT OR UPDATE OF status
  ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION private.bridge_direct_employee_mission_to_runtime();

-- Keep the established runtime from claiming the new specialist direct task.
-- All existing task types retain exactly the prior claim behaviour.
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
    WHERE task.task_type <> 'direct_employee_assignment'
      AND (
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

CREATE OR REPLACE FUNCTION public.claim_direct_employee_agent_tasks(
  p_organisation_id uuid,
  p_worker_id uuid,
  p_limit integer DEFAULT 3,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF public.agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_organisation_id IS NULL OR p_worker_id IS NULL OR p_limit < 1 OR p_limit > 10 OR p_lease_seconds < 30 OR p_lease_seconds > 1800 THEN
    RAISE EXCEPTION 'Invalid direct employee task claim parameters';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT task.id
    FROM public.agent_tasks AS task
    WHERE task.organisation_id = p_organisation_id
      AND task.task_type = 'direct_employee_assignment'
      AND task.action_key = 'direct_employee_internal'
      AND task.attempt_count < task.max_attempts
      AND (
        (task.status IN ('queued', 'retry_scheduled') AND task.run_after <= now())
        OR (task.status = 'running' AND task.lease_expires_at IS NOT NULL AND task.lease_expires_at < now())
      )
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

REVOKE ALL ON FUNCTION public.claim_direct_employee_agent_tasks(uuid, uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;

COMMIT;
