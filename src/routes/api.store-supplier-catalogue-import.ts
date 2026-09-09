import { createFileRoute } from "@tanstack/react-router";

import {
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { planAstrumImport } from "@/lib/store-astrum-catalogue-import";
import {
  loadSupplierImportEvidence,
  persistSupplierCatalogueImport,
  SupplierImportPersistenceError,
} from "@/lib/store-supplier-import-persistence.server";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");

export const Route = createFileRoute("/api/store-supplier-catalogue-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const payload = record(await request.json().catch(() => null));
          const sourceText = text(payload.sourceText);
          if (!sourceText.trim())
            throw new SupplierImportPersistenceError("Supplier source text is required.");
          const supplierId = text(payload.supplierId);
          const existing = await loadSupplierImportEvidence(actor.organisationId, supplierId);
          const plan = planAstrumImport(sourceText, existing);
          // This endpoint is deliberately explicit: deployment of the code never imports a catalogue.
          if (payload.confirmWrite !== true) return agentRuntimeJson({ dryRun: true, plan });
          return agentRuntimeJson(
            await persistSupplierCatalogueImport({
              organisationId: actor.organisationId,
              actorId: actor.userId,
              supplierId,
              sourceType: text(payload.sourceType) as "csv",
              sourceFileName: text(payload.sourceFileName),
              sourceUrl: text(payload.sourceUrl),
              sourceText,
              sourceObservedAt: text(payload.sourceObservedAt) || undefined,
              plan,
            }),
          );
        } catch (error) {
          if (error instanceof SupplierImportPersistenceError)
            return agentRuntimeJson({ error: error.message }, error.status);
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
