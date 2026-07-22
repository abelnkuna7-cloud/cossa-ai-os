import { createFileRoute } from "@tanstack/react-router";

// Streams from Lovable AI Gateway (OpenAI-compatible) as newline-delimited text tokens.
// Body: { messages: [{ role, content }], model?: string }
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        let payload: { messages?: Array<{ role: string; content: string }>; model?: string };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const systemPreamble = {
          role: "system" as const,
          content:
            "You are Cossa AI — the AI co-pilot inside the Cossa AI Business Operating System, built by Cossa Nexus Holdings for South African SMEs. You help owners with marketing, sales, operations, and strategy. Be concise, practical, and action-oriented. Use markdown when it improves clarity (bullet lists, short headings, tables). Currency is South African Rand (R). Never invent data you don't have; ask for it if needed.",
        };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: payload.model ?? "google/gemini-3.6-flash",
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
