import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

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

type LoginStep = "credentials" | "enroll-mfa" | "choose-mfa" | "challenge-mfa";

type MfaEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type MfaFactorOption = {
  id: string;
  label: string;
};

function normaliseOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function factorLabel(factor: unknown, index: number): string {
  const candidate = factor as { friendly_name?: string; friendlyName?: string };
  return candidate.friendly_name || candidate.friendlyName || `Authenticator ${index + 1}`;
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factorOptions, setFactorOptions] = useState<MfaFactorOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  async function requireGrowthMembership(userId: string) {
    const { data, error: membershipError } = await supabase
      .from("organisation_members")
      .select("role,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw new Error("Growth membership could not be verified.");
    }

    if (!data) {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error("This account is not authorised to access the Growth workspace.");
    }

    return data;
  }

  async function prepareMfa(role: string) {
    const privileged = role === "owner" || role === "admin";
    if (!privileged) {
      setAuthenticated(true);
      return;
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw new Error("Unable to verify the session assurance level.");

    if (aal.currentLevel === "aal2") {
      setAuthenticated(true);
      return;
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw new Error("Unable to read multi-factor authentication status.");

    const verifiedTotp = factors.totp.filter((factor) => factor.status === "verified");
    if (verifiedTotp.length === 1) {
      setFactorOptions([{ id: verifiedTotp[0].id, label: factorLabel(verifiedTotp[0], 0) }]);
      setFactorId(verifiedTotp[0].id);
      setStep("challenge-mfa");
      return;
    }

    if (verifiedTotp.length > 1) {
      setFactorOptions(
        verifiedTotp.map((factor, index) => ({ id: factor.id, label: factorLabel(factor, index) })),
      );
      setFactorId(null);
      setOtp("");
      setStep("choose-mfa");
      return;
    }

    for (const staleFactor of factors.totp.filter((factor) => factor.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: staleFactor.id });
    }

    const { data: newFactor, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Cossa Growth",
    });

    if (enrollError || !newFactor?.totp) {
      throw new Error("Unable to start authenticator setup.");
    }

    setFactorId(newFactor.id);
    setEnrollment({
      factorId: newFactor.id,
      qrCode: newFactor.totp.qr_code,
      secret: newFactor.totp.secret,
    });
    setStep("enroll-mfa");
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        throw new Error("Sign-in failed. Check your email and password.");
      }

      const membership = await requireGrowthMembership(data.user.id);
      await prepareMfa(membership.role);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete secure sign-in.");
    } finally {
      setLoading(false);
    }
  }

  function chooseMfaFactor(option: MfaFactorOption) {
    setFactorId(option.id);
    setOtp("");
    setError(null);
    setStep("challenge-mfa");
  }

  async function verifyMfa(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!factorId || otp.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: otp,
      });

      if (verifyError) {
        throw new Error("The authenticator code was not accepted. Check the current code and try again.");
      }

      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aal.currentLevel !== "aal2") {
        throw new Error("MFA was verified but the session did not reach AAL2. Sign in again before continuing.");
      }

      setAuthenticated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify MFA.");
    } finally {
      setLoading(false);
    }
  }

  if (authenticated) {
    return <Navigate to="/command-center" replace />;
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
            Growth access requires an active Cossa organisation membership. Privileged accounts use
            authenticator-based MFA before entering the workspace.
          </div>

          {step === "credentials" && (
            <form className="mt-6 space-y-4" onSubmit={submitCredentials}>
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
                {loading ? "Checking access..." : "Continue securely"}
              </Button>
            </form>
          )}

          {step === "choose-mfa" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-primary/25 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">Choose an authenticator.</span> Use any verified factor you still control. This is the recovery path if one device is lost.
              </div>
              <div className="space-y-2">
                {factorOptions.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => chooseMfaFactor(option)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
              </div>
              <SecurityError error={error} />
            </div>
          )}

          {step === "enroll-mfa" && enrollment && (
            <form className="mt-6 space-y-4" onSubmit={verifyMfa}>
              <div className="rounded-xl border border-primary/25 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h2 className="font-semibold">Set up authenticator MFA</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Scan this QR code with your authenticator app, then enter the current 6-digit
                      code below. Keep the recovery account under Abel Nkuna's separate control.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                  <img
                    src={enrollment.qrCode}
                    alt="Authenticator enrollment QR code"
                    className="h-48 w-48"
                  />
                </div>

                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Cannot scan the QR code?
                  </summary>
                  <p className="mt-2 break-all rounded-md border border-border/60 bg-background p-2 font-mono">
                    {enrollment.secret}
                  </p>
                </details>
              </div>

              <OtpField otp={otp} setOtp={setOtp} />
              <SecurityError error={error} />
              <MfaButton loading={loading} label="Verify and activate MFA" />
            </form>
          )}

          {step === "challenge-mfa" && (
            <form className="mt-6 space-y-4" onSubmit={verifyMfa}>
              <div className="rounded-xl border border-primary/25 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">MFA required.</span> Enter the current
                6-digit code from the selected authenticator.
              </div>

              <OtpField otp={otp} setOtp={setOtp} />
              <SecurityError error={error} />
              <MfaButton loading={loading} label="Verify MFA and enter Growth" />
              {factorOptions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setFactorId(null);
                    setOtp("");
                    setError(null);
                    setStep("choose-mfa");
                  }}
                >
                  Use another authenticator
                </Button>
              )}
            </form>
          )}

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

function OtpField({ otp, setOtp }: { otp: string; setOtp: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      Authenticator code
      <input
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-lg tracking-[0.35em]"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        value={otp}
        onChange={(event) => setOtp(normaliseOtp(event.target.value))}
        autoComplete="one-time-code"
        placeholder="000000"
        required
      />
    </label>
  );
}

function SecurityError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}

function MfaButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button
      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      disabled={loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? "Verifying..." : label}
    </Button>
  );
}
