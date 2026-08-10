import { createSign } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const GROWTH_GA4_PROPERTY_ID = "542695998";
const GROWTH_GA4_MEASUREMENT_ID = "G-EWW4BPZN6R";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GOOGLE_ANALYTICS_API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${GROWTH_GA4_PROPERTY_ID}:runReport`;
const GOOGLE_REQUEST_TIMEOUT_MS = 12_000;

interface SupabaseUser {
  id: string;
}

interface GoogleServiceAccount {
  client_email?: string;
  private_key?: string;
}

interface GoogleMetricValue {
  value?: string;
}

interface GoogleDimensionValue {
  value?: string;
}

interface GoogleAnalyticsRow {
  dimensionValues?: GoogleDimensionValue[];
  metricValues?: GoogleMetricValue[];
}

interface GoogleAnalyticsRunReportResponse {
  rows?: GoogleAnalyticsRow[];
  metadata?: {
    timeZone?: string;
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function responseJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
    organisationId,
    supabaseKey,
    supabaseUrl: trimTrailingSlash(supabaseUrl),
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

function decodeBase64Json(value: string): string | null {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function readServiceAccount(): GoogleServiceAccount | null {
  const rawJson = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON?.trim();
  const encodedJson = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const source = rawJson || (encodedJson ? decodeBase64Json(encodedJson) : null);

  if (!source) {
    return null;
  }

  try {
    const account = JSON.parse(source) as GoogleServiceAccount;
    return account.client_email && account.private_key ? account : null;
  } catch {
    return null;
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function createGoogleAccessToken(account: Required<GoogleServiceAccount>): Promise<string> {
  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3_300,
      iat: now,
      iss: account.client_email,
      scope: GOOGLE_ANALYTICS_SCOPE,
    }),
  );
  const unsignedAssertion = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedAssertion);
  signer.end();
  const signature = base64Url(signer.sign(account.private_key));

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      assertion: `${unsignedAssertion}.${signature}`,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("Google Analytics authorisation was rejected.");
  }

  const payloadJson = (await response.json()) as { access_token?: string };
  if (!payloadJson.access_token) {
    throw new Error("Google Analytics did not return an access token.");
  }

  return payloadJson.access_token;
}

async function runReport(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<GoogleAnalyticsRunReportResponse> {
  const response = await fetch(GOOGLE_ANALYTICS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("Google Analytics did not return a report.");
  }

  return (await response.json()) as GoogleAnalyticsRunReportResponse;
}

function metricNumber(row: GoogleAnalyticsRow | undefined, index: number): number {
  const value = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export const Route = createFileRoute("/api/growth-analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const environment = getEnvironment();
        const token = getBearerToken(request);

        if (!environment || !token) {
          return responseJson({ error: "Unauthorized" }, 401);
        }

        const user = await verifySupabaseUser({
          token,
          supabaseKey: environment.supabaseKey,
          supabaseUrl: environment.supabaseUrl,
        });

        if (!user) {
          return responseJson({ error: "Unauthorized" }, 401);
        }

        const isMember = await verifyOrganisationMembership({
          token,
          userId: user.id,
          organisationId: environment.organisationId,
          supabaseKey: environment.supabaseKey,
          supabaseUrl: environment.supabaseUrl,
        });

        if (!isMember) {
          return responseJson({ error: "Cossa workspace membership is required." }, 403);
        }

        const serviceAccount = readServiceAccount();
        if (!serviceAccount?.client_email || !serviceAccount.private_key) {
          return responseJson(
            {
              error:
                "Read-only Google Analytics reporting is awaiting the protected Cossa service-account setting.",
            },
            503,
          );
        }

        try {
          const accessToken = await createGoogleAccessToken({
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
          });
          const [summary, channels] = await Promise.all([
            runReport(accessToken, {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              metrics: [
                { name: "activeUsers" },
                { name: "newUsers" },
                { name: "sessions" },
                { name: "screenPageViews" },
                { name: "engagedSessions" },
                { name: "keyEvents" },
              ],
            }),
            runReport(accessToken, {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              dimensions: [{ name: "sessionDefaultChannelGroup" }],
              metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "keyEvents" }],
              limit: "5",
              orderBys: [
                {
                  desc: true,
                  metric: { metricName: "sessions" },
                },
              ],
            }),
          ]);
          const summaryRow = summary.rows?.[0];

          return responseJson({
            property_id: GROWTH_GA4_PROPERTY_ID,
            measurement_id: GROWTH_GA4_MEASUREMENT_ID,
            date_range: {
              start_date: "28daysAgo",
              end_date: "today",
            },
            active_users: metricNumber(summaryRow, 0),
            new_users: metricNumber(summaryRow, 1),
            sessions: metricNumber(summaryRow, 2),
            page_views: metricNumber(summaryRow, 3),
            engaged_sessions: metricNumber(summaryRow, 4),
            key_events: metricNumber(summaryRow, 5),
            channels: (channels.rows ?? []).map((row) => ({
              name: row.dimensionValues?.[0]?.value || "(not set)",
              sessions: metricNumber(row, 0),
              active_users: metricNumber(row, 1),
              key_events: metricNumber(row, 2),
            })),
            fetched_at: new Date().toISOString(),
            reporting_scope:
              "Read-only GA4 aggregate reporting for the confirmed GROWTH property over the last 28 days. No visitor-level records, advertising changes or Google account changes are available through this connection.",
          });
        } catch {
          return responseJson(
            {
              error:
                "Google Analytics reporting could not be completed. Check the protected service-account setting and its Viewer access to the confirmed GROWTH property.",
            },
            502,
          );
        }
      },
    },
  },
});
