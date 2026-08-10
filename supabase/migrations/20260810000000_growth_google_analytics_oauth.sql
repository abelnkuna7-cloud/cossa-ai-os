-- Google Analytics OAuth refresh tokens are encrypted by the application before
-- they reach this table. Browser roles receive no grants or RLS policies: only
-- the trusted server-side service role can read or change a connection.
CREATE TABLE IF NOT EXISTS public.google_analytics_oauth_connections (
  organisation_id uuid PRIMARY KEY
    REFERENCES public.organisations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google_analytics'
    CHECK (provider = 'google_analytics'),
  property_id text NOT NULL,
  measurement_id text NOT NULL,
  granted_scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  encrypted_refresh_token text NOT NULL,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_analytics_oauth_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.google_analytics_oauth_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.google_analytics_oauth_connections TO service_role;

CREATE INDEX IF NOT EXISTS google_analytics_oauth_connections_connected_at_idx
  ON public.google_analytics_oauth_connections (connected_at DESC);

NOTIFY pgrst, 'reload schema';
