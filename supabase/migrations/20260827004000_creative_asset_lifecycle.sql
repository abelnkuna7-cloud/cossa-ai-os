-- Durable creative-media lifecycle for Cossa GROWTH.
--
-- A creative brief and a generated media asset are intentionally different
-- states. This schema makes it impossible to mark an asset generated or
-- approved without a real storage/provider reference.
--
-- PREVIEW BRANCH ONLY UNTIL EXPLICITLY APPLIED.

BEGIN;

CREATE TABLE IF NOT EXISTS public.creative_asset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  requested_by_user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  request_text text NOT NULL CHECK (char_length(btrim(request_text)) BETWEEN 3 AND 6000),
  asset_type text NOT NULL CHECK (asset_type IN (
    'image','flyer','brochure','social_graphic','carousel','banner','thumbnail',
    'product_visual','website_asset','video','other'
  )),
  platform_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  creative_brief jsonb,
  copy_draft text,
  lifecycle_status text NOT NULL DEFAULT 'request' CHECK (lifecycle_status IN (
    'request','requirements','creative_brief','copy','visual_generation',
    'preview','review','revision','approved_asset','delivery','blocked'
  )),
  provider_key text,
  provider_request_id text,
  generated_asset_url text,
  generated_asset_storage_path text,
  generated_asset_sha256 text,
  generated_at timestamptz,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending','approved','rejected','revision_required'
  )),
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  delivered_at timestamptz,
  blocker_code text,
  blocker_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (
    lifecycle_status NOT IN ('preview','review','revision','approved_asset','delivery')
    OR (
      generated_asset_url IS NOT NULL
      OR generated_asset_storage_path IS NOT NULL
    )
  ),
  CHECK (
    lifecycle_status NOT IN ('approved_asset','delivery')
    OR (
      approval_status = 'approved'
      AND approved_by_user_id IS NOT NULL
      AND approved_at IS NOT NULL
    )
  ),
  CHECK (
    lifecycle_status <> 'delivery'
    OR delivered_at IS NOT NULL
  ),
  CHECK (
    lifecycle_status <> 'visual_generation'
    OR provider_key IS NOT NULL
  ),
  CHECK (
    lifecycle_status <> 'blocked'
    OR blocker_message IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.creative_asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  creative_asset_request_id uuid NOT NULL REFERENCES public.creative_asset_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'request_created','requirements_recorded','brief_completed','copy_completed',
    'generation_started','generation_failed','asset_generated','preview_opened',
    'review_requested','revision_requested','asset_approved','asset_rejected',
    'asset_delivered','blocked'
  )),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  provider_key text,
  external_reference text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_asset_requests_status
  ON public.creative_asset_requests (organisation_id, lifecycle_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_asset_requests_approval
  ON public.creative_asset_requests (organisation_id, approval_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_asset_events_request
  ON public.creative_asset_events (creative_asset_request_id, occurred_at DESC);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER set_creative_asset_requests_updated_at BEFORE UPDATE ON public.creative_asset_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END;
$$;

ALTER TABLE public.creative_asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_asset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read creative requests"
ON public.creative_asset_requests FOR SELECT TO authenticated
USING ((SELECT private.is_organisation_member(organisation_id)));

CREATE POLICY "managers manage creative requests"
ON public.creative_asset_requests FOR ALL TO authenticated
USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner','admin','manager'])))
WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner','admin','manager'])));

CREATE POLICY "members read creative events"
ON public.creative_asset_events FOR SELECT TO authenticated
USING ((SELECT private.is_organisation_member(organisation_id)));

-- Browser sessions do not create immutable execution events directly. A
-- protected server workflow should append them after verifying the actor and
-- any external provider result.
REVOKE ALL ON TABLE public.creative_asset_requests, public.creative_asset_events FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.creative_asset_requests TO authenticated;
GRANT SELECT ON TABLE public.creative_asset_events TO authenticated;

COMMIT;
