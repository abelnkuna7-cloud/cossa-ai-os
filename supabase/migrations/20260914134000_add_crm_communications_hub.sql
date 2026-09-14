create table if not exists public.crm_communications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  lead_id uuid null references public.leads(id) on delete set null,
  opportunity_id uuid null references public.opportunities(id) on delete set null,
  customer_id uuid null,
  company_id uuid null,
  channel text not null,
  provider text null,
  direction text not null default 'inbound',
  category text not null default 'other',
  status text not null default 'open',
  priority text not null default 'normal',
  requires_action boolean not null default false,
  contact_name text null,
  contact_email text null,
  contact_phone text null,
  company_name text null,
  subject text null,
  summary text null,
  external_message_id text null,
  external_thread_id text null,
  external_url text null,
  next_review_at timestamptz null,
  occurred_at timestamptz not null default now(),
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_communications_channel_nonempty check (char_length(btrim(channel)) > 0),
  constraint crm_communications_direction_check check (direction = any (array['inbound','outbound','internal'])),
  constraint crm_communications_priority_check check (priority = any (array['urgent','high','normal','low']))
);

create unique index if not exists crm_communications_external_message_unique
  on public.crm_communications (organisation_id, provider, external_message_id)
  where provider is not null and external_message_id is not null;

create index if not exists crm_communications_attention_idx
  on public.crm_communications (organisation_id, requires_action desc, next_review_at, occurred_at desc);

create index if not exists crm_communications_contact_email_idx
  on public.crm_communications (organisation_id, lower(contact_email))
  where contact_email is not null;

create index if not exists crm_communications_contact_phone_idx
  on public.crm_communications (organisation_id, contact_phone)
  where contact_phone is not null;

alter table public.crm_communications enable row level security;

drop policy if exists "members read crm communications" on public.crm_communications;
create policy "members read crm communications" on public.crm_communications
  for select to authenticated
  using (public.is_organisation_member(organisation_id));

drop policy if exists "members manage crm communications" on public.crm_communications;
create policy "members manage crm communications" on public.crm_communications
  for all to authenticated
  using (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']))
  with check (public.has_organisation_role(organisation_id, array['owner','admin','manager','member']));

insert into public.crm_option_values
  (organisation_id, category, key, label, semantic_status, sort_order, metadata)
select o.id, seed.category, seed.key, seed.label, null, seed.sort_order, '{}'::jsonb
from public.organisations o
cross join (
  values
    ('communication_category','customer','Customer',10),
    ('communication_category','lead','Lead / Sales',20),
    ('communication_category','payment_provider','Payment provider',30),
    ('communication_category','supplier','Supplier',40),
    ('communication_category','tender','Tender / RFQ',50),
    ('communication_category','partner','Partner',60),
    ('communication_category','compliance','Compliance',70),
    ('communication_category','security','Security',80),
    ('communication_category','other','Other',100),
    ('communication_status','open','Open',10),
    ('communication_status','waiting','Waiting',20),
    ('communication_status','watching','Watching',30),
    ('communication_status','resolved','Resolved',90),
    ('communication_status','rejected','Rejected / Not pursued',100),
    ('communication_channel','email','Email',10),
    ('communication_channel','whatsapp','WhatsApp',20),
    ('communication_channel','phone','Phone',30),
    ('communication_channel','meeting','Meeting',40),
    ('communication_channel','other','Other',100)
) as seed(category,key,label,sort_order)
on conflict (organisation_id, category, key) do nothing;
