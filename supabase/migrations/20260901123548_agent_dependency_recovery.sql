-- Resolve work that can never execute because a required upstream task ended
-- terminally. This is deliberately cancellation, not a retry: only the
-- original task may be retried according to its own policy.
--
-- The function is service-role only and does not contact providers, create
-- customer records, send communications, or change operational data outside
-- the durable agent task queue.
CREATE OR REPLACE FUNCTION public.cancel_agent_tasks_with_terminal_dependencies(
  p_organisation_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_organisation_id IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'Invalid terminal dependency recovery parameters';
  END IF;

  RETURN QUERY
  WITH RECURSIVE blocked AS (
    SELECT
      task.id,
      dependency.task_type AS root_dependency_task_type,
      dependency.status AS root_dependency_status,
      dependency.error_code AS root_dependency_error_code,
      ARRAY[task.id]::uuid[] AS path
    FROM public.agent_tasks AS task
    JOIN public.agent_tasks AS dependency ON dependency.id = task.depends_on_task_id
    WHERE task.organisation_id = p_organisation_id
      AND dependency.organisation_id = task.organisation_id
      AND task.status IN ('queued', 'retry_scheduled', 'blocked_approval')
      AND dependency.status IN ('failed', 'cancelled')

    UNION ALL

    SELECT
      child.id,
      blocked.root_dependency_task_type,
      blocked.root_dependency_status,
      blocked.root_dependency_error_code,
      blocked.path || child.id
    FROM public.agent_tasks AS child
    JOIN blocked ON child.depends_on_task_id = blocked.id
    WHERE child.organisation_id = p_organisation_id
      AND child.status IN ('queued', 'retry_scheduled', 'blocked_approval')
      AND NOT child.id = ANY(blocked.path)
  ), candidates AS (
    SELECT DISTINCT ON (id)
      id,
      root_dependency_task_type,
      root_dependency_status,
      root_dependency_error_code
    FROM blocked
    ORDER BY id
    LIMIT p_limit
  ), cancelled AS (
    UPDATE public.agent_tasks AS task
    SET
      status = 'cancelled',
      error_code = 'dependency_failed',
      error_message = left(
        format(
          'Dependency %s ended %s%s; this task was cancelled without execution.',
          candidates.root_dependency_task_type,
          candidates.root_dependency_status,
          CASE
            WHEN candidates.root_dependency_error_code IS NULL THEN ''
            ELSE format(' (%s)', candidates.root_dependency_error_code)
          END
        ),
        1000
      ),
      lease_token = NULL,
      lease_expires_at = NULL,
      completed_at = now(),
      updated_at = now()
    FROM candidates
    WHERE task.id = candidates.id
      AND task.organisation_id = p_organisation_id
      AND task.status IN ('queued', 'retry_scheduled', 'blocked_approval')
    RETURNING task.*
  )
  SELECT * FROM cancelled;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_agent_tasks_with_terminal_dependencies(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_agent_tasks_with_terminal_dependencies(uuid, integer)
  TO service_role;
