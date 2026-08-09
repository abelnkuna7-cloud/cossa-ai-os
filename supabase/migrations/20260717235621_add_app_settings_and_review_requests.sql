
-- Generic key/value app config (Google Place ID, business name, and future settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Google review invite tracking
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  project_title text,
  sent_via text NOT NULL DEFAULT 'link',
  sent_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  click_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.review_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- The public review link (/api/public/r/:token) needs to log clicks without being logged in
CREATE POLICY "Allow public update clicks" ON public.review_requests
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read for redirect" ON public.review_requests
  FOR SELECT TO public USING (true);

NOTIFY pgrst, 'reload schema';
;
