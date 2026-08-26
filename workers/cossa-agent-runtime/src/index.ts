/// <reference types="../worker-configuration.d.ts" />

type TickSource = "cron" | "manual";

type TickResult = {
  ok: boolean;
  status: number;
  source: TickSource;
  error?: "configuration_required" | "runtime_unavailable";
};

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

async function fixedTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const leftInput = encoder.encode(left);
  const rightInput = encoder.encode(right);
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", leftInput),
    crypto.subtle.digest("SHA-256", rightInput),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftInput.byteLength ^ rightInput.byteLength;
  for (let index = 0; index < leftBytes.length; index += 1)
    difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

function secret(env: Env, key: string): string | null {
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function runTick(env: Env, source: TickSource): Promise<TickResult> {
  const endpoint = env.AGENT_RUNTIME_URL;
  const token = secret(env, "AGENT_RUNTIME_WORKER_TOKEN");
  if (!endpoint || !token) {
    console.error(JSON.stringify({ event: "agent_runtime_tick_configuration_missing", source }));
    return { ok: false, status: 503, source, error: "configuration_required" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-cossa-agent-runtime-token": token,
        "User-Agent": "cossa-agent-runtime-worker/1.0",
      },
      signal: controller.signal,
    });
    const result = { ok: response.ok, status: response.status, source };
    console.info(JSON.stringify({ event: "agent_runtime_tick_forwarded", ...result }));
    return result;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "agent_runtime_tick_runtime_unavailable",
        source,
        message: error instanceof Error ? error.message : "Unknown worker fetch failure",
      }),
    );
    return { ok: false, status: 502, source, error: "runtime_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "cossa-agent-runtime",
        runtime_endpoint_configured: Boolean(env.AGENT_RUNTIME_URL),
        worker_secret_configured: Boolean(secret(env, "AGENT_RUNTIME_WORKER_TOKEN")),
        schedule_status:
          "Verify deployed cron status in Cloudflare before treating this worker as active.",
        external_sending_enabled: false,
      });
    }
    if (request.method === "POST" && url.pathname === "/v1/run") {
      const supplied = request.headers.get("x-cossa-agent-runtime-token") ?? "";
      const workerToken = secret(env, "AGENT_RUNTIME_WORKER_TOKEN");
      if (!workerToken || !(await fixedTimeEqual(supplied, workerToken))) {
        return json({ error: "Unauthorized" }, 401);
      }
      const result = await runTick(env, "manual");
      return json(result, result.ok ? 200 : 502);
    }
    return json({ error: "Not found" }, 404);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runTick(env, "cron").catch((error) => {
        console.error(
          JSON.stringify({
            event: "agent_runtime_tick_failed",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }),
    );
  },
} satisfies ExportedHandler<Env>;
