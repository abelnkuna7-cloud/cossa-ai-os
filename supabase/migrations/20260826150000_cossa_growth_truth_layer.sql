-- Cossa Growth truth and capability foundation.
--
-- This is additive. It preserves all current Store, Growth, NexDocs, CRM,
-- affiliate, POD, supplier and workforce records. Existing records begin as
-- unknown until a verified source establishes a more specific truth state.

BEGIN;

CREATE TABLE public.capability_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  responsible_employee_id uuid,
  capability_key text NOT NULL,
  name text NOT NULL,
  module text NOT NULL,
  purpose text NOT NULL,
  data_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_integration text,
  operational_status text NOT NULL DEFAULT 'not_assessed'
    CHECK (operational_status IN (
      'operational', 'partially_operational', 'manual', 'waiting_approval',
      'integration_required', 'paid_access_required', 'degraded', 'failed',
      'disabled', 'not_assessed'
    )),
  automation_status text NOT NULL DEFAULT 'manual'
    CHECK (automation_status IN ('manual', 'scheduled', 'event_driven', 'not_automated')),
  approval_requirement text NOT NULL DEFAULT 'none'
    CHECK (approval_requirement IN ('none', 'internal_write', 'external_communication', 'financial', 'production_change')),
  business_impact text NOT NULL DEFAULT 'medium'
    CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, capability_key),
  FOREIGN KEY (responsible_employee_id, organisation_id)
    REFERENCES public.ai_employees(id, organisation_id) ON DELETE SET NULL
);

CREATE TABLE public.metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  metric_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  semantic_type text NOT NULL
    CHECK (semantic_type IN ('fact', 'calculation', 'inference', 'recommendation', 'action', 'verified_result')),
  value_kind text NOT NULL
    CHECK (value_kind IN ('currency', 'count', 'percentage', 'duration', 'status')),
  source_systems jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  availability_status text NOT NULL DEFAULT 'not_assessed'
    CHECK (availability_status IN ('available', 'partial', 'not_connected', 'stale', 'failed', 'not_assessed')),
  freshness_seconds integer CHECK (freshness_seconds IS NULL OR freshness_seconds > 0),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, metric_key)
);

-- A numeric stock_quantity must never be read as proof that Cossa owns that
-- quantity. These fields record its ownership and verification state.
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS inventory_ownership text NOT NULL DEFAULT 'unknown'
    CHECK (inventory_ownership IN (
      'cossa_owned', 'supplier_managed', 'pod_managed',
      'affiliate_merchant', 'digital', 'not_applicable', 'unknown'
    )),
  ADD COLUMN IF NOT EXISTS inventory_source_status text NOT NULL DEFAULT 'unknown'
    CHECK (inventory_source_status IN ('verified', 'manual', 'stale', 'not_connected', 'failed', 'unknown')),
  ADD COLUMN IF NOT EXISTS inventory_source_reference text,
  ADD COLUMN IF NOT EXISTS inventory_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inventory_last_verified_at timestamptz;

ALTER TABLE public.store_product_variants
  ADD COLUMN IF NOT EXISTS inventory_ownership text NOT NULL DEFAULT 'unknown'
    CHECK (inventory_ownership IN (
      'cossa_owned', 'supplier_managed', 'pod_managed',
      'affiliate_merchant', 'digital', 'not_applicable', 'unknown'
    )),
  ADD COLUMN IF NOT EXISTS availability_source_status text NOT NULL DEFAULT 'unknown'
    CHECK (availability_source_status IN ('verified', 'manual', 'stale', 'not_connected', 'failed', 'unknown')),
  ADD COLUMN IF NOT EXISTS availability_source_reference text,
  ADD COLUMN IF NOT EXISTS availability_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS availability_last_verified_at timestamptz;

CREATE INDEX capability_registry_organisation_status_idx
  ON public.capability_registry (organisation_id, operational_status, updated_at DESC);
CREATE INDEX metric_definitions_organisation_availability_idx
  ON public.metric_definitions (organisation_id, availability_status, updated_at DESC);
CREATE INDEX store_products_inventory_truth_idx
  ON public.store_products (organisation_id, inventory_ownership, inventory_source_status);
CREATE INDEX store_product_variants_availability_truth_idx
  ON public.store_product_variants (inventory_ownership, availability_source_status);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER set_capability_registry_updated_at BEFORE UPDATE ON public.capability_registry FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_metric_definitions_updated_at BEFORE UPDATE ON public.metric_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END;
$$;

ALTER TABLE public.capability_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read capability registry" ON public.capability_registry
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "members read metric definitions" ON public.metric_definitions
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));

-- Browsers may inspect truth status but cannot write it. A protected server
-- workflow must record verification and failure outcomes.
REVOKE ALL ON TABLE public.capability_registry, public.metric_definitions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.capability_registry, public.metric_definitions TO authenticated;

-- Registered capabilities are intentionally marked not_assessed until a real
-- source or execution outcome verifies them. This avoids decorative "ready"
-- or "live" claims during rollout.
INSERT INTO public.capability_registry (
  organisation_id, capability_key, name, module, purpose, data_sources,
  required_integration, automation_status, approval_requirement, business_impact
)
SELECT
  organisation.id,
  seed.capability_key,
  seed.name,
  seed.module,
  seed.purpose,
  seed.data_sources::jsonb,
  seed.required_integration,
  seed.automation_status,
  seed.approval_requirement,
  seed.business_impact
FROM public.organisations AS organisation
CROSS JOIN (
  VALUES
    ('growth-crm', 'Cossa Growth CRM', 'Revenue', 'Manage recorded leads, customers, opportunities and quotations.', '["leads", "customers", "opportunities", "quotations"]', NULL, 'manual', 'internal_write', 'critical'),
    ('store-catalogue', 'Cossa Store catalogue', 'Store', 'Manage product, fulfilment and supplier-source records.', '["store_products", "store_product_variants"]', NULL, 'manual', 'internal_write', 'high'),
    ('lead-hunter', 'Cossa Lead Hunter', 'AI Workforce', 'Research, enrich, qualify and draft from evidence-validated public prospect data.', '["agent_tasks", "leads", "agent_execution_events"]', 'Cossa Lead Hunter', 'scheduled', 'internal_write', 'high'),
    ('cossa-orchestrator', 'Cossa Orchestrator', 'AI Workforce', 'Coordinate approved multi-agent internal work through durable tasks.', '["agent_tasks", "agent_triggers", "agent_execution_events"]', 'Hosted worker', 'scheduled', 'production_change', 'critical'),
    ('provider-router', 'Model provider router', 'AI Workforce', 'Route approved reasoning requests through protected provider fallbacks.', '["agent_circuit_breakers", "agent_execution_events"]', 'Configured model provider', 'event_driven', 'none', 'high'),
    ('outreach-drafting', 'Outreach drafting', 'Revenue', 'Create internal outreach drafts from verified prospect evidence only.', '["leads", "approvals", "agent_tasks"]', 'Configured model provider', 'event_driven', 'external_communication', 'high'),
    ('social-publishing', 'Social publishing', 'Marketing', 'Prepare and publish social content only through an authorised connected account.', '["social_accounts", "social_posts"]', 'Authorised social account', 'not_automated', 'external_communication', 'high')
) AS seed(capability_key, name, module, purpose, data_sources, required_integration, automation_status, approval_requirement, business_impact)
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, capability_key) DO NOTHING;

INSERT INTO public.metric_definitions (
  organisation_id, metric_key, name, description, semantic_type, value_kind,
  source_systems, source_filters, freshness_seconds
)
SELECT
  organisation.id,
  seed.metric_key,
  seed.name,
  seed.description,
  seed.semantic_type,
  seed.value_kind,
  seed.source_systems::jsonb,
  seed.source_filters::jsonb,
  seed.freshness_seconds
FROM public.organisations AS organisation
CROSS JOIN (
  VALUES
    ('accepted-quotation-value', 'Accepted quotation value', 'Value of quotations marked accepted. This is a commercial commitment signal, not cash received.', 'calculation', 'currency', '["quotations"]', '{"status":"accepted"}', 3600),
    ('open-pipeline-value', 'Open pipeline value', 'Known estimated value attached to opportunities that are still open. Opportunities without a recorded value remain visibly unpriced.', 'calculation', 'currency', '["opportunities"]', '{"stages":"open"}', 3600),
    ('website-lead-count', 'Website lead count', 'Count of CRM leads attributed to the main website source.', 'fact', 'count', '["leads"]', '{"source_app":"main_website"}', 3600),
    ('paid-store-order-value', 'Paid Store order value', 'Payment-confirmed Store order value. This definition remains unassessed until payment status and settlement records are verified.', 'fact', 'currency', '["store_orders"]', '{"payment":"confirmed"}', 3600),
    ('cossa-owned-inventory-units', 'Cossa-owned inventory units', 'Only stock records explicitly marked Cossa-owned and verified. Supplier availability is excluded.', 'fact', 'count', '["store_products", "store_product_variants"]', '{"inventory_ownership":"cossa_owned","inventory_source_status":"verified"}', 3600)
) AS seed(metric_key, name, description, semantic_type, value_kind, source_systems, source_filters, freshness_seconds)
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, metric_key) DO NOTHING;

COMMIT;
