-- Harden internal trigger functions without changing their business logic.
-- These functions are invoked by database triggers; browser/API roles never
-- need direct EXECUTE privileges on them.

BEGIN;

ALTER FUNCTION public.sync_supplier_fulfilment_to_store_order()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.sync_supplier_fulfilment_to_store_order()
  FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.touch_store_product_variant_updated_at()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.touch_store_product_variant_updated_at()
  FROM PUBLIC, anon, authenticated;

COMMIT;
