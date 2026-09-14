drop policy if exists "members manage crm communications" on public.crm_communications;
drop policy if exists "members insert crm communications" on public.crm_communications;
drop policy if exists "members update crm communications" on public.crm_communications;
drop policy if exists "members delete crm communications" on public.crm_communications;

create policy "members insert crm communications" on public.crm_communications
  for insert to authenticated
  with check (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']));

create policy "members update crm communications" on public.crm_communications
  for update to authenticated
  using (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']))
  with check (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']));

create policy "members delete crm communications" on public.crm_communications
  for delete to authenticated
  using (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']));
