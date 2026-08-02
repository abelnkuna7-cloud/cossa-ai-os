import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError("Sign-in failed. Check your email and password.");
    else setAuthenticated(true);
  }

  if (authenticated) return <Navigate to="/command-center" replace />;
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-2xl border border-primary/25 bg-card p-7 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
          <div><h1 className="font-display text-xl font-semibold">Cossa AI</h1><p className="text-xs text-muted-foreground">Cossa Nexus Holdings secure workspace</p></div>
        </div>
        <div className="mb-6 flex gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Only authorised Cossa Nexus users can access company data, AI conversations, and operational tools.</div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">Email<input className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label className="block text-sm font-medium">Password<input className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full bg-primary text-primary-foreground" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? "Signing in…" : "Sign in securely"}</Button>
        </form>
      </section>
    </main>
  );
}
