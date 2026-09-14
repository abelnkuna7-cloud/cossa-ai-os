alter table public.crm_communications
  drop constraint if exists crm_communications_summary_length,
  add constraint crm_communications_summary_length check (summary is null or char_length(summary) <= 500),
  drop constraint if exists crm_communications_notes_length,
  add constraint crm_communications_notes_length check (notes is null or char_length(notes) <= 1000),
  drop constraint if exists crm_communications_subject_length,
  add constraint crm_communications_subject_length check (subject is null or char_length(subject) <= 240),
  drop constraint if exists crm_communications_external_url_length,
  add constraint crm_communications_external_url_length check (external_url is null or char_length(external_url) <= 2048);
