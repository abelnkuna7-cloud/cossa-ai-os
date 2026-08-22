import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getActiveOrganisationId, setActiveOrganisationId } from "@/lib/active-organisation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/workspace")({
  component: WorkspacePage,
  head: () => ({
    meta: [
      { title: "Workspace | GROWTH" },
      {
        name: "description",
        content: "Select and manage the GROWTH workspace available to your account.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Workspace = {
  id: string;
  legal_name: string;
  trading_name: string | null;
  role: string;
  plan_code: string | null;
  subscription_status: string | null;
  crm_enabled: boolean;
  workflows_enabled: boolean;
  marketing_enabled: boolean;
  ai_enabled: boolean;
};

type WorkspaceContext = { workspaces: Workspace[] };

type TenantRpc = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

const tenantDb = supabase as unknown as TenantRpc;

function humanise(value: string | null | undefined, fallback = "Not configured") {
  if (!value) return fallback;
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function featureLabel(enabled: boolean, label: string) {
  return enabled ? `${label} available` : `${label} available on a higher plan`;
}

async function loadWorkspaceContext(): Promise<WorkspaceContext> {
  const { data, error } = await tenantDb.rpc("get_growth_workspace_context");
  if (error) throw new Error(error.message || "Your workspaces could not be loaded.");

  const result = data as Partial<WorkspaceContext> | null;
  return { workspaces: Array.isArray(result?.workspaces) ? result.workspaces : [] };
}

function WorkspacePage() {
  const [context, setContext] = useState<WorkspaceContext | null>(null);
  const [selectedId, setSelectedId] = useState(getActiveOrganisationId());
  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkspace = useMemo(
    () => context?.workspaces.find((workspace) => workspace.id === selectedId) ?? null,
    [context, selectedId],
  );

  useEffect(() => {
    let active = true;
    void loadWorkspaceContext()
      .then((next) => {
        if (!active) return;
        setContext(next);
        if (!next.workspaces.some((workspace) => workspace.id === selectedId)) {
          setSelectedId(next.workspaces[0]?.id ?? "");
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error ? loadError.message : "Your workspaces could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  function enterWorkspace(organisationId: string) {
    setActiveOrganisationId(organisationId);
    window.location.assign("/command-center");
  }

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const { data, error: rpcError } = await tenantDb.rpc("create_growth_workspace", {
        p_legal_name: legalName.trim(),
        p_trading_name: tradingName.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message || "The workspace could not be created.");

      const created = Array.isArray(data) ? data[0] : null;
      const organisationId =
        created && typeof created === "object" && "organisation_id" in created
          ? String((created as { organisation_id: unknown }).organisation_id)
          : "";

      setActiveOrganisationId(organisationId);
      toast.success("Your Free GROWTH workspace is ready.");
      window.location.assign("/command-center");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "The workspace could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading secure workspaces…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              GROWTH workspace
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Choose your organisation</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your workspace determines the records, team access and plan features available to you.
              GROWTH keeps every organisation’s data separate through membership-based access
              controls.
            </p>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {context?.workspaces.length ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-3">
              {context.workspaces.map((workspace) => {
                const selected = workspace.id === selectedId;
                return (
                  <button
                    type="button"
                    key={workspace.id}
                    onClick={() => setSelectedId(workspace.id)}
                    className={`w-full rounded-2xl border p-5 text-left transition ${selected ? "border-primary bg-primary/10 shadow-[0_12px_34px_rgba(212,175,55,0.14)]" : "border-border/70 bg-background/30 hover:border-primary/50"}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-display text-lg font-semibold">
                          {workspace.trading_name || workspace.legal_name}
                        </span>
                        {workspace.trading_name ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {workspace.legal_name}
                          </span>
                        ) : null}
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                    </span>
                    <span className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-border bg-background/50 px-2.5 py-1">
                        {humanise(workspace.role)}
                      </span>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                        {humanise(workspace.plan_code, "No plan")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>

            {selectedWorkspace ? (
              <aside className="rounded-2xl border border-border/70 bg-background/30 p-5">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">
                    {humanise(selectedWorkspace.plan_code, "No plan")} plan
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Subscription: {humanise(selectedWorkspace.subscription_status)}
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                  {[
                    featureLabel(selectedWorkspace.crm_enabled, "CRM"),
                    featureLabel(selectedWorkspace.workflows_enabled, "Workflows"),
                    featureLabel(selectedWorkspace.marketing_enabled, "Marketing"),
                    featureLabel(selectedWorkspace.ai_enabled, "AI"),
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => enterWorkspace(selectedWorkspace.id)}
                >
                  Enter this workspace
                </Button>
                {!selectedWorkspace.ai_enabled ? (
                  <Link
                    to="/subscription"
                    className="mt-3 block text-center text-sm text-primary hover:underline"
                  >
                    Explore a higher plan
                  </Link>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={createWorkspace}
            className="mt-8 max-w-xl rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-display text-xl font-semibold">Create a Free workspace</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The Free plan includes a real, single-user CRM workspace. Premium tools remain
                  visible but require an approved upgrade.
                </p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium">
              Legal business name
              <input
                required
                minLength={2}
                maxLength={160}
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                placeholder="Example (Pty) Ltd"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Trading name <span className="text-muted-foreground">(optional)</span>
              <input
                maxLength={160}
                value={tradingName}
                onChange={(event) => setTradingName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                placeholder="Your customer-facing name"
              />
            </label>
            <Button
              type="submit"
              disabled={creating}
              className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="mr-2 h-4 w-4" />
              )}
              {creating ? "Creating workspace…" : "Create Free workspace"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
