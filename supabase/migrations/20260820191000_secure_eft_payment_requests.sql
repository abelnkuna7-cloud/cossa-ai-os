-- Controlled manual EFT payments for Cossa Store, GROWTH and NexDocs.
-- Sensitive banking details are configured after migration in a private, RLS-protected row.

begin;

create table if not exists public.eft_payment_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  account_holder text not null,
  bank_name text not null,
  account_type text not null,
  account_number text not null,
  branch_code text not null,
  payment_instruction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eft_payment_settings enable row level security;
revoke all on table public.eft_payment_settings from public, anon, authenticated;
grant all on table public.eft_payment_settings to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eft-payment-proofs',
  'eft-payment-proofs',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.saas_plans (
  code,
  name,
  monthly_price_zar,
  ai_mode,
  is_public,
  is_active,
  sort_order
)
values (
  'nexdocs',
  'NexDocs Monthly',
  99,
  'none',
  false,
  true,
  900
)
on conflict (code) do update
set
  name = excluded.name,
  monthly_price_zar = excluded.monthly_price_zar,
  ai_mode = excluded.ai_mode,
  is_public = excluded.is_public,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.eft_payment_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  payer_email text not null,
  purpose text not null check (purpose in ('store_order', 'growth_subscription', 'nexdocs_subscription')),
  store_order_id uuid references public.store_orders(id) on delete restrict,
  plan_code text references public.saas_plans(code) on delete restrict,
  client_request_id uuid,
  reference text not null unique,
  amount numeric not null check (amount >= 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'proof_submitted', 'approved', 'rejected', 'expired', 'cancelled')),
  proof_storage_path text,
  proof_file_name text,
  proof_content_type text,
  proof_file_size bigint,
  payer_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_note text,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_from text not null default 'store' check (created_from in ('store', 'growth', 'nexdocs')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eft_payment_requests_shape check (
    (purpose = 'store_order' and store_order_id is not null and plan_code is null)
    or
    (purpose in ('growth_subscription', 'nexdocs_subscription') and store_order_id is null and plan_code is not null)
  )
);

create unique index if not exists eft_payment_requests_store_order_unique
  on public.eft_payment_requests(store_order_id)
  where store_order_id is not null;

create unique index if not exists eft_payment_requests_client_request_unique
  on public.eft_payment_requests(payer_user_id, client_request_id)
  where client_request_id is not null;

create index if not exists eft_payment_requests_review_queue_idx
  on public.eft_payment_requests(status, created_at desc);

create index if not exists eft_payment_requests_payer_idx
  on public.eft_payment_requests(payer_user_id, created_at desc);

alter table public.eft_payment_requests enable row level security;
revoke all on table public.eft_payment_requests from public, anon, authenticated;
grant all on table public.eft_payment_requests to service_role;

create or replace function public.create_store_eft_payment_request(
  p_payer_user_id uuid,
  p_payer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_client_request_id uuid
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.eft_payment_settings%rowtype;
  v_existing public.eft_payment_requests%rowtype;
  v_payment public.eft_payment_requests%rowtype;
  v_order public.store_orders%rowtype;
  v_product public.store_products%rowtype;
  v_item record;
  v_total numeric := 0;
  v_order_number text;
  v_reference text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Manual payment requests can only be created by the trusted checkout service.'
      using errcode = '42501';
  end if;

  if p_payer_user_id is null
    or coalesce(nullif(trim(p_payer_email), ''), '') = ''
    or char_length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'A signed-in customer name and email are required.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 20 then
    raise exception 'Your cart must contain between one and twenty products.' using errcode = '22023';
  end if;

  select * into v_settings
  from public.eft_payment_settings
  where id = true and enabled = true;

  if not found then
    raise exception 'EFT checkout is temporarily unavailable.' using errcode = '55000';
  end if;

  if p_client_request_id is not null then
    select * into v_existing
    from public.eft_payment_requests
    where payer_user_id = p_payer_user_id
      and client_request_id = p_client_request_id;

    if found then
      return v_existing;
    end if;
  end if;

  for v_item in
    select
      (value ->> 'product_id')::uuid as product_id,
      (value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  loop
    if v_item.product_id is null
      or v_item.quantity is null
      or v_item.quantity < 1
      or v_item.quantity > 25 then
      raise exception 'One or more cart items are invalid.' using errcode = '22023';
    end if;

    select * into v_product
    from public.store_products
    where id = v_item.product_id
    for share;

    if not found
      or v_product.status <> 'active'
      or v_product.product_type = 'affiliate'
      or v_product.fulfilment_model = 'affiliate' then
      raise exception 'One or more products are no longer available for Cossa checkout.' using errcode = '22023';
    end if;

    if v_product.track_inventory
      and not v_product.unlimited_stock
      and v_product.stock_quantity < v_item.quantity then
      raise exception 'One or more products no longer have the requested stock.' using errcode = '22023';
    end if;

    v_total := v_total + (v_product.price * v_item.quantity);
  end loop;

  v_order_number := format(
    'CS-%s-%s',
    to_char(clock_timestamp(), 'YYYYMMDD'),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  v_reference := format(
    'CSEFT-%s-%s',
    to_char(clock_timestamp(), 'YYMMDD'),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  insert into public.store_orders (
    order_number,
    customer_user_id,
    customer_name,
    customer_email,
    customer_phone,
    status,
    payment_provider,
    payment_reference,
    subtotal,
    total,
    metadata
  )
  values (
    v_order_number,
    p_payer_user_id,
    trim(p_customer_name),
    lower(trim(p_payer_email)),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    'pending',
    'eft_manual',
    v_reference,
    v_total,
    v_total,
    jsonb_build_object('payment_method', 'eft_manual')
  )
  returning * into v_order;

  for v_item in
    select
      (value ->> 'product_id')::uuid as product_id,
      (value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.store_products where id = v_item.product_id;

    insert into public.store_order_items (
      order_id,
      product_id,
      product_name,
      sku,
      product_type,
      quantity,
      unit_price,
      line_total,
      metadata
    )
    values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_product.product_type,
      v_item.quantity,
      v_product.price,
      v_product.price * v_item.quantity,
      jsonb_build_object('fulfilment_model', v_product.fulfilment_model)
    );
  end loop;

  insert into public.eft_payment_requests (
    organisation_id,
    payer_user_id,
    payer_email,
    purpose,
    store_order_id,
    client_request_id,
    reference,
    amount,
    created_from
  )
  values (
    v_order.organisation_id,
    p_payer_user_id,
    lower(trim(p_payer_email)),
    'store_order',
    v_order.id,
    p_client_request_id,
    v_reference,
    v_total,
    'store'
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.create_subscription_eft_payment_request(
  p_payer_user_id uuid,
  p_payer_email text,
  p_organisation_id uuid,
  p_plan_code text,
  p_purpose text,
  p_client_request_id uuid
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.eft_payment_settings%rowtype;
  v_plan public.saas_plans%rowtype;
  v_existing public.eft_payment_requests%rowtype;
  v_payment public.eft_payment_requests%rowtype;
  v_reference text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Subscription payment requests can only be created by the trusted billing service.'
      using errcode = '42501';
  end if;

  if p_purpose not in ('growth_subscription', 'nexdocs_subscription') then
    raise exception 'Unsupported subscription payment type.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organisation_members membership
    where membership.organisation_id = p_organisation_id
      and membership.user_id = p_payer_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  ) then
    raise exception 'Only an active organisation owner or administrator can start a subscription payment.'
      using errcode = '42501';
  end if;

  select * into v_settings
  from public.eft_payment_settings
  where id = true and enabled = true;

  if not found then
    raise exception 'EFT checkout is temporarily unavailable.' using errcode = '55000';
  end if;

  select * into v_plan
  from public.saas_plans
  where code = p_plan_code
    and is_active = true
    and monthly_price_zar is not null
    and monthly_price_zar > 0;

  if not found
    or (p_purpose = 'growth_subscription' and p_plan_code not in ('starter', 'professional', 'business'))
    or (p_purpose = 'nexdocs_subscription' and p_plan_code <> 'nexdocs') then
    raise exception 'The selected subscription plan is not available for EFT payment.' using errcode = '22023';
  end if;

  if p_client_request_id is not null then
    select * into v_existing
    from public.eft_payment_requests
    where payer_user_id = p_payer_user_id
      and client_request_id = p_client_request_id;

    if found then
      return v_existing;
    end if;
  end if;

  v_reference := format(
    '%s-%s-%s',
    case when p_purpose = 'nexdocs_subscription' then 'NDEFT' else 'GREFT' end,
    to_char(clock_timestamp(), 'YYMMDD'),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  insert into public.eft_payment_requests (
    organisation_id,
    payer_user_id,
    payer_email,
    purpose,
    plan_code,
    client_request_id,
    reference,
    amount,
    created_from
  )
  values (
    p_organisation_id,
    p_payer_user_id,
    lower(trim(p_payer_email)),
    p_purpose,
    p_plan_code,
    p_client_request_id,
    v_reference,
    v_plan.monthly_price_zar,
    case when p_purpose = 'nexdocs_subscription' then 'nexdocs' else 'growth' end
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.approve_eft_payment_request(
  p_payment_request_id uuid,
  p_reviewer_id uuid,
  p_reviewer_note text default null
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.eft_payment_requests%rowtype;
  v_order public.store_orders%rowtype;
  v_item record;
  v_subscription_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the trusted payment service can approve EFT payments.' using errcode = '42501';
  end if;

  select * into v_payment
  from public.eft_payment_requests
  where id = p_payment_request_id
  for update;

  if not found then
    raise exception 'Payment request not found.' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'proof_submitted' then
    raise exception 'Only payment requests with submitted proof can be approved.' using errcode = '55000';
  end if;

  if v_payment.expires_at <= now() then
    update public.eft_payment_requests
    set status = 'expired', updated_at = now()
    where id = v_payment.id;
    raise exception 'This payment request has expired.' using errcode = '55000';
  end if;

  if v_payment.purpose = 'store_order' then
    select * into v_order
    from public.store_orders
    where id = v_payment.store_order_id
    for update;

    if not found or v_order.status <> 'pending' then
      raise exception 'This order cannot be approved in its current state.' using errcode = '55000';
    end if;

    for v_item in
      select
        item.id as order_item_id,
        item.product_id,
        item.quantity,
        item.product_type,
        product.track_inventory,
        product.unlimited_stock,
        product.stock_quantity,
        product.digital_file_path,
        product.digital_download_limit,
        product.digital_access_days
      from public.store_order_items item
      join public.store_products product on product.id = item.product_id
      where item.order_id = v_order.id
      for update of product
    loop
      if v_item.track_inventory
        and not v_item.unlimited_stock
        and v_item.stock_quantity < v_item.quantity then
        raise exception 'Stock is no longer available for one or more ordered products.' using errcode = '55000';
      end if;

      if v_item.track_inventory and not v_item.unlimited_stock then
        update public.store_products
        set stock_quantity = stock_quantity - v_item.quantity,
            updated_at = now()
        where id = v_item.product_id;
      end if;

      if v_item.product_type = 'digital' then
        if coalesce(nullif(trim(v_item.digital_file_path), ''), '') = '' then
          raise exception 'A purchased digital product has no configured fulfilment file.' using errcode = '55000';
        end if;

        insert into public.store_digital_entitlements (
          order_id,
          order_item_id,
          product_id,
          customer_email,
          storage_path,
          download_limit,
          expires_at
        )
        values (
          v_order.id,
          v_item.order_item_id,
          v_item.product_id,
          v_order.customer_email,
          v_item.digital_file_path,
          coalesce(v_item.digital_download_limit, 3),
          case
            when v_item.digital_access_days is null then null
            else now() + make_interval(days => v_item.digital_access_days)
          end
        )
        on conflict (order_item_id) do nothing;
      end if;
    end loop;

    update public.store_orders
    set
      status = 'paid',
      payment_provider = 'eft_manual',
      payment_reference = v_payment.reference,
      paid_at = now(),
      updated_at = now()
    where id = v_order.id;
  elsif v_payment.purpose = 'growth_subscription' then
    insert into public.saas_subscriptions (
      organisation_id,
      plan_code,
      status,
      monthly_price_zar,
      current_period_start,
      current_period_end,
      provider,
      provider_subscription_id
    )
    values (
      v_payment.organisation_id,
      v_payment.plan_code,
      'active',
      v_payment.amount,
      now(),
      now() + interval '1 month',
      'eft_manual',
      v_payment.reference
    )
    on conflict (organisation_id) do update
    set
      plan_code = excluded.plan_code,
      status = 'active',
      monthly_price_zar = excluded.monthly_price_zar,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      provider = excluded.provider,
      provider_subscription_id = excluded.provider_subscription_id,
      updated_at = now();
  elsif v_payment.purpose = 'nexdocs_subscription' then
    select id into v_subscription_id
    from public.organisation_subscriptions
    where organisation_id = v_payment.organisation_id
    order by updated_at desc
    limit 1
    for update;

    if v_subscription_id is null then
      insert into public.organisation_subscriptions (
        organisation_id,
        plan_code,
        status,
        current_period_started_at,
        current_period_ends_at,
        provider,
        provider_subscription_id
      )
      values (
        v_payment.organisation_id,
        'nexdocs',
        'active',
        now(),
        now() + interval '1 month',
        'eft_manual',
        v_payment.reference
      );
    else
      update public.organisation_subscriptions
      set
        plan_code = 'nexdocs',
        status = 'active',
        current_period_started_at = now(),
        current_period_ends_at = now() + interval '1 month',
        provider = 'eft_manual',
        provider_subscription_id = v_payment.reference,
        updated_at = now()
      where id = v_subscription_id;
    end if;
  end if;

  update public.eft_payment_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = p_reviewer_id,
    reviewer_note = nullif(left(trim(coalesce(p_reviewer_note, '')), 2000), ''),
    updated_at = now()
  where id = v_payment.id
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.reject_eft_payment_request(
  p_payment_request_id uuid,
  p_reviewer_id uuid,
  p_reviewer_note text
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.eft_payment_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the trusted payment service can reject EFT payments.' using errcode = '42501';
  end if;

  update public.eft_payment_requests
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = p_reviewer_id,
    reviewer_note = nullif(left(trim(coalesce(p_reviewer_note, '')), 2000), ''),
    updated_at = now()
  where id = p_payment_request_id
    and status = 'proof_submitted'
  returning * into v_payment;

  if not found then
    raise exception 'Only a payment request with submitted proof can be rejected.' using errcode = '55000';
  end if;

  return v_payment;
end;
$$;

revoke all on function public.create_store_eft_payment_request(uuid, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.create_subscription_eft_payment_request(uuid, text, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.approve_eft_payment_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_eft_payment_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_store_eft_payment_request(uuid, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.create_subscription_eft_payment_request(uuid, text, uuid, text, text, uuid) to service_role;
grant execute on function public.approve_eft_payment_request(uuid, uuid, text) to service_role;
grant execute on function public.reject_eft_payment_request(uuid, uuid, text) to service_role;

commit;
