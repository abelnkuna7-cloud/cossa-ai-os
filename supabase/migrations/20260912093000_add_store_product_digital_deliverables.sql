create table if not exists public.store_product_digital_deliverables (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  organisation_id uuid not null,
  label text not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size_bytes bigint,
  position integer not null default 0,
  is_primary boolean not null default false,
  is_customer_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_product_digital_deliverables_position_nonnegative check (position >= 0),
  constraint store_product_digital_deliverables_file_size_nonnegative check (file_size_bytes is null or file_size_bytes >= 0),
  constraint store_product_digital_deliverables_unique_path unique (product_id, file_path)
);

create index if not exists store_product_digital_deliverables_product_position_idx
  on public.store_product_digital_deliverables(product_id, position, created_at);

create unique index if not exists store_product_digital_deliverables_one_primary_idx
  on public.store_product_digital_deliverables(product_id)
  where is_primary;

alter table public.store_product_digital_deliverables enable row level security;

drop policy if exists cossa_store_admins_manage_store_product_digital_deliverables
  on public.store_product_digital_deliverables;
create policy cossa_store_admins_manage_store_product_digital_deliverables
  on public.store_product_digital_deliverables
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.organisation_members member
      where member.organisation_id = store_product_digital_deliverables.organisation_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role = any (array['owner'::text, 'admin'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.organisation_members member
      where member.organisation_id = store_product_digital_deliverables.organisation_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role = any (array['owner'::text, 'admin'::text])
    )
  );

grant select, insert, update, delete on public.store_product_digital_deliverables to authenticated;

create or replace function public.set_store_product_digital_deliverable_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_store_product_digital_deliverable_updated_at
  on public.store_product_digital_deliverables;
create trigger set_store_product_digital_deliverable_updated_at
before update on public.store_product_digital_deliverables
for each row execute function public.set_store_product_digital_deliverable_updated_at();
