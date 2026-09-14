alter table public.crm_communications
  drop constraint if exists crm_communications_ingest_unique,
  add constraint crm_communications_ingest_unique unique (organisation_id, provider, external_message_id);
