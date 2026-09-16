import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/security-recovery")({
  component: SecurityRecoveryPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});

type FactorSummary = {
  id: string;
  label: string;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function factorLabel(factor: unknown, index: number): string {
  const candidate = factor as { friendly_name?: string; friendlyName?: string };
  return candidate.friendly_name || candidate.friendlyName || `Authenticator ${index + 1}`;
}

function normaliseOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function SecurityRecoveryPage() {
  const [factors, setFactors] = useState<FactorSummary[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refreshFactors() {
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || aal.currentLevel !== "aal2") {
      throw new Error("A verified AAL2 session is required before changing recovery authentication.");
    }

    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw new Error("Unable to read authenticator factors.");

    const verified = data.totp
      .filter((factor) => factor.status === "verified")
      .map((factor, index) => ({ id: factor.id, label: factorLabel(factor, index) }));
    setFactors(verified);
  }

  useEffect(() => {
    let active = true;
    void refreshFactors()
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load recovery security.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function startBackupEnrollment() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aal.currentLevel !== "aal2") {
        throw new Error("Re-authenticate with MFA before adding a backup authenticator.");
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Cossa Growth backup ${factors.length + 1}`,
      });
      if (enrollError || !data?.totp) throw new Error("Unable to start backup authenticator enrollment.");

      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setOtp("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add backup authenticator.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyBackup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!enrollment || otp.length !== 6) {
      setError("Enter the current 6-digit code from the backup authenticator.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: otp,
      });
      if (verifyError) throw new Error("The backup authenticator code was not accepted.");

      await refreshFactors();
      setEnrollment(null);
      setOtp("");
      setSuccess("Backup authenticator verified. Keep it independent from your everyday phone.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify backup authenticator.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-primary/25 bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">CEO recovery security</p>
            <h1 className="mt-2 text-2xl font-semibold">Backup authenticator</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep your normal authenticator on your phone and add a separate authenticator on your laptop or another independently controlled device. Losing one device must not remove your ability to enter Growth.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
          <div className="font-medium">Verified authenticators: {loading ? "Checking…" : factors.length}</div>
          {!loading && factors.length > 0 && (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {factors.map((factor) => <li key={factor.id}>• {factor.label}</li>)}
            </ul>
          )}
        </div>

        {!enrollment && (
          <Button className="mt-5" onClick={startBackupEnrollment} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add backup authenticator
          </Button>
        )}

        {enrollment && (
          <form className="mt-6 space-y-4" onSubmit={verifyBackup}>
            <div className="rounded-xl border border-primary/25 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-semibold">Set this up on the backup device</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Do not add this backup secret only to the same phone that already holds your normal code. On a laptop authenticator, use the manual secret below if scanning the QR code is inconvenient.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                <img src={enrollment.qrCode} alt="Backup authenticator QR code" className="h-48 w-48" />
              </div>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">Manual setup secret</summary>
                <p className="mt-2 break-all rounded-md border border-border/60 bg-background p-2 font-mono">{enrollment.secret}</p>
              </details>
            </div>

            <label className="block text-sm font-medium">
              Backup authenticator code
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

            <Button disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify backup authenticator
            </Button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-500">{success}</p>}

        <div className="mt-6 border-t border-border/60 pt-4 text-sm">
          <Link to="/command-center" className="text-primary hover:underline">Return to Command Centre</Link>
        </div>
      </div>
    </div>
  );
}
