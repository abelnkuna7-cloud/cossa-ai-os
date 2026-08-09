
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','x','linkedin','whatsapp')),
  title text,
  content text NOT NULL,
  hashtags text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted','failed')),
  ai_generated boolean NOT NULL DEFAULT false,
  ai_prompt text,
  campaign text,
  scheduled_for timestamptz,
  posted_post_id uuid REFERENCES public.social_posts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.content_calendar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
;
