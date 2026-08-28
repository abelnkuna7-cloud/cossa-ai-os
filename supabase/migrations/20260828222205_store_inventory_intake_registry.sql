-- Store Inventory & Product Intake
--
-- Extends the current store_products catalogue instead of replacing it. These
-- private operational records keep supplier, fulfilment, pricing and import
-- evidence out of the public product catalogue.

BEGIN;

CREATE TABLE public.store_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'dropship'
    CHECK (partner_type IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'fulfilment', 'other')),
  business_model text NOT NULL DEFAULT 'dropship'
    CHECK (business_model IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'cossa_stock', 'other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'paused', 'rejected')),
  stock_origin text,
  source_url text,
  policy_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  operational_notes text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code),
  UNIQUE (organisation_id, name)
);

CREATE TABLE public.store_fulfilment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.store_suppliers(id) ON DELETE CASCADE,
  profile_code text NOT NULL,
  name text NOT NULL,
  fulfilment_method text NOT NULL,
  delivery_payer text NOT NULL DEFAULT 'customer'
    CHECK (delivery_payer IN ('customer', 'cossa', 'conditional', 'not_applicable')),
  delivery_method text,
  delivery_rule text,
  free_shipping_eligible boolean NOT NULL DEFAULT false,
  customer_delivery_notice text,
  internal_delivery_notes text,
  returns_profile_code text,
  customer_returns_notice text,
  warranty_profile_code text,
  customer_warranty_notice text,
  source_url text,
  operational_notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, profile_code)
);

CREATE TABLE public.store_product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL UNIQUE REFERENCES public.store_products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.store_suppliers(id) ON DELETE RESTRICT,
  fulfilment_profile_id uuid REFERENCES public.store_fulfilment_profiles(id) ON DELETE SET NULL,
  business_model text NOT NULL
    CHECK (business_model IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'cossa_stock', 'other')),
  supplier_product_ref text,
  stock_origin text,
  source_url text NOT NULL,
  import_status text NOT NULL DEFAULT 'manual'
    CHECK (import_status IN ('manual', 'imported', 'partial', 'blocked', 'failed')),
  fields_requiring_confirmation jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_status text NOT NULL DEFAULT 'not_checked'
    CHECK (stock_status IN ('available', 'unavailable', 'preorder', 'unknown', 'not_checked')),
  sync_status text NOT NULL DEFAULT 'not_connected'
    CHECK (sync_status IN ('verified', 'manual', 'stale', 'not_connected', 'failed', 'unknown')),
  supplier_cost numeric(12, 2),
  markup_percent numeric(7, 2) NOT NULL DEFAULT 35 CHECK (markup_percent >= 0),
  calculated_selling_price numeric(12, 2),
  selling_price_override numeric(12, 2),
  affiliate_commission_percent numeric(5, 2),
  affiliate_commission_note text,
  delivery_payer_override text
    CHECK (delivery_payer_override IS NULL OR delivery_payer_override IN ('customer', 'cossa', 'conditional', 'not_applicable')),
  delivery_method_override text,
  delivery_rule_override text,
  free_shipping_override boolean,
  returns_profile_override text,
  warranty_profile_override text,
  market_price numeric(12, 2),
  market_price_source_url text,
  market_price_notes text,
  approval_status text NOT NULL DEFAULT 'imported'
    CHECK (approval_status IN ('imported', 'review', 'draft', 'approved', 'published', 'paused')),
  last_price_checked_at timestamptz,
  last_stock_checked_at timestamptz,
  operational_notes text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, supplier_product_ref)
);

-- Only customer-safe wording is copied to the shopper catalogue. Supplier
-- identity, cost, source URL and internal rules remain in the private tables.
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS customer_fulfilment_label text,
  ADD COLUMN IF NOT EXISTS customer_delivery_notice text,
  ADD COLUMN IF NOT EXISTS customer_returns_notice text,
  ADD COLUMN IF NOT EXISTS customer_warranty_notice text;

ALTER TABLE public.store_public_products
  ADD COLUMN IF NOT EXISTS customer_fulfilment_label text,
  ADD COLUMN IF NOT EXISTS customer_delivery_notice text,
  ADD COLUMN IF NOT EXISTS customer_returns_notice text,
  ADD COLUMN IF NOT EXISTS customer_warranty_notice text;

CREATE OR REPLACE FUNCTION private.sync_store_public_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF tg_op = 'DELETE' THEN
    DELETE FROM public.store_public_products WHERE id = old.id;
    RETURN old;
  END IF;

  IF new.status <> 'active' THEN
    DELETE FROM public.store_public_products WHERE id = new.id;
    RETURN new;
  END IF;

  INSERT INTO public.store_public_products (
    id, name, slug, sku, product_type, status, short_description, description,
    category, brand, affiliate_url, currency, price, compare_at_price,
    track_inventory, stock_quantity, unlimited_stock, featured, image_urls,
    seo_title, seo_description, created_at, updated_at, fulfilment_model, partner_name,
    customer_fulfilment_label, customer_delivery_notice, customer_returns_notice,
    customer_warranty_notice
  ) VALUES (
    new.id, new.name, new.slug, new.sku, new.product_type, new.status,
    new.short_description, new.description, new.category, new.brand,
    new.affiliate_url, new.currency, new.price, new.compare_at_price,
    new.track_inventory, new.stock_quantity, new.unlimited_stock, new.featured,
    new.image_urls, new.seo_title, new.seo_description, new.created_at,
    new.updated_at, new.fulfilment_model,
    CASE WHEN new.product_type = 'affiliate' THEN new.supplier_name ELSE NULL END,
    new.customer_fulfilment_label, new.customer_delivery_notice, new.customer_returns_notice,
    new.customer_warranty_notice
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    slug = excluded.slug,
    sku = excluded.sku,
    product_type = excluded.product_type,
    status = excluded.status,
    short_description = excluded.short_description,
    description = excluded.description,
    category = excluded.category,
    brand = excluded.brand,
    affiliate_url = excluded.affiliate_url,
    currency = excluded.currency,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    track_inventory = excluded.track_inventory,
    stock_quantity = excluded.stock_quantity,
    unlimited_stock = excluded.unlimited_stock,
    featured = excluded.featured,
    image_urls = excluded.image_urls,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    fulfilment_model = excluded.fulfilment_model,
    partner_name = excluded.partner_name,
    customer_fulfilment_label = excluded.customer_fulfilment_label,
    customer_delivery_notice = excluded.customer_delivery_notice,
    customer_returns_notice = excluded.customer_returns_notice,
    customer_warranty_notice = excluded.customer_warranty_notice;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_store_product_fulfilment_notices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile public.store_fulfilment_profiles%ROWTYPE;
  source_row public.store_product_sources%ROWTYPE;
BEGIN
  IF tg_table_name = 'store_product_sources' THEN
    IF tg_op = 'DELETE' THEN RETURN old; END IF;
    IF new.fulfilment_profile_id IS NULL THEN RETURN new; END IF;
    source_row := new;
    SELECT * INTO profile FROM public.store_fulfilment_profiles WHERE id = source_row.fulfilment_profile_id;
    IF NOT FOUND THEN RETURN new; END IF;
    UPDATE public.store_products
    SET
      customer_fulfilment_label = CASE
        WHEN lower(coalesce(source_row.stock_origin, '')) LIKE '%south africa%' THEN 'Local SA fulfilment'
        WHEN source_row.business_model = 'affiliate' THEN 'Partner fulfilment'
        WHEN source_row.business_model = 'pod' THEN 'Made to order'
        ELSE 'Fulfilment information'
      END,
      customer_delivery_notice = profile.customer_delivery_notice,
      customer_returns_notice = profile.customer_returns_notice,
      customer_warranty_notice = profile.customer_warranty_notice
    WHERE id = source_row.product_id;
    RETURN new;
  END IF;

  UPDATE public.store_products AS product
  SET
    customer_delivery_notice = new.customer_delivery_notice,
    customer_returns_notice = new.customer_returns_notice,
    customer_warranty_notice = new.customer_warranty_notice
  FROM public.store_product_sources AS source
  WHERE source.fulfilment_profile_id = new.id
    AND product.id = source.product_id;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_store_product_fulfilment_notices() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER sync_store_product_notices_after_source_change
  AFTER INSERT OR UPDATE OF fulfilment_profile_id, stock_origin, business_model ON public.store_product_sources
  FOR EACH ROW EXECUTE FUNCTION private.sync_store_product_fulfilment_notices();
CREATE TRIGGER sync_store_product_notices_after_profile_change
  AFTER UPDATE OF customer_delivery_notice, customer_returns_notice, customer_warranty_notice
  ON public.store_fulfilment_profiles
  FOR EACH ROW EXECUTE FUNCTION private.sync_store_product_fulfilment_notices();

CREATE INDEX store_suppliers_organisation_status_idx
  ON public.store_suppliers (organisation_id, status, name);
CREATE INDEX store_fulfilment_profiles_supplier_active_idx
  ON public.store_fulfilment_profiles (supplier_id, is_active, name);
CREATE INDEX store_product_sources_organisation_review_idx
  ON public.store_product_sources (organisation_id, approval_status, updated_at DESC);
CREATE INDEX store_product_sources_supplier_check_idx
  ON public.store_product_sources (supplier_id, sync_status, last_stock_checked_at);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER set_store_suppliers_updated_at BEFORE UPDATE ON public.store_suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_store_fulfilment_profiles_updated_at BEFORE UPDATE ON public.store_fulfilment_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER set_store_product_sources_updated_at BEFORE UPDATE ON public.store_product_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END;
$$;

ALTER TABLE public.store_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_fulfilment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read store suppliers" ON public.store_suppliers
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage suppliers" ON public.store_suppliers
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );

CREATE POLICY "members read fulfilment profiles" ON public.store_fulfilment_profiles
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage fulfilment profiles" ON public.store_fulfilment_profiles
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );

CREATE POLICY "members read product source records" ON public.store_product_sources
  FOR SELECT TO authenticated
  USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage product source records" ON public.store_product_sources
  FOR ALL TO authenticated
  USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) )
  WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])) );

REVOKE ALL ON TABLE public.store_suppliers, public.store_fulfilment_profiles, public.store_product_sources
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_suppliers, public.store_fulfilment_profiles, public.store_product_sources
  TO authenticated;

-- DMC is the first approved Store supplier. The profile intentionally avoids
-- inventing delivery times, prices or return terms: those must be verified for
-- each product during review.
INSERT INTO public.store_suppliers (
  organisation_id, code, name, partner_type, business_model, status, stock_origin, operational_notes
)
SELECT
  organisation.id,
  'dmc-wholesale',
  'DMC Wholesale',
  'dropship',
  'dropship',
  'active',
  'South Africa',
  'Initial local-dropshipping supplier record. Confirm product-specific price, stock, delivery, returns and warranty information before approval.'
FROM public.organisations AS organisation
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, code) DO NOTHING;

INSERT INTO public.store_fulfilment_profiles (
  organisation_id, supplier_id, profile_code, name, fulfilment_method, delivery_payer,
  delivery_rule, free_shipping_eligible, customer_delivery_notice, customer_returns_notice,
  operational_notes
)
SELECT
  supplier.organisation_id,
  supplier.id,
  'dmc-sa-customer-paid',
  'Local SA fulfilment — customer-paid delivery',
  'Supplier direct-to-customer',
  'customer',
  'Delivery is normally customer-paid. Confirm the delivery method, charge and estimate for each product before approval.',
  false,
  'Delivery is charged separately. The delivery estimate shown at checkout applies. Cossa Store Delivery and Returns Terms remain in force.',
  'Cossa Store customer terms apply. Confirm product-specific return and warranty eligibility during review.',
  'Supplier terms guide Cossa operations but do not replace Cossa customer terms. Do not promise dispatch or delivery timing until verified.'
FROM public.store_suppliers AS supplier
WHERE supplier.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
  AND supplier.code = 'dmc-wholesale'
ON CONFLICT (organisation_id, profile_code) DO NOTHING;

COMMIT;
