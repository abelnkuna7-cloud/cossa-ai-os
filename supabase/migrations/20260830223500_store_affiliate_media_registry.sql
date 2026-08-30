create table if not exists public.store_product_media (
  id uuid primary key default gen_random_uuid(),
  store_product_id uuid not null references public.store_products(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  source_url text not null,
  position integer not null default 0,
  source_kind text not null default 'affiliate_import',
  created_at timestamptz not null default now(),
  unique (store_product_id, media_type, source_url)
);

create index if not exists store_product_media_product_position_idx
  on public.store_product_media (store_product_id, media_type, position);

alter table public.store_product_media enable row level security;

drop policy if exists "store product media authenticated read" on public.store_product_media;
create policy "store product media authenticated read"
  on public.store_product_media
  for select
  to authenticated
  using (true);

drop policy if exists "store product media authenticated insert" on public.store_product_media;
create policy "store product media authenticated insert"
  on public.store_product_media
  for insert
  to authenticated
  with check (true);

drop policy if exists "store product media authenticated update" on public.store_product_media;
create policy "store product media authenticated update"
  on public.store_product_media
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "store product media authenticated delete" on public.store_product_media;
create policy "store product media authenticated delete"
  on public.store_product_media
  for delete
  to authenticated
  using (true);
