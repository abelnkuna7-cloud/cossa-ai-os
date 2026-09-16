-- COSSA STORE — DIGITAL PRODUCT INTELLIGENCE V1
-- Additive only. Does not alter or delete existing store_products or deliverables.

create table if not exists public.store_digital_product_intelligence (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  organisation_id uuid not null,
  digital_subtype text not null default 'other',
  metadata jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{}'::jsonb,
  learning jsonb not null default '{}'::jsonb,
  licensing jsonb not null default '{}'::jsonb,
  detected_assets jsonb not null default '[]'::jsonb,
  intelligence_notes jsonb not null default '[]'::jsonb,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  readiness_issues jsonb not null default '[]'::jsonb,
  readiness_warnings jsonb not null default '[]'::jsonb,
  last_assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_digital_product_intelligence_one_profile_per_product unique(product_id),
  constraint store_digital_product_intelligence_subtype_valid check (
    digital_subtype = any (array[
      'ebook_storybook', 'guide_manual', 'online_course', 'video_course', 'software',
      'saas_access', 'template', 'document_pack', 'workbook', 'printable',
      'audio_audiobook', 'digital_media', 'prompt_pack', 'toolkit_bundle', 'other'
    ]::text[])
  ),
  constraint store_digital_product_intelligence_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint store_digital_product_intelligence_audience_object check (jsonb_typeof(audience) = 'object'),
  constraint store_digital_product_intelligence_learning_object check (jsonb_typeof(learning) = 'object'),
  constraint store_digital_product_intelligence_licensing_object check (jsonb_typeof(licensing) = 'object'),
  constraint store_digital_product_intelligence_assets_array check (jsonb_typeof(detected_assets) = 'array'),
  constraint store_digital_product_intelligence_notes_array check (jsonb_typeof(intelligence_notes) = 'array'),
  constraint store_digital_product_intelligence_issues_array check (jsonb_typeof(readiness_issues) = 'array'),
  constraint store_digital_product_intelligence_warnings_array check (jsonb_typeof(readiness_warnings) = 'array')
);

create index if not exists idx_store_digital_product_intelligence_org
  on public.store_digital_product_intelligence(organisation_id);
create index if not exists idx_store_digital_product_intelligence_subtype
  on public.store_digital_product_intelligence(digital_subtype);

alter table public.store_digital_product_intelligence enable row level security;

-- Match the existing Store owner/admin model and require the profile organisation
-- to equal its parent product organisation. No anonymous access is introduced.
drop policy if exists "Authenticated users can read digital product intelligence" on public.store_digital_product_intelligence;
drop policy if exists "Authenticated users can manage digital product intelligence" on public.store_digital_product_intelligence;
drop policy if exists cossa_store_admins_manage_digital_product_intelligence on public.store_digital_product_intelligence;
create policy cossa_store_admins_manage_digital_product_intelligence
  on public.store_digital_product_intelligence for all to authenticated
  using (
    exists (
      select 1
      from public.store_products product
      join public.organisation_members member
        on member.organisation_id = product.organisation_id
      where product.id = store_digital_product_intelligence.product_id
        and product.organisation_id = store_digital_product_intelligence.organisation_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role = any (array['owner'::text, 'admin'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.store_products product
      join public.organisation_members member
        on member.organisation_id = product.organisation_id
      where product.id = store_digital_product_intelligence.product_id
        and product.organisation_id = store_digital_product_intelligence.organisation_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role = any (array['owner'::text, 'admin'::text])
    )
  );

revoke all on table public.store_digital_product_intelligence from anon;
grant select, insert, update, delete on table public.store_digital_product_intelligence to authenticated;

comment on table public.store_digital_product_intelligence is
  'Additive structured intelligence for digital Store products. Existing store_products remains source of truth for commerce and publication.';

create or replace function public.score_store_digital_product_readiness(p_product_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  p record;
  i record;
  v_score integer := 100;
  v_issues text[] := array[]::text[];
  v_warnings text[] := array[]::text[];
  v_deliverables integer := 0;
  v_visible_deliverables integer := 0;
begin
  select * into p from public.store_products where id = p_product_id;
  if not found then raise exception 'Store product not found'; end if;
  if p.product_type <> 'digital' then
    return jsonb_build_object('score', 100, 'issues', '[]'::jsonb, 'warnings', jsonb_build_array('Digital readiness does not apply to this product type.'));
  end if;

  select * into i from public.store_digital_product_intelligence where product_id = p_product_id;
  select count(*), count(*) filter (where is_customer_visible)
    into v_deliverables, v_visible_deliverables
    from public.store_product_digital_deliverables where product_id = p_product_id;

  if coalesce(trim(p.name), '') = '' then v_score := v_score - 15; v_issues := array_append(v_issues, 'Missing product name'); end if;
  if coalesce(trim(p.description), '') = '' then v_score := v_score - 15; v_issues := array_append(v_issues, 'Missing full description'); end if;
  if coalesce(p.price, 0) <= 0 then v_score := v_score - 15; v_issues := array_append(v_issues, 'Missing selling price'); end if;
  if coalesce(cardinality(p.image_urls), 0) = 0 then v_score := v_score - 15; v_issues := array_append(v_issues, 'Missing Store image'); end if;
  if coalesce(trim(p.digital_file_path), '') = '' and v_visible_deliverables = 0 then v_score := v_score - 20; v_issues := array_append(v_issues, 'Missing customer digital file'); end if;
  if i.id is null then v_score := v_score - 10; v_warnings := array_append(v_warnings, 'Digital subtype and structured metadata not assessed');
  else
    if i.digital_subtype = 'other' then v_score := v_score - 5; v_warnings := array_append(v_warnings, 'Digital subtype is not specific'); end if;
    if i.metadata = '{}'::jsonb then v_score := v_score - 5; v_warnings := array_append(v_warnings, 'Structured product metadata is incomplete'); end if;
  end if;
  if coalesce(trim(p.seo_title), '') = '' then v_score := v_score - 3; v_warnings := array_append(v_warnings, 'SEO title not set'); end if;
  if coalesce(trim(p.seo_description), '') = '' then v_score := v_score - 2; v_warnings := array_append(v_warnings, 'SEO description not set'); end if;

  v_score := greatest(0, least(100, v_score));
  return jsonb_build_object(
    'score', v_score,
    'issues', to_jsonb(v_issues),
    'warnings', to_jsonb(v_warnings),
    'deliverable_count', v_deliverables,
    'customer_visible_deliverable_count', v_visible_deliverables,
    'digital_subtype', coalesce(i.digital_subtype, 'unassessed')
  );
end;
$$;

revoke execute on function public.score_store_digital_product_readiness(uuid) from public, anon;
grant execute on function public.score_store_digital_product_readiness(uuid) to authenticated;
