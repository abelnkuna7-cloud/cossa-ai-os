-- Additive Supplier Registry 2.0: no products, prices, stock or payment data is changed.
begin;

alter table public.store_suppliers
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archive_reason text,
  add column if not exists verification_status text not null default 'NEEDS_MORE_EVIDENCE'
    check (verification_status in ('VERIFIED','PROVISIONALLY_VERIFIED','NEEDS_MORE_EVIDENCE','HIGH_RISK','REJECTED')),
  add column if not exists verified_source text,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists review_due_at timestamptz,
  add column if not exists activation_approved_by uuid references auth.users(id),
  add column if not exists activation_approved_at timestamptz,
  add column if not exists activation_verification_status text,
  add column if not exists activation_notes text;

create table if not exists public.store_supplier_contacts (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id), name text, role_department text,
  contact_type text not null default 'general' check (contact_type in ('primary','general','sales','accounts','support','escalation','other')),
  email text, main_phone text, mobile_phone text, whatsapp_number text, website text, portal_url text,
  street_address text, city text, province_state text, postal_code text, country text, business_hours text,
  preferred_contact_method text, account_reference text, notes text, is_primary boolean not null default false,
  last_verified_at timestamptz, verification_source text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists store_supplier_contacts_primary_unique on public.store_supplier_contacts(supplier_id) where is_primary;
create index if not exists store_supplier_contacts_supplier_idx on public.store_supplier_contacts(supplier_id, created_at desc);

create table if not exists public.store_supplier_verification_evidence (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id), evidence_type text not null,
  source_reference text, classification text not null check (classification in ('VERIFIED_FACT','SUPPLIER_CLAIM','INDEPENDENT_EVIDENCE','UNVERIFIED','CONFLICTING_INFORMATION')),
  outcome text check (outcome in ('VERIFIED','PROVISIONALLY_VERIFIED','NEEDS_MORE_EVIDENCE','HIGH_RISK','REJECTED')),
  notes text, conflict_status text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists store_supplier_verification_evidence_supplier_idx on public.store_supplier_verification_evidence(supplier_id, reviewed_at desc);

create table if not exists public.store_supplier_change_history (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id), field_name text not null, old_value jsonb, new_value jsonb,
  source_reason text, requires_reverification boolean not null default false, changed_by uuid references auth.users(id), changed_at timestamptz not null default now()
);
create index if not exists store_supplier_change_history_supplier_idx on public.store_supplier_change_history(supplier_id, changed_at desc);

create or replace function public.audit_store_supplier_change() returns trigger language plpgsql set search_path = public as $$
declare key text;
begin
  for key in select jsonb_object_keys(to_jsonb(new)) loop
    if key not in ('updated_at') and (to_jsonb(old)->key) is distinct from (to_jsonb(new)->key) then
      insert into public.store_supplier_change_history (organisation_id, supplier_id, field_name, old_value, new_value, requires_reverification, changed_by)
      values (new.organisation_id, new.id, key, to_jsonb(old)->key, to_jsonb(new)->key,
        key in ('source_url','contact_information','recognised_domains','account_reference','returns_notes','warranty_notes','default_fulfilment_profile_code'), auth.uid());
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists store_supplier_change_audit on public.store_suppliers;
create trigger store_supplier_change_audit after update on public.store_suppliers for each row execute function public.audit_store_supplier_change();

-- Normal activation is a database-authorised decision, never a client-side field
-- update. PROVISIONALLY_VERIFIED is intentionally excluded: any future exception
-- needs a separately designed, stronger-authorisation workflow.
create or replace function public.activate_store_supplier(p_supplier_id uuid, p_confirm boolean)
returns public.store_suppliers language plpgsql security invoker set search_path = public as $$
declare v_supplier public.store_suppliers%rowtype;
begin
  if auth.uid() is null then raise exception 'Authenticated user required'; end if;
  if not p_confirm then raise exception 'Explicit activation confirmation is required'; end if;

  select * into v_supplier from public.store_suppliers where id = p_supplier_id for update;
  if not found then raise exception 'Supplier not found'; end if;
  if not (select private.has_organisation_role(v_supplier.organisation_id, array['owner','admin','manager'])) then
    raise exception 'Authorised organisation leadership is required';
  end if;
  if v_supplier.archived_at is not null or v_supplier.status = 'rejected' or v_supplier.registry_status = 'rejected' then
    raise exception 'Archived or rejected suppliers cannot activate';
  end if;
  if v_supplier.verification_status in ('NEEDS_MORE_EVIDENCE', 'HIGH_RISK', 'REJECTED', 'PROVISIONALLY_VERIFIED') then
    raise exception 'Normal activation requires VERIFIED status';
  end if;
  if v_supplier.verification_status <> 'VERIFIED' then
    raise exception 'Verified supplier status is required';
  end if;
  if exists (
    select 1 from public.store_supplier_verification_evidence evidence
    where evidence.supplier_id = v_supplier.id
      and evidence.classification = 'CONFLICTING_INFORMATION'
      and coalesce(evidence.conflict_status, '') <> 'RESOLVED'
  ) then
    raise exception 'Unresolved conflicting supplier evidence blocks activation';
  end if;
  if not exists (
    select 1 from public.store_supplier_verification_evidence evidence
    where evidence.supplier_id = v_supplier.id
      and evidence.outcome = 'VERIFIED'
      and evidence.classification in ('VERIFIED_FACT', 'INDEPENDENT_EVIDENCE')
      and nullif(trim(coalesce(evidence.source_reference, '')), '') is not null
  ) then
    raise exception 'Recorded verified evidence is required for activation';
  end if;

  update public.store_suppliers
  set status = 'active', registry_status = 'active', activation_approved_by = auth.uid(),
      activation_approved_at = now(), activation_verification_status = v_supplier.verification_status
  where id = v_supplier.id
  returning * into v_supplier;
  return v_supplier;
end;
$$;

-- Deletion is deliberately exceptional: this server-side check is the authority for
-- exposing the destructive control. Suppliers with any operational/audit dependency
-- must be archived, never deleted from the registry UI.
create or replace function public.store_supplier_delete_eligibility(p_supplier_id uuid)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_organisation_id uuid; v_dependencies jsonb; v_total integer;
begin
  select organisation_id into v_organisation_id from public.store_suppliers where id = p_supplier_id;
  if v_organisation_id is null or not (select private.has_organisation_role(v_organisation_id, array['owner','admin','manager'])) then
    raise exception 'Supplier not found or not authorised';
  end if;
  select jsonb_build_object(
    'inventory_intakes', (select count(*) from public.store_inventory_intakes where supplier_id = p_supplier_id),
    'fulfilment_profiles', (select count(*) from public.store_fulfilment_profiles where supplier_id = p_supplier_id),
    'import_batches', (select count(*) from public.store_supplier_import_batches where supplier_id = p_supplier_id),
    'import_events', (select count(*) from public.store_supplier_import_events where supplier_id = p_supplier_id),
    'contacts', (select count(*) from public.store_supplier_contacts where supplier_id = p_supplier_id),
    'verification_evidence', (select count(*) from public.store_supplier_verification_evidence where supplier_id = p_supplier_id),
    'change_history', (select count(*) from public.store_supplier_change_history where supplier_id = p_supplier_id)
  ) into v_dependencies;
  select coalesce(sum(value::integer), 0) into v_total from jsonb_each_text(v_dependencies);
  return jsonb_build_object('eligible', v_total = 0, 'dependencies', v_dependencies,
    'reason', case when v_total = 0 then 'No supplier dependencies found.' else 'Supplier has dependent operational or audit records. Archive it instead.' end);
end;
$$;

create or replace function public.delete_store_supplier_if_unreferenced(p_supplier_id uuid, p_confirm boolean)
returns void language plpgsql security invoker set search_path = public as $$
declare v_eligibility jsonb;
begin
  if not p_confirm then raise exception 'Explicit deletion confirmation is required'; end if;
  v_eligibility := public.store_supplier_delete_eligibility(p_supplier_id);
  if not coalesce((v_eligibility->>'eligible')::boolean, false) then
    raise exception '%', coalesce(v_eligibility->>'reason', 'Supplier has dependencies');
  end if;
  delete from public.store_suppliers where id = p_supplier_id;
end;
$$;

alter table public.store_supplier_contacts enable row level security;
alter table public.store_supplier_verification_evidence enable row level security;
alter table public.store_supplier_change_history enable row level security;
create policy "members read supplier contacts" on public.store_supplier_contacts for select to authenticated using ((select private.is_organisation_member(organisation_id)));
create policy "leaders manage supplier contacts" on public.store_supplier_contacts for all to authenticated using ((select private.has_organisation_role(organisation_id, array['owner','admin','manager']))) with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));
create policy "members read supplier verification evidence" on public.store_supplier_verification_evidence for select to authenticated using ((select private.is_organisation_member(organisation_id)));
create policy "leaders manage supplier verification evidence" on public.store_supplier_verification_evidence for all to authenticated using ((select private.has_organisation_role(organisation_id, array['owner','admin','manager']))) with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));
create policy "members read supplier changes" on public.store_supplier_change_history for select to authenticated using ((select private.is_organisation_member(organisation_id)));
create policy "leaders write supplier changes" on public.store_supplier_change_history for insert to authenticated with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));
revoke all on table public.store_supplier_contacts, public.store_supplier_verification_evidence, public.store_supplier_change_history from public, anon;
grant select, insert, update on table public.store_supplier_contacts, public.store_supplier_verification_evidence, public.store_supplier_change_history to authenticated;
revoke all on function public.store_supplier_delete_eligibility(uuid), public.delete_store_supplier_if_unreferenced(uuid, boolean) from public, anon;
grant execute on function public.store_supplier_delete_eligibility(uuid), public.delete_store_supplier_if_unreferenced(uuid, boolean) to authenticated;
revoke all on function public.activate_store_supplier(uuid, boolean) from public, anon;
grant execute on function public.activate_store_supplier(uuid, boolean) to authenticated;
commit;
