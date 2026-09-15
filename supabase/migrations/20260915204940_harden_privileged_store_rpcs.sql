-- Remove direct Data API access from privileged and trigger-only functions.
-- Public lead and quote intake functions are intentionally not changed here.

revoke execute on function public.invoke_astrum_smart_intake_ceo_publish(text[], boolean, integer)
  from public, anon, authenticated;
grant execute on function public.invoke_astrum_smart_intake_ceo_publish(text[], boolean, integer)
  to service_role;

revoke execute on function public.invoke_astrum_smart_intake_ceo_publish_batch(text[], boolean)
  from public, anon, authenticated;
grant execute on function public.invoke_astrum_smart_intake_ceo_publish_batch(text[], boolean)
  to service_role;

revoke execute on function public.normalise_store_digital_deliverable_label()
  from public, anon, authenticated, service_role;

revoke execute on function public.set_store_product_digital_deliverable_updated_at()
  from public, anon, authenticated, service_role;
alter function public.set_store_product_digital_deliverable_updated_at()
  set search_path = '';

-- Product Manager invokes this RPC from an authenticated admin workspace.
-- Its existing organisation-scoped application access is preserved.
revoke execute on function public.store_product_manager_intelligence()
  from public, anon;
grant execute on function public.store_product_manager_intelligence()
  to authenticated, service_role;
