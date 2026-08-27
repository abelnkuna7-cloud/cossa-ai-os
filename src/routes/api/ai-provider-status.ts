import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const PROVIDER_CHECK_TIMEOUT_MS = 10_000;

interface SupabaseUser {
  id: string;
}

interface OpenAiProviderError {
  error?: {
    message?: string;
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getEnvironment() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const organisationId =
    process.env.COSSA_ORGANISATION_ID ||
    process.env.VITE_COSSA_ORGANISATION_ID ||
    DEFAULT_COSSA_ORGANISATION_ID;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.AGENT_OPENAI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || null,
    supabaseUrl: trimTrailingSlash(supabaseUrl),
    supabaseKey,
    organisationId,
  };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

async function verifySupabaseUser({
  token,
  supabaseUrl,
  supabaseKey,
}: {
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<SupabaseUser | null> {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok ? ((await response.json()) as SupabaseUser) : null;
}

async function verifyOrganisationMembership({
  token,
  userId,
  organisationId,
  supabaseUrl,
  supabaseKey,
}: {
  token: string;
  userId: string;
  organisationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<boolean> {
  const query = new URLSearchParams({
    select: "user_id",
    organisation_id: `eq.${organisationId}`,
    user_id: `eq.${userId}`,
    status: "eq.active",
    limit: "1",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/organisation_members?${query}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return false;
  }

  const members = (await response.json()) as Array<{ user_id?: string }>;
  return members.length === 1;
}

function responseJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeOpenAiFailure(status: number, body: OpenAiProviderError | null): string {
  if (status === 401) {
    return "OpenAI rejected the server credential. Replace the protected OPENAI_API_KEY and deploy again.";
  }

  if (status === 403) {
    return "The OpenAI project does not have access to the configured model.";
  }

  if (status === 404) {
    return "The configured OpenAI model is not available to this project.";
  }

  if (status === 402) {
    return "The OpenAI project needs billing or available credit before it can be used.";
  }

  if (status === 429) {
    return "OpenAI is rate-limiting this project. Wait briefly, then check again.";
  }

  return body?.error?.message?.trim() || `OpenAI connection check failed (HTTP ${status}).`;
}

async function requireCossaMember(request: Request) {
  const environment = getEnvironment();

  if (!environment) {
    return {
      error: responseJson({ error: "Cossa provider status is not fully configured." }, 503),
    };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { error: responseJson({ error: "Unauthorized" }, 401) };
  }

  const user = await verifySupabaseUser({
    token,
    supabaseUrl: environment.supabaseUrl,
    supabaseKey: environment.supabaseKey,
  });
  if (!user) {
    return { error: responseJson({ error: "Unauthorized" }, 401) };
  }

  const isMember = await verifyOrganisationMembership({
    token,
    userId: user.id,
    organisationId: environment.organisationId,
    supabaseUrl: environment.supabaseUrl,
    supabaseKey: environment.supabaseKey,
  });
  if (!isMember) {
    return { error: responseJson({ error: "Cossa workspace membership is required." }, 403) };
  }

  return { environment };
}

export const Route = createFileRoute("/api/ai-provider-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const access = await requireCossaMember(request);
        if ("error" in access) {
          return access.error;
        }

        return responseJson({
          openai: {
            configured: Boolean(access.environment.openAiApiKey && access.environment.openAiModel),
            key_configured: Boolean(access.environment.openAiApiKey),
            model_configured: Boolean(access.environment.openAiModel),
            model: access.environment.openAiModel,
          },
        });
      },
      POST: async ({ request }) => {
        const access = await requireCossaMember(request);
        if ("error" in access) {
          return access.error;
        }

        if (!access.environment.openAiApiKey || !access.environment.openAiModel) {
          return responseJson(
            {
              connected: false,
              error:
                "OpenAI is not fully configured on this deployment. Add OPENAI_API_KEY and an approved AGENT_OPENAI_MODEL or OPENAI_MODEL to the protected Production environment, then deploy again.",
            },
            503,
          );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROVIDER_CHECK_TIMEOUT_MS);

        try {
          /*
           * This checks credential and model access only. It does not send Cossa
           * knowledge, CRM data, prompts or a chat completion to OpenAI.
           */
          const response = await fetch(
            `https://api.openai.com/v1/models/${encodeURIComponent(access.environment.openAiModel)}`,
            {
              headers: {
                Authorization: `Bearer ${access.environment.openAiApiKey}`,
              },
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as OpenAiProviderError | null;
            return responseJson(
              { connected: false, error: safeOpenAiFailure(response.status, body) },
              response.status === 402 || response.status === 429 ? response.status : 502,
            );
          }

          return responseJson({
            connected: true,
            model: access.environment.openAiModel,
            checked_at: new Date().toISOString(),
            scope:
              "Credential and model-access check only. No Cossa data or chat request was sent.",
          });
        } catch (error) {
          const message =
            error instanceof Error && error.name === "AbortError"
              ? "The OpenAI connection check timed out. Try again shortly."
              : "The deployment could not reach OpenAI. Check the server deployment and try again.";
          return responseJson({ connected: false, error: message }, 502);
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
