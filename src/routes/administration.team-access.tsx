import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { workspaceRuntimeStatus } from "@/lib/workspace-runtime";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

const ROLES = ["admin", "manager", "sales_rep", "site_supervisor", "referral_partner"] as const;
type AppRole = (typeof ROLES)[number];

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  created_at: string;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: string;
}

interface TeamMember {
  profile: ProfileRow;
  roles: AppRole[];
}

interface TeamAccessData {
  currentUserId: string;
  currentRoles: AppRole[];
  currentProfile: ProfileRow | null;
  team: TeamMember[];
}

export const Route = createFileRoute("/administration/team-access")({
  component: TeamAccessPage,
  head: () => ({
    meta: [
      { title: "Team & Access — Cossa AI" },
      {
        name: "description",
        content: "Persistent Cossa account profiles and role-based workspace access.",
      },
    ],
  }),
});

function asRole(value: string): AppRole | null {
  return ROLES.includes(value as AppRole) ? (value as AppRole) : null;
}

async function loadTeamAccess(): Promise<TeamAccessData> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error(authError?.message || "Your authenticated user could not be loaded.");
  }

  const currentUserId = auth.user.id;
  const [{ data: ownRoles, error: ownRolesError }, { data: ownProfile, error: ownProfileError }] = await Promise.all([
    db.from("user_roles").select("id,user_id,role").eq("user_id", currentUserId),
    db.from("profiles").select("id,full_name,phone,business_name,created_at").eq("id", currentUserId).maybeSingle(),
  ]);

  if (ownRolesError) throw new Error(`Unable to load your roles: ${ownRolesError.message}`);
  if (ownProfileError) throw new Error(`Unable to load your profile: ${ownProfileError.message}`);

  const currentRoles = ((ownRoles ?? []) as UserRoleRow[])
    .map((row) => asRole(row.role))
    .filter((role): role is AppRole => Boolean(role));

  // Team/role administration is deliberately limited to admins. RLS remains
  // the final enforcement layer; this UI check prevents accidental exposure
  // and avoids presenting controls the signed-in user cannot legitimately use.
  if (!currentRoles.includes("admin")) {
    return {
      currentUserId,
      currentRoles,
      currentProfile: (ownProfile as ProfileRow | null) ?? null,
      team: [],
    };
  }

  const [{ data: profiles, error: profilesError }, { data: roleRows, error: roleRowsError }] = await Promise.all([
    db.from("profiles").select("id,full_name,phone,business_name,created_at").order("created_at", { ascending: true }),
    db.from("user_roles").select("id,user_id,role").order("created_at", { ascending: true }),
  ]);

  if (profilesError) throw new Error(`Unable to load team profiles: ${profilesError.message}`);
  if (roleRowsError) throw new Error(`Unable to load team roles: ${roleRowsError.message}`);

  const roleMap = new Map<string, AppRole[]>();
  for (const row of (roleRows ?? []) as UserRoleRow[]) {
    const role = asRole(row.role);
    if (!role) continue;
    const existing = roleMap.get(row.user_id) ?? [];
    if (!existing.includes(role)) existing.push(role);
    roleMap.set(row.user_id, existing);
  }

  return {
    currentUserId,
    currentRoles,
    currentProfile: (ownProfile as ProfileRow | null) ?? null,
    team: ((profiles ?? []) as ProfileRow[]).map((profile) => ({
      profile,
      roles: roleMap.get(profile.id) ?? [],
    })),
  };
}

async function saveOwnProfile(payload: { full_name: string; phone: string }): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error(authError?.message || "Authentication is required.");

  const { error } = await db.from("profiles").upsert({
    id: auth.user.id,
    full_name: payload.full_name.trim() || null,
    phone: payload.phone.trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Unable to save your profile: ${error.message}`);
}

async function setRole(payload: {
  userId: string;
  role: AppRole;
  enabled: boolean;
  currentUserId: string;
}): Promise<void> {
  if (payload.userId === payload.currentUserId && payload.role === "admin" && !payload.enabled) {
    throw new Error("You cannot remove your own admin role from this screen. Use a controlled administrator handover instead.");
  }

  if (payload.enabled) {
    const { data: existing, error: readError } = await db
      .from("user_roles")
      .select("id")
      .eq("user_id", payload.userId)
      .eq("role", payload.role)
      .maybeSingle();
    if (readError) throw new Error(`Unable to check the role: ${readError.message}`);
    if (existing) return;

    const { error } = await db.from("user_roles").insert({ user_id: payload.userId, role: payload.role });
    if (error) throw new Error(`Unable to grant the role: ${error.message}`);
    return;
  }

  const { error } = await db
    .from("user_roles")
    .delete()
    .eq("user_id", payload.userId)
    .eq("role", payload.role);
  if (error) throw new Error(`Unable to remove the role: ${error.message}`);
}

function TeamAccessPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["administration-team-access"], queryFn: loadTeamAccess });

  const profileMutation = useMutation({
    mutationFn: saveOwnProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["administration-team-access"] });
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Profile update failed"),
  });

  const roleMutation = useMutation({
    mutationFn: setRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["administration-team-access"] });
      toast.success("Access role updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Role update failed"),
  });

  if (query.isLoading) {
    return <div className="glass-card mx-auto flex max-w-5xl items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading team access…</div>;
  }

  if (query.isError || !query.data) {
    return <div className="glass-card mx-auto max-w-5xl p-6 text-sm text-destructive">{query.error instanceof Error ? query.error.message : "Team access could not be loaded."}</div>;
  }

  const data = query.data;
  const isAdmin = data.currentRoles.includes("admin");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow"><ShieldCheck className="h-5 w-5" /></div>
            <StatusBadge status={workspaceRuntimeStatus()} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Team & Access</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Persistent Supabase account profiles and role permissions restored from the original Growth operating layer. Workspace/AI preferences remain separate in Settings.
          </p>
          <div className="mt-4"><Button asChild variant="outline"><Link to="/settings">Workspace Settings</Link></Button></div>
        </div>
      </section>

      <ProfileCard
        profile={data.currentProfile}
        roles={data.currentRoles}
        saving={profileMutation.isPending}
        onSave={(full_name, phone) => profileMutation.mutate({ full_name, phone })}
      />

      {!isAdmin ? (
        <section className="glass-card p-6">
          <div className="flex items-start gap-3"><UserCog className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-display text-lg font-semibold">Your access is role-controlled</h2><p className="mt-1 text-sm text-muted-foreground">Only an administrator may view and change team-wide roles. Your current roles: {data.currentRoles.join(", ") || "none"}.</p></div></div>
        </section>
      ) : (
        <section className="glass-card overflow-hidden">
          <header className="border-b border-border/60 p-5">
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-semibold">Team role matrix</h2></div>
            <p className="mt-1 text-sm text-muted-foreground">Changes persist to the existing user_roles table and remain subject to database RLS.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-widest text-muted-foreground"><th className="px-5 py-3">Member</th>{ROLES.map((role) => <th key={role} className="px-3 py-3 text-center">{role.replaceAll("_", " ")}</th>)}</tr></thead>
              <tbody>
                {data.team.map(({ profile, roles }) => (
                  <tr key={profile.id} className="border-b border-border/40">
                    <td className="px-5 py-4"><div className="font-medium">{profile.full_name || profile.business_name || "Unnamed member"}</div><div className="text-xs text-muted-foreground">{profile.phone || profile.id}</div></td>
                    {ROLES.map((role) => {
                      const enabled = roles.includes(role);
                      const protectedSelfAdmin = profile.id === data.currentUserId && role === "admin" && enabled;
                      return <td key={role} className="px-3 py-4 text-center"><button type="button" disabled={roleMutation.isPending || protectedSelfAdmin} onClick={() => roleMutation.mutate({ userId: profile.id, role, enabled: !enabled, currentUserId: data.currentUserId })} className={`h-7 min-w-7 rounded border px-2 text-xs ${enabled ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground"} disabled:cursor-not-allowed disabled:opacity-60`} aria-label={`${enabled ? "Remove" : "Grant"} ${role}`}>{enabled ? "✓" : "—"}</button></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  roles,
  saving,
  onSave,
}: {
  profile: ProfileRow | null;
  roles: AppRole[];
  saving: boolean;
  onSave: (fullName: string, phone: string) => void;
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(String(form.get("full_name") ?? ""), String(form.get("phone") ?? ""));
  };

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Your persistent profile</h2></div>
      <p className="mt-1 text-sm text-muted-foreground">Roles: {roles.join(", ") || "none"}</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">Full name<Input name="full_name" defaultValue={profile?.full_name ?? ""} /></label>
        <label className="grid gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">Phone<Input name="phone" defaultValue={profile?.phone ?? ""} /></label>
        <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save profile</Button></div>
      </form>
    </section>
  );
}
