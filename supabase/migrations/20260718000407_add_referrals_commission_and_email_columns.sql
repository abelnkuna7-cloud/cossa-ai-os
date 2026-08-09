
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_email text,
  ADD COLUMN IF NOT EXISTS referee_email text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;

NOTIFY pgrst, 'reload schema';
;
