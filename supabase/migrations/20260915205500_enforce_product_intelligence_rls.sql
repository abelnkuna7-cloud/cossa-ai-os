-- Run Product Manager intelligence with the caller's RLS context.
-- Authenticated Store owners/admins retain access through the existing
-- store_products policies; unrelated authenticated users receive no rows.

alter function public.store_product_manager_intelligence()
  security invoker;
