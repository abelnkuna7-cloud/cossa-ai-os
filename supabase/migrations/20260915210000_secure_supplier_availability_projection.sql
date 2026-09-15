-- Preserve the anonymous storefront availability projection without allowing
-- the public view to inherit the view owner's unrestricted table access.

create or replace function private.store_supplier_availability_public_data()
returns table (
  product_id uuid,
  supplier_stock_state text,
  is_fresh boolean,
  supplier_available boolean,
  last_stock_checked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select distinct on (i.publication_store_product_id)
    i.publication_store_product_id as product_id,
    case
      when i.last_stock_checked_at is null then 'unknown'::text
      when lower(coalesce(i.stock_status, '')) = any (array['unknown', 'needs_check', 'needs-check']) then 'unknown'::text
      when i.last_stock_checked_at < now() - interval '24 hours' then 'stale'::text
      when lower(coalesce(i.stock_status, '')) = any (array['out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out']) then 'out_of_stock'::text
      when lower(coalesce(i.stock_status, '')) = any (array['available', 'in_stock', 'in-stock']) then 'in_stock'::text
      when coalesce(i.supplier_available_stock, 0) <= 0 then 'out_of_stock'::text
      else 'in_stock'::text
    end as supplier_stock_state,
    i.last_stock_checked_at is not null
      and i.last_stock_checked_at >= now() - interval '24 hours'
      and lower(coalesce(i.stock_status, '')) <> all (array['unknown', 'needs_check', 'needs-check']) as is_fresh,
    i.last_stock_checked_at is not null
      and i.last_stock_checked_at >= now() - interval '24 hours'
      and (
        lower(coalesce(i.stock_status, '')) = any (array['available', 'in_stock', 'in-stock'])
        or (
          coalesce(i.supplier_available_stock, 0) > 0
          and lower(coalesce(i.stock_status, '')) <> all (
            array['out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out', 'unknown', 'needs_check', 'needs-check']
          )
        )
      ) as supplier_available,
    i.last_stock_checked_at
  from public.store_inventory_intakes i
  where i.publication_store_product_id is not null
    and i.approval_status = 'published'
  order by i.publication_store_product_id, i.last_stock_checked_at desc nulls last, i.created_at desc;
$function$;

revoke all on function private.store_supplier_availability_public_data() from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.store_supplier_availability_public_data() to anon, authenticated, service_role;

create or replace view public.store_supplier_availability_public
with (security_invoker = true)
as
select
  product_id,
  supplier_stock_state,
  is_fresh,
  supplier_available,
  last_stock_checked_at
from private.store_supplier_availability_public_data();

revoke all on public.store_supplier_availability_public from public, anon, authenticated, service_role;
grant select on public.store_supplier_availability_public to anon, authenticated, service_role;
