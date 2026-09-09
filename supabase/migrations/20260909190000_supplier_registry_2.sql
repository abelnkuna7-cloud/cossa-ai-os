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
commit;
