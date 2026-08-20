-- Cossa Store launch guardrails.
--
-- This consolidated cossa-growth migration deliberately extends the existing
-- commerce tables instead of creating a parallel catalogue. Publishing is
-- guarded in Postgres so neither Growth nor Store UI can make an incomplete
-- product public by accident.

create or replace function public.validate_store_product_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  issues text[] := array[]::text[];
begin
  if new.status <> 'active' then
    return new;
  end if;

  if coalesce(trim(new.name), '') = '' then
    issues := array_append(issues, 'name');
  end if;
  if coalesce(trim(new.slug), '') = '' then
    issues := array_append(issues, 'URL slug');
  end if;
  if coalesce(trim(new.category), '') = '' then
    issues := array_append(issues, 'category');
  end if;
  if coalesce(trim(new.description), '') = '' then
    issues := array_append(issues, 'description');
  end if;
  if coalesce(cardinality(new.image_urls), 0) = 0
    or coalesce(trim(new.image_urls[1]), '') = '' then
    issues := array_append(issues, 'at least one product image');
  end if;

  if new.product_type <> 'affiliate' and coalesce(trim(new.sku), '') = '' then
    issues := array_append(issues, 'SKU');
  end if;

  if new.product_type <> 'affiliate' and coalesce(new.price, 0) <= 0 then
    issues := array_append(issues, 'selling price');
  end if;

  case new.product_type
    when 'digital' then
      if new.fulfilment_model <> 'digital' then
        issues := array_append(issues, 'digital fulfilment');
      end if;
      if coalesce(trim(new.digital_file_path), '') = '' then
        issues := array_append(issues, 'digital file');
      elsif not exists (
        select 1
        from storage.objects object
        where object.bucket_id = 'store-digital-products'
          and object.name = new.digital_file_path
      ) then
        issues := array_append(issues, 'uploaded digital file');
      end if;
    when 'affiliate' then
      if new.fulfilment_model <> 'affiliate' then
        issues := array_append(issues, 'affiliate fulfilment');
      end if;
      if coalesce(trim(new.supplier_name), '') = '' then
        issues := array_append(issues, 'partner or merchant name');
      end if;
      if coalesce(trim(new.affiliate_url), '') !~ '^https?://' then
        issues := array_append(issues, 'legitimate affiliate URL');
      end if;
    when 'pod' then
      if new.fulfilment_model <> 'print_on_demand' then
        issues := array_append(issues, 'print-on-demand fulfilment');
      end if;
      if coalesce(trim(new.supplier_name), '') = '' then
        issues := array_append(issues, 'POD provider');
      end if;
      if coalesce(trim(new.supplier_product_ref), '') = '' then
        issues := array_append(issues, 'provider product reference');
      end if;
    when 'dropshipping' then
      if new.fulfilment_model not in ('local_dropshipping', 'international_dropshipping') then
        issues := array_append(issues, 'dropshipping fulfilment');
      end if;
      if coalesce(trim(new.supplier_name), '') = '' then
        issues := array_append(issues, 'supplier');
      end if;
      if coalesce(trim(new.supplier_product_ref), '') = ''
        and coalesce(trim(new.supplier_url), '') = '' then
        issues := array_append(issues, 'supplier reference or URL');
      end if;
    when 'physical' then
      if new.fulfilment_model not in ('cossa_stock', 'local_supplier') then
        issues := array_append(issues, 'physical fulfilment');
      end if;
      if new.track_inventory and not new.unlimited_stock and coalesce(new.stock_quantity, 0) <= 0 then
        issues := array_append(issues, 'available stock quantity');
      end if;
    else
      issues := array_append(issues, 'supported product type');
  end case;

  if cardinality(issues) > 0 then
    raise exception using
      errcode = '23514',
      message = 'Product cannot be published until it has: ' || array_to_string(issues, ', ');
  end if;

  return new;
end;
$$;

revoke all on function public.validate_store_product_publication() from public;

drop trigger if exists store_products_require_publish_ready on public.store_products;
create trigger store_products_require_publish_ready
before insert or update on public.store_products
for each row
execute function public.validate_store_product_publication();

-- This intentionally narrow security-definer view is the only public catalogue
-- surface. It exposes active products and customer-facing fields only; it
-- never exposes product cost, supplier source details or digital storage paths.
create or replace view public.store_public_products
with (security_invoker = false)
as
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
where status = 'active';

revoke all on public.store_public_products from public;
grant select on public.store_public_products to anon, authenticated;

-- The download claim is service-role only. The Edge Function authenticates the
-- caller first, then atomically consumes an entitlement before issuing a short
-- lived Storage URL. This avoids public file URLs and download-limit races.
create or replace function public.claim_store_digital_download(
  p_entitlement_id uuid,
  p_customer_user_id uuid
)
returns table (
  storage_path text,
  download_name text,
  remaining_downloads integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    update public.store_digital_entitlements entitlement
    set downloads_used = entitlement.downloads_used + 1
    from public.store_orders store_order
    join public.store_products product on product.id = entitlement.product_id
    where entitlement.id = p_entitlement_id
      and entitlement.order_id = store_order.id
      and store_order.customer_user_id = p_customer_user_id
      and store_order.status in ('paid', 'processing', 'completed')
      and entitlement.revoked_at is null
      and (entitlement.expires_at is null or entitlement.expires_at > now())
      and entitlement.downloads_used < entitlement.download_limit
    returning
      entitlement.storage_path,
      coalesce(product.digital_file_name, 'Cossa-digital-product'),
      entitlement.download_limit - entitlement.downloads_used
  )
  select * from claimed;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Digital download is unavailable, expired, revoked, unpaid or has reached its limit.';
  end if;
end;
$$;

revoke all on function public.claim_store_digital_download(uuid, uuid) from public;
grant execute on function public.claim_store_digital_download(uuid, uuid) to service_role;

