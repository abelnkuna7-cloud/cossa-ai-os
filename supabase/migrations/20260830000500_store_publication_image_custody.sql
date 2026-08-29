-- Customer pages must not reveal a supplier image host. The server copies the
-- approved image bytes into the existing Cossa Store bucket, then this wrapper
-- uses those Cossa-hosted URLs for the atomic product publication.

begin;

create or replace function public.publish_store_inventory_intake_with_images(
  p_intake_id uuid,
  p_actor_id uuid,
  p_customer_image_urls text[]
)
returns table (store_product_id uuid, public_slug text, publication_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intake public.store_inventory_intakes%rowtype;
  v_original_images jsonb;
  v_result record;
  v_customer_image text;
  v_expected_path text := '/storage/v1/object/public/store-product-images/published/' || p_intake_id::text || '/';
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_intake_id::text, 0));
  select * into v_intake
  from public.store_inventory_intakes
  where id = p_intake_id
  for update;
  if not found then
    raise exception 'Store intake not found.' using errcode = 'P0002';
  end if;
  perform private.assert_store_inventory_publication_actor(v_intake.organisation_id, p_actor_id, true);

  if coalesce(array_length(p_customer_image_urls, 1), 0) = 0
    or coalesce(array_length(p_customer_image_urls, 1), 0) <> jsonb_array_length(v_intake.image_urls) then
    raise exception 'Every approved product image must be copied into Cossa Store custody before publishing.'
      using errcode = '23514';
  end if;
  foreach v_customer_image in array p_customer_image_urls loop
    if position(v_expected_path in coalesce(v_customer_image, '')) = 0 then
      raise exception 'Publication images must be Cossa-hosted Store assets.' using errcode = '23514';
    end if;
  end loop;

  v_original_images := v_intake.image_urls;
  update public.store_inventory_intakes
  set image_urls = to_jsonb(p_customer_image_urls)
  where id = v_intake.id;

  select * into v_result
  from public.publish_store_inventory_intake(p_intake_id, p_actor_id)
  limit 1;

  -- The intake keeps the original supplier-gallery references for internal
  -- traceability. Only the published Store product uses Cossa-hosted copies.
  update public.store_inventory_intakes
  set image_urls = v_original_images
  where id = v_intake.id;

  return query select v_result.store_product_id, v_result.public_slug, v_result.publication_status;
end;
$$;

revoke all on function public.publish_store_inventory_intake_with_images(uuid, uuid, text[])
  from public, anon, authenticated;
grant execute on function public.publish_store_inventory_intake_with_images(uuid, uuid, text[]) to service_role;

commit;
