-- Store quotation records carry contact and project information. They are
-- visible in GROWTH only to active Cossa owners, admins and managers; public
-- Store users keep no read path to submitted quotations.

DROP POLICY IF EXISTS "Allow authenticated users read quote_requests"
  ON public.quote_requests;

DROP POLICY IF EXISTS "Cossa managers read quote requests"
  ON public.quote_requests;

CREATE POLICY "Cossa managers read quote requests"
  ON public.quote_requests
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_organisation_role(
      '00000000-0000-4000-8000-000000000001'::uuid,
      ARRAY['owner', 'admin', 'manager']
    ))
  );
