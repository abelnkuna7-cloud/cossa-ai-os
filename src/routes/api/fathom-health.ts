import { createFileRoute } from "@tanstack/react-router";
import { checkFathomConnection } from "@/lib/fathom.server";

export const Route = createFileRoute("/api/fathom-health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await checkFathomConnection();
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("[Fathom health]", error);
          return Response.json(
            { ok: false, provider: "fathom", error: "Fathom connection failed" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
