-- Fathom meeting intelligence storage. Production database was created before this
-- migration was added to the live repository; keep this file as source-of-truth for
-- fresh environments and disaster recovery.
CREATE TABLE IF NOT EXISTS public.meeting_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'fathom',
  provider_meeting_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting.received',
  title TEXT NOT NULL DEFAULT 'Meeting',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript JSONB,
  summary JSONB,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_webhook_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_meeting_id)
);

CREATE INDEX IF NOT EXISTS meeting_intelligence_received_at_idx ON public.meeting_intelligence (received_at DESC);
CREATE INDEX IF NOT EXISTS meeting_intelligence_provider_idx ON public.meeting_intelligence (provider, provider_meeting_id);

ALTER TABLE public.meeting_intelligence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_intelligence FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.meeting_intelligence FROM authenticated;
GRANT SELECT ON public.meeting_intelligence TO authenticated;
GRANT ALL ON public.meeting_intelligence TO service_role;

DROP POLICY IF EXISTS "Authenticated staff read meeting intelligence" ON public.meeting_intelligence;
CREATE POLICY "Authenticated staff read meeting intelligence" ON public.meeting_intelligence
  FOR SELECT TO authenticated USING (true);
