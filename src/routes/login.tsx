import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import {
  GrowthEagleArtwork,
  GrowthFullArtwork,
  GrowthProductBrand,
  ParentBrandEndorsement,
} from "@/components/brand/growth-brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GROWTH_BRAND } from "@/lib/brand";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Sign-in failed. Check your email and password.");
    } else {
      setAuthenticated(true);
    }
  }

  if (authenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 lg:p-6">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-[0_28px_90px_rgba(0,0,0,0.55)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <GrowthProductBrand />

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Secure workspace
            </p>

            <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Welcome to <span className="text-gradient-gold">{GROWTH_BRAND.productName}</span>.
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Turn business opportunities into measurable growth with connected sales, marketing,
              operations and AI support.
            </p>
          </div>

          <div className="mt-6 flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Only authorised GROWTH workspace users can access their organisation's data,
            AI conversations and operational tools.
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              Email
              <input
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Password
              <input
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Enter GROWTH"}
            </Button>
          </form>

          <ParentBrandEndorsement className="mt-7 border-t border-border/60 pt-5" />
        </div>

        <aside className="relative hidden min-h-[680px] overflow-hidden border-l border-primary/15 bg-black lg:block">
          <GrowthEagleArtwork
            eager
            className="absolute inset-0 h-full w-full object-cover object-[center_40%] opacity-55"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.96),rgba(0,0,0,0.48),rgba(0,0,0,0.82))]" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {GROWTH_BRAND.productDescriptor}
              </p>

              <p className="mt-4 max-w-sm font-display text-2xl font-medium leading-snug text-foreground">
                {GROWTH_BRAND.brandPromise}
              </p>
            </div>

            <GrowthFullArtwork className="w-full max-w-md self-center drop-shadow-[0_16px_40px_rgba(0,0,0,0.7)]" />
          </div>
        </aside>
      </section>
    </main>
  );
}
