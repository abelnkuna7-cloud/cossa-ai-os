
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS post_url text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_generated integer DEFAULT 0;

NOTIFY pgrst, 'reload schema';
;
