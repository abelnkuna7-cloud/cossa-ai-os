
-- Fix column name mismatch: code inserts referee_name/referee_phone, table had referred_name/referred_phone
ALTER TABLE public.referrals RENAME COLUMN referred_name TO referee_name;
ALTER TABLE public.referrals RENAME COLUMN referred_phone TO referee_phone;

-- Create missing contact_messages table (admin inbox — referrals + presumably a Contact Us form)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text,
  message text,
  status text DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admin inbox: only authenticated (dashboard) can read/manage.
-- Inserts happen server-side via supabaseAdmin (service role, bypasses RLS) — no public policy needed
-- unless there's a public "Contact Us" form; add public insert too just in case one exists.
CREATE POLICY "Allow authenticated users" ON public.contact_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert contact_messages" ON public.contact_messages
  FOR INSERT TO public WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
;
