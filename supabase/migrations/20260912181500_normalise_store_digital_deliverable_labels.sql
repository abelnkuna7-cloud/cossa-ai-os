create or replace function public.normalise_store_digital_deliverable_label()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  current_label text;
  searchable text;
  parent_name text;
begin
  base_name := regexp_replace(coalesce(new.file_name, ''), '\.[^.]+$', '');
  current_label := btrim(coalesce(new.label, ''));
  searchable := lower(concat_ws(' ', current_label, new.file_name));

  -- Respect labels that a user deliberately typed. Product Manager's automatic
  -- label is the filename without its extension; only those automatic labels
  -- are normalised here.
  if current_label = '' or lower(current_label) = lower(base_name) then
    if coalesce(new.mime_type, '') = 'application/pdf' or lower(coalesce(new.file_name, '')) like '%.pdf' then
      if searchable ~ 'start[ _-]*here' then
        new.label := 'START HERE';
      elsif searchable like '%workbook%' then
        new.label := 'Workbook';
      elsif searchable like '%checklist%' then
        new.label := 'Checklist';
      elsif searchable like '%template%' then
        new.label := 'Template';
      elsif searchable like '%bonus%' then
        new.label := 'Bonus Resource';
      else
        select lower(coalesce(p.name, ''))
          into parent_name
          from public.store_products p
         where p.id = new.product_id;

        -- Learning products commonly use the product title as the PDF filename,
        -- so give the main PDF a stable label Product Manager can recognise.
        if parent_name ~ '(ai|prompt|course|playbook|guide|learning|training|automation|business|study|career|productivity|finance|hr|sales|marketing)' then
          new.label := 'Complete Course PDF';
        elsif current_label = '' then
          new.label := base_name;
        end if;
      end if;
    elsif current_label = '' then
      new.label := base_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists normalise_store_digital_deliverable_label_trigger
  on public.store_product_digital_deliverables;

create trigger normalise_store_digital_deliverable_label_trigger
before insert or update of label, file_name, mime_type
on public.store_product_digital_deliverables
for each row
execute function public.normalise_store_digital_deliverable_label();
