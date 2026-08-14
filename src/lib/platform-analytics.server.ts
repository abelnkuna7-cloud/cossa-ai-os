const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_IMPERSONATION_BASE_URL = "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts";
const GOOGLE_ANALYTICS_BASE_URL = "https://analyticsdata.googleapis.com/v1beta/properties";
const GOOGLE_REQUEST_TIMEOUT_MS = 12_000;

interface SupabaseUser {
  id: string;
}

interface PublicEnvironment {
  organisationId: string;
  supabaseKey: string;
  supabaseUrl: string;
}

interface GoogleWorkloadEnvironment {
  projectNumber: string;
  serviceAccountEmail: string;
  workloadIdentityPoolId: string;
  workloadIdentityPoolProviderId: string;
  nexDocsPropertyId: string;
}

interface GoogleTokenResponse {
  access_token?: string;
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
}

class PlatformAnalyticsConnectionError extends Error {
  constructor(
    readonly stage: string,
    readonly upstreamStatus?: number,
  ) {
    super(stage);
  }
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

function getPublicEnvironment(): PublicEnvironment | null {
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

function getGoogleWorkloadEnvironment(): GoogleWorkloadEnvironment | null {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  const workloadIdentityPoolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const workloadIdentityPoolProviderId =
    process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  const nexDocsPropertyId = process.env.NEXDOCS_GA4_PROPERTY_ID?.trim();

  if (
    !projectNumber ||
    !/^\d+$/.test(projectNumber) ||
    !serviceAccountEmail ||
    !workloadIdentityPoolId ||
    !workloadIdentityPoolProviderId ||
    !nexDocsPropertyId ||
    !/^\d+$/.test(nexDocsPropertyId)
  ) {
    return null;
  }

  return {
    projectNumber,
    serviceAccountEmail,
    workloadIdentityPoolId,
    workloadIdentityPoolProviderId,
    nexDocsPropertyId,
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

async function verifySupabaseUser(
  environment: PublicEnvironment,
  token: string,
): Promise<SupabaseUser | null> {
  const response = await fetch(`${environment.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: environment.supabaseKey,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as Partial<SupabaseUser>;
  return typeof user.id === "string" ? { id: user.id } : null;
}

async function isCossaOwnerOrAdmin(
  environment: PublicEnvironment,
  token: string,
  userId: string,
): Promise<boolean> {
  const query = new URLSearchParams({
    select: "user_id",
    organisation_id: `eq.${environment.organisationId}`,
    user_id: `eq.${userId}`,
    status: "eq.active",
    role: "in.(owner,admin)",
    limit: "1",
  });
  const response = await fetch(
    `${environment.supabaseUrl}/rest/v1/organisation_members?${query}`,
    {
      headers: {
        apikey: environment.supabaseKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    return false;
  }

  const members = (await response.json()) as Array<{ user_id?: string }>;
  return members.length === 1;
}

async function exchangeVercelIdentityForGoogleToken(
  environment: GoogleWorkloadEnvironment,
  oidcToken: string,
): Promise<string> {
  const audience =
    `//iam.googleapis.com/projects/${environment.projectNumber}/locations/global/workloadIdentityPools/${environment.workloadIdentityPoolId}/providers/${environment.workloadIdentityPoolProviderId}`;
  const response = await fetch(GOOGLE_STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      audience,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subject_token: oidcToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    }),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new PlatformAnalyticsConnectionError(
      "workload_identity_exchange",
      response.status,
    );
  }

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!payload.access_token) {
    throw new PlatformAnalyticsConnectionError(
      "workload_identity_exchange_token",
    );
  }

  return payload.access_token;
}

async function impersonateAnalyticsReader(
  environment: GoogleWorkloadEnvironment,
  federatedAccessToken: string,
): Promise<string> {
  const serviceAccount = encodeURIComponent(environment.serviceAccountEmail);
  const response = await fetch(
    `${GOOGLE_IMPERSONATION_BASE_URL}/${serviceAccount}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${federatedAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lifetime: "1800s",
        scope: [GOOGLE_ANALYTICS_SCOPE],
      }),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new PlatformAnalyticsConnectionError(
      "service_account_impersonation",
      response.status,
    );
  }

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!payload.access_token) {
    throw new PlatformAnalyticsConnectionError(
      "service_account_impersonation_token",
    );
  }

  return payload.access_token;
}

async function runReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<GoogleAnalyticsRunReportResponse> {
  const response = await fetch(
    `${GOOGLE_ANALYTICS_BASE_URL}/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new PlatformAnalyticsConnectionError(
      "ga4_report",
      response.status,
    );
  }

  return (await response.json()) as GoogleAnalyticsRunReportResponse;
}

function metricNumber(row: GoogleAnalyticsRow | undefined, index: number): number {
  const value = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export async function getPlatformAnalyticsResponse(request: Request): Promise<Response> {
  const publicEnvironment = getPublicEnvironment();
  const bearerToken = getBearerToken(request);

  if (!publicEnvironment || !bearerToken) {
    return responseJson({ error: "Unauthorized" }, 401);
  }

  const user = await verifySupabaseUser(publicEnvironment, bearerToken);
  if (!user) {
    return responseJson({ error: "Unauthorized" }, 401);
  }

  const isOwnerOrAdmin = await isCossaOwnerOrAdmin(
    publicEnvironment,
    bearerToken,
    user.id,
  );
  if (!isOwnerOrAdmin) {
    return responseJson(
      { error: "Only Cossa owners and administrators can view platform traffic." },
      403,
    );
  }

  const workloadEnvironment = getGoogleWorkloadEnvironment();
  if (!workloadEnvironment) {
    return responseJson(
      {
        error:
          "The secure NexDocs Google Analytics connection is waiting for its protected server configuration.",
      },
      503,
    );
  }

  const oidcToken =
    request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) {
    console.warn("[platform-analytics] connection unavailable", {
      stage: "vercel_oidc_token",
    });
    return responseJson(
      {
        error:
          "The secure deployment identity is unavailable. Open this report from the live GROWTH production site.",
      },
      503,
    );
  }

  try {
    const federatedAccessToken = await exchangeVercelIdentityForGoogleToken(
      workloadEnvironment,
      oidcToken,
    );
    const analyticsAccessToken = await impersonateAnalyticsReader(
      workloadEnvironment,
      federatedAccessToken,
    );
    const [summary, channels] = await Promise.all([
      runReport(workloadEnvironment.nexDocsPropertyId, analyticsAccessToken, {
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
      runReport(workloadEnvironment.nexDocsPropertyId, analyticsAccessToken, {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "keyEvents" }],
        limit: "5",
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      }),
    ]);

    const summaryRow = summary.rows?.[0];
    return responseJson({
      sources: [
        {
          id: "nexdocs",
          name: "NexDocs",
          site_url: "https://nexdocs.cossanexusholdings.co.za",
          property_id: workloadEnvironment.nexDocsPropertyId,
          date_range: { start_date: "28daysAgo", end_date: "today" },
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
        },
      ],
      fetched_at: new Date().toISOString(),
      reporting_scope:
        "Private, read-only aggregate traffic for connected Cossa platforms over the last 28 days. This dashboard never receives visitor identities, Google passwords, advertising controls or long-lived Google keys.",
    });
  } catch (error) {
    if (error instanceof PlatformAnalyticsConnectionError) {
      console.error("[platform-analytics] connection failed", {
        stage: error.stage,
        upstream_status: error.upstreamStatus ?? null,
      });
    } else {
      console.error("[platform-analytics] connection failed", {
        stage: "unexpected",
      });
    }

    return responseJson(
      {
        error:
          "NexDocs Google Analytics reporting could not be completed. The connection remains read-only and no website settings were changed.",
      },
      502,
    );
  }
}
