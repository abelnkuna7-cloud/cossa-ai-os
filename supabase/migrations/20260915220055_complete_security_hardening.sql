-- Complete the public intake and CRM RPC hardening pass.
-- Public lead/quote submission remains available, but only through bounded,
-- duplicate-safe entry points. Internal and trigger functions retain no
-- browser-callable EXECUTE capability.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

create or replace function public.ingest_cossa_lead(
  p_source_app text,
  p_source_record_id text,
  p_lead_type text,
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_service text default null,
  p_location text default null,
  p_notes text default null,
  p_company text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns table(lead_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_app text;
  v_source_label text;
  v_lead_id uuid;
  v_headers jsonb;
  v_subject text;
  v_subject_attempts integer;
  v_source_attempts integer;
  v_lead_type text;
  v_email text;
  v_phone text;
  v_payload jsonb;
begin
  v_source_app := pg_catalog.lower(nullif(pg_catalog.btrim(p_source_app), ''));
  v_source_label := case v_source_app
    when 'main_website' then 'MAIN WEBSITE'
    when 'cossa_store' then 'COSSA STORE'
    when 'nexdocs' then 'NEXDOCS'
    when 'cossa_growth' then 'COSSA GROWTH'
    when 'cossa_nexus_construction' then 'COSSA NEXUS CONSTRUCTION'
    when 'cossa_facility_services' then 'COSSA FACILITY SERVICES'
    when 'cossa_tech' then 'COSSA TECH'
    else null
  end;

  if v_source_label is null then
    raise exception 'Unsupported source application' using errcode = '22023';
  end if;

  if coalesce(pg_catalog.btrim(p_source_record_id), '') = ''
     or pg_catalog.length(p_source_record_id) > 200 then
    raise exception 'A source record identifier of up to 200 characters is required'
      using errcode = '22023';
  end if;

  v_lead_type := pg_catalog.lower(nullif(pg_catalog.btrim(p_lead_type), ''));
  if v_lead_type is null or pg_catalog.length(v_lead_type) > 80 then
    raise exception 'A lead type of up to 80 characters is required' using errcode = '22023';
  end if;

  if not (
    (v_source_app = 'main_website' and v_lead_type = any(array[
      'contact_form','quote_request','callback','callback_request',
      'corporate_quote_request','growth_quote_request','inspection_booking','partnership_enquiry'
    ]))
    or (v_source_app = 'cossa_store' and v_lead_type = any(array[
      'quote_request','callback','callback_request','contact_message','product_enquiry','restock_request'
    ]))
    or (v_source_app = 'nexdocs' and v_lead_type = any(array[
      'contact_form','demo_request','subscription_enquiry','support_request'
    ]))
    or (v_source_app = 'cossa_growth' and v_lead_type = any(array[
      'contact_form','quote_request','demo_request','consultation_request','procurement'
    ]))
    or (v_source_app = 'cossa_nexus_construction' and v_lead_type = any(array[
      'contact_form','quote_request','callback_request','inspection_booking'
    ]))
    or (v_source_app = 'cossa_facility_services' and v_lead_type = any(array[
      'contact_form','quote_request','callback_request','inspection_booking'
    ]))
    or (v_source_app = 'cossa_tech' and v_lead_type = any(array[
      'contact_form','quote_request','callback_request','consultation_request','demo_request'
    ]))
  ) then
    raise exception 'Unsupported lead type for this source application' using errcode = '22023';
  end if;

  if coalesce(pg_catalog.btrim(p_full_name), '') = ''
     or pg_catalog.length(p_full_name) > 200 then
    raise exception 'A full name of up to 200 characters is required' using errcode = '22023';
  end if;

  v_email := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), '');
  v_phone := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  if v_email is null and v_phone is null then
    raise exception 'An email address or phone number is required' using errcode = '22023';
  end if;
  if v_email is not null and (
    pg_catalog.length(v_email) > 255
    or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,63}$'
  ) then
    raise exception 'Provide a valid email address' using errcode = '22023';
  end if;
  if v_phone is not null and (
    pg_catalog.length(v_phone) > 40
    or pg_catalog.length(pg_catalog.regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 20
  ) then
    raise exception 'Provide a valid phone number' using errcode = '22023';
  end if;

  if p_service is not null and pg_catalog.length(p_service) > 300 then
    raise exception 'Service is too long' using errcode = '22023';
  end if;
  if p_location is not null and pg_catalog.length(p_location) > 300 then
    raise exception 'Location is too long' using errcode = '22023';
  end if;
  if p_notes is not null and pg_catalog.length(p_notes) > 10000 then
    raise exception 'Notes are too long' using errcode = '22023';
  end if;
  if p_company is not null and pg_catalog.length(p_company) > 250 then
    raise exception 'Company name is too long' using errcode = '22023';
  end if;

  if p_raw_payload is null or pg_catalog.jsonb_typeof(p_raw_payload) <> 'object'
     or pg_catalog.octet_length(p_raw_payload::text) > 12000 then
    raise exception 'The enquiry payload must be a JSON object smaller than 12KB'
      using errcode = '22023';
  end if;

  -- Never persist caller-supplied authorization, ownership or CRM control fields.
  v_payload := p_raw_payload - array[
    'organisation_id','business_unit_id','owner_user_id','employee_id','assigned_by',
    'role','permissions','status','stage','score','priority','metadata','suppress_owner_alert'
  ];

  select lead.id into v_lead_id
  from public.leads as lead
  where lead.source_app = v_source_app
    and lead.source_record_id = pg_catalog.btrim(p_source_record_id)
  limit 1;

  if v_lead_id is not null then
    return query select v_lead_id, false;
    return;
  end if;

  begin
    v_headers := coalesce(
      nullif(pg_catalog.current_setting('request.headers', true), ''), '{}'
    )::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_subject := coalesce(
    nullif(pg_catalog.btrim(pg_catalog.split_part(
      coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1
    )), ''),
    v_email,
    nullif(pg_catalog.regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), ''),
    'anonymous'
  );

  insert into public.lead_intake_rate_limits(source_app, subject_hash, window_started_at, attempts)
  values (
    v_source_app,
    pg_catalog.md5('subject:' || v_source_app || ':' || v_subject),
    pg_catalog.date_trunc('hour', pg_catalog.now()),
    1
  )
  on conflict (source_app, subject_hash, window_started_at)
  do update set attempts = public.lead_intake_rate_limits.attempts + 1
  returning attempts into v_subject_attempts;

  if v_subject_attempts > 8 then
    raise exception 'Too many enquiries from this source. Please try again later.' using errcode = '22023';
  end if;

  insert into public.lead_intake_rate_limits(source_app, subject_hash, window_started_at, attempts)
  values (
    v_source_app,
    pg_catalog.md5('source-global:' || v_source_app),
    pg_catalog.date_trunc('hour', pg_catalog.now()),
    1
  )
  on conflict (source_app, subject_hash, window_started_at)
  do update set attempts = public.lead_intake_rate_limits.attempts + 1
  returning attempts into v_source_attempts;

  if v_source_attempts > 300 then
    raise exception 'This enquiry channel is temporarily busy. Please try again later.' using errcode = '22023';
  end if;

  insert into public.leads(
    organisation_id, full_name, name, email, phone, service, location, source,
    status, stage, notes, company, source_app, source_label, source_record_id,
    lead_type, raw_payload
  ) values (
    '00000000-0000-4000-8000-000000000001'::uuid,
    pg_catalog.btrim(p_full_name), pg_catalog.btrim(p_full_name), v_email, v_phone,
    nullif(pg_catalog.btrim(coalesce(p_service, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_location, '')), ''),
    v_source_app || ':' || v_lead_type, 'new', 'new_lead',
    nullif(pg_catalog.btrim(coalesce(p_notes, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_company, '')), ''),
    v_source_app, v_source_label, pg_catalog.btrim(p_source_record_id), v_lead_type, v_payload
  ) returning id into v_lead_id;

  return query select v_lead_id, true;
end;
$$;

revoke execute on function public.ingest_cossa_lead(
  text,text,text,text,text,text,text,text,text,text,jsonb
) from public;
grant execute on function public.ingest_cossa_lead(
  text,text,text,text,text,text,text,text,text,text,jsonb
) to anon, authenticated, service_role;

create or replace function public.submit_quote_request(
  p_contact_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_location text,
  p_scope text,
  p_requirements text,
  p_estimated_quantity text default null,
  p_required_date text default null,
  p_budget text default null,
  p_additional_information text default null,
  p_items jsonb default '[]'::jsonb,
  p_source_page text default null,
  p_campaign_source text default null
)
returns table(id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote_id uuid := extensions.gen_random_uuid();
  v_reference text;
  v_lead_id uuid;
  v_existing_id uuid;
  v_existing_reference text;
  v_contact_name text := pg_catalog.btrim(coalesce(p_contact_name, ''));
  v_company text := nullif(pg_catalog.btrim(coalesce(p_company, '')), '');
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_phone text := pg_catalog.btrim(coalesce(p_phone, ''));
  v_location text := nullif(pg_catalog.btrim(coalesce(p_location, '')), '');
  v_scope text := pg_catalog.lower(coalesce(nullif(pg_catalog.btrim(p_scope), ''), 'products_only'));
  v_requirements text := pg_catalog.btrim(coalesce(p_requirements, ''));
  v_estimated_quantity text := nullif(pg_catalog.btrim(coalesce(p_estimated_quantity, '')), '');
  v_required_date text := nullif(pg_catalog.btrim(coalesce(p_required_date, '')), '');
  v_budget text := nullif(pg_catalog.btrim(coalesce(p_budget, '')), '');
  v_additional_information text := nullif(pg_catalog.btrim(coalesce(p_additional_information, '')), '');
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_source_page text := nullif(pg_catalog.btrim(coalesce(p_source_page, '')), '');
  v_notes text;
begin
  if v_contact_name = '' or pg_catalog.length(v_contact_name) > 200 then
    raise exception 'Contact name is required and must be at most 200 characters' using errcode = '22023';
  end if;
  if v_email = '' or pg_catalog.length(v_email) > 255
     or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,63}$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;
  if v_phone = '' or pg_catalog.length(v_phone) > 40
     or pg_catalog.length(pg_catalog.regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 20 then
    raise exception 'A valid phone number is required' using errcode = '22023';
  end if;
  if v_requirements = '' or pg_catalog.length(v_requirements) > 5000 then
    raise exception 'Requirements are required and must be at most 5000 characters' using errcode = '22023';
  end if;
  if v_company is not null and pg_catalog.length(v_company) > 200 then raise exception 'Company is too long' using errcode='22023'; end if;
  if v_location is not null and pg_catalog.length(v_location) > 300 then raise exception 'Location is too long' using errcode='22023'; end if;
  if v_estimated_quantity is not null and pg_catalog.length(v_estimated_quantity) > 200 then raise exception 'Estimated quantity is too long' using errcode='22023'; end if;
  if v_required_date is not null and pg_catalog.length(v_required_date) > 100 then raise exception 'Required date is too long' using errcode='22023'; end if;
  if v_budget is not null and pg_catalog.length(v_budget) > 200 then raise exception 'Budget is too long' using errcode='22023'; end if;
  if v_additional_information is not null and pg_catalog.length(v_additional_information) > 5000 then raise exception 'Additional information is too long' using errcode='22023'; end if;
  if v_source_page is not null and pg_catalog.length(v_source_page) > 500 then raise exception 'Source page is too long' using errcode='22023'; end if;
  if p_campaign_source is not null and pg_catalog.length(p_campaign_source) > 200 then raise exception 'Campaign source is too long' using errcode='22023'; end if;
  if v_scope <> all(array['products_only','products_and_services','services_only','bulk_order','corporate_procurement','other']) then
    raise exception 'Unsupported quote scope' using errcode='22023';
  end if;
  if pg_catalog.jsonb_typeof(v_items) <> 'array'
     or pg_catalog.jsonb_array_length(v_items) > 50
     or pg_catalog.octet_length(v_items::text) > 12000
     or exists (select 1 from pg_catalog.jsonb_array_elements(v_items) item where pg_catalog.jsonb_typeof(item) <> 'object') then
    raise exception 'Quote items must be a list of at most 50 objects smaller than 12KB' using errcode = '22023';
  end if;

  select quote.id, quote.reference into v_existing_id, v_existing_reference
  from public.quote_requests quote
  where pg_catalog.lower(quote.email) = v_email
    and pg_catalog.regexp_replace(coalesce(quote.phone, ''), '\D', '', 'g') =
        pg_catalog.regexp_replace(v_phone, '\D', '', 'g')
    and coalesce(quote.requirements, '') = v_requirements
    and quote.created_at > pg_catalog.now() - interval '10 minutes'
  order by quote.created_at desc
  limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, v_existing_reference;
    return;
  end if;

  v_reference := 'CQT-' || pg_catalog.upper(pg_catalog.replace(v_quote_id::text, '-', ''));
  v_notes := pg_catalog.left(
    'Quote reference: ' || v_reference || E'\nRequirements: ' || v_requirements ||
    case when v_additional_information is null then '' else E'\nAdditional information: ' || v_additional_information end ||
    case when v_budget is null then '' else E'\nBudget: ' || v_budget end ||
    case when v_required_date is null then '' else E'\nRequired date: ' || v_required_date end,
    10000
  );

  select intake.lead_id into v_lead_id
  from public.ingest_cossa_lead(
    'cossa_store', v_quote_id::text, 'quote_request', v_contact_name, v_email, v_phone,
    v_scope, v_location, v_notes, v_company,
    pg_catalog.jsonb_build_object(
      'quote_reference', v_reference,
      'scope', v_scope,
      'item_count', pg_catalog.jsonb_array_length(v_items),
      'campaign_source', nullif(pg_catalog.btrim(coalesce(p_campaign_source, '')), '')
    )
  ) as intake;

  insert into public.quote_requests(
    id, reference, lead_id, full_name, name, contact_name, company, email, phone,
    service, scope, location, project_details, requirements, estimated_quantity,
    required_date, budget, message, additional_information, items, source_page,
    source_app, source_label
  ) values (
    v_quote_id, v_reference, v_lead_id, v_contact_name, v_contact_name, v_contact_name,
    v_company, v_email, v_phone, v_scope, v_scope, v_location, v_requirements,
    v_requirements, v_estimated_quantity, v_required_date, v_budget,
    v_additional_information, v_additional_information, v_items, v_source_page,
    'cossa_store', 'COSSA STORE'
  );

  return query select v_quote_id, v_reference;
end;
$$;

revoke execute on function public.submit_quote_request(
  text,text,text,text,text,text,text,text,text,text,text,jsonb,text,text
) from public;
grant execute on function public.submit_quote_request(
  text,text,text,text,text,text,text,text,text,text,text,jsonb,text,text
) to anon, authenticated, service_role;

create or replace function public.update_cossa_lead(
  p_lead_id uuid,
  p_stage text default null,
  p_status text default null,
  p_notes text default null,
  p_next_follow_up date default null,
  p_estimated_value numeric default null,
  p_score integer default null,
  p_employee_id uuid default null,
  p_assignment_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.leads%rowtype;
  v_employee_org uuid;
  v_before jsonb;
  v_is_service boolean := coalesce((select auth.jwt() ->> 'role' = 'service_role'), false);
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found' using errcode = 'P0002'; end if;

  if not v_is_service and (
    (select auth.uid()) is null
    or not public.has_organisation_role(v_lead.organisation_id, array['owner','admin'])
  ) then
    raise exception 'You are not allowed to update this lead' using errcode = '42501';
  end if;

  if p_stage is not null and pg_catalog.lower(pg_catalog.btrim(p_stage)) not in (
    'new_lead','contacted','qualified','inspection_booked','quote_sent','follow_up',
    'negotiation','won','completed','converted','lost'
  ) then raise exception 'Unsupported lead stage' using errcode='22023'; end if;
  if p_status is not null and pg_catalog.lower(pg_catalog.btrim(p_status)) not in (
    'new','contacted','qualified','inspection_booked','quote_sent','follow_up',
    'negotiation','won','completed','converted','lost'
  ) then raise exception 'Unsupported lead status' using errcode='22023'; end if;
  if p_notes is not null and pg_catalog.length(p_notes) > 10000 then raise exception 'Notes are too long' using errcode='22023'; end if;
  if p_estimated_value is not null and (p_estimated_value < 0 or p_estimated_value > 1000000000000) then
    raise exception 'Estimated value is outside the supported range' using errcode='22023';
  end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then raise exception 'Lead score must be between 0 and 100' using errcode='22023'; end if;
  if p_assignment_reason is not null and pg_catalog.length(p_assignment_reason) > 500 then raise exception 'Assignment reason is too long' using errcode='22023'; end if;

  if p_employee_id is not null then
    select organisation_id into v_employee_org
    from public.ai_employees where id = p_employee_id and status = 'active';
    if v_employee_org is distinct from v_lead.organisation_id then
      raise exception 'Assigned worker must be active in the same organisation' using errcode='22023';
    end if;
  end if;

  v_before := pg_catalog.jsonb_build_object(
    'stage',v_lead.stage,'status',v_lead.status,'next_follow_up',v_lead.next_follow_up,
    'estimated_value',v_lead.estimated_value,'score',v_lead.score
  );

  update public.leads set
    stage = case when p_stage is null then stage else pg_catalog.lower(pg_catalog.btrim(p_stage)) end,
    status = case when p_status is null then status else pg_catalog.lower(pg_catalog.btrim(p_status)) end,
    notes = case when p_notes is null then notes else nullif(pg_catalog.btrim(p_notes), '') end,
    next_follow_up = case when p_next_follow_up is null then next_follow_up else p_next_follow_up end,
    estimated_value = case when p_estimated_value is null then estimated_value else p_estimated_value end,
    score = case when p_score is null then score else p_score end,
    updated_at = pg_catalog.now()
  where id = p_lead_id returning * into v_lead;

  if p_employee_id is not null then
    insert into public.lead_assignments(
      lead_id,organisation_id,employee_id,assignment_reason,assigned_by,updated_at
    ) values (
      v_lead.id,v_lead.organisation_id,p_employee_id,
      coalesce(nullif(pg_catalog.btrim(p_assignment_reason),''),'Manual lead assignment'),
      (select auth.uid()),pg_catalog.now()
    ) on conflict (lead_id) do update set
      employee_id=excluded.employee_id,assignment_reason=excluded.assignment_reason,
      assigned_by=excluded.assigned_by,assigned_at=pg_catalog.now(),updated_at=pg_catalog.now();
  end if;

  insert into public.lead_events(organisation_id,lead_id,event_type,actor_type,actor_user_id,metadata)
  values (
    v_lead.organisation_id,v_lead.id,'lead_updated',case when v_is_service then 'system' else 'user' end,
    (select auth.uid()),
    pg_catalog.jsonb_build_object('before',v_before,'after',pg_catalog.jsonb_build_object(
      'stage',v_lead.stage,'status',v_lead.status,'next_follow_up',v_lead.next_follow_up,
      'estimated_value',v_lead.estimated_value,'score',v_lead.score,'assigned_employee_id',p_employee_id
    ))
  );
  return v_lead.id;
end;
$$;

revoke execute on function public.update_cossa_lead(uuid,text,text,text,date,numeric,integer,uuid,text)
  from public, anon;
grant execute on function public.update_cossa_lead(uuid,text,text,text,date,numeric,integer,uuid,text)
  to authenticated, service_role;

create or replace function public.is_active_store_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
  and coalesce((select auth.jwt() ->> 'session_id'), '') <> ''
  and (
    exists (
      select 1 from public.store_customer_sessions s
      where s.user_id = (select auth.uid())
        and s.session_id::text = (select auth.jwt() ->> 'session_id')
        and s.revoked_at is null
        and s.last_seen_at > (pg_catalog.now() - interval '30 minutes')
        and s.absolute_expires_at > pg_catalog.now()
        and exists (select 1 from auth.sessions a where a.id=s.session_id and a.user_id=s.user_id)
    )
    or exists (
      select 1 from public.store_admin_sessions s
      where s.user_id = (select auth.uid())
        and s.session_id::text = (select auth.jwt() ->> 'session_id')
        and s.revoked_at is null
        and s.last_seen_at > (pg_catalog.now() - interval '15 minutes')
        and s.absolute_expires_at > pg_catalog.now()
        and exists (select 1 from auth.sessions a where a.id=s.session_id and a.user_id=s.user_id)
    )
  );
$$;

revoke execute on function public.is_active_store_session() from public, anon;
grant execute on function public.is_active_store_session() to authenticated, service_role;

-- Trigger functions are invoked by their triggers, not directly by API roles.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.prosecdef and p.prorettype='pg_catalog.trigger'::regtype
  loop
    execute pg_catalog.format('revoke execute on function %s from public, anon, authenticated', fn.signature);
  end loop;
end;
$$;
