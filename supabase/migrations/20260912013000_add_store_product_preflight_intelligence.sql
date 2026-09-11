-- COSSA STORE PRODUCT MANAGER — PUBLICATION INTELLIGENCE
-- Additive only. Mirrors production publication rules and adds collision diagnostics.

create or replace function public.next_available_store_sku(
  p_prefix text,
  p_start_number integer default 1
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_n integer := greatest(coalesce(p_start_number, 1), 1);
  v_candidate text;
begin
  if coalesce(trim(p_prefix), '') = '' then
    raise exception 'SKU prefix is required';
  end if;

  loop
    v_candidate := upper(trim(p_prefix)) || lpad(v_n::text, 3, '0');
    exit when not exists (
      select 1
      from public.store_products
      where upper(coalesce(sku, '')) = v_candidate
    );
    v_n := v_n + 1;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.store_product_preflight(
  p_product_id uuid default null,
  p_name text default null,
  p_slug text default null,
  p_sku text default null,
  p_product_type text default 'digital',
  p_fulfilment_model text default 'digital',
  p_category text default null,
  p_description text default null,
  p_price numeric default 0,
  p_image_urls text[] default array[]::text[],
  p_digital_file_path text default null,
  p_supplier_name text default null,
  p_supplier_product_ref text default null,
  p_supplier_url text default null,
  p_affiliate_url text default null,
  p_track_inventory boolean default false,
  p_unlimited_stock boolean default true,
  p_stock_quantity integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = public, storage
as $$
declare
  v_issues text[] := array[]::text[];
  v_warnings text[] := array[]::text[];
  v_sku_owner record;
  v_slug_owner record;
  v_file_exists boolean := false;
  v_ready boolean := true;
  v_suggested_sku text := null;
  v_prefix text;
  v_start integer := 1;
begin
  if coalesce(trim(p_name), '') = '' then v_issues := array_append(v_issues, 'name'); end if;
  if coalesce(trim(p_slug), '') = '' then v_issues := array_append(v_issues, 'URL slug'); end if;
  if coalesce(trim(p_category), '') = '' then v_issues := array_append(v_issues, 'category'); end if;
  if coalesce(trim(p_description), '') = '' then v_issues := array_append(v_issues, 'description'); end if;
  if coalesce(cardinality(p_image_urls), 0) = 0 or coalesce(trim(p_image_urls[1]), '') = '' then
    v_issues := array_append(v_issues, 'at least one product image');
  end if;

  if p_product_type <> 'affiliate' and coalesce(trim(p_sku), '') = '' then
    v_issues := array_append(v_issues, 'SKU');
  end if;

  if p_product_type <> 'affiliate' and coalesce(p_price, 0) <= 0 then
    v_issues := array_append(v_issues, 'selling price');
  end if;

  if coalesce(trim(p_sku), '') <> '' then
    select id, name, sku
    into v_sku_owner
    from public.store_products
    where upper(coalesce(sku, '')) = upper(trim(p_sku))
      and (p_product_id is null or id <> p_product_id)
    limit 1;

    if found then
      v_issues := array_append(v_issues, 'unique SKU');
      v_warnings := array_append(
        v_warnings,
        format('SKU %s is already used by %s.', upper(trim(p_sku)), v_sku_owner.name)
      );

      if upper(trim(p_sku)) ~ '^(.*[^0-9])([0-9]+)$' then
        v_prefix := regexp_replace(upper(trim(p_sku)), '([0-9]+)$', '');
        v_start := coalesce((regexp_match(upper(trim(p_sku)), '([0-9]+)$'))[1]::integer + 1, 1);
        v_suggested_sku := public.next_available_store_sku(v_prefix, v_start);
      end if;
    end if;
  end if;

  if coalesce(trim(p_slug), '') <> '' then
    select id, name, slug
    into v_slug_owner
    from public.store_products
    where lower(slug) = lower(trim(p_slug))
      and (p_product_id is null or id <> p_product_id)
    limit 1;

    if found then
      v_issues := array_append(v_issues, 'unique product URL');
      v_warnings := array_append(
        v_warnings,
        format('URL slug %s is already used by %s.', trim(p_slug), v_slug_owner.name)
      );
    end if;
  end if;

  case p_product_type
    when 'digital' then
      if p_fulfilment_model <> 'digital' then v_issues := array_append(v_issues, 'digital fulfilment'); end if;
      if coalesce(trim(p_digital_file_path), '') = '' then
        v_issues := array_append(v_issues, 'digital file');
      else
        select exists (
          select 1
          from storage.objects
          where bucket_id = 'store-digital-products'
            and name = p_digital_file_path
        ) into v_file_exists;
        if not v_file_exists then v_issues := array_append(v_issues, 'uploaded digital file'); end if;
      end if;
    when 'affiliate' then
      if p_fulfilment_model <> 'affiliate' then v_issues := array_append(v_issues, 'affiliate fulfilment'); end if;
      if coalesce(trim(p_supplier_name), '') = '' then v_issues := array_append(v_issues, 'partner or merchant name'); end if;
      if coalesce(trim(p_affiliate_url), '') !~ '^https?://' then v_issues := array_append(v_issues, 'legitimate affiliate URL'); end if;
    when 'pod' then
      if p_fulfilment_model <> 'print_on_demand' then v_issues := array_append(v_issues, 'print-on-demand fulfilment'); end if;
      if coalesce(trim(p_supplier_name), '') = '' then v_issues := array_append(v_issues, 'POD provider'); end if;
      if coalesce(trim(p_supplier_product_ref), '') = '' then v_issues := array_append(v_issues, 'provider product reference'); end if;
    when 'dropshipping' then
      if p_fulfilment_model not in ('local_dropshipping', 'international_dropshipping') then
        v_issues := array_append(v_issues, 'dropshipping fulfilment');
      end if;
      if coalesce(trim(p_supplier_name), '') = '' then v_issues := array_append(v_issues, 'supplier'); end if;
      if coalesce(trim(p_supplier_product_ref), '') = '' and coalesce(trim(p_supplier_url), '') = '' then
        v_issues := array_append(v_issues, 'supplier reference or URL');
      end if;
    when 'physical' then
      if p_fulfilment_model not in ('cossa_stock', 'local_supplier') then v_issues := array_append(v_issues, 'physical fulfilment'); end if;
      if p_track_inventory and not p_unlimited_stock and coalesce(p_stock_quantity, 0) <= 0 then
        v_issues := array_append(v_issues, 'available stock quantity');
      end if;
    else
      v_issues := array_append(v_issues, 'supported product type');
  end case;

  v_ready := cardinality(v_issues) = 0;

  return jsonb_build_object(
    'ready', v_ready,
    'issues', to_jsonb(v_issues),
    'warnings', to_jsonb(v_warnings),
    'duplicate_sku', case
      when v_sku_owner.id is null then null
      else jsonb_build_object('id', v_sku_owner.id, 'name', v_sku_owner.name, 'sku', v_sku_owner.sku)
    end,
    'duplicate_slug', case
      when v_slug_owner.id is null then null
      else jsonb_build_object('id', v_slug_owner.id, 'name', v_slug_owner.name, 'slug', v_slug_owner.slug)
    end,
    'suggested_sku', v_suggested_sku,
    'digital_file_verified', case when p_product_type = 'digital' then v_file_exists else null end
  );
end;
$$;

grant execute on function public.next_available_store_sku(text, integer) to authenticated;
grant execute on function public.store_product_preflight(
  uuid, text, text, text, text, text, text, text, numeric, text[], text,
  text, text, text, text, boolean, boolean, integer
) to authenticated;
