-- Additive bridge from internal Store merchandising metadata to the existing
-- customer-safe storefront projection. No products are created, deleted,
-- published, unpublished, or reclassified by this migration.

begin;

alter table public.store_customer_products
  add column if not exists additional_categories text[] not null default '{}'::text[],
  add column if not exists merchandising_tags text[] not null default '{}'::text[],
  add column if not exists fulfilment_model text;

create or replace function private.sync_store_customer_product()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.store_customer_products where id = old.id;
    return old;
  end if;

  insert into public.store_customer_products (
    id,name,slug,sku,product_type,status,short_description,description,category,brand,
    affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,
    unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at,
    customer_features,customer_specifications,customer_delivery_notice,customer_returns_notice,
    customer_warranty_notice,additional_categories,merchandising_tags,fulfilment_model
  ) values (
    new.id,new.name,new.slug,new.sku,new.product_type,new.status,new.short_description,new.description,
    new.category,new.brand,new.affiliate_url,new.currency,new.price,new.compare_at_price,
    new.track_inventory,new.stock_quantity,new.unlimited_stock,new.featured,to_jsonb(new.image_urls),
    new.seo_title,new.seo_description,new.created_at,new.updated_at,
    coalesce(to_jsonb(new.customer_features),'[]'::jsonb),
    coalesce(to_jsonb(new.customer_specifications),'[]'::jsonb),
    new.customer_delivery_notice,new.customer_returns_notice,new.customer_warranty_notice,
    coalesce(new.additional_categories,'{}'::text[]),
    coalesce(new.merchandising_tags,'{}'::text[]),
    new.fulfilment_model
  ) on conflict (id) do update set
    name=excluded.name,slug=excluded.slug,sku=excluded.sku,product_type=excluded.product_type,
    status=excluded.status,short_description=excluded.short_description,description=excluded.description,
    category=excluded.category,brand=excluded.brand,affiliate_url=excluded.affiliate_url,
    currency=excluded.currency,price=excluded.price,compare_at_price=excluded.compare_at_price,
    track_inventory=excluded.track_inventory,stock_quantity=excluded.stock_quantity,
    unlimited_stock=excluded.unlimited_stock,featured=excluded.featured,image_urls=excluded.image_urls,
    seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=excluded.updated_at,
    customer_features=excluded.customer_features,customer_specifications=excluded.customer_specifications,
    customer_delivery_notice=excluded.customer_delivery_notice,customer_returns_notice=excluded.customer_returns_notice,
    customer_warranty_notice=excluded.customer_warranty_notice,
    additional_categories=excluded.additional_categories,
    merchandising_tags=excluded.merchandising_tags,
    fulfilment_model=excluded.fulfilment_model;
  return new;
end; $$;

revoke all on function private.sync_store_customer_product() from public, anon, authenticated;

-- No historical backfill is required for the new merchandising fields. Existing
-- Store products remain unchanged. Future publications and later safe updates
-- flow through the existing trigger automatically.

commit;
