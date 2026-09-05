-- Cossa AI OS institutional memory foundation.
-- Additive only: no existing tables, columns, policies or data are removed.

create table if not exists public.cossa_ai_memory_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  user_id uuid null references auth.users(id) on delete set null,
  scope text not null default 'group' check (scope in ('group','construction','facility','tech','store','nexdocs','growth')),
  visibility text not null default 'internal' check (visibility in ('public','customer','internal','ceo')),
  memory_type text not null default 'fact' check (memory_type in ('fact','decision','preference','summary','procedure','relationship','status')),
  title text not null,
  body text not null,
  source text null,
  source_ref text null,
  confidence numeric(4,3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  is_active boolean not null default true,
  effective_from timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cossa_ai_memory_items_org_scope_idx
  on public.cossa_ai_memory_items (organisation_id, scope, is_active);

create index if not exists cossa_ai_memory_items_visibility_idx
  on public.cossa_ai_memory_items (organisation_id, visibility, is_active);

create table if not exists public.cossa_ai_conversation_memory (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  rolling_summary text not null default '',
  important_facts jsonb not null default '[]'::jsonb,
  open_loops jsonb not null default '[]'::jsonb,
  last_message_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id, conversation_id)
);

create index if not exists cossa_ai_conversation_memory_user_idx
  on public.cossa_ai_conversation_memory (organisation_id, user_id, updated_at desc);

alter table public.cossa_ai_memory_items enable row level security;
alter table public.cossa_ai_conversation_memory enable row level security;

-- Authenticated active organisation members may read internal Cossa memory.
-- Visibility filtering (public/customer/internal/ceo) is still enforced by the
-- application gateway so public-facing assistants never receive CEO context.
create policy "cossa members read ai memory"
  on public.cossa_ai_memory_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organisation_members om
      where om.organisation_id = cossa_ai_memory_items.organisation_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

create policy "users read own conversation memory"
  on public.cossa_ai_conversation_memory
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organisation_members om
      where om.organisation_id = cossa_ai_conversation_memory.organisation_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

create policy "users insert own conversation memory"
  on public.cossa_ai_conversation_memory
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organisation_members om
      where om.organisation_id = cossa_ai_conversation_memory.organisation_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

create policy "users update own conversation memory"
  on public.cossa_ai_conversation_memory
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organisation_members om
      where om.organisation_id = cossa_ai_conversation_memory.organisation_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  )
  with check (user_id = auth.uid());

comment on table public.cossa_ai_memory_items is
  'Durable Cossa institutional memory used before external AI/research calls.';

comment on table public.cossa_ai_conversation_memory is
  'Rolling conversation summaries and important facts so Cossa AI can maintain long conversations without sending full raw history to providers.';
