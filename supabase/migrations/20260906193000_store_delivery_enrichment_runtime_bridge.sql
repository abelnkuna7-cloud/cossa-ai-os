-- Phase 4: allow the existing Cossa evidence agent to perform internal Store
-- delivery-enrichment work. This reuses agent_tasks and does not create a new
-- worker, queue, supplier integration, payment path, or customer-facing access.
insert into public.agent_permission_policies (
  organisation_id,
  agent_id,
  action_key,
  permission_class,
  decision,
  risk_level,
  rationale,
  enabled
)
select
  '00000000-0000-4000-8000-000000000001',
  null,
  'store_delivery_enrichment',
  'WRITE_INTERNAL',
  'allow',
  'medium',
  'Read authoritative supplier evidence and write private Store delivery attributes only; never publish, contact customers, pay, or place supplier orders.',
  true
where not exists (
  select 1
  from public.agent_permission_policies
  where organisation_id = '00000000-0000-4000-8000-000000000001'
    and agent_id is null
    and action_key = 'store_delivery_enrichment'
);

update public.agent_permission_policies
set
  permission_class = 'WRITE_INTERNAL',
  decision = 'allow',
  risk_level = 'medium',
  rationale = 'Read authoritative supplier evidence and write private Store delivery attributes only; never publish, contact customers, pay, or place supplier orders.',
  enabled = true,
  updated_at = now()
where organisation_id = '00000000-0000-4000-8000-000000000001'
  and agent_id is null
  and action_key = 'store_delivery_enrichment';
