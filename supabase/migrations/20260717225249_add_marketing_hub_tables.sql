
-- Connected social accounts (Marketing Hub top section, toggle active/hidden)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','x','linkedin','whatsapp')),
  handle text NOT NULL,
  url text NOT NULL,
  brand text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.social_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read active accounts" ON public.social_accounts
  FOR SELECT TO public USING (true);

-- Social posts log (count only for now; Content Scheduler will insert into this)
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text,
  title text,
  content text,
  hashtags text,
  cta text,
  status text DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.social_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp click tracking (public site logs clicks, dashboard reads counts)
CREATE TABLE IF NOT EXISTS public.whatsapp_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  session_id text,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.whatsapp_click_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert" ON public.whatsapp_click_events
  FOR INSERT TO public WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
;
