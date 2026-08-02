-- READ ONLY: run against cossa-growth before applying the August foundation.
-- Every result must be reviewed; this script changes no schema or data.

SELECT
  current_database() AS database_name,
  current_setting('server_version') AS postgres_version,
  now() AS checked_at;

WITH required(table_name) AS (
  VALUES
    ('user_roles'),
    ('leads'),
    ('customers'),
    ('opportunities'),
    ('quotations'),
    ('appointments'),
    ('projects')
)
SELECT
  required.table_name,
  to_regclass(format('public.%I', required.table_name)) IS NOT NULL AS exists
FROM required
ORDER BY required.table_name;

-- These July names belong to the repository prototype, not the verified
-- Growth CRM. Existing rows will be preserved under legacy_202607.
WITH prototype(table_name) AS (
  VALUES
    ('ai_conversations'),
    ('ai_messages'),
    ('ai_prompts'),
    ('ai_knowledge_documents'),
    ('sales_companies'),
    ('sales_customers'),
    ('sales_leads'),
    ('sales_opportunities'),
    ('sales_quotations'),
    ('sales_appointments'),
    ('sales_follow_ups'),
    ('ops_projects'),
    ('ops_tasks'),
    ('ops_documents')
)
SELECT
  prototype.table_name,
  to_regclass(format('public.%I', prototype.table_name)) IS NOT NULL AS exists_in_public,
  EXISTS (
    SELECT 1
    FROM information_schema.columns column_info
    WHERE column_info.table_schema = 'public'
      AND column_info.table_name = prototype.table_name
      AND column_info.column_name = 'organisation_id'
  ) AS has_production_tenant_key
FROM prototype
ORDER BY prototype.table_name;

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_roles'
ORDER BY policyname;

SELECT
  routine.routine_schema,
  routine.routine_name,
  routine.security_type,
  routine.external_language
FROM information_schema.routines routine
WHERE routine.routine_schema IN ('public', 'private')
  AND routine.routine_name IN (
    'rls_auto_enable',
    'update_referrals_updated_at',
    'is_admin',
    'is_organisation_member',
    'has_organisation_role'
  )
ORDER BY routine.routine_schema, routine.routine_name;

-- Supabase migration history is the release gate. Compare these rows with the
-- four SQL files committed under supabase/migrations before any db push.
SELECT *
FROM supabase_migrations.schema_migrations
ORDER BY version;
