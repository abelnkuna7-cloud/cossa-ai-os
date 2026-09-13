-- Cossa AI workforce context continuity
--
-- Purpose:
--   Preserve traceable record identifiers across strict multi-agent workflows
--   without trusting the browser to copy them from stage to stage.
--
-- Safety:
--   * additive only
--   * no external actions
--   * no mission/run/approval status changes
--   * no fabricated records
--   * copies only identifiers already recorded on a completed handoff
--   * does not delete or replace existing downstream JSON keys unnecessarily

create or replace function public.propagate_workforce_handoff_retained_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stage integer;
  next_handoff_id uuid;
begin
  -- Propagate only when a handoff newly reaches the successful terminal state.
  if new.status <> 'completed'
     or old.status = 'completed'
     or coalesce(new.retained_record_ids, '{}'::jsonb) = '{}'::jsonb then
    return new;
  end if;

  -- Only numbered workflow stages participate. Direct/single-stage work safely exits.
  if jsonb_typeof(new.context -> 'stage') = 'number' then
    current_stage := (new.context ->> 'stage')::integer;
  elsif coalesce(new.context ->> 'stage', '') ~ '^[0-9]+$' then
    current_stage := (new.context ->> 'stage')::integer;
  else
    return new;
  end if;

  if current_stage <= 0 then
    return new;
  end if;

  -- Select the next recorded numbered stage in the same organisation + mission.
  select eh.id
    into next_handoff_id
    from public.employee_handoffs eh
   where eh.organisation_id = new.organisation_id
     and eh.mission_id = new.mission_id
     and eh.id <> new.id
     and coalesce(eh.context ->> 'stage', '') ~ '^[0-9]+$'
     and (eh.context ->> 'stage')::integer > current_stage
   order by (eh.context ->> 'stage')::integer asc, eh.created_at asc, eh.id asc
   limit 1;

  if next_handoff_id is null then
    return new;
  end if;

  -- Existing downstream keys are retained; newly completed upstream identifiers
  -- are merged in and may refresh the same traceability key with the newer value.
  update public.employee_handoffs
     set retained_record_ids = coalesce(retained_record_ids, '{}'::jsonb)
                               || coalesce(new.retained_record_ids, '{}'::jsonb)
   where id = next_handoff_id
     and organisation_id = new.organisation_id
     and mission_id = new.mission_id
     and status in ('pending', 'accepted');

  return new;
end;
$$;

revoke all on function public.propagate_workforce_handoff_retained_ids() from public;
revoke all on function public.propagate_workforce_handoff_retained_ids() from anon;
revoke all on function public.propagate_workforce_handoff_retained_ids() from authenticated;

-- Trigger execution is database-owned; browser roles do not receive EXECUTE.
drop trigger if exists trg_employee_handoff_context_continuity on public.employee_handoffs;

create trigger trg_employee_handoff_context_continuity
after update of status, retained_record_ids on public.employee_handoffs
for each row
when (new.status = 'completed')
execute function public.propagate_workforce_handoff_retained_ids();
