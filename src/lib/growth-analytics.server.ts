import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const GROWTH_GA4_PROPERTY_ID = "542695998";
const GROWTH_GA4_MEASUREMENT_ID = "G-EWW4BPZN6R";
const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GOOGLE_AUTHORISE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ANALYTICS_API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${GROWTH_GA4_PROPERTY_ID}:runReport`;
const GOOGLE_REQUEST_TIMEOUT_MS = 12_000;
const OAUTH_STATE_TTL_MS = 10 * 60_000;

interface SupabaseUser {
  id: string;
}

interface GoogleOauthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
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

interface OAuthConnectionRow {
  encrypted_refresh_token: string;
}

interface PublicEnvironment {
  organisationId: string;
  supabaseKey: string;
  supabaseUrl: string;
}

interface OAuthEnvironment extends PublicEnvironment {
  clientId: string;
  clientSecret: string;
  encryptionKey: Buffer;
  redirectUri: string;
  serviceRoleKey: string;
}

interface OAuthState {
  audience: "growth-ga4-oauth";
  expiresAt: number;
  organisationId: string;
  userId: string;
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

function responseHtml(title: string, message: string, status = 200): Response {
  const escapedTitle = escapeHtml(title);
  const escapedMessage = escapeHtml(message);
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title></head><body style="margin:0;background:#090909;color:#f5f5f5;font-family:Arial,sans-serif"><main style="max-width:560px;margin:12vh auto;padding:32px"><p style="color:#d8b72d;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Cossa GROWTH</p><h1>${escapedTitle}</h1><p style="line-height:1.6">${escapedMessage}</p><p><a href="/marketing/monitoring" style="color:#d8b72d">Return to Website Monitoring</a></p></main></body></html>`,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function supabaseServiceHeaders(key: string, additional: HeadersInit = {}): Headers {
  const headers = new Headers(additional);
  headers.set("apikey", key);

  if (!isNewSupabaseApiKey(key)) {
    headers.set("Authorization", `Bearer ${key}`);
  }

  return headers;
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

  return { organisationId, supabaseKey, supabaseUrl: trimTrailingSlash(supabaseUrl) };
}

function decodeEncryptionKey(value: string | undefined): Buffer | null {
  if (!value) {
    return null;
  }

  try {
    const key = Buffer.from(value, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

function getOAuthEnvironment(): OAuthEnvironment | null {
  const publicEnvironment = getPublicEnvironment();
  const clientId = process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_SECRET?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const encryptionKey = decodeEncryptionKey(
    process.env.GOOGLE_ANALYTICS_TOKEN_ENCRYPTION_KEY?.trim(),
  );
  const publicSiteUrl = trimTrailingSlash(
    process.env.PUBLIC_SITE_URL || "https://growth.cossanexusholdings.co.za",
  );
  const redirectUri =
    process.env.GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI?.trim() ||
    `${publicSiteUrl}/api/growth-analytics/oauth/callback`;

  if (!publicEnvironment || !clientId || !clientSecret || !serviceRoleKey || !encryptionKey) {
    return null;
  }

  return {
    ...publicEnvironment,
    clientId,
    clientSecret,
    encryptionKey,
    redirectUri,
    serviceRoleKey,
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
  });

  return response.ok ? ((await response.json()) as SupabaseUser) : null;
}

async function isOrganisationOwnerOrAdmin(
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
  const response = await fetch(`${environment.supabaseUrl}/rest/v1/organisation_members?${query}`, {
    headers: {
      apikey: environment.supabaseKey,
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

async function isOrganisationMember(
  environment: PublicEnvironment,
  token: string,
  userId: string,
): Promise<boolean> {
  const query = new URLSearchParams({
    select: "user_id",
    organisation_id: `eq.${environment.organisationId}`,
    user_id: `eq.${userId}`,
    status: "eq.active",
    limit: "1",
  });
  const response = await fetch(`${environment.supabaseUrl}/rest/v1/organisation_members?${query}`, {
    headers: {
      apikey: environment.supabaseKey,
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

async function isOrganisationOwnerOrAdminWithServiceRole(
  environment: OAuthEnvironment,
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
  const response = await fetch(`${environment.supabaseUrl}/rest/v1/organisation_members?${query}`, {
    headers: supabaseServiceHeaders(environment.serviceRoleKey, { Accept: "application/json" }),
  });

  if (!response.ok) {
    return false;
  }

  const members = (await response.json()) as Array<{ user_id?: string }>;
  return members.length === 1;
}

async function authorisedRequest(
  request: Request,
): Promise<{ environment: PublicEnvironment; user: SupabaseUser } | { error: Response }> {
  const environment = getPublicEnvironment();
  const token = getBearerToken(request);

  if (!environment || !token) {
    return { error: responseJson({ error: "Unauthorized" }, 401) };
  }

  const user = await verifySupabaseUser(environment, token);
  if (!user) {
    return { error: responseJson({ error: "Unauthorized" }, 401) };
  }

  return { environment, user };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlToBuffer(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  } catch {
    return null;
  }
}

function encryptSecret(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1.${base64Url(iv)}.${base64Url(authTag)}.${base64Url(ciphertext)}`;
}

function decryptSecret(value: string, key: Buffer): string | null {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    return null;
  }

  const iv = base64UrlToBuffer(ivValue);
  const authTag = base64UrlToBuffer(tagValue);
  const ciphertext = base64UrlToBuffer(ciphertextValue);
  if (!iv || iv.length !== 12 || !authTag || authTag.length !== 16 || !ciphertext) {
    return null;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function createOAuthState(environment: OAuthEnvironment, userId: string): string {
  const payload: OAuthState = {
    audience: "growth-ga4-oauth",
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    organisationId: environment.organisationId,
    userId,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", environment.encryptionKey)
    .update(`growth-ga4-oauth:${encodedPayload}`)
    .digest();
  return `${encodedPayload}.${base64Url(signature)}`;
}

function readOAuthState(environment: OAuthEnvironment, rawState: string | null): OAuthState | null {
  if (!rawState) {
    return null;
  }

  const [encodedPayload, encodedSignature] = rawState.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const signature = base64UrlToBuffer(encodedSignature);
  const expectedSignature = createHmac("sha256", environment.encryptionKey)
    .update(`growth-ga4-oauth:${encodedPayload}`)
    .digest();
  if (!signature || signature.length !== expectedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = base64UrlToBuffer(encodedPayload);
  if (!payload) {
    return null;
  }

  try {
    const state = JSON.parse(payload.toString("utf8")) as OAuthState;
    if (
      state.audience !== "growth-ga4-oauth" ||
      state.organisationId !== environment.organisationId ||
      typeof state.userId !== "string" ||
      state.expiresAt < Date.now()
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function buildOAuthConsentUrl(environment: OAuthEnvironment, state: string): string {
  const parameters = new URLSearchParams({
    access_type: "offline",
    client_id: environment.clientId,
    prompt: "consent",
    redirect_uri: environment.redirectUri,
    response_type: "code",
    scope: GOOGLE_ANALYTICS_SCOPE,
    state,
  });
  return `${GOOGLE_AUTHORISE_URL}?${parameters}`;
}

async function exchangeAuthorizationCode(
  environment: OAuthEnvironment,
  code: string,
): Promise<GoogleOauthTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: environment.clientId,
      client_secret: environment.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: environment.redirectUri,
    }),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("Google rejected the authorisation code.");
  }

  const tokens = (await response.json()) as GoogleOauthTokenResponse;
  if (!tokens.refresh_token) {
    throw new Error("Google did not issue an offline refresh token.");
  }
  return tokens;
}

async function refreshGoogleAccessToken(
  environment: OAuthEnvironment,
  refreshToken: string,
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: environment.clientId,
      client_secret: environment.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("Google could not refresh the read-only reporting connection.");
  }

  const tokens = (await response.json()) as GoogleOauthTokenResponse;
  if (!tokens.access_token) {
    throw new Error("Google did not return an access token.");
  }
  return tokens.access_token;
}

async function getStoredConnection(
  environment: OAuthEnvironment,
): Promise<OAuthConnectionRow | null> {
  const query = new URLSearchParams({
    select: "encrypted_refresh_token",
    organisation_id: `eq.${environment.organisationId}`,
    limit: "1",
  });
  const response = await fetch(
    `${environment.supabaseUrl}/rest/v1/google_analytics_oauth_connections?${query}`,
    { headers: supabaseServiceHeaders(environment.serviceRoleKey, { Accept: "application/json" }) },
  );

  if (!response.ok) {
    throw new Error("Cossa could not read the protected Google connection.");
  }

  const rows = (await response.json()) as OAuthConnectionRow[];
  return rows[0] ?? null;
}

async function saveConnection(
  environment: OAuthEnvironment,
  userId: string,
  refreshToken: string,
  grantedScopes: string[],
): Promise<void> {
  const response = await fetch(
    `${environment.supabaseUrl}/rest/v1/google_analytics_oauth_connections?on_conflict=organisation_id`,
    {
      method: "POST",
      headers: supabaseServiceHeaders(environment.serviceRoleKey, {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        connected_at: new Date().toISOString(),
        connected_by: userId,
        encrypted_refresh_token: encryptSecret(refreshToken, environment.encryptionKey),
        granted_scopes: grantedScopes,
        last_error_code: null,
        measurement_id: GROWTH_GA4_MEASUREMENT_ID,
        organisation_id: environment.organisationId,
        property_id: GROWTH_GA4_PROPERTY_ID,
        provider: "google_analytics",
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Cossa could not save the protected Google connection.");
  }
}

async function updateConnectionHealth(
  environment: OAuthEnvironment,
  values: { last_error_code: string | null; last_success_at?: string },
): Promise<void> {
  await fetch(
    `${environment.supabaseUrl}/rest/v1/google_analytics_oauth_connections?organisation_id=eq.${environment.organisationId}`,
    {
      method: "PATCH",
      headers: supabaseServiceHeaders(environment.serviceRoleKey, {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
    },
  );
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

export async function startGrowthAnalyticsOAuthResponse(request: Request): Promise<Response> {
  const authorisation = await authorisedRequest(request);
  if ("error" in authorisation) {
    return authorisation.error;
  }

  const environment = getOAuthEnvironment();
  if (!environment) {
    return responseJson(
      {
        error:
          "Google Analytics OAuth is awaiting protected client settings and the Cossa token-encryption key.",
      },
      503,
    );
  }

  const isOwnerOrAdmin = await isOrganisationOwnerOrAdmin(
    authorisation.environment,
    getBearerToken(request) as string,
    authorisation.user.id,
  );
  if (!isOwnerOrAdmin) {
    return responseJson(
      { error: "Only a Cossa owner or admin can connect Google Analytics." },
      403,
    );
  }

  const state = createOAuthState(environment, authorisation.user.id);
  return responseJson({ authorization_url: buildOAuthConsentUrl(environment, state) });
}

export async function completeGrowthAnalyticsOAuthResponse(request: Request): Promise<Response> {
  const environment = getOAuthEnvironment();
  if (!environment) {
    return responseHtml(
      "Google Analytics is not ready",
      "Cossa needs its protected OAuth client and token-encryption settings before it can complete this connection.",
      503,
    );
  }

  const url = new URL(request.url);
  const state = readOAuthState(environment, url.searchParams.get("state"));
  if (!state) {
    return responseHtml(
      "Connection could not be verified",
      "The Google approval session was invalid or expired. Return to GROWTH and start the connection again.",
      400,
    );
  }

  if (url.searchParams.get("error")) {
    return responseHtml(
      "Google Analytics was not connected",
      "No Cossa data was changed. You can return to Website Monitoring and try again when ready.",
      400,
    );
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return responseHtml(
      "Google Analytics was not connected",
      "Google did not return an approval code. No Cossa data was changed.",
      400,
    );
  }

  const isOwnerOrAdmin = await isOrganisationOwnerOrAdminWithServiceRole(environment, state.userId);
  if (!isOwnerOrAdmin) {
    return responseHtml(
      "Connection approval is no longer valid",
      "The initiating Cossa account no longer has permission to connect Google Analytics.",
      403,
    );
  }

  try {
    const tokens = await exchangeAuthorizationCode(environment, code);
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      throw new Error("Google did not issue an offline refresh token.");
    }
    const returnedScopes = (tokens.scope || "")
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean);
    if (
      returnedScopes.length > 0 &&
      (returnedScopes.length !== 1 || returnedScopes[0] !== GOOGLE_ANALYTICS_SCOPE)
    ) {
      throw new Error("Google did not grant the approved read-only Analytics scope.");
    }

    await saveConnection(environment, state.userId, refreshToken, [GOOGLE_ANALYTICS_SCOPE]);
    return responseHtml(
      "Google Analytics connected",
      "GROWTH can now read aggregate reporting from property 542695998. It cannot change tags, advertising, or your Google account.",
    );
  } catch {
    return responseHtml(
      "Google Analytics was not connected",
      "Cossa could not complete the read-only connection. No Analytics data was imported. Return to Website Monitoring and try again after reviewing the protected settings.",
      502,
    );
  }
}

export async function getGrowthAnalyticsReportResponse(request: Request): Promise<Response> {
  const authorisation = await authorisedRequest(request);
  if ("error" in authorisation) {
    return authorisation.error;
  }

  const token = getBearerToken(request) as string;
  const isMember = await isOrganisationMember(
    authorisation.environment,
    token,
    authorisation.user.id,
  );
  if (!isMember) {
    return responseJson({ error: "A current Cossa workspace membership is required." }, 403);
  }

  const environment = getOAuthEnvironment();
  if (!environment) {
    return responseJson(
      {
        error:
          "Google Analytics OAuth is awaiting protected client settings and the Cossa token-encryption key.",
      },
      503,
    );
  }

  let connection: OAuthConnectionRow | null;
  try {
    connection = await getStoredConnection(environment);
  } catch {
    return responseJson(
      { error: "Cossa could not read the protected Google Analytics connection." },
      502,
    );
  }

  if (!connection) {
    return responseJson(
      {
        error:
          "Google Analytics needs owner approval. A Cossa owner or admin can start the secure OAuth connection from Website Monitoring.",
      },
      409,
    );
  }

  const refreshToken = decryptSecret(connection.encrypted_refresh_token, environment.encryptionKey);
  if (!refreshToken) {
    await updateConnectionHealth(environment, { last_error_code: "token_decryption_failed" });
    return responseJson(
      {
        error:
          "The protected Google connection could not be read. An owner should reconnect Google Analytics.",
      },
      502,
    );
  }

  try {
    const accessToken = await refreshGoogleAccessToken(environment, refreshToken);
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
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      }),
    ]);
    const summaryRow = summary.rows?.[0];
    await updateConnectionHealth(environment, {
      last_error_code: null,
      last_success_at: new Date().toISOString(),
    });

    return responseJson({
      property_id: GROWTH_GA4_PROPERTY_ID,
      measurement_id: GROWTH_GA4_MEASUREMENT_ID,
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
      fetched_at: new Date().toISOString(),
      reporting_scope:
        "Read-only GA4 aggregate reporting for the confirmed GROWTH property over the last 28 days. No visitor-level records, advertising changes or Google account changes are available through this connection.",
    });
  } catch {
    await updateConnectionHealth(environment, { last_error_code: "google_report_failed" });
    return responseJson(
      {
        error:
          "Google Analytics reporting could not be completed. An owner should review the read-only OAuth connection and reconnect it if access was revoked.",
      },
      502,
    );
  }
}
