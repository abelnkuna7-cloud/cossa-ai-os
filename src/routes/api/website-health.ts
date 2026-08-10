import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const OFFICIAL_WEBSITE_URL = "https://growth.cossanexusholdings.co.za";
const WEBSITE_CHECK_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 160_000;

interface SupabaseUser {
  id: string;
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

async function readHtmlPreview(response: Response): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < MAX_HTML_BYTES) {
      const { value, done } = await reader.read();
      if (done || !value) {
        break;
      }

      const remaining = MAX_HTML_BYTES - totalBytes;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      totalBytes += chunk.byteLength;

      if (chunk.byteLength < value.byteLength) {
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const text = new TextDecoder().decode(
    chunks.reduce<Uint8Array>((combined, chunk) => {
      const next = new Uint8Array(combined.length + chunk.length);
      next.set(combined);
      next.set(chunk, combined.length);
      return next;
    }, new Uint8Array()),
  );

  return text;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, " ").trim();
  return title || null;
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

export const Route = createFileRoute("/api/website-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const environment = getEnvironment();

        if (!environment) {
          return responseJson({ error: "Website monitoring is not fully configured." }, 503);
        }

        const token = getBearerToken(request);
        if (!token) {
          return responseJson({ error: "Unauthorized" }, 401);
        }

        const user = await verifySupabaseUser({
          token,
          supabaseUrl: environment.supabaseUrl,
          supabaseKey: environment.supabaseKey,
        });

        if (!user) {
          return responseJson({ error: "Unauthorized" }, 401);
        }

        const isMember = await verifyOrganisationMembership({
          token,
          userId: user.id,
          organisationId: environment.organisationId,
          supabaseUrl: environment.supabaseUrl,
          supabaseKey: environment.supabaseKey,
        });

        if (!isMember) {
          return responseJson({ error: "Cossa workspace membership is required." }, 403);
        }

        const checkedAt = new Date().toISOString();
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBSITE_CHECK_TIMEOUT_MS);

        try {
          const response = await fetch(OFFICIAL_WEBSITE_URL, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Cossa-Growth-Website-Watch/1.0 (+https://growth.cossanexusholdings.co.za)",
              Accept: "text/html,application/xhtml+xml",
            },
          });
          const responseTime = Date.now() - startedAt;
          const contentType = response.headers.get("content-type") ?? "";
          const html = contentType.includes("text/html") ? await readHtmlPreview(response) : "";
          const pageTitle = extractTitle(html);
          const robots = `${response.headers.get("x-robots-tag") ?? ""} ${html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)/i)?.[1] ?? ""}`;
          const noindexDetected = /\bnoindex\b/i.test(robots);
          const issues: string[] = [];

          if (!response.ok) {
            issues.push(`The official website returned HTTP ${response.status}.`);
          }
          if (response.ok && !pageTitle) {
            issues.push("A page title could not be detected in the homepage response.");
          }
          if (noindexDetected) {
            issues.push(
              "The homepage response indicates noindex, which can prevent search indexing.",
            );
          }
          if (response.ok && responseTime > 5_000) {
            issues.push(
              `Homepage response was slow (${(responseTime / 1_000).toFixed(1)} seconds).`,
            );
          }

          return responseJson({
            website: OFFICIAL_WEBSITE_URL,
            final_url: response.url || OFFICIAL_WEBSITE_URL,
            availability: response.ok
              ? issues.length > 0
                ? "degraded"
                : "healthy"
              : "unavailable",
            http_status: response.status,
            response_time_ms: responseTime,
            page_title: pageTitle,
            title_detected: Boolean(pageTitle),
            noindex_detected: noindexDetected,
            checked_at: checkedAt,
            issues,
            monitoring_scope:
              "On-demand check of the official homepage only: availability, response time, page title and noindex indication. It does not change the website, publish content or replace a full security, uptime or SEO service.",
          });
        } catch {
          return responseJson({
            website: OFFICIAL_WEBSITE_URL,
            final_url: null,
            availability: "unavailable",
            http_status: null,
            response_time_ms: Date.now() - startedAt,
            page_title: null,
            title_detected: false,
            noindex_detected: false,
            checked_at: checkedAt,
            issues: ["The official website could not be reached before the check timed out."],
            monitoring_scope:
              "On-demand check of the official homepage only: availability, response time, page title and noindex indication. It does not change the website, publish content or replace a full security, uptime or SEO service.",
          });
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
