import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";

function configured(...values: Array<string | undefined>): boolean {
  return values.some((value) => typeof value === "string" && value.trim().length > 0);
}

function cleanModel(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function providerConfigurationTruth() {
  const tavily = configured(process.env.TAVILY_API_KEY);
  const serpApi = configured(
    process.env.SERPAPI_API_KEY,
    process.env.SERP_API_KEY,
    process.env.SERPAPI_KEY,
  );
  const newsApi = configured(process.env.NEWS_API_KEY, process.env.NEWSAPI_KEY);
  const supabase = configured(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_URL);
  const runtimeWorker = configured(process.env.AGENT_RUNTIME_WORKER_TOKEN);
  const protectedWriter = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const groq = configured(process.env.GROQ_API_KEY);
  const openai = configured(process.env.OPENAI_API_KEY);
  const gemini = configured(process.env.GEMINI_API_KEY);

  return {
    checked_at: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? "unknown",
    search_providers: {
      tavily: tavily ? "CONFIGURED" : "NOT_CONFIGURED",
      serpapi: serpApi ? "CONFIGURED" : "NOT_CONFIGURED",
      newsapi: newsApi ? "CONFIGURED" : "NOT_CONFIGURED",
    },
    model_providers: {
      groq: {
        configuration: groq ? "CONFIGURED" : "NOT_CONFIGURED",
        model: cleanModel(process.env.AGENT_GROQ_MODEL, "llama-3.3-70b-versatile"),
      },
      openai: {
        configuration: openai ? "CONFIGURED" : "NOT_CONFIGURED",
        model: cleanModel(process.env.AGENT_OPENAI_MODEL, "gpt-5.6"),
      },
      gemini: {
        configuration: gemini ? "CONFIGURED" : "NOT_CONFIGURED",
        model: cleanModel(process.env.AGENT_GEMINI_MODEL, "gemini-2.5-flash"),
      },
    },
    lead_hunter_search_available: tavily || serpApi || newsApi,
    model_reasoning_available: groq || openai || gemini,
    protected_runtime: {
      supabase: supabase ? "CONFIGURED" : "NOT_CONFIGURED",
      runtime_worker: runtimeWorker ? "CONFIGURED" : "NOT_CONFIGURED",
      history_writer: protectedWriter ? "CONFIGURED" : "NOT_CONFIGURED",
    },
    note:
      "CONFIGURED means a server-side variable is present. It does not claim authentication, quota, model access or upstream availability succeeded until a real execution records diagnostics.",
  } as const;
}

export const Route = createFileRoute("/api/lead-hunter/provider-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Preview deployments are already protected by Vercel deployment authentication
          // in this project. Expose only non-secret configuration state and model identifiers
          // there so engineering can verify branch wiring without copying credentials into logs.
          // Production remains organisation-member protected.
          if (process.env.VERCEL_ENV !== "preview") {
            await requireRuntimeMember(request);
          }

          return agentRuntimeJson(providerConfigurationTruth());
        } catch (error) {
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
