
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS service text,
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;

NOTIFY pgrst, 'reload schema';
;
