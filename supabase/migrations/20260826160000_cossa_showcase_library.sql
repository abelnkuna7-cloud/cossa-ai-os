-- Cossa Growth Showcase Library.
--
-- Additive, authenticated and organisation-isolated. These records describe
-- real Cossa systems, authorised client work, or explicitly labelled
-- capability samples. They never create public publication or customer
-- outreach by themselves.

BEGIN;

CREATE TABLE public.showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 12 AND 2000),
  business_name text NOT NULL DEFAULT 'Cossa Nexus Holdings',
  capability text NOT NULL,
  industry text,
  classification text NOT NULL CHECK (classification IN (
    'capability_sample', 'live_cossa_system', 'verified_client_work'
  )),
  asset_type text NOT NULL CHECK (asset_type IN (
    'website', 'landing_page', 'ecommerce', 'local_seo', 'company_profile',
    'brochure', 'flyer', 'brand_identity', 'social_campaign', 'crm_dashboard',
    'ai_assistant', 'automation', 'integration', 'analytics_dashboard',
    'document_workflow', 'customer_journey', 'video', 'other'
  )),
  platform_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign text,
  thumbnail_url text,
  source_asset_url text,
  demo_url text,
  video_url text,
  cta_label text,
  destination_url text,
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
    'draft', 'internal', 'published', 'archived'
  )),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'not_required', 'pending', 'approved', 'rejected'
  )),
  approval_note text,
  client_authorisation_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (publication_status <> 'published' OR approval_status = 'approved'),
  CHECK (
    classification <> 'verified_client_work'
    OR char_length(btrim(coalesce(client_authorisation_reference, ''))) > 0
  )
);

CREATE TABLE public.showcase_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  showcase_item_id uuid NOT NULL REFERENCES public.showcase_items(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'demo_open', 'cta_click', 'lead_capture')),
  source text,
  campaign text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX showcase_items_organisation_status_idx
  ON public.showcase_items (organisation_id, publication_status, updated_at DESC);
CREATE INDEX showcase_items_organisation_classification_idx
  ON public.showcase_items (organisation_id, classification, asset_type);
CREATE INDEX showcase_events_item_time_idx
  ON public.showcase_events (showcase_item_id, occurred_at DESC);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER set_showcase_items_updated_at BEFORE UPDATE ON public.showcase_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END;
$$;

ALTER TABLE public.showcase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read showcase items" ON public.showcase_items
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "managers manage showcase items" ON public.showcase_items
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])))
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])));

-- Event records are intentionally read-only in the browser. A later protected
-- public tracking endpoint may record attributed events after consent checks.
CREATE POLICY "members read showcase events" ON public.showcase_events
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));

REVOKE ALL ON TABLE public.showcase_items, public.showcase_events FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.showcase_items TO authenticated;
GRANT SELECT ON TABLE public.showcase_events TO authenticated;

-- These are real, internal Cossa platform records—not client work or public
-- claims. They remain internal until a content owner approves a public asset.
INSERT INTO public.showcase_items (
  organisation_id, title, description, business_name, capability, industry,
  classification, asset_type, tags, destination_url, publication_status,
  approval_status, approval_note
)
SELECT
  organisation.id,
  seed.title,
  seed.description,
  seed.business_name,
  seed.capability,
  seed.industry,
  'live_cossa_system',
  seed.asset_type,
  seed.tags::jsonb,
  seed.destination_url,
  'internal',
  'approved',
  'Internal operating record verified from the current Growth workspace.'
FROM public.organisations AS organisation
CROSS JOIN (
  VALUES
    ('Cossa Growth Command Center', 'A live Cossa operating workspace that brings recorded CRM, quotations, projects, tasks and appointments into one management view.', 'Cossa AI Growth', 'Business command centre', 'Business operations', 'analytics_dashboard', '["Growth", "CRM", "operations"]', '/command-center'),
    ('Cossa AI Workforce', 'The controlled workforce interface for Cossa employees, specialist agents, missions, approvals and evidence-based internal work.', 'Cossa AI Growth', 'AI workforce coordination', 'Business operations', 'ai_assistant', '["AI workforce", "approvals", "orchestration"]', '/ai/workforce'),
    ('Lead Hunter Proof Workflow', 'A controlled internal workflow that researches, enriches, qualifies, deduplicates and drafts outreach for owner review. It does not send communication.', 'Cossa AI Growth', 'Lead research and qualification', 'Customer acquisition', 'automation', '["Lead Hunter", "CRM", "approval required"]', '/ai/orchestrator'),
    ('Cossa Store Operations', 'The existing Store workspace for catalogue, product source provenance, supplier-connected fulfilment and quote-request reporting.', 'Cossa Store', 'E-commerce operations', 'E-commerce', 'ecommerce', '["Store", "catalogue", "inventory provenance"]', '/businesses/store'),
    ('NexDocs Workflow', 'The existing document-business workspace for production documents, customer records and controlled document workflows.', 'NexDocs', 'Document workflow', 'Professional services', 'document_workflow', '["NexDocs", "documents", "operations"]', '/businesses/nexdocs'),
    ('Construction Customer Journey', 'The existing Cossa Construction workspace for lead, quotation, project and delivery coordination.', 'Cossa Nexus Construction', 'Construction service journey', 'Construction', 'customer_journey', '["Construction", "quotations", "projects"]', '/businesses/construction'),
    ('Facility Services Customer Journey', 'The existing Facility Services workspace for enquiries, service coordination and operational delivery records.', 'Cossa Facility Services', 'Facility services journey', 'Facility services', 'customer_journey', '["Facility services", "leads", "operations"]', '/businesses/facility-services')
) AS seed(title, description, business_name, capability, industry, asset_type, tags, destination_url)
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM public.showcase_items existing
    WHERE existing.organisation_id = organisation.id
      AND existing.title = seed.title
  );

COMMIT;
