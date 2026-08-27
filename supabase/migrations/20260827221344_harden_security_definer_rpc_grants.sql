-- SECURITY DEFINER RPC execution is an explicit capability, never a PUBLIC
-- default. This migration is intentionally prepared only; certification must
-- apply it through the normal reviewed database release process.

-- Public contact intake remains available to the API roles that need it. Both
-- routines validate inputs and apply their own abuse controls before writes.
revoke execute on function public.ingest_cossa_lead(
  text, text, text, text, text, text, text, text, text, text, jsonb
) from public;

grant execute on function public.ingest_cossa_lead(
  text, text, text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated, service_role;

revoke execute on function public.submit_quote_request(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text
) from public;

grant execute on function public.submit_quote_request(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text
) to anon, authenticated, service_role;

-- Notification delivery persistence is a server callback boundary. It must
-- never be callable through the public Data API.
revoke execute on function public.record_cossa_notification_delivery(
  text, uuid, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.record_cossa_notification_delivery(
  text, uuid, text, text, integer, text
) to service_role;

-- Human CRM changes retain authenticated access, with the function enforcing
-- organization membership and role checks internally. Service role is kept
-- for reviewed server-side workflows.
revoke execute on function public.update_cossa_lead(
  uuid, text, text, text, date, numeric, integer, uuid, text
) from public, anon;

grant execute on function public.update_cossa_lead(
  uuid, text, text, text, date, numeric, integer, uuid, text
) to authenticated, service_role;
