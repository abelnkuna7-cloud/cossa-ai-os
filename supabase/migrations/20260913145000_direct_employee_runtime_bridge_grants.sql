-- The hosted runtime calls this RPC with the protected Supabase service role.
-- Browser roles remain revoked by the bridge migration.

GRANT EXECUTE ON FUNCTION public.claim_direct_employee_agent_tasks(uuid, uuid, integer, integer)
  TO service_role;
