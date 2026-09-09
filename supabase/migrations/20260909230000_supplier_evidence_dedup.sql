-- Supplier Registry evidence integrity repair.
-- Preserve accidental duplicate rows in an audit archive, remove only the duplicate
-- operational copies, and prevent identical evidence from being inserted again.
begin;

create table if not exists public.store_supplier_verification_evidence_duplicate_archive (
  id uuid primary key,
  organisation_id uuid not null references public.organisations(id),
  supplier_id uuid not null references public.store_suppliers(id),
  evidence_type text not null,
  source_reference text,
  classification text not null,
  outcome text,
  notes text,
  conflict_status text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz not null,
  created_at timestamptz not null,
  archived_at timestamptz not null default now(),
  archive_reason text not null,
  canonical_evidence_id uuid
);

alter table public.store_supplier_verification_evidence_duplicate_archive enable row level security;

drop policy if exists "members read supplier evidence duplicate archive"
  on public.store_supplier_verification_evidence_duplicate_archive;
create policy "members read supplier evidence duplicate archive"
  on public.store_supplier_verification_evidence_duplicate_archive
  for select to authenticated
  using ((select private.is_organisation_member(organisation_id)));

drop policy if exists "leaders archive supplier evidence duplicates"
  on public.store_supplier_verification_evidence_duplicate_archive;
create policy "leaders archive supplier evidence duplicates"
  on public.store_supplier_verification_evidence_duplicate_archive
  for insert to authenticated
  with check ((select private.has_organisation_role(organisation_id, array['owner','admin','manager'])));

revoke all on table public.store_supplier_verification_evidence_duplicate_archive from public, anon;
grant select, insert on table public.store_supplier_verification_evidence_duplicate_archive to authenticated;

-- Keep the earliest exact evidence record as canonical and archive later accidental copies.
-- URL normalization ignores only case, whitespace and trailing slashes; materially different
-- sources, classifications, outcomes or notes remain separate evidence records.
with ranked as (
  select
    evidence.*,
    first_value(id) over (
      partition by
        supplier_id,
        lower(trim(evidence_type)),
        regexp_replace(lower(trim(coalesce(source_reference, ''))), '/+$', ''),
        classification,
        coalesce(outcome, ''),
        lower(trim(coalesce(notes, '')))
      order by reviewed_at asc, created_at asc, id asc
    ) as canonical_id,
    row_number() over (
      partition by
        supplier_id,
        lower(trim(evidence_type)),
        regexp_replace(lower(trim(coalesce(source_reference, ''))), '/+$', ''),
        classification,
        coalesce(outcome, ''),
        lower(trim(coalesce(notes, '')))
      order by reviewed_at asc, created_at asc, id asc
    ) as duplicate_rank
  from public.store_supplier_verification_evidence evidence
), archived as (
  insert into public.store_supplier_verification_evidence_duplicate_archive (
    id, organisation_id, supplier_id, evidence_type, source_reference, classification,
    outcome, notes, conflict_status, reviewed_by, reviewed_at, created_at,
    archive_reason, canonical_evidence_id
  )
  select
    id, organisation_id, supplier_id, evidence_type, source_reference, classification,
    outcome, notes, conflict_status, reviewed_by, reviewed_at, created_at,
    'Exact duplicate created by repeated Supplier Registry evidence submission', canonical_id
  from ranked
  where duplicate_rank > 1
  on conflict (id) do nothing
  returning id
)
delete from public.store_supplier_verification_evidence evidence
using archived
where evidence.id = archived.id;

-- The Astrum source-less "official website" rows were incomplete form submissions rather
-- than usable verification evidence. Preserve them in the archive and remove them from the
-- operational review list so they cannot be mistaken for evidence that can support activation.
with astrum_incomplete as (
  select evidence.*
  from public.store_supplier_verification_evidence evidence
  join public.store_suppliers supplier on supplier.id = evidence.supplier_id
  where lower(supplier.code) = 'astrum'
    and lower(trim(evidence.evidence_type)) = 'official website'
    and nullif(trim(coalesce(evidence.source_reference, '')), '') is null
    and evidence.outcome = 'NEEDS_MORE_EVIDENCE'
), archived as (
  insert into public.store_supplier_verification_evidence_duplicate_archive (
    id, organisation_id, supplier_id, evidence_type, source_reference, classification,
    outcome, notes, conflict_status, reviewed_by, reviewed_at, created_at,
    archive_reason, canonical_evidence_id
  )
  select
    id, organisation_id, supplier_id, evidence_type, source_reference, classification,
    outcome, notes, conflict_status, reviewed_by, reviewed_at, created_at,
    'Incomplete Astrum website evidence submission with no source reference', null
  from astrum_incomplete
  on conflict (id) do nothing
  returning id
)
delete from public.store_supplier_verification_evidence evidence
using archived
where evidence.id = archived.id;

-- Database-level idempotency guard. This is the final authority even if the browser sends
-- the same request more than once because of a double-click, retry, stale tab or network replay.
create unique index if not exists store_supplier_verification_evidence_exact_unique
  on public.store_supplier_verification_evidence (
    supplier_id,
    lower(trim(evidence_type)),
    regexp_replace(lower(trim(coalesce(source_reference, ''))), '/+$', ''),
    classification,
    coalesce(outcome, ''),
    lower(trim(coalesce(notes, '')))
  );

-- Verified factual/independent evidence must always identify its source. This matches the
-- activation gate and prevents a source-less row from ever qualifying as verified evidence.
alter table public.store_supplier_verification_evidence
  drop constraint if exists store_supplier_verified_evidence_requires_source;
alter table public.store_supplier_verification_evidence
  add constraint store_supplier_verified_evidence_requires_source
  check (
    not (
      outcome = 'VERIFIED'
      and classification in ('VERIFIED_FACT', 'INDEPENDENT_EVIDENCE')
      and nullif(trim(coalesce(source_reference, '')), '') is null
    )
  );

commit;