import { createFileRoute } from "@tanstack/react-router";

// Streams from Groq (OpenAI-compatible) as newline-delimited text tokens.
// Body: { messages: [{ role, content }], model?: string }
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GROQ_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supabaseUrl || !supabaseKey) {
          return new Response("AI service is not configured", { status: 503 });
        }

        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = authorization.slice(7);
        const userResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
        });
        if (!userResponse.ok) return new Response("Unauthorized", { status: 401 });

        let payload: { messages?: Array<{ role: string; content: string }>; model?: string; system?: string };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const knowledgeResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/ai_knowledge_documents?verification_status=eq.verified&select=title,body,source,source_url,updated_at&order=updated_at.desc&limit=12`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
        });
        const knowledge = knowledgeResponse.ok ? await knowledgeResponse.json() as Array<{ title: string; body: string; source: string | null; source_url: string | null }> : [];
        const verifiedContext = knowledge.length
          ? knowledge.map((doc) => `SOURCE: ${doc.title}${doc.source ? ` (${doc.source})` : ""}\n${doc.body}`).join("\n\n---\n\n").slice(0, 18_000)
          : "No verified company knowledge was retrieved for this request.";
        const baseSystem =
          `You are Cossa AI — the AI co-pilot inside the Cossa AI Business Operating System, built by Cossa Nexus Holdings for South African SMEs. You help owners with marketing, sales, operations, and strategy. Be concise, practical, and action-oriented. Use markdown when it improves clarity. Currency is South African Rand (R). Never invent Cossa Nexus Holdings facts. Use only the verified knowledge below for company-specific claims. If it is insufficient, say so and request a verified source. Cite the knowledge document title in every company-specific answer. High-risk or irreversible actions require human approval.\n\nVERIFIED KNOWLEDGE\n${verifiedContext}`;

        const systemPreamble = {
          role: "system" as const,
          content: payload.system ? `${baseSystem}\n\n${payload.system}` : baseSystem,
        };

        const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            stream: true,
            messages: [systemPreamble, ...payload.messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          const status = upstream.status === 402 || upstream.status === 429 ? upstream.status : 500;
          return new Response(text || "AI gateway error", { status });
        }

        // Parse OpenAI-style SSE and re-emit plain text tokens separated by \n.
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            let buffer = "";
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx: number;
                while ((idx = buffer.indexOf("\n")) !== -1) {
                  const line = buffer.slice(0, idx).trim();
                  buffer = buffer.slice(idx + 1);
                  if (!line.startsWith("data:")) continue;
                  const data = line.slice(5).trim();
                  if (data === "[DONE]") {
                    controller.close();
                    return;
                  }
                  try {
                    const json = JSON.parse(data) as {
                      choices?: Array<{ delta?: { content?: string } }>;
                    };
                    const token = json.choices?.[0]?.delta?.content;
                    if (token) controller.enqueue(encoder.encode(token));
                  } catch {
                    // ignore malformed chunk
                  }
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
