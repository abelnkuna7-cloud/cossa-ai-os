ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up date;
NOTIFY pgrst, 'reload schema';;
