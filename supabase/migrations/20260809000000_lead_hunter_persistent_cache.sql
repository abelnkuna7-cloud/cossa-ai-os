-- Recent raw-provider responses only. Lead Hunter always repeats source
-- inspection, buyer-fit, sector, service, expiry and duplicate checks before
-- a cached result can become a visible prospect or CRM record.
BEGIN;

CREATE TABLE public.lead_hunter_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  cache_key text NOT NULL CHECK (char_length(cache_key) BETWEEN 1 AND 4096),
  search_results jsonb NOT NULL CHECK (jsonb_typeof(search_results) = 'array'),
  cached_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_hunter_search_cache_lifetime CHECK (
    expires_at >= cached_at
    AND expires_at <= cached_at + INTERVAL '168 hours'
  ),
  UNIQUE (organisation_id, cache_key)
);

ALTER TABLE public.lead_hunter_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members read Lead Hunter cache"
ON public.lead_hunter_search_cache
FOR SELECT TO authenticated
USING ((SELECT public.is_organisation_member(organisation_id)));

CREATE POLICY "Organisation members create Lead Hunter cache"
ON public.lead_hunter_search_cache
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.is_organisation_member(organisation_id))
  AND cached_at <= now()
  AND expires_at <= now() + INTERVAL '168 hours'
);

CREATE POLICY "Organisation members refresh Lead Hunter cache"
ON public.lead_hunter_search_cache
FOR UPDATE TO authenticated
USING ((SELECT public.is_organisation_member(organisation_id)))
WITH CHECK (
  (SELECT public.is_organisation_member(organisation_id))
  AND cached_at <= now()
  AND expires_at <= now() + INTERVAL '168 hours'
);

CREATE INDEX lead_hunter_search_cache_organisation_expiry_idx
  ON public.lead_hunter_search_cache (organisation_id, expires_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.lead_hunter_search_cache TO authenticated;
GRANT ALL ON public.lead_hunter_search_cache TO service_role;

COMMIT;
