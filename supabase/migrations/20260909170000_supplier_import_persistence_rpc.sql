-- Atomic, generic persistence for a supplier catalogue plan.  This migration
-- creates no catalogue products and never writes Cossa-owned stock or selling prices.
-- Fatal persistence failures roll back the entire import transaction; failed attempts
-- are returned to the server caller rather than persisted as completed import batches.
begin;

create or replace function public.persist_supplier_catalogue_import(
  p_organisation_id uuid,
  p_supplier_id uuid,
  p_source_type text,
  p_source_file_name text,
  p_source_content_hash text,
  p_source_observed_at timestamptz,
  p_source_url text,
  p_rows jsonb,
  p_events jsonb,
  p_counts jsonb,
  p_created_by uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.store_supplier_import_batches%rowtype;
  v_supplier public.store_suppliers%rowtype;
  v_row jsonb;
  v_event jsonb;
  v_intake_id uuid;
  v_category text;
  v_event_type text;
begin
  if p_created_by is null then raise exception 'authenticated actor is required' using errcode = '28000'; end if;
  if p_source_type not in ('csv', 'xlsx', 'api', 'feed', 'manual') then raise exception 'invalid source type'; end if;
  if coalesce(trim(p_source_content_hash), '') = '' or jsonb_typeof(p_rows) <> 'array' or jsonb_typeof(p_events) <> 'array' then
    raise exception 'invalid import payload';
  end if;

  select * into v_supplier from public.store_suppliers
   where id = p_supplier_id and organisation_id = p_organisation_id for share;
  if not found then raise exception 'supplier is not in the authenticated organisation' using errcode = '42501'; end if;

  insert into public.store_supplier_import_batches (
    organisation_id, supplier_id, source_type, source_file_name, source_content_hash,
    source_observed_at, status, source_rows, accepted_rows, rejected_rows, new_skus,
    updated_skus, unchanged_skus, available_skus, unavailable_skus, supplier_available_units,
    stock_changes, cost_changes, rrp_changes, newly_unavailable, back_in_stock,
    missing_from_source, summary, error_summary, created_by
  ) values (
    p_organisation_id, p_supplier_id, p_source_type, nullif(trim(p_source_file_name), ''), p_source_content_hash,
    p_source_observed_at, 'running', coalesce((p_counts->>'sourceRows')::int, 0),
    coalesce((p_counts->>'acceptedRows')::int, 0), coalesce((p_counts->>'rejectedRows')::int, 0),
    coalesce((p_counts->>'newSkus')::int, 0), coalesce((p_counts->>'updatedSkus')::int, 0),
    coalesce((p_counts->>'unchangedSkus')::int, 0), coalesce((p_counts->>'availableSkus')::int, 0),
    coalesce((p_counts->>'unavailableSkus')::int, 0), coalesce((p_counts->>'supplierAvailableUnits')::numeric, 0),
    coalesce((p_counts->>'stockChanges')::int, 0), coalesce((p_counts->>'costChanges')::int, 0),
    coalesce((p_counts->>'rrpChanges')::int, 0), coalesce((p_counts->>'newlyUnavailable')::int, 0),
    coalesce((p_counts->>'backInStock')::int, 0), coalesce((p_counts->>'missingFromSource')::int, 0),
    p_counts, '{}'::jsonb, p_created_by
  ) on conflict (supplier_id, source_content_hash) do nothing
  returning * into v_batch;

  if v_batch.id is null then
    select * into v_batch from public.store_supplier_import_batches
     where supplier_id = p_supplier_id and source_content_hash = p_source_content_hash for update;
    if v_batch.status = 'completed' then
      return jsonb_build_object('batchId', v_batch.id, 'idempotent', true, 'status', v_batch.status);
    end if;
    raise exception 'an import with this source hash is already running' using errcode = '55P03';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if coalesce(trim(v_row->>'sku'), '') = '' or coalesce(trim(v_row->>'name'), '') = ''
       or coalesce((v_row->>'price')::numeric, 0) <= 0 then
      raise exception 'accepted row failed server validation';
    end if;
    select cossa_category into v_category from public.store_supplier_category_mappings
      where organisation_id = p_organisation_id and supplier_id = p_supplier_id
        and supplier_category = coalesce(v_row->>'category', '') limit 1;
    insert into public.store_inventory_intakes (
      organisation_id, supplier_id, fulfilment_profile_id, name, supplier_product_ref,
      business_model, stock_origin, source_url, import_status, approval_status, sync_status,
      stock_status, supplier_cost, supplier_rrp, supplier_category, category,
      supplier_available_stock, source_file_name, source_observed_at, source_content_hash,
      last_import_batch_id, fields_requiring_confirmation, import_trace,
      last_price_checked_at, last_stock_checked_at
    ) values (
      p_organisation_id, p_supplier_id,
      (select id from public.store_fulfilment_profiles where supplier_id = p_supplier_id and is_active order by created_at limit 1),
      trim(v_row->>'name'), trim(v_row->>'sku'), v_supplier.business_model, v_supplier.stock_origin,
      p_source_url, 'imported', 'review', 'manual',
      case when coalesce((v_row->>'stock')::numeric, 0) > 0 then 'available' else 'unavailable' end,
      (v_row->>'price')::numeric, nullif(v_row->>'srpPrice', '')::numeric, nullif(v_row->>'category', ''), v_category,
      coalesce((v_row->>'stock')::numeric, 0), nullif(trim(p_source_file_name), ''), p_source_observed_at,
      p_source_content_hash, v_batch.id,
      case when v_category is null then '["category review required","description evidence","specifications evidence","image evidence","warranty evidence","delivery evidence"]'::jsonb
           else '["description evidence","specifications evidence","image evidence","warranty evidence","delivery evidence"]'::jsonb end,
      jsonb_build_array(jsonb_build_object('batch_id', v_batch.id, 'source_hash', p_source_content_hash, 'source_file_name', p_source_file_name)), now(), now()
    ) on conflict (supplier_id, supplier_product_ref) do update set
      name = excluded.name, supplier_cost = excluded.supplier_cost, supplier_rrp = excluded.supplier_rrp,
      supplier_category = excluded.supplier_category, category = coalesce(excluded.category, store_inventory_intakes.category),
      supplier_available_stock = excluded.supplier_available_stock, stock_status = excluded.stock_status,
      source_file_name = excluded.source_file_name, source_observed_at = excluded.source_observed_at,
      source_content_hash = excluded.source_content_hash, last_import_batch_id = excluded.last_import_batch_id,
      import_trace = store_inventory_intakes.import_trace || excluded.import_trace,
      last_price_checked_at = now(), last_stock_checked_at = now()
    returning id into v_intake_id;
  end loop;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    v_event_type := v_event->>'type';
    if v_event_type not in ('accepted','rejected','new','unchanged','stock_changed','cost_changed','rrp_changed','unavailable','back_in_stock','missing_from_source') then
      raise exception 'invalid import event type';
    end if;
    select id into v_intake_id from public.store_inventory_intakes
     where supplier_id = p_supplier_id and supplier_product_ref = v_event->>'sku';
    insert into public.store_supplier_import_events (
      organisation_id, supplier_id, import_batch_id, intake_id, supplier_product_ref, source_row_hash,
      event_type, previous_evidence, observed_evidence, reason
    ) values (
      p_organisation_id, p_supplier_id, v_batch.id,
      case when v_event_type = 'rejected' then null else v_intake_id end,
      nullif(v_event->>'sku', ''), v_event->>'rowHash', v_event_type,
      coalesce(v_event->'previous', '{}'::jsonb), coalesce(v_event->'observed', '{}'::jsonb), nullif(v_event->>'reason', '')
    ) on conflict (import_batch_id, source_row_hash, event_type) do nothing;
  end loop;

  update public.store_supplier_import_batches set status = 'completed', completed_at = now()
   where id = v_batch.id;
  return jsonb_build_object('batchId', v_batch.id, 'idempotent', false, 'status', 'completed');
end;
$$;

revoke all on function public.persist_supplier_catalogue_import(uuid, uuid, text, text, text, timestamptz, text, jsonb, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.persist_supplier_catalogue_import(uuid, uuid, text, text, text, timestamptz, text, jsonb, jsonb, jsonb, uuid) to service_role;
commit;
