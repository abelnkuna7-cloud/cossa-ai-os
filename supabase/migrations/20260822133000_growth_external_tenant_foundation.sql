-- GROWTH external-tenant foundation.
--
-- This migration uses the existing organisations, organisation_members,
-- saas_subscriptions and saas_plan_entitlements architecture. It does not
-- create a parallel catalogue, CRM or subscription model.

begin;

-- A genuine Free CRM tier is required before a workspace can be provisioned.
-- Keep the database constraints and entitlement registry in agreement.
alter table public.saas_subscriptions
  drop constraint if exists saas_subscriptions_plan_code_check;

alter table public.saas_subscriptions
  add constraint saas_subscriptions_plan_code_check
  check (plan_code = any (array[
    'free', 'trial', 'starter', 'professional', 'business', 'enterprise', 'internal'
  ]));

alter table public.saas_plan_entitlements
  drop constraint if exists saas_plan_entitlements_plan_code_check;

alter table public.saas_plan_entitlements
  add constraint saas_plan_entitlements_plan_code_check
  check (plan_code = any (array[
    'free', 'trial', 'starter', 'professional', 'business', 'enterprise', 'internal'
  ]));

insert into public.saas_plans (
  code,
  name,
  monthly_price_zar,
  ai_mode,
  is_public,
  is_active,
  sort_order
)
values ('free', 'Free CRM', 0, 'none', true, true, 0)
on conflict (code) do update
set
  name = excluded.name,
  monthly_price_zar = excluded.monthly_price_zar,
  ai_mode = excluded.ai_mode,
  is_public = excluded.is_public,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.saas_plan_entitlements (
  plan_code,
  crm_enabled,
  workflows_enabled,
  marketing_enabled,
  ai_enabled,
  ai_monthly_credits,
  ai_fair_use,
  max_users,
  notes
)
values (
  'free',
  true,
  false,
  false,
  false,
  0,
  false,
  1,
  'One active user. CRM only; AI, workflows and marketing require an upgrade.'
)
on conflict (plan_code) do update
set
  crm_enabled = excluded.crm_enabled,
  workflows_enabled = excluded.workflows_enabled,
  marketing_enabled = excluded.marketing_enabled,
  ai_enabled = excluded.ai_enabled,
  ai_monthly_credits = excluded.ai_monthly_credits,
  ai_fair_use = excluded.ai_fair_use,
  max_users = excluded.max_users,
  notes = excluded.notes,
  updated_at = now();

-- Subscription changes are approved through the server-side EFT payment flow.
-- An organisation owner may read a subscription, but must never be able to
-- grant their own paid plan or activate features from the browser.
drop policy if exists "organisation admins manage subscription metadata"
  on public.saas_subscriptions;

-- Enforce the configured active-user limit even if a future member-management
-- interface uses the existing organisation_members table directly.
create or replace function private.enforce_organisation_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max_users integer;
  v_active_members integer;
  v_subscription_found boolean := false;
begin
  if new.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid then
    return new;
  end if;

  if new.status <> 'active'
    or (tg_op = 'UPDATE' and old.status = 'active' and old.organisation_id = new.organisation_id) then
    return new;
  end if;

  -- Serialize active-member changes per workspace so parallel requests cannot
  -- bypass a plan's user cap between the count and the insert.
  perform pg_advisory_xact_lock(hashtext(new.organisation_id::text));

  select true, entitlement.max_users
  into v_subscription_found, v_max_users
  from public.saas_subscriptions subscription
  join public.saas_plan_entitlements entitlement
    on entitlement.plan_code = subscription.plan_code
  where subscription.organisation_id = new.organisation_id
    and subscription.status in ('trialing', 'active', 'past_due')
  limit 1;

  -- A workspace may only be provisioned through the controlled function below.
  -- If a legacy workspace has no valid subscription, fail closed at one active
  -- user rather than allowing an unbounded team to be created.
  if not coalesce(v_subscription_found, false) then
    v_max_users := 1;
  elsif v_max_users is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into v_active_members
    from public.organisation_members membership
    where membership.organisation_id = new.organisation_id
      and membership.status = 'active';
  else
    select count(*)
    into v_active_members
    from public.organisation_members membership
    where membership.organisation_id = new.organisation_id
      and membership.status = 'active'
      and membership.user_id <> old.user_id;
  end if;

  if v_active_members >= v_max_users then
    raise exception 'This workspace has reached its active-user limit.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_organisation_member_limit() from public, anon, authenticated;

drop trigger if exists enforce_organisation_member_limit on public.organisation_members;
create trigger enforce_organisation_member_limit
before insert or update of organisation_id, status on public.organisation_members
for each row execute function private.enforce_organisation_member_limit();

-- An authenticated, provisioned user can create one Free workspace. We do not
-- add public registration here: identity verification and redirect handling
-- remain in the existing Auth configuration.
create or replace function public.create_growth_workspace(
  p_legal_name text,
  p_trading_name text default null
)
returns table (
  organisation_id uuid,
  legal_name text,
  trading_name text,
  plan_code text,
  subscription_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_legal_name text := left(btrim(coalesce(p_legal_name, '')), 160);
  v_trading_name text := nullif(left(btrim(coalesce(p_trading_name, '')), 160), '');
  v_organisation_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to create a workspace.' using errcode = '42501';
  end if;

  if char_length(v_legal_name) < 2 then
    raise exception 'Provide a legal business name of at least two characters.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.organisation_members membership
    where membership.user_id = v_user_id
      and membership.role = 'owner'
      and membership.status = 'active'
      and membership.organisation_id <> '00000000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Your account already owns a GROWTH workspace.' using errcode = '23505';
  end if;

  insert into public.organisations (legal_name, trading_name, status)
  values (v_legal_name, v_trading_name, 'active')
  returning id into v_organisation_id;

  insert into public.saas_subscriptions (
    organisation_id,
    plan_code,
    status,
    monthly_price_zar,
    current_period_start,
    provider
  )
  values (
    v_organisation_id,
    'free',
    'active',
    0,
    now(),
    'growth_workspace'
  );

  insert into public.organisation_members (organisation_id, user_id, role, status)
  values (v_organisation_id, v_user_id, 'owner', 'active');

  return query
  select v_organisation_id, v_legal_name, v_trading_name, 'free'::text, 'active'::text;
end;
$$;

revoke all on function public.create_growth_workspace(text, text) from public, anon;
grant execute on function public.create_growth_workspace(text, text) to authenticated;

-- The selector only returns organisations that the signed-in user already
-- belongs to. It is a convenience layer; RLS remains the data boundary.
create or replace function public.get_growth_workspace_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'workspaces',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', organisation.id,
          'legal_name', organisation.legal_name,
          'trading_name', organisation.trading_name,
          'role', membership.role,
          'plan_code', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then 'internal'
            else subscription.plan_code
          end,
          'subscription_status', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then 'internal'
            else subscription.status
          end,
          'crm_enabled', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then true
            else coalesce(entitlement.crm_enabled, false)
          end,
          'workflows_enabled', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then true
            else coalesce(entitlement.workflows_enabled, false)
          end,
          'marketing_enabled', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then true
            else coalesce(entitlement.marketing_enabled, false)
          end,
          'ai_enabled', case
            when organisation.id = '00000000-0000-4000-8000-000000000001'::uuid then true
            else coalesce(entitlement.ai_enabled, false)
          end
        )
        order by organisation.created_at asc
      ),
      '[]'::jsonb
    )
  )
  from public.organisation_members membership
  join public.organisations organisation
    on organisation.id = membership.organisation_id
  left join public.saas_subscriptions subscription
    on subscription.organisation_id = organisation.id
  left join public.saas_plan_entitlements entitlement
    on entitlement.plan_code = subscription.plan_code
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organisation.status = 'active';
$$;

revoke all on function public.get_growth_workspace_context() from public, anon;
grant execute on function public.get_growth_workspace_context() to authenticated;

-- The early dashboard shipped with unrestricted authenticated CRUD policies.
-- Replace only those legacy policies with organisation-scoped CRM policies.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['leads', 'appointments', 'customers', 'opportunities', 'projects', 'quotations']
  loop
    execute format('drop policy if exists %I on public.%I', 'Allow authenticated users', v_table);
    execute format('drop policy if exists %I on public.%I', 'members read central leads', v_table);
    execute format('drop policy if exists %I on public.%I', 'growth crm member select', v_table);
    execute format('drop policy if exists %I on public.%I', 'growth crm member insert', v_table);
    execute format('drop policy if exists %I on public.%I', 'growth crm member update', v_table);
    execute format('drop policy if exists %I on public.%I', 'growth crm member delete', v_table);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_organisation_member(organisation_id))',
      'growth crm member select', v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_organisation_role(organisation_id, array[''owner'', ''admin'', ''manager'', ''member'']))',
      'growth crm member insert', v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_organisation_role(organisation_id, array[''owner'', ''admin'', ''manager'', ''member''])) with check (public.has_organisation_role(organisation_id, array[''owner'', ''admin'', ''manager'', ''member'']))',
      'growth crm member update', v_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_organisation_role(organisation_id, array[''owner'', ''admin'', ''manager'', ''member'']))',
      'growth crm member delete', v_table
    );
  end loop;
end;
$$;

commit;
