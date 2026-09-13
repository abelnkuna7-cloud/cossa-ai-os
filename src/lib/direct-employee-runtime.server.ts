type JsonObject = Record<string, unknown>;

type DirectTask = {
  id: string;
  organisation_id: string;
  mission_id: string | null;
  agent_id: string | null;
  task_type: string;
  action_key: string;
  status: string;
  payload: JsonObject;
  attempt_count: number;
  max_attempts: number;
  lease_token: string | null;
};

type RuntimeAgent = {
  id: string;
  employee_id: string;
  agent_key: string;
  name: string;
  purpose: string;
  system_instructions: string;
  status: string;
};

type RuntimeEmployee = {
  id: string;
  employee_key: string;
  name: string;
  title: string;
  status: string;
};

type RuntimeMission = {
  id: string;
  organisation_id: string;
  assigned_employee_id: string | null;
  title: string;
  instruction: string;
  objective: string;
  target_market: string | null;
  target_location: string | null;
  target_service: string | null;
  constraints: unknown[];
  prohibited_actions: unknown[];
  output_schema: JsonObject;
  status: string;
};

type RuntimeHandoff = {
  id: string;
  mission_id: string;
  to_employee_id: string;
  reason: string;
  context: JsonObject;
  retained_record_ids: JsonObject;
  status: string;
  run_id: string | null;
};

type RuntimePermission = {
  decision: string;
  permission_class: string;
  enabled: boolean;
};

type DirectRuntimeEnvironment = {
  supabaseUrl: string;
  serviceRoleKey: string;
  organisationId: string;
  groqApiKey: string | null;
  openAiApiKey: string | null;
  geminiApiKey: string | null;
};

type Completion = {
  provider: "groq" | "openai" | "gemini";
  model: string;
  content: string;
};

const DEFAULT_COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const MAX_OUTPUT_CHARS = 9_000;
const DIRECT_TASK_TYPE = "direct_employee_assignment";
const DIRECT_ACTION_KEY = "direct_employee_internal";

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function environment(): DirectRuntimeEnvironment | null {
  const supabaseUrl = optional(process.env.SUPABASE_URL) ?? optional(process.env.VITE_SUPABASE_URL);
  const serviceRoleKey = optional(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) return null;

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    serviceRoleKey,
    organisationId: optional(process.env.COSSA_ORGANISATION_ID) ?? DEFAULT_COSSA_ORGANISATION_ID,
    groqApiKey: optional(process.env.GROQ_API_KEY),
    openAiApiKey: optional(process.env.OPENAI_API_KEY),
    geminiApiKey: optional(process.env.GEMINI_API_KEY),
  };
}

function record(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

function usesModernSupabaseKey(value: string): boolean {
  return value.startsWith("sb_secret_") || value.startsWith("sb_publishable_");
}

async function database<T>(
  env: DirectRuntimeEnvironment,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.serviceRoleKey);
  headers.set("Accept", "application/json");
  if (!usesModernSupabaseKey(env.serviceRoleKey)) {
    headers.set("Authorization", `Bearer ${env.serviceRoleKey}`);
  }
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = clip(await response.text().catch(() => ""), 1_000);
    throw new Error(`Direct employee runtime database request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json().catch(() => undefined)) as T;
}

async function rpc<T>(env: DirectRuntimeEnvironment, name: string, body: JsonObject): Promise<T> {
  return database<T>(env, `rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 24_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function providerOrder(env: DirectRuntimeEnvironment): ("groq" | "openai" | "gemini")[] {
  const requested = (optional(process.env.AGENT_MODEL_PROVIDER_ORDER) ?? "groq,openai,gemini")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is "groq" | "openai" | "gemini" =>
      value === "groq" || value === "openai" || value === "gemini",
    );

  return [...new Set(requested)].filter((provider) => {
    if (provider === "groq") return Boolean(env.groqApiKey);
    if (provider === "openai") return Boolean(env.openAiApiKey);
    return Boolean(env.geminiApiKey);
  });
}

async function providerCompletion(
  env: DirectRuntimeEnvironment,
  provider: "groq" | "openai" | "gemini",
  prompt: string,
): Promise<Completion> {
  if (provider === "groq" || provider === "openai") {
    const key = provider === "groq" ? env.groqApiKey : env.openAiApiKey;
    const model =
      provider === "groq"
        ? optional(process.env.AGENT_GROQ_MODEL) ?? "llama-3.3-70b-versatile"
        : optional(process.env.AGENT_OPENAI_MODEL) ?? "gpt-5.6";
    const endpoint =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1_100,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const body = record(await response.json().catch(() => ({})));
    if (!response.ok) {
      throw new Error(`${provider} direct employee completion failed with HTTP ${response.status}.`);
    }
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const content = text(record(record(choices[0]).message).content);
    if (!content) throw new Error(`${provider} returned no direct employee completion content.`);
    return { provider, model, content: clip(content, MAX_OUTPUT_CHARS) };
  }

  const model = optional(process.env.AGENT_GEMINI_MODEL) ?? "gemini-2.5-flash";
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey ?? "")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1_100 },
      }),
    },
  );
  const body = record(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(`gemini direct employee completion failed with HTTP ${response.status}.`);
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const parts = Array.isArray(record(record(candidates[0]).content).parts)
    ? (record(record(candidates[0]).content).parts as unknown[])
    : [];
  const content = parts.map((part) => text(record(part).text)).filter(Boolean).join("\n");
  if (!content) throw new Error("gemini returned no direct employee completion content.");
  return { provider, model, content: clip(content, MAX_OUTPUT_CHARS) };
}

async function completeWithFallback(env: DirectRuntimeEnvironment, prompt: string): Promise<Completion> {
  const providers = providerOrder(env);
  if (providers.length === 0) throw new Error("No configured model provider is available for direct employee work.");

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      return await providerCompletion(env, provider, prompt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown direct employee provider failure.");
      console.warn(`[direct-employee-runtime] ${provider} unavailable`, lastError.message);
    }
  }
  throw lastError ?? new Error("No direct employee model provider completed the task.");
}

async function logEvent(
  env: DirectRuntimeEnvironment,
  values: {
    taskId: string;
    missionId: string;
    runId?: string | null;
    agentId: string;
    eventType: string;
    severity?: "info" | "warning" | "error";
    message: string;
    metadata?: JsonObject;
  },
): Promise<void> {
  await database(env, "agent_execution_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      organisation_id: env.organisationId,
      task_id: values.taskId,
      mission_id: values.missionId,
      run_id: values.runId ?? null,
      agent_id: values.agentId,
      event_type: values.eventType,
      severity: values.severity ?? "info",
      message: clip(values.message, 1_500),
      metadata: values.metadata ?? {},
    }),
  }).catch((error) => console.error("[direct-employee-runtime] unable to record event", error));
}

async function one<T>(env: DirectRuntimeEnvironment, path: string): Promise<T> {
  const rows = await database<T[]>(env, path);
  if (!rows[0]) throw new Error("A required direct employee runtime record is unavailable.");
  return rows[0];
}

async function finishTask(
  env: DirectRuntimeEnvironment,
  task: DirectTask,
  result: JsonObject,
): Promise<void> {
  const rows = await database<JsonObject[]>(
    env,
    `agent_tasks?id=eq.${encodeURIComponent(task.id)}&lease_token=eq.${encodeURIComponent(task.lease_token ?? "")}&status=eq.running`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "completed",
        result,
        lease_token: null,
        lease_expires_at: null,
        completed_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      }),
    },
  );
  if (rows.length !== 1) throw new Error("Direct employee runtime lost its task lease before completion.");
}

async function failTask(
  env: DirectRuntimeEnvironment,
  task: DirectTask,
  error: Error,
): Promise<"retried" | "failed"> {
  const retry = task.attempt_count < task.max_attempts;
  const now = Date.now();
  const retryDelaySeconds = Math.min(900, 30 * 2 ** Math.max(0, task.attempt_count - 1));
  const rows = await database<JsonObject[]>(
    env,
    `agent_tasks?id=eq.${encodeURIComponent(task.id)}&lease_token=eq.${encodeURIComponent(task.lease_token ?? "")}&status=eq.running`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: retry ? "retry_scheduled" : "failed",
        error_code: "direct_employee_runtime_failed",
        error_message: clip(error.message, 1_000),
        lease_token: null,
        lease_expires_at: null,
        run_after: new Date(now + (retry ? retryDelaySeconds * 1_000 : 0)).toISOString(),
        completed_at: retry ? null : new Date(now).toISOString(),
      }),
    },
  );
  if (rows.length !== 1) throw new Error("Direct employee runtime lost its task lease while recording failure.");
  return retry ? "retried" : "failed";
}

async function processDirectTask(env: DirectRuntimeEnvironment, task: DirectTask): Promise<"completed" | "retried" | "failed"> {
  if (!task.mission_id || !task.agent_id || task.task_type !== DIRECT_TASK_TYPE || task.action_key !== DIRECT_ACTION_KEY) {
    const outcome = await failTask(env, task, new Error("Invalid direct employee runtime task identity."));
    return outcome;
  }

  const payload = record(task.payload);
  const handoffId = text(payload.handoff_id);
  if (!handoffId) return failTask(env, task, new Error("Direct employee task is missing its recorded handoff."));

  const agent = await one<RuntimeAgent>(
    env,
    `ai_agents?${new URLSearchParams({ select: "id,employee_id,agent_key,name,purpose,system_instructions,status", id: `eq.${task.agent_id}`, organisation_id: `eq.${env.organisationId}`, limit: "1" })}`,
  );
  const employee = await one<RuntimeEmployee>(
    env,
    `ai_employees?${new URLSearchParams({ select: "id,employee_key,name,title,status", id: `eq.${agent.employee_id}`, organisation_id: `eq.${env.organisationId}`, limit: "1" })}`,
  );
  const mission = await one<RuntimeMission>(
    env,
    `missions?${new URLSearchParams({ select: "id,organisation_id,assigned_employee_id,title,instruction,objective,target_market,target_location,target_service,constraints,prohibited_actions,output_schema,status", id: `eq.${task.mission_id}`, organisation_id: `eq.${env.organisationId}`, limit: "1" })}`,
  );
  const handoff = await one<RuntimeHandoff>(
    env,
    `employee_handoffs?${new URLSearchParams({ select: "id,mission_id,to_employee_id,reason,context,retained_record_ids,status,run_id", id: `eq.${handoffId}`, mission_id: `eq.${task.mission_id}`, organisation_id: `eq.${env.organisationId}`, limit: "1" })}`,
  );
  const permission = await one<RuntimePermission>(
    env,
    `agent_permission_policies?${new URLSearchParams({ select: "decision,permission_class,enabled", agent_id: `eq.${agent.id}`, organisation_id: `eq.${env.organisationId}`, action_key: `eq.${DIRECT_ACTION_KEY}`, enabled: "eq.true", limit: "1" })}`,
  );

  if (agent.status !== "active" || employee.status !== "active") {
    return failTask(env, task, new Error("The assigned employee runtime is not active."));
  }
  if (employee.employee_key === "lead-hunter") {
    return failTask(env, task, new Error("Lead Hunter may not use the generic direct employee executor."));
  }
  if (agent.employee_id !== employee.id || mission.assigned_employee_id !== employee.id || handoff.to_employee_id !== employee.id) {
    return failTask(env, task, new Error("Direct employee mission, agent and handoff ownership do not match."));
  }
  if (permission.decision !== "allow" || permission.permission_class !== "WRITE_INTERNAL") {
    return failTask(env, task, new Error("Direct employee internal execution is not permitted for this agent."));
  }
  if (text(record(mission.output_schema).assignment_mode) !== "direct_employee") {
    return failTask(env, task, new Error("The mission is not a recorded direct employee assignment."));
  }

  const now = new Date().toISOString();

  if (handoff.status === "accepted" && handoff.run_id) {
    await database(env, `mission_runs?id=eq.${encodeURIComponent(handoff.run_id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.running`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "failed",
        error_code: "direct_employee_lease_recovered",
        error_message: "A hosted runtime lease expired before the prior attempt completed; the durable task is being retried.",
        completed_at: now,
      }),
    });
    await database(env, `employee_handoffs?id=eq.${encodeURIComponent(handoff.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.accepted`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "pending", run_id: null, accepted_at: null, completed_at: null }),
    });
    handoff.status = "pending";
    handoff.run_id = null;
  }

  if (handoff.status !== "pending") {
    return failTask(env, task, new Error(`Direct employee handoff is ${handoff.status} and cannot be claimed.`));
  }

  const runId = crypto.randomUUID();
  const claimed = await database<JsonObject[]>(
    env,
    `employee_handoffs?id=eq.${encodeURIComponent(handoff.id)}&mission_id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&to_employee_id=eq.${encodeURIComponent(employee.id)}&status=eq.pending`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "accepted", run_id: runId, accepted_at: now, completed_at: null }),
    },
  );
  if (claimed.length !== 1) return failTask(env, task, new Error("The direct employee handoff was already claimed."));

  await database(env, "mission_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: runId,
      organisation_id: env.organisationId,
      mission_id: mission.id,
      employee_id: employee.id,
      status: "running",
      model_provider: "model_router",
      model_name: "direct-employee-runtime-v1",
      knowledge_version_ids: [],
      input: {
        kind: "direct_employee_assignment",
        employee_key: employee.employee_key,
        objective: mission.objective,
        instruction: mission.instruction,
        handoff_reason: handoff.reason,
        handoff_context: handoff.context,
        retained_record_ids: handoff.retained_record_ids,
        external_actions_enabled: false,
      },
      started_at: now,
    }),
  });

  await database(env, `missions?id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.queued`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "running", updated_at: now }),
  });

  try {
    const prompt = [
      `You are ${employee.name}, ${employee.title}, an authorised Cossa AI employee.`,
      agent.system_instructions || agent.purpose,
      "This is safe INTERNAL work only. Do not send messages, publish, buy, pay, deploy, change DNS, change credentials, sign commitments, delete production data, or claim any external action happened.",
      "Use only the facts contained in this mission and clearly label missing information. Never fabricate customers, suppliers, prices, revenue, performance, account access, research, evidence or completed actions.",
      "Return a concise reviewable work result followed by: Evidence used; Missing information; Recommended next safe action.",
      `Mission objective: ${mission.objective}`,
      `Mission instruction: ${mission.instruction}`,
      `Target market: ${mission.target_market ?? "not recorded"}`,
      `Target location: ${mission.target_location ?? "not recorded"}`,
      `Target service: ${mission.target_service ?? "not recorded"}`,
      `Constraints: ${clip(JSON.stringify(mission.constraints ?? []), 2_500)}`,
      `Prohibited actions: ${clip(JSON.stringify(mission.prohibited_actions ?? []), 2_500)}`,
      `Recorded handoff context: ${clip(JSON.stringify(handoff.context ?? {}), 2_500)}`,
    ].join("\n\n");

    const completion = await completeWithFallback(env, prompt);
    const completedAt = new Date().toISOString();
    const output = {
      kind: "reviewable_draft",
      worker_key: employee.employee_key,
      worker_name: employee.name,
      created_at: completedAt,
      external_actions_enabled: false,
      execution_provider: completion.provider,
      execution_name: completion.model,
      source_scope: [
        "recorded mission objective and instruction",
        "recorded employee system instructions",
        "recorded handoff context",
        "authorised Cossa context supplied in the mission",
      ],
      content: completion.content,
    };

    await database(env, `mission_runs?id=eq.${encodeURIComponent(runId)}&mission_id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.running`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "completed",
        output,
        model_provider: completion.provider,
        model_name: completion.model,
        completed_at: completedAt,
        error_code: null,
        error_message: null,
      }),
    });
    await database(env, `employee_handoffs?id=eq.${encodeURIComponent(handoff.id)}&mission_id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.accepted&run_id=eq.${encodeURIComponent(runId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "completed", completed_at: completedAt }),
    });
    await database(env, `missions?id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.running`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "completed", updated_at: completedAt }),
    });
    await finishTask(env, task, {
      run_id: runId,
      employee_id: employee.id,
      employee_key: employee.employee_key,
      content: completion.content,
      execution_provider: completion.provider,
      execution_name: completion.model,
      external_actions_enabled: false,
    });
    await logEvent(env, {
      taskId: task.id,
      missionId: mission.id,
      runId,
      agentId: agent.id,
      eventType: "direct_employee_task_completed",
      message: `${employee.name} completed a hosted direct employee assignment.`,
      metadata: { provider: completion.provider, model: completion.model, external_actions_enabled: false },
    });
    return "completed";
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error("Unknown direct employee runtime failure.");
    const failedAt = new Date().toISOString();
    await database(env, `mission_runs?id=eq.${encodeURIComponent(runId)}&mission_id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.running`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "failed",
        error_code: "direct_employee_runtime_failed",
        error_message: clip(error.message, 1_000),
        completed_at: failedAt,
      }),
    }).catch(() => undefined);

    const outcome = await failTask(env, task, error);
    if (outcome === "retried") {
      await database(env, `employee_handoffs?id=eq.${encodeURIComponent(handoff.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&run_id=eq.${encodeURIComponent(runId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "pending", run_id: null, accepted_at: null, completed_at: null }),
      }).catch(() => undefined);
      await database(env, `missions?id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}&status=eq.running`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "queued", updated_at: failedAt }),
      }).catch(() => undefined);
    } else {
      await database(env, `missions?id=eq.${encodeURIComponent(mission.id)}&organisation_id=eq.${encodeURIComponent(env.organisationId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", updated_at: failedAt }),
      }).catch(() => undefined);
    }
    await logEvent(env, {
      taskId: task.id,
      missionId: mission.id,
      runId,
      agentId: agent.id,
      eventType: outcome === "retried" ? "direct_employee_task_retry_scheduled" : "direct_employee_task_failed",
      severity: "error",
      message: `${employee.name} could not complete the hosted direct assignment: ${clip(error.message, 500)}`,
      metadata: { attempt: task.attempt_count, max_attempts: task.max_attempts, external_actions_enabled: false },
    });
    return outcome;
  }
}

export async function runDirectEmployeeRuntimeTick(): Promise<{
  configured: boolean;
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}> {
  const env = environment();
  if (!env) return { configured: false, claimed: 0, completed: 0, retried: 0, failed: 0 };

  const tasks = await rpc<DirectTask[]>(env, "claim_direct_employee_agent_tasks", {
    p_organisation_id: env.organisationId,
    p_worker_id: crypto.randomUUID(),
    p_limit: 1,
    p_lease_seconds: 300,
  });

  let completed = 0;
  let retried = 0;
  let failed = 0;
  for (const task of tasks) {
    const outcome = await processDirectTask(env, task);
    if (outcome === "completed") completed += 1;
    if (outcome === "retried") retried += 1;
    if (outcome === "failed") failed += 1;
  }

  return { configured: true, claimed: tasks.length, completed, retried, failed };
}
