import { supabase } from "@/integrations/supabase/client";

export interface AiProviderStatus {
  openai: {
    configured: boolean;
    key_configured: boolean;
    model_configured: boolean;
    model: string | null;
  };
}

export interface OpenAiConnectionCheck {
  connected: boolean;
  model?: string;
  checked_at?: string;
  scope?: string;
  error?: string;
}

async function getSessionToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return session.access_token;
}

export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  const token = await getSessionToken();
  const response = await fetch("/api/ai-provider-status", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json().catch(() => null)) as
    | AiProviderStatus
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Provider status check failed (${response.status})`,
    );
  }

  return payload as AiProviderStatus;
}

export async function checkOpenAiConnection(): Promise<OpenAiConnectionCheck> {
  const token = await getSessionToken();
  const response = await fetch("/api/ai-provider-status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json().catch(() => null)) as OpenAiConnectionCheck | null;

  if (!response.ok) {
    throw new Error(payload?.error || `OpenAI connection check failed (${response.status})`);
  }

  return payload ?? { connected: false, error: "The connection check returned no result." };
}
