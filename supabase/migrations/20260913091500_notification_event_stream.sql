-- Durable, evidence-backed notification event stream for Cossa GROWTH.
--
-- This table records immutable operational events that may later be surfaced by
-- Notifications, Command Center and CEO briefing views. It does not replace
-- notification_interactions (owner decisions) or notification_deliveries
-- (external delivery audit).
--
-- Browser sessions may read events for organisations they belong to. They may
-- not create, update or delete events. Trusted server/worker code writes through
-- the service role so a browser cannot manufacture CEO alerts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'revenue',
      'sales',
      'customer',
      'approval',
      'workforce',
      'operations',
      'supplier',
      'store',
      'compliance',
      'security',
      'system'
    )
  ),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'normal', 'info')),
  source_type text NOT NULL,
  source_id text,
  title text NOT NULL,
  summary text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_href text,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT notification_events_event_key_not_blank CHECK (length(btrim(event_key)) > 0),
  CONSTRAINT notification_events_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT notification_events_summary_not_blank CHECK (length(btrim(summary)) > 0),
  CONSTRAINT notification_events_org_event_key_unique UNIQUE (organisation_id, event_key)
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members read notification events"
ON public.notification_events
FOR SELECT TO authenticated
USING ((SELECT private.is_organisation_member(organisation_id)));

-- No authenticated INSERT/UPDATE/DELETE policies are intentionally created.
-- Service-role workers bypass RLS and are the only expected writers.

CREATE INDEX IF NOT EXISTS idx_notification_events_recent
  ON public.notification_events (organisation_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_attention
  ON public.notification_events (organisation_id, severity, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_category
  ON public.notification_events (organisation_id, category, occurred_at DESC);

COMMIT;
