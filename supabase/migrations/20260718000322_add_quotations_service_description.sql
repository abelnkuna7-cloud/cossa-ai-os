
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS service text,
  ADD COLUMN IF NOT EXISTS description text;

NOTIFY pgrst, 'reload schema';
;
