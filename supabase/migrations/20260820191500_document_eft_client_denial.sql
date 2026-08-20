-- Explicitly deny all browser-role access. EFT data is served only by the
-- authenticated Edge Function, which applies ownership and reviewer checks.

create policy "EFT payment settings deny direct client access"
on public.eft_payment_settings
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy "EFT payment requests deny direct client access"
on public.eft_payment_requests
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
