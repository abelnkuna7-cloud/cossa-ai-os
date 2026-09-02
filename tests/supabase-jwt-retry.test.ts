import assert from "node:assert/strict";
import test from "node:test";

import { retrySupabaseIssuedAtFuture } from "../src/lib/supabase-jwt-retry.ts";

test("retries the exact transient PostgREST PGRST303 response", async () => {
  let attempts = 0;
  const response = await retrySupabaseIssuedAtFuture(async () => {
    attempts += 1;
    return attempts === 1
      ? new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), {
          status: 401,
        })
      : new Response(JSON.stringify({ ok: true }), { status: 200 });
  }, true);

  assert.equal(attempts, 2);
  assert.equal(response.status, 200);
});

test("does not replay a non-replayable request", async () => {
  let attempts = 0;
  const response = await retrySupabaseIssuedAtFuture(async () => {
    attempts += 1;
    return new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), {
      status: 401,
    });
  }, false);

  assert.equal(attempts, 1);
  assert.equal(response.status, 401);
});
