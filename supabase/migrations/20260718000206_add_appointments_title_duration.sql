
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60;

NOTIFY pgrst, 'reload schema';
;
