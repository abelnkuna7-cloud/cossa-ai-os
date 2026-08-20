-- Harden the public catalogue surface.
--
-- A security-definer view can safely filter columns, but is still flagged by
-- Supabase because it bypasses base-table RLS. This dedicated projection table
-- contains only shopper-safe fields and is maintained transactionally by a
-- private trigger function whenever an admin changes store_products.

drop view if exists public.store_public_products;

create table public.store_public_products as
select
  id,
  name,
  slug,
  sku,
  product_type,
  status,
  short_description,
  description,
  category,
  brand,
  affiliate_url,
  currency,
  price,
  compare_at_price,
  track_inventory,
  stock_quantity,
  unlimited_stock,
  featured,
  image_urls,
  seo_title,
  seo_description,
  created_at,
  updated_at,
  fulfilment_model,
  case when product_type = 'affiliate' then supplier_name else null end as partner_name
from public.store_products
where false;

alter table public.store_public_products
  add primary key (id);

alter table public.store_public_products enable row level security;
revoke all on table public.store_public_products from public, anon, authenticated;
grant select on table public.store_public_products to anon, authenticated;

create policy "shoppers read active public catalogue products"
on public.store_public_products
for select
to anon, authenticated
using (status = 'active');

insert into public.store_public_products (
  id, name, slug, sku, product_type, status, short_description, description,
  category, brand, affiliate_url, currency, price, compare_at_price,
  track_inventory, stock_quantity, unlimited_stock, featured, image_urls,
  seo_title, seo_description, created_at, updated_at, fulfilment_model, partner_name
)
select
  id, name, slug, sku, product_type, status, short_description, description,
  category, brand, affiliate_url, currency, price, compare_at_price,
  track_inventory, stock_quantity, unlimited_stock, featured, image_urls,
  seo_title, seo_description, created_at, updated_at, fulfilment_model,
  case when product_type = 'affiliate' then supplier_name else null end
from public.store_products
where status = 'active';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_store_public_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.store_public_products where id = old.id;
    return old;
  end if;

  if new.status <> 'active' then
    delete from public.store_public_products where id = new.id;
    return new;
  end if;

  insert into public.store_public_products (
    id, name, slug, sku, product_type, status, short_description, description,
    category, brand, affiliate_url, currency, price, compare_at_price,
    track_inventory, stock_quantity, unlimited_stock, featured, image_urls,
    seo_title, seo_description, created_at, updated_at, fulfilment_model, partner_name
  ) values (
    new.id, new.name, new.slug, new.sku, new.product_type, new.status,
    new.short_description, new.description, new.category, new.brand,
    new.affiliate_url, new.currency, new.price, new.compare_at_price,
    new.track_inventory, new.stock_quantity, new.unlimited_stock, new.featured,
    new.image_urls, new.seo_title, new.seo_description, new.created_at,
    new.updated_at, new.fulfilment_model,
    case when new.product_type = 'affiliate' then new.supplier_name else null end
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    sku = excluded.sku,
    product_type = excluded.product_type,
    status = excluded.status,
    short_description = excluded.short_description,
    description = excluded.description,
    category = excluded.category,
    brand = excluded.brand,
    affiliate_url = excluded.affiliate_url,
    currency = excluded.currency,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    track_inventory = excluded.track_inventory,
    stock_quantity = excluded.stock_quantity,
    unlimited_stock = excluded.unlimited_stock,
    featured = excluded.featured,
    image_urls = excluded.image_urls,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    fulfilment_model = excluded.fulfilment_model,
    partner_name = excluded.partner_name;

  return new;
end;
$$;

revoke all on function private.sync_store_public_product() from public, anon, authenticated, service_role;

drop trigger if exists store_products_sync_public_catalogue on public.store_products;
create trigger store_products_sync_public_catalogue
after insert or update or delete on public.store_products
for each row
execute function private.sync_store_public_product();

-- These security-definer functions are internal implementation details. They
-- are never callable directly from browser-facing PostgREST roles.
revoke all on function public.validate_store_product_publication() from public, anon, authenticated;
revoke all on function public.claim_store_digital_download(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_store_digital_download(uuid, uuid) to service_role;

