import { createFileRoute } from "@tanstack/react-router";
import { storeFathomMeeting, verifyFathomWebhook } from "@/lib/fathom.server";

export const Route = createFileRoute("/api/fathom-webhook")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, provider: "fathom", endpoint: "webhook" }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        if (!verifyFathomWebhook(request.headers, rawBody)) {
          return Response.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        const webhookId = request.headers.get("webhook-id") ?? "unknown";
        try {
          const stored = await storeFathomMeeting(payload, webhookId);
          return Response.json({ ok: true, provider: "fathom", ...stored });
        } catch (error) {
          console.error("[Fathom webhook]", error);
          return Response.json({ ok: false, error: "Webhook storage failed" }, { status: 500 });
        }
      },
    },
  },
});
