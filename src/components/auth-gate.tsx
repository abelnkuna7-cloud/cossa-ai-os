import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function isInvalidStoredSession(message: string | undefined): boolean {
  return /jwt issued at future|jwt expired|invalid jwt|invalid token|refresh token/i.test(
    message ?? "",
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function restoreVerifiedSession() {
      const {
        data: { session: storedSession },
      } = await supabase.auth.getSession();

      if (!storedSession) {
        if (active) setSession(null);
        return;
      }

      // getSession() reads the browser cache. Confirm its token with Auth before
      // allowing protected views to start their parallel database requests.
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(storedSession.access_token);

      if (!user) {
        // Keep recovery local to this browser. Do not revoke a valid session on
        // another device when a stale or future-issued local token is detected.
        if (isInvalidStoredSession(error?.message)) {
          await supabase.auth.signOut({ scope: "local" });
        }

        if (active) setSession(null);
        return;
      }

      if (active) setSession(storedSession);
    }

    void restoreVerifiedSession().catch(() => {
      if (active) setSession(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
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
