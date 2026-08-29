-- Controlled Store publication bridge.
--
-- This is deliberately a one-intake-to-one-product action. It does not run a
-- bulk catalogue sync and it does not modify any existing catalogue row.

begin;

-- Keep the durable intake -> canonical Store product relationship. The link is
-- retained on unpublish so a retry/reactivation cannot create a duplicate.
alter table public.store_inventory_intakes
  add column if not exists publication_store_product_id uuid references public.store_products(id) on delete restrict,
  add column if not exists published_at timestamptz,
  add column if not exists last_unpublished_at timestamptz;

create unique index if not exists store_inventory_intakes_publication_product_unique
  on public.store_inventory_intakes (publication_store_product_id)
  where publication_store_product_id is not null;

alter table public.store_inventory_intakes
  drop constraint if exists store_inventory_intakes_approval_status_check;
alter table public.store_inventory_intakes
  add constraint store_inventory_intakes_approval_status_check
  check (approval_status in ('imported', 'review', 'draft', 'approved', 'published', 'paused'));

alter table public.store_inventory_intake_lifecycle_history
  drop constraint if exists store_inventory_intake_lifecycle_history_new_status_check;
alter table public.store_inventory_intake_lifecycle_history
  add constraint store_inventory_intake_lifecycle_history_new_status_check
  check (new_status in ('imported', 'review', 'draft', 'approved', 'published', 'paused'));

-- Shopper-safe structured product information. These columns do not contain
-- cost, supplier account, supplier URL, evidence or operational data.
alter table public.store_products
  add column if not exists customer_features jsonb not null default '[]'::jsonb,
  add column if not exists customer_specifications text,
  add column if not exists customer_delivery_notice text,
  add column if not exists customer_returns_notice text,
  add column if not exists customer_warranty_notice text;

alter table public.store_public_products
  add column if not exists customer_features jsonb not null default '[]'::jsonb,
  add column if not exists customer_specifications text,
  add column if not exists customer_delivery_notice text,
  add column if not exists customer_returns_notice text,
  add column if not exists customer_warranty_notice text;

-- Publication history is append-only for browser roles. It stores the actor,
-- lifecycle transition and canonical product link without exposing it to the
-- shopper catalogue.
create table if not exists public.store_inventory_publication_history (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  intake_id uuid not null references public.store_inventory_intakes(id) on delete restrict,
  store_product_id uuid not null references public.store_products(id) on delete restrict,
  action text not null check (action in ('published', 'unpublished')),
  previous_status text not null,
  new_status text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  public_slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists store_inventory_publication_history_intake_created_idx
  on public.store_inventory_publication_history (intake_id, created_at desc);

alter table public.store_inventory_publication_history enable row level security;
drop policy if exists "store leaders read inventory publication history"
  on public.store_inventory_publication_history;
create policy "store leaders read inventory publication history"
  on public.store_inventory_publication_history for select to authenticated
  using ((select private.has_organisation_role(organisation_id, array['owner', 'admin', 'manager'])));
revoke all on table public.store_inventory_publication_history from public, anon, authenticated;
grant select on table public.store_inventory_publication_history to authenticated;

-- The existing catalogue projection is intentionally retained. This small
-- extension projects only the new shopper-safe fields, leaving every existing
-- field and the affiliate supplier-identity rule unchanged.
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
    seo_title, seo_description, created_at, updated_at, fulfilment_model, partner_name,
    customer_features, customer_specifications, customer_delivery_notice,
    customer_returns_notice, customer_warranty_notice
  ) values (
    new.id, new.name, new.slug, new.sku, new.product_type, new.status,
    new.short_description, new.description, new.category, new.brand,
    new.affiliate_url, new.currency, new.price, new.compare_at_price,
    new.track_inventory, new.stock_quantity, new.unlimited_stock, new.featured,
    new.image_urls, new.seo_title, new.seo_description, new.created_at,
    new.updated_at, new.fulfilment_model,
    case when new.product_type = 'affiliate' then new.supplier_name else null end,
    new.customer_features, new.customer_specifications, new.customer_delivery_notice,
    new.customer_returns_notice, new.customer_warranty_notice
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
    partner_name = excluded.partner_name,
    customer_features = excluded.customer_features,
    customer_specifications = excluded.customer_specifications,
    customer_delivery_notice = excluded.customer_delivery_notice,
    customer_returns_notice = excluded.customer_returns_notice,
    customer_warranty_notice = excluded.customer_warranty_notice;

  return new;
end;
$$;
revoke all on function private.sync_store_public_product() from public, anon, authenticated, service_role;

create or replace function private.store_inventory_publication_slug(p_name text, p_intake_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(p_name, ''))), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ),
    100
  ) || '-cossa-' || substring(md5(p_intake_id::text) from 1 for 10);
$$;
revoke all on function private.store_inventory_publication_slug(text, uuid) from public, anon, authenticated;

create or replace function private.store_inventory_publication_sku(p_intake_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'COS-' || upper(substring(md5(p_intake_id::text) from 1 for 12));
$$;
revoke all on function private.store_inventory_publication_sku(uuid) from public, anon, authenticated;

-- This is the one trusted server-side source for the customer preview and the
-- final publish validation. It intentionally returns only customer-safe data.
create or replace function private.store_inventory_publication_preflight(p_intake_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intake public.store_inventory_intakes%rowtype;
  v_supplier_name text;
  v_supplier_status text;
  v_registry_status text;
  v_profile_active boolean;
  v_delivery_notice text;
  v_returns_notice text;
  v_warranty_notice text;
  v_free_shipping boolean;
  v_price numeric;
  v_compare_at numeric;
  v_product_type text;
  v_fulfilment_model text;
  v_fulfilment_label text;
  v_brand text;
  v_blockers jsonb := '[]'::jsonb;
  v_images text[];
  v_features jsonb;
begin
  select * into v_intake
  from public.store_inventory_intakes
  where id = p_intake_id;

  if not found then
    return jsonb_build_object(
      'ready', false,
      'blockers', jsonb_build_array(jsonb_build_object('code', 'intake_not_found', 'message', 'This intake no longer exists.')),
      'customer', null
    );
  end if;

  select
    supplier.name,
    supplier.status,
    supplier.registry_status,
    profile.is_active,
    profile.customer_delivery_notice,
    profile.customer_returns_notice,
    profile.customer_warranty_notice,
    profile.free_shipping_eligible
  into
    v_supplier_name,
    v_supplier_status,
    v_registry_status,
    v_profile_active,
    v_delivery_notice,
    v_returns_notice,
    v_warranty_notice,
    v_free_shipping
  from public.store_suppliers supplier
  left join public.store_fulfilment_profiles profile on profile.id = v_intake.fulfilment_profile_id
  where supplier.id = v_intake.supplier_id;

  v_price := coalesce(v_intake.selling_price_override, v_intake.calculated_selling_price);
  v_compare_at := v_intake.compare_at_price;
  v_images := array(select jsonb_array_elements_text(coalesce(v_intake.image_urls, '[]'::jsonb)));
  v_features := case
    when jsonb_typeof(v_intake.features) = 'array' then v_intake.features
    else '[]'::jsonb
  end;

  v_product_type := case v_intake.business_model
    when 'affiliate' then 'affiliate'
    when 'marketplace' then 'affiliate'
    when 'pod' then 'pod'
    when 'dropship' then 'dropshipping'
    else 'physical'
  end;
  v_fulfilment_model := case v_intake.business_model
    when 'affiliate' then 'affiliate'
    when 'marketplace' then 'affiliate'
    when 'pod' then 'print_on_demand'
    when 'cossa_stock' then 'cossa_stock'
    when 'dropship' then case
      when coalesce(v_intake.stock_origin, '') ~* '(^|[^a-z])(south africa|local|sa)([^a-z]|$)' then 'local_dropshipping'
      else 'international_dropshipping'
    end
    else 'local_supplier'
  end;
  v_fulfilment_label := case
    when v_fulfilment_model = 'affiliate' then 'Partner offer'
    when v_fulfilment_model = 'print_on_demand' then 'Produced after ordering'
    when v_fulfilment_model = 'local_dropshipping' then 'Local SA fulfilment'
    when v_fulfilment_model = 'international_dropshipping' then 'International fulfilment'
    when v_fulfilment_model = 'cossa_stock' then 'Cossa Store fulfilment'
    else 'Local fulfilment'
  end;

  -- A supplier-provided token is not enough to claim a manufacturer. Preserve
  -- a brand only when the trace explicitly identifies manufacturer evidence.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_intake.import_trace, '[]'::jsonb)) trace(item)
    where lower(coalesce(trace.item ->> 'field', '')) = 'brand'
      and coalesce(trace.item ->> 'sourceLabel', '') ilike '%manufacturer%'
  ) then
    v_brand := nullif(btrim(v_intake.brand), '');
  else
    v_brand := null;
  end if;

  if v_intake.approval_status not in ('approved', 'published') then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'approval_required', 'message', 'Approve this intake before publishing it to Store.'));
  end if;
  if v_supplier_status <> 'active' or coalesce(v_registry_status, v_supplier_status) <> 'active' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'supplier_not_active', 'message', 'Select an active recognised supplier before publishing.'));
  end if;
  if coalesce(btrim(v_intake.name), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'title_missing', 'message', 'Add a customer product title.'));
  end if;
  if coalesce(btrim(v_intake.category), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'category_missing', 'message', 'Choose a Cossa Store category.'));
  end if;
  if coalesce(btrim(v_intake.short_description), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'short_description_missing', 'message', 'Add a customer short description.'));
  end if;
  if coalesce(btrim(v_intake.description), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'description_missing', 'message', 'Add a customer full description.'));
  end if;
  if cardinality(v_images) = 0 or coalesce(v_images[1], '') !~* '^https?://' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'main_image_missing', 'message', 'Add a valid main product image.'));
  end if;
  if v_price is null or v_price <= 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'selling_price_missing', 'message', 'Set a positive final selling price.'));
  end if;
  if v_compare_at is not null and (v_price is null or v_compare_at < v_price) then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'compare_at_invalid', 'message', 'Compare-at price must be blank or at least the selling price.'));
  end if;
  if v_product_type <> 'affiliate' and v_intake.stock_status <> 'available' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'availability_missing', 'message', 'Confirm customer availability before publishing.'));
  end if;
  if v_profile_active is distinct from true or coalesce(btrim(v_delivery_notice), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'delivery_notice_missing', 'message', 'Add an active customer-facing delivery notice.'));
  end if;
  if coalesce(btrim(v_returns_notice), '') = '' and coalesce(btrim(v_warranty_notice), '') = '' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'returns_warranty_missing', 'message', 'Add customer-facing returns or warranty treatment.'));
  end if;
  if concat_ws(' ', v_intake.name, v_intake.short_description, v_intake.description, v_intake.specifications) ilike '%&#x20;%' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'encoding_artifact', 'message', 'Remove the literal &#x20; encoding artefact from customer copy.'));
  end if;
  if coalesce(btrim(private.store_inventory_publication_slug(v_intake.name, v_intake.id)), '') = '-cossa-' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'slug_missing', 'message', 'A Store URL slug could not be created from the product title.'));
  end if;

  return jsonb_build_object(
    'ready', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'customer', jsonb_build_object(
      'name', v_intake.name,
      'slug', private.store_inventory_publication_slug(v_intake.name, v_intake.id),
      'sku', private.store_inventory_publication_sku(v_intake.id),
      'category', v_intake.category,
      'brand', v_brand,
      'shortDescription', v_intake.short_description,
      'description', v_intake.description,
      'features', v_features,
      'specifications', v_intake.specifications,
      'imageUrls', to_jsonb(v_images),
      'availability', case when v_intake.stock_status = 'available' then 'Available' else null end,
      'fulfilmentLabel', v_fulfilment_label,
      'deliveryNotice', v_delivery_notice,
      'returnsNotice', v_returns_notice,
      'warrantyNotice', v_warranty_notice,
      'freeShippingEligible', coalesce(v_free_shipping, false),
      'price', v_price,
      'compareAtPrice', case when v_compare_at is not null and v_price is not null and v_compare_at >= v_price then v_compare_at else null end,
      'productType', v_product_type,
      'fulfilmentModel', v_fulfilment_model
    )
  );
end;
$$;
revoke all on function private.store_inventory_publication_preflight(uuid) from public, anon, authenticated;

create or replace function private.assert_store_inventory_publication_actor(
  p_organisation_id uuid,
  p_actor_id uuid,
  p_owner_only boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (
    select 1
    from public.organisation_members member
    where member.organisation_id = p_organisation_id
      and member.user_id = p_actor_id
      and member.status = 'active'
      and (
        (p_owner_only and member.role = 'owner')
        or (not p_owner_only and member.role in ('owner', 'admin', 'manager'))
      )
  ) then
    raise exception 'An authorised Cossa Store leader is required.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.assert_store_inventory_publication_actor(uuid, uuid, boolean) from public, anon, authenticated;

-- Browser callers cannot invoke this: the Growth server verifies the signed-in
-- CEO, then calls this service-role-only RPC with that verified actor ID.
create or replace function public.store_inventory_publication_preflight(
  p_intake_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organisation_id uuid;
begin
  select organisation_id into v_organisation_id
  from public.store_inventory_intakes where id = p_intake_id;
  if v_organisation_id is null then
    raise exception 'Store intake not found.' using errcode = 'P0002';
  end if;
  perform private.assert_store_inventory_publication_actor(v_organisation_id, p_actor_id, false);
  return private.store_inventory_publication_preflight(p_intake_id);
end;
$$;
revoke all on function public.store_inventory_publication_preflight(uuid, uuid) from public, anon, authenticated;
grant execute on function public.store_inventory_publication_preflight(uuid, uuid) to service_role;

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

  if old.approval_status = 'approved'
    and new.approval_status = 'published'
    and current_setting('app.store_inventory_publication', true) = 'publish' then
    return new;
  end if;

  if old.approval_status = 'published'
    and new.approval_status = 'approved'
    and current_setting('app.store_inventory_publication', true) = 'unpublish' then
    return new;
  end if;

  raise exception 'Invalid inventory intake lifecycle transition: % to %', old.approval_status, new.approval_status
    using errcode = '23514';
end;
$$;
revoke all on function private.guard_store_inventory_intake_lifecycle() from public, anon, authenticated;

create or replace function private.guard_store_inventory_publication_linkage()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.publication_store_product_id is distinct from old.publication_store_product_id
    and current_setting('app.store_inventory_publication', true) <> 'publish' then
    raise exception 'Store product linkage can only be set by the controlled publication action.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_store_inventory_publication_linkage() from public, anon, authenticated;
drop trigger if exists store_inventory_intakes_guard_publication_linkage on public.store_inventory_intakes;
create trigger store_inventory_intakes_guard_publication_linkage
before update of publication_store_product_id on public.store_inventory_intakes
for each row execute function private.guard_store_inventory_publication_linkage();

create or replace function public.publish_store_inventory_intake(
  p_intake_id uuid,
  p_actor_id uuid
)
returns table (store_product_id uuid, public_slug text, publication_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intake public.store_inventory_intakes%rowtype;
  v_supplier public.store_suppliers%rowtype;
  v_preflight jsonb;
  v_customer jsonb;
  v_product_id uuid;
  v_public public.store_public_products%rowtype;
  v_images text[];
  v_price numeric;
  v_compare_at numeric;
  v_product_type text;
  v_fulfilment_model text;
  v_inventory_ownership text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_intake_id::text, 0));

  select * into v_intake
  from public.store_inventory_intakes
  where id = p_intake_id
  for update;
  if not found then
    raise exception 'Store intake not found.' using errcode = 'P0002';
  end if;

  perform private.assert_store_inventory_publication_actor(v_intake.organisation_id, p_actor_id, true);
  v_preflight := private.store_inventory_publication_preflight(v_intake.id);
  if not coalesce((v_preflight ->> 'ready')::boolean, false) then
    raise exception 'Store publication preflight failed: %', coalesce(v_preflight -> 'blockers', '[]'::jsonb)::text
      using errcode = '23514';
  end if;

  select * into v_supplier from public.store_suppliers where id = v_intake.supplier_id;
  v_customer := v_preflight -> 'customer';
  v_price := (v_customer ->> 'price')::numeric;
  v_compare_at := nullif(v_customer ->> 'compareAtPrice', '')::numeric;
  v_product_type := v_customer ->> 'productType';
  v_fulfilment_model := v_customer ->> 'fulfilmentModel';
  v_images := array(select jsonb_array_elements_text(coalesce(v_customer -> 'imageUrls', '[]'::jsonb)));
  v_product_id := v_intake.publication_store_product_id;

  if v_intake.approval_status = 'published' and v_product_id is not null then
    select * into v_public from public.store_public_products where id = v_product_id;
    if not found or v_public.status <> 'active' then
      raise exception 'Published intake has no active public Store projection.' using errcode = '23514';
    end if;
    return query select v_product_id, v_public.slug, 'already_published'::text;
    return;
  end if;
  if v_intake.approval_status <> 'approved' then
    raise exception 'Only approved Store intakes can be published.' using errcode = '23514';
  end if;

  v_inventory_ownership := case
    when v_product_type = 'affiliate' then 'affiliate_merchant'
    when v_product_type = 'pod' then 'pod_managed'
    when v_fulfilment_model = 'cossa_stock' then 'cossa_owned'
    else 'supplier_managed'
  end;

  if v_product_id is null then
    v_product_id := gen_random_uuid();
    insert into public.store_products (
      id, organisation_id, name, slug, sku, product_type, status,
      short_description, description, category, brand, supplier_name,
      supplier_product_ref, supplier_url, affiliate_url, cost_price, price,
      compare_at_price, track_inventory, stock_quantity, unlimited_stock, featured,
      image_urls, seo_title, seo_description, fulfilment_model,
      inventory_ownership, inventory_source_status, inventory_source_reference,
      inventory_last_verified_at, created_by, updated_by, customer_features,
      customer_specifications, customer_delivery_notice, customer_returns_notice,
      customer_warranty_notice
    ) values (
      v_product_id, v_intake.organisation_id, v_customer ->> 'name',
      v_customer ->> 'slug', v_customer ->> 'sku', v_product_type, 'active',
      v_customer ->> 'shortDescription', v_customer ->> 'description',
      v_customer ->> 'category', nullif(v_customer ->> 'brand', ''), v_supplier.name,
      v_intake.supplier_product_ref, v_intake.source_url, v_intake.affiliate_url,
      coalesce(v_intake.supplier_cost, 0), v_price, v_compare_at, false, 0, false, false,
      v_images, v_customer ->> 'name', v_customer ->> 'shortDescription', v_fulfilment_model,
      v_inventory_ownership, v_intake.sync_status, v_intake.supplier_product_ref,
      coalesce(v_intake.last_stock_checked_at, now()), p_actor_id, p_actor_id,
      coalesce(v_customer -> 'features', '[]'::jsonb), v_customer ->> 'specifications',
      v_customer ->> 'deliveryNotice', v_customer ->> 'returnsNotice', v_customer ->> 'warrantyNotice'
    );
  else
    update public.store_products set
      name = v_customer ->> 'name',
      slug = v_customer ->> 'slug',
      sku = v_customer ->> 'sku',
      product_type = v_product_type,
      status = 'active',
      short_description = v_customer ->> 'shortDescription',
      description = v_customer ->> 'description',
      category = v_customer ->> 'category',
      brand = nullif(v_customer ->> 'brand', ''),
      supplier_name = v_supplier.name,
      supplier_product_ref = v_intake.supplier_product_ref,
      supplier_url = v_intake.source_url,
      affiliate_url = v_intake.affiliate_url,
      cost_price = coalesce(v_intake.supplier_cost, 0),
      price = v_price,
      compare_at_price = v_compare_at,
      track_inventory = false,
      stock_quantity = 0,
      unlimited_stock = false,
      image_urls = v_images,
      seo_title = v_customer ->> 'name',
      seo_description = v_customer ->> 'shortDescription',
      fulfilment_model = v_fulfilment_model,
      inventory_ownership = v_inventory_ownership,
      inventory_source_status = v_intake.sync_status,
      inventory_source_reference = v_intake.supplier_product_ref,
      inventory_last_verified_at = coalesce(v_intake.last_stock_checked_at, now()),
      updated_by = p_actor_id,
      customer_features = coalesce(v_customer -> 'features', '[]'::jsonb),
      customer_specifications = v_customer ->> 'specifications',
      customer_delivery_notice = v_customer ->> 'deliveryNotice',
      customer_returns_notice = v_customer ->> 'returnsNotice',
      customer_warranty_notice = v_customer ->> 'warrantyNotice'
    where id = v_product_id and organisation_id = v_intake.organisation_id;
    if not found then
      raise exception 'The linked Store product is unavailable for safe re-publication.' using errcode = '23514';
    end if;
  end if;

  select * into v_public from public.store_public_products where id = v_product_id;
  if not found
    or v_public.status <> 'active'
    or v_public.price <> v_price
    or v_public.slug <> (v_customer ->> 'slug')
    or v_public.category <> (v_customer ->> 'category')
    or (v_product_type <> 'affiliate' and v_public.partner_name is not null)
    or v_public.customer_delivery_notice is distinct from (v_customer ->> 'deliveryNotice') then
    raise exception 'The canonical Store product did not produce the required safe public projection.' using errcode = '23514';
  end if;

  perform set_config('app.store_inventory_publication', 'publish', true);
  perform set_config('app.store_inventory_actor', p_actor_id::text, true);
  update public.store_inventory_intakes
  set publication_store_product_id = v_product_id,
      approval_status = 'published',
      published_at = now()
  where id = v_intake.id;

  insert into public.store_inventory_publication_history (
    organisation_id, intake_id, store_product_id, action, previous_status,
    new_status, actor_user_id, public_slug
  ) values (
    v_intake.organisation_id, v_intake.id, v_product_id, 'published', 'approved',
    'published', p_actor_id, v_public.slug
  );

  return query select v_product_id, v_public.slug, 'published'::text;
end;
$$;
revoke all on function public.publish_store_inventory_intake(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_store_inventory_intake(uuid, uuid) to service_role;

create or replace function public.unpublish_store_inventory_intake(
  p_intake_id uuid,
  p_actor_id uuid
)
returns table (store_product_id uuid, public_slug text, publication_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intake public.store_inventory_intakes%rowtype;
  v_product public.store_products%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_intake_id::text, 0));
  select * into v_intake from public.store_inventory_intakes where id = p_intake_id for update;
  if not found then
    raise exception 'Store intake not found.' using errcode = 'P0002';
  end if;
  perform private.assert_store_inventory_publication_actor(v_intake.organisation_id, p_actor_id, true);
  if v_intake.publication_store_product_id is null then
    raise exception 'This intake has no linked Store product to unpublish.' using errcode = '23514';
  end if;
  select * into v_product from public.store_products where id = v_intake.publication_store_product_id for update;
  if not found then
    raise exception 'The linked Store product no longer exists.' using errcode = '23514';
  end if;

  if v_intake.approval_status = 'approved' and v_product.status = 'archived' then
    return query select v_product.id, v_product.slug, 'already_unpublished'::text;
    return;
  end if;
  if v_intake.approval_status <> 'published' then
    raise exception 'Only published Store intakes can be unpublished.' using errcode = '23514';
  end if;

  update public.store_products
  set status = 'archived', updated_by = p_actor_id
  where id = v_product.id;
  if exists (select 1 from public.store_public_products where id = v_product.id) then
    raise exception 'The public Store projection remained visible after unpublish.' using errcode = '23514';
  end if;

  perform set_config('app.store_inventory_publication', 'unpublish', true);
  perform set_config('app.store_inventory_actor', p_actor_id::text, true);
  update public.store_inventory_intakes
  set approval_status = 'approved', last_unpublished_at = now()
  where id = v_intake.id;

  insert into public.store_inventory_publication_history (
    organisation_id, intake_id, store_product_id, action, previous_status,
    new_status, actor_user_id, public_slug
  ) values (
    v_intake.organisation_id, v_intake.id, v_product.id, 'unpublished', 'published',
    'approved', p_actor_id, v_product.slug
  );
  return query select v_product.id, v_product.slug, 'unpublished'::text;
end;
$$;
revoke all on function public.unpublish_store_inventory_intake(uuid, uuid) from public, anon, authenticated;
grant execute on function public.unpublish_store_inventory_intake(uuid, uuid) to service_role;

commit;
