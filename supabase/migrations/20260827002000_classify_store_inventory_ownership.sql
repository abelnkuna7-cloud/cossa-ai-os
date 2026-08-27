-- Classify Cossa Store inventory ownership from the recorded fulfilment model.
--
-- IMPORTANT:
-- - This migration does NOT claim supplier inventory is verified.
-- - It does NOT fabricate stock quantities or supplier availability.
-- - inventory_source_status remains unchanged unless it is currently NULL;
--   unknown/not-connected states stay truthful until a real supplier sync records evidence.
-- - This file is committed to the preview branch only until explicitly applied.

BEGIN;

UPDATE public.store_products
SET inventory_ownership = CASE
      WHEN product_type = 'digital' OR fulfilment_model = 'digital' THEN 'digital'
      WHEN product_type = 'affiliate' OR fulfilment_model = 'affiliate' THEN 'affiliate_merchant'
      WHEN product_type = 'pod' OR fulfilment_model = 'print_on_demand' THEN 'pod_managed'
      WHEN product_type = 'dropshipping'
        OR fulfilment_model IN ('local_dropshipping', 'international_dropshipping', 'local_supplier')
        THEN 'supplier_managed'
      WHEN fulfilment_model = 'cossa_stock' THEN 'cossa_owned'
      ELSE COALESCE(inventory_ownership, 'unknown')
    END,
    inventory_source_status = COALESCE(inventory_source_status, 'unknown'),
    updated_at = now()
WHERE inventory_ownership IS NULL
   OR inventory_ownership = 'unknown';

-- Do not infer verification from a supplier reference alone. A source becomes
-- verified only when an authorised sync or human verification process records
-- a source reference, evidence and verification timestamp.
UPDATE public.store_products
SET inventory_source_status = 'unknown',
    updated_at = now()
WHERE inventory_source_status = 'verified'
  AND inventory_last_verified_at IS NULL;

COMMIT;
