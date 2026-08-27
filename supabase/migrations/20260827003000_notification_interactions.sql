-- Auditable in-app notification actions for Cossa GROWTH.
--
-- This complements notification_deliveries (external delivery audit). It records
-- authenticated user decisions such as resolve, dismiss and snooze against a
-- deterministic notification key. It does not delete the underlying business
-- record and it never implies that an external message was sent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  notification_key text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('opened', 'resolved', 'dismissed', 'snoozed', 'escalated')),
  action_reason text,
  snoozed_until timestamptz,
  actor_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (action = 'snoozed' AND snoozed_until IS NOT NULL)
    OR (action <> 'snoozed' AND snoozed_until IS NULL)
  )
);

ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members read notification interactions"
ON public.notification_interactions
FOR SELECT TO authenticated
USING ((SELECT private.is_organisation_member(organisation_id)));

CREATE POLICY "Organisation members create own notification interactions"
ON public.notification_interactions
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT private.is_organisation_member(organisation_id))
  AND actor_user_id = (SELECT auth.uid())
);

-- Keep the audit history immutable from browser sessions. New actions append
-- new rows rather than rewriting prior decisions.

CREATE INDEX IF NOT EXISTS idx_notification_interactions_key
  ON public.notification_interactions (organisation_id, notification_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_entity
  ON public.notification_interactions (organisation_id, entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_actor
  ON public.notification_interactions (organisation_id, actor_user_id, occurred_at DESC);

COMMIT;
