-- Fail closed at the CRM boundary for the hosted Lead Hunter runtime.
--
-- The normal Lead Hunter workforce path already promotes only VERIFIED
-- prospects. The hosted runtime writes leads with source
-- `cossa_orchestrator_lead_hunter`; this trigger prevents that path from
-- inserting an unverified or partially verified prospect even if an upstream
-- runtime regression bypasses its application-level eligibility checks.
--
-- Scope is intentionally INSERT-only so later human CRM edits are not blocked.
-- No other lead source is affected.

BEGIN;

CREATE OR REPLACE FUNCTION private.enforce_runtime_lead_hunter_verified_save()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.source = 'cossa_orchestrator_lead_hunter' THEN
    IF NEW.notes IS NULL OR NEW.notes !~* E'(^|\\n)Verification:[[:space:]]*verified([[:space:]]|$)' THEN
      RAISE EXCEPTION 'Hosted Lead Hunter may save only verified prospects to CRM';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_runtime_lead_hunter_verified_save() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_runtime_lead_hunter_verified_save ON public.leads;

CREATE TRIGGER enforce_runtime_lead_hunter_verified_save
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_runtime_lead_hunter_verified_save();

COMMIT;
