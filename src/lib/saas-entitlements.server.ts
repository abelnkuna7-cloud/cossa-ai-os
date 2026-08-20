import { supabaseAdmin } from "@/integrations/supabase/client.server";

const COSSA_INTERNAL_ORGANISATION_ID =
  "00000000-0000-4000-8000-000000000001";

type CanonicalPlanCode =
  | "internal"
  | "trial"
  | "starter"
  | "professional"
  | "business"
  | "enterprise";

type SaasFeature =
  | "crm"
  | "workflows"
  | "marketing"
  | "ai"
  | "ai_workforce";

interface SaasEntitlements {
  planCode: CanonicalPlanCode;
  subscriptionStatus: string;
  crmEnabled: boolean;
  workflowsEnabled: boolean;
  marketingEnabled: boolean;
  aiEnabled: boolean;
  aiMonthlyCredits: number;
  aiFairUse: boolean;
  maxUsers: number | null;
  isInternal: boolean;
  trialEndsAt: string | null;
}

interface AccessDecision {
  allowed: boolean;
  reason: string | null;
  entitlements: SaasEntitlements;
}

/**
 * Temporary compatibility wrapper.
 *
 * The generated Supabase Database type does not yet include the full SaaS
 * schema. Keep all access to these tables server-side until generated types
 * are refreshed.
 */
const db = supabaseAdmin as unknown as {
  from: (table: string) => any;
};

function normalizePlanCode(value: unknown): CanonicalPlanCode {
  switch (value) {
    case "trial":
    case "starter":
    case "professional":
    case "business":
    case "enterprise":
      return value;
    default:
      return "starter";
  }
}

function internalEntitlements(): SaasEntitlements {
  return {
    planCode: "internal",
    subscriptionStatus: "internal",
    crmEnabled: true,
    workflowsEnabled: true,
    marketingEnabled: true,
    aiEnabled: true,
    aiMonthlyCredits: 0,
    aiFairUse: true,
    maxUsers: null,
    isInternal: true,
    trialEndsAt: null,
  };
}

export async function resolveSaasEntitlements(
  organisationId: string,
): Promise<SaasEntitlements> {
  if (!organisationId) {
    throw new Error("organisationId is required to resolve SaaS entitlements.");
  }

  // Cossa Nexus Holdings remains fully operational while external tenancy is
  // introduced. It is Tenant 001 and follows the internal policy rather than
  // a customer subscription.
  if (organisationId === COSSA_INTERNAL_ORGANISATION_ID) {
    return internalEntitlements();
  }

  const { data: subscription, error: subscriptionError } = await db
    .from("saas_subscriptions")
    .select(
      "plan_code,status,trial_ends_at,current_period_end,monthly_price_zar",
    )
    .eq("organisation_id", organisationId)
    .in("status", ["trialing", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Could not resolve SaaS subscription.", subscriptionError);
    throw new Error("Unable to resolve subscription status.");
  }

  // External organisations without a subscription do not receive implicit
  // product access. This is deliberately fail-closed.
  if (!subscription) {
    return {
      planCode: "starter",
      subscriptionStatus: "none",
      crmEnabled: false,
      workflowsEnabled: false,
      marketingEnabled: false,
      aiEnabled: false,
      aiMonthlyCredits: 0,
      aiFairUse: false,
      maxUsers: 0,
      isInternal: false,
      trialEndsAt: null,
    };
  }

  const planCode = normalizePlanCode(subscription.plan_code);

  const { data: plan, error: planError } = await db
    .from("saas_plan_entitlements")
    .select(
      "crm_enabled,workflows_enabled,marketing_enabled,ai_enabled,ai_monthly_credits,ai_fair_use,max_users",
    )
    .eq("plan_code", planCode)
    .maybeSingle();

  if (planError) {
    console.error("Could not resolve SaaS plan entitlements.", planError);
    throw new Error("Unable to resolve plan entitlements.");
  }

  if (!plan) {
    throw new Error(`No entitlement configuration exists for plan ${planCode}.`);
  }

  const now = Date.now();
  const trialEndsAt = subscription.trial_ends_at ?? null;
  const trialExpired =
    subscription.status === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() <= now;

  const periodExpired =
    subscription.status === "active" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() <= now;

  const subscriptionOperational =
    !trialExpired &&
    !periodExpired &&
    subscription.status !== "past_due";

  return {
    planCode,
    subscriptionStatus: subscription.status,
    crmEnabled: subscriptionOperational && Boolean(plan.crm_enabled),
    workflowsEnabled:
      subscriptionOperational && Boolean(plan.workflows_enabled),
    marketingEnabled:
      subscriptionOperational && Boolean(plan.marketing_enabled),
    aiEnabled: subscriptionOperational && Boolean(plan.ai_enabled),
    aiMonthlyCredits: Number(plan.ai_monthly_credits ?? 0),
    aiFairUse: Boolean(plan.ai_fair_use),
    maxUsers:
      plan.max_users === null || plan.max_users === undefined
        ? null
        : Number(plan.max_users),
    isInternal: false,
    trialEndsAt,
  };
}

export async function canUseSaasFeature(
  organisationId: string,
  feature: SaasFeature,
): Promise<AccessDecision> {
  const entitlements = await resolveSaasEntitlements(organisationId);

  const allowed = (() => {
    switch (feature) {
      case "crm":
        return entitlements.crmEnabled;
      case "workflows":
        return entitlements.workflowsEnabled;
      case "marketing":
        return entitlements.marketingEnabled;
      case "ai":
        return entitlements.aiEnabled;
      case "ai_workforce":
        return (
          entitlements.isInternal ||
          entitlements.planCode === "business" ||
          entitlements.planCode === "enterprise"
        );
      default:
        return false;
    }
  })();

  return {
    allowed,
    reason: allowed
      ? null
      : entitlements.subscriptionStatus === "none"
        ? "A trial or paid GROWTH subscription is required."
        : `The ${entitlements.planCode} plan does not include ${feature}.`,
    entitlements,
  };
}
