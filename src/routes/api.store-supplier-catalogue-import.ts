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
            throw new SupplierImportPersistenceError("Supplier CSV content is required.");
          const sourceType = text(payload.sourceType).toLowerCase();
          if (sourceType !== "csv")
            throw new SupplierImportPersistenceError(
              "This catalogue intaker currently accepts CSV sources only.",
            );
          const sourceFileName = text(payload.sourceFileName).trim();
          if (!sourceFileName.toLowerCase().endsWith(".csv"))
            throw new SupplierImportPersistenceError("Choose a .csv supplier catalogue file.");
          const supplierId = text(payload.supplierId);
          if (!supplierId)
            throw new SupplierImportPersistenceError("Choose an existing supplier registry record.");

          const existing = await loadSupplierImportEvidence(actor.organisationId, supplierId);
          const plan = planAstrumImport(sourceText, existing);
          if (plan.counts.sourceRows <= 0)
            throw new SupplierImportPersistenceError("The CSV does not contain product rows.");
          if (plan.counts.acceptedRows <= 0)
            throw new SupplierImportPersistenceError(
              "No importable supplier products were found. Check the CSV headers and product data.",
            );

          // Deployment and preview are non-writing. A second explicit request is required to persist.
          if (payload.confirmWrite !== true) return agentRuntimeJson({ dryRun: true, plan });

          return agentRuntimeJson(
            await persistSupplierCatalogueImport({
              organisationId: actor.organisationId,
              actorId: actor.userId,
              supplierId,
              sourceType: "csv",
              sourceFileName,
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
