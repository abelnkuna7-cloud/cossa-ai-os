-- Close the existing authenticated-user role escalation vulnerability without
-- changing or deleting any existing role assignments.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION
      'Required Growth baseline table public.user_roles is missing; stop and reconcile the production schema before applying this migration.';
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS assigned_role
    WHERE assigned_role.user_id = (SELECT auth.uid())
      AND assigned_role.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated users manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins create roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;

CREATE POLICY "Users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT private.is_admin())
);

CREATE POLICY "Admins create roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING ((SELECT private.is_admin()));

REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- This event-trigger helper is invoked by PostgreSQL, not by API clients. Some
-- fresh environments do not have the historical helper, so revoke only when
-- its exact zero-argument signature exists.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.update_referrals_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_referrals_updated_at() SET search_path = ''''';
  END IF;
END;
$$;

COMMIT;
