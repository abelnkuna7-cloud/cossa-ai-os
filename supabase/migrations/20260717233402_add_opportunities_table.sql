
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('property_manager','school','church','office_park','shopping_centre','estate_agent')),
  contact_name text,
  contact_phone text,
  contact_email text,
  location text,
  estimated_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect','qualified','engaged','won','lost')),
  last_contact_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON public.opportunities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
;
