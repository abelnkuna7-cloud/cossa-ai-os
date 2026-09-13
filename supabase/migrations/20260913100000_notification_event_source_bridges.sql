-- Project high-value operational sources into the durable notification stream.
--
-- This migration intentionally starts with two sources whose production schema is
-- already governed by the AI workforce foundation: CEO approvals and failed
-- mission runs. It does not alter the underlying records and it does not send any
-- external message. The projection is duplicate-safe through notification_events'
-- organisation/event_key uniqueness constraint.

BEGIN;

CREATE OR REPLACE FUNCTION private.project_pending_approval_notification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_severity text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  event_severity := CASE
    WHEN NEW.risk_level = 'critical' THEN 'critical'
    WHEN NEW.risk_level = 'high' THEN 'high'
    ELSE 'normal'
  END;

  INSERT INTO public.notification_events (
    organisation_id,
    event_key,
    category,
    severity,
    source_type,
    source_id,
    title,
    summary,
    evidence,
    action_href,
    occurred_at,
    metadata
  ) VALUES (
    NEW.organisation_id,
    'approval:pending:' || NEW.id::text,
    'approval',
    event_severity,
    'approval',
    NEW.id::text,
    'CEO approval required: ' || NEW.action_type,
    NEW.justification,
    jsonb_build_object(
      'approval_id', NEW.id,
      'mission_id', NEW.mission_id,
      'run_id', NEW.run_id,
      'risk_level', NEW.risk_level,
      'action_type', NEW.action_type,
      'requested_at', NEW.requested_at
    ),
    '/ai/workforce',
    NEW.requested_at,
    jsonb_build_object('status', NEW.status)
  )
  ON CONFLICT (organisation_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.project_pending_approval_notification_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS approvals_project_pending_notification_event ON public.approvals;
CREATE TRIGGER approvals_project_pending_notification_event
AFTER INSERT ON public.approvals
FOR EACH ROW
EXECUTE FUNCTION private.project_pending_approval_notification_event();

CREATE OR REPLACE FUNCTION private.project_failed_mission_run_notification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  mission_title text;
  mission_risk text;
  event_severity text;
  failure_summary text;
BEGIN
  IF NEW.status <> 'failed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'failed' THEN
    RETURN NEW;
  END IF;

  SELECT mission.title, mission.risk_level
    INTO mission_title, mission_risk
  FROM public.missions AS mission
  WHERE mission.id = NEW.mission_id
    AND mission.organisation_id = NEW.organisation_id;

  event_severity := CASE
    WHEN mission_risk = 'critical' THEN 'critical'
    WHEN mission_risk = 'high' THEN 'high'
    ELSE 'high'
  END;

  failure_summary := COALESCE(
    NULLIF(btrim(NEW.error_message), ''),
    NULLIF(btrim(NEW.error_code), ''),
    'The workforce run ended in failed status without a recorded error message.'
  );

  INSERT INTO public.notification_events (
    organisation_id,
    event_key,
    category,
    severity,
    source_type,
    source_id,
    title,
    summary,
    evidence,
    action_href,
    occurred_at,
    metadata
  ) VALUES (
    NEW.organisation_id,
    'workforce:run_failed:' || NEW.id::text,
    'workforce',
    event_severity,
    'mission_run',
    NEW.id::text,
    'AI workforce run failed' || CASE
      WHEN mission_title IS NOT NULL THEN ': ' || mission_title
      ELSE ''
    END,
    failure_summary,
    jsonb_build_object(
      'run_id', NEW.id,
      'mission_id', NEW.mission_id,
      'employee_id', NEW.employee_id,
      'error_code', NEW.error_code,
      'error_message', NEW.error_message,
      'model_provider', NEW.model_provider,
      'model_name', NEW.model_name,
      'started_at', NEW.started_at,
      'completed_at', NEW.completed_at
    ),
    '/ai/workforce',
    COALESCE(NEW.completed_at, now()),
    jsonb_build_object(
      'status', NEW.status,
      'mission_risk_level', mission_risk
    )
  )
  ON CONFLICT (organisation_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.project_failed_mission_run_notification_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mission_runs_project_failed_notification_event ON public.mission_runs;
CREATE TRIGGER mission_runs_project_failed_notification_event
AFTER INSERT OR UPDATE OF status ON public.mission_runs
FOR EACH ROW
EXECUTE FUNCTION private.project_failed_mission_run_notification_event();

COMMIT;
