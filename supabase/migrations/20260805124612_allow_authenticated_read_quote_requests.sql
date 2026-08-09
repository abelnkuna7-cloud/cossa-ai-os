CREATE POLICY "Allow authenticated users read quote_requests"
ON public.quote_requests
FOR SELECT
TO authenticated
USING (true);

NOTIFY pgrst, 'reload schema';;
