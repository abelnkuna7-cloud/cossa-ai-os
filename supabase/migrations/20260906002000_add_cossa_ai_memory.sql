-- Cossa AI OS institutional memory foundation.
-- Additive only: no existing tables, columns, policies or data are removed.
--
-- This migration is intentionally aligned with the existing Cossa multi-tenant
-- model: organisations -> organisation_members -> ai_conversations.

create table if not exists public.cossa_ai_memory_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  scope text not null default 'group' check (scope in ('group','construction','facility','tech','store','nexdocs','growth')),
  visibility text not null default 'internal' check (visibility in ('public','customer','internal','ceo')),
  memory_type text not null default 'fact' check (memory_type in ('fact','decision','preference','summary','procedure','relationship','status')),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  body text not null check (char_length(btrim(body)) > 0),
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
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  rolling_summary text not null default '' check (char_length(rolling_summary) <= 8000),
  important_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(important_facts) = 'array'),
  decisions jsonb not null default '[]'::jsonb check (jsonb_typeof(decisions) = 'array'),
  open_loops jsonb not null default '[]'::jsonb check (jsonb_typeof(open_loops) = 'array'),
  last_summarized_message_count integer not null default 0 check (last_summarized_message_count >= 0),
  last_message_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id, conversation_id),
  foreign key (conversation_id, organisation_id)
    references public.ai_conversations(id, organisation_id)
    on delete cascade
);

create index if not exists cossa_ai_conversation_memory_user_idx
  on public.cossa_ai_conversation_memory (organisation_id, user_id, updated_at desc);

create index if not exists cossa_ai_conversation_memory_conversation_idx
  on public.cossa_ai_conversation_memory (conversation_id, organisation_id);

alter table public.cossa_ai_memory_items enable row level security;
alter table public.cossa_ai_conversation_memory enable row level security;

-- Active organisation members may read shared Cossa institutional memory.
-- CEO memory additionally requires a direct user binding to the authenticated
-- owner. No INSERT/UPDATE/DELETE policy is granted here; institutional memory
-- population remains a controlled server/admin operation.
create policy "cossa members read ai memory"
  on public.cossa_ai_memory_items
  for select
  to authenticated
  using (
    public.is_organisation_member(organisation_id)
    and (
      visibility <> 'ceo'
      or user_id = (select auth.uid())
    )
  );

-- Conversation memory must belong to both the authenticated user and one of
-- that user's actual saved ai_conversations rows. This prevents a caller from
-- poisoning or attaching memory to another conversation merely by supplying an
-- arbitrary conversation ID.
create policy "users read own conversation memory"
  on public.cossa_ai_conversation_memory
  for select
  to authenticated
  using (
    public.is_organisation_member(organisation_id)
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = cossa_ai_conversation_memory.conversation_id
        and conversation.organisation_id = cossa_ai_conversation_memory.organisation_id
        and conversation.user_id = (select auth.uid())
    )
  );

create policy "users insert own conversation memory"
  on public.cossa_ai_conversation_memory
  for insert
  to authenticated
  with check (
    public.is_organisation_member(organisation_id)
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = cossa_ai_conversation_memory.conversation_id
        and conversation.organisation_id = cossa_ai_conversation_memory.organisation_id
        and conversation.user_id = (select auth.uid())
    )
  );

create policy "users update own conversation memory"
  on public.cossa_ai_conversation_memory
  for update
  to authenticated
  using (
    public.is_organisation_member(organisation_id)
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = cossa_ai_conversation_memory.conversation_id
        and conversation.organisation_id = cossa_ai_conversation_memory.organisation_id
        and conversation.user_id = (select auth.uid())
    )
  )
  with check (
    public.is_organisation_member(organisation_id)
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = cossa_ai_conversation_memory.conversation_id
        and conversation.organisation_id = cossa_ai_conversation_memory.organisation_id
        and conversation.user_id = (select auth.uid())
    )
  );

comment on table public.cossa_ai_memory_items is
  'Durable Cossa institutional memory used before external AI/research calls.';

comment on table public.cossa_ai_conversation_memory is
  'Rolling conversation summaries, decisions and important facts bound to authenticated saved Cossa AI conversations so long chats can continue without sending full raw history to providers.';
