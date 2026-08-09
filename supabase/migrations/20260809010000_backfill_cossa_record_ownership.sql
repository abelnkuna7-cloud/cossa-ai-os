-- Assign the existing Growth CRM and operations records to Cossa Nexus Holdings.
--
-- The owner has confirmed that every existing row in these six tables belongs
-- to Cossa. This is an additive migration: it preserves IDs and record data,
-- makes future Cossa inserts explicit, and prepares the schema for a later
-- white-label RLS policy migration. Legacy table policies are intentionally
-- not replaced here; they must be audited before enforcement so production
-- workflows are not accidentally locked out.

BEGIN;

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'leads',
    'customers',
    'opportunities',
    'quotations',
    'appointments',
    'projects'
  ]
  LOOP
    IF to_regclass(format('public.%I', required_table)) IS NULL THEN
      RAISE EXCEPTION
        'Required Growth table public.% is missing; ownership migration was not applied.',
        required_table;
    END IF;
  END LOOP;
END;
$$;

-- This is the same stable Cossa tenant identifier seeded by the workforce
-- foundation migration. Do not generate a replacement organisation here.
INSERT INTO public.organisations (id, legal_name, trading_name, status)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Cossa Nexus Holdings',
  'Cossa Nexus Holdings',
  'active'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organisation_id uuid;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organisation_id uuid;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS organisation_id uuid;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS organisation_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS organisation_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organisation_id uuid;

UPDATE public.leads
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

UPDATE public.customers
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

UPDATE public.opportunities
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

UPDATE public.quotations
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

UPDATE public.appointments
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

UPDATE public.projects
SET organisation_id = '00000000-0000-4000-8000-000000000001'
WHERE organisation_id IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.customers
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.opportunities
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.quotations
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.appointments
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.projects
  ALTER COLUMN organisation_id SET DEFAULT '00000000-0000-4000-8000-000000000001',
  ALTER COLUMN organisation_id SET NOT NULL;

DO $$
DECLARE
  target_table text;
  constraint_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'leads',
    'customers',
    'opportunities',
    'quotations',
    'appointments',
    'projects'
  ]
  LOOP
    constraint_name := target_table || '_organisation_id_fkey';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND conrelid = format('public.%I', target_table)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE RESTRICT',
        target_table,
        constraint_name
      );
    END IF;
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS leads_organisation_created_at_idx
  ON public.leads (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customers_organisation_created_at_idx
  ON public.customers (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_organisation_created_at_idx
  ON public.opportunities (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_organisation_created_at_idx
  ON public.quotations (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_organisation_scheduled_at_idx
  ON public.appointments (organisation_id, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS projects_organisation_created_at_idx
  ON public.projects (organisation_id, created_at DESC);

-- Reinforce the Cossa owner membership without changing any other member.
INSERT INTO public.organisation_members (organisation_id, user_id, role, status)
SELECT
  '00000000-0000-4000-8000-000000000001',
  auth_user.id,
  'owner',
  'active'
FROM auth.users AS auth_user
WHERE lower(auth_user.email) = 'cossa@cossanexusholdings.co.za'
ON CONFLICT (organisation_id, user_id) DO UPDATE
SET role = 'owner', status = 'active', updated_at = now();

COMMIT;
