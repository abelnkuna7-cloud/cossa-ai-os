-- Internal, append-only catalogue evidence. This migration deliberately never
-- writes to Store catalogue tables, functions, triggers, or policies.

create table public.store_catalogue_snapshots (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  reason text not null default 'manual',
  source_total_count integer not null,
  active_count integer not null,
  draft_count integer not null,
  archived_count integer not null,
  public_catalogue_count integer not null,
  integrity_status text not null check (integrity_status in ('match', 'mismatch')),
  unique (id, organisation_id)
);

create table public.store_catalogue_snapshot_items (
  snapshot_id uuid not null references public.store_catalogue_snapshots(id) on delete restrict,
  product_id uuid not null,
  sku text,
  slug text,
  source_status text,
  public_present boolean not null,
  primary key (snapshot_id, product_id)
);

create index store_catalogue_snapshots_organisation_created_idx
  on public.store_catalogue_snapshots (organisation_id, created_at desc);
create index store_catalogue_snapshot_items_product_idx
  on public.store_catalogue_snapshot_items (product_id);

alter table public.store_catalogue_snapshots enable row level security;
alter table public.store_catalogue_snapshot_items enable row level security;

create policy "store leaders read catalogue snapshots"
on public.store_catalogue_snapshots for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin', 'manager'])));

create policy "store leaders read catalogue snapshot items"
on public.store_catalogue_snapshot_items for select to authenticated
using (exists (
  select 1 from public.store_catalogue_snapshots snapshot
  where snapshot.id = store_catalogue_snapshot_items.snapshot_id
    and (select private.has_organisation_role(snapshot.organisation_id, array['owner', 'admin', 'manager']))
));

revoke all on table public.store_catalogue_snapshots, public.store_catalogue_snapshot_items from public, anon, authenticated;
grant select on table public.store_catalogue_snapshots, public.store_catalogue_snapshot_items to authenticated;

create function public.create_store_catalogue_snapshot(p_reason text default 'manual')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organisation_id uuid;
  v_snapshot_id uuid;
  v_source_total integer;
  v_active integer;
  v_draft integer;
  v_archived integer;
  v_public integer;
begin
  select organisation.id into v_organisation_id
  from public.organisations organisation
  where (select private.has_organisation_role(organisation.id, array['owner', 'admin', 'manager']))
  order by organisation.id
  limit 1;

  if v_organisation_id is null then
    raise exception 'Authorised Growth store-leader access is required.' using errcode = '42501';
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'active')::integer,
    count(*) filter (where status = 'draft')::integer,
    count(*) filter (where status = 'archived')::integer
  into v_source_total, v_active, v_draft, v_archived
  from public.store_products;

  select count(*)::integer into v_public from public.store_public_products;

  insert into public.store_catalogue_snapshots (
    organisation_id, created_by, reason, source_total_count, active_count,
    draft_count, archived_count, public_catalogue_count, integrity_status
  ) values (
    v_organisation_id, auth.uid(), left(coalesce(nullif(trim(p_reason), ''), 'manual'), 120),
    v_source_total, v_active, v_draft, v_archived, v_public,
    case when v_active = v_public then 'match' else 'mismatch' end
  ) returning id into v_snapshot_id;

  insert into public.store_catalogue_snapshot_items (
    snapshot_id, product_id, sku, slug, source_status, public_present
  )
  select
    v_snapshot_id,
    coalesce(source.id, public_product.id),
    coalesce(source.sku, public_product.sku),
    coalesce(source.slug, public_product.slug),
    source.status,
    public_product.id is not null
  from public.store_products source
  full join public.store_public_products public_product on public_product.id = source.id;

  return v_snapshot_id;
end;
$$;

revoke all on function public.create_store_catalogue_snapshot(text) from public, anon;
grant execute on function public.create_store_catalogue_snapshot(text) to authenticated;
