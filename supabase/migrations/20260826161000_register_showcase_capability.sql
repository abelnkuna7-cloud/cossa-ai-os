-- Register the new Showcase Library in the Growth truth layer.
-- It remains unassessed until the deployed application records a successful
-- authenticated use; this prevents the registry from claiming it is live
-- simply because its schema exists.

BEGIN;

INSERT INTO public.capability_registry (
  organisation_id, capability_key, name, module, purpose, data_sources,
  required_integration, automation_status, approval_requirement, business_impact
)
SELECT
  organisation.id,
  'showcase-library',
  'Cossa Showcase Library',
  'Customer acquisition',
  'Manage evidence-led Cossa systems, capability samples and authorised client work without misrepresenting their status.',
  '["showcase_items", "showcase_events"]'::jsonb,
  NULL,
  'manual',
  'internal_write',
  'high'
FROM public.organisations AS organisation
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, capability_key) DO NOTHING;

INSERT INTO public.metric_definitions (
  organisation_id, metric_key, name, description, semantic_type, value_kind,
  source_systems, source_filters, freshness_seconds
)
SELECT
  organisation.id,
  'showcase-attributed-lead-count',
  'Showcase-attributed lead count',
  'Count of real CRM leads that are explicitly attributed to an approved showcase CTA. This remains unassessed until a protected conversion endpoint records the attribution.',
  'fact',
  'count',
  '["showcase_events", "leads"]'::jsonb,
  '{"event_type":"lead_capture","attribution":"approved_showcase_cta"}'::jsonb,
  3600
FROM public.organisations AS organisation
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, metric_key) DO NOTHING;

COMMIT;
