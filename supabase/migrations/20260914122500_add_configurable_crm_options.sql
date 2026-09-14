create table if not exists public.crm_option_values (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  category text not null,
  key text not null,
  label text not null,
  semantic_status text null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_option_values_category_nonempty check (char_length(btrim(category)) > 0),
  constraint crm_option_values_key_nonempty check (char_length(btrim(key)) > 0),
  constraint crm_option_values_label_nonempty check (char_length(btrim(label)) > 0),
  constraint crm_option_values_semantic_status_check check (
    semantic_status is null or semantic_status = any (array['prospect','qualified','engaged','won','lost'])
  ),
  constraint crm_option_values_org_category_key_unique unique (organisation_id, category, key)
);

create index if not exists crm_option_values_org_category_order_idx
  on public.crm_option_values (organisation_id, category, is_active desc, sort_order, label);

alter table public.crm_option_values enable row level security;

drop policy if exists "members read crm options" on public.crm_option_values;
create policy "members read crm options" on public.crm_option_values
  for select to authenticated
  using (public.is_organisation_member(organisation_id));

drop policy if exists "members manage crm options" on public.crm_option_values;
create policy "members manage crm options" on public.crm_option_values
  for all to authenticated
  using (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']))
  with check (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']));

-- Opportunity types are business configuration now, not a schema enum.
alter table public.opportunities drop constraint if exists opportunities_opportunity_type_check;

insert into public.crm_option_values
  (organisation_id, category, key, label, semantic_status, sort_order, metadata)
select o.id, seed.category, seed.key, seed.label, seed.semantic_status, seed.sort_order, seed.metadata
from public.organisations o
cross join (
  values
    ('opportunity_type','procurement','Procurement',null,10,'{}'::jsonb),
    ('opportunity_type','construction','Construction',null,20,'{}'::jsonb),
    ('opportunity_type','facility_services','Facility Services',null,30,'{}'::jsonb),
    ('opportunity_type','technology','Technology',null,40,'{}'::jsonb),
    ('opportunity_type','ecommerce','E-commerce / Store',null,50,'{}'::jsonb),
    ('opportunity_type','saas','SaaS',null,60,'{}'::jsonb),
    ('opportunity_type','partnership','Partnership',null,70,'{}'::jsonb),
    ('opportunity_type','tender','Tender / RFQ',null,80,'{}'::jsonb),
    ('opportunity_type','property_manager','Property Manager',null,110,'{"legacy":true}'::jsonb),
    ('opportunity_type','school','School',null,120,'{"legacy":true}'::jsonb),
    ('opportunity_type','church','Church',null,130,'{"legacy":true}'::jsonb),
    ('opportunity_type','office_park','Office Park',null,140,'{"legacy":true}'::jsonb),
    ('opportunity_type','shopping_centre','Shopping Centre',null,150,'{"legacy":true}'::jsonb),
    ('opportunity_type','estate_agent','Estate Agent',null,160,'{"legacy":true}'::jsonb),
    ('opportunity_stage','prospect','Prospect','prospect',10,'{}'::jsonb),
    ('opportunity_stage','qualified','Qualified','qualified',20,'{}'::jsonb),
    ('opportunity_stage','proposal','Proposal','engaged',30,'{}'::jsonb),
    ('opportunity_stage','negotiation','Negotiation','engaged',40,'{}'::jsonb),
    ('opportunity_stage','won','Won','won',90,'{}'::jsonb),
    ('opportunity_stage','lost','Lost','lost',100,'{}'::jsonb),
    ('lead_source','website','Website',null,10,'{}'::jsonb),
    ('lead_source','referral','Referral',null,20,'{}'::jsonb),
    ('lead_source','google','Google',null,30,'{}'::jsonb),
    ('lead_source','meta','Meta',null,40,'{}'::jsonb),
    ('lead_source','whatsapp','WhatsApp',null,50,'{}'::jsonb),
    ('lead_source','email','Email',null,60,'{}'::jsonb),
    ('lead_source','cold_outbound','Cold outbound',null,70,'{}'::jsonb),
    ('lead_source','event','Event',null,80,'{}'::jsonb),
    ('lead_source','tender_portal','Tender portal',null,90,'{}'::jsonb),
    ('follow_up_channel','phone','Phone',null,10,'{}'::jsonb),
    ('follow_up_channel','email','Email',null,20,'{}'::jsonb),
    ('follow_up_channel','whatsapp','WhatsApp',null,30,'{}'::jsonb),
    ('follow_up_channel','sms','SMS',null,40,'{}'::jsonb),
    ('follow_up_channel','meeting','Meeting',null,50,'{}'::jsonb),
    ('follow_up_channel','other','Other',null,60,'{}'::jsonb)
) as seed(category,key,label,semantic_status,sort_order,metadata)
on conflict (organisation_id, category, key) do nothing;
