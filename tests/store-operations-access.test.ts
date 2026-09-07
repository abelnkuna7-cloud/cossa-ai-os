import assert from "node:assert/strict";
import test from "node:test";
import { resolveStoreOperationsAccess } from "../src/lib/store-operations-access.ts";

function client(user: { id: string } | null, memberships: unknown[], error: { message: string } | null = null) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: memberships, error }) }) }) }),
  } as any;
}

test("owner membership resolves organisation", async () => {
  assert.deepEqual(await resolveStoreOperationsAccess(client({ id: "u" }, [{ organisation_id: "o", role: "owner", status: "active" }])), { status: "authorized", organisationId: "o", role: "owner" });
});

test("admin membership resolves organisation", async () => {
  assert.equal((await resolveStoreOperationsAccess(client({ id: "u" }, [{ organisation_id: "o", role: "admin", status: "active" }]))).status, "authorized");
});

test("manager and no membership are explicit denials", async () => {
  assert.deepEqual((await resolveStoreOperationsAccess(client({ id: "u" }, [{ organisation_id: "o", role: "manager", status: "active" }]))).status, "insufficient_role");
  assert.deepEqual((await resolveStoreOperationsAccess(client({ id: "u" }, []))).status, "no_membership");
});

test("unauthenticated and membership query errors are explicit", async () => {
  assert.deepEqual((await resolveStoreOperationsAccess(client(null, []))).status, "unauthenticated");
  await assert.rejects(() => resolveStoreOperationsAccess(client({ id: "u" }, [], { message: "denied" })), /denied/);
});
