-- Store Inventory & Product Intake — additive internal workflow only
-- This migration does not alter Store catalogue tables, functions, triggers or customer-facing behaviour.
-- Publication integration is deferred outside supabase/migrations for separate production review.

BEGIN;

CREATE TABLE public.store_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id),
  code text NOT NULL,
  name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'dropship' CHECK (partner_type IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'fulfilment', 'other')),
  business_model text NOT NULL DEFAULT 'dropship' CHECK (business_model IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'cossa_stock', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'paused', 'rejected')),
  stock_origin text,
  source_url text,
  policy_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  operational_notes text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code),
  UNIQUE (organisation_id, name)
);

CREATE TABLE public.store_fulfilment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id),
  supplier_id uuid NOT NULL REFERENCES public.store_suppliers(id),
  profile_code text NOT NULL,
  name text NOT NULL,
  fulfilment_method text NOT NULL,
  delivery_payer text NOT NULL DEFAULT 'customer' CHECK (delivery_payer IN ('customer', 'cossa', 'conditional', 'not_applicable')),
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
  UNIQUE (organisation_id, profile_code)
);

CREATE TABLE public.store_inventory_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id),
  supplier_id uuid NOT NULL REFERENCES public.store_suppliers(id),
  fulfilment_profile_id uuid REFERENCES public.store_fulfilment_profiles(id),
  name text NOT NULL,
  cossa_sku text,
  short_description text,
  description text,
  specifications text,
  category text,
  brand text,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  affiliate_url text,
  business_model text NOT NULL CHECK (business_model IN ('dropship', 'affiliate', 'wholesale', 'pod', 'marketplace', 'cossa_stock', 'other')),
  supplier_product_ref text,
  stock_origin text,
  source_url text NOT NULL,
  import_status text NOT NULL DEFAULT 'manual' CHECK (import_status IN ('manual', 'imported', 'partial', 'blocked', 'failed')),
  fields_requiring_confirmation jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_status text NOT NULL DEFAULT 'not_checked' CHECK (stock_status IN ('available', 'unavailable', 'preorder', 'unknown', 'not_checked')),
  sync_status text NOT NULL DEFAULT 'not_connected' CHECK (sync_status IN ('verified', 'manual', 'stale', 'not_connected', 'failed', 'unknown')),
  supplier_cost numeric(12, 2),
  markup_percent numeric(7, 2) NOT NULL DEFAULT 25 CHECK (markup_percent >= 0),
  calculated_selling_price numeric(12, 2),
  selling_price_override numeric(12, 2),
  compare_at_price numeric(12, 2),
  affiliate_commission_percent numeric(5, 2),
  affiliate_commission_note text,
  delivery_payer_override text CHECK (delivery_payer_override IS NULL OR delivery_payer_override IN ('customer', 'cossa', 'conditional', 'not_applicable')),
  delivery_method_override text,
  delivery_rule_override text,
  free_shipping_override boolean,
  returns_profile_override text,
  warranty_profile_override text,
  market_price numeric(12, 2),
  market_price_source_url text,
  market_price_notes text,
  approval_status text NOT NULL DEFAULT 'imported' CHECK (approval_status IN ('imported', 'review', 'draft', 'approved', 'paused')),
  last_price_checked_at timestamptz,
  last_stock_checked_at timestamptz,
  operational_notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, supplier_product_ref)
);

CREATE INDEX store_suppliers_organisation_status_idx ON public.store_suppliers (organisation_id, status, name);
CREATE INDEX store_fulfilment_profiles_supplier_active_idx ON public.store_fulfilment_profiles (supplier_id, is_active, name);
CREATE INDEX store_inventory_intakes_organisation_review_idx ON public.store_inventory_intakes (organisation_id, approval_status, created_at DESC);
CREATE INDEX store_inventory_intakes_supplier_check_idx ON public.store_inventory_intakes (supplier_id, sync_status, last_stock_checked_at);

ALTER TABLE public.store_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_fulfilment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read store suppliers" ON public.store_suppliers FOR SELECT TO authenticated USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage suppliers" ON public.store_suppliers FOR ALL TO authenticated USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))) WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])));
CREATE POLICY "members read fulfilment profiles" ON public.store_fulfilment_profiles FOR SELECT TO authenticated USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage fulfilment profiles" ON public.store_fulfilment_profiles FOR ALL TO authenticated USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))) WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])));
CREATE POLICY "members read inventory intakes" ON public.store_inventory_intakes FOR SELECT TO authenticated USING ((SELECT private.is_organisation_member(organisation_id)));
CREATE POLICY "store leaders manage inventory intakes" ON public.store_inventory_intakes FOR ALL TO authenticated USING ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager']))) WITH CHECK ((SELECT private.has_organisation_role(organisation_id, ARRAY['owner', 'admin', 'manager'])));

REVOKE ALL ON TABLE public.store_suppliers, public.store_fulfilment_profiles, public.store_inventory_intakes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_suppliers, public.store_fulfilment_profiles, public.store_inventory_intakes TO authenticated;

-- DMC defaults are internal operational records only. No customer-facing product or catalogue row is created.
INSERT INTO public.store_suppliers (organisation_id, code, name, partner_type, business_model, status, stock_origin, operational_notes)
SELECT organisation.id, 'dmc-wholesale', 'DMC Wholesale', 'dropship', 'dropship', 'active', 'South Africa', 'Initial local-dropshipping supplier record. Confirm product-specific price, stock, delivery, returns and warranty information before approval.'
FROM public.organisations AS organisation
WHERE organisation.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (organisation_id, code) DO NOTHING;

INSERT INTO public.store_fulfilment_profiles (organisation_id, supplier_id, profile_code, name, fulfilment_method, delivery_payer, delivery_rule, free_shipping_eligible, customer_delivery_notice, customer_returns_notice, operational_notes)
SELECT supplier.organisation_id, supplier.id, 'dmc-sa-customer-paid', 'Local SA fulfilment — customer-paid delivery', 'Supplier direct-to-customer', 'customer', 'Delivery is normally customer-paid. Confirm the delivery method, charge and estimate for each product before approval.', false, 'Delivery is charged separately. The delivery estimate shown at checkout applies. Cossa Store Delivery and Returns Terms remain in force.', 'Cossa Store customer terms apply. Confirm product-specific return and warranty eligibility during review.', 'Supplier terms guide Cossa operations but do not replace Cossa customer terms. Do not promise dispatch or delivery timing until verified.'
FROM public.store_suppliers AS supplier
WHERE supplier.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid AND supplier.code = 'dmc-wholesale'
ON CONFLICT (organisation_id, profile_code) DO NOTHING;

COMMIT;
