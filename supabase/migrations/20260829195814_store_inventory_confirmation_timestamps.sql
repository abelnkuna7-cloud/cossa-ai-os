-- Internal intake confirmations only. This migration intentionally does not
-- touch Store catalogue tables, public projections or publication controls.

begin;

alter table public.store_inventory_intakes
  add column if not exists supplier_cost_confirmed boolean not null default false,
  add column if not exists supplier_cost_confirmed_at timestamptz,
  add column if not exists supplier_cost_confirmed_by uuid references auth.users(id),
  add column if not exists stock_confirmed boolean not null default false,
  add column if not exists stock_confirmed_at timestamptz,
  add column if not exists stock_confirmed_by uuid references auth.users(id);

-- Approved rows passed the previous lifecycle confirmation gate. Preserve that
-- established fact rather than making existing approved intake records appear
-- unconfirmed solely because this finer-grained audit field is new.
update public.store_inventory_intakes
set
  supplier_cost_confirmed = case
    when supplier_cost is not null then true
    else supplier_cost_confirmed
  end,
  supplier_cost_confirmed_at = case
    when supplier_cost is not null then coalesce(last_price_checked_at, approved_at, created_at, now())
    else supplier_cost_confirmed_at
  end,
  stock_confirmed = case
    when stock_status = 'available' then true
    else stock_confirmed
  end,
  stock_confirmed_at = case
    when stock_status = 'available' then coalesce(last_stock_checked_at, approved_at, created_at, now())
    else stock_confirmed_at
  end
where approval_status = 'approved';

create or replace function private.stamp_store_inventory_confirmation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- A changed value requires a fresh confirmation. The client cannot retain an
  -- old confirmation while silently replacing the underlying supplier fact.
  if new.supplier_cost is distinct from old.supplier_cost then
    new.supplier_cost_confirmed := false;
  end if;
  if new.stock_status is distinct from old.stock_status then
    new.stock_confirmed := false;
  end if;

  if not old.supplier_cost_confirmed and new.supplier_cost_confirmed then
    if new.supplier_cost is null then
      raise exception 'Supplier cost is required before it can be confirmed' using errcode = '23514';
    end if;
    new.supplier_cost_confirmed_at := now();
    new.supplier_cost_confirmed_by := auth.uid();
  elsif not new.supplier_cost_confirmed then
    new.supplier_cost_confirmed_at := null;
    new.supplier_cost_confirmed_by := null;
  else
    new.supplier_cost_confirmed_at := old.supplier_cost_confirmed_at;
    new.supplier_cost_confirmed_by := old.supplier_cost_confirmed_by;
  end if;

  if not old.stock_confirmed and new.stock_confirmed then
    if new.stock_status <> 'available' then
      raise exception 'Supplier stock must be available before it can be confirmed' using errcode = '23514';
    end if;
    new.stock_confirmed_at := now();
    new.stock_confirmed_by := auth.uid();
    new.sync_status := 'verified';
  elsif not new.stock_confirmed then
    new.stock_confirmed_at := null;
    new.stock_confirmed_by := null;
  else
    new.stock_confirmed_at := old.stock_confirmed_at;
    new.stock_confirmed_by := old.stock_confirmed_by;
  end if;

  return new;
end;
$$;

revoke all on function private.stamp_store_inventory_confirmation() from public, anon, authenticated;

drop trigger if exists store_inventory_intakes_stamp_confirmation on public.store_inventory_intakes;
create trigger store_inventory_intakes_stamp_confirmation
before update of supplier_cost, stock_status, supplier_cost_confirmed, stock_confirmed
on public.store_inventory_intakes
for each row execute function private.stamp_store_inventory_confirmation();

commit;
