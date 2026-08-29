-- Internal supplier-registry and product-intake enrichment only.
-- Deliberately does not touch store_products, store_public_products, catalogue
-- sync functions, publication triggers, or customer-facing behaviour.

begin;

alter table public.store_suppliers
  add column if not exists registry_status text not null default 'pending'
    check (registry_status in ('candidate', 'pending', 'active', 'paused', 'rejected')),
  add column if not exists recognised_domains jsonb not null default '[]'::jsonb,
  add column if not exists contact_information text,
  add column if not exists account_reference text,
  add column if not exists sku_terminology text,
  add column if not exists default_fulfilment_profile_code text,
  add column if not exists default_delivery_payer text
    check (default_delivery_payer is null or default_delivery_payer in ('customer', 'cossa', 'conditional', 'not_applicable')),
  add column if not exists default_free_shipping_eligible boolean not null default false,
  add column if not exists sync_method text,
  add column if not exists returns_notes text,
  add column if not exists warranty_notes text,
  add column if not exists pricing_import_notes text,
  add column if not exists agreement_policy_reference text;

alter table public.store_inventory_intakes
  add column if not exists supplier_cost_confidence text not null default 'unconfirmed'
    check (supplier_cost_confidence in ('high', 'medium', 'low', 'unconfirmed')),
  add column if not exists supplier_cost_source_label text,
  add column if not exists supplier_rrp numeric(12, 2),
  add column if not exists supplier_rrp_source_label text,
  add column if not exists supplier_sale_price numeric(12, 2),
  add column if not exists supplier_sale_price_source_label text,
  add column if not exists supplier_category text,
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists import_trace jsonb not null default '[]'::jsonb;

create table if not exists public.store_supplier_category_mappings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id),
  supplier_category text not null,
  cossa_category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, supplier_id, supplier_category)
);

create index if not exists store_supplier_category_mappings_lookup_idx
  on public.store_supplier_category_mappings (organisation_id, supplier_id, supplier_category);

alter table public.store_supplier_category_mappings enable row level security;

create policy "members read supplier category mappings"
on public.store_supplier_category_mappings for select to authenticated
using ((select private.is_organisation_member(organisation_id)));

create policy "store leaders manage supplier category mappings"
on public.store_supplier_category_mappings for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin', 'manager'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin', 'manager'])));

revoke all on table public.store_supplier_category_mappings from public, anon;
grant select, insert, update on table public.store_supplier_category_mappings to authenticated;

-- DMC is an existing internal supplier. This simply configures its verified
-- public domain and existing operational defaults; it creates no product row.
update public.store_suppliers
set
  source_url = coalesce(source_url, 'https://dmcwholesale.co.za'),
  recognised_domains = case
    when jsonb_array_length(recognised_domains) = 0 then '["dmcwholesale.co.za"]'::jsonb
    else recognised_domains
  end,
  registry_status = case
    when status in ('active', 'pending', 'paused', 'rejected') then status
    else registry_status
  end,
  default_fulfilment_profile_code = coalesce(default_fulfilment_profile_code, 'dmc-sa-customer-paid'),
  default_delivery_payer = coalesce(default_delivery_payer, 'customer'),
  default_free_shipping_eligible = false,
  sync_method = coalesce(sync_method, 'manual supplier-page check')
where organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
  and code = 'dmc-wholesale';

commit;
