-- Merge semantic duplicate AI employee rows created by older underscore-style keys.
--
-- PREVIEW-BRANCH MIGRATION ONLY UNTIL EXPLICITLY APPLIED.
-- The application already canonicalises these aliases in workforce-data.ts.
-- This migration reconciles the database IDs and every known foreign-key
-- reference before removing the legacy duplicate row.
--
-- Rules:
-- 1. If only a legacy row exists, rename it to the canonical key.
-- 2. If both rows exist, preserve the canonical row and move all references
--    from the legacy employee ID to the canonical employee ID.
-- 3. Never delete a legacy row until all known references have moved.
-- 4. Operate per organisation so tenant boundaries remain intact.

BEGIN;

DO $$
DECLARE
  alias_record record;
  legacy_row record;
  canonical_row record;
BEGIN
  FOR alias_record IN
    SELECT *
    FROM (VALUES
      ('lead_intake_coordinator'::text, 'lead-intake-coordinator'::text),
      ('product_intelligence_analyst'::text, 'product-intelligence-analyst'::text)
    ) AS aliases(legacy_key, canonical_key)
  LOOP
    FOR legacy_row IN
      SELECT id, organisation_id, employee_key
      FROM public.ai_employees
      WHERE employee_key = alias_record.legacy_key
      ORDER BY created_at ASC
    LOOP
      SELECT id, organisation_id, employee_key
      INTO canonical_row
      FROM public.ai_employees
      WHERE organisation_id = legacy_row.organisation_id
        AND employee_key = alias_record.canonical_key
      LIMIT 1;

      IF canonical_row.id IS NULL THEN
        UPDATE public.ai_employees
        SET employee_key = alias_record.canonical_key,
            updated_at = now()
        WHERE id = legacy_row.id
          AND organisation_id = legacy_row.organisation_id;

        CONTINUE;
      END IF;

      -- Core workforce references.
      UPDATE public.missions
      SET assigned_employee_id = canonical_row.id,
          updated_at = now()
      WHERE organisation_id = legacy_row.organisation_id
        AND assigned_employee_id = legacy_row.id;

      UPDATE public.mission_runs
      SET employee_id = canonical_row.id
      WHERE organisation_id = legacy_row.organisation_id
        AND employee_id = legacy_row.id;

      UPDATE public.employee_handoffs
      SET from_employee_id = canonical_row.id
      WHERE organisation_id = legacy_row.organisation_id
        AND from_employee_id = legacy_row.id;

      UPDATE public.employee_handoffs
      SET to_employee_id = canonical_row.id
      WHERE organisation_id = legacy_row.organisation_id
        AND to_employee_id = legacy_row.id;

      UPDATE public.approvals
      SET requested_by_employee_id = canonical_row.id
      WHERE organisation_id = legacy_row.organisation_id
        AND requested_by_employee_id = legacy_row.id;

      -- Durable agent-runtime references.
      IF to_regclass('public.ai_agents') IS NOT NULL THEN
        UPDATE public.ai_agents
        SET employee_id = canonical_row.id,
            updated_at = now()
        WHERE organisation_id = legacy_row.organisation_id
          AND employee_id = legacy_row.id;
      END IF;

      IF to_regclass('public.agent_triggers') IS NOT NULL THEN
        UPDATE public.agent_triggers
        SET employee_id = canonical_row.id,
            updated_at = now()
        WHERE organisation_id = legacy_row.organisation_id
          AND employee_id = legacy_row.id;
      END IF;

      -- Additional production Growth references discovered by FK audit.
      IF to_regclass('public.audit_events') IS NOT NULL THEN
        UPDATE public.audit_events
        SET actor_employee_id = canonical_row.id
        WHERE organisation_id = legacy_row.organisation_id
          AND actor_employee_id = legacy_row.id;
      END IF;

      IF to_regclass('public.capability_registry') IS NOT NULL THEN
        UPDATE public.capability_registry
        SET responsible_employee_id = canonical_row.id,
            updated_at = now()
        WHERE organisation_id = legacy_row.organisation_id
          AND responsible_employee_id = legacy_row.id;
      END IF;

      IF to_regclass('public.lead_assignments') IS NOT NULL THEN
        UPDATE public.lead_assignments
        SET employee_id = canonical_row.id
        WHERE employee_id = legacy_row.id;
      END IF;

      IF to_regclass('public.lead_events') IS NOT NULL THEN
        UPDATE public.lead_events
        SET actor_employee_id = canonical_row.id
        WHERE actor_employee_id = legacy_row.id;
      END IF;

      IF to_regclass('public.ops_tasks') IS NOT NULL THEN
        UPDATE public.ops_tasks
        SET assignee_employee_id = canonical_row.id,
            updated_at = now()
        WHERE organisation_id = legacy_row.organisation_id
          AND assignee_employee_id = legacy_row.id;
      END IF;

      -- Fail closed if an unknown FK still references this legacy employee.
      -- The DELETE will be rejected by PostgreSQL rather than silently losing
      -- relational history.
      DELETE FROM public.ai_employees
      WHERE id = legacy_row.id
        AND organisation_id = legacy_row.organisation_id;

      canonical_row := NULL;
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;
