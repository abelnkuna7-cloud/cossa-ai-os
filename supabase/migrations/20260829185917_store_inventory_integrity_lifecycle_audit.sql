-- Store inventory integrity safeguards — internal workflow only.
-- This migration does not touch Store catalogue tables, public projections,
-- catalogue synchronisation, publication controls or supplier product data.

begin;

create table if not exists public.store_inventory_intake_lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.store_inventory_intakes(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id),
  previous_status text,
  new_status text not null check (new_status in ('imported', 'review', 'draft', 'approved', 'paused')),
  action text not null,
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists store_inventory_intake_lifecycle_history_intake_created_idx
  on public.store_inventory_intake_lifecycle_history (intake_id, created_at desc);

alter table public.store_inventory_intake_lifecycle_history enable row level security;

drop policy if exists "store leaders read inventory intake lifecycle history"
  on public.store_inventory_intake_lifecycle_history;
create policy "store leaders read inventory intake lifecycle history"
on public.store_inventory_intake_lifecycle_history for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin', 'manager'])));

revoke all on table public.store_inventory_intake_lifecycle_history from public, anon, authenticated;
grant select on table public.store_inventory_intake_lifecycle_history to authenticated;

-- These trigger functions live outside the exposed API schema. They are only
-- reachable through the RLS-protected Store tables, and execute with a fixed
-- search path so authenticated users cannot append or alter audit rows.
create or replace function private.enforce_store_supplier_uniqueness()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_domain text;
begin
  new.name := btrim(new.name);
  if new.name = '' then
    raise exception 'Supplier name is required' using errcode = '23514';
  end if;

  if jsonb_typeof(new.recognised_domains) <> 'array' then
    raise exception 'Recognised supplier domains must be a JSON array' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(domain order by domain), '[]'::jsonb)
  into new.recognised_domains
  from (
    select distinct lower(regexp_replace(btrim(value), '^www\.', '')) as domain
    from jsonb_array_elements_text(new.recognised_domains) as item(value)
    where btrim(value) <> ''
  ) normalised;

  if exists (
    select 1
    from public.store_suppliers existing
    where existing.organisation_id = new.organisation_id
      and existing.id is distinct from new.id
      and lower(regexp_replace(btrim(existing.name), '[^[:alnum:]]+', '', 'g')) =
          lower(regexp_replace(btrim(new.name), '[^[:alnum:]]+', '', 'g'))
  ) then
    raise exception 'A supplier with this normalised name already exists for this organisation'
      using errcode = '23505';
  end if;

  for v_domain in
    select value
    from jsonb_array_elements_text(new.recognised_domains) as item(value)
  loop
    if exists (
      select 1
      from public.store_suppliers existing
      cross join lateral jsonb_array_elements_text(existing.recognised_domains) as configured(value)
      where existing.organisation_id = new.organisation_id
        and existing.id is distinct from new.id
        and lower(regexp_replace(btrim(configured.value), '^www\.', '')) = v_domain
    ) then
      raise exception 'This recognised supplier domain is already registered for this organisation'
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.enforce_store_supplier_uniqueness() from public, anon, authenticated;

drop trigger if exists store_suppliers_enforce_unique_name_and_domain on public.store_suppliers;
create trigger store_suppliers_enforce_unique_name_and_domain
before insert or update of name, recognised_domains on public.store_suppliers
for each row execute function private.enforce_store_supplier_uniqueness();

create or replace function private.guard_store_inventory_intake_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.approval_status is not distinct from old.approval_status then
    return new;
  end if;

  if (old.approval_status = 'imported' and new.approval_status = 'review')
    or (old.approval_status = 'review' and new.approval_status = 'draft')
    or (old.approval_status = 'draft' and new.approval_status = 'approved') then
    if new.approval_status = 'approved' then
      new.approved_at := now();
    end if;
    return new;
  end if;

  raise exception 'Invalid inventory intake lifecycle transition: % to %', old.approval_status, new.approval_status
    using errcode = '23514';
end;
$$;

revoke all on function private.guard_store_inventory_intake_lifecycle() from public, anon, authenticated;

drop trigger if exists store_inventory_intakes_guard_lifecycle on public.store_inventory_intakes;
create trigger store_inventory_intakes_guard_lifecycle
before update of approval_status on public.store_inventory_intakes
for each row execute function private.guard_store_inventory_intake_lifecycle();

create or replace function private.record_store_inventory_intake_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.store_inventory_intake_lifecycle_history (
    intake_id,
    organisation_id,
    previous_status,
    new_status,
    action,
    actor_user_id
  )
  values (
    new.id,
    new.organisation_id,
    case when tg_op = 'INSERT' then null else old.approval_status end,
    new.approval_status,
    case
      when tg_op = 'INSERT' then 'intake_created'
      else concat('lifecycle_', old.approval_status, '_to_', new.approval_status)
    end,
    auth.uid()
  );
  return new;
end;
$$;

revoke all on function private.record_store_inventory_intake_lifecycle() from public, anon, authenticated;

drop trigger if exists store_inventory_intakes_record_lifecycle on public.store_inventory_intakes;
create trigger store_inventory_intakes_record_lifecycle
after insert or update of approval_status on public.store_inventory_intakes
for each row execute function private.record_store_inventory_intake_lifecycle();

-- Existing intakes predate this audit table. Record only a clearly-labelled
-- baseline observation; it does not claim to reconstruct historical actions.
insert into public.store_inventory_intake_lifecycle_history (
  intake_id,
  organisation_id,
  previous_status,
  new_status,
  action,
  actor_user_id
)
select
  intake.id,
  intake.organisation_id,
  null,
  intake.approval_status,
  'migration_baseline_observed',
  null
from public.store_inventory_intakes intake
where not exists (
  select 1
  from public.store_inventory_intake_lifecycle_history history
  where history.intake_id = intake.id
);

commit;
