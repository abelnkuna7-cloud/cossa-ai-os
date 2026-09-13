-- Durable, truthful Lead Hunter hunt history for Today / 7d / 30d intelligence.
--
-- This is intentionally separate from lead_hunter_search_cache. The cache holds
-- raw provider responses and is not a verified business-history source.
-- Hunt history is append-only, organisation scoped, and writable only by the
-- protected service role. Authenticated organisation members may read it.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_hunter_hunt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  hunt_id uuid NOT NULL,
  execution_source text NOT NULL CHECK (execution_source IN ('manual', 'workforce', 'scheduled')),
  workflow_outcome text NOT NULL CHECK (workflow_outcome IN (
    'SUCCESS_WITH_RESULTS',
    'SUCCESS_NO_VERIFIED_RESULTS',
    'SUCCESS_WITH_PROVIDER_WARNINGS',
    'PARTIAL_PROVIDER_FAILURE',
    'FAILED'
  )),
  searched_at timestamptz NOT NULL,
  completed_at timestamptz,
  request jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(request) = 'object'),
  providers_used text[] NOT NULL DEFAULT ARRAY[]::text[],
  provider_diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(provider_diagnostics) = 'array'),
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  verified_count integer NOT NULL DEFAULT 0 CHECK (verified_count >= 0),
  partially_verified_count integer NOT NULL DEFAULT 0 CHECK (partially_verified_count >= 0),
  hot_count integer NOT NULL DEFAULT 0 CHECK (hot_count >= 0),
  warm_count integer NOT NULL DEFAULT 0 CHECK (warm_count >= 0),
  cold_count integer NOT NULL DEFAULT 0 CHECK (cold_count >= 0),
  research_count integer NOT NULL DEFAULT 0 CHECK (research_count >= 0),
  duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  tender_count integer NOT NULL DEFAULT 0 CHECK (tender_count >= 0),
  supplier_opportunity_count integer NOT NULL DEFAULT 0 CHECK (supplier_opportunity_count >= 0),
  rejection_reason_counts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(rejection_reason_counts) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, hunt_id)
);

CREATE INDEX IF NOT EXISTS lead_hunter_hunt_history_org_searched_idx
  ON public.lead_hunter_hunt_history (organisation_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS lead_hunter_hunt_history_org_source_searched_idx
  ON public.lead_hunter_hunt_history (organisation_id, execution_source, searched_at DESC);

ALTER TABLE public.lead_hunter_hunt_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_hunter_hunt_history'
      AND policyname = 'Organisation members read Lead Hunter hunt history'
  ) THEN
    CREATE POLICY "Organisation members read Lead Hunter hunt history"
      ON public.lead_hunter_hunt_history
      FOR SELECT TO authenticated
      USING ((SELECT public.is_organisation_member(organisation_id)));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.reject_lead_hunter_hunt_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Lead Hunter hunt history is append-only';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_lead_hunter_hunt_history_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_lead_hunter_hunt_history ON public.lead_hunter_hunt_history;

CREATE TRIGGER protect_lead_hunter_hunt_history
  BEFORE UPDATE OR DELETE ON public.lead_hunter_hunt_history
  FOR EACH ROW
  EXECUTE FUNCTION private.reject_lead_hunter_hunt_history_mutation();

REVOKE ALL ON public.lead_hunter_hunt_history FROM anon, authenticated;
GRANT SELECT ON public.lead_hunter_hunt_history TO authenticated;
GRANT ALL ON public.lead_hunter_hunt_history TO service_role;

COMMIT;
