const JWT_ISSUED_AT_FUTURE = /\bPGRST303\b|jwt issued at future/i;
const RETRY_DELAYS_MS = [300, 900, 1_800] as const;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
}

async function isIssuedAtFuture(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;

  const body = await response.clone().text().catch(() => "");
  return JWT_ISSUED_AT_FUTURE.test(body);
}

/**
 * Retries only PostgREST's transient PGRST303 validation failure. A 401 is
 * returned before the database operation runs, so a replayable request has
 * not changed data when this retry is attempted.
 */
export async function retrySupabaseIssuedAtFuture<T extends Response>(
  request: () => Promise<T>,
  canReplay: boolean,
): Promise<T> {
  let response = await request();

  if (!canReplay) return response;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (!(await isIssuedAtFuture(response))) return response;
    await wait(delayMs);
    response = await request();
  }

  return response;
}
