import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { asDynamicSupabaseClient } from "@/integrations/supabase/dynamic-client";

const db = asDynamicSupabaseClient(supabase);

function isInvalidStoredSession(message: string | undefined): boolean {
  return /jwt issued at future|jwt expired|invalid jwt|invalid token|refresh token/i.test(
    message ?? "",
  );
}

async function verifyGrowthSession(candidate: Session | null): Promise<Session | null> {
  if (!candidate) return null;

  // Browser storage alone is not trusted. Confirm the token with Supabase Auth.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(candidate.access_token);

  if (!user) {
    // Clear only the stale local browser session. Do not revoke sessions on other devices.
    if (isInvalidStoredSession(userError?.message)) {
      await supabase.auth.signOut({ scope: "local" });
    }
    return null;
  }

  // Authentication is not authorisation. Only active organisation members may
  // mount the private Growth workspace. Role-specific write permissions remain
  // enforced separately by RLS and server-side authorisation.
  const { data: membership, error: membershipError } = await db
    .from<{ user_id: string; status: string }>("organisation_members")
    .select("user_id,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) return null;

  // Growth is a private internal operating system. Every workspace session must
  // have completed MFA before protected screens and their data requests mount.
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || aal.currentLevel !== "aal2") return null;

  return candidate;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function restoreVerifiedSession() {
      const {
        data: { session: storedSession },
      } = await supabase.auth.getSession();

      const verified = await verifyGrowthSession(storedSession);
      if (active) setSession(verified);
    }

    void restoreVerifiedSession().catch(() => {
      if (active) setSession(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // INITIAL_SESSION is the same browser-cache value verified above.
      if (event === "INITIAL_SESSION") return;

      // Supabase recommends avoiding awaited client calls directly inside this
      // callback. Defer the verification work to prevent auth callback deadlocks.
      window.setTimeout(() => {
        void verifyGrowthSession(nextSession)
          .then((verified) => {
            if (active) setSession(verified);
          })
          .catch(() => {
            if (active) setSession(null);
          });
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
