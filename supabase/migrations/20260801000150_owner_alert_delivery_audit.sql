-- Immutable audit trail for external owner-alert attempts. The Cloudflare
-- Worker writes using the Supabase service role; browser clients cannot create,
-- change or delete these records.
BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  source text NOT NULL,
  request_id uuid,
  channel text NOT NULL CHECK (channel IN ('callmebot_whatsapp', 'meta_whatsapp', 'email', 'sms', 'other')),
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  idempotency_key text NOT NULL,
  provider_status integer,
  provider_response text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, channel, idempotency_key)
);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members read notification deliveries"
ON public.notification_deliveries
FOR SELECT TO authenticated
USING ((SELECT private.is_organisation_member(organisation_id)));

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_entity
  ON public.notification_deliveries (organisation_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON public.notification_deliveries (organisation_id, status, created_at DESC);

COMMIT;
