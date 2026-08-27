-- Review-request delivery truth
--
-- The legacy Growth table used sent_at DEFAULT now(), which means creating a
-- share link could look like a delivered message even when the user only
-- copied a link or opened WhatsApp. Keep sent_at for backward compatibility,
-- but add explicit delivery state for the consolidated GROWTH platform.

alter table public.review_requests
  add column if not exists delivery_status text not null default 'prepared',
  add column if not exists prepared_at timestamptz not null default now(),
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_evidence text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.review_requests'::regclass
      and conname = 'review_requests_delivery_status_check'
  ) then
    alter table public.review_requests
      add constraint review_requests_delivery_status_check
      check (delivery_status in ('prepared', 'delivery_opened', 'delivered', 'failed', 'unknown'));
  end if;
end
$$;

comment on column public.review_requests.sent_at is
  'Legacy creation/sent timestamp retained for backward compatibility. Do not treat as verified delivery without delivery_status/evidence.';

comment on column public.review_requests.delivery_status is
  'Truthful invite delivery state: prepared, delivery_opened, delivered, failed, or unknown.';

comment on column public.review_requests.delivery_evidence is
  'Optional non-secret evidence/reference supporting a delivered state.';
