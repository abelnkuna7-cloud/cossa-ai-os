export type StoreOperationsAccessState =
  | { status: "authorized"; organisationId: string; role: "owner" | "admin" }
  | { status: "unauthenticated" }
  | { status: "no_membership" }
  | { status: "insufficient_role"; role: string };

type AuthClient = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }> };
  from: (table: string) => any;
};

export async function resolveStoreOperationsAccess(db: AuthClient): Promise<StoreOperationsAccessState> {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { status: "unauthenticated" };
  const { data: memberships, error: membershipError } = await db
    .from("organisation_members")
    .select("organisation_id,role,status")
    .eq("user_id", data.user.id)
    .eq("status", "active");
  if (membershipError) throw new Error(membershipError.message);
  const membership = (memberships ?? [])[0] as { organisation_id: string; role: string; status: string } | undefined;
  if (!membership) return { status: "no_membership" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { status: "insufficient_role", role: membership.role };
  }
  return { status: "authorized", organisationId: membership.organisation_id, role: membership.role };
}
