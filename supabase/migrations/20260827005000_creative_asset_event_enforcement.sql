-- Enforce auditable Creative Media lifecycle events in the database.
--
-- creative_asset_requests is the authoritative current state. This trigger
-- appends immutable lifecycle events whenever a request is created or changes
-- lifecycle state. Browser clients retain no INSERT privilege on the events
-- table, so UI code cannot manufacture execution history directly.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_creative_asset_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_message text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'request_created';
    v_message := 'Creative asset request recorded.';
  ELSIF NEW.lifecycle_status IS NOT DISTINCT FROM OLD.lifecycle_status THEN
    RETURN NEW;
  ELSE
    v_event_type := CASE NEW.lifecycle_status
      WHEN 'requirements' THEN 'requirements_recorded'
      WHEN 'creative_brief' THEN 'brief_completed'
      WHEN 'copy' THEN 'copy_completed'
      WHEN 'visual_generation' THEN 'generation_started'
      WHEN 'preview' THEN 'asset_generated'
      WHEN 'review' THEN 'review_requested'
      WHEN 'revision' THEN 'revision_requested'
      WHEN 'approved_asset' THEN 'asset_approved'
      WHEN 'delivery' THEN 'asset_delivered'
      WHEN 'blocked' THEN 'blocked'
      ELSE NULL
    END;

    IF v_event_type IS NULL THEN
      RETURN NEW;
    END IF;

    v_message := CASE NEW.lifecycle_status
      WHEN 'blocked' THEN NEW.blocker_message
      WHEN 'visual_generation' THEN 'Visual generation started through an authorised provider.'
      WHEN 'preview' THEN 'A generated asset reference is available for preview.'
      WHEN 'approved_asset' THEN 'Creative asset approved.'
      WHEN 'delivery' THEN 'Creative asset delivered.'
      ELSE 'Creative lifecycle advanced to ' || NEW.lifecycle_status || '.'
    END;
  END IF;

  INSERT INTO public.creative_asset_events (
    organisation_id,
    creative_asset_request_id,
    event_type,
    actor_user_id,
    actor_employee_id,
    provider_key,
    external_reference,
    message,
    metadata,
    occurred_at
  ) VALUES (
    NEW.organisation_id,
    NEW.id,
    v_event_type,
    auth.uid(),
    NEW.requested_by_employee_id,
    NEW.provider_key,
    COALESCE(NEW.provider_request_id, NEW.generated_asset_storage_path, NEW.generated_asset_url),
    v_message,
    jsonb_strip_nulls(jsonb_build_object(
      'lifecycle_status', NEW.lifecycle_status,
      'approval_status', NEW.approval_status,
      'blocker_code', NEW.blocker_code,
      'mission_id', NEW.metadata->>'mission_id',
      'run_id', NEW.metadata->>'run_id'
    )),
    now()
  );

  -- A request created directly in an already-blocked state represents two
  -- distinct facts: the request exists, and generation is blocked. Record the
  -- blocker separately instead of losing it behind request_created.
  IF TG_OP = 'INSERT' AND NEW.lifecycle_status = 'blocked' THEN
    INSERT INTO public.creative_asset_events (
      organisation_id,
      creative_asset_request_id,
      event_type,
      actor_user_id,
      actor_employee_id,
      provider_key,
      external_reference,
      message,
      metadata,
      occurred_at
    ) VALUES (
      NEW.organisation_id,
      NEW.id,
      'blocked',
      auth.uid(),
      NEW.requested_by_employee_id,
      NEW.provider_key,
      COALESCE(NEW.provider_request_id, NEW.generated_asset_storage_path, NEW.generated_asset_url),
      NEW.blocker_message,
      jsonb_strip_nulls(jsonb_build_object(
        'lifecycle_status', NEW.lifecycle_status,
        'blocker_code', NEW.blocker_code,
        'mission_id', NEW.metadata->>'mission_id',
        'run_id', NEW.metadata->>'run_id'
      )),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_creative_asset_lifecycle_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_record_creative_asset_lifecycle_event
  ON public.creative_asset_requests;

CREATE TRIGGER trg_record_creative_asset_lifecycle_event
AFTER INSERT OR UPDATE OF lifecycle_status
ON public.creative_asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.record_creative_asset_lifecycle_event();

COMMIT;
