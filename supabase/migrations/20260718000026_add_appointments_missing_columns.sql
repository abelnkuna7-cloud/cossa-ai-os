
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

NOTIFY pgrst, 'reload schema';
;
