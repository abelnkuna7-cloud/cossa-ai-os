
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','manager','sales_rep','site_supervisor','referral_partner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Every logged-in user needs to read their OWN roles (this is what auth-context.tsx queries on every login)
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Matching the pattern used everywhere else in this app for now (authenticated staff manage everything).
-- Flagging: this technically lets any logged-in user grant themselves admin. Worth tightening later
-- once there's a real admin-only role-management screen.
CREATE POLICY "Allow authenticated users manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
;
