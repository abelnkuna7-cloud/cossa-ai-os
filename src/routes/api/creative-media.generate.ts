import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const CREATIVE_BUCKET = "creative-assets";
const OPENAI_TIMEOUT_MS = 90_000;

type JsonRecord = Record<string, unknown>;

type CreativeRequest = {
  id: string;
  organisation_id: string;
  title: string;
  request_text: string;
  asset_type: string;
  requirements: JsonRecord | null;
  creative_brief: JsonRecord | null;
  copy_draft: string | null;
  lifecycle_status: string;
  requested_by_employee_id: string | null;
  metadata: JsonRecord | null;
};

function value(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}

function env() {
  const supabaseUrl = value(process.env.SUPABASE_URL) ?? value(process.env.VITE_SUPABASE_URL);
  const publishableKey =
    value(process.env.SUPABASE_PUBLISHABLE_KEY) ??
    value(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    value(process.env.SUPABASE_ANON_KEY) ??
    value(process.env.VITE_SUPABASE_ANON_KEY);
  return {
    supabaseUrl: supabaseUrl?.replace(/\/+$/, "") ?? null,
    publishableKey,
    serviceRoleKey: value(process.env.SUPABASE_SERVICE_ROLE_KEY),
    organisationId: value(process.env.COSSA_ORGANISATION_ID) ?? DEFAULT_ORGANISATION_ID,
    openAiApiKey: value(process.env.OPENAI_API_KEY),
    imageModel: value(process.env.OPENAI_IMAGE_MODEL) ?? "gpt-image-2",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function bearer(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

async function serviceRequest(
  environment: ReturnType<typeof env>,
  path: string,
  init: RequestInit = {},
) {
  if (!environment.supabaseUrl || !environment.serviceRoleKey)
    throw new Error("creative_server_not_configured");
  const headers = new Headers(init.headers);
  headers.set("apikey", environment.serviceRoleKey);
  headers.set("Authorization", `Bearer ${environment.serviceRoleKey}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${environment.supabaseUrl}${path}`, { ...init, headers });
}

async function requireMember(
  request: Request,
  environment: ReturnType<typeof env>,
): Promise<{ userId: string } | Response> {
  if (!environment.supabaseUrl || !environment.publishableKey) {
    return json(
      {
        error: "Supabase authentication is not configured for Creative Media.",
        code: "auth_not_configured",
      },
      503,
    );
  }
  const token = bearer(request);
  if (!token)
    return json({ error: "Sign in to use Creative Media generation.", code: "unauthorized" }, 401);

  const userResponse = await fetch(`${environment.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: environment.publishableKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok)
    return json({ error: "Your session could not be verified.", code: "unauthorized" }, 401);
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id)
    return json({ error: "Your session could not be verified.", code: "unauthorized" }, 401);

  if (!environment.serviceRoleKey) {
    return json(
      {
        error:
          "Creative Media server storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the protected Vercel environment.",
        code: "creative_server_not_configured",
      },
      503,
    );
  }

  const membership = await serviceRequest(
    environment,
    `/rest/v1/organisation_members?select=role&organisation_id=eq.${encodeURIComponent(environment.organisationId)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&limit=1`,
  );
  if (!membership.ok)
    return json(
      { error: "Workspace membership could not be verified.", code: "membership_check_failed" },
      502,
    );
  const rows = (await membership.json()) as Array<{ role?: string }>;
  if (!rows[0]?.role)
    return json({ error: "Cossa workspace membership is required.", code: "forbidden" }, 403);
  return { userId: user.id };
}

function promptFor(request: CreativeRequest): string {
  const requirements = request.requirements ? JSON.stringify(request.requirements) : "{}";
  const brief = request.creative_brief ? JSON.stringify(request.creative_brief) : "{}";
  return [
    `Create a professional ${request.asset_type.replaceAll("_", " ")} for Cossa Nexus Holdings.`,
    `Request: ${request.request_text}`,
    request.copy_draft
      ? `Copy/content to represent accurately: ${request.copy_draft.slice(0, 2500)}`
      : "",
    `Requirements: ${requirements.slice(0, 1800)}`,
    `Creative brief: ${brief.slice(0, 3000)}`,
    "Use a premium corporate visual hierarchy. Cossa brand colours are black, gold and white with dark charcoal accents. Do not introduce blue. Do not invent prices, claims, awards, customers, results, contact details or business facts not present in the supplied request. Leave adequate breathing room and make text legible.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function safeProviderMessage(status: number): string {
  if (status === 401) return "OpenAI rejected the protected API credential.";
  if (status === 403) return "The OpenAI project does not currently have image-generation access.";
  if (status === 429)
    return "OpenAI image generation is temporarily rate-limited or has no available quota.";
  if (status === 402) return "OpenAI image generation requires available API credit.";
  return `OpenAI image generation failed (HTTP ${status}).`;
}

async function markBlocked(
  environment: ReturnType<typeof env>,
  requestId: string,
  code: string,
  message: string,
) {
  await serviceRequest(
    environment,
    `/rest/v1/creative_asset_requests?id=eq.${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        lifecycle_status: "blocked",
        blocker_code: code,
        blocker_message: message.slice(0, 1000),
        provider_key: null,
        provider_request_id: null,
      }),
    },
  ).catch(() => undefined);
}

export const Route = createFileRoute("/api/creative-media/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const environment = env();
        const member = await requireMember(request, environment);
        if (member instanceof Response) return member;

        if (!environment.openAiApiKey) {
          return json(
            {
              generated: false,
              state: "configuration_required",
              error: "OPENAI_API_KEY is not configured in the protected Vercel environment.",
            },
            503,
          );
        }

        const body = (await request.json().catch(() => null)) as { request_id?: string } | null;
        const requestId = body?.request_id?.trim();
        if (!requestId)
          return json({ error: "request_id is required.", code: "invalid_request" }, 400);

        const readResponse = await serviceRequest(
          environment,
          `/rest/v1/creative_asset_requests?select=*&id=eq.${encodeURIComponent(requestId)}&organisation_id=eq.${encodeURIComponent(environment.organisationId)}&limit=1`,
        );
        if (!readResponse.ok)
          return json(
            { error: "Creative request could not be loaded.", code: "request_read_failed" },
            502,
          );
        const records = (await readResponse.json()) as CreativeRequest[];
        const creative = records[0];
        if (!creative)
          return json({ error: "Creative request was not found.", code: "not_found" }, 404);
        if (["approved_asset", "delivery"].includes(creative.lifecycle_status)) {
          return json(
            {
              error: "Approved or delivered assets cannot be regenerated through this endpoint.",
              code: "immutable_asset_state",
            },
            409,
          );
        }

        const startedAt = new Date().toISOString();
        const startResponse = await serviceRequest(
          environment,
          `/rest/v1/creative_asset_requests?id=eq.${encodeURIComponent(requestId)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              lifecycle_status: "visual_generation",
              provider_key: "openai",
              blocker_code: null,
              blocker_message: null,
              metadata: {
                ...(creative.metadata ?? {}),
                generation_requested_by_user_id: member.userId,
                generation_started_at: startedAt,
                image_model: environment.imageModel,
              },
            }),
          },
        );
        if (!startResponse.ok)
          return json(
            {
              error: "Creative request could not enter visual generation.",
              code: "generation_start_failed",
            },
            502,
          );

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
        try {
          const providerResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${environment.openAiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: environment.imageModel,
              prompt: promptFor(creative),
              size: "1024x1024",
              quality: "low",
              n: 1,
            }),
            signal: controller.signal,
          });

          if (!providerResponse.ok) {
            const message = safeProviderMessage(providerResponse.status);
            await markBlocked(environment, requestId, "image_provider_failed", message);
            return json(
              { generated: false, state: "blocked", provider: "openai", error: message },
              providerResponse.status === 429 ? 429 : 502,
            );
          }

          const providerBody = (await providerResponse.json()) as {
            data?: Array<{ b64_json?: string; url?: string }>;
            id?: string;
          };
          const first = providerBody.data?.[0];
          let bytes: Uint8Array | null = null;
          if (first?.b64_json) bytes = Uint8Array.from(Buffer.from(first.b64_json, "base64"));
          else if (first?.url) {
            const imageResponse = await fetch(first.url);
            if (imageResponse.ok) bytes = new Uint8Array(await imageResponse.arrayBuffer());
          }
          if (!bytes?.length) {
            const message = "OpenAI returned no usable image payload.";
            await markBlocked(environment, requestId, "image_provider_invalid_response", message);
            return json(
              { generated: false, state: "blocked", provider: "openai", error: message },
              502,
            );
          }

          const storagePath = `${new Date().toISOString().slice(0, 10)}/${requestId}/${crypto.randomUUID()}.png`;
          const uploadBytes = new Uint8Array(bytes.byteLength);
          uploadBytes.set(bytes);
          const uploadResponse = await serviceRequest(
            environment,
            `/storage/v1/object/${CREATIVE_BUCKET}/${storagePath}`,
            {
              method: "POST",
              headers: { "Content-Type": "image/png", "x-upsert": "false" },
              body: uploadBytes.buffer,
            },
          );
          if (!uploadResponse.ok) {
            const message =
              "Image was generated but could not be stored securely; the asset was not marked generated.";
            await markBlocked(environment, requestId, "creative_storage_failed", message);
            return json(
              { generated: false, state: "blocked", provider: "openai", error: message },
              502,
            );
          }

          const completedAt = new Date().toISOString();
          const providerRequestId = providerBody.id ?? null;
          const updateResponse = await serviceRequest(
            environment,
            `/rest/v1/creative_asset_requests?id=eq.${encodeURIComponent(requestId)}`,
            {
              method: "PATCH",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({
                lifecycle_status: "preview",
                provider_key: "openai",
                provider_request_id: providerRequestId,
                generated_asset_storage_path: storagePath,
                generated_at: completedAt,
                blocker_code: null,
                blocker_message: null,
                metadata: {
                  ...(creative.metadata ?? {}),
                  image_model: environment.imageModel,
                  generation_completed_at: completedAt,
                  generation_requested_by_user_id: member.userId,
                },
              }),
            },
          );
          if (!updateResponse.ok) {
            return json(
              {
                generated: false,
                state: "storage_only",
                error:
                  "Asset was stored but the lifecycle record could not be updated. Manual review is required.",
              },
              502,
            );
          }
          return json({
            generated: true,
            state: "preview",
            provider: "openai",
            model: environment.imageModel,
            request_id: requestId,
            storage_path: storagePath,
            generated_at: completedAt,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.name === "AbortError"
              ? "OpenAI image generation timed out."
              : "Creative image generation could not complete.";
          await markBlocked(environment, requestId, "image_generation_exception", message);
          return json(
            { generated: false, state: "blocked", provider: "openai", error: message },
            502,
          );
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
