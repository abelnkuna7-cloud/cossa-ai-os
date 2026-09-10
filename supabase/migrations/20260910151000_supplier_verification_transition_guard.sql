-- Supplier verification transition guard.
-- Additive only: preserves Supplier Registry 2.0, activation controls, audit history,
-- product publication, pricing, payments and inventory ownership semantics.

begin;

create or replace function public.enforce_store_supplier_verification_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_verified_evidence_count integer;
  v_best_source text;
begin
  -- The current Store Inventory UI records an authorised Verify action by writing
  -- PROVISIONALLY_VERIFIED together with a fresh last_verified_at timestamp.
  -- Convert that specific review action to VERIFIED only after server-side checks.
  -- A plain/stored provisional status remains possible when last_verified_at is not
  -- being changed as part of a review action.
  if new.verification_status = 'PROVISIONALLY_VERIFIED'
     and new.last_verified_at is distinct from old.last_verified_at then

    if auth.uid() is null then
      raise exception 'Verification blocked: authenticated user required';
    end if;

    if not (select private.has_organisation_role(new.organisation_id, array['owner','admin','manager'])) then
      raise exception 'Verification blocked: authorised organisation leadership is required';
    end if;

    if new.archived_at is not null
       or new.status = 'rejected'
       or new.registry_status = 'rejected' then
      raise exception 'Verification blocked: archived or rejected suppliers cannot be verified';
    end if;

    if exists (
      select 1
      from public.store_supplier_verification_evidence evidence
      where evidence.supplier_id = new.id
        and evidence.classification = 'CONFLICTING_INFORMATION'
        and coalesce(evidence.conflict_status, '') <> 'RESOLVED'
    ) then
      raise exception 'Verification blocked: unresolved conflicting supplier evidence must be resolved first';
    end if;

    if exists (
      select 1
      from public.store_supplier_verification_evidence evidence
      where evidence.supplier_id = new.id
        and evidence.outcome in ('HIGH_RISK', 'REJECTED')
        and coalesce(evidence.conflict_status, '') <> 'RESOLVED'
    ) then
      raise exception 'Verification blocked: unresolved high-risk or rejected evidence must be resolved first';
    end if;

    select count(*)::integer
      into v_verified_evidence_count
    from public.store_supplier_verification_evidence evidence
    where evidence.supplier_id = new.id
      and evidence.outcome = 'VERIFIED'
      and evidence.classification in ('VERIFIED_FACT', 'INDEPENDENT_EVIDENCE')
      and nullif(trim(coalesce(evidence.source_reference, '')), '') is not null;

    if coalesce(v_verified_evidence_count, 0) = 0 then
      raise exception 'Verification blocked: no qualifying VERIFIED evidence with a source reference is recorded';
    end if;

    select evidence.source_reference
      into v_best_source
    from public.store_supplier_verification_evidence evidence
    where evidence.supplier_id = new.id
      and evidence.outcome = 'VERIFIED'
      and evidence.classification in ('VERIFIED_FACT', 'INDEPENDENT_EVIDENCE')
      and nullif(trim(coalesce(evidence.source_reference, '')), '') is not null
    order by
      case when evidence.source_reference ~* '^https?://' then 0 else 1 end,
      evidence.reviewed_at desc
    limit 1;

    new.verification_status := 'VERIFIED';
    new.verified_by := auth.uid();
    new.last_verified_at := coalesce(new.last_verified_at, now());
    new.review_due_at := coalesce(new.review_due_at, now() + interval '180 days');

    if nullif(trim(coalesce(new.verified_source, '')), '') is null then
      new.verified_source := v_best_source;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists store_supplier_verification_transition_guard on public.store_suppliers;
create trigger store_supplier_verification_transition_guard
before update of verification_status, last_verified_at on public.store_suppliers
for each row
execute function public.enforce_store_supplier_verification_transition();

revoke all on function public.enforce_store_supplier_verification_transition() from public, anon;
grant execute on function public.enforce_store_supplier_verification_transition() to authenticated;

commit;
