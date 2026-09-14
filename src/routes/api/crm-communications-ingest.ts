import { createFileRoute } from "@tanstack/react-router";
import {
  ingestCompactCommunication,
  verifyCommunicationIngestRequest,
  type CompactCommunicationIngest,
} from "@/lib/crm-communication-ingest.server";

export const Route = createFileRoute("/api/crm-communications-ingest")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "crm-communications-ingest",
          storage: "highlight-only",
          automaticSending: false,
        }),
      POST: async ({ request }) => {
        if (!verifyCommunicationIngestRequest(request.headers)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        let payload: CompactCommunicationIngest;
        try {
          payload = (await request.json()) as CompactCommunicationIngest;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        // Deliberately reject common full-body fields. Growth stores only a short
        // highlight plus a deep link to the source message.
        const rawPayload = payload as Record<string, unknown>;
        const forbiddenFields = ["body", "html_body", "full_body", "message_body", "attachments", "raw_payload"];
        const forbidden = forbiddenFields.find((field) => rawPayload[field] !== undefined);
        if (forbidden) {
          return Response.json(
            { ok: false, error: `Field ${forbidden} is not accepted. Store the source link and highlight only.` },
            { status: 400 },
          );
        }

        try {
          const result = await ingestCompactCommunication(payload);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[CRM communication ingest]", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Communication ingest failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});
