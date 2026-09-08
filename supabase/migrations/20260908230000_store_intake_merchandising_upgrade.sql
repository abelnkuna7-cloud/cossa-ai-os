-- Additive Store intake merchandising upgrade.
-- Keeps the existing primary category, publication bridge and supplier architecture intact.

begin;

alter table public.store_inventory_intakes
  add column if not exists additional_categories text[] not null default '{}'::text[],
  add column if not exists featured boolean not null default false,
  add column if not exists merchandising_tags text[] not null default '{}'::text[];

alter table public.store_products
  add column if not exists additional_categories text[] not null default '{}'::text[],
  add column if not exists merchandising_tags text[] not null default '{}'::text[];

alter table public.store_public_products
  add column if not exists additional_categories text[] not null default '{}'::text[],
  add column if not exists merchandising_tags text[] not null default '{}'::text[];

-- Publication remains one intake -> one Store product. This trigger only carries
-- shopper-safe merchandising metadata to the already-linked canonical product.
create or replace function private.sync_store_intake_merchandising()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_store_product_id is not null then
    update public.store_products
    set
      featured = coalesce(new.featured, false),
      additional_categories = coalesce(new.additional_categories, '{}'::text[]),
      merchandising_tags = coalesce(new.merchandising_tags, '{}'::text[]),
      updated_at = now()
    where id = new.publication_store_product_id
      and organisation_id = new.organisation_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_store_intake_merchandising() from public, anon, authenticated, service_role;

drop trigger if exists zz_store_intake_merchandising_to_product on public.store_inventory_intakes;
create trigger zz_store_intake_merchandising_to_product
after insert or update of publication_store_product_id, featured, additional_categories, merchandising_tags
on public.store_inventory_intakes
for each row execute function private.sync_store_intake_merchandising();

-- The existing public projection trigger continues to own all existing fields.
-- This later alphabetical trigger only enriches the projection with the new
-- shopper-safe merchandising arrays after an active product has been projected.
create or replace function private.sync_store_public_merchandising()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'DELETE' and new.status = 'active' then
    update public.store_public_products
    set
      additional_categories = coalesce(new.additional_categories, '{}'::text[]),
      merchandising_tags = coalesce(new.merchandising_tags, '{}'::text[]),
      featured = coalesce(new.featured, false)
    where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_store_public_merchandising() from public, anon, authenticated, service_role;

drop trigger if exists zz_store_products_sync_public_merchandising on public.store_products;
create trigger zz_store_products_sync_public_merchandising
after insert or update on public.store_products
for each row execute function private.sync_store_public_merchandising();

-- Backfill only linked products. No catalogue row is created, removed or published.
update public.store_products product
set
  featured = intake.featured,
  additional_categories = intake.additional_categories,
  merchandising_tags = intake.merchandising_tags
from public.store_inventory_intakes intake
where intake.publication_store_product_id = product.id
  and intake.organisation_id = product.organisation_id;

commit;
