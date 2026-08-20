-- Defence in depth: public Store pages submit quote requests through the
-- approved RPC, but never need to read the quote table. Keep SELECT explicit
-- for signed-in GROWTH users, then let the manager-only RLS policy decide
-- which of those users may see a quotation.

GRANT SELECT ON TABLE public.quote_requests TO authenticated;
REVOKE SELECT ON TABLE public.quote_requests FROM anon;
REVOKE SELECT ON TABLE public.quote_requests FROM PUBLIC;

ALTER TABLE public.quote_requests FORCE ROW LEVEL SECURITY;
