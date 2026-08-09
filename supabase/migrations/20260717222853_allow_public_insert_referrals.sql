
-- Referral form is public-facing (footer "Refer & Earn 10%"), so anon visitors need insert access.
-- Existing "Allow authenticated users" policy stays for the dashboard (read/update/delete/manage).
CREATE POLICY "Allow public insert referrals" ON public.referrals
  FOR INSERT TO public WITH CHECK (true);
;
