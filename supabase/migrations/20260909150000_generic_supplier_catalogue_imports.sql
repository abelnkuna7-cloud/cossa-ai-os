-- Generic supplier catalogue import evidence. Additive only: no publication,
-- product, payment, or existing supplier data is changed by this migration.
begin;

alter table public.store_inventory_intakes
  add column if not exists supplier_available_stock numeric,
  add column if not exists source_file_name text,
  add column if not exists source_observed_at timestamptz,
  add column if not exists source_content_hash text,
  add column if not exists last_import_batch_id uuid;

create table public.store_supplier_import_batches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id),
  source_type text not null check (source_type in ('csv', 'xlsx', 'api', 'feed', 'manual')),
  source_file_name text,
  source_content_hash text not null,
  source_observed_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  source_rows integer not null default 0 check (source_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  new_skus integer not null default 0 check (new_skus >= 0),
  updated_skus integer not null default 0 check (updated_skus >= 0),
  unchanged_skus integer not null default 0 check (unchanged_skus >= 0),
  available_skus integer not null default 0 check (available_skus >= 0),
  unavailable_skus integer not null default 0 check (unavailable_skus >= 0),
  supplier_available_units numeric,
  stock_changes integer not null default 0 check (stock_changes >= 0),
  cost_changes integer not null default 0 check (cost_changes >= 0),
  rrp_changes integer not null default 0 check (rrp_changes >= 0),
  newly_unavailable integer not null default 0 check (newly_unavailable >= 0),
  back_in_stock integer not null default 0 check (back_in_stock >= 0),
  missing_from_source integer not null default 0 check (missing_from_source >= 0),
  summary jsonb not null default '{}'::jsonb,
  error_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (supplier_id, source_content_hash)
);

alter table public.store_inventory_intakes
  add constraint store_inventory_intakes_last_import_batch_fk
  foreign key (last_import_batch_id) references public.store_supplier_import_batches(id);

create table public.store_supplier_import_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id),
  import_batch_id uuid not null references public.store_supplier_import_batches(id),
  intake_id uuid references public.store_inventory_intakes(id),
  supplier_product_ref text,
  source_row_hash text not null,
  event_type text not null check (event_type in ('accepted','rejected','new','unchanged','stock_changed','cost_changed','rrp_changed','unavailable','back_in_stock','missing_from_source')),
  previous_evidence jsonb not null default '{}'::jsonb,
  observed_evidence jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  unique (import_batch_id, source_row_hash, event_type)
);

create index store_supplier_import_batches_supplier_created_idx on public.store_supplier_import_batches (supplier_id, created_at desc);
create index store_supplier_import_batches_org_status_idx on public.store_supplier_import_batches (organisation_id, status, created_at desc);
create index store_supplier_import_events_intake_created_idx on public.store_supplier_import_events (intake_id, created_at desc);
create index store_supplier_import_events_supplier_event_idx on public.store_supplier_import_events (supplier_id, event_type, created_at desc);
create index store_inventory_intakes_supplier_stock_idx on public.store_inventory_intakes (supplier_id, supplier_available_stock, last_stock_checked_at);

alter table public.store_supplier_import_batches enable row level security;
alter table public.store_supplier_import_events enable row level security;
create policy "members read supplier import batches" on public.store_supplier_import_batches for select to authenticated using ((select private.is_organisation_member(organisation_id)));
create policy "store leaders manage supplier import batches" on public.store_supplier_import_batches for all to authenticated using ((select private.has_organisation_role(organisation_id, array['owner','admin','manager']))) with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));
create policy "members read supplier import events" on public.store_supplier_import_events for select to authenticated using ((select private.is_organisation_member(organisation_id)));
create policy "store leaders manage supplier import events" on public.store_supplier_import_events for all to authenticated using ((select private.has_organisation_role(organisation_id, array['owner','admin','manager']))) with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));
revoke all on table public.store_supplier_import_batches, public.store_supplier_import_events from public, anon;
grant select, insert, update on table public.store_supplier_import_batches, public.store_supplier_import_events to authenticated;
commit;
